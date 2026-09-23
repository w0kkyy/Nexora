/* =====================================================================
   consent.js — баннер согласия на куки + подключение Яндекс Метрики
   Метрика загружается ТОЛЬКО после нажатия «Разрешить».
   ===================================================================== */
(function () {
  
  var YM_COUNTER_ID = 11296859595; // например 12345678
  // ▲▲▲ ────────────────────────────────────────────────────── ▲▲▲

  var STORAGE_KEY = 'cookieConsent'; // 'granted' | 'denied'

  function getChoice() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }
  function setChoice(v) {
    try { localStorage.setItem(STORAGE_KEY, v); } catch (e) {}
  }

  /* ---------- 1. Подключение Яндекс Метрики ---------- */
  var metrikaLoaded = false;
  function loadMetrika() {
    if (metrikaLoaded || !YM_COUNTER_ID) return;
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
      accurateTrackBounce: true
      // webvisor: true  // запись действий на странице — включай осознанно, см. текст согласия
    });
  }

  /* ---------- 2. Стили баннера ---------- */
  var css = '\
#ccBanner{position:fixed;left:16px;bottom:16px;z-index:1000000;width:min(420px,calc(100vw - 32px));\
background:#1b1b1d;color:#e8e8ea;border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:18px;\
box-shadow:0 12px 40px rgba(0,0,0,.55);font:500 13px/1.5 Onest,system-ui,sans-serif;\
transform:translateY(20px);opacity:0;transition:transform .3s ease,opacity .3s ease}\
#ccBanner.cc-show{transform:none;opacity:1}\
#ccBanner a{color:#9be21a;text-decoration:underline;cursor:pointer}\
#ccBanner .cc-btns{display:flex;gap:10px;margin-top:14px}\
#ccBanner button{flex:1;padding:12px 10px;border-radius:12px;border:1px solid rgba(255,255,255,.1);\
background:#0f0f10;color:#fff;font:600 13px Onest,system-ui,sans-serif;cursor:pointer;transition:background .15s,border-color .15s}\
#ccBanner button:hover{background:#000;border-color:rgba(255,255,255,.3)}\
#ccModal{position:fixed;inset:0;z-index:1000001;background:rgba(0,0,0,.65);display:none;align-items:center;justify-content:center;padding:16px}\
#ccModal.cc-show{display:flex}\
#ccModal .cc-box{background:#1b1b1d;color:#e8e8ea;border:1px solid rgba(255,255,255,.1);border-radius:18px;\
max-width:560px;width:100%;max-height:80vh;overflow:auto;padding:22px;font:400 14px/1.6 Onest,system-ui,sans-serif}\
#ccModal h3{margin-bottom:10px;font-size:18px}\
#ccModal p{margin-bottom:10px;color:#c9c9cc}\
#ccModal button{margin-top:6px;padding:10px 18px;border-radius:12px;border:1px solid rgba(255,255,255,.1);\
background:#0f0f10;color:#fff;font:600 13px Onest,system-ui,sans-serif;cursor:pointer}';
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  /* ---------- 3. Окно с текстом согласия ---------- */
  function buildModal() {
    var m = document.createElement('div');
    m.id = 'ccModal';
    m.innerHTML = '\
<div class="cc-box">\
<h3>Куки и Яндекс Метрика</h3>\
<p><b>Что это.</b> Куки — небольшие файлы, которые сайт сохраняет в твоём браузере. Мы используем сервис «Яндекс Метрика» (ООО «Яндекс»), чтобы понимать, как люди пользуются сайтом.</p>\
<p><b>Что собирается.</b> Данные о посещениях: какие страницы открывались, по каким кнопкам кликали, тип устройства и браузера, примерная география, время на сайте. Метрика ставит куки и записывает действия на странице.</p>\
<p><b>Зачем.</b> Только для статистики и улучшения сайта. Данные не продаются.</p>\
<p><b>Твой выбор.</b> Пока ты не нажал «Разрешить», Метрика не загружается и куки не ставятся. Отказ не ограничивает работу сайта. Изменить решение можно в любой момент — ссылка «Настройки куки» внизу сайта.</p>\
<p><b>Контакты оператора.</b> ВПИШИ СЮДА свой контакт (почта или Telegram) для вопросов и отзыва согласия.</p>\
<button type="button" id="ccModalClose">Закрыть</button>\
</div>';
    m.addEventListener('click', function (e) { if (e.target === m) m.classList.remove('cc-show'); });
    document.body.appendChild(m);
    m.querySelector('#ccModalClose').onclick = function () { m.classList.remove('cc-show'); };
    return m;
  }
  function openModal() {
    var m = document.getElementById('ccModal') || buildModal();
    m.classList.add('cc-show');
  }

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
<div>Мы используем Яндекс Метрику, чтобы видеть, как люди пользуются сайтом. Она ставит куки и записывает действия на странице. Без твоего согласия она не включится. <a id="ccMore">Подробнее</a> и <a id="ccText">текст согласия</a>.</div>\
<div class="cc-btns"><button type="button" id="ccAllow">Разрешить</button><button type="button" id="ccDeny">Отказаться</button></div>';
    document.body.appendChild(b);
    requestAnimationFrame(function () { b.classList.add('cc-show'); });
    b.querySelector('#ccMore').onclick = openModal;
    b.querySelector('#ccText').onclick = openModal;
    b.querySelector('#ccAllow').onclick = function () { setChoice('granted'); loadMetrika(); hideBanner(); };
    b.querySelector('#ccDeny').onclick = function () { setChoice('denied'); hideBanner(); };
  }

  /* ---------- 5. Повторное открытие настроек (для ссылки в футере/профиле) ---------- */
  window.openCookieSettings = function () {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    showBanner();
  };

  /* ---------- 6. Старт ---------- */
  function init() {
    var c = getChoice();
    if (c === 'granted') loadMetrika();
    else if (c !== 'denied') showBanner();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
