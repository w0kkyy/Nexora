/* =====================================================================
   consent.js — баннер согласия на куки + Яндекс Метрика + политика
   Метрика загружается ТОЛЬКО после нажатия «Разрешить».
   Публичный API:
     getCookieConsent()        -> 'granted' | 'denied' | null
     setCookieConsent(true|false)
     openCookieSettings()      -> снова показать баннер
     openPrivacyModal() / closePrivacyModal()
   ===================================================================== */
(function () {
  var YM_COUNTER_ID = 112968595;      // номер счётчика из metrika.yandex.ru
  var STORAGE_KEY = 'cookieConsent';  // 'granted' | 'denied'

  function getChoice() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }
  function setChoice(v) {
    try { localStorage.setItem(STORAGE_KEY, v); } catch (e) {}
  }

  /* ---------- 1. Яндекс Метрика ---------- */
  var metrikaLoaded = false;
  function loadMetrika() {
    if (metrikaLoaded || !YM_COUNTER_ID) return;
    window['disableYaCounter' + YM_COUNTER_ID] = false;
    metrikaLoaded = true;
    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      k = e.createElement(t); a = e.getElementsByTagName(t)[0];
      k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
    })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');
    window.ym(YM_COUNTER_ID, 'init', {
      clickmap: true,
      trackLinks: true,
      accurateTrackBounce: true,
      webvisor: false // запись действий выключена; если включишь — обнови текст политики
    });
  }

  // Отзыв согласия: останавливаем счётчик и удаляем его куки
  function stopMetrika() {
    if (YM_COUNTER_ID) window['disableYaCounter' + YM_COUNTER_ID] = true;
    var host = location.hostname, parts = host.split('.'), doms = [host];
    for (var i = 1; i < parts.length - 1; i++) doms.push('.' + parts.slice(i).join('.'));
    document.cookie.split(';').forEach(function (c) {
      var n = c.split('=')[0].trim();
      if (!/^_ym/.test(n)) return;
      var past = '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
      document.cookie = n + past;
      doms.forEach(function (d) { document.cookie = n + past + ';domain=' + d; });
    });
  }

  /* ---------- 2. Стили баннера ---------- */
  var css = '\
#ccBanner{position:fixed;left:16px;bottom:16px;z-index:1000000;width:min(420px,calc(100vw - 32px));\
background:var(--card,#232428);color:var(--text,#f3f4f6);border:1px solid var(--card-border,rgba(255,255,255,.1));border-radius:18px;padding:18px;\
box-shadow:0 12px 40px rgba(0,0,0,.55);font:500 13px/1.5 Onest,system-ui,sans-serif;\
transform:translateY(20px);opacity:0;transition:transform .3s ease,opacity .3s ease}\
#ccBanner.cc-show{transform:none;opacity:1}\
#ccBanner a{color:var(--accent,#3b82f6);text-decoration:underline;cursor:pointer}\
#ccBanner .cc-btns{display:flex;gap:10px;margin-top:14px}\
#ccBanner button{flex:1;padding:12px 10px;border-radius:12px;border:1px solid var(--card-border,rgba(255,255,255,.1));\
background:rgba(0,0,0,.35);color:var(--text,#fff);font:600 13px Onest,system-ui,sans-serif;cursor:pointer;transition:background .15s,border-color .15s}\
#ccBanner button:hover{background:rgba(0,0,0,.6);border-color:var(--accent,#3b82f6)}';
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  /* ---------- 3. Политика конфиденциальности (модалка в index.html) ---------- */
  function refreshStatus() {
    var el = document.getElementById('privMetrikaStatus');
    if (!el) return;
    var c = getChoice();
    el.textContent = c === 'granted' ? 'Метрика: разрешена.'
                   : c === 'denied'  ? 'Метрика: отключена.'
                   : 'Метрика: выбор ещё не сделан.';
  }
  window.openPrivacyModal = function () {
    var m = document.getElementById('privacyModal');
    if (!m) return;
    var dd = document.getElementById('profileDropdown');
    if (dd) dd.classList.remove('show');
    refreshStatus();
    m.classList.add('show');
  };
  window.closePrivacyModal = function () {
    var m = document.getElementById('privacyModal');
    if (m) m.classList.remove('show');
  };

  /* ---------- 4. Баннер ---------- */
  function hideBanner() {
    var b = document.getElementById('ccBanner');
    if (!b) return;
    b.classList.remove('cc-show');
    setTimeout(function () { b.remove(); }, 300);
  }
  function showBanner() {
    if (document.getElementById('ccBanner')) return;
    var b = document.createElement('div');
    b.id = 'ccBanner';
    b.innerHTML = '\
<div>Мы используем Яндекс Метрику, чтобы видеть, как люди пользуются сайтом. Она ставит куки и считает действия на странице. Без вашего согласия она не включится. <a id="ccMore">Подробнее</a> и <a id="ccText">текст согласия</a>.</div>\
<div class="cc-btns"><button type="button" id="ccAllow">Разрешить</button><button type="button" id="ccDeny">Отказаться</button></div>';
    document.body.appendChild(b);
    requestAnimationFrame(function () { b.classList.add('cc-show'); });
    b.querySelector('#ccMore').onclick = window.openPrivacyModal;
    b.querySelector('#ccText').onclick = window.openPrivacyModal;
    b.querySelector('#ccAllow').onclick = function () { window.setCookieConsent(true); };
    b.querySelector('#ccDeny').onclick = function () { window.setCookieConsent(false); };
  }

  /* ---------- 5. Публичный API ---------- */
  window.getCookieConsent = getChoice;
  window.setCookieConsent = function (granted) {
    setChoice(granted ? 'granted' : 'denied');
    if (granted) loadMetrika(); else stopMetrika();
    hideBanner();
    refreshStatus();
  };
  window.openCookieSettings = function () {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    refreshStatus();
    showBanner();
  };

  /* ---------- 6. Старт ---------- */
  function init() {
    var m = document.getElementById('privacyModal');
    if (m) m.addEventListener('click', function (e) { if (e.target === m) window.closePrivacyModal(); });
    var c = getChoice();
    if (c === 'granted') loadMetrika();
    else if (c !== 'denied') showBanner();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
