/* =====================================================================
   api.js — замена firebase.auth()/firestore() на обычные fetch-запросы
   к твоему Worker. Подключи этот файл В МЕСТО <script src=".../firebase...">
   в index.html, и он должен грузиться ДО script.js.

   ВАЖНО: замени API_BASE на адрес своего Worker после деплоя
   (например https://твой-сайт.username.workers.dev или свой домен, если
   Worker подключён на тот же домен что и Pages через Route).
   ===================================================================== */
const API_BASE = 'https://ЗАМЕНИ-НА-СВОЙ-WORKER.workers.dev';

async function apiFetch(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    ...options,
    credentials: 'include', // обязательно — чтобы cookie с сессией отправлялась
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Ошибка запроса'), data);
  return data;
}

window.api = {
  register: (username, email, password) => apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ username, email, password }) }),
  login: (email, password) => apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  loginTelegram: (telegramUser) => apiFetch('/api/auth/telegram', { method: 'POST', body: JSON.stringify(telegramUser) }),
  logout: () => apiFetch('/api/auth/logout', { method: 'POST' }),
  me: () => apiFetch('/api/auth/me'),

  getMessages: () => apiFetch('/api/messages'),
  postMessage: (content) => apiFetch('/api/messages', { method: 'POST', body: JSON.stringify({ content }) }),
  deleteMessage: (id) => apiFetch(`/api/messages/${id}`, { method: 'DELETE' }),

  getComments: (msgId) => apiFetch(`/api/messages/${msgId}/comments`),
  postComment: (msgId, content) => apiFetch(`/api/messages/${msgId}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),

  getVideos: () => apiFetch('/api/videos'),
  likeVideo: (id) => apiFetch(`/api/videos/${id}/like`, { method: 'POST' }),

  toggleSubscribe: (targetId) => apiFetch('/api/subscribe', { method: 'POST', body: JSON.stringify({ targetId }) }),
  report: (messageId, reason) => apiFetch('/api/reports', { method: 'POST', body: JSON.stringify({ messageId, reason }) }),

  getNotifications: () => apiFetch('/api/notifications'),
  markNotificationRead: (id, broadcast) => apiFetch('/api/notifications/read', { method: 'POST', body: JSON.stringify({ id, broadcast }) }),

  admin: {
    ban: (userId, reason) => apiFetch('/api/admin/ban', { method: 'POST', body: JSON.stringify({ userId, reason }) }),
    unban: (userId) => apiFetch('/api/admin/unban', { method: 'POST', body: JSON.stringify({ userId }) }),
    broadcast: (title, body) => apiFetch('/api/admin/broadcast', { method: 'POST', body: JSON.stringify({ title, body }) }),
    getUsers: () => apiFetch('/api/admin/users'),
    getReports: () => apiFetch('/api/admin/reports'),
    pinMessage: (id, pinnedUntil) => apiFetch(`/api/messages/${id}/pin`, { method: 'POST', body: JSON.stringify({ pinnedUntil }) }),
    getSecrets: () => apiFetch('/api/admin/secrets'),
    addSecret: (content) => apiFetch('/api/admin/secrets', { method: 'POST', body: JSON.stringify({ content }) }),
    updateSecret: (id, content) => apiFetch(`/api/admin/secrets/${id}`, { method: 'PUT', body: JSON.stringify({ content }) }),
    deleteSecret: (id) => apiFetch(`/api/admin/secrets/${id}`, { method: 'DELETE' }),
    addTopDonator: (userId, amount) => apiFetch('/api/admin/top-donators', { method: 'POST', body: JSON.stringify({ userId, amount }) })
  },
  getTopDonators: () => apiFetch('/api/top-donators'),

  updateProfile: (data) => apiFetch('/api/profile', { method: 'PUT', body: JSON.stringify(data) }),
  toggleFriend: (targetId) => apiFetch('/api/friends/toggle', { method: 'POST', body: JSON.stringify({ targetId }) }),
  getFriends: () => apiFetch('/api/friends'),
  searchUsers: (q) => apiFetch('/api/users/search?q=' + encodeURIComponent(q)),
  viewMessage: (id) => apiFetch(`/api/messages/${id}/view`, { method: 'POST' }),

  upload: (file) => {
    const form = new FormData();
    form.append('file', file);
    return fetch(API_BASE + '/api/upload', { method: 'POST', credentials: 'include', body: form })
      .then(r => r.json());
  }
};

// Уведомления теперь не "живые" (Firestore onSnapshot), а опрашиваются раз в 20 секунд.
// Подключи это в script.js вместо startNotificationsListener():
setInterval(() => {
  if (window.onNotificationsPoll) window.api.getNotifications().then(window.onNotificationsPoll).catch(() => {});
}, 20000);
