/* =====================================================================
   СТИКЕРЫ
   ---------------------------------------------------------------------
   Как это работает:
   - В тексте (пост, гостевая, комментарий) стикер хранится как короткий
     токен вида  :st_fire:  или  :st_p07:
   - При показе текста токены заменяются на картинку / большой эмодзи
     (Stickers.render), при этом остальной текст уже экранирован escapeHtml.
   - Базовые стикеры (сердечко, огонёк, черепок) доступны всем.
   - Стикерпак (24 шт.) доступен с подпиской Lite / Premium (и админам).
   - Файлы пака лежат в папке  stickers/  (s01.png ... s24.png).

   Чтобы добавить стикер в пак: положи stickers/s25.png и увеличь PACK_SIZE.
   ===================================================================== */
(function () {
  'use strict';

  var PACK_DIR = 'stickers/';
  var PACK_SIZE = 24;

  // Базовые стикеры (бесплатные) — рисуются крупным эмодзи
  var BASE = [
    { id: 'heart', emoji: '\u2764\uFE0F', label: 'Сердечко' },
    { id: 'fire',  emoji: '\uD83D\uDD25', label: 'Огонёк' },
    { id: 'skull', emoji: '\uD83D\uDC80', label: 'Черепок' }
  ];

  var PACK = [];
  var byId = {};
  var i;

  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  for (i = 0; i < BASE.length; i++) {
    BASE[i].premium = false;
    byId[BASE[i].id] = BASE[i];
  }
  for (i = 1; i <= PACK_SIZE; i++) {
    var item = { id: 'p' + pad2(i), file: PACK_DIR + 's' + pad2(i) + '.png', premium: true, label: 'Стикер ' + i };
    PACK.push(item);
    byId[item.id] = item;
  }

  var ids = Object.keys(byId).join('|');
  var TOKEN_SRC = ':st_(' + ids + '):';

  // Хуки, которые задаёт script.js (доступ к подписке, тосты, модалка подписки)
  var hooks = {
    hasAccess: function () { return false; },
    onLocked: function () {},
    toast: function (msg) { try { alert(msg); } catch (e) {} }
  };

  function tokenRe() { return new RegExp(TOKEN_SRC, 'g'); }

  /* ---------- Показ ---------- */

  // На вход — УЖЕ экранированный через escapeHtml текст. На выход — HTML со стикерами.
  function render(html) {
    if (!html || html.indexOf(':st_') === -1) return html;
    var found = html.match(tokenRe());
    if (!found) return html;
    // Если в тексте только стикеры (1–3 штуки) — рисуем их крупно, как в мессенджерах
    var rest = html.replace(tokenRe(), '').replace(/<br\s*\/?>|\s+/g, '');
    var big = rest === '' && found.length <= 3;
    var cls = big ? ' sticker-big' : '';

    return html.replace(tokenRe(), function (m, id) {
      var s = byId[id];
      if (!s) return m;
      if (s.emoji) {
        return '<span class="sticker sticker-emoji' + cls + '" role="img" aria-label="' + s.label + '">' + s.emoji + '</span>';
      }
      return '<img class="sticker sticker-img' + cls + '" src="' + s.file + '" alt="Стикер" draggable="false" loading="lazy">';
    });
  }

  // Для превью/уведомлений: токены -> эмодзи или «[стикер]»
  function toPlain(text) {
    if (!text) return text;
    return String(text).replace(tokenRe(), function (m, id) {
      var s = byId[id];
      return s && s.emoji ? s.emoji : '[стикер]';
    });
  }

  /* ---------- Проверка доступа ---------- */

  function usesLockedSticker(text) {
    if (!text) return false;
    var re = tokenRe(), m;
    while ((m = re.exec(String(text))) !== null) {
      if (byId[m[1]] && byId[m[1]].premium) return true;
    }
    return false;
  }

  // true — можно отправлять. false — в тексте стикеры из пака без подписки (показали подсказку).
  function checkText(text) {
    if (usesLockedSticker(text) && !hooks.hasAccess()) {
      hooks.toast('Стикеры из пака доступны с подпиской Lite или Premium', 'error');
      hooks.onLocked();
      return false;
    }
    return true;
  }

  /* ---------- Окно выбора ---------- */

  var popup = null;
  var activeBtn = null;
  var activeInput = null;

  function stickerButtonHTML(s) {
    if (s.emoji) {
      return '<button type="button" class="sticker-opt sticker-opt-base" data-id="' + s.id + '" title="' + s.label + '">' + s.emoji + '</button>';
    }
    return '<button type="button" class="sticker-opt sticker-opt-pack" data-id="' + s.id + '" title="' + s.label + '">' +
      '<img src="' + s.file + '" alt="" draggable="false" loading="lazy"></button>';
  }

  function build() {
    popup = document.createElement('div');
    popup.className = 'sticker-popup';
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-label', 'Стикеры');
    popup.innerHTML =
      '<div class="sticker-popup-title">Базовые</div>' +
      '<div class="sticker-grid sticker-grid-base">' + BASE.map(stickerButtonHTML).join('') + '</div>' +
      '<div class="sticker-popup-title sticker-pack-title">Lite / Premium <span class="sticker-lock-note">\uD83D\uDD12 нужна подписка</span></div>' +
      '<div class="sticker-grid sticker-grid-pack">' + PACK.map(stickerButtonHTML).join('') + '</div>';

    popup.addEventListener('click', function (e) {
      e.stopPropagation();
      var btn = e.target.closest ? e.target.closest('.sticker-opt') : null;
      if (!btn) return;
      var s = byId[btn.getAttribute('data-id')];
      if (!s) return;
      if (s.premium && !hooks.hasAccess()) {
        hooks.toast('Стикеры из пака доступны с подпиской Lite или Premium', 'error');
        close();
        hooks.onLocked();
        return;
      }
      insertToken(activeInput, s.id);
      close();
    });

    document.body.appendChild(popup);

    document.addEventListener('click', function (e) {
      if (!popup.classList.contains('show')) return;
      if (popup.contains(e.target)) return;
      close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
    window.addEventListener('resize', close);
    window.addEventListener('scroll', function (e) {
      if (popup.classList.contains('show') && !popup.contains(e.target)) close();
    }, true);
  }

  function insertToken(input, id) {
    if (!input) return;
    var token = ':st_' + id + ':';
    var value = input.value;
    var start = typeof input.selectionStart === 'number' ? input.selectionStart : value.length;
    var end = typeof input.selectionEnd === 'number' ? input.selectionEnd : value.length;
    var max = input.maxLength > 0 ? input.maxLength : Infinity;
    if (value.length - (end - start) + token.length > max) {
      hooks.toast('Не хватает места для стикера (лимит ' + max + ' символов)', 'error');
      return;
    }
    input.value = value.slice(0, start) + token + value.slice(end);
    var pos = start + token.length;
    input.focus();
    try { input.setSelectionRange(pos, pos); } catch (e) {}
    // чтобы сработали обработчики: черновик гостевой, состояние кнопки комментария и т.д.
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function close() {
    if (popup) popup.classList.remove('show');
    activeBtn = null;
  }

  function place(anchor) {
    var narrow = window.innerWidth < 560;
    popup.classList.toggle('sheet', narrow);
    popup.style.left = '';
    popup.style.top = '';
    if (narrow) return;
    popup.style.visibility = 'hidden';
    popup.classList.add('show');
    var r = anchor.getBoundingClientRect();
    var pw = popup.offsetWidth, ph = popup.offsetHeight;
    var left = Math.min(Math.max(8, r.left), window.innerWidth - pw - 8);
    var top = r.top - ph - 8;
    if (top < 8) top = Math.min(r.bottom + 8, window.innerHeight - ph - 8);
    popup.style.left = left + 'px';
    popup.style.top = Math.max(8, top) + 'px';
    popup.style.visibility = '';
  }

  function openFor(ev, btn, inputId) {
    if (ev) { ev.preventDefault(); ev.stopPropagation(); }
    var input = document.getElementById(inputId);
    if (!input || input.disabled) return;
    if (!popup) build();
    if (popup.classList.contains('show') && activeBtn === btn) { close(); return; }

    // закрываем обычные эмодзи-окошки, чтобы не наслаивались
    var others = document.querySelectorAll('.comment-emoji-popup.show, .emoji-picker-popup.show');
    for (var k = 0; k < others.length; k++) others[k].classList.remove('show');

    activeBtn = btn;
    activeInput = input;
    popup.classList.toggle('is-locked', !hooks.hasAccess());
    place(btn);
    popup.classList.add('show');
  }

  window.Stickers = {
    init: function (h) {
      if (!h) return;
      if (typeof h.hasAccess === 'function') hooks.hasAccess = h.hasAccess;
      if (typeof h.onLocked === 'function') hooks.onLocked = h.onLocked;
      if (typeof h.toast === 'function') hooks.toast = h.toast;
    },
    render: render,
    toPlain: toPlain,
    checkText: checkText,
    usesLockedSticker: usesLockedSticker,
    close: close
  };

  // вызывается из onclick кнопок «Стикеры»
  window.openStickerPickerFor = openFor;
})();
