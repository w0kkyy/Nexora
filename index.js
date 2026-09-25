/* =====================================================================
   ЕДИНЫЙ Cloudflare Worker — весь backend вместо Firebase.
   Файл: worker/index.js

   Секреты (wrangler secret put ИМЯ):
     TELEGRAM_BOT_TOKEN, JWT_SECRET
   Привязки (wrangler.toml):
     D1  -> DB
     R2  -> BUCKET
   ===================================================================== */
import { SignJWT, jwtVerify } from 'jose';

const json = (data, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...extraHeaders } });

function cors(request) {
  return {
    'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
  };
}

// ---------- утилиты паролей / telegram (как в предыдущих файлах) ----------
async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, km, 256);
  const hex = a => [...new Uint8Array(a)].map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex(salt)}:${hex(bits)}`;
}
async function verifyPassword(password, stored) {
  const [saltHex, hashHex] = stored.split(':');
  const salt = new Uint8Array(saltHex.match(/.{2}/g).map(b => parseInt(b, 16)));
  const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, km, 256);
  const hex = a => [...new Uint8Array(a)].map(b => b.toString(16).padStart(2, '0')).join('');
  return hex(bits) === hashHex;
}
async function verifyTelegramAuth(data, botToken) {
  const { hash, ...fields } = data;
  const checkString = Object.keys(fields).sort().map(k => `${k}=${fields[k]}`).join('\n');
  const secretKeyBytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(botToken));
  const key = await crypto.subtle.importKey('raw', secretKeyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(checkString));
  const computed = [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
  if (computed !== hash) return false;
  return (Math.floor(Date.now() / 1000) - Number(fields.auth_date)) <= 86400;
}
async function issueSession(env, uid) {
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  const token = await new SignJWT({ uid }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('30d').sign(secret);
  return `session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`;
}
async function getSessionUid(request, env) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/session=([^;]+)/);
  if (!match) return null;
  try {
    const { payload } = await jwtVerify(match[1], new TextEncoder().encode(env.JWT_SECRET));
    return payload.uid;
  } catch { return null; }
}

// ---------- helper: текущий юзер + проверка бана/админства ----------
async function requireUser(request, env) {
  const uid = await getSessionUid(request, env);
  if (!uid) return null;
  return env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(uid).first();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const headers = cors(request);

    if (request.method === 'OPTIONS') return new Response(null, { headers });

    try {
      // ---------------- AUTH ----------------
      if (path === '/api/auth/register' && request.method === 'POST') {
        const { username, email, password } = await request.json();
        if (!username || !email || !password) return json({ error: 'Заполните все поля!' }, 400, headers);
        if (password.length < 6) return json({ error: 'Пароль должен быть не менее 6 символов!' }, 400, headers);
        if (await env.DB.prepare('SELECT id FROM users WHERE email=?').bind(email).first())
          return json({ error: 'Этот email уже занят!' }, 409, headers);
        const id = crypto.randomUUID();
        await env.DB.prepare('INSERT INTO users (id,username,email,password_hash,created_at) VALUES (?,?,?,?,datetime(\'now\'))')
          .bind(id, username, email, await hashPassword(password)).run();
        return json({ user: { id, username, email } }, 200, { ...headers, 'Set-Cookie': await issueSession(env, id) });
      }

      if (path === '/api/auth/login' && request.method === 'POST') {
        const { email, password } = await request.json();
        const user = await env.DB.prepare('SELECT * FROM users WHERE email=?').bind(email).first();
        if (!user || !user.password_hash || !(await verifyPassword(password, user.password_hash)))
          return json({ error: 'Неверный email или пароль!' }, 401, headers);
        if (user.banned) return json({ error: 'banned', banReason: user.ban_reason, bannedAt: user.banned_at }, 403, headers);
        return json({ user: { id: user.id, username: user.username, email: user.email, avatarUrl: user.avatar_url } },
          200, { ...headers, 'Set-Cookie': await issueSession(env, user.id) });
      }

      if (path === '/api/auth/telegram' && request.method === 'POST') {
        const tg = await request.json();
        if (!(await verifyTelegramAuth(tg, env.TELEGRAM_BOT_TOKEN))) return json({ error: 'Недействительная подпись Telegram' }, 401, headers);
        const telegramId = String(tg.id);
        const displayName = tg.username ? '@' + tg.username : tg.first_name;
        let user = await env.DB.prepare('SELECT * FROM users WHERE telegram_id=?').bind(telegramId).first();
        if (!user) {
          const id = crypto.randomUUID();
          await env.DB.prepare('INSERT INTO users (id,username,avatar_url,telegram_id,created_at) VALUES (?,?,?,?,datetime(\'now\'))')
            .bind(id, displayName, tg.photo_url || '', telegramId).run();
          user = await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(id).first();
        } else {
          await env.DB.prepare('UPDATE users SET username=?, avatar_url=? WHERE id=?').bind(displayName, tg.photo_url || user.avatar_url, user.id).run();
        }
        if (user.banned) return json({ error: 'banned', banReason: user.ban_reason, bannedAt: user.banned_at }, 403, headers);
        return json({ user: { id: user.id, username: user.username, avatarUrl: user.avatar_url } },
          200, { ...headers, 'Set-Cookie': await issueSession(env, user.id) });
      }

      if (path === '/api/auth/logout' && request.method === 'POST') {
        return json({ ok: true }, 200, { ...headers, 'Set-Cookie': 'session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0' });
      }

      if (path === '/api/auth/me' && request.method === 'GET') {
        const user = await requireUser(request, env);
        return json({ user: user || null }, 200, headers);
      }

      // ---------------- MESSAGES ----------------
      if (path === '/api/messages' && request.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM messages ORDER BY created_at DESC LIMIT 100').all();
        return json({ messages: results }, 200, headers);
      }
      if (path === '/api/messages' && request.method === 'POST') {
        const user = await requireUser(request, env);
        if (!user) return json({ error: 'Требуется вход' }, 401, headers);
        const { content } = await request.json();
        const id = crypto.randomUUID();
        await env.DB.prepare('INSERT INTO messages (id,user_id,content,views,created_at) VALUES (?,?,?,0,datetime(\'now\'))')
          .bind(id, user.id, content).run();
        return json({ id }, 200, headers);
      }
      const msgMatch = path.match(/^\/api\/messages\/([^/]+)$/);
      if (msgMatch && request.method === 'DELETE') {
        const user = await requireUser(request, env);
        if (!user) return json({ error: 'Требуется вход' }, 401, headers);
        await env.DB.prepare('DELETE FROM messages WHERE id=? AND user_id=?').bind(msgMatch[1], user.id).run();
        return json({ ok: true }, 200, headers);
      }

      // ---------------- COMMENTS ----------------
      const commentsMatch = path.match(/^\/api\/messages\/([^/]+)\/comments$/);
      if (commentsMatch && request.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM comments WHERE message_id=? ORDER BY created_at DESC').bind(commentsMatch[1]).all();
        return json({ comments: results }, 200, headers);
      }
      if (commentsMatch && request.method === 'POST') {
        const user = await requireUser(request, env);
        if (!user) return json({ error: 'Требуется вход' }, 401, headers);
        const { content } = await request.json();
        const id = crypto.randomUUID();
        await env.DB.prepare('INSERT INTO comments (id,message_id,user_id,content,created_at) VALUES (?,?,?,?,datetime(\'now\'))')
          .bind(id, commentsMatch[1], user.id, content).run();
        return json({ id }, 200, headers);
      }

      // ---------------- VIDEOS + LIKES ----------------
      if (path === '/api/videos' && request.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM videos ORDER BY created_at DESC LIMIT 100').all();
        return json({ videos: results }, 200, headers);
      }
      const likeMatch = path.match(/^\/api\/videos\/([^/]+)\/like$/);
      if (likeMatch && request.method === 'POST') {
        const user = await requireUser(request, env);
        if (!user) return json({ error: 'Требуется вход' }, 401, headers);
        const existing = await env.DB.prepare('SELECT 1 FROM video_likes WHERE video_id=? AND user_id=?').bind(likeMatch[1], user.id).first();
        if (existing) {
          await env.DB.prepare('DELETE FROM video_likes WHERE video_id=? AND user_id=?').bind(likeMatch[1], user.id).run();
          await env.DB.prepare('UPDATE videos SET likes = MAX(0, likes - 1) WHERE id=?').bind(likeMatch[1]).run();
        } else {
          await env.DB.prepare('INSERT INTO video_likes (video_id,user_id) VALUES (?,?)').bind(likeMatch[1], user.id).run();
          await env.DB.prepare('UPDATE videos SET likes = likes + 1 WHERE id=?').bind(likeMatch[1]).run();
        }
        const v = await env.DB.prepare('SELECT likes FROM videos WHERE id=?').bind(likeMatch[1]).first();
        return json({ likes: v.likes }, 200, headers);
      }

      // ---------------- SUBSCRIPTIONS ----------------
      if (path === '/api/subscribe' && request.method === 'POST') {
        const user = await requireUser(request, env);
        if (!user) return json({ error: 'Требуется вход' }, 401, headers);
        const { targetId } = await request.json();
        const existing = await env.DB.prepare('SELECT 1 FROM user_subscriptions WHERE follower_id=? AND followed_id=?').bind(user.id, targetId).first();
        if (existing) await env.DB.prepare('DELETE FROM user_subscriptions WHERE follower_id=? AND followed_id=?').bind(user.id, targetId).run();
        else await env.DB.prepare('INSERT INTO user_subscriptions (follower_id,followed_id) VALUES (?,?)').bind(user.id, targetId).run();
        return json({ subscribed: !existing }, 200, headers);
      }

      // ---------------- REPORTS / MODERATION (только админ — доработать проверку роли) ----------------
      if (path === '/api/reports' && request.method === 'POST') {
        const { messageId, reason } = await request.json();
        const id = crypto.randomUUID();
        await env.DB.prepare('INSERT INTO reports (id,message_id,reason,created_at) VALUES (?,?,?,datetime(\'now\'))').bind(id, messageId, reason).run();
        return json({ id }, 200, headers);
      }

      // ---------------- BAN (только для админского интерфейса) ----------------
      if (path === '/api/admin/ban' && request.method === 'POST') {
        const admin = await requireUser(request, env);
        if (!admin || !admin.is_admin) return json({ error: 'Нет доступа' }, 403, headers);
        const { userId, reason } = await request.json();
        await env.DB.prepare('UPDATE users SET banned=1, ban_reason=?, banned_at=datetime(\'now\') WHERE id=?').bind(reason || null, userId).run();
        // пропагация бана по всем аккаунтам с тем же telegram_id (замена propagateTelegramBan)
        const target = await env.DB.prepare('SELECT telegram_id FROM users WHERE id=?').bind(userId).first();
        if (target && target.telegram_id) {
          await env.DB.prepare('UPDATE users SET banned=1, ban_reason=?, banned_at=datetime(\'now\') WHERE telegram_id=?')
            .bind(reason || null, target.telegram_id).run();
        }
        return json({ ok: true }, 200, headers);
      }
      if (path === '/api/admin/unban' && request.method === 'POST') {
        const admin = await requireUser(request, env);
        if (!admin || !admin.is_admin) return json({ error: 'Нет доступа' }, 403, headers);
        const { userId } = await request.json();
        await env.DB.prepare('UPDATE users SET banned=0, ban_reason=NULL WHERE id=?').bind(userId).run();
        return json({ ok: true }, 200, headers);
      }

      // ---------------- NOTIFICATIONS ----------------
      // Замена live-подписки (onSnapshot) — фронтенд теперь опрашивает этот эндпоинт
      // раз в N секунд (polling), т.к. у D1/Workers нет постоянных сокетов "из коробки".
      if (path === '/api/notifications' && request.method === 'GET') {
        const user = await requireUser(request, env);
        const { results: broadcast } = await env.DB.prepare(
          'SELECT * FROM notifications WHERE target_user_id IS NULL ORDER BY created_at DESC LIMIT 50'
        ).all();
        let personal = [];
        if (user) {
          const r = await env.DB.prepare(
            'SELECT * FROM notifications WHERE target_user_id=? ORDER BY created_at DESC LIMIT 50'
          ).bind(user.id).all();
          personal = r.results;
        }
        return json({ broadcast, personal }, 200, headers);
      }
      // Отправить персональное уведомление (лайк/коммент/подписка) — вызывается из других
      // эндпоинтов сервера, а не напрямую с фронта; но оставляю как отдельный маршрут для простоты
      if (path === '/api/notifications/personal' && request.method === 'POST') {
        const { targetUserId, type, title, body } = await request.json();
        const target = await env.DB.prepare('SELECT notif_settings FROM users WHERE id=?').bind(targetUserId).first();
        const settings = target && target.notif_settings ? JSON.parse(target.notif_settings) : {};
        const settingsKeyMap = { like: 'likes', comment: 'comments', subscribe: 'subscribes' };
        const key = settingsKeyMap[type];
        if (key && settings[key] === false) return json({ skipped: true }, 200, headers);
        const id = crypto.randomUUID();
        await env.DB.prepare('INSERT INTO notifications (id,target_user_id,type,read,created_at) VALUES (?,?,?,0,datetime(\'now\'))')
          .bind(id, targetUserId, type).run();
        return json({ id }, 200, headers);
      }
      // Отметить уведомление прочитанным
      if (path === '/api/notifications/read' && request.method === 'POST') {
        const user = await requireUser(request, env);
        if (!user) return json({ error: 'Требуется вход' }, 401, headers);
        const { id, broadcast } = await request.json();
        if (broadcast) {
          const n = await env.DB.prepare('SELECT read_by FROM notifications WHERE id=?').bind(id).first();
          const readBy = n && n.read_by ? JSON.parse(n.read_by) : [];
          if (!readBy.includes(user.id)) readBy.push(user.id);
          await env.DB.prepare('UPDATE notifications SET read_by=? WHERE id=?').bind(JSON.stringify(readBy), id).run();
        } else {
          await env.DB.prepare('UPDATE notifications SET read=1 WHERE id=? AND target_user_id=?').bind(id, user.id).run();
        }
        return json({ ok: true }, 200, headers);
      }
      // Разослать уведомление всем (админ-панель, "Отправить уведомление всем")
      if (path === '/api/admin/broadcast' && request.method === 'POST') {
        const admin = await requireUser(request, env);
        if (!admin || !admin.is_admin) return json({ error: 'Нет доступа' }, 403, headers);
        const { title, body } = await request.json();
        const id = crypto.randomUUID();
        await env.DB.prepare('INSERT INTO notifications (id,target_user_id,type,read_by,created_at) VALUES (?,NULL,?,?,datetime(\'now\'))')
          .bind(id, JSON.stringify({ title, body }), JSON.stringify([])).run();
        return json({ id }, 200, headers);
      }

      // ---------------- SECRETS (админский раздел) ----------------
      if (path === '/api/admin/secrets' && request.method === 'GET') {
        const admin = await requireUser(request, env);
        if (!admin || !admin.is_admin) return json({ error: 'Нет доступа' }, 403, headers);
        const { results } = await env.DB.prepare('SELECT * FROM secrets ORDER BY created_at DESC').all();
        return json({ secrets: results }, 200, headers);
      }
      if (path === '/api/admin/secrets' && request.method === 'POST') {
        const admin = await requireUser(request, env);
        if (!admin || !admin.is_admin) return json({ error: 'Нет доступа' }, 403, headers);
        const { content } = await request.json();
        const id = crypto.randomUUID();
        await env.DB.prepare('INSERT INTO secrets (id,content,created_at) VALUES (?,?,datetime(\'now\'))').bind(id, content).run();
        return json({ id }, 200, headers);
      }
      const secretMatch = path.match(/^\/api\/admin\/secrets\/([^/]+)$/);
      if (secretMatch && (request.method === 'PUT' || request.method === 'DELETE')) {
        const admin = await requireUser(request, env);
        if (!admin || !admin.is_admin) return json({ error: 'Нет доступа' }, 403, headers);
        if (request.method === 'DELETE') {
          await env.DB.prepare('DELETE FROM secrets WHERE id=?').bind(secretMatch[1]).run();
        } else {
          const { content } = await request.json();
          await env.DB.prepare('UPDATE secrets SET content=? WHERE id=?').bind(content, secretMatch[1]).run();
        }
        return json({ ok: true }, 200, headers);
      }

      // ---------------- TOP DONATORS ----------------
      if (path === '/api/top-donators' && request.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM top_donators ORDER BY amount DESC LIMIT 20').all();
        return json({ topDonators: results }, 200, headers);
      }
      if (path === '/api/admin/top-donators' && request.method === 'POST') {
        const admin = await requireUser(request, env);
        if (!admin || !admin.is_admin) return json({ error: 'Нет доступа' }, 403, headers);
        const { userId, amount } = await request.json();
        const id = crypto.randomUUID();
        await env.DB.prepare('INSERT INTO top_donators (id,user_id,amount,created_at) VALUES (?,?,?,datetime(\'now\'))').bind(id, userId, amount).run();
        return json({ id }, 200, headers);
      }

      // ---------------- PROFILE ----------------
      if (path === '/api/profile' && request.method === 'PUT') {
        const user = await requireUser(request, env);
        if (!user) return json({ error: 'Требуется вход' }, 401, headers);
        const { bio, tags, phone, birthday, avatarUrl, notifSettings } = await request.json();
        await env.DB.prepare(
          'UPDATE users SET bio=?, tags=?, phone=?, birthday=?, avatar_url=?, notif_settings=? WHERE id=?'
        ).bind(bio || '', tags || '', phone || '', birthday || '', avatarUrl || user.avatar_url,
          notifSettings ? JSON.stringify(notifSettings) : user.notif_settings, user.id).run();
        return json({ ok: true }, 200, headers);
      }

      // ---------------- FRIENDS ----------------
      if (path === '/api/friends/toggle' && request.method === 'POST') {
        const user = await requireUser(request, env);
        if (!user) return json({ error: 'Требуется вход' }, 401, headers);
        const { targetId } = await request.json();
        const existing = await env.DB.prepare('SELECT 1 FROM user_friends WHERE user_id=? AND friend_id=?').bind(user.id, targetId).first();
        if (existing) await env.DB.prepare('DELETE FROM user_friends WHERE user_id=? AND friend_id=?').bind(user.id, targetId).run();
        else await env.DB.prepare('INSERT INTO user_friends (user_id,friend_id) VALUES (?,?)').bind(user.id, targetId).run();
        return json({ friend: !existing }, 200, headers);
      }
      if (path === '/api/friends' && request.method === 'GET') {
        const user = await requireUser(request, env);
        if (!user) return json({ error: 'Требуется вход' }, 401, headers);
        const { results } = await env.DB.prepare(
          'SELECT u.* FROM user_friends f JOIN users u ON u.id = f.friend_id WHERE f.user_id = ?'
        ).bind(user.id).all();
        return json({ friends: results }, 200, headers);
      }

      // ---------------- USER SEARCH ----------------
      if (path === '/api/users/search' && request.method === 'GET') {
        const q = url.searchParams.get('q') || '';
        const { results } = await env.DB.prepare(
          'SELECT id, username, avatar_url FROM users WHERE username LIKE ? LIMIT 20'
        ).bind(`%${q}%`).all();
        return json({ users: results }, 200, headers);
      }

      // ---------------- VIEWS / PIN ----------------
      const viewMatch = path.match(/^\/api\/messages\/([^/]+)\/view$/);
      if (viewMatch && request.method === 'POST') {
        await env.DB.prepare('UPDATE messages SET views = views + 1 WHERE id=?').bind(viewMatch[1]).run();
        return json({ ok: true }, 200, headers);
      }
      const pinMatch = path.match(/^\/api\/messages\/([^/]+)\/pin$/);
      if (pinMatch && request.method === 'POST') {
        const user = await requireUser(request, env);
        if (!user) return json({ error: 'Требуется вход' }, 401, headers);
        const msg = await env.DB.prepare('SELECT user_id FROM messages WHERE id=?').bind(pinMatch[1]).first();
        // Своё сообщение можно закреплять самому (self-pin, раз в период — проверка периода на фронте
        // как и раньше), чужое — только админ.
        if (!user.is_admin && (!msg || msg.user_id !== user.id)) return json({ error: 'Нет доступа' }, 403, headers);
        const { pinnedUntil } = await request.json();
        await env.DB.prepare('UPDATE messages SET pinned=1, pinned_until=? WHERE id=?').bind(pinnedUntil || null, pinMatch[1]).run();
        return json({ ok: true }, 200, headers);
      }

      // ---------------- ADMIN: список пользователей / жалоб ----------------
      if (path === '/api/admin/users' && request.method === 'GET') {
        const admin = await requireUser(request, env);
        if (!admin || !admin.is_admin) return json({ error: 'Нет доступа' }, 403, headers);
        const { results } = await env.DB.prepare('SELECT id, username, email, banned, ban_reason, is_admin FROM users ORDER BY created_at DESC LIMIT 200').all();
        return json({ users: results }, 200, headers);
      }
      if (path === '/api/admin/reports' && request.method === 'GET') {
        const admin = await requireUser(request, env);
        if (!admin || !admin.is_admin) return json({ error: 'Нет доступа' }, 403, headers);
        const { results } = await env.DB.prepare('SELECT * FROM reports ORDER BY created_at DESC LIMIT 200').all();
        return json({ reports: results }, 200, headers);
      }

      // ---------------- FILE UPLOAD → R2 (замена Firebase Storage) ----------------
      if (path === '/api/upload' && request.method === 'POST') {
        const user = await requireUser(request, env);
        if (!user) return json({ error: 'Требуется вход' }, 401, headers);
        const formData = await request.formData();
        const file = formData.get('file');
        if (!file) return json({ error: 'Файл не найден' }, 400, headers);
        const key = `${user.id}/${crypto.randomUUID()}-${file.name}`;
        await env.BUCKET.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
        // R2_PUBLIC_URL — домен твоего публичного R2-бакета (настраивается в дашборде Cloudflare)
        return json({ url: `${env.R2_PUBLIC_URL}/${key}` }, 200, headers);
      }

      return json({ error: 'Not found' }, 404, headers);
    } catch (err) {
      return json({ error: err.message }, 500, headers);
    }
  }
};
