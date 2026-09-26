  // =====================================================================
  // ОГЛАВЛЕНИЕ JS (искать по этим меткам через Ctrl+F):
  // - ЛОГИКА ПОЛНОЭКРАННОГО РЕЖИМА          — открытие/закрытие модалок
  // - ЛОГИКА ИГРЫ 1/2/3                     — мини-игры (CS2 Quiz, Clicker, UFC)
  // - ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК                  — switchTab и связанная навигация
  // - АВТО-ОТКРЫТИЕ ВКЛАДКИ ПО ССЫЛКЕ       — deep-link из Telegram-бота (?tab=...)
  // - УМНЫЙ ПОИСК                           — поиск по платформе
  // - ПОДПИСКА (Premium/Lite)               — покупка и статус подписки
  // - ВХОД ЧЕРЕЗ TELEGRAM + МУЛЬТИАККАУНТЫ  — авторизация и мультиаккаунты
  // - TELEGRAM MINI APP                     — интеграция с Mini App API
  // - КОРОБКА СЕКРЕТОВ                      — анонимные признания
  // - остальное: модалки постов/профиля/друзей/видео/гостевой книги,
  //   рендер лент (посты, видео, фото), донаты, жалобы и модерация
  // === ФУНКЦИЯ ДЛЯ УВЕДОМЛЕНИЙ ===
  // =====================================================================
  const ADMIN_EMAILS = ["discoragen@gmail.com", "leznevnikita8@gmail.com"];

  let searchQuery = '';
  // Чёрный список хранится как массив объектов {id, name, avatarUrl}.
  // Поддерживаем обратную совместимость со старым форматом (массив строк-имён).
  let blockedUsers = (JSON.parse(localStorage.getItem('discoragen_blacklist') || '[]')).map(entry =>
    (typeof entry === 'string') ? { id: '', name: entry, avatarUrl: '' } : entry
  );
  // Есть ли пользователь с таким именем в чёрном списке
  // Проверить, есть ли пользователь с таким именем в чёрном списке
  function isBlockedName(name) {
    return blockedUsers.some(b => b.name === name);
  }
  // Сохранить чёрный список заблокированных пользователей в localStorage
  function saveBlockedUsers() {
    localStorage.setItem('discoragen_blacklist', JSON.stringify(blockedUsers));
  }
  
  let newPostFileBase64 = null;
  let newPostAccessMode = 'pub';
  let newPostIsExternalLink = false;

  let currentFeedType = 'all';
  let currentFeedSort = 'best';
  let currentFeedTime = 'today';

  // Запоминаем последнюю активную вкладку сайта, чтобы кнопка "Назад"
  // на странице профиля могла вернуть пользователя туда, откуда он пришёл.
  let lastActiveTab = 'main';

  /* ЛОГИКА ИГРЫ 1: CS2 QUIZ */
  const cs2Questions = [
    { q: "Какое основное оружие спецназа по умолчанию на закупке?", options: ["AK-47", "M4A4 / M4A1-S", "Galil AR", "Famas"], correct: 1 },
    { q: "Сколько раундов нужно выиграть в обычном соревновательном матче CS2 для победы?", options: ["13 раундов", "16 раундов", "9 раундов", "10 раундов"], correct: 0 },
    { q: "Как называется классическая карта с бомбсайтами A и B в пустыне?", options: ["Inferno", "Mirage", "Dust II", "Nuke"], correct: 2 }
  ];
  let currentQuizIdx = 0;
  let quizScore = 0;

  // Открыть модалку квиза CS2
  function openCs2QuizModal() {
    currentQuizIdx = 0;
    quizScore = 0;
    document.getElementById('cs2QuizModal').classList.add('show');
    renderQuizQuestion();
  }
  // Закрыть модалку квиза CS2
  function closeCs2QuizModal() {
    document.getElementById('cs2QuizModal').classList.remove('show');
  }
  // Отрисовать текущий вопрос квиза
  function renderQuizQuestion() {
    const container = document.getElementById('quizContent');
    if (currentQuizIdx >= cs2Questions.length) {
      container.innerHTML = `
        <div style="text-align:center; padding: 20px;">
          <h3 style="font-family:'Space Grotesk',sans-serif; margin-bottom: 10px; font-size: 20px;">Викторина завершена!</h3>
          <p style="color:var(--muted); margin-bottom: 16px;">Ваш результат: <strong>${quizScore} из ${cs2Questions.length}</strong></p>
          <button class="gb-send-btn" onclick="openCs2QuizModal()" style="width:100%;">Сыграть еще раз</button>
        </div>
      `;
      return;
    }
    const qObj = cs2Questions[currentQuizIdx];
    let html = `<div style="font-weight:700; font-size: 15px; margin-bottom: 12px; color: var(--text);">Вопрос ${currentQuizIdx + 1} из ${cs2Questions.length}:<br>${qObj.q}</div>`;
    qObj.options.forEach((opt, idx) => {
      html += `<button class="game-btn-option" onclick="answerCs2Quiz(${idx})">${opt}</button>`;
    });
    container.innerHTML = html;
  }
  // Обработать ответ пользователя на вопрос квиза
  function answerCs2Quiz(idx) {
    if (idx === cs2Questions[currentQuizIdx].correct) {
      quizScore++;
      showToast('Правильно!');
    } else {
      showToast('Неправильно!', 'error');
    }
    currentQuizIdx++;
    renderQuizQuestion();
  }

  /* ЛОГИКА ИГРЫ 2: CYBER CLICKER */
  let cyberScore = parseInt(localStorage.getItem('cyber_score') || '0');
  let cyberPower = parseInt(localStorage.getItem('cyber_power') || '1');
  let cyberAuto = parseInt(localStorage.getItem('cyber_auto') || '0');

  // Открыть модалку кликера Cyber Clicker
  function openCyberClickerModal() {
    document.getElementById('cyberClickerModal').classList.add('show');
    updateClickerUI();
  }
  // Закрыть модалку кликера, сохранив прогресс
  function closeCyberClickerModal() {
    document.getElementById('cyberClickerModal').classList.remove('show');
  }
  // Обработать клик игрока в кликере (+очки)
  function handleCyberClick() {
    cyberScore += cyberPower;
    saveClickerData();
    updateClickerUI();
  }
  // Купить улучшение в кликере
  function buyClickerUpgrade(type) {
    if (type === 'power') {
      let cost = 30 * cyberPower;
      if (cyberScore >= cost) {
        cyberScore -= cost;
        cyberPower++;
        showToast('Сила клика увеличена!');
      } else {
        showToast('Недостаточно очков!', 'error');
      }
    } else if (type === 'auto') {
      let cost = 50 * (cyberAuto + 1);
      if (cyberScore >= cost) {
        cyberScore -= cost;
        cyberAuto++;
        showToast('Auto-Clicker куплен!');
      } else {
        showToast('Недостаточно очков!', 'error');
      }
    }
    saveClickerData();
    updateClickerUI();
  }
  // Сохранить прогресс кликера в localStorage
  function saveClickerData() {
    localStorage.setItem('cyber_score', cyberScore);
    localStorage.setItem('cyber_power', cyberPower);
    localStorage.setItem('cyber_auto', cyberAuto);
  }
  // Обновить счётчики и кнопки в интерфейсе кликера
  function updateClickerUI() {
    const scoreEl = document.getElementById('clickerScore');
    if (scoreEl) scoreEl.textContent = cyberScore + ' очков';
    const autoBtn = document.getElementById('upgradeAutoBtn');
    if (autoBtn) autoBtn.textContent = `Купить Auto-Clicker (+1/сек) — ${50 * (cyberAuto + 1)} очков`;
    const powerBtn = document.getElementById('upgradePowerBtn');
    if (powerBtn) powerBtn.textContent = `Сила клика (+1 за клик) — ${30 * cyberPower} очков`;
  }
  setInterval(() => {
    if (cyberAuto > 0) {
      cyberScore += cyberAuto;
      saveClickerData();
      updateClickerUI();
    }
  }, 1000);

  /* ЛОГИКА ИГРЫ 3: UFC FIGHTER SIMULATOR */
  let ufcPower = parseInt(localStorage.getItem('ufc_power') || '12');
  let ufcStamina = parseInt(localStorage.getItem('ufc_stamina') || '12');
  let ufcWins = parseInt(localStorage.getItem('ufc_wins') || '0');

  // Открыть модалку симулятора UFC-бойца
  function openUfcSimulatorModal() {
    document.getElementById('ufcSimulatorModal').classList.add('show');
    updateUfcUI();
  }
  // Закрыть модалку симулятора UFC-бойца
  function closeUfcSimulatorModal() {
    document.getElementById('ufcSimulatorModal').classList.remove('show');
  }
  // Прокачать характеристику бойца за очки
  function trainUfcStat(stat) {
    if (stat === 'power') {
      ufcPower += 2;
      showToast('Сила бойца выросла!');
    } else {
      ufcStamina += 2;
      showToast('Выносливость бойца выросла!');
    }
    localStorage.setItem('ufc_power', ufcPower);
    localStorage.setItem('ufc_stamina', ufcStamina);
    updateUfcUI();
  }
  // Запустить бой в симуляторе UFC
  function startUfcFight() {
    const logEl = document.getElementById('ufcFightLog');
    let enemyPower = 15 + Math.floor(Math.random() * 10);
    let myTotal = ufcPower + ufcStamina;
    if (myTotal >= enemyPower) {
      ufcWins++;
      localStorage.setItem('ufc_wins', ufcWins);
      logEl.innerHTML = `<strong style="color: #10b981;">Победа нокаутом!</strong> Соперник повержен в октагоне.`;
      showToast('Победа в бою!');
    } else {
      logEl.innerHTML = `<strong style="color: var(--danger);">Поражение!</strong> Соперник оказался сильнее. Прокачай характеристики!`;
      showToast('Вы проиграли бой', 'error');
    }
    updateUfcUI();
  }
  // Обновить интерфейс симулятора (характеристики, кнопки)
  function updateUfcUI() {
    document.getElementById('ufcPower').textContent = ufcPower;
    document.getElementById('ufcStamina').textContent = ufcStamina;
    document.getElementById('ufcWins').textContent = ufcWins;
  }

  /* ПОЛНОЭКРАННЫЙ РЕЖИМ (кнопка в шапке, заменяет бывшее бургер-меню) */
  window.toggleSiteFullscreen = function () {
    const enterIcon = document.getElementById('fullscreenEnterIcon');
    const exitIcon = document.getElementById('fullscreenExitIcon');
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
    document.addEventListener('fullscreenchange', () => {
      const isFs = !!document.fullscreenElement;
      if (enterIcon) enterIcon.style.display = isFs ? 'none' : 'block';
      if (exitIcon) exitIcon.style.display = isFs ? 'block' : 'none';
    }, { once: true });
  };

  // Открыть/закрыть кастомный выпадающий список
  function toggleCustomDropdown(menuId, event) {
    event.stopPropagation();
    const menu = document.getElementById(menuId);
    document.querySelectorAll('.custom-dropdown-menu').forEach(m => {
      if (m.id !== menuId) m.classList.remove('show');
    });
    menu.classList.toggle('show');
  }

  document.addEventListener('click', () => {
    document.querySelectorAll('.custom-dropdown-menu').forEach(m => m.classList.remove('show'));
    const sDropdown = document.getElementById('smartSearchDropdown');
    if (sDropdown) sDropdown.style.display = 'none';
    const headerSearch = document.getElementById('headerSearch');
    if (headerSearch) headerSearch.classList.remove('expanded');
  });

  // Раскрыть/свернуть поиск в шапке по клику на кнопку-лупу
  window.toggleHeaderSearch = function(forceState) {
    const headerSearch = document.getElementById('headerSearch');
    if (!headerSearch) return;
    const willOpen = forceState !== undefined ? forceState : !headerSearch.classList.contains('expanded');
    headerSearch.classList.toggle('expanded', willOpen);
    if (willOpen) {
      setTimeout(() => {
        const input = document.getElementById('searchInput');
        if (input) input.focus();
      }, 50);
    } else {
      const dropdown = document.getElementById('smartSearchDropdown');
      if (dropdown) dropdown.style.display = 'none';
    }
  };

  // Выбрать тип отображаемой ленты
  function selectFeedType(type, label, el) {
    currentFeedType = type;
    document.getElementById('btnTypeLabel').textContent = label;
    el.parentNode.querySelectorAll('.custom-dropdown-item').forEach(i => i.classList.remove('active'));
    el.classList.add('active');
    renderPhotosGrid();
  }

  // Выбрать способ сортировки ленты
  function selectFeedSort(sort, label, el) {
    currentFeedSort = sort;
    document.getElementById('btnSortLabel').textContent = label;
    el.parentNode.querySelectorAll('.custom-dropdown-item').forEach(i => i.classList.remove('active'));
    el.classList.add('active');
    renderPhotosGrid();
  }

  // Выбрать период фильтрации ленты по времени
  function selectFeedTime(time, label, el) {
    currentFeedTime = time;
    document.getElementById('btnTimeLabel').textContent = label;
    el.parentNode.querySelectorAll('.custom-dropdown-item').forEach(i => i.classList.remove('active'));
    el.classList.add('active');
    renderPhotosGrid();
  }

  /* ===== АВТО-ОТКРЫТИЕ ВКЛАДКИ ПО ССЫЛКЕ ИЗ TELEGRAM-БОТА (?tab=...) ===== */
  // Поддерживаемые значения: ?tab=profile, ?tab=friends, ?tab=photos, ?tab=videos, ?tab=games, ?tab=dm, ?tab=newpost
  function applyStartTabFromUrl() {
    try {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (!tab) {
        // Нет параметра ?tab= — сайт открывается на гостевой книге по
        // умолчанию. Явно прогоняем через switchTab, чтобы правильно
        // подсветилась активная кнопка в нижнем мобильном меню.
        switchTab('main');
        return;
      }

      if (tab === 'profile') {
        // Профиль открывается отдельной функцией (подгружает данные пользователя),
        // но отображается как обычная страница, а не модалка поверх сайта
        openMyProfileModal();
      } else if (['main', 'newpost', 'photos', 'videos', 'games', 'friends', 'dm'].includes(tab)) {
        switchTab(tab);
      }

      // Убираем параметр из адресной строки, чтобы при обновлении страницы
      // пользователя не кидало обратно на ту же вкладку принудительно
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);
    } catch (e) {
      console.error('applyStartTabFromUrl error:', e);
    }
  }

  // Переключить активную вкладку сайта (профиль/друзья/лента и т.д.)
  // Если картинка аватара не загрузилась (битая ссылка/битый base64), вместо
  // "пустого"/прозрачного места показываем иконку-силуэт на сплошном фоне
  // блока (фон задаётся в CSS у .np-avatar-box / .dropdown-avatar), чтобы
  // профиль никогда не выглядел с прозрачным аватаром.
  function avatarImgFallback(imgEl) {
    const box = imgEl && imgEl.parentElement;
    if (!box) return;
    box.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:55%;height:55%;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  }

  // Вкладки, на которых футер (Поддержка/Разработка/Дизайн) вообще может быть показан
  const FOOTER_ELIGIBLE_TABS = ['games', 'newpost', 'main'];

  // Обновляет видимость футера в зависимости от текущей вкладки и позиции скролла.
  // Футер скрыт по умолчанию и появляется плавно только после того, как
  // пользователь проскроллит вниз, и только на разрешённых вкладках.
  function updateFooterVisibility() {
    const footer = document.querySelector('.site-footer');
    if (!footer) return;
    const scrolledDown = window.scrollY > 120;
    if (footerTabEligible && scrolledDown) {
      footer.classList.add('footer-shown');
    } else {
      footer.classList.remove('footer-shown');
    }
  }

  let footerTabEligible = false;
  window.addEventListener('scroll', updateFooterVisibility, { passive: true });

  // Скрыть все обычные страницы контента (используется и переключением вкладок,
  // и открытием страницы профиля — профиль не входит в этот список, т.к.
  // управляется отдельно).
  function hideAllContentPages() {
    ['mainPage', 'newPostPage', 'photosPage', 'videosPage', 'gamesPage', 'friendsPage', 'dmPage', 'secretsPage', 'settingsPage'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }

  // Переключить активную вкладку сайта: скрывает все страницы/пункты навигации
  // и показывает только ту, что соответствует tabName
  function switchTab(tabName) {
    const mainPage = document.getElementById('mainPage');
    const newPostPage = document.getElementById('newPostPage');
    const photosPage = document.getElementById('photosPage');
    const videosPage = document.getElementById('videosPage');
    const gamesPage = document.getElementById('gamesPage');
    const friendsPage = document.getElementById('friendsPage');
    const dmPage = document.getElementById('dmPage');
    const secretsPage = document.getElementById('secretsPage');

    const navMain = document.getElementById('navMain');
    const navNewPost = document.getElementById('navNewPost');
    const navPhotos = document.getElementById('navPhotos');
    const navVideos = document.getElementById('navVideos');
    const navGames = document.getElementById('navGames');
    const navDm = document.getElementById('navDm');

    mainPage.style.display = 'none';
    if (newPostPage) newPostPage.style.display = 'none';
    photosPage.style.display = 'none';
    videosPage.style.display = 'none';
    gamesPage.style.display = 'none';
    friendsPage.style.display = 'none';
    if (dmPage) dmPage.style.display = 'none';
    if (secretsPage) secretsPage.style.display = 'none';
    const settingsPageEl0 = document.getElementById('settingsPage');
    if (settingsPageEl0) settingsPageEl0.style.display = 'none';
    const profilePageEl = document.getElementById('userProfileModal');
    if (profilePageEl) profilePageEl.style.display = 'none';

    navMain.classList.remove('active');
    if (navNewPost) navNewPost.classList.remove('active');
    if (navPhotos) navPhotos.classList.remove('active');
    navVideos.classList.remove('active');
    navGames.classList.remove('active');
    if (navDm) navDm.classList.remove('active');

    // нижнее мобильное меню — активные состояния
    document.querySelectorAll('.mbn-item').forEach(l => l.classList.remove('active'));
    const mbnMap = { main: 'mbnGuestbook', photos: 'mbnPhotos', videos: 'mbnVideos', games: 'mbnGames', dm: 'mbnDm', newpost: 'mbnNewPost', settings: 'mbnSettings' };
    const mbnEl = document.getElementById(mbnMap[tabName]);
    if (mbnEl) mbnEl.classList.add('active');

    if (tabName === 'main') {
      mainPage.style.display = 'block';
      navMain.classList.add('active');
    } else if (tabName === 'newpost') {
      if (!auth.currentUser) {
        // не авторизован — показываем модал входа вместо вкладки
        switchTab('main');
        openLoginModal();
        return;
      }
      if (newPostPage) newPostPage.style.display = 'block';
      if (navNewPost) navNewPost.classList.add('active');
    } else if (tabName === 'videos') {
      if (!auth.currentUser) {
        switchTab('main');
        openLoginModal();
        return;
      }
      videosPage.style.display = 'block';
      navVideos.classList.add('active');
    } else if (tabName === 'photos') {
      photosPage.style.display = 'block';
      if (navPhotos) navPhotos.classList.add('active');
      renderPhotosGrid();
    } else if (tabName === 'games') {
      gamesPage.style.display = 'block';
      navGames.classList.add('active');
    } else if (tabName === 'friends') {
      friendsPage.style.display = 'block';
      renderFriendsList();
    } else if (tabName === 'dm') {
      if (dmPage) dmPage.style.display = 'block';
      if (navDm) navDm.classList.add('active');
    } else if (tabName === 'secrets') {
      if (secretsPage) secretsPage.style.display = 'block';
      renderSecrets();
    } else if (tabName === 'settings') {
      const settingsPageEl = document.getElementById('settingsPage');
      if (settingsPageEl) settingsPageEl.style.display = 'block';
    }

    // Футер разрешён только на вкладках "Игры" и "Создать пост", и то
    // появляется лишь после скролла вниз (см. updateFooterVisibility).
    footerTabEligible = FOOTER_ELIGIBLE_TABS.includes(tabName);
    updateFooterVisibility();

    lastActiveTab = tabName;

    maybeShowTabGuide(tabName);

    handleSmartSearch(searchQuery);
  }

  /* ===== ПЕРВОНАЧАЛЬНЫЙ ГАЙД ПО РАЗДЕЛУ (показывается один раз на устройстве) ===== */
  const TAB_GUIDES = {
    main:     { icon: '📖', title: 'ГОСТЕВАЯ КНИГА', text: 'Здесь можно оставить сообщение для всех гостей сайта. Войдите в аккаунт, чтобы писать — остальным сообщения видны без входа.' },
    photos:   { icon: '🖼️', title: 'ЛЕНТА', text: 'Здесь публикуются фото, видео и аудио от пользователей сайта. Ставьте лайки, пишите комментарии и делитесь своими постами.' },
    videos:   { icon: '▶️', title: 'ВИДОСЫ', text: 'Вы попали в раздел с предложкой видео на стримы. Каждое видео проходит модерацию — если его отклонили, значит оно не подошло под настроение и актуальный контент.' },
    games:    { icon: '🎮', title: 'ИГРЫ', text: 'Мини-игры сайта — кликер, бои и другие развлечения. Прогресс сохраняется на вашем аккаунте.' },
    dm:       { icon: '💬', title: 'ДМ', text: 'Личные сообщения с другими пользователями сайта. Переписка видна только вам и собеседнику.' },
    newpost:  { icon: '➕', title: 'СОЗДАТЬ ПОСТ', text: 'Опубликуйте своё фото, видео или аудио в общую ленту сайта.' },
    settings: { icon: '⚙️', title: 'НАСТРОЙКИ', text: 'Здесь собраны уведомления, смена темы оформления и вход в аккаунт.' }
  };

  const TAB_PAGE_IDS = { main: 'mainPage', newpost: 'newPostPage', photos: 'photosPage', videos: 'videosPage', games: 'gamesPage', dm: 'dmPage', settings: 'settingsPage' };

  // Показать разовую подсказку по разделу (TAB_GUIDES), если она ещё не была показана
  function maybeShowTabGuide(tabName) {
    const info = TAB_GUIDES[tabName];
    if (!info) return;
    const storageKey = 'nexora_guide_seen_' + tabName;
    if (localStorage.getItem(storageKey)) return;

    const pageEl = document.getElementById(TAB_PAGE_IDS[tabName]);
    if (!pageEl) return;
    if (pageEl.querySelector('.tab-guide-card')) return; // уже вставлен ранее

    const card = document.createElement('div');
    card.className = 'tab-guide-card';
    card.id = 'tabGuide_' + tabName;
    card.innerHTML = `
      <div class="tab-guide-top">
        <div class="tab-guide-icon">${info.icon}</div>
        <div>
          <div class="tab-guide-eyebrow">Раздел</div>
          <div class="tab-guide-title">${info.title}</div>
        </div>
      </div>
      <div class="tab-guide-divider"></div>
      <p class="tab-guide-text">${info.text}</p>
      <button type="button" class="gb-send-btn tab-guide-close-btn" onclick="dismissTabGuide('${tabName}')">Понял, спс за гайд</button>
    `;
    pageEl.insertBefore(card, pageEl.firstChild);
  }

  window.dismissTabGuide = function (tabName) {
    localStorage.setItem('nexora_guide_seen_' + tabName, '1');
    const card = document.getElementById('tabGuide_' + tabName);
    if (card) card.remove();
  };

  /* УМНЫЙ ПОИСК */
  function handleSmartSearch(query) {
    searchQuery = query.toLowerCase().trim();
    
    document.querySelectorAll('.search-input').forEach(inp => {
      if (inp.value !== query && inp.id !== 'userSearchInput') inp.value = query;
    });

    const dropdown = document.getElementById('smartSearchDropdown');
    if (!dropdown) return;

    if (!searchQuery) {
      dropdown.style.display = 'none';
      dropdown.innerHTML = '';
      return;
    }

    dropdown.style.display = 'block';
    dropdown.innerHTML = '<div style="color: var(--muted); font-size: 12px; text-align: center; padding: 10px;">Ищем везде...</div>';

    const matchedComments = currentMessagesList.filter(m => m.accessMode !== 'link' && (m.text || '').toLowerCase().includes(searchQuery));
    const matchedVideos = currentVideosList.filter(v => (v.title || '').toLowerCase().includes(searchQuery) || (v.category || '').toLowerCase().includes(searchQuery));
    const gamesCards = Array.from(document.querySelectorAll('.game-card'));
    const matchedGames = gamesCards.filter(g => (g.getAttribute('data-title') || '').toLowerCase().includes(searchQuery) || g.textContent.toLowerCase().includes(searchQuery));

    db.collection('users').get().then(snapshot => {
      let matchedUsers = [];
      snapshot.forEach(doc => {
        const u = doc.data();
        if ((u.username || '').toLowerCase().includes(searchQuery) || (u.email || '').toLowerCase().includes(searchQuery)) {
          matchedUsers.push({ id: doc.id, ...u });
        }
      });

      dropdown.innerHTML = '';
      let hasResults = false;

      if (matchedUsers.length > 0) {
        hasResults = true;
        const titleDiv = document.createElement('div');
        titleDiv.className = 'smart-search-section-title';
        titleDiv.textContent = `Пользователи (${matchedUsers.length})`;
        dropdown.appendChild(titleDiv);

        matchedUsers.forEach(u => {
          const item = document.createElement('div');
          item.className = 'smart-search-item';
          item.innerHTML = `<strong>${escapeHtml(u.username)}</strong> <span style="color:var(--muted); font-size:11.5px;">@${escapeHtml(u.username.toLowerCase())}</span>`;
          item.onclick = () => {
            dropdown.style.display = 'none';
            openUserProfile(u.id, u.username, u.avatarUrl);
          };
          dropdown.appendChild(item);
        });
      }

      if (matchedVideos.length > 0) {
        hasResults = true;
        const titleDiv = document.createElement('div');
        titleDiv.className = 'smart-search-section-title';
        titleDiv.textContent = `Видео (${matchedVideos.length})`;
        dropdown.appendChild(titleDiv);

        matchedVideos.forEach(v => {
          const item = document.createElement('a');
          item.className = 'smart-search-item';
          item.href = v.url;
          item.target = '_blank';
          item.innerHTML = `<span>▶</span> <span>${escapeHtml(v.title)}</span>`;
          item.onclick = () => { dropdown.style.display = 'none'; };
          dropdown.appendChild(item);
        });
      }

      if (matchedGames.length > 0) {
        hasResults = true;
        const titleDiv = document.createElement('div');
        titleDiv.className = 'smart-search-section-title';
        titleDiv.textContent = `Игры (${matchedGames.length})`;
        dropdown.appendChild(titleDiv);

        matchedGames.forEach(g => {
          const gName = g.querySelector('.game-name').textContent;
          const item = document.createElement('div');
          item.className = 'smart-search-item';
          item.innerHTML = `<span>${escapeHtml(gName)}</span>`;
          item.onclick = () => {
            dropdown.style.display = 'none';
            switchTab('games');
          };
          dropdown.appendChild(item);
        });
      }

      if (matchedComments.length > 0) {
        hasResults = true;
        const titleDiv = document.createElement('div');
        titleDiv.className = 'smart-search-section-title';
        titleDiv.textContent = `Комментарии / Записи (${matchedComments.length})`;
        dropdown.appendChild(titleDiv);

        matchedComments.slice(0, 5).forEach(m => {
          const item = document.createElement('div');
          item.className = 'smart-search-item';
          item.innerHTML = `<span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"><strong>@${escapeHtml(m.author)}:</strong> ${escapeHtml(m.text)}</span>`;
          item.onclick = () => {
            dropdown.style.display = 'none';
            switchTab('main');
          };
          dropdown.appendChild(item);
        });
      }

      if (!hasResults) {
        dropdown.innerHTML = '<div style="color: var(--muted); font-size: 13px; text-align: center; padding: 16px;">Ничего не найдено по вашему запросу</div>';
      }
    }).catch(err => {
      console.error(err);
    });
  }

  const profileMenuBtn = document.getElementById('profileMenuBtn');
  const profileDropdown = document.getElementById('profileDropdown');
  const supportModal = document.getElementById('supportModal');
  const donateModal = document.getElementById('donateModal');
  const rulesModal = document.getElementById('rulesModal');
  const suggestVideoModal = document.getElementById('suggestVideoModal');
  const loginModal = document.getElementById('loginModal');
  const registerModal = document.getElementById('registerModal');
  const editProfileModal = document.getElementById('editProfileModal');
  const userProfileModal = document.getElementById('userProfileModal');
  const reportsModal = document.getElementById('reportsModal');
  const adminPanelModal = document.getElementById('adminPanelModal');
  const subsAdminModal = document.getElementById('subsAdminModal');
  const banAdminModal = document.getElementById('banAdminModal');
  const topDonatorsModal = document.getElementById('topDonatorsModal');
  const settingsModal = document.getElementById('settingsModal');
  const viewPostModal = document.getElementById('viewPostModal');

  profileMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    // Закрываем уведомления: stopPropagation не даёт сработать закрытию по клику вне
    const notifDd = document.getElementById('notifDropdown');
    if (notifDd) notifDd.classList.remove('show');
    profileDropdown.classList.toggle('show');
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.profile-dropdown-container')) {
      profileDropdown.classList.remove('show');
    }
  });

  // ---- Колокольчик уведомлений (кнопка + закрытие по клику вне) ----
  const notifBtn = document.getElementById('notifBtn');
  const notifDropdown = document.getElementById('notifDropdown');
  if (notifBtn) {
    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleNotifDropdown();
    });
  }
  document.addEventListener('click', (e) => {
    if (notifDropdown && !e.target.closest('.notif-dropdown-container')) {
      notifDropdown.classList.remove('show');
    }
  });

  // Открыть модалку поддержки
  function openSupportModal() { profileDropdown.classList.remove('show'); supportModal.classList.add('show'); }
  function closeSupportModal() { supportModal.classList.remove('show'); } // Закрыть модалку поддержки

  let selectedDonateAmount = null;
  let finalDonateAmount = null;

  // Открыть модалку доната
  function openDonateModal() {
    profileDropdown.classList.remove('show');
    donateModal.classList.add('show');
    resetDonateModal();
  }

  // Закрыть модалку доната
  function closeDonateModal() {
    donateModal.classList.remove('show');
    resetDonateModal();
  }

  // Открыть объединённую модалку "Поддержать проект" (подписка + донат)
  window.openSupportProjectModal = function() {
    if (profileDropdown) profileDropdown.classList.remove('show');
    document.getElementById('supportProjectModal').classList.add('show');
  };
  window.closeSupportProjectModal = function() {
    document.getElementById('supportProjectModal').classList.remove('show');
  };

  // ===== ПОДПИСКА (Premium / Lite) =====
  let chosenSubTier = null;
  let chosenSubPrice = null;

  window.openSubscriptionModal = function() {
    if (profileDropdown) profileDropdown.classList.remove('show');
    document.getElementById('subStepPlans').style.display = 'block';
    document.getElementById('subStepPay').style.display = 'none';
    const giftLite = document.getElementById('subGiftLiteBtn');
    const giftPremium = document.getElementById('subGiftPremiumBtn');
    const showGift = isAdmin() ? 'flex' : 'none';
    if (giftLite) giftLite.style.display = showGift;
    if (giftPremium) giftPremium.style.display = showGift;
    document.getElementById('subscriptionModal').classList.add('show');
  };

  window.closeSubscriptionModal = function() {
    document.getElementById('subscriptionModal').classList.remove('show');
  };

  window.selectSubPlan = function(tier, price) {
    if (!auth.currentUser || !currentUserProfile) {
      showToast('Нужно войти в аккаунт, чтобы оформить подписку', 'error');
      return;
    }
    chosenSubTier = tier;
    chosenSubPrice = price;
    document.getElementById('subChosenPlanText').textContent = tier === 'premium' ? 'PREMIUM (287 ₽/мес)' : 'LITE (132 ₽/мес)';
    document.getElementById('subStepPlans').style.display = 'none';
    document.getElementById('subStepPay').style.display = 'block';
  };

  window.backToSubPlans = function() {
    document.getElementById('subStepPlans').style.display = 'block';
    document.getElementById('subStepPay').style.display = 'none';
  };

  window.confirmSubPaid = function() {
    if (!chosenSubTier || !auth.currentUser) return;
    db.collection('reports').add({
      type: 'subscription',
      tier: chosenSubTier,
      amount: chosenSubPrice,
      userId: auth.currentUser.uid,
      username: currentUserProfile ? currentUserProfile.username : 'Пользователь',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      showToast('Заявка отправлена! Подписка включится после проверки платежа админом.');
      closeSubscriptionModal();
    }).catch(err => {
      console.error(err);
      showToast('Ошибка отправки заявки. Попробуйте позже.', 'error');
    });
  };

  // Сбросить модалку доната к первому шагу
  function resetDonateModal() {
    selectedDonateAmount = null;
    finalDonateAmount = null;
    document.getElementById('donateStepAmount').style.display = 'block';
    document.getElementById('donateStepWarning').style.display = 'none';
    document.getElementById('donateStepNickname').style.display = 'none';
    document.getElementById('donateQrBox').classList.remove('show');
    document.getElementById('donateCustomAmountInput').style.display = 'none';
    document.getElementById('donateCustomAmountInput').value = '';
    document.getElementById('donateNicknameInput').value = '';
    document.querySelectorAll('#donateAmountsGrid .donate-amount-btn').forEach(b => b.classList.remove('active'));
  }

  // Выбрать сумму доната
  function selectDonateAmount(value, btnEl) {
    document.querySelectorAll('#donateAmountsGrid .donate-amount-btn').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
    const customInput = document.getElementById('donateCustomAmountInput');
    if (value === 'custom') {
      customInput.style.display = 'block';
      customInput.focus();
      selectedDonateAmount = 'custom';
    } else {
      customInput.style.display = 'none';
      selectedDonateAmount = value;
    }
  }

  // Перейти к шагу предупреждения перед донатом
  function proceedToDonateWarning() {
    let amount = selectedDonateAmount;
    if (amount === 'custom') {
      const customVal = parseFloat(document.getElementById('donateCustomAmountInput').value);
      if (!customVal || customVal <= 0) {
        showToast('Введите корректную сумму доната', 'error');
        return;
      }
      amount = customVal;
    }
    if (!amount) {
      showToast('Сначала выберите или введите сумму доната', 'error');
      return;
    }
    finalDonateAmount = amount;
    document.getElementById('donateWarningAmountText').textContent = `на сумму ${amount} ₽`;
    document.getElementById('donateStepAmount').style.display = 'none';
    document.getElementById('donateStepWarning').style.display = 'block';
  }

  // Вернуться от предупреждения к выбору суммы доната
  function backToDonateAmount() {
    document.getElementById('donateStepWarning').style.display = 'none';
    document.getElementById('donateStepAmount').style.display = 'block';
  }

  // Перейти к шагу ввода никнейма для доната
  function proceedToDonateNickname() {
    document.getElementById('donateStepWarning').style.display = 'none';
    document.getElementById('donateStepNickname').style.display = 'block';
  }

  // Вернуться от ввода никнейма к предупреждению
  function backToDonateWarning() {
    document.getElementById('donateStepNickname').style.display = 'none';
    document.getElementById('donateStepWarning').style.display = 'block';
  }

  // Показать QR-код для оплаты доната
  function showDonateQr() {
    document.getElementById('donateStepNickname').style.display = 'none';
    document.getElementById('donateQrBox').classList.add('show');
  }

  // Подтвердить, что донат отправлен
  function confirmDonateDone() {
    const nicknameRaw = document.getElementById('donateNicknameInput').value.trim();
    const displayName = nicknameRaw || 'Аноним';
    const reporterId = (auth.currentUser && auth.currentUser.displayName) ? auth.currentUser.displayName : 'Гость';
    const userId = auth.currentUser ? auth.currentUser.uid : null;

    db.collection('reports').add({
      type: 'donation',
      displayName: displayName,
      amount: finalDonateAmount,
      reporterId: reporterId,
      userId: userId,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      showToast('Спасибо за поддержку! Как только мы подтвердим перевод, вы появитесь в топ-донатерах.');
      closeDonateModal();
    }).catch(err => {
      console.error(err);
      showToast('Спасибо за поддержку проекта!');
      closeDonateModal();
    });
  }

  // Запасной способ копирования текста (для браузеров без Clipboard API)
  function fallbackCopyText(text, onDone) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    if (onDone) onDone();
  }
  // Открыть модалку с правилами платформы
  function openRulesModal() { profileDropdown.classList.remove('show'); rulesModal.classList.add('show'); }
  function closeRulesModal() { rulesModal.classList.remove('show'); } // Закрыть модалку с правилами
  // Открыть модалку предложения видео
  function openSuggestVideoModal() { suggestVideoModal.classList.add('show'); }
  // Закрыть модалку предложения видео и очистить поле ввода
  function closeSuggestVideoModal() {
    suggestVideoModal.classList.remove('show');
    document.getElementById('suggestVideoUrl').value = '';
    document.getElementById('suggestVideoComment').value = '';
    document.getElementById('suggestPreviewBox').style.backgroundImage = 'none';
    document.getElementById('suggestPreviewText').style.display = 'block';
  }

  // Открыть единое окно настроек (вкладки: активность / пароль / входы / уведомления / чёрный список / скрытые авторы)
  window.openSettingsModal = function (tab) {
    profileDropdown.classList.remove('show');
    settingsModal.classList.add('show');
    switchSettingsTab(tab || 'activity');
  };
  // Закрыть единое окно настроек
  window.closeSettingsModal = function () {
    settingsModal.classList.remove('show');
    const cp = document.getElementById('currentPasswordInput');
    const np = document.getElementById('newPasswordInput');
    if (cp) cp.value = '';
    if (np) np.value = '';
  };

  // Переключить вкладку в едином окне настроек
  window.switchSettingsTab = function (tab) {
    const tabs = { activity: 'stTabActivity', password: 'stTabPassword', logins: 'stTabLogins', notifs: 'stTabNotifs', blacklist: 'stTabBlacklist', hidden: 'stTabHidden' };
    const panes = { activity: 'stPaneActivity', password: 'stPanePassword', logins: 'stPaneLogins', notifs: 'stPaneNotifs', blacklist: 'stPaneBlacklist', hidden: 'stPaneHidden' };
    Object.keys(tabs).forEach(key => {
      const tabEl = document.getElementById(tabs[key]);
      const paneEl = document.getElementById(panes[key]);
      if (tabEl) tabEl.classList.toggle('active', key === tab);
      if (paneEl) paneEl.style.display = key === tab ? 'block' : 'none';
    });
    if (tab === 'activity') renderActivityHistory();
    if (tab === 'logins') fetchLoginLogs();
    if (tab === 'notifs') loadNotifSettingsUI();
    if (tab === 'blacklist') renderBlacklist();
    if (tab === 'hidden') renderHiddenAuthorsPane();
  };

  // Открыть страницу своего профиля
  function openMyProfileModal() {
    profileDropdown.classList.remove('show');
    const user = auth.currentUser;
    if (!user) {
      showToast('Войдите в аккаунт, чтобы посмотреть свой профиль!', 'error');
      openLoginModal();
      return;
    }
    openUserProfile(user.uid, currentUserProfile ? currentUserProfile.username : (user.displayName || 'User'), currentUserProfile ? currentUserProfile.avatarUrl : '');
  }

  // Отрисовать текущее состояние тумблеров настроек уведомлений
  function loadNotifSettingsUI() {
    const settings = (currentUserProfile && currentUserProfile.notifSettings) || {};
    const map = { likes: 'notifSettingLikeToggle', comments: 'notifSettingCommentToggle', subscribes: 'notifSettingSubscribeToggle' };
    Object.keys(map).forEach(key => {
      const el = document.getElementById(map[key]);
      if (!el) return;
      const isOn = settings[key] !== false; // по умолчанию включено
      el.classList.toggle('on', isOn);
    });
    if (!auth.currentUser) {
      showToast('Войдите в аккаунт, чтобы управлять настройками уведомлений', 'error');
    }
  }

  // Переключить настройку уведомлений (лайки/комментарии/подписчики) и сохранить в Firestore
  window.toggleNotifSetting = function(key) {
    const user = auth.currentUser;
    if (!user) {
      showToast('Войдите в аккаунт, чтобы управлять настройками уведомлений', 'error');
      return;
    }
    if (!currentUserProfile) currentUserProfile = {};
    if (!currentUserProfile.notifSettings) currentUserProfile.notifSettings = {};
    const currentVal = currentUserProfile.notifSettings[key] !== false;
    const newVal = !currentVal;
    currentUserProfile.notifSettings[key] = newVal;

    const map = { likes: 'notifSettingLikeToggle', comments: 'notifSettingCommentToggle', subscribes: 'notifSettingSubscribeToggle' };
    const el = document.getElementById(map[key]);
    if (el) el.classList.toggle('on', newVal);

    db.collection('users').doc(user.uid).set({
      notifSettings: currentUserProfile.notifSettings
    }, { merge: true }).catch(err => {
      console.error(err);
      showToast('Не удалось сохранить настройку', 'error');
    });
  };

  // Отрисовать текущее состояние тумблера приватности (видимость подписок/подписчиков)
  function loadPrivacySettingsUI() {
    const el = document.getElementById('privacyFollowStatsToggle');
    if (!el) return;
    const isOn = !currentUserProfile || currentUserProfile.showFollowStats !== false; // по умолчанию видно
    el.classList.toggle('on', isOn);
  }

  // Переключить настройку приватности профиля и сохранить в Firestore
  window.toggleProfilePrivacySetting = function(key) {
    const user = auth.currentUser;
    if (!user) {
      showToast('Войдите в аккаунт, чтобы управлять приватностью', 'error');
      return;
    }
    if (!currentUserProfile) currentUserProfile = {};
    const currentVal = currentUserProfile[key] !== false;
    const newVal = !currentVal;
    currentUserProfile[key] = newVal;

    const map = { showFollowStats: 'privacyFollowStatsToggle' };
    const el = document.getElementById(map[key]);
    if (el) el.classList.toggle('on', newVal);

    db.collection('users').doc(user.uid).set({
      [key]: newVal
    }, { merge: true }).then(() => {
      showToast(newVal ? 'Подписки и подписчики снова видны в профиле' : 'Подписки и подписчики скрыты от других');
    }).catch(err => {
      console.error(err);
      showToast('Не удалось сохранить настройку', 'error');
    });
  };

  // Сменить пароль пользователя через Firebase Auth
  function updatePasswordUser() {
    const currentPass = document.getElementById('currentPasswordInput').value;
    const newPass = document.getElementById('newPasswordInput').value;
    const user = auth.currentUser;

    if (!currentPass || !newPass) {
      showToast('Заполните все поля!', 'error');
      return;
    }
    if (newPass.length < 6) {
      showToast('Новый пароль должен быть не менее 6 символов!', 'error');
      return;
    }

    const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPass);
    user.reauthenticateWithCredential(credential).then(() => {
      return user.updatePassword(newPass);
    }).then(() => {
      closeSettingsModal();
      showToast('Пароль успешно изменен!');
    }).catch(err => {
      console.error(err);
      showToast('Ошибка смены пароля (неверный текущий пароль?)', 'error');
    });
  }

  // Записать факт входа в лог (для истории входов)
  function recordLoginLog(userId) {
    db.collection('users').doc(userId).collection('login_logs').add({
      device: navigator.userAgent,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      localTime: Date.now()
    }).catch(e => console.error(e));
  }

  // Загрузить историю входов пользователя
  function fetchLoginLogs() {
    const container = document.getElementById('loginLogsContainer');
    container.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 20px;">Загрузка логов...</div>';
    const user = auth.currentUser;
    if (!user) {
      container.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 20px;">Неавторизован</div>';
      return;
    }

    db.collection('users').doc(user.uid).collection('login_logs').orderBy('timestamp', 'desc').get().then(snapshot => {
      container.innerHTML = '';
      if (snapshot.empty) {
        container.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 20px;">Логи входов пока отсутствуют</div>';
        return;
      }
      snapshot.forEach(doc => {
        const log = doc.data();
        const timeInfo = formatMessageTime(log.timestamp, log.localTime);
        const div = document.createElement('div');
        div.style.cssText = 'background: rgba(150,150,150,0.05); border: 1px solid var(--card-border); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 4px;';
        div.innerHTML = `
          <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--accent); font-weight: 600;">
            <span>Успешный вход в аккаунт</span>
            <span>${timeInfo.display}</span>
          </div>
          <div style="font-size: 12.5px; color: var(--muted); word-break: break-all;">Устройство / Браузер: ${escapeHtml(log.device || 'Неизвестно')}</div>
        `;
        container.appendChild(div);
      });
    }).catch(err => {
      console.error(err);
      container.innerHTML = '<div style="color: var(--danger); text-align: center; padding: 20px;">Ошибка загрузки логов</div>';
    });
  }

  // Разобрать текст поста на заголовок и описание
  function parsePostContent(msg) {
    let title = 'Публикация';
    let desc = msg.text || '';

    if (msg.text) {
      let cleanText = msg.text.replace(/^\s*/, '');
      const match = cleanText.match(/\*\*(.*?)\*\*\n([\s\S]*)/);
      if (match) {
        title = match[1];
        desc = match[2];
      } else {
        const lines = cleanText.split('\n');
        if (lines.length > 0 && lines[0].trim().length > 0) {
          title = lines[0];
          desc = lines.slice(1).join('\n');
        }
      }
    }
    return { title, desc };
  }

  // Открыть модалку просмотра поста
  // Список постов, доступных для пролистывания в модалке, и текущий индекс
  let reelsAllPosts = [];
  let reelsCurrentIndex = 0;
  // Блокировки, чтобы нельзя было проголосовать несколько раз, пока идёт запрос
  let voteLocksInProgress = {};

  // Открыть полноэкранный просмотр поста (режим "рилс") начиная с targetMsgId
  function openViewPostModal(targetMsgId) {
    // Пост «только по ссылке» открывается один, без листания соседних постов
    const linkTarget = currentMessagesList.find(m => m.id === targetMsgId);
    if (linkTarget && linkTarget.image && linkTarget.accessMode === 'link') {
      reelsAllPosts = [linkTarget];
    } else {
      reelsAllPosts = currentMessagesList.filter(m => m.image && m.accessMode !== 'link' && !isBlockedName(m.author));
    }

    if (reelsAllPosts.length === 0) {
      showToast('Нет доступных медиа-постов', 'error');
      return;
    }

    const targetIndex = reelsAllPosts.findIndex(m => m.id === targetMsgId);
    reelsCurrentIndex = targetIndex !== -1 ? targetIndex : 0;

    renderReelCard(reelsCurrentIndex);
    viewPostModal.classList.add('show');
    // Блокируем скролл страницы позади модалки — иначе фон остаётся
    // прокрученным и это мешает свайпать/листать пост.
    document.body.style.overflow = 'hidden';
  }

  // Отрисовать один пост по индексу в списке reelsAllPosts (постраничный просмотр, вместо общего скролла)
  function renderReelCard(index) {
    const reelsContainer = document.getElementById('reelsContainer');
    if (!reelsContainer) return;
    reelsContainer.innerHTML = '';
    clearAlbumHintTimers();

    const msg = reelsAllPosts[index];
    if (!msg) return;

    const parsed = parsePostContent(msg);
    const timeInfo = formatMessageTime(msg.createdAt, msg.localTime);
    const { votesUp, votesDown } = getPostVoteCounts(msg);
    const score = votesUp - votesDown;
    const myVote = localStorage.getItem(`postvote_${msg.id}`); // 'up' | 'down' | null
    const viewsCount = msg.views || 0;
    registerPostView(msg.id);

    let avatarHTML = msg.avatarUrl 
      ? `<img src="${escapeHtml(msg.avatarUrl)}" alt="Avatar">` 
      : (msg.author || 'A')[0].toUpperCase();

    const isNsfwHidden = !!msg.isNSFW && !window.revealedNsfwIds.has(msg.id);
    const albumImgs = getPostImages(msg);
    const isAlbum = albumImgs.length > 1;

    let mediaHTML = '';
    if (isAlbum) {
      window.reelAlbumIndexes[msg.id] = window.reelAlbumIndexes[msg.id] || 0;
      const startIdx = window.reelAlbumIndexes[msg.id];
      const firstSrc = albumImgs[startIdx];
      const firstIsVideo = firstSrc.startsWith('data:video/') || firstSrc.includes('.mp4') || firstSrc.includes('.webm');
      const dotsHTML = albumImgs.map((_, i) => `<span class="album-dot ${i === startIdx ? 'active' : ''}" onclick="goToAlbumSlide('${msg.id}', ${i}, event)"></span>`).join('');
      mediaHTML = `
        <div class="reel-media-frame">
          <div id="albumFrame_${msg.id}" class="reel-media-frame${isNsfwHidden ? ' nsfw-blurred' : ''}" data-nsfw-media="${msg.id}">
            ${firstIsVideo
              ? `<video controls src="${firstSrc}"></video>`
              : `<img src="${firstSrc}" alt="Media" onclick="openAlbumLightbox('${msg.id}', event)" />`}
          </div>
          <div class="album-nav-arrow prev" onclick="changeAlbumSlide('${msg.id}', -1, event)"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg></div>
          <div class="album-nav-arrow next" onclick="changeAlbumSlide('${msg.id}', 1, event)"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></div>
          <div class="album-dots-row">${dotsHTML}</div>
          <div class="album-hint-badge" id="albumHint_${msg.id}"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>Это альбом, можно листать</div>
          ${isNsfwHidden ? nsfwOverlayHTML(msg.id, false) : ''}
        </div>
      `;
    } else if (msg.image) {
      if (msg.isExternalLink) {
        mediaHTML = `<a href="${escapeHtml(msg.image)}" target="_blank" rel="noopener" style="display: flex; align-items: center; justify-content: center; gap: 10px; height: 260px; background: rgba(59,130,246,0.1); border: 1px dashed var(--accent); border-radius: 10px; color: var(--accent); font-weight: 700; font-size: 15px; text-decoration: none;">Открыть файл по ссылке</a>`;
      } else if (msg.image.startsWith('data:video/') || msg.image.includes('.mp4') || msg.image.includes('.webm')) {
        mediaHTML = `<div class="reel-media-frame"><div class="reel-media-frame${isNsfwHidden ? ' nsfw-blurred' : ''}" data-nsfw-media="${msg.id}"><video controls src="${msg.image}"></video></div>${isNsfwHidden ? nsfwOverlayHTML(msg.id, false) : ''}</div>`;
      } else if (msg.image.startsWith('data:audio/') || msg.image.includes('.mp3') || msg.image.includes('.wav')) {
        mediaHTML = window.buildAudioPlayerHTML(msg.image, msg.fileName || parsed.title || 'audio');
      } else {
        mediaHTML = `<div class="reel-media-frame"><div class="reel-media-frame${isNsfwHidden ? ' nsfw-blurred' : ''}" data-nsfw-media="${msg.id}"><img src="${msg.image}" alt="Media" onclick="openAlbumLightbox('${msg.id}', event)" /></div>${isNsfwHidden ? nsfwOverlayHTML(msg.id, false) : ''}</div>`;
      }
    } else {
      // Пост без медиа (текстовый) — показываем аккуратную текстовую карточку вместо пустого чёрного поля
      mediaHTML = `<div class="reel-textonly-frame"><div class="reel-textonly-card"><div class="reel-textonly-title">${escapeHtml(parsed.title)}</div>${parsed.desc ? `<div class="reel-textonly-desc">${escapeHtml(parsed.desc)}</div>` : ''}</div></div>`;
    }

    const card = document.createElement('div');
    card.className = 'reel-card';
    card.id = `reel_card_${msg.id}`;

    const isSubscribed = !!(currentUserProfile && currentUserProfile.subscriptions && currentUserProfile.subscriptions.includes(msg.userId || msg.author));
    const subBadgeIcon = isSubscribed
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;

    card.innerHTML = `
      <div class="reel-media-col">
        ${mediaHTML}
      </div>
      <div class="reel-sidebar">
      <div class="reel-sidebar-scroll">
      <div class="reel-header">
        <div class="reel-avatar-wrap">
          <div class="reel-avatar ${premiumUsersMap[msg.userId] && premiumUsersMap[msg.userId].subTier === 'premium' ? 'avatar-frame-premium' : ''}" onclick="openUserProfile('${escapeHtml(msg.userId || '')}', '${escapeHtml(msg.author || '')}', '${escapeHtml(msg.avatarUrl || '')}')" title="Посмотреть профиль">
            ${avatarHTML}
          </div>
          <div class="reel-subscribe-badge ${isSubscribed ? 'subscribed' : ''}" id="subBadge_${msg.id}" onclick="event.stopPropagation(); toggleAuthorSubscription('${escapeHtml(msg.userId || msg.author || '')}', '${escapeHtml(msg.author || '')}', '${msg.id}')" title="${isSubscribed ? 'Отписаться' : 'Подписаться'}">${subBadgeIcon}</div>
        </div>
        <div class="reel-author-col">
          <div class="reel-author-top-row">
            <span class="reel-author-name" ${getUserNameStyle(msg.userId)} onclick="openUserProfile('${escapeHtml(msg.userId || '')}', '${escapeHtml(msg.author || '')}', '${escapeHtml(msg.avatarUrl || '')}')" style="cursor: pointer;">${escapeHtml(msg.author || 'Пользователь')}</span>${getUserBadgeHTML(msg.userId)}
            <span class="reel-date">${timeInfo.display}</span>
          </div>
          <div class="reel-author-handle-row">
            <svg class="reel-handle-tg-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M21.05 2.31 2.87 9.4c-1.24.5-1.23 1.19-.23 1.5l4.66 1.46 1.8 5.6c.22.6.36.85.75.85.3 0 .43-.14.6-.3l1.7-1.65 3.6 2.66c.66.37 1.14.18 1.3-.6l2.37-11.2c.24-1-.36-1.44-1.24-1.4zM9.6 13.86l7.6-6.53c.34-.28-.07-.42-.5-.16l-9.4 5.93-1.83-.6c-.4-.13-.4-.4.08-.6l7.14-2.75c.33-.13.63.08.5.6l-1.2 6.6c-.09.44-.35.55-.7.34l-1.94-1.43-.94.9c-.1.1-.19.19-.4.19z"/></svg>
            <span class="reel-author-handle">@${escapeHtml(msg.author || '')}</span>
          </div>
        </div>
      </div>

      <div class="reel-title">${escapeHtml(parsed.title)}</div>
      ${parsed.desc ? `<div class="reel-desc">${escapeHtml(parsed.desc)}</div>` : ''}

      <div class="reel-actions-bar">
        <div class="reel-action-group">
          <div class="reel-vote-widget" id="voteWidget_${msg.id}">
            <button class="vote-btn vote-btn-up ${myVote === 'up' ? 'active' : ''}" onclick="handlePostVote('${msg.id}', 'up')" title="Нравится">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
            </button>
            <span class="vote-score-badge ${myVote === 'up' ? 'is-up' : ''} ${myVote === 'down' ? 'is-down' : ''}" id="reel_like_count_${msg.id}">${score}</span>
            <button class="vote-btn vote-btn-down ${myVote === 'down' ? 'active' : ''}" onclick="handlePostVote('${msg.id}', 'down')" title="Не нравится">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
          </div>
          <button class="reel-act-btn" onclick="downloadPostMedia('${msg.id}')" title="Скачать файл">
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          </button>
          <button class="reel-act-btn" onclick="copyPostLink('${msg.id}')" title="Поделиться">
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11 4.93"></path><path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07L13 19.07"></path></svg>
          </button>
          <button class="reel-act-btn" onclick="reportMessage('${msg.id}')" title="Пожаловаться">
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V4"></path><path d="M4 4h14l-2.5 4L18 12H4"></path></svg>
          </button>
          ${isAdmin() ? `<button class="reel-act-btn" style="color: var(--danger);" onclick="deleteMessage('${msg.id}')" title="Удалить"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path></svg></button>` : ''}
        </div>

        <div class="reel-views-count">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> <span>${viewsCount}</span>
        </div>
      </div>

      <div class="reel-comments-section">
        <div class="reel-comments-header">
          <span id="reel_comment_title_${msg.id}">0 комментариев</span>
          <span class="reel-comments-sort">⇄ Упорядочить</span>
        </div>

        <div class="reel-comments-list" id="reelCommentsList_${msg.id}">
          <div style="color: var(--muted); font-size: 12.5px; text-align: center; padding: 10px;">Загрузка комментариев...</div>
        </div>
      </div>
      </div>

      <div class="reel-comment-input-box">
        <div class="reel-avatar" style="width: 36px; height: 36px; font-size: 14px;">
          ${currentUserProfile && currentUserProfile.avatarUrl ? `<img src="${escapeHtml(currentUserProfile.avatarUrl)}">` : (currentUserProfile ? currentUserProfile.username[0].toUpperCase() : 'G')}
        </div>
        <div class="reel-input-wrapper">
          <input type="text" class="reel-comment-input" id="reelInput_${msg.id}" placeholder="Введите комментарий..." oninput="handleReelInputState('${msg.id}')" onkeydown="if(event.key==='Enter') submitReelComment('${msg.id}')" />
          <div class="reel-comment-input-bottom">
            <div class="comment-emoji-picker-container">
              <button type="button" class="comment-emoji-btn" onclick="toggleCommentEmojiPicker('${msg.id}')" title="Стикеры/эмодзи">
                <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
              </button>
              <div class="comment-emoji-popup" id="commentPicker_${msg.id}">
                <button type="button" class="picker-emoji-opt" onclick="insertCommentEmoji('${msg.id}', '😀')">😀</button>
                <button type="button" class="picker-emoji-opt" onclick="insertCommentEmoji('${msg.id}', '😂')">😂</button>
                <button type="button" class="picker-emoji-opt" onclick="insertCommentEmoji('${msg.id}', '😍')">😍</button>
                <button type="button" class="picker-emoji-opt" onclick="insertCommentEmoji('${msg.id}', '😢')">😢</button>
                <button type="button" class="picker-emoji-opt" onclick="insertCommentEmoji('${msg.id}', '😡')">😡</button>
                <button type="button" class="picker-emoji-opt" onclick="insertCommentEmoji('${msg.id}', '👍')">👍</button>
                <button type="button" class="picker-emoji-opt" onclick="insertCommentEmoji('${msg.id}', '❤')">❤</button>
                <button type="button" class="picker-emoji-opt" onclick="insertCommentEmoji('${msg.id}', '🔥')">🔥</button>
                <button type="button" class="picker-emoji-opt" onclick="insertCommentEmoji('${msg.id}', '💀')">💀</button>
                <button type="button" class="picker-emoji-opt" onclick="insertCommentEmoji('${msg.id}', '🚀')">🚀</button>
                <button type="button" class="picker-emoji-opt" onclick="insertCommentEmoji('${msg.id}', '⭐')">⭐</button>
                <button type="button" class="picker-emoji-opt" onclick="insertCommentEmoji('${msg.id}', '💯')">💯</button>
              </div>
            </div>
            <button class="reel-submit-comment-btn" id="reelSubmitBtn_${msg.id}" onclick="submitReelComment('${msg.id}')">Оставить комментарий</button>
          </div>
        </div>
      </div>
      </div>
    `;

    reelsContainer.appendChild(card);
    listenReelComments(msg.id);
    reelsContainer.scrollTop = 0;
    updateReelsNavButtons();
    if (isAlbum) scheduleAlbumHint(msg.id);
  }

  // Показать/скрыть стрелки "пред./след. пост" в зависимости от позиции в списке
  function updateReelsNavButtons() {
    const prevBtn = document.getElementById('reelsPrevBtn');
    const nextBtn = document.getElementById('reelsNextBtn');
    if (prevBtn) prevBtn.style.display = reelsCurrentIndex > 0 ? 'flex' : 'none';
    if (nextBtn) nextBtn.style.display = reelsCurrentIndex < reelsAllPosts.length - 1 ? 'flex' : 'none';
  }

  // Перейти к следующему посту (стрелка вправо)
  window.reelsGoNext = function() {
    if (reelsCurrentIndex < reelsAllPosts.length - 1) {
      reelsCurrentIndex++;
      renderReelCard(reelsCurrentIndex);
      flashReelsEdge('right');
    }
  };

  // Перейти к предыдущему посту (стрелка влево)
  window.reelsGoPrev = function() {
    if (reelsCurrentIndex > 0) {
      reelsCurrentIndex--;
      renderReelCard(reelsCurrentIndex);
      flashReelsEdge('left');
    }
  };

  // Подсветить край экрана синим при переключении поста
  let reelsEdgeGlowTimeout = null;
  // Кратковременно подсветить левый/правый край экрана синим свечением
  function flashReelsEdge(side) {
    const el = document.getElementById(side === 'left' ? 'reelsEdgeGlowLeft' : 'reelsEdgeGlowRight');
    if (!el) return;
    el.classList.remove('flash');
    void el.offsetWidth; // форсируем перезапуск CSS-анимации
    el.classList.add('flash');
    clearTimeout(reelsEdgeGlowTimeout);
    reelsEdgeGlowTimeout = setTimeout(() => el.classList.remove('flash'), 500);
  }

  // Единый обработчик Esc: закрывает то, что сейчас открыто сверху —
  // лайтбокс фото → любую модалку → развёрнутый просмотр поста → страницу
  // профиля → мобильное меню → уведомления/меню профиля → раскрытый поиск.
  // Стрелки влево/вправо продолжают листать фото в лайтбоксе или посты в ленте.
  document.addEventListener('keydown', (e) => {
    const lightbox = document.getElementById('albumLightbox');
    if (lightbox && lightbox.classList.contains('show')) {
      if (e.key === 'Escape') window.closeAlbumLightbox();
      else if (e.key === 'ArrowRight') window.lightboxGoSlide(1);
      else if (e.key === 'ArrowLeft') window.lightboxGoSlide(-1);
      return;
    }

    if (e.key === 'Escape') {
      const openModal = document.querySelector('.modal-overlay.show');
      const profilePageEl = document.getElementById('userProfileModal');
      const profileOpen = profilePageEl && profilePageEl.style.display === 'block';
      const notifDropdownEl = document.getElementById('notifDropdown');
      const profileDropdownEl = document.getElementById('profileDropdown');
      const headerSearchEl = document.getElementById('headerSearch');

      if (viewPostModal && viewPostModal.classList.contains('show')) {
        closeViewPostModal();
      } else if (openModal) {
        openModal.classList.remove('show');
      } else if (profileOpen) {
        closeUserProfileModal();
      } else if (notifDropdownEl && notifDropdownEl.classList.contains('show')) {
        notifDropdownEl.classList.remove('show');
      } else if (profileDropdownEl && profileDropdownEl.classList.contains('show')) {
        profileDropdownEl.classList.remove('show');
      } else if (headerSearchEl && headerSearchEl.classList.contains('expanded')) {
        window.toggleHeaderSearch(false);
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.blur();
      }
      return;
    }

    if (!viewPostModal || !viewPostModal.classList.contains('show')) return;
    if (e.key === 'ArrowRight') window.reelsGoNext();
    else if (e.key === 'ArrowLeft') window.reelsGoPrev();
  });

  // Голосование за пост: один пользователь — один голос (лайк ИЛИ дизлайк, не оба сразу)
  window.handlePostVote = function(msgId, direction) {
    if (voteLocksInProgress[msgId]) return; // защита от повторных кликов, пока идёт запрос
    voteLocksInProgress[msgId] = true;

    const voteKey = `postvote_${msgId}`;
    const currentVote = localStorage.getItem(voteKey); // 'up' | 'down' | null
    const msgRef = db.collection('messages').doc(msgId);

    db.runTransaction(async (transaction) => {
      const doc = await transaction.get(msgRef);
      if (!doc.exists) throw new Error('NOT_FOUND');
      const data = doc.data();
      let votesUp = Number(data.votesUp || (data.reactions && data.reactions['👍']) || 0);
      let votesDown = Number(data.votesDown || (data.reactions && data.reactions['👎']) || 0);

      if (currentVote === direction) {
        // Повторное нажатие на уже активную кнопку — отменяем голос
        if (direction === 'up') votesUp = Math.max(0, votesUp - 1);
        else votesDown = Math.max(0, votesDown - 1);
      } else {
        // Убираем предыдущий голос пользователя (если был) и ставим новый
        if (currentVote === 'up') votesUp = Math.max(0, votesUp - 1);
        if (currentVote === 'down') votesDown = Math.max(0, votesDown - 1);
        if (direction === 'up') votesUp += 1; else votesDown += 1;
      }

      transaction.update(msgRef, { votesUp, votesDown });
      return { votesUp, votesDown };
    }).then((result) => {
      const newVote = (currentVote === direction) ? null : direction;
      if (newVote) localStorage.setItem(voteKey, newVote);
      else localStorage.removeItem(voteKey);

      // Точечно обновляем DOM без полного ререндера поста (не сбивает скролл/комментарии)
      const scoreEl = document.getElementById(`reel_like_count_${msgId}`);
      if (scoreEl) {
        scoreEl.textContent = result.votesUp - result.votesDown;
        scoreEl.classList.toggle('is-up', newVote === 'up');
        scoreEl.classList.toggle('is-down', newVote === 'down');
      }
      const widget = document.getElementById(`voteWidget_${msgId}`);
      if (widget) {
        const upBtn = widget.querySelector('.vote-btn-up');
        const downBtn = widget.querySelector('.vote-btn-down');
        if (upBtn) upBtn.classList.toggle('active', newVote === 'up');
        if (downBtn) downBtn.classList.toggle('active', newVote === 'down');
      }

      // Обновляем локальный кэш, чтобы счёт был верным при повторном открытии/пересортировке
      const cachedMsg = currentMessagesList.find(m => m.id === msgId);
      if (cachedMsg) {
        cachedMsg.votesUp = result.votesUp;
        cachedMsg.votesDown = result.votesDown;
      }
      const cachedReel = reelsAllPosts.find(m => m.id === msgId);
      if (cachedReel) {
        cachedReel.votesUp = result.votesUp;
        cachedReel.votesDown = result.votesDown;
      }
    }).catch(err => {
      console.error(err);
      if (err.message === 'NOT_FOUND') {
        showToast('Пост не найден', 'error');
      } else {
        showToast('Ошибка голосования, попробуйте ещё раз', 'error');
      }
    }).finally(() => {
      voteLocksInProgress[msgId] = false;
    });
  };

  // Учёт РЕАЛЬНЫХ просмотров поста. Засчитываем не более одного просмотра
  // с одного устройства/браузера на пост (флаг в localStorage), инкрементируем
  // счётчик в Firestore и сразу обновляем локальный кэш, чтобы цифра на экране
  // была актуальной без перезагрузки страницы.
  const viewedPostsRegistering = new Set();
  // Засчитать просмотр поста для конкретного msgId (см. пояснение выше)
  function registerPostView(msgId) {
    if (!msgId) return;
    const viewKey = `viewed_post_${msgId}`;
    if (localStorage.getItem(viewKey) === 'true') return;
    if (viewedPostsRegistering.has(msgId)) return;
    viewedPostsRegistering.add(msgId);

    localStorage.setItem(viewKey, 'true');

    db.collection('messages').doc(msgId).update({
      views: firebase.firestore.FieldValue.increment(1)
    }).then(() => {
      const cachedMsg = currentMessagesList.find(m => m.id === msgId);
      if (cachedMsg) cachedMsg.views = (cachedMsg.views || 0) + 1;
      const cachedReel = reelsAllPosts.find(m => m.id === msgId);
      if (cachedReel) cachedReel.views = (cachedReel.views || 0) + 1;

      const viewsEl = document.querySelector(`#reelsContainer .reel-views-count span`);
      if (viewsEl && cachedReel) viewsEl.textContent = cachedReel.views;
      updateGlobalStatistics();
    }).catch(err => {
      // Если по какой-то причине запись не удалась — не блокируем повторные попытки навсегда
      localStorage.removeItem(viewKey);
      viewedPostsRegistering.delete(msgId);
      console.error('Ошибка учёта просмотра:', err);
    });
  }

  // Включить/выключить кнопку отправки в зависимости от заполненности поля комментария
  function handleReelInputState(msgId) {
    const input = document.getElementById(`reelInput_${msgId}`);
    const btn = document.getElementById(`reelSubmitBtn_${msgId}`);
    if (input && btn) {
      if (input.value.trim().length > 0) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }
  }

  // Подписаться на комментарии к посту в реальном времени
  // Удалить комментарий к посту (доступно только админам)
  window.deleteReelComment = function(msgId, commentId, event) {
    if (event) event.stopPropagation();
    if (!isAdmin()) {
      showToast('Недостаточно прав!', 'error');
      return;
    }
    if (!confirm('Удалить этот комментарий?')) return;
    db.collection('messages').doc(msgId).collection('comments').doc(commentId).delete().then(() => {
      showToast('Комментарий удалён');
    }).catch(err => {
      showToast('Ошибка удаления', 'error');
    });
  };

  // Подписаться на живое обновление комментариев к посту msgId (режим "рилс")
  function listenReelComments(msgId) {
    const commentsListContainer = document.getElementById(`reelCommentsList_${msgId}`);
    const commentTitle = document.getElementById(`reel_comment_title_${msgId}`);

    db.collection('messages').doc(msgId).collection('comments').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
      if (!commentsListContainer) return;
      commentsListContainer.innerHTML = '';

      if (commentTitle) {
        commentTitle.textContent = `${snapshot.size} комментария`;
      }

      if (snapshot.empty) {
        commentsListContainer.innerHTML = `<div style="color: var(--muted); font-size: 12.5px; text-align: center; padding: 12px;">Пока нет комментариев. Будьте первыми!</div>`;
        return;
      }

      snapshot.forEach(doc => {
        const c = doc.data();
        const timeInfo = formatMessageTime(c.createdAt, c.localTime);
        const item = document.createElement('div');
        item.className = 'reel-comment-item';

        let cAvatar = c.avatarUrl ? `<img src="${escapeHtml(c.avatarUrl)}">` : (c.author || 'A')[0].toUpperCase();
        const cUserId = escapeHtml(c.userId || '');
        const cAuthorName = escapeHtml(c.author || 'Аноним');
        const cAvatarUrl = escapeHtml(c.avatarUrl || '');
        const commentId = escapeHtml(doc.id);

        item.innerHTML = `
          <div class="reel-avatar ${premiumUsersMap[c.userId] && premiumUsersMap[c.userId].subTier === 'premium' ? 'avatar-frame-premium' : ''}" style="width: 34px; height: 34px; font-size: 13px; cursor: pointer;" onclick="openUserProfile('${cUserId}', '${cAuthorName}', '${cAvatarUrl}')" title="Посмотреть профиль">${cAvatar}</div>
          <div class="reel-comment-content">
            <div class="reel-comment-meta">
              <span class="reel-comment-author" ${getUserNameStyle(c.userId)} onclick="openUserProfile('${cUserId}', '${cAuthorName}', '${cAvatarUrl}')" title="Посмотреть профиль">${cAuthorName}</span>${getUserBadgeHTML(c.userId)}
              <span class="reel-comment-time">${timeInfo.display}</span>
            </div>
            <div class="reel-comment-text">${escapeHtml(c.text)}</div>
            <div class="reel-comment-actions">
              <button class="reel-vote-btn" onclick="showToast('👍 Вы поддержали комментарий')">↑ <span>${c.likes || 1}</span></button>
              <button class="reel-vote-btn" onclick="showToast('👎 Оценка отправлена')">↓</button>
              <button class="reel-reply-btn" onclick="replyToComment('${msgId}', '${escapeHtml(c.author)}')">Ответить</button>
              ${isAdmin() ? `<button class="reel-reply-btn" style="color: var(--danger);" onclick="deleteReelComment('${msgId}', '${commentId}', event)" title="Удалить комментарий (админ)">Удалить</button>` : ''}
            </div>
          </div>
        `;
        commentsListContainer.appendChild(item);
      });
    });
  }

  // Открыть/закрыть попап эмодзи ДЛЯ ПОЛЯ КОММЕНТАРИЯ (не реакция на пост!)
  window.toggleCommentEmojiPicker = function(msgId, event) {
    if (event) event.stopPropagation();
    document.querySelectorAll('.comment-emoji-popup').forEach(p => {
      if (p.id !== `commentPicker_${msgId}`) p.classList.remove('show');
    });
    const picker = document.getElementById(`commentPicker_${msgId}`);
    if (picker) picker.classList.toggle('show');
  };

  // Вставить эмодзи/стикер в текст комментария в позицию курсора (или в конец)
  window.insertCommentEmoji = function(msgId, emoji) {
    const input = document.getElementById(`reelInput_${msgId}`);
    if (!input) return;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    input.value = input.value.slice(0, start) + emoji + input.value.slice(end);
    const newPos = start + emoji.length;
    input.focus();
    input.setSelectionRange(newPos, newPos);
    handleReelInputState(msgId);
    const picker = document.getElementById(`commentPicker_${msgId}`);
    if (picker) picker.classList.remove('show');
  };

  // Закрывать попап эмодзи комментария при клике вне его
  document.addEventListener('click', function(event) {
    if (!event.target.closest('.comment-emoji-picker-container')) {
      document.querySelectorAll('.comment-emoji-popup').forEach(p => p.classList.remove('show'));
    }
  });

  // Эмодзи в описании нового поста (форма "Создать пост")
  window.toggleNewPostEmojiPicker = function(event) {
    if (event) event.stopPropagation();
    document.querySelectorAll('.comment-emoji-popup').forEach(p => {
      if (p.id !== 'newPostEmojiPicker') p.classList.remove('show');
    });
    const picker = document.getElementById('newPostEmojiPicker');
    if (picker) picker.classList.toggle('show');
  };

  window.insertNewPostEmoji = function(emoji) {
    const textarea = document.getElementById('newPostDesc');
    if (!textarea) return;
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    textarea.value = textarea.value.slice(0, start) + emoji + textarea.value.slice(end);
    const newPos = start + emoji.length;
    textarea.focus();
    textarea.setSelectionRange(newPos, newPos);
    const picker = document.getElementById('newPostEmojiPicker');
    if (picker) picker.classList.remove('show');
  };

  // Ответить на комментарий
  function replyToComment(msgId, authorName) {
    const input = document.getElementById(`reelInput_${msgId}`);
    if (input) {
      input.value = `@${authorName}, `;
      input.focus();
      handleReelInputState(msgId);
    }
  }

  // Отправить новый комментарий к посту
  function submitReelComment(msgId) {
    if (blockedByRestriction('comments', 'Комментирование')) return;
    const input = document.getElementById(`reelInput_${msgId}`);
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    const currentUser = auth.currentUser;
    const authorName = currentUserProfile ? currentUserProfile.username : (currentUser ? (currentUser.displayName || 'User') : ('guest_' + Math.floor(Math.random() * 900 + 100)));
    const userAvatarUrl = currentUserProfile ? currentUserProfile.avatarUrl : '';

    db.collection('messages').doc(msgId).collection('comments').add({
      author: authorName,
      avatarUrl: userAvatarUrl,
      userId: currentUser ? currentUser.uid : '',
      text: text,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      localTime: Date.now(),
      likes: 1
    }).then(() => {
      input.value = '';
      handleReelInputState(msgId);
      showToast('Комментарий успешно опубликован!');
      const msg = currentMessagesList.find(m => m.id === msgId);
      if (msg && msg.userId && (!currentUser || msg.userId !== currentUser.uid)) {
        sendPersonalNotification(msg.userId, 'comment', 'Новый комментарий', `${authorName} прокомментировал(а) ваш пост: «${text.length > 60 ? text.slice(0, 60).trim() + '…' : text}»`);
      }
    }).catch(err => {
      console.error(err);
      showToast('Ошибка отправки комментария', 'error');
    });
  }

  // Скачать медиафайл поста
  function downloadPostMedia(msgId) {
    const msg = currentMessagesList.find(m => m.id === msgId);
    if (!msg || !msg.image) {
      showToast('У этого поста нет медиафайла для скачивания!', 'error');
      return;
    }
    if (msg.isExternalLink) {
      window.open(msg.image, '_blank', 'noopener');
      return;
    }
    const a = document.createElement('a');
    a.href = msg.image;
    a.download = `file_${msgId}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Загрузка файла начата...');
  }

  // Ссылка на пост (открывает пост напрямую, в том числе опубликованный «только по ссылке»)
  function getPostLink(msgId) {
    return window.location.origin + window.location.pathname + `#post_${msgId}`;
  }

  // Копирование текста в буфер обмена, с запасным вариантом для http / старых браузеров
  function copyTextToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise((resolve, reject) => {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        ok ? resolve() : reject(new Error('copy failed'));
      } catch (e) { reject(e); }
    });
  }

  // Скопировать ссылку на пост в буфер обмена
  function copyPostLink(msgId) {
    const link = getPostLink(msgId);
    copyTextToClipboard(link).then(() => {
      showToast('Ссылка на пост скопирована в буфер обмена!');
    }).catch(() => {
      window.prompt('Скопируйте ссылку на пост:', link);
    });
  }

  // Открыть пост по ссылке вида #post_<id> (в том числе пост «только по ссылке»)
  let deepLinkDoneFor = null;
  function tryOpenDeepLinkPost() {
    const m = (window.location.hash || '').match(/^#post_([A-Za-z0-9_-]+)$/);
    if (!m) return;
    const id = m[1];
    if (deepLinkDoneFor === id) return;
    deepLinkDoneFor = id;
    const post = currentMessagesList.find(x => x.id === id);
    if (!post || !post.image) {
      showToast('Пост не найден или был удалён', 'error');
      return;
    }
    switchTab('photos');
    openViewPostModal(id);
  }
  window.addEventListener('hashchange', () => { deepLinkDoneFor = null; tryOpenDeepLinkPost(); });

  // Закрыть модалку просмотра поста
  function closeViewPostModal() {
    viewPostModal.classList.remove('show');
    clearAlbumHintTimers();
    // Возвращаем скролл страницы после закрытия просмотра поста.
    document.body.style.overflow = '';
    // При выходе с поста цензура 18+ снова включается — раскрытие контента
    // действует только пока пользователь находится внутри просмотра поста.
    window.revealedNsfwIds = new Set();
    window.albumHintShownIds = new Set();
    renderPhotosGrid();
  }

  // Установить тип доступа к новому посту (публичный / по ссылке)
  function setAccessType(mode) {
    newPostAccessMode = mode;
    const pubBtn = document.getElementById('accessPubBtn');
    const linkBtn = document.getElementById('accessLinkBtn');
    const hint = document.getElementById('accessHint');
    if (hint) hint.textContent = mode === 'link'
      ? 'Пост не попадёт в ленту, профиль и поиск. Открыть его смогут только те, у кого есть ссылка — вы получите её сразу после публикации.'
      : 'Пост появится в общей ленте.';
    if (mode === 'pub') {
      pubBtn.classList.add('selected');
      linkBtn.classList.remove('selected');
    } else {
      linkBtn.classList.add('selected');
      pubBtn.classList.remove('selected');
    }
  }

  // Открыть системный диалог выбора файла для нового поста
  function triggerNewPostFileInput() {
    document.getElementById('newPostFileInput').click();
  }

  // Массив base64/ссылок для альбома (несколько фото к одному посту)
  window.newPostImages = window.newPostImages || [];
  // Флаг 18+ для нового поста
  window.newPostIsNSFW = window.newPostIsNSFW || false;

  // Переключить флаг 18+ для нового поста
  function toggleNsfwFlag() {
    window.newPostIsNSFW = !window.newPostIsNSFW;
    const btn = document.getElementById('nsfwToggleBtn');
    if (btn) {
      btn.classList.toggle('selected', window.newPostIsNSFW);
      btn.setAttribute('aria-checked', window.newPostIsNSFW ? 'true' : 'false');
    }
  }

  // Обновить индикатор количества выбранных файлов для нового поста
  function updateNewPostSubmitState() {
    const btn = document.getElementById('newPostSubmitBtn');
    if (!btn) return;
    const hasFile = !!newPostFileBase64;
    btn.textContent = hasFile ? 'Опубликовать' : 'Добавьте файл';
    btn.classList.toggle('is-empty', !hasFile);
  }

  function updateNewPostFileIndicator() {
    updateNewPostSubmitState();
    const indicator = document.getElementById('newPostFileIndicator');
    if (!indicator) return;
    const imgs = window.newPostImages || [];
    if (imgs.length === 0) {
      indicator.style.display = 'none';
      indicator.innerHTML = '';
      return;
    }
    const names = window.newPostFileNames || [];
    const chips = imgs.map((src, i) => {
      const label = newPostIsExternalLink ? src : (names[i] || ('Файл ' + (i + 1)));
      return `<div class="np-file-chip">
        <span class="np-file-chip-name" title="${escapeHtml(label)}">✓ ${escapeHtml(label)}</span>
        <button type="button" class="np-file-chip-x" title="Убрать файл" aria-label="Убрать файл" onclick="removeNewPostFile(event, ${i})">✕</button>
      </div>`;
    }).join('');
    const clearAll = imgs.length > 1
      ? `<button type="button" class="np-file-clear-all" onclick="clearNewPostFiles(event)">Убрать все (${imgs.length})</button>`
      : '';
    indicator.innerHTML = chips + clearAll;
    indicator.onclick = e => e.stopPropagation(); // клики по списку файлов не открывают диалог выбора
    indicator.style.display = 'flex';
  }

  // Убрать один прикреплённый файл из нового поста
  window.removeNewPostFile = function (ev, index) {
    if (ev) { ev.stopPropagation(); ev.preventDefault(); }
    const imgs = window.newPostImages || [];
    if (index < 0 || index >= imgs.length) return;
    imgs.splice(index, 1);
    if (window.newPostFileNames) window.newPostFileNames.splice(index, 1);
    newPostFileBase64 = imgs[0] || null;
    if (imgs.length === 0) newPostIsExternalLink = false;
    const input = document.getElementById('newPostFileInput');
    if (input) input.value = '';
    updateNewPostFileIndicator();
    showToast('Файл убран из поста');
  };

  // Убрать все прикреплённые файлы
  window.clearNewPostFiles = function (ev) {
    if (ev) { ev.stopPropagation(); ev.preventDefault(); }
    window.newPostImages = [];
    window.newPostFileNames = [];
    newPostFileBase64 = null;
    newPostIsExternalLink = false;
    const input = document.getElementById('newPostFileInput');
    if (input) input.value = '';
    updateNewPostFileIndicator();
    showToast('Все файлы убраны из поста');
  };

  // Общая логика обработки выбранного файла (используется и для клика, и для drag-n-drop)
  function processNewPostFile(file, inputEl) {
    if (!file) return;
    const MAX_SIZE = 1 * 1024 * 1024;

    if (file.size > MAX_SIZE) {
      if (inputEl) inputEl.value = '';
      openLinkUploadModal();
      return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      window.newPostImages.push(e.target.result);
      window.newPostFileNames = window.newPostFileNames || [];
      window.newPostFileNames.push(file.name || '');
      newPostFileBase64 = window.newPostImages[0];
      newPostIsExternalLink = false;
      updateNewPostFileIndicator();
      showToast('Медиафайл успешно прикреплен!');
    };
    reader.readAsDataURL(file);
  }

  // Обработать выбор файла(ов) для нового поста (через системный диалог) — поддерживает альбом из нескольких фото
  function handleNewPostFileSelect(event) {
    const files = Array.from(event.target.files || []);
    files.forEach(file => processNewPostFile(file, event.target));
    // сбрасываем значение, чтобы тот же файл можно было выбрать повторно после удаления
    event.target.value = '';
  }

  // Перетаскивание файла в зону загрузки (drag-n-drop)
  function handleNewPostDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    const zone = document.getElementById('dropZone');
    if (zone) zone.classList.add('dropzone-dragover');
  }

  // Курсор покинул зону загрузки — убрать подсветку drag-n-drop
  function handleNewPostDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    const zone = document.getElementById('dropZone');
    if (zone) zone.classList.remove('dropzone-dragover');
  }

  // Файл(ы) отпущены в зону загрузки — обработать каждый как выбранный файл
  function handleNewPostFileDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    const zone = document.getElementById('dropZone');
    if (zone) zone.classList.remove('dropzone-dragover');
    const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
    processNewPostFile(file);
  }

  // Открыть модалку загрузки медиа по ссылке
  function openLinkUploadModal() {
    document.getElementById('linkUploadInput').value = '';
    document.getElementById('linkUploadModal').classList.add('show');
  }

  // Закрыть модалку загрузки медиа по ссылке
  function closeLinkUploadModal() {
    document.getElementById('linkUploadModal').classList.remove('show');
  }

  // Подтвердить ссылку на медиа для нового поста
  function confirmMediaLink() {
    const link = document.getElementById('linkUploadInput').value.trim();
    if (!link) {
      showToast('Вставьте ссылку на файл', 'error');
      return;
    }
    try {
      new URL(link);
    } catch {
      showToast('Некорректная ссылка', 'error');
      return;
    }

    newPostFileBase64 = link;
    newPostIsExternalLink = true;
    window.newPostImages = [link];
    window.newPostFileNames = [];
    updateNewPostFileIndicator();
    closeLinkUploadModal();
    showToast('Ссылка на файл прикреплена!');
  }

  // Отправить новый пост на публикацию
  function submitNewPost() {
    if (blockedByRestriction('media', 'Публикация фото/видео/аудио')) return;
    const title = document.getElementById('newPostTitle').value.trim();
    const desc = document.getElementById('newPostDesc').value.trim();

    if (!title) {
      showToast('Заполните название публикации!', 'error');
      return;
    }

    if (!newPostFileBase64) {
      showToast('В ленту можно публиковать только видео, фото и аудио файлы! Прикрепите файл.', 'error');
      return;
    }

    const currentUser = auth.currentUser;
    const authorName = currentUserProfile ? currentUserProfile.username : (currentUser ? (currentUser.displayName || 'User') : ('guest_' + Math.floor(Math.random() * 900 + 100)));
    const userAvatarUrl = currentUserProfile ? currentUserProfile.avatarUrl : '';
    const userIdVal = currentUser ? currentUser.uid : ('guest_' + Math.random());

    const fullText = `**${title}**\n${desc}`;

    showActionLoader('Публикация поста...');

    db.collection('messages').add({
      userId: userIdVal,
      author: authorName,
      avatarUrl: userAvatarUrl,
      text: fullText,
      image: newPostFileBase64,
      fileName: (window.newPostFileNames && window.newPostFileNames[0]) || '',
      images: window.newPostImages.length > 1 ? window.newPostImages.slice() : [],
      isNSFW: !!window.newPostIsNSFW,
      accessMode: newPostAccessMode,
      isExternalLink: newPostIsExternalLink,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      localTime: Date.now(),
      votesUp: 0,
      votesDown: 0,
      pinned: false
    }).then((docRef) => {
      hideActionLoader();
      const publishedAsLink = newPostAccessMode === 'link';
      document.getElementById('newPostTitle').value = '';
      document.getElementById('newPostDesc').value = '';
      newPostFileBase64 = null;
      newPostIsExternalLink = false;
      window.newPostImages = [];
      window.newPostFileNames = [];
      window.newPostIsNSFW = false;
      const nsfwBtn = document.getElementById('nsfwToggleBtn');
      if (nsfwBtn) { nsfwBtn.classList.remove('selected'); nsfwBtn.setAttribute('aria-checked', 'false'); }
      updateNewPostSubmitState();
      const ind = document.getElementById('newPostFileIndicator');
      if (ind) { ind.style.display = 'none'; ind.innerHTML = ''; }
      if (publishedAsLink && docRef && docRef.id) {
        switchTab('photos');
        openPostLinkModal(docRef.id);
      } else {
        showToast('Медиа-пост успешно опубликован в ленту!');
        switchTab('photos');
      }
    }).catch(err => {
      hideActionLoader();
      console.error(err);
      showToast('Ошибка публикации поста', 'error');
    });
  }

  // Открыть модалку входа
  function openLoginModal() {
    profileDropdown.classList.remove('show');
    loginModal.classList.add('show');
    mountTelegramAuthWidget('tgAuthWrapLogin');
  }
  // Закрыть модалку входа
  function closeLoginModal() { loginModal.classList.remove('show'); }
  // Открыть модалку регистрации
  function openRegisterModal() {
    profileDropdown.classList.remove('show');
    registerModal.classList.add('show');
    mountTelegramAuthWidget('tgAuthWrapRegister');
    regFormOpenedAt = Date.now(); // время открытия формы — используется антибот-проверкой (см. registerUser)
    const regUsernameEl = document.getElementById('regUsername');
    if (regUsernameEl && !regUsernameEl.value && tgUser) {
      regUsernameEl.value = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || tgUser.username || '';
    }
  }
  // Закрыть модалку регистрации
  function closeRegisterModal() { registerModal.classList.remove('show'); }

  // Открыть модалку жалоб (для админов/модераторов)
  function openReportsModal() {
    profileDropdown.classList.remove('show');
    reportsModal.classList.add('show');
    fetchReports();
  }
  // Закрыть модалку жалоб
  function closeReportsModal() { reportsModal.classList.remove('show'); }

  // Открыть хаб админ-панели (единая кнопка со всеми инструментами админа)
  function openAdminPanelModal() {
    if (!isAdmin()) return;
    profileDropdown.classList.remove('show');
    adminPanelModal.classList.add('show');
  }
  function closeAdminPanelModal() { adminPanelModal.classList.remove('show'); } // Закрыть админ-панель

  // Открыть панель выдачи подписок
  function openSubsAdminModal() {
    if (!isAdmin()) return;
    subsAdminModal.classList.add('show');
    const resultsBox = document.getElementById('subAdminResults');
    if (resultsBox) resultsBox.innerHTML = '<div style="color: var(--muted); font-size: 12.5px; text-align:center; padding: 8px;">Введите никнейм или email для поиска</div>';
  }
  function closeSubsAdminModal() { subsAdminModal.classList.remove('show'); } // Закрыть панель выдачи подписок

  // Открыть панель банов и таймаутов
  function openBanAdminModal() {
    if (!isAdmin()) return;
    banAdminModal.classList.add('show');
    const resultsBox = document.getElementById('banAdminResults');
    if (resultsBox) resultsBox.innerHTML = '<div style="color: var(--muted); font-size: 12.5px; text-align:center; padding: 8px;">Введите никнейм или email для поиска</div>';
  }
  function closeBanAdminModal() { banAdminModal.classList.remove('show'); } // Закрыть панель банов и таймаутов

  // Открыть модалку топ-донатеров
  function openTopDonatorsModal() {
    profileDropdown.classList.remove('show');
    topDonatorsModal.classList.add('show');
    renderTopDonators();
  }
  // Закрыть модалку топ-донатеров
  function closeTopDonatorsModal() { topDonatorsModal.classList.remove('show'); }

  // Отрисовать список топ-донатеров
  function renderTopDonators() {
    const container = document.getElementById('topDonatorsListContainer');
    container.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 20px;">Загрузка...</div>';

    db.collection('topDonators').get().then(snapshot => {
      if (snapshot.empty) {
        container.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 20px;">Пока никто не в топе — станьте первым! 🚀</div>';
        return;
      }

      const totals = {};
      snapshot.forEach(doc => {
        const d = doc.data();
        const name = d.displayName || 'Аноним';
        totals[name] = (totals[name] || 0) + (Number(d.amount) || 0);
      });

      const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);

      container.innerHTML = '';
      sorted.forEach(([name, total], index) => {
        const row = document.createElement('div');
        row.className = 'donator-row';
        row.innerHTML = `
          <div class="donator-rank">${index < 3 ? ['','',''][index] : (index + 1)}</div>
          <div class="donator-name">${escapeHtml(name)}</div>
          <div class="donator-amount">${total.toLocaleString('ru-RU')} ₽</div>
        `;
        container.appendChild(row);
      });
    }).catch(err => {
      console.error(err);
      container.innerHTML = '<div style="color: var(--danger); text-align: center; padding: 20px;">Ошибка загрузки топа</div>';
    });
  }

  // (Открытие истории активности теперь происходит через switchSettingsTab('activity') внутри openSettingsModal)

  // Открыть модалку редактирования профиля
  function openEditProfileModal() {
    profileDropdown.classList.remove('show');
    if (currentUserProfile) {
      document.getElementById('editAvatarUrl').value = currentUserProfile.avatarUrl || '';
      document.getElementById('editUsernameInput').value = currentUserProfile.username || '';
      document.getElementById('editBioInput').value = currentUserProfile.bio || '';
      document.getElementById('editTagsInput').value = currentUserProfile.tags || '';
      document.getElementById('editPhoneInput').value = currentUserProfile.phone || '';
      document.getElementById('editBirthdayInput').value = currentUserProfile.birthday || '';
      const handleEl = document.getElementById('epModalHandle');
      if (handleEl) handleEl.textContent = '@' + (currentUserProfile.username || 'профиль');
      setupNickColorPicker(currentUserProfile);
      loadPrivacySettingsUI();
    }
    switchEditProfileTab('main');
    updateEditAvatarPreview();
    editProfileModal.classList.add('show');
  }

  // Обновить превью аватарки в модалке редактирования профиля
  function updateEditAvatarPreview() {
    const box = document.getElementById('editAvatarPreviewBox');
    if (!box) return;
    const url = document.getElementById('editAvatarUrl').value.trim();
    const placeholderHtml = `<span class="ep-avatar-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>`;
    box.innerHTML = url ? `<img src="${escapeHtml(url)}" alt="Avatar" onerror="avatarImgFallback(this)">` : placeholderHtml;
  }

  // Переключить вкладку в модалке редактирования профиля
  function switchEditProfileTab(tab) {
    const tabMain = document.getElementById('epTabMain');
    const tabPrivacy = document.getElementById('epTabPrivacy');
    const paneMain = document.getElementById('epPaneMain');
    const panePrivacy = document.getElementById('epPanePrivacy');
    if (!tabMain || !tabPrivacy || !paneMain || !panePrivacy) return;
    const isMain = tab === 'main';
    tabMain.classList.toggle('active', isMain);
    tabPrivacy.classList.toggle('active', !isMain);
    paneMain.style.display = isMain ? 'block' : 'none';
    panePrivacy.style.display = isMain ? 'none' : 'block';
  }

  // Настроить выбор цвета никнейма в редакторе профиля
  function setupNickColorPicker(profile) {
    const section = document.getElementById('nickColorSection');
    const swatchesBox = document.getElementById('nickColorSwatches');
    const customInput = document.getElementById('nickColorCustomInput');
    const hint = document.getElementById('nickColorPlanHint');
    const isActive = profile.subTier && profile.subExpiresAt && profile.subExpiresAt > Date.now();
    if (!isActive) {
      section.style.display = 'none';
      return;
    }
    section.style.display = 'block';
    const isPremium = profile.subTier === 'premium';
    hint.textContent = isPremium ? '(Premium — любой цвет/градиент)' : '(Lite — выбор из 3 цветов)';
    const presets = ['#3b82f6', '#22c55e', '#f472b6'];
    swatchesBox.innerHTML = presets.map(c =>
      `<button type="button" class="sub-color-swatch ${profile.nickColor === c ? 'active' : ''}" style="background:${c};" onclick="pickNickColor('${c}')"></button>`
    ).join('');
    customInput.style.display = isPremium ? 'block' : 'none';
    customInput.value = (profile.nickColor && !presets.includes(profile.nickColor)) ? profile.nickColor : '';
  }

  window.pickNickColor = function(color) {
    document.querySelectorAll('#nickColorSwatches .sub-color-swatch').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('nickColorCustomInput').value = '';
    document.getElementById('nickColorCustomInput').dataset.picked = color;
  };
  // Закрыть модалку редактирования профиля
  function closeEditProfileModal() { editProfileModal.classList.remove('show'); }

  // Открыть модалку редактирования профиля из другой модалки
  // (страница профиля остаётся видна и просто размывается под оверлеем модалки —
  // раньше здесь вызывался closeUserProfileModal(), который переключал вкладку
  // на главную и "выкидывал" пользователя со страницы профиля)
  function openEditProfileModalFromModal() {
    openEditProfileModal();
  }

  // Открыть системный диалог выбора файла аватара
  function triggerLocalAvatarUpload() {
    document.getElementById('localAvatarFileInput').click();
  }

  // Обработать выбор локального файла аватара
  function handleLocalAvatarFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const isGif = file.type === 'image/gif';
    const isPremiumUser = currentUserProfile && currentUserProfile.subTier === 'premium' && currentUserProfile.subExpiresAt && currentUserProfile.subExpiresAt > Date.now();
    if (isGif && !isPremiumUser) {
      showToast('GIF-аватарки доступны только по подписке Premium 👑', 'error');
      event.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('Файл слишком большой! Максимальный размер 2 МБ.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
      const base64Url = e.target.result;
      document.getElementById('editAvatarUrl').value = base64Url;
      updateEditAvatarPreview();
      const avatarBox = document.getElementById('modalUserAvatar');
      if (avatarBox) {
        avatarBox.innerHTML = `<img src="${base64Url}" alt="Avatar" onerror="avatarImgFallback(this)">`;
      }
      showToast('Фото успешно загружено из галереи!');
    };
    reader.readAsDataURL(file);
  }

  let activeViewingUserId = null;
  let activeViewingUserName = null;

  // Открыть модалку профиля другого пользователя
  function openUserProfile(userId, fallbackName, fallbackAvatar) {
    // Закрываем открытую карточку поста (иначе она перекрывает страницу профиля)
    if (viewPostModal && viewPostModal.classList.contains('show')) {
      viewPostModal.classList.remove('show');
      document.body.style.overflow = '';
    }
    activeViewingUserId = userId;
    activeViewingUserName = fallbackName;
    const avatarBox = document.getElementById('modalUserAvatar');
    const nameEl = document.getElementById('modalUserName');
    const bioEl = document.getElementById('modalUserBio');
    const phoneEl = document.getElementById('modalUserPhone');
    const birthdayEl = document.getElementById('modalUserBirthday');
    const regDateEl = document.getElementById('modalUserRegDate');
    const handleEl = document.getElementById('modalUserHandle');
    const msgsContainer = document.getElementById('modalUserMessages');
    const blockBtn = document.getElementById('modalBlockUserBtn');
    const friendBtn = document.getElementById('modalFriendActionBtn');
    const editBtnProfile = document.getElementById('modalAvatarEditBtn');

    const phoneBlock = document.getElementById('tgPhoneBlock');
    const bioBlock = document.getElementById('tgBioBlock');
    const birthdayBlock = document.getElementById('tgBirthdayBlock');

    nameEl.textContent = fallbackName || 'Пользователь';
    handleEl.textContent = '@' + (fallbackName ? fallbackName.toLowerCase().replace(/\s+/g, '') : 'user');
    bioBlock.style.display = 'none';
    phoneBlock.style.display = 'none';
    birthdayBlock.style.display = 'none';
    regDateEl.textContent = '18 июля 2026';

    const currentAuthUser = auth.currentUser;
    const isMe = currentAuthUser && currentAuthUser.uid === userId;

    if (isMe) {
      editBtnProfile.style.display = 'flex';
      friendBtn.style.display = 'none';
      blockBtn.style.display = 'none';
      const providerIconEl = document.getElementById('modalUserProviderIcon');
      if (providerIconEl) {
        const viaTelegram = !!localStorage.getItem(TG_ACTIVE_KEY);
        providerIconEl.classList.remove('via-telegram', 'via-email');
        providerIconEl.classList.add(viaTelegram ? 'via-telegram' : 'via-email');
        providerIconEl.title = viaTelegram ? 'Вход через Telegram' : 'Вход через Email';
        providerIconEl.innerHTML = viaTelegram
          ? `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M21.05 2.31 2.87 9.4c-1.24.5-1.23 1.19-.23 1.5l4.66 1.46 1.8 5.6c.22.6.36.85.75.85.3 0 .43-.14.6-.3l1.7-1.65 3.6 2.66c.66.37 1.14.18 1.3-.6l2.37-11.2c.24-1-.36-1.44-1.24-1.4zM9.6 13.86l7.6-6.53c.34-.28-.07-.42-.5-.16l-9.4 5.93-1.83-.6c-.4-.13-.4-.4.08-.6l7.14-2.75c.33-.13.63.08.5.6l-1.2 6.6c-.09.44-.35.55-.7.34l-1.94-1.43-.94.9c-.1.1-.19.19-.4.19z"/></svg>`
          : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="m2.5 6.5 9.5 7 9.5-7"/></svg>`;
      }
    } else {
      editBtnProfile.style.display = 'none';
      friendBtn.style.display = 'flex';
      blockBtn.style.display = 'flex';
      const providerIconEl = document.getElementById('modalUserProviderIcon');
      if (providerIconEl) {
        providerIconEl.innerHTML = '';
        providerIconEl.classList.remove('via-telegram', 'via-email');
      }
      const mySubs = currentUserProfile && currentUserProfile.subscriptions ? currentUserProfile.subscriptions : [];
      if (mySubs.includes(userId)) {
        friendBtn.textContent = 'Отписаться';
        friendBtn.classList.add('subscribed');
      } else {
        friendBtn.textContent = 'Подписаться';
        friendBtn.classList.remove('subscribed');
      }
    }

    if (isBlockedName(fallbackName)) {
      blockBtn.innerHTML = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Разблокировать`;
    } else {
      blockBtn.innerHTML = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg> Блокировать`;
    }

    if (fallbackAvatar) {
      avatarBox.innerHTML = `<img src="${escapeHtml(fallbackAvatar)}" alt="Avatar" onerror="avatarImgFallback(this)">`;
    } else {
      avatarBox.innerHTML = (fallbackName || 'U')[0].toUpperCase();
    }
    msgsContainer.innerHTML = '<div style="color: var(--muted); font-size: 13px; text-align: center; padding: 10px;">Загрузка...</div>';

    const sectionTitleEl = document.getElementById('npProfileSectionTitle');
    if (sectionTitleEl) sectionTitleEl.textContent = isMe ? 'Ваши публикации' : 'Публикации пользователя';

    hideAllContentPages();
    userProfileModal.style.display = 'block';
    window.scrollTo(0, 0);

    // Бейдж подписки (PRO/Lite + корона) рядом с именем и рамка аватара для Premium
    applyProfilePremiumBadge(userId);

    const statsVisibleEl = document.getElementById('npProfileStatsVisible');
    const statsHiddenEl = document.getElementById('npProfileStatsHidden');
    // Владелец профиля всегда видит свою статистику полностью
    if (isMe && statsVisibleEl && statsHiddenEl) {
      statsVisibleEl.style.display = 'flex';
      statsHiddenEl.style.display = 'none';
    }

    const friendsCountEl = document.getElementById('modalUserSubsCount');
    const followersCountEl = document.getElementById('modalUserFollowersCount');

    if (userId && !userId.startsWith('guest_')) {
      db.collection('users').doc(userId).get().then(doc => {
        if (doc.exists) {
          const data = doc.data();
          if (data.username) {
            nameEl.textContent = data.username;
            handleEl.textContent = '@' + data.username.toLowerCase().replace(/\s+/g, '');
          }
          if (data.bio) {
            bioEl.textContent = data.bio;
            bioBlock.style.display = 'flex';
          }
          if (data.phone) {
            phoneEl.textContent = data.phone;
            phoneBlock.style.display = 'flex';
          }
          if (data.birthday) {
            birthdayEl.textContent = data.birthday;
            birthdayBlock.style.display = 'flex';
          }
          if (data.createdAt) {
            const d = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
            const monthNames = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
            regDateEl.textContent = `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
          }
          if (data.avatarUrl) {
            avatarBox.innerHTML = `<img src="${escapeHtml(data.avatarUrl)}" alt="Avatar" onerror="avatarImgFallback(this)">`;
          } else {
            avatarBox.innerHTML = (data.username || fallbackName || 'U')[0].toUpperCase();
          }

          // Приватность: показывать подписки/подписчиков другим пользователям, только если владелец это разрешил
          const statsAllowed = isMe || data.showFollowStats !== false;
          if (!isMe && statsVisibleEl && statsHiddenEl) {
            statsVisibleEl.style.display = statsAllowed ? 'flex' : 'none';
            statsHiddenEl.style.display = statsAllowed ? 'none' : 'flex';
          }
          if (statsAllowed) {
            friendsCountEl.textContent = data.subscriptions ? data.subscriptions.length : 0;
            db.collection('users').where('subscriptions', 'array-contains', userId).get().then(snap => {
              followersCountEl.textContent = snap.size;
            }).catch(() => { followersCountEl.textContent = 0; });
          }
        }
      }).catch(e => console.error(e));
    } else if (statsVisibleEl && statsHiddenEl) {
      statsVisibleEl.style.display = 'flex';
      statsHiddenEl.style.display = 'none';
      friendsCountEl.textContent = 0;
      followersCountEl.textContent = 0;
    }

    if (isMe) {
      friendsCountEl.textContent = (currentUserProfile && currentUserProfile.subscriptions) ? currentUserProfile.subscriptions.length : 0;
      db.collection('users').where('subscriptions', 'array-contains', userId).get().then(snap => {
        followersCountEl.textContent = snap.size;
      }).catch(() => { followersCountEl.textContent = 0; });
    }

    const userMsgs = currentMessagesList.filter(m => (m.userId === userId || m.author === fallbackName) && (m.accessMode !== 'link' || isMe));
    currentProfileUserMsgs = userMsgs;
    document.getElementById('modalUserPostsCount').textContent = userMsgs.length;
    const postsCountHiddenEl = document.getElementById('modalUserPostsCountHidden');
    if (postsCountHiddenEl) postsCountHiddenEl.textContent = userMsgs.length;

    // Сброс на вкладку "Посты" при каждом открытии профиля
    currentProfileTab = 'posts';
    const tabPostsBtn = document.getElementById('npTabPosts');
    const tabHiddenBtn = document.getElementById('npTabHidden');
    if (tabPostsBtn) tabPostsBtn.classList.add('active');
    if (tabHiddenBtn) tabHiddenBtn.classList.remove('active');
    resetProfileFilterPanel();

    renderCurrentProfilePosts();
  }

  // Состояние панели фильтрации на странице профиля
  let profileFilterState = { period: 'all_time', sort: 'newest', type: 'all', censor: 'off' };

  // Открыть/закрыть панель фильтрации на странице профиля
  window.toggleProfileFilterPanel = function() {
    const panel = document.getElementById('npFilterPanel');
    const btn = document.getElementById('npFilterToggleBtn');
    if (!panel) return;
    const isOpen = panel.style.display !== 'none';
    panel.style.display = isOpen ? 'none' : 'block';
    if (btn) btn.classList.toggle('open', !isOpen);
  };

  // Сбросить панель фильтрации к значениям по умолчанию (при открытии профиля)
  function resetProfileFilterPanel() {
    profileFilterState = { period: 'all_time', sort: 'newest', type: 'all', censor: 'off' };
    const panel = document.getElementById('npFilterPanel');
    const btn = document.getElementById('npFilterToggleBtn');
    if (panel) panel.style.display = 'none';
    if (btn) btn.classList.remove('open');
    document.querySelectorAll('#npFilterPanel .np-filter-pill').forEach(pill => {
      const label = pill.textContent.trim();
      pill.classList.toggle('active', ['Всё время', 'Новые', 'Всё', 'Выключена'].includes(label));
    });
  }

  // Установить значение фильтра и перерисовать посты
  window.setProfileFilter = function(group, value, el) {
    profileFilterState[group] = value;
    const wrap = el.closest('.np-filter-pills');
    if (wrap) {
      wrap.querySelectorAll('.np-filter-pill').forEach(b => b.classList.remove('active'));
    }
    el.classList.add('active');
    renderCurrentProfilePosts();
  };
  // Переключить вкладку "Посты" / "Скрытые" на странице профиля
  window.switchProfilePostsTab = function (tab) {
    currentProfileTab = tab;
    const tabPostsBtn = document.getElementById('npTabPosts');
    const tabHiddenBtn = document.getElementById('npTabHidden');
    if (tabPostsBtn) tabPostsBtn.classList.toggle('active', tab === 'posts');
    if (tabHiddenBtn) tabHiddenBtn.classList.toggle('active', tab === 'hidden');
    renderCurrentProfilePosts();
  };

  // Отрисовать публикации текущего просматриваемого профиля с учётом вкладки и сортировки
  window.renderCurrentProfilePosts = function () {
    const msgsContainer = document.getElementById('modalUserMessages');
    if (!msgsContainer) return;

    if (currentProfileTab === 'hidden') {
      msgsContainer.innerHTML = '<div class="np-profile-empty">Скрытых публикаций нет</div>';
      return;
    }

    if (currentProfileUserMsgs.length === 0) {
      msgsContainer.innerHTML = '<div class="np-profile-empty">Здесь пока нет публикаций.</div>';
      return;
    }

    const sortMode = profileFilterState.sort === 'oldest' ? 'oldest' : 'newest';
    const now = Date.now();
    const periodCutoffs = {
      today: now - 24 * 60 * 60 * 1000,
      week: now - 7 * 24 * 60 * 60 * 1000,
      month: now - 30 * 24 * 60 * 60 * 1000,
      year: now - 365 * 24 * 60 * 60 * 1000,
      all_time: 0
    };
    const cutoff = periodCutoffs[profileFilterState.period] ?? 0;

    let filtered = currentProfileUserMsgs.filter(m => {
      const t = m.createdAt?.toMillis ? m.createdAt.toMillis() : (m.localTime || 0);
      if (t < cutoff) return false;
      if (profileFilterState.type !== 'all' && m.type && m.type !== profileFilterState.type) return false;
      return true;
    });

    if (filtered.length === 0) {
      msgsContainer.innerHTML = '<div class="np-profile-empty">Ничего не найдено по выбранным фильтрам.</div>';
      return;
    }

    const sorted = filtered.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.localTime || 0);
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.localTime || 0);
      return sortMode === 'oldest' ? timeA - timeB : timeB - timeA;
    });

    msgsContainer.innerHTML = sorted.map(m => {
      const timeInfo = formatMessageTime(m.createdAt, m.localTime);
      const linkBadge = m.accessMode === 'link' ? '<span class="np-link-badge">только по ссылке</span>' : '';
      const copyBtn = m.image ? `<button type="button" class="np-copy-link-btn" onclick="copyPostLink('${m.id}')">Скопировать ссылку</button>` : '';
      return `
        <div class="np-profile-post-card">
          <div class="np-profile-post-time">${timeInfo.display} ${linkBadge}</div>
          <div>${escapeHtml(m.text || '')}</div>
          ${copyBtn}
        </div>
      `;
    }).join('');
  };

  // Единая функция подписки/отписки от автора (используется и в профиле, и в просмотре поста)
  window.toggleSubscription = function(targetId, targetName, opts) {
    opts = opts || {};
    const user = auth.currentUser;
    if (!user) {
      showToast('Войдите в аккаунт, чтобы подписываться на авторов', 'error');
      return;
    }
    if (user.uid === targetId) {
      showToast('Нельзя подписаться на самого себя', 'error');
      return;
    }
    if (!currentUserProfile.subscriptions) currentUserProfile.subscriptions = [];
    const idx = currentUserProfile.subscriptions.indexOf(targetId);
    let nowSubscribed;
    if (idx > -1) {
      currentUserProfile.subscriptions.splice(idx, 1);
      nowSubscribed = false;
      showToast(`Вы отписались от @${targetName}`);
    } else {
      currentUserProfile.subscriptions.push(targetId);
      nowSubscribed = true;
      showToast(`Вы подписались на @${targetName}`);
      sendPersonalNotification(targetId, 'subscribe', 'Новый подписчик', `${currentUserProfile.username || 'Пользователь'} подписался(-ась) на вас`);
    }
    db.collection('users').doc(user.uid).update({
      subscriptions: currentUserProfile.subscriptions
    }).catch(err => console.error(err));

    if (opts.badgeEl) {
      opts.badgeEl.classList.toggle('subscribed', nowSubscribed);
      opts.badgeEl.title = nowSubscribed ? 'Отписаться' : 'Подписаться';
      opts.badgeEl.innerHTML = nowSubscribed
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
    }
    return nowSubscribed;
  };

  // Подписка/отписка от автора поста (кнопка "+" на аватаре в просмотре поста)
  window.toggleAuthorSubscription = function(targetId, authorName, msgId) {
    const badge = document.getElementById(`subBadge_${msgId}`);
    window.toggleSubscription(targetId, authorName, { badgeEl: badge });
  };

  window.toggleSubscriptionFromModal = function() {
    if (!activeViewingUserId) return;
    const nowSubscribed = window.toggleSubscription(activeViewingUserId, activeViewingUserName || '');
    const btn = document.getElementById('modalFriendActionBtn');
    if (btn && nowSubscribed !== undefined) {
      btn.textContent = nowSubscribed ? 'Отписаться' : 'Подписаться';
      btn.classList.toggle('subscribed', nowSubscribed);
      const followersCountEl = document.getElementById('modalUserFollowersCount');
      if (followersCountEl) {
        const cur = parseInt(followersCountEl.textContent, 10) || 0;
        followersCountEl.textContent = nowSubscribed ? cur + 1 : Math.max(0, cur - 1);
      }
    }
  };

  window.toggleBlockCurrentUser = function() {
    if (!activeViewingUserName) return;
    const currentAuthUser = auth.currentUser;
    if (currentAuthUser && activeViewingUserId && currentAuthUser.uid === activeViewingUserId) {
      showToast('Нельзя заблокировать самого себя', 'error');
      return;
    }
    const index = blockedUsers.findIndex(b => b.name === activeViewingUserName);
    if (index > -1) {
      blockedUsers.splice(index, 1);
      showToast(`Пользователь ${activeViewingUserName} разблокирован`);
    } else {
      const avatarBoxEl = document.getElementById('modalUserAvatar');
      const avatarImg = avatarBoxEl ? avatarBoxEl.querySelector('img') : null;
      blockedUsers.push({
        id: activeViewingUserId || '',
        name: activeViewingUserName,
        avatarUrl: avatarImg ? avatarImg.getAttribute('src') : ''
      });
      showToast(`Пользователь ${activeViewingUserName} добавлен в чёрный список`);
    }
    saveBlockedUsers();
    renderBlacklist();
    closeUserProfileModal();
    sortAndRender();
  };

  // Разблокировать пользователя прямо из списка чёрного списка (настройки аккаунта)
  window.unblockUserFromBlacklist = function(name) {
    const index = blockedUsers.findIndex(b => b.name === name);
    if (index === -1) return;
    blockedUsers.splice(index, 1);
    saveBlockedUsers();
    renderBlacklist();
    sortAndRender();
    showToast(`Пользователь ${name} разблокирован`);
  };

  // Отрисовать список заблокированных пользователей во вкладке "Чёрный список"
  function renderBlacklist() {
    const container = document.getElementById('blacklistContainer');
    if (!container) return;
    if (blockedUsers.length === 0) {
      container.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 20px;">Список пуст</div>';
      return;
    }
    container.innerHTML = blockedUsers.map(b => {
      const safeName = escapeHtml(b.name);
      const avatarHtml = b.avatarUrl
        ? `<img src="${escapeHtml(b.avatarUrl)}" onerror="avatarImgFallback(this)">`
        : safeName.charAt(0).toUpperCase();
      return `
        <div class="blacklist-item">
          <div class="blacklist-item-avatar">${avatarHtml}</div>
          <div class="blacklist-item-name">${safeName}</div>
          <button type="button" class="blacklist-unblock-btn" onclick="unblockUserFromBlacklist('${safeName.replace(/'/g, "\\'")}')">Разблокировать</button>
        </div>
      `;
    }).join('');
  }

  /* ===== МОДАЛКА "ПОДПИСКИ / ПОДПИСЧИКИ" ===== */
  let followModalTab = 'following';
  let followModalUserId = null;
  let followModalUserName = null;
  let followModalFollowingCache = null;
  let followModalFollowersCache = null;

  // Открыть модалку со списком подписок/подписчиков просматриваемого профиля
  function openFollowModal(tab) {
    if (!activeViewingUserId && !activeViewingUserName) return;
    followModalUserId = activeViewingUserId;
    followModalUserName = activeViewingUserName || 'Пользователь';
    followModalFollowingCache = null;
    followModalFollowersCache = null;

    const usernameEl = document.getElementById('followModalUsername');
    if (usernameEl) usernameEl.textContent = '@' + followModalUserName;

    const followingCountEl = document.getElementById('modalUserSubsCount');
    const followersCountEl = document.getElementById('modalUserFollowersCount');
    const followTabFollowingCount = document.getElementById('followTabFollowingCount');
    const followTabFollowersCount = document.getElementById('followTabFollowersCount');
    if (followTabFollowingCount) followTabFollowingCount.textContent = followingCountEl ? followingCountEl.textContent : '0';
    if (followTabFollowersCount) followTabFollowersCount.textContent = followersCountEl ? followersCountEl.textContent : '0';

    const searchInput = document.getElementById('followModalSearchInput');
    if (searchInput) searchInput.value = '';

    switchFollowModalTab(tab || 'following');
    document.getElementById('followListModal').classList.add('show');
  }

  // Закрыть модалку "Подписки / Подписчики"
  function closeFollowModal() {
    const modal = document.getElementById('followListModal');
    if (modal) modal.classList.remove('show');
  }

  // Переключить вкладку "Подписки" / "Подписчики" внутри модалки
  function switchFollowModalTab(tab) {
    followModalTab = tab;
    const tabFollowing = document.getElementById('followTabFollowing');
    const tabFollowers = document.getElementById('followTabFollowers');
    if (tabFollowing) tabFollowing.classList.toggle('active', tab === 'following');
    if (tabFollowers) tabFollowers.classList.toggle('active', tab === 'followers');
    renderFollowModalList();
  }

  // Загрузить (с кэшированием) и отрисовать список пользователей в модалке, с учётом поиска
  function renderFollowModalList() {
    const container = document.getElementById('followModalListContainer');
    if (!container) return;

    const paint = (list) => {
      const query = (document.getElementById('followModalSearchInput').value || '').trim().toLowerCase().replace(/^@/, '');
      const filtered = query
        ? list.filter(u => (u.username || '').toLowerCase().includes(query))
        : list;
      if (filtered.length === 0) {
        container.innerHTML = `<div style="color: var(--muted); text-align: center; padding: 24px;">${query ? 'Никого не найдено' : (followModalTab === 'following' ? 'Подписок пока нет' : 'Подписчиков пока нет')}</div>`;
        return;
      }
      container.innerHTML = filtered.map(u => {
        const safeName = escapeHtml(u.username || 'Пользователь');
        const avatarHtml = u.avatarUrl
          ? `<img src="${escapeHtml(u.avatarUrl)}" onerror="avatarImgFallback(this)">`
          : safeName.charAt(0).toUpperCase();
        return `
          <div class="blacklist-item follow-modal-item" onclick="closeFollowModal(); openUserProfile('${escapeHtml(u.id)}', '${safeName.replace(/'/g, "\\'")}', '${escapeHtml(u.avatarUrl || '')}')">
            <div class="blacklist-item-avatar">${avatarHtml}</div>
            <div class="blacklist-item-name">@${safeName}</div>
          </div>
        `;
      }).join('');
    };

    if (followModalTab === 'following') {
      if (followModalFollowingCache) { paint(followModalFollowingCache); return; }
      container.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 24px;">Загрузка...</div>';
      const currentAuthUser = auth.currentUser;
      const isMe = !!(currentAuthUser && followModalUserId && currentAuthUser.uid === followModalUserId);
      const idsPromise = isMe
        ? Promise.resolve((currentUserProfile && currentUserProfile.subscriptions) || [])
        : (followModalUserId && !followModalUserId.startsWith('guest_')
          ? db.collection('users').doc(followModalUserId).get().then(doc => (doc.exists && doc.data().subscriptions) || [])
          : Promise.resolve([]));
      idsPromise.then(ids => {
        if (!ids.length) { followModalFollowingCache = []; paint([]); return; }
        return Promise.all(ids.map(id => db.collection('users').doc(id).get()
          .then(d => d.exists ? { id, username: d.data().username, avatarUrl: d.data().avatarUrl } : null)
          .catch(() => null)))
          .then(list => {
            followModalFollowingCache = list.filter(Boolean);
            paint(followModalFollowingCache);
          });
      }).catch(() => { followModalFollowingCache = []; paint([]); });
    } else {
      if (followModalFollowersCache) { paint(followModalFollowersCache); return; }
      container.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 24px;">Загрузка...</div>';
      if (!followModalUserId || followModalUserId.startsWith('guest_')) { followModalFollowersCache = []; paint([]); return; }
      db.collection('users').where('subscriptions', 'array-contains', followModalUserId).get().then(snap => {
        followModalFollowersCache = snap.docs.map(d => ({ id: d.id, username: d.data().username, avatarUrl: d.data().avatarUrl }));
        paint(followModalFollowersCache);
      }).catch(() => { followModalFollowersCache = []; paint([]); });
    }
  }

  window.openFollowModal = openFollowModal;
  window.closeFollowModal = closeFollowModal;
  window.switchFollowModalTab = switchFollowModalTab;
  window.renderFollowModalList = renderFollowModalList;

  const followListModalEl = document.getElementById('followListModal');
  if (followListModalEl) {
    followListModalEl.addEventListener('click', (e) => { if (e.target === followListModalEl) closeFollowModal(); });
  }

  // Закрыть страницу профиля пользователя и вернуться туда, откуда пришли
  function closeUserProfileModal() {
    userProfileModal.style.display = 'none';
    switchTab(lastActiveTab || 'main');
  }

  supportModal.addEventListener('click', (e) => { if (e.target === supportModal) closeSupportModal(); });
  donateModal.addEventListener('click', (e) => { if (e.target === donateModal) closeDonateModal(); });
  document.getElementById('supportProjectModal').addEventListener('click', (e) => { if (e.target.id === 'supportProjectModal') closeSupportProjectModal(); });
  rulesModal.addEventListener('click', (e) => { if (e.target === rulesModal) closeRulesModal(); });
  suggestVideoModal.addEventListener('click', (e) => { if (e.target === suggestVideoModal) closeSuggestVideoModal(); });
  loginModal.addEventListener('click', (e) => { if (e.target === loginModal) closeLoginModal(); });
  registerModal.addEventListener('click', (e) => { if (e.target === registerModal) closeRegisterModal(); });
  editProfileModal.addEventListener('click', (e) => { if (e.target === editProfileModal) closeEditProfileModal(); });
  reportsModal.addEventListener('click', (e) => { if (e.target === reportsModal) closeReportsModal(); });
  adminPanelModal.addEventListener('click', (e) => { if (e.target === adminPanelModal) closeAdminPanelModal(); });
  subsAdminModal.addEventListener('click', (e) => { if (e.target === subsAdminModal) closeSubsAdminModal(); });
  banAdminModal.addEventListener('click', (e) => { if (e.target === banAdminModal) closeBanAdminModal(); });
  topDonatorsModal.addEventListener('click', (e) => { if (e.target === topDonatorsModal) closeTopDonatorsModal(); });
  settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) closeSettingsModal(); });

  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const sunIcon = document.getElementById('sunIcon');
  const moonIcon = document.getElementById('moonIcon');
  // Дублирующие иконки темы внутри нижнего мобильного меню (кнопка "Тема"
  // на мобильных просто кликает themeToggleBtn, см. ниже)
  const mobSunIcon = document.getElementById('settingsThemeSunIcon');
  const mobMoonIcon = document.getElementById('settingsThemeMoonIcon');

  // Переключить тему оформления (светлая/тёмная)
  function setTheme(isLight) {
    if (isLight) {
      document.body.classList.add('light-theme');
      sunIcon.style.display = 'block';
      moonIcon.style.display = 'none';
      if (mobSunIcon) mobSunIcon.style.display = 'block';
      if (mobMoonIcon) mobMoonIcon.style.display = 'none';
      localStorage.setItem('discoragen_theme', 'light');
    } else {
      document.body.classList.remove('light-theme');
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'block';
      if (mobSunIcon) mobSunIcon.style.display = 'none';
      if (mobMoonIcon) mobMoonIcon.style.display = 'block';
      localStorage.setItem('discoragen_theme', 'dark');
    }
  }

  if (localStorage.getItem('discoragen_theme') === 'light') setTheme(true);

  themeToggleBtn.addEventListener('click', () => {
    setTheme(!document.body.classList.contains('light-theme'));
  });

  const firebaseConfig = {
    apiKey: "AIzaSyDcgAxaEm0rKEbfL597920nX4fqgyD3BdE",
    authDomain: "guestbook-site-5b1ab.firebaseapp.com",
    projectId: "guestbook-site-5b1ab",
    storageBucket: "guestbook-site-5b1ab.firebasestorage.app",
    messagingSenderId: "593355741478",
    appId: "1:593355741478:web:472142384f1347cbabc9e7"
  };
  firebase.initializeApp(firebaseConfig);
  let db = firebase.firestore();
  const primaryDb = db;

  // Включаем офлайн-кэш Firestore — уже загруженные ранее сообщения/видео
  // будут показываться мгновенно из локального кэша, даже при плохом/нестабильном
  // соединении (например, при включенном VPN), а актуализация произойдет,
  // когда соединение восстановится.
  db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
    if (err.code === 'failed-precondition') {
      // Сайт открыт в нескольких вкладках одновременно — кэш можно включить только в одной
      console.warn('Firestore persistence: открыто несколько вкладок, офлайн-кэш отключен');
    } else if (err.code === 'unimplemented') {
      // Браузер не поддерживает нужные технологии (редкие/старые браузеры)
      console.warn('Firestore persistence: браузер не поддерживает офлайн-кэш');
    }
  });
  let auth = firebase.auth();
  const primaryAuth = auth;

  // ===================== ВХОД / РЕГИСТРАЦИЯ ЧЕРЕЗ TELEGRAM + МУЛЬТИАККАУНТЫ =====================
  // Работает в ОБЫЧНОМ браузере (не путать с Mini App выше). Позволяет войти/зарегистрироваться
  // одним кликом через Telegram вместо email+пароля, и хранить несколько Telegram-аккаунтов
  // на одном устройстве с переключением между ними без потери данных.
  //
  // Как это устроено технически: у сайта нет своего сервера для проверки подписи Telegram,
  // поэтому у КАЖДОГО Telegram-аккаунта — свой отдельный экземпляр Firebase-приложения
  // (firebase.initializeApp с уникальным именем "tg_<telegramId>") со своей анонимной
  // Firebase-сессией. Это позволяет:
  //   1) при повторном входе тем же Telegram-аккаунтом — переиспользовать ТУ ЖЕ сессию
  //      (а не плодить новые анонимные аккаунты при каждом перезаходе — именно из-за этого
  //      раньше рос счётчик "всего пользователей");
  //   2) хранить несколько разных Telegram-аккаунтов одновременно и мгновенно переключаться
  //      между ними без повторного входа через Telegram;
  //   3) удалять аккаунт целиком по кнопке (Firestore-профиль + сама Firebase-сессия).
  // Ограничение: аккаунты привязаны к ЭТОМУ браузеру/устройству — на другом устройстве это
  // будет уже другой набор аккаунтов. Полная синхронизация между устройствами потребовала бы
  // сервера, проверяющего подпись Telegram (Cloud Function + Admin SDK).
  const TELEGRAM_AUTH_BOT_USERNAME = 'ObshazhnyaApp_Bot';
  const TG_ACCOUNTS_KEY = 'tgAccountsList';
  const TG_ACTIVE_KEY = 'tgActiveTelegramId';

  // Загрузить список сохранённых Telegram-аккаунтов из localStorage
  function loadTgAccounts() {
    try { return JSON.parse(localStorage.getItem(TG_ACCOUNTS_KEY) || '[]'); } catch (e) { return []; }
  }
  // Сохранить список Telegram-аккаунтов в localStorage
  function saveTgAccounts(list) { localStorage.setItem(TG_ACCOUNTS_KEY, JSON.stringify(list)); }
  // Добавить или обновить метаданные Telegram-аккаунта в сохранённом списке
  function upsertTgAccountMeta(meta) {
    const list = loadTgAccounts();
    const idx = list.findIndex(a => String(a.telegramId) === String(meta.telegramId));
    if (idx >= 0) list[idx] = Object.assign({}, list[idx], meta); else list.push(meta);
    saveTgAccounts(list);
  }
  // Удалить Telegram-аккаунт из сохранённого списка
  function removeTgAccountMeta(telegramId) {
    saveTgAccounts(loadTgAccounts().filter(a => String(a.telegramId) !== String(telegramId)));
  }

  // Получить (или создать) отдельный экземпляр Firebase-приложения для Telegram-аккаунта
  function getTgApp(telegramId) {
    const appName = 'tg_' + telegramId;
    const existing = firebase.apps.find(a => a.name === appName);
    return existing || firebase.initializeApp(firebaseConfig, appName);
  }

  // Подключить виджет входа через Telegram в указанный контейнер
  function mountTelegramAuthWidget(containerId) {
    const wrap = document.getElementById(containerId);
    if (!wrap || wrap.dataset.mounted) return;
    wrap.dataset.mounted = '1';
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', TELEGRAM_AUTH_BOT_USERNAME);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '10');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    wrap.appendChild(script);
  }

  // authEpoch защищает от гонки: если пока грузился профиль пользователь успел
  // переключиться на другой аккаунт, устаревший колбэк просто ничего не сделает.
  let authEpoch = 0;

  // Проверить, не забанен ли этот же Telegram-аккаунт на КАКОМ-ЛИБО другом устройстве
  // (см. propagateTelegramBan выше — обычно бан уже применится и туда автоматически,
  // это подстраховка на случай входа с устройства, которого ещё не существовало
  // на момент бана). Если находит активный бан у "родственного" документа — сразу
  // синхронизирует его и на текущий документ и показывает блокирующий оверлей.
  function checkTelegramCrossDeviceBan(telegramId, user) {
    const tgIdNum = Number(telegramId);
    if (!telegramId || isNaN(tgIdNum) || !user) return;
    const checkEpoch = authEpoch;
    primaryDb.collection('users').where('telegramId', '==', tgIdNum).get().then(snapshot => {
      if (checkEpoch !== authEpoch) return;
      let banned = false, reason = '', bannedAt = null;
      snapshot.forEach(doc => {
        const d = doc.data();
        if (d.banned) { banned = true; reason = d.banReason || reason; bannedAt = d.bannedAt || bannedAt; }
      });
      if (!banned) return;
      const targetDb = db;
      targetDb.collection('users').doc(user.uid).set({
        banned: true,
        banReason: reason || firebase.firestore.FieldValue.delete(),
        bannedAt: bannedAt || firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true }).catch(err => console.error('Не удалось синхронизировать бан на это устройство:', err));
      if (currentUserProfile) { currentUserProfile.banned = true; currentUserProfile.banReason = reason; }
      showBanOverlay(reason, bannedAt);
    }).catch(err => console.error('Ошибка кросс-проверки бана Telegram-аккаунта:', err));
  }

  // Обработать успешную авторизацию пользователя (основную или через Telegram)
  function handleAuthUser(user, telegramId) {
    const myEpoch = authEpoch;
    startBanWatcher(user);
    renderNotifications(); // пересчитать бейдж непрочитанных под текущего пользователя/гостя
    if (telegramId) checkTelegramCrossDeviceBan(telegramId, user);
    if (user) {
      db.collection('users').doc(user.uid).get().then(doc => {
        if (myEpoch !== authEpoch) return;
        currentUserProfile = doc.exists ? doc.data() : { username: user.displayName || 'User', avatarUrl: '', bio: '', tags: '', phone: '', birthday: '', friends: [] };
        updateDropdownUI(user, currentUserProfile);
        sortAndRender();
        renderVideosGrid();
        renderFriendsList();
        updateGlobalStatistics();
        startPersonalNotificationsListener(user.uid);
        initialAuthResolved = true;
        tryHideInitialLoader();
      }).catch(() => {
        if (myEpoch !== authEpoch) return;
        currentUserProfile = { username: user.displayName || 'User', avatarUrl: '', bio: '', tags: '', phone: '', birthday: '', friends: [] };
        updateDropdownUI(user, currentUserProfile);
        sortAndRender();
        renderVideosGrid();
        renderFriendsList();
        startPersonalNotificationsListener(user.uid);
        initialAuthResolved = true;
        tryHideInitialLoader();
      });
    } else {
      currentUserProfile = null;
      updateDropdownUI(null, null);
      sortAndRender();
      renderVideosGrid();
      renderFriendsList();
      updateGlobalStatistics();
      stopPersonalNotificationsListener();
      initialAuthResolved = true;
      tryHideInitialLoader();
    }
  }

  // Переключение на конкретный Telegram-аккаунт (или восстановление его сессии при загрузке).
  // cb(user) вызывается один раз, когда состояние авторизации этого аккаунта известно.
  function switchToTelegramAccount(telegramId, cb) {
    authEpoch++;
    const app = getTgApp(telegramId);
    auth = app.auth();
    db = app.firestore();
    localStorage.setItem(TG_ACTIVE_KEY, String(telegramId));
    renderTgAccountSwitcher();
    if (auth.currentUser) {
      handleAuthUser(auth.currentUser, telegramId);
      if (cb) cb(auth.currentUser);
    } else {
      const authRef = auth;
      const unsub = auth.onAuthStateChanged((u) => {
        unsub();
        if (auth !== authRef) return; // уже переключились на что-то другое, пока ждали
        handleAuthUser(u, telegramId);
        if (cb) cb(u);
      });
    }
  }

  // Возврат к обычному режиму (гость или email/пароль-аккаунт основного приложения).
  // Сама Telegram-сессия НЕ уничтожается — просто перестаёт быть активной,
  // поэтому вернуться к ней потом можно без повторного входа через Telegram.
  function switchToDefaultAccount() {
    authEpoch++;
    auth = primaryAuth;
    db = primaryDb;
    localStorage.removeItem(TG_ACTIVE_KEY);
    renderTgAccountSwitcher();
    handleAuthUser(auth.currentUser);
  }

  // Вызывается автоматически виджетом Telegram после успешного входа пользователя.
  window.onTelegramAuth = function (telegramUser) {
    const displayName = telegramUser.username ? '@' + telegramUser.username : telegramUser.first_name;

    switchToTelegramAccount(telegramUser.id, (user) => {
      // Завершить создание/обновление профиля пользователя после входа через Telegram.
      // Перед этим проверяем, не забанен ли уже ЭТОТ ЖЕ Telegram-аккаунт на другом
      // устройстве (у него будет отдельный документ с тем же telegramId, но другим uid) —
      // без этой проверки забаненный пользователь мог обойти бан, просто зайдя с нового
      // браузера/устройства.
      function finalize(uid) {
        primaryDb.collection('users').where('telegramId', '==', telegramUser.id).get().then((banSnapshot) => {
          let bannedElsewhere = false, banReasonFound = '', bannedAtFound = null;
          banSnapshot.forEach(d => {
            const data = d.data();
            if (data.banned) { bannedElsewhere = true; banReasonFound = data.banReason || banReasonFound; bannedAtFound = data.bannedAt || bannedAtFound; }
          });

          db.collection('users').doc(uid).get().then((doc) => {
            const existing = doc.exists ? doc.data() : null;
            const isBanned = bannedElsewhere || (existing && existing.banned);
            const reason = banReasonFound || (existing && existing.banReason) || '';
            const bannedAt = bannedAtFound || (existing && existing.bannedAt) || null;

            const payload = {
              username: displayName,
              avatarUrl: telegramUser.photo_url || (existing && existing.avatarUrl) || '',
              telegramId: telegramUser.id
            };
            if (!doc.exists) {
              Object.assign(payload, {
                email: '', bio: '', tags: '', phone: '', birthday: '', friends: [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
              });
            }
            if (isBanned) {
              payload.banned = true;
              payload.banReason = reason || firebase.firestore.FieldValue.delete();
              payload.bannedAt = bannedAt || firebase.firestore.FieldValue.serverTimestamp();
            }

            const writeOp = doc.exists ? db.collection('users').doc(uid).update(payload) : db.collection('users').doc(uid).set(payload);
            writeOp.then(() => {
              upsertTgAccountMeta({ telegramId: telegramUser.id, username: displayName, avatarUrl: telegramUser.photo_url || '' });
              recordLoginLog(uid);
              closeLoginModal();
              closeRegisterModal();
              renderTgAccountSwitcher();
              if (isBanned) {
                showBanOverlay(reason, bannedAt);
                showToast('Этот Telegram-аккаунт заблокирован администратором', 'error');
              } else {
                showToast(`Вы вошли как ${displayName}`);
              }
            }).catch((err) => {
              console.error(err);
              showToast('Ошибка входа через Telegram: ' + err.message, 'error');
            });
          });
        }).catch((err) => {
          // Если сама проверка бана не удалась (например, нет сети) — не блокируем
          // вход, чтобы не сломать логин из-за временного сбоя. Просто логинимся как раньше.
          console.error('Ошибка проверки блокировки Telegram-аккаунта:', err);
          db.collection('users').doc(uid).get().then((doc) => {
            const writeOp = doc.exists
              ? db.collection('users').doc(uid).update({ username: displayName, avatarUrl: telegramUser.photo_url || doc.data().avatarUrl || '', telegramId: telegramUser.id })
              : db.collection('users').doc(uid).set({ username: displayName, email: '', avatarUrl: telegramUser.photo_url || '', bio: '', tags: '', phone: '', birthday: '', telegramId: telegramUser.id, friends: [], createdAt: firebase.firestore.FieldValue.serverTimestamp() });
            writeOp.then(() => {
              upsertTgAccountMeta({ telegramId: telegramUser.id, username: displayName, avatarUrl: telegramUser.photo_url || '' });
              recordLoginLog(uid);
              closeLoginModal();
              closeRegisterModal();
              renderTgAccountSwitcher();
              showToast(`Вы вошли как ${displayName}`);
            }).catch((err2) => {
              console.error(err2);
              showToast('Ошибка входа через Telegram: ' + err2.message, 'error');
            });
          });
        });
      }

      if (user) {
        finalize(user.uid);
      } else {
        auth.signInAnonymously()
          .then((cred) => finalize(cred.user.uid))
          .catch((err) => {
            console.error(err);
            showToast('Не удалось войти через Telegram. Проверь, включён ли Anonymous Auth в Firebase.', 'error');
          });
      }
    });
  };

  // Полностью удаляет Telegram-аккаунт с этого устройства: Firestore-профиль + саму сессию.
  window.deleteTgAccount = function (telegramId) {
    if (!confirm('Удалить этот Telegram-аккаунт вместе с профилем на этом устройстве? Это необратимо.')) return;
    const app = getTgApp(telegramId);
    const targetAuth = app.auth();
    const targetDb = app.firestore();

    // Выполнить удаление Telegram-аккаунта (профиль + сессия)
    function doDelete(uid) {
      targetDb.collection('users').doc(uid).delete().catch(() => {}).then(() => {
        return targetAuth.currentUser ? targetAuth.currentUser.delete() : Promise.resolve();
      }).then(() => {
        removeTgAccountMeta(telegramId);
        if (localStorage.getItem(TG_ACTIVE_KEY) === String(telegramId)) {
          switchToDefaultAccount();
        } else {
          renderTgAccountSwitcher();
        }
        showToast('Telegram-аккаунт удалён с этого устройства');
      }).catch((err) => {
        console.error(err);
        showToast('Не удалось удалить аккаунт: ' + err.message, 'error');
      });
    }

    if (targetAuth.currentUser) {
      doDelete(targetAuth.currentUser.uid);
    } else {
      const unsub = targetAuth.onAuthStateChanged((u) => {
        unsub();
        if (u) {
          doDelete(u.uid);
        } else {
          removeTgAccountMeta(telegramId);
          renderTgAccountSwitcher();
          showToast('Аккаунт удалён из списка');
        }
      });
    }
  };

  // Примечание: switchToTelegramAccount и deleteTgAccount объявлены как обычные function
  // верхнего уровня — в classic-скрипте (не module) они уже автоматически доступны глобально
  // как window.switchToTelegramAccount / window.deleteTgAccount, поэтому вызывать их из
  // onclick="..." в HTML можно напрямую, без отдельного window.-обёртки (которая раньше
  // здесь была и по ошибке вызывала бесконечную рекурсию, ломая вход).

  // Список сохранённых Telegram-аккаунтов в выпадающем меню профиля
  function renderTgAccountSwitcher() {
    const section = document.getElementById('tgAccountSwitcherSection');
    if (!section) return;
    const accounts = loadTgAccounts();
    const activeId = localStorage.getItem(TG_ACTIVE_KEY);
    const isOnTelegram = !!activeId;
    const primaryUser = primaryAuth.currentUser;

    // Показываем переключатель, если есть TG-аккаунты ИЛИ есть email-аккаунт
    if (!accounts.length && !primaryUser) {
      section.innerHTML = '';
      return;
    }

    let html = '<div class="tg-account-switch-label">Аккаунты на этом устройстве</div>';

    // Email / основной аккаунт (primary Firebase) — в общем списке, без отдельного заголовка
    if (primaryUser) {
      const emailName = primaryUser.displayName || primaryUser.email || 'Email-аккаунт';
      const isEmailActive = !isOnTelegram;
      const emailInitial = (emailName || 'E').charAt(0).toUpperCase();
      html += `
        <div class="tg-account-item ${isEmailActive ? 'active' : ''}" onclick="${isEmailActive ? '' : 'switchToDefaultAccount()'}">
          <div class="tg-account-fallback" style="background: #16a34a;">${escapeHtml(emailInitial)}</div>
          <span class="tg-account-item-name">${escapeHtml(emailName)}${isEmailActive ? ' (активен)' : ''} · email</span>
        </div>`;
    } else if (accounts.length) {
      // Нет email-сессии, но есть TG — предлагаем войти в email
      html += `
        <div class="tg-account-add-item" onclick="profileDropdown.classList.remove('show'); switchToDefaultAccount(); openLoginModal();">
          + Войти в email-аккаунт
        </div>`;
    }

    // Telegram-аккаунты — в том же общем списке
    if (accounts.length) {
      accounts.forEach((acc) => {
        const isActive = String(acc.telegramId) === String(activeId);
        const safeName = escapeHtml(acc.username || 'Telegram');
        const avatarHtml = acc.avatarUrl
          ? `<img src="${escapeHtml(acc.avatarUrl)}" alt="">`
          : `<div class="tg-account-fallback">${escapeHtml((acc.username || '?').replace('@', '').charAt(0).toUpperCase())}</div>`;
        html += `
          <div class="tg-account-item ${isActive ? 'active' : ''}" onclick="${isActive ? '' : `switchToTelegramAccount('${acc.telegramId}')`}">
            ${avatarHtml}
            <span class="tg-account-item-name">${safeName}${isActive ? ' (активен)' : ''} · Telegram</span>
            <button type="button" class="tg-account-item-remove" onclick="event.stopPropagation(); deleteTgAccount('${acc.telegramId}')" title="Удалить аккаунт">✕</button>
          </div>`;
      });
    }

    html += `<div class="tg-account-add-item" onclick="profileDropdown.classList.remove('show'); openLoginModal();">+ Добавить аккаунт</div>`;

    section.innerHTML = html;
  }

  // Восстанавливаем активный Telegram-аккаунт при загрузке страницы, если он был выбран ранее
  const savedActiveTelegramId = localStorage.getItem(TG_ACTIVE_KEY);
  if (savedActiveTelegramId) {
    switchToTelegramAccount(savedActiveTelegramId);
  }

  // Основная (email/пароль) сессия — обрабатываем её изменения, но только пока
  // активен именно основной аккаунт (не Telegram-аккаунт).
  primaryAuth.onAuthStateChanged((user) => {
    // Всегда обновляем список аккаунтов (чтобы email-аккаунт появился в переключателе)
    renderTgAccountSwitcher();
    if (auth !== primaryAuth) return;
    handleAuthUser(user);
  });
  // ===================== /ВХОД ЧЕРЕЗ TELEGRAM =====================


  // ===================== TELEGRAM MINI APP =====================
  // Работает только когда сайт открыт внутри Telegram (кнопка меню/Web App у бота).
  // При обычном открытии в браузере window.Telegram будет отсутствовать —
  // весь блок ниже просто ничего не сделает и сайт будет работать как обычный сайт.
  const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  let tgUser = null;

  if (tg) {
    tg.ready();
    tg.expand(); // разворачиваем на весь экран, а не половину
    if (typeof tg.disableVerticalSwipes === 'function') {
      tg.disableVerticalSwipes(); // чтобы свайп вниз внутри страницы не закрывал приложение
    }
    if (typeof tg.setHeaderColor === 'function') {
      try { tg.setHeaderColor('#18191c'); } catch (e) {}
    }
    if (typeof tg.setBackgroundColor === 'function') {
      try { tg.setBackgroundColor('#18191c'); } catch (e) {}
    }

    // Данные пользователя Telegram (имя, ник, фото), доступные сразу без запроса.
    // ВАЖНО: это НЕ проверенные данные — их можно подделать на клиенте, поэтому
    // используем их только для удобства (автозаполнение), а не как замену входу.
    tgUser = tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user : null;

    // Кнопка "Назад" Telegram вместо обычной кнопки закрытия модалок.
    tg.BackButton.onClick(() => {
      const openModal = document.querySelector('.modal-overlay.show');
      const profilePageEl = document.getElementById('userProfileModal');
      const profileOpen = profilePageEl && profilePageEl.style.display === 'block';
      if (openModal) {
        openModal.classList.remove('show');
        updateTelegramBackButton();
      } else if (profileOpen) {
        closeUserProfileModal();
        updateTelegramBackButton();
      } else {
        tg.close();
      }
    });

    // Следим за открытием/закрытием модалок и страницы профиля, чтобы показывать/скрывать BackButton
    const modalObserver = new MutationObserver(updateTelegramBackButton);
    document.querySelectorAll('.modal-overlay').forEach((el) => {
      modalObserver.observe(el, { attributes: true, attributeFilter: ['class'] });
    });
    const profilePageForObserver = document.getElementById('userProfileModal');
    if (profilePageForObserver) {
      modalObserver.observe(profilePageForObserver, { attributes: true, attributeFilter: ['style'] });
    }
  }

  // Обновить видимость кнопки "Назад" Telegram Mini App в зависимости от открытых модалок/страницы профиля
  function updateTelegramBackButton() {
    if (!tg) return;
    const openModal = document.querySelector('.modal-overlay.show');
    const profilePageEl = document.getElementById('userProfileModal');
    const profileOpen = profilePageEl && profilePageEl.style.display === 'block';
    if (openModal || profileOpen) {
      tg.BackButton.show();
    } else {
      tg.BackButton.hide();
    }
  }

  let currentMessagesList = [];
  let currentVideosList = [];
  let currentUserProfile = null;
  let currentProfileTab = 'posts';
  let currentProfileUserMsgs = [];
  let currentVideoFilter = 'Рекомендуем';
  let selectedSuggestCategory = 'Смешные';
  let suggestVideoId = null;
  let suggestVideoTitle = '';

  const errorToast = document.getElementById('errorToast');
  const statTotalUsersEl = document.getElementById('statTotalUsers');
  const statOnlineTodayEl = document.getElementById('statOnlineToday');
  const statCommentsCountEl = document.getElementById('statCommentsCount');
  const statVideosCountEl = document.getElementById('statVideosCount');
  const statGamesCountEl = document.getElementById('statGamesCount');
  const statViewsCountEl = document.getElementById('statViewsCount');

  const gbMessagesContainer = document.getElementById('gbMessages');
  const gbInput = document.getElementById('gbInput');
  const gbSendBtn = document.getElementById('gbSendBtn');
  const sortSelect = document.getElementById('sortSelect');

  const savedDraft = localStorage.getItem('discoragen_gb_draft');
  if (savedDraft && gbInput) {
    gbInput.value = savedDraft;
  }
  if (gbInput) {
    gbInput.addEventListener('input', () => {
      localStorage.setItem('discoragen_gb_draft', gbInput.value);
    });
    gbInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendGuestbookMessage();
    });
  }

  if (gbSendBtn) {
    gbSendBtn.addEventListener('click', sendGuestbookMessage);
  }

  // Отправить сообщение в гостевую книгу
  // Антиспам: минимальный интервал между отправкой сообщений в гостевой книге (защита от скриптового спама через UI)
  let lastGbSendAt = 0;
  const GB_SEND_MIN_INTERVAL_MS = 4000;

  function sendGuestbookMessage() {
    const user = auth.currentUser;
    if (!user || !currentUserProfile) {
      showToast('Чтобы писать в гостевой книге, нужно зарегистрироваться или войти в аккаунт', 'error');
      openLoginModal();
      return;
    }

    if (blockedByRestriction('guestbook', 'Написание сообщений в гостевой книге')) return;

    const now = Date.now();
    if (now - lastGbSendAt < GB_SEND_MIN_INTERVAL_MS) {
      showToast(`Не так быстро! Подождите ${Math.ceil((GB_SEND_MIN_INTERVAL_MS - (now - lastGbSendAt)) / 1000)} сек.`, 'error');
      return;
    }

    const text = gbInput.value.trim();
    if (!text) {
      showToast('Введите текст сообщения', 'error');
      return;
    }

    lastGbSendAt = now;
    gbSendBtn.disabled = true;

    db.collection('messages').add({
      userId: user.uid,
      author: currentUserProfile.username,
      avatarUrl: currentUserProfile.avatarUrl || '',
      text: text,
      image: null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      localTime: Date.now(),
      reactions: {},
      pinned: false
    }).then(() => {
      gbInput.value = '';
      localStorage.removeItem('discoragen_gb_draft');
      gbSendBtn.disabled = false;
    }).catch(err => {
      console.error(err);
      showToast('Ошибка отправки сообщения', 'error');
      gbSendBtn.disabled = false;
    });
  }

  /* ===== КОНФЕТТИ ПРИ УСПЕШНОМ ИЗМЕНЕНИИ ПРОФИЛЯ ===== */
  function showConfettiCelebration() {
    const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#14b8a6'];
    const container = document.createElement('div');
    container.id = 'confettiContainer';
    document.body.appendChild(container);

    const pieceCount = 90;
    for (let i = 0; i < pieceCount; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = 6 + Math.random() * 6;
      const isCircle = Math.random() > 0.5;
      piece.style.left = (Math.random() * 100) + 'vw';
      piece.style.width = size + 'px';
      piece.style.height = (isCircle ? size : size * 0.4) + 'px';
      piece.style.background = color;
      piece.style.borderRadius = isCircle ? '50%' : '2px';
      piece.style.setProperty('--drift', (Math.random() * 200 - 100) + 'px');
      piece.style.setProperty('--spin', (Math.random() * 720 - 360) + 'deg');
      const duration = 2.2 + Math.random() * 1.6;
      const delay = Math.random() * 0.4;
      piece.style.animationDuration = duration + 's';
      piece.style.animationDelay = delay + 's';
      container.appendChild(piece);
    }

    setTimeout(() => { container.remove(); }, 4200);
  }

  let toastCounter = 0;
  const TOAST_DURATION_MS = 3500; // единственный источник длительности тоста — и для скрытия, и для полоски прогресса
  // Показать всплывающее уведомление (тост). type: 'success' (по умолчанию) или 'error'
  function showToast(message, type) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const isError = type === 'error';
    const icon = isError
      ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
      : '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';

    const el = document.createElement('div');
    el.className = isError ? 'toast toast-error' : 'toast toast-success';
    el.id = `toast_${++toastCounter}`;
    el.innerHTML = `
      <div class="toast-icon">
        ${icon}
      </div>
      <div class="toast-body">
        <div class="toast-title">${isError ? 'Ошибка' : 'Успешно'}</div>
        <div class="toast-text">${escapeHtml(message)}</div>
      </div>
      <button class="toast-close" title="Закрыть">✕</button>
      <div class="toast-progress"></div>
    `;

    // Полоска прогресса должна идти ровно столько же, сколько тост живёт до скрытия —
    // задаём длительность анимации из той же константы, что и таймер скрытия ниже,
    // чтобы они никогда не расходились.
    const progressEl = el.querySelector('.toast-progress');
    progressEl.style.animationDuration = TOAST_DURATION_MS + 'ms';

    const hide = () => {
      el.classList.remove('show');
      el.classList.add('hide');
      setTimeout(() => el.remove(), 350);
    };

    el.querySelector('.toast-close').addEventListener('click', (e) => {
      e.stopPropagation();
      hide();
    });

    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(hide, TOAST_DURATION_MS);
  }
  window.showToast = showToast; // делаем доступной глобально для inline onclick="showToast(...)"

  /* ===== ОВЕРЛЕЙ ЗАГРУЗКИ ДЕЙСТВИЯ (отправка поста / видео) ===== */
  const actionLoaderOverlay = document.getElementById('actionLoaderOverlay');
  const actionLoaderText = document.getElementById('actionLoaderText');
  // Показать оверлей загрузки при выполнении действия
  function showActionLoader(text) {
    if (actionLoaderText) actionLoaderText.textContent = text || 'Загрузка...';
    if (actionLoaderOverlay) actionLoaderOverlay.classList.add('show');
  }
  // Скрыть оверлей загрузки действия
  function hideActionLoader() {
    if (actionLoaderOverlay) actionLoaderOverlay.classList.remove('show');
  }

  /* ===== ЭКРАН ПЕРВОНАЧАЛЬНОЙ ЗАГРУЗКИ САЙТА ===== */
  const initialLoaderOverlay = document.getElementById('initialLoaderOverlay');
  const initialLoaderText = document.getElementById('initialLoaderText');
  const initialLoaderSpinner = document.getElementById('initialLoaderSpinner');
  const initialLoaderRetryBtn = document.getElementById('initialLoaderRetryBtn');
  let initialMessagesLoaded = false;
  let initialVideosLoaded = false;
  let initialAuthResolved = false;
  let initialLoaderHidden = false;

  // Попробовать скрыть начальный экран загрузки, если все данные готовы
  function tryHideInitialLoader() {
    if (initialLoaderHidden) return;
    if (initialMessagesLoaded && initialVideosLoaded && initialAuthResolved && initialLoaderOverlay) {
      initialLoaderHidden = true;
      clearTimeout(slowLoadHintTimeout);
      clearTimeout(stuckLoadTimeout);
      initialLoaderOverlay.classList.add('hide');
      applyStartTabFromUrl();
    }
  }

  // Если загрузка идет дольше обычного (например, из-за VPN или плохой сети),
  // подбадриваем пользователя вместо того, чтобы он думал, что сайт завис
  const slowLoadHintTimeout = setTimeout(() => {
    if (!initialLoaderHidden && initialLoaderText) {
      initialLoaderText.textContent = 'Загрузка занимает больше времени, чем обычно... Проверьте соединение (VPN может замедлять загрузку)';
    }
  }, 6000);

  // Если данные так и не пришли за долгое время — НЕ впускаем пользователя на непрогруженный
  // сайт молча, а честно показываем, что не получилось, и даем кнопку "Обновить страницу"
  const stuckLoadTimeout = setTimeout(() => {
    if (!initialLoaderHidden) {
      if (initialLoaderSpinner) initialLoaderSpinner.style.display = 'none';
      if (initialLoaderText) initialLoaderText.textContent = 'Не удалось загрузить сайт. Проверьте интернет-соединение или VPN и попробуйте снова.';
      if (initialLoaderRetryBtn) initialLoaderRetryBtn.style.display = 'inline-block';
    }
  }, 20000);

  // Проверить, является ли текущий пользователь администратором
  function isAdmin() {
    const user = auth.currentUser;
    return user && user.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
  }

  window.deleteMessage = function(id) {
    if (!isAdmin()) {
      showToast('Недостаточно прав!', 'error');
      return;
    }
    if (confirm('Удалить это сообщение / пост?')) {
      db.collection('messages').doc(id).delete().then(() => {
        showToast('Успешно удалено');
        closeViewPostModal();
      }).catch(err => {
        showToast('Ошибка удаления', 'error');
      });
    }
  };

  window.reportMessage = function(id) {
    db.collection('reports').add({
      messageId: id,
      reporterId: auth.currentUser && auth.currentUser.displayName ? auth.currentUser.displayName : 'Гость',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      showToast('Жалоба успешно отправлена модераторам!');
    }).catch(err => {
      showToast('Ошибка отправки жалобы', 'error');
    });
  };

  let currentReportsList = [];

  // Загрузить список жалоб на сообщения
  function fetchReports() {
    const container = document.getElementById('reportsListContainer');
    const bulkActions = document.getElementById('reportsBulkActions');
    container.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 20px;">Загрузка жалоб...</div>';
    if (bulkActions) bulkActions.style.display = 'none';
    currentReportsList = [];

    db.collection('reports').get().then(snapshot => {
      container.innerHTML = '';
      if (snapshot.empty) {
        container.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 20px;">Нет активных жалоб 👍</div>';
        return;
      }

      let hasMessageReports = false;

      snapshot.forEach(doc => {
        const report = doc.data();
        const reportId = doc.id;

        if (report.type === 'donation') {
          const div = document.createElement('div');
          div.style.cssText = 'background: rgba(250, 204, 21, 0.06); border: 1px solid rgba(250, 204, 21, 0.3); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px;';
          div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--muted);">
              <span>Заявка на донат</span>
              <span>От: <strong style="color: var(--accent);">${escapeHtml(report.reporterId)}</strong></span>
            </div>
            <div style="background: var(--input-bg); padding: 8px 12px; border-radius: 6px; font-size: 13.5px; color: var(--text);">
              Никнейм для топа: <b>${escapeHtml(report.displayName)}</b><br>
              Заявленная сумма: <b>${escapeHtml(String(report.amount))} ₽</b>
            </div>
            <div style="font-size: 11px; color: var(--muted);">Проверьте поступление на счёт вручную перед подтверждением.</div>
            <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px;">
              <button class="reaction-btn" style="color: var(--danger); border-color: rgba(239,68,68,0.3);" onclick="dismissReport('${reportId}')">Отклонить</button>
              <button class="reaction-btn" style="color: #16a34a; border-color: rgba(22,163,74,0.3);" onclick="approveDonation('${reportId}', '${escapeHtml(report.displayName).replace(/'/g, "\\'")}', ${Number(report.amount) || 0})">Подтвердить и добавить в топ</button>
            </div>
          `;
          container.appendChild(div);
          return;
        }

        if (report.type === 'subscription') {
          const isPremiumReq = report.tier === 'premium';
          const div = document.createElement('div');
          div.style.cssText = `background: rgba(250, 204, 21, 0.06); border: 1px solid ${isPremiumReq ? 'rgba(250,204,21,0.45)' : 'rgba(59,130,246,0.35)'}; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px;`;
          div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--muted);">
              <span>${isPremiumReq ? 'Заявка на PREMIUM' : '✓ Заявка на LITE'}</span>
              <span>От: <strong style="color: var(--accent);">${escapeHtml(report.username || 'Пользователь')}</strong></span>
            </div>
            <div style="background: var(--input-bg); padding: 8px 12px; border-radius: 6px; font-size: 13.5px; color: var(--text);">
              Тариф: <b>${isPremiumReq ? 'Premium' : 'Lite'}</b><br>
              Заявленная сумма: <b>${escapeHtml(String(report.amount))} ₽</b>
            </div>
            <div style="font-size: 11px; color: var(--muted);">Проверьте поступление на счёт вручную перед подтверждением.</div>
            <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px;">
              <button class="reaction-btn" style="color: var(--danger); border-color: rgba(239,68,68,0.3);" onclick="dismissReport('${reportId}')">Отклонить</button>
              <button class="reaction-btn" style="color: #16a34a; border-color: rgba(22,163,74,0.3);" onclick="approveSubscription('${reportId}', '${report.userId}', '${report.tier}')">Подтвердить и активировать</button>
            </div>
          `;
          container.appendChild(div);
          return;
        }

        hasMessageReports = true;
        currentReportsList.push({ reportId, messageId: report.messageId });
        db.collection('messages').doc(report.messageId).get().then(msgDoc => {
          const msgData = msgDoc.exists ? msgDoc.data() : { text: 'Сообщение было удалено', author: 'Неизвестно' };
          const authorSub = msgData.userId ? premiumUsersMap[msgData.userId] : null;
          const isPriorityAuthor = authorSub && authorSub.subTier === 'premium';
          const div = document.createElement('div');
          div.style.cssText = `background: rgba(150,150,150,0.05); border: 1px solid ${isPriorityAuthor ? 'rgba(250,204,21,0.5)' : 'var(--card-border)'}; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px;`;
          div.innerHTML = `
            ${isPriorityAuthor ? '<div style="display:flex; align-items:center; gap:5px; font-size: 11px; font-weight: 700; color: #facc15;"><svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M3 18h18l1.2-9-5.2 4-3-6-3 6-5.2-4L3 18z"/></svg>PREMIUM-АВТОР · приоритетная проверка</div>' : ''}
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--muted);">
              <span>Автор: <strong style="color: var(--text);">${escapeHtml(msgData.author)}</strong></span>
              <span>Репорт от: <strong style="color: var(--accent);">${escapeHtml(report.reporterId)}</strong></span>
            </div>
            <div style="background: var(--input-bg); padding: 8px 12px; border-radius: 6px; font-size: 13.5px; color: var(--text);">
              "${escapeHtml(msgData.text)}"
            </div>
            <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px;">
              <button class="reaction-btn" style="color: var(--danger); border-color: rgba(239,68,68,0.3);" onclick="deleteReportedMessage('${reportId}', '${report.messageId}')">Удалить</button>
              <button class="reaction-btn" onclick="dismissReport('${reportId}')">Закрыть жалобу</button>
            </div>
          `;
          // Жалобы на публикации Premium-пользователей поднимаются в начало списка —
          // это и есть их привилегия "Приоритетная модерация ваших сообщений"
          if (isPriorityAuthor) {
            container.prepend(div);
          } else {
            container.appendChild(div);
          }
        });
      });

      if (bulkActions) bulkActions.style.display = hasMessageReports ? 'flex' : 'none';
    }).catch(err => {
      container.innerHTML = '<div style="color: var(--danger); text-align: center; padding: 20px;">Ошибка загрузки жалоб</div>';
    });
  }

  window.approveDonation = function(reportId, displayName, amount) {
    if (!isAdmin()) return;
    if (!confirm(`Вы проверили в банке — деньги от "${displayName}" (${amount} ₽) действительно поступили?`)) return;

    db.collection('topDonators').add({
      displayName: displayName,
      amount: amount,
      approvedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      return db.collection('reports').doc(reportId).delete();
    }).then(() => {
      showToast('Донат подтверждён и добавлен в топ-донатеров!');
      fetchReports();
    }).catch(err => {
      console.error(err);
      showToast('Ошибка подтверждения доната', 'error');
    });
  };

  window.adminGiftFromSubModal = function(tier) {
    if (!isAdmin()) return;
    const query = prompt(`Никнейм или email пользователя, которому подарить тариф "${tier === 'premium' ? 'Premium' : 'Lite'}":`);
    if (!query) return;
    const q = query.trim().toLowerCase();
    if (!q) return;

    primaryDb.collection('users').get().then(snapshot => {
      let matched = [];
      snapshot.forEach(doc => {
        const u = doc.data();
        if ((u.username || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)) {
          matched.push({ id: doc.id, ...u });
        }
      });

      if (matched.length === 0) {
        showToast('Пользователь не найден', 'error');
        return;
      }
      if (matched.length > 1) {
        showToast(`Найдено ${matched.length} пользователей — уточните запрос или используйте панель жалоб`, 'error');
        return;
      }

      const target = matched[0];
      if (!confirm(`Подарить тариф "${tier}" пользователю "${target.username || target.email}" на 30 дней?`)) return;

      const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
      primaryDb.collection('users').doc(target.id).update({
        subTier: tier,
        subExpiresAt: expiresAt
      }).then(() => {
        showToast(`Тариф "${tier}" подарен пользователю ${target.username || target.email}!`);
      }).catch(err => {
        console.error(err);
        showToast('Ошибка выдачи подписки', 'error');
      });
    }).catch(err => {
      console.error(err);
      showToast('Ошибка поиска пользователя', 'error');
    });
  };

  window.adminSearchSubUsers = function() {
    if (!isAdmin()) return;
    const resultsBox = document.getElementById('subAdminResults');
    const query = document.getElementById('subAdminSearchInput').value.trim().toLowerCase();
    if (!query) {
      resultsBox.innerHTML = '<div style="color: var(--muted); font-size: 12.5px; text-align:center; padding: 8px;">Введите никнейм или email для поиска</div>';
      return;
    }
    resultsBox.innerHTML = '<div style="color: var(--muted); font-size: 12.5px; text-align:center; padding: 8px;">Поиск...</div>';

    primaryDb.collection('users').get().then(snapshot => {
      let matched = [];
      snapshot.forEach(doc => {
        const u = doc.data();
        if ((u.username || '').toLowerCase().includes(query) || (u.email || '').toLowerCase().includes(query)) {
          matched.push({ id: doc.id, ...u });
        }
      });

      if (matched.length === 0) {
        resultsBox.innerHTML = '<div style="color: var(--muted); font-size: 12.5px; text-align:center; padding: 8px;">Никого не найдено</div>';
        return;
      }

      resultsBox.innerHTML = '';
      matched.slice(0, 15).forEach(u => {
        const activeTier = (u.subTier && u.subExpiresAt && u.subExpiresAt > Date.now()) ? u.subTier : null;
        const statusStr = activeTier === 'premium' ? 'Premium' : (activeTier === 'lite' ? '✓ Lite' : 'Нет подписки');
        const row = document.createElement('div');
        row.style.cssText = 'background: var(--input-bg); border: 1px solid var(--card-border); border-radius: 8px; padding: 10px; display:flex; flex-direction:column; gap:6px;';
        row.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; font-size: 13px;">
            <strong>${escapeHtml(u.username || u.email || u.id)}</strong>
            <span style="color: var(--muted); font-size: 11.5px;">${statusStr}</span>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="reaction-btn" style="font-size:11.5px; color:#3b82f6; border-color: rgba(59,130,246,0.3);" onclick="adminGrantSub('${u.id}', 'lite')">Дать Lite (30 дн.)</button>
            <button class="reaction-btn" style="font-size:11.5px; color:#facc15; border-color: rgba(250,204,21,0.4);" onclick="adminGrantSub('${u.id}', 'premium')">Дать Premium (30 дн.)</button>
            ${activeTier ? `<button class="reaction-btn" style="font-size:11.5px; color: var(--danger); border-color: rgba(239,68,68,0.3);" onclick="adminRevokeSub('${u.id}')">Забрать подписку</button>` : ''}
          </div>
        `;
        resultsBox.appendChild(row);
      });
    }).catch(err => {
      console.error(err);
      resultsBox.innerHTML = '<div style="color: var(--danger); font-size: 12.5px; text-align:center; padding: 8px;">Ошибка поиска</div>';
    });
  };

  window.adminGrantSub = function(userId, tier) {
    if (!isAdmin()) return;
    if (!confirm(`Выдать тариф "${tier}" этому пользователю на 30 дней?`)) return;
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
    primaryDb.collection('users').doc(userId).update({
      subTier: tier,
      subExpiresAt: expiresAt
    }).then(() => {
      showToast('Подписка выдана!');
      adminSearchSubUsers();
    }).catch(err => {
      console.error(err);
      showToast('Ошибка выдачи подписки', 'error');
    });
  };

  window.adminRevokeSub = function(userId) {
    if (!isAdmin()) return;
    if (!confirm('Забрать подписку у этого пользователя?')) return;
    primaryDb.collection('users').doc(userId).update({
      subTier: firebase.firestore.FieldValue.delete(),
      subExpiresAt: firebase.firestore.FieldValue.delete()
    }).then(() => {
      showToast('Подписка отозвана!');
      adminSearchSubUsers();
    }).catch(err => {
      console.error(err);
      showToast('Ошибка отзыва подписки', 'error');
    });
  };

  /* ===== БАНЫ И ТАЙМАУТЫ =====
     Модель данных в users/{uid}:
       banned: true|false            — перма-бан, блокирует доступ ко всему сайту
       banReason: string (опц.)      — причина перма-бана, показывается пользователю
       bannedAt: timestamp (опц.)    — когда был выдан бан
       telegramId: number (опц.)     — при бане/разбане аккаунта с этим полем бан
                                        автоматически применяется/снимается у ВСЕХ
                                        документов с тем же telegramId (см.
                                        propagateTelegramBan) — это нужно, т.к. один и
                                        тот же Telegram-аккаунт на разных устройствах
                                        создаёт отдельный анонимный Firebase-документ
                                        (см. комментарий у ВХОД ЧЕРЕЗ TELEGRAM ниже)
       restrictions: {
         guestbook: { until: <мс>, reason?: string },  — таймаут на сообщения в гостевой книге
         media:     { until: <мс>, reason?: string },  — таймаут на публикацию фото/видео
         comments:  { until: <мс>, reason?: string }   — таймаут на комментарии
       }
  */
  const BAN_RESTRICTION_LABELS = { guestbook: 'Гостевая книга', media: 'Фото/видео', comments: 'Комментарии' };
  const BAN_DURATION_OPTIONS = [
    { ms: 60 * 1000, label: '1 минута' },
    { ms: 10 * 60 * 1000, label: '10 минут' },
    { ms: 7 * 24 * 60 * 60 * 1000, label: 'Неделя' },
    { ms: 30 * 24 * 60 * 60 * 1000, label: 'Месяц' },
    { ms: 365 * 24 * 60 * 60 * 1000, label: 'Год' }
  ];

  // Форматирует оставшееся время таймаута в человекочитаемый вид
  function formatDurationLeft(ms) {
    if (ms <= 0) return '0 сек.';
    if (ms < 60 * 1000) return Math.ceil(ms / 1000) + ' сек.';
    if (ms < 60 * 60 * 1000) return Math.ceil(ms / (60 * 1000)) + ' мин.';
    if (ms < 24 * 60 * 60 * 1000) return Math.ceil(ms / (60 * 60 * 1000)) + ' ч.';
    return Math.ceil(ms / (24 * 60 * 60 * 1000)) + ' дн.';
  }

  // Вернуть активное ограничение указанной категории для текущего пользователя (или null)
  function getActiveRestriction(category) {
    if (!currentUserProfile || !currentUserProfile.restrictions) return null;
    const r = currentUserProfile.restrictions[category];
    if (r && r.until && r.until > Date.now()) return r;
    return null;
  }

  // Проверка перед действием: если категория заблокирована таймаутом — показать тост и вернуть true
  function blockedByRestriction(category, actionLabel) {
    if (currentUserProfile && currentUserProfile.banned) {
      showToast('Ваш аккаунт заблокирован администратором', 'error');
      return true;
    }
    const r = getActiveRestriction(category);
    if (!r) return false;
    const left = formatDurationLeft(r.until - Date.now());
    showToast(`${actionLabel} временно недоступно (таймаут). Осталось: ${left}${r.reason ? ' — ' + r.reason : ''}`, 'error');
    return true;
  }

  window.adminSearchBanUsers = function() {
    if (!isAdmin()) return;
    const resultsBox = document.getElementById('banAdminResults');
    const query = document.getElementById('banAdminSearchInput').value.trim().toLowerCase();
    if (!query) {
      resultsBox.innerHTML = '<div style="color: var(--muted); font-size: 12.5px; text-align:center; padding: 8px;">Введите никнейм или email для поиска</div>';
      return;
    }
    resultsBox.innerHTML = '<div style="color: var(--muted); font-size: 12.5px; text-align:center; padding: 8px;">Поиск...</div>';

    primaryDb.collection('users').get().then(snapshot => {
      let matched = [];
      snapshot.forEach(doc => {
        const u = doc.data();
        if ((u.username || '').toLowerCase().includes(query) || (u.email || '').toLowerCase().includes(query)) {
          matched.push({ id: doc.id, ...u });
        }
      });

      if (matched.length === 0) {
        resultsBox.innerHTML = '<div style="color: var(--muted); font-size: 12.5px; text-align:center; padding: 8px;">Никого не найдено</div>';
        return;
      }

      resultsBox.innerHTML = '';
      matched.slice(0, 15).forEach(u => resultsBox.appendChild(buildBanUserRow(u)));
    }).catch(err => {
      console.error(err);
      resultsBox.innerHTML = '<div style="color: var(--danger); font-size: 12.5px; text-align:center; padding: 8px;">Ошибка поиска</div>';
    });
  };

  // Форматирует timestamp/Firestore Timestamp в человекочитаемую дату
  function formatBanDate(ts) {
    if (!ts) return '';
    const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  // Построить карточку пользователя в панели банов (статус + элементы управления)
  function buildBanUserRow(u) {
    const now = Date.now();
    const restrictions = u.restrictions || {};
    const durationSelectId = `banDuration_${u.id}`;
    const reasonInputId = `banReason_${u.id}`;
    const tgId = u.telegramId || '';

    let statusHtml = '';
    if (u.banned) {
      const dateStr = formatBanDate(u.bannedAt);
      statusHtml += `<div style="color: var(--danger); font-weight:700; font-size:12px; display:flex; flex-direction:column; gap:2px;">
        <span>ПЕРМА-БАН${dateStr ? ' · ' + dateStr : ''}</span>
        ${u.banReason ? `<span style="font-weight:500; color: var(--text); font-size:11.5px;">Причина: ${escapeHtml(u.banReason)}</span>` : `<span style="font-weight:500; color: var(--muted); font-size:11.5px;">Причина не указана</span>`}
        ${tgId ? `<span style="font-weight:500; color: var(--muted); font-size:11px;">Бан также действует на все устройства этого Telegram-аккаунта</span>` : ''}
      </div>`;
    }
    Object.keys(BAN_RESTRICTION_LABELS).forEach(cat => {
      const r = restrictions[cat];
      if (r && r.until && r.until > now) {
        statusHtml += `<div style="color:#f59e0b; font-size:11.5px; display:flex; align-items:center; gap:6px;">⏳ ${BAN_RESTRICTION_LABELS[cat]}: ещё ${formatDurationLeft(r.until - now)}
          <a href="#" onclick="event.preventDefault(); adminRemoveRestriction('${u.id}','${cat}')" style="color: var(--danger);">[снять]</a></div>`;
      }
    });

    const durationOptionsHtml = BAN_DURATION_OPTIONS.map(opt => `<option value="${opt.ms}">${opt.label}</option>`).join('');

    const row = document.createElement('div');
    row.style.cssText = 'background: var(--input-bg); border: 1px solid var(--card-border); border-radius: 10px; padding: 12px; display:flex; flex-direction:column; gap:8px;';
    row.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; font-size: 13px;">
        <strong>${escapeHtml(u.username || u.email || u.id)}</strong>
        ${tgId ? `<span style="font-size:11px; color: var(--muted);">Telegram</span>` : ''}
      </div>
      ${statusHtml}
      <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
        <select id="${durationSelectId}" style="background: var(--input-bg); border: 1px solid var(--card-border); border-radius:6px; padding:6px 6px; color: var(--text); font-family: 'Onest', sans-serif; font-size: 11.5px; outline:none;">
          ${durationOptionsHtml}
        </select>
        <button class="reaction-btn" style="font-size:11px;" onclick="adminApplyRestriction('${u.id}','guestbook','${durationSelectId}')">Гостевая</button>
        <button class="reaction-btn" style="font-size:11px;" onclick="adminApplyRestriction('${u.id}','media','${durationSelectId}')">Медиа</button>
        <button class="reaction-btn" style="font-size:11px;" onclick="adminApplyRestriction('${u.id}','comments','${durationSelectId}')">Комменты</button>
      </div>
      <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
        ${u.banned
          ? `<button class="reaction-btn" style="font-size:11.5px; color:#22c55e; border-color: rgba(34,197,94,0.4);" onclick="adminUnbanUser('${u.id}','${tgId}')">Разбанить</button>`
          : `<input type="text" id="${reasonInputId}" placeholder="Причина бана (необязательно)" style="flex:1; min-width:140px; background: var(--input-bg); border: 1px solid var(--card-border); border-radius:6px; padding:7px 8px; color: var(--text); font-family: 'Onest', sans-serif; font-size: 11.5px; outline:none;">
             <button class="reaction-btn" style="font-size:11.5px; color: var(--danger); border-color: rgba(239,68,68,0.4);" onclick="adminPermaBanUser('${u.id}','${reasonInputId}','${tgId}')">Перма-бан (навсегда)</button>`}
      </div>
    `;
    return row;
  }

  // Выдать таймаут на конкретную категорию действий
  window.adminApplyRestriction = function(userId, category, durationSelectId) {
    if (!isAdmin()) return;
    const select = document.getElementById(durationSelectId);
    if (!select) return;
    const durationMs = parseInt(select.value, 10);
    const label = select.options[select.selectedIndex].text;
    const catLabel = BAN_RESTRICTION_LABELS[category] || category;
    if (!confirm(`Выдать таймаут "${label}" на категорию "${catLabel}"?`)) return;

    primaryDb.collection('users').doc(userId).update({
      [`restrictions.${category}`]: { until: Date.now() + durationMs }
    }).then(() => {
      showToast('⏳ Таймаут выдан!');
      adminSearchBanUsers();
    }).catch(err => {
      console.error(err);
      showToast('Ошибка выдачи таймаута', 'error');
    });
  };

  // Снять активный таймаут с категории
  window.adminRemoveRestriction = function(userId, category) {
    if (!isAdmin()) return;
    if (!confirm('Снять таймаут с этой категории?')) return;
    primaryDb.collection('users').doc(userId).update({
      [`restrictions.${category}`]: firebase.firestore.FieldValue.delete()
    }).then(() => {
      showToast('Таймаут снят!');
      adminSearchBanUsers();
    }).catch(err => {
      console.error(err);
      showToast('Ошибка снятия таймаута', 'error');
    });
  };

  // Один и тот же Telegram-аккаунт создаёт ОТДЕЛЬНЫЙ документ users/{uid} на каждом
  // новом устройстве/браузере (см. комментарий у "ВХОД ЧЕРЕЗ TELEGRAM" ниже — сайт не
  // может server-side связать эти документы в один, т.к. нет своего сервера авторизации).
  // Поэтому бан/разбан ОДНОГО документа с telegramId нужно применять сразу ко ВСЕМ
  // документам с тем же telegramId — иначе пользователь просто заходит с другого
  // устройства/через повторный вход в Telegram и бан не действует.
  function propagateTelegramBan(telegramId, banned, reason, excludeUserId) {
    // telegramId хранится в Firestore как Number, а сюда часто приходит строкой
    // (из onclick-атрибутов) — нормализуем, иначе where(...) ничего не найдёт.
    const tgIdNum = Number(telegramId);
    if (!telegramId || isNaN(tgIdNum)) return Promise.resolve();
    return primaryDb.collection('users').where('telegramId', '==', tgIdNum).get().then(snapshot => {
      const batch = primaryDb.batch();
      let count = 0;
      snapshot.forEach(doc => {
        if (doc.id === excludeUserId) return;
        const payload = banned
          ? { banned: true, bannedAt: firebase.firestore.FieldValue.serverTimestamp() }
          : { banned: false, banReason: firebase.firestore.FieldValue.delete() };
        if (banned) {
          if (reason) payload.banReason = reason; else payload.banReason = firebase.firestore.FieldValue.delete();
        }
        batch.update(doc.ref, payload);
        count++;
      });
      return count > 0 ? batch.commit() : Promise.resolve();
    }).catch(err => {
      console.error('Ошибка синхронизации бана Telegram-аккаунта на других устройствах:', err);
    });
  }

  // Перма-бан: пользователь больше не сможет заходить на сайт, пока его не разбанят
  window.adminPermaBanUser = function(userId, reasonInputId, telegramId) {
    if (!isAdmin()) return;
    const reasonInput = reasonInputId ? document.getElementById(reasonInputId) : null;
    const reason = reasonInput ? reasonInput.value.trim() : '';
    const confirmMsg = 'Забанить этого пользователя навсегда?' + (reason ? '\nПричина: ' + reason : '') + '\nОн не сможет заходить на сайт, пока вы его не разбаните.';
    if (!confirm(confirmMsg)) return;

    const payload = { banned: true, bannedAt: firebase.firestore.FieldValue.serverTimestamp() };
    if (reason) payload.banReason = reason; else payload.banReason = firebase.firestore.FieldValue.delete();

    primaryDb.collection('users').doc(userId).update(payload).then(() => {
      return propagateTelegramBan(telegramId, true, reason, userId);
    }).then(() => {
      showToast('Пользователь забанен!');
      adminSearchBanUsers();
    }).catch(err => {
      console.error(err);
      showToast('Ошибка бана пользователя', 'error');
    });
  };

  // Снять перма-бан
  window.adminUnbanUser = function(userId, telegramId) {
    if (!isAdmin()) return;
    if (!confirm('Разбанить этого пользователя?' + (telegramId ? ' Бан будет снят со всех устройств этого Telegram-аккаунта.' : ''))) return;
    primaryDb.collection('users').doc(userId).update({
      banned: false,
      banReason: firebase.firestore.FieldValue.delete()
    }).then(() => {
      return propagateTelegramBan(telegramId, false, '', userId);
    }).then(() => {
      showToast('Пользователь разбанен!');
      adminSearchBanUsers();
    }).catch(err => {
      console.error(err);
      showToast('Ошибка разбана пользователя', 'error');
    });
  };

  // Показать/скрыть полноэкранный блокирующий оверлей для забаненного пользователя
  function showBanOverlay(reason, bannedAt) {
    const overlay = document.getElementById('banOverlay');
    if (!overlay) return;
    const reasonEl = document.getElementById('banOverlayReason');
    if (reasonEl) {
      if (reason) {
        reasonEl.textContent = 'Причина: ' + reason;
        reasonEl.style.display = 'block';
      } else {
        reasonEl.textContent = '';
        reasonEl.style.display = 'none';
      }
    }
    const dateEl = document.getElementById('banOverlayDate');
    if (dateEl) {
      const dateStr = formatBanDate(bannedAt);
      if (dateStr) {
        dateEl.textContent = 'Дата блокировки: ' + dateStr;
        dateEl.style.display = 'block';
      } else {
        dateEl.textContent = '';
        dateEl.style.display = 'none';
      }
    }
    overlay.classList.add('show');
  }
  // Скрыть оверлей бана/таймаута
  function hideBanOverlay() {
    const overlay = document.getElementById('banOverlay');
    if (overlay) overlay.classList.remove('show');
  }

  // Слушатель бана в реальном времени: следит за документом текущего пользователя
  // и мгновенно показывает/скрывает блокирующий оверлей при изменении статуса админом.
  //
  // ВАЖНО: если onSnapshot по какой-то причине обрывается с ошибкой (потеря сети,
  // временный сбой прав доступа и т.п.), Firestore НЕ переподключает слушатель сам —
  // раньше это могло приводить к тому, что после разбана оверлей не пропадал, пока
  // страница не будет перезагружена вручную. Теперь при ошибке слушатель
  // переподключается автоматически, а также раз в 30 секунд статус бана
  // подстраховочно перепроверяется обычным (не realtime) запросом.
  let banWatcherUnsub = null;
  let banWatcherRetryTimer = null;
  let banWatcherFallbackTimer = null;
  // Запустить realtime-слежение за баном для пользователя (см. пояснение выше)
  function startBanWatcher(user) {
    if (banWatcherUnsub) { banWatcherUnsub(); banWatcherUnsub = null; }
    if (banWatcherRetryTimer) { clearTimeout(banWatcherRetryTimer); banWatcherRetryTimer = null; }
    if (banWatcherFallbackTimer) { clearInterval(banWatcherFallbackTimer); banWatcherFallbackTimer = null; }
    if (!user) { hideBanOverlay(); return; }

    const watchDb = db;
    const watchUid = user.uid;
    const myEpoch = authEpoch;

    // Применить полученные данные о бане: обновить профиль и показать/скрыть оверлей
    function applyBanData(data) {
      if (myEpoch !== authEpoch) return; // пользователь уже сменился/переключился
      if (currentUserProfile) {
        currentUserProfile.banned = !!data.banned;
        currentUserProfile.banReason = data.banReason || '';
        currentUserProfile.restrictions = data.restrictions || {};
      }
      if (data.banned) {
        showBanOverlay(data.banReason, data.bannedAt);
      } else {
        hideBanOverlay();
      }
    }

    // Подписаться на onSnapshot документа пользователя (с автопереподключением при ошибке)
    function subscribe() {
      banWatcherUnsub = watchDb.collection('users').doc(watchUid).onSnapshot(doc => {
        if (myEpoch !== authEpoch) return;
        if (!doc.exists) return;
        applyBanData(doc.data());
      }, err => {
        console.error('Ошибка слежения за баном, переподключаюсь через 5 сек.:', err);
        if (myEpoch !== authEpoch) return;
        banWatcherUnsub = null;
        banWatcherRetryTimer = setTimeout(subscribe, 5000);
      });
    }
    subscribe();

    // Подстраховка на случай, если realtime-слушатель молча перестал получать
    // обновления (например, из-за офлайн-кэша) — раз в 30 сек. сверяем статус напрямую.
    banWatcherFallbackTimer = setInterval(() => {
      if (myEpoch !== authEpoch) { clearInterval(banWatcherFallbackTimer); return; }
      watchDb.collection('users').doc(watchUid).get({ source: 'server' }).then(doc => {
        if (myEpoch !== authEpoch || !doc.exists) return;
        applyBanData(doc.data());
      }).catch(() => {});
    }, 30000);
  }
  /* ===== /БАНЫ И ТАЙМАУТЫ ===== */

  window.approveSubscription = function(reportId, userId, tier) {
    if (!isAdmin()) return;
    if (!confirm(`Подтвердить оплату и активировать тариф "${tier}" пользователю?`)) return;

    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 дней
    db.collection('users').doc(userId).update({
      subTier: tier,
      subExpiresAt: expiresAt
    }).then(() => {
      return db.collection('reports').doc(reportId).delete();
    }).then(() => {
      showToast('Подписка активирована на 30 дней!');
      fetchReports();
    }).catch(err => {
      console.error(err);
      showToast('Ошибка активации подписки', 'error');
    });
  };

  window.approveAllReports = function() {
    if (!isAdmin()) return;
    if (currentReportsList.length === 0) return;
    if (!confirm(`Одобрить все жалобы (${currentReportsList.length}) и оставить сообщения без изменений?`)) return;

    const batch = db.batch();
    currentReportsList.forEach(r => {
      batch.delete(db.collection('reports').doc(r.reportId));
    });
    batch.commit().then(() => {
      showToast('Все жалобы одобрены (сообщения оставлены)');
      fetchReports();
    }).catch(err => {
      console.error(err);
      showToast('Ошибка при массовом одобрении', 'error');
    });
  };

  window.deleteAllReportedMessages = function() {
    if (!isAdmin()) return;
    if (currentReportsList.length === 0) return;
    if (!confirm(`Удалить все репортнутые сообщения (${currentReportsList.length}) и закрыть жалобы?`)) return;

    const batch = db.batch();
    currentReportsList.forEach(r => {
      batch.delete(db.collection('messages').doc(r.messageId));
      batch.delete(db.collection('reports').doc(r.reportId));
    });
    batch.commit().then(() => {
      showToast('Все репортнутые сообщения удалены');
      fetchReports();
    }).catch(err => {
      console.error(err);
      showToast('Ошибка при массовом удалении', 'error');
    });
  };

  // Отрисовать историю активности пользователя
  function renderActivityHistory() {
    const historyContainer = document.getElementById('activityHistoryList');
    historyContainer.innerHTML = '';

    const currentUserId = auth.currentUser ? auth.currentUser.uid : null;
    const currentUserName = currentUserProfile ? currentUserProfile.username : (auth.currentUser ? auth.currentUser.displayName : null);

    const userMsgs = currentMessagesList.filter(m => {
      if (currentUserId && m.userId === currentUserId) return true;
      if (currentUserName && m.author === currentUserName) return true;
      return false;
    });

    if (userMsgs.length === 0) {
      historyContainer.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 20px;">У вас пока нет сохраненных постов или сообщений.</div>';
      return;
    }

    userMsgs.forEach(m => {
      const timeInfo = formatMessageTime(m.createdAt, m.localTime);
      const div = document.createElement('div');
      div.style.cssText = 'background: rgba(150,150,150,0.04); border: 1px solid var(--card-border); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 6px;';
      
      let imgHtml = m.image ? `<img src="${m.image}" class="gb-image-thumb" />` : '';

      div.innerHTML = `
        <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--muted);">
          <span>${m.image ? 'Медиа-пост в ленту' : 'Сообщение в гостевой'}</span>
          <span>${timeInfo.display}</span>
        </div>
        <div style="font-size: 13.5px; color: var(--text);">${escapeHtml(m.text)}</div>
        ${imgHtml}
      `;
      historyContainer.appendChild(div);
    });
  }

  window.deleteReportedMessage = function(reportId, messageId) {
    if (!isAdmin()) return;
    db.collection('messages').doc(messageId).delete().then(() => {
      return db.collection('reports').doc(reportId).delete();
    }).then(() => {
      showToast('Сообщение удалено, жалоба закрыта');
      fetchReports();
    }).catch(err => {
      showToast('Ошибка удаления', 'error');
    });
  };

  window.dismissReport = function(reportId) {
    if (!isAdmin()) return;
    db.collection('reports').doc(reportId).delete().then(() => {
      showToast('Жалоба закрыта');
      fetchReports();
    }).catch(err => {
      showToast('Ошибка', 'error');
    });
  };

  window.togglePinMessage = function(id, currentPinned) {
    if (!isAdmin()) {
      showToast('Недостаточно прав!', 'error');
      return;
    }
    db.collection('messages').doc(id).update({
      pinned: !currentPinned,
      pinnedUntil: null
    }).then(() => {
      showToast(!currentPinned ? 'Сообщение закреплено' : 'Сообщение откреплено');
    }).catch(err => {
      showToast('Ошибка при изменении закрепления', 'error');
    });
  };

  // Проверить, может ли пользователь сейчас закрепить своё сообщение (по подписке)
  function canSelfPin() {
    if (!currentUserProfile || !currentUserProfile.subTier || !currentUserProfile.subExpiresAt || currentUserProfile.subExpiresAt <= Date.now()) return false;
    const periodMs = currentUserProfile.subTier === 'premium' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
    const last = currentUserProfile.lastSelfPinAt || 0;
    return Date.now() - last >= periodMs;
  }

  window.selfPinMessage = function(id) {
    const user = auth.currentUser;
    if (!user || !canSelfPin()) {
      showToast('Закрепление уже использовано в этом периоде', 'error');
      return;
    }
    const pinnedUntil = Date.now() + 60 * 60 * 1000; // 1 час
    db.collection('messages').doc(id).update({ pinned: true, pinnedUntil: pinnedUntil }).then(() => {
      return db.collection('users').doc(user.uid).update({ lastSelfPinAt: Date.now() });
    }).then(() => {
      currentUserProfile.lastSelfPinAt = Date.now();
      showToast('Сообщение закреплено на 1 час!');
    }).catch(err => {
      console.error(err);
      showToast('Ошибка закрепления', 'error');
    });
  };

  window.deleteVideo = function(id) {
    if (!isAdmin()) {
      showToast('Недостаточно прав!', 'error');
      return;
    }
    if (confirm('Удалить это видео из ленты?')) {
      db.collection('videos').doc(id).delete().then(() => {
        showToast('Видео успешно удалено');
      }).catch(err => {
        showToast('Ошибка удаления видео', 'error');
      });
    }
  };

  // Зарегистрировать нового пользователя (email/пароль)
  // Время открытия формы регистрации — простая антибот-проверка "слишком быстрое заполнение" (см. ниже)
  let regFormOpenedAt = 0;

  function registerUser() {
    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value.trim();

    // Антибот-проверка №1: honeypot-поле — невидимо человеку, но простые боты-автозаполнялки его находят и заполняют
    const honeypotEl = document.getElementById('regHoneypot');
    if (honeypotEl && honeypotEl.value.trim() !== '') {
      console.warn('Antibot: honeypot triggered on register');
      showToast('Ошибка регистрации. Попробуйте ещё раз.', 'error');
      return;
    }
    // Антибот-проверка №2: форма заполнена и отправлена мгновенно (< 1.2с) — типично для скриптовых ботов
    if (regFormOpenedAt && Date.now() - regFormOpenedAt < 1200) {
      showToast('Слишком быстро! Попробуйте ещё раз через пару секунд.', 'error');
      return;
    }

    if (!username || !email || !password) {
      showToast('Заполните все поля!', 'error');
      return;
    }
    if (!isSafeUsername(username)) {
      showToast('Ник: 2-30 символов, только буквы/цифры/пробел/_/-/.  (без кавычек и спецсимволов)', 'error');
      return;
    }
    if (password.length < 6) {
      showToast('Пароль должен быть не менее 6 символов!', 'error');
      return;
    }

    // Регистрация email всегда на primaryAuth
    primaryAuth.createUserWithEmailAndPassword(email, password)
      .then((userCredential) => {
        authEpoch++;
        auth = primaryAuth;
        db = primaryDb;
        localStorage.removeItem(TG_ACTIVE_KEY);
        recordLoginLog(userCredential.user.uid);
        return userCredential.user.updateProfile({
          displayName: username
        }).then(() => {
          return primaryDb.collection('users').doc(userCredential.user.uid).set({
            username: username,
            email: email,
            avatarUrl: '',
            bio: '',
            tags: '',
            phone: '',
            birthday: '',
            friends: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }).then(() => userCredential.user);
      })
      .then((user) => {
        handleAuthUser(user);
        renderTgAccountSwitcher();
        closeRegisterModal();
        showToast('Аккаунт успешно создан!');
        updateGlobalStatistics();
      })
      .catch((error) => {
        console.error(error);
        if (error.code === 'auth/email-already-in-use') {
          showToast('Этот email уже занят!', 'error');
        } else {
          showToast('Ошибка: ' + error.message, 'error');
        }
      });
  }

  // Войти в аккаунт (email/пароль)
  function loginUser() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!email || !password) {
      showToast('Заполните все поля!', 'error');
      return;
    }

    // Email/пароль всегда на основном Firebase-приложении (primaryAuth),
    // а не на tg_* инстансе — иначе "неверный пароль" при активном Telegram-аккаунте.
    primaryAuth.signInWithEmailAndPassword(email, password)
      .then((userCredential) => {
        // Переключаемся на email-сессию
        authEpoch++;
        auth = primaryAuth;
        db = primaryDb;
        localStorage.removeItem(TG_ACTIVE_KEY);
        recordLoginLog(userCredential.user.uid);
        handleAuthUser(userCredential.user);
        renderTgAccountSwitcher();
        closeLoginModal();
        showToast('Успешный вход в аккаунт!');
      })
      .catch((error) => {
        console.error(error);
        if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
          showToast('Неверный email или пароль!', 'error');
        } else if (error.code === 'auth/too-many-requests') {
          showToast('Слишком много попыток. Попробуйте позже.', 'error');
        } else {
          showToast('Ошибка входа: ' + (error.message || error.code), 'error');
        }
      });
  }

  // Войти через Twitch (кастомный OIDC-провайдер Firebase).
  // ВАЖНО: чтобы это заработало, провайдер нужно один раз настроить в Firebase Console:
  // Authentication → Sign-in method → Add new provider → OpenID Connect,
  // указать Client ID/Secret из приложения на dev.twitch.tv/console/apps
  // и присвоить провайдеру ID именно "oidc.twitch" (или поменять строку ниже на свой ID).
  window.loginWithTwitch = function() {
    if (typeof firebase.auth.OAuthProvider !== 'function') {
      showToast('Вход через Twitch недоступен', 'error');
      return;
    }
    const provider = new firebase.auth.OAuthProvider('oidc.twitch');
    primaryAuth.signInWithPopup(provider)
      .then((result) => {
        authEpoch++;
        auth = primaryAuth;
        db = primaryDb;
        localStorage.removeItem(TG_ACTIVE_KEY);
        recordLoginLog(result.user.uid);
        handleAuthUser(result.user);
        renderTgAccountSwitcher();
        closeLoginModal();
        closeRegisterModal();
        showToast('Успешный вход через Twitch!');
      })
      .catch((error) => {
        console.error(error);
        if (error.code === 'auth/operation-not-allowed') {
          showToast('Вход через Twitch ещё не настроен на сервере', 'error');
        } else if (error.code === 'auth/popup-closed-by-user') {
          // пользователь сам закрыл окно — тихо игнорируем
        } else {
          showToast('Ошибка входа через Twitch: ' + (error.message || error.code), 'error');
        }
      });
  };

  // Выйти из аккаунта
  function logoutUser() {
    const activeTelegramId = localStorage.getItem(TG_ACTIVE_KEY);
    if (activeTelegramId) {
      // Telegram-сессия не уничтожается — просто становится неактивной,
      // вернуться к ней потом можно из списка аккаунтов без повторного входа.
      switchToDefaultAccount();
      showToast('Вы вышли из аккаунта');
    } else {
      auth.signOut().then(() => {
        showToast('Вы вышли из аккаунта');
      });
    }
  }

  // Проверка ника на безопасные символы (защита от XSS-инъекции через inline onclick-обработчики,
  // куда ник подставляется во многих местах сайта). Разрешены буквы (лат./рус.), цифры, пробел,
  // _ - . — запрещены кавычки, угловые скобки, обратный слэш и т.п.
  function isSafeUsername(name) {
    return typeof name === 'string' &&
      name.length >= 2 && name.length <= 30 &&
      /^[a-zA-Zа-яА-ЯёЁ0-9 _.\-]+$/.test(name);
  }

  // Сохранить изменения профиля
  function saveProfileChanges() {
    const user = auth.currentUser;
    if (!user) return;

    const newAvatar = document.getElementById('editAvatarUrl').value.trim();
    const newUsername = document.getElementById('editUsernameInput').value.trim();
    const newBio = document.getElementById('editBioInput').value.trim();
    const newTags = document.getElementById('editTagsInput').value.trim();
    const newPhone = document.getElementById('editPhoneInput').value.trim();
    const newBirthday = document.getElementById('editBirthdayInput').value.trim();
    const nickColorCustomEl = document.getElementById('nickColorCustomInput');
    const newNickColor = nickColorCustomEl ? (nickColorCustomEl.value.trim() || nickColorCustomEl.dataset.picked || '') : '';

    if (!isSafeUsername(newUsername)) {
      showToast('Ник: 2-30 символов, только буквы/цифры/пробел/_/-/.  (без кавычек и спецсимволов)', 'error');
      return;
    }

    if (!newUsername) {
      showToast('Никнейм не может быть пустым!', 'error');
      return;
    }

    user.updateProfile({
      displayName: newUsername
    }).then(() => {
      return db.collection('users').doc(user.uid).set({
        username: newUsername,
        avatarUrl: newAvatar,
        bio: newBio,
        tags: newTags,
        phone: newPhone,
        birthday: newBirthday,
        nickColor: newNickColor,
        email: user.email
      }, { merge: true });
    }).then(() => {
      return db.collection('messages').where('userId', '==', user.uid).get();
    }).then((snapshot) => {
      const batch = db.batch();
      snapshot.forEach(doc => {
        batch.update(doc.ref, {
          avatarUrl: newAvatar,
          author: newUsername
        });
      });
      return batch.commit();
    }).then(() => {
      closeEditProfileModal();
      showToast('Профиль и аватарки обновлены!');
      currentUserProfile.username = newUsername;
      currentUserProfile.avatarUrl = newAvatar;
      currentUserProfile.bio = newBio;
      currentUserProfile.tags = newTags;
      currentUserProfile.phone = newPhone;
      currentUserProfile.birthday = newBirthday;
      updateDropdownUI(user, currentUserProfile);
      switchTab('main');
      showConfettiCelebration();
    }).catch(err => {
      console.error(err);
      showToast('Ошибка сохранения профиля', 'error');
    });
  }

  // Обновить содержимое выпадающего меню профиля в шапке сайта
  function updateDropdownUI(user, profile) {
    const dropdownUsernameText = document.getElementById('dropdownUsernameText');
    const authDropdownSection = document.getElementById('authDropdownSection');
    const dropdownAvatarBox = document.getElementById('dropdownAvatarBox');
    renderTgAccountSwitcher();

    if (gbInput && gbSendBtn) {
      if (user && profile) {
        gbInput.disabled = false;
        gbInput.placeholder = 'Напишите текстовое сообщение...';
        gbSendBtn.disabled = false;
      } else {
        gbInput.disabled = true;
        gbInput.placeholder = 'Войдите в аккаунт, чтобы писать в гостевой книге';
        gbSendBtn.disabled = true;
      }
    }

    if (user) {
      const name = profile.username || user.displayName || 'Пользователь';
      const adminBadgeStr = isAdmin() ? ' [Админ]' : '';
      const mySub = profile.subTier && profile.subExpiresAt && profile.subExpiresAt > Date.now() ? profile.subTier : null;
      const mySubBadgeStr = mySub === 'premium' ? 'PREMIUM ' : (mySub === 'lite' ? 'LITE' : '');
      dropdownUsernameText.textContent = name + adminBadgeStr + mySubBadgeStr;
      const settingsAuthLabel = document.getElementById('settingsAuthLabel');
      if (settingsAuthLabel) settingsAuthLabel.textContent = name;

      if (profile.avatarUrl) {
        dropdownAvatarBox.innerHTML = `<img src="${escapeHtml(profile.avatarUrl)}" alt="Avatar" onerror="avatarImgFallback(this)">`;
      } else {
        dropdownAvatarBox.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
      }

      let adminReportsItem = '';
      if (isAdmin()) {
        adminReportsItem = `
          <a href="#" class="dropdown-item" onclick="event.preventDefault(); openAdminPanelModal()">
            <svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
           Админ-панель
          </a>
        `;
      }

      authDropdownSection.innerHTML = `
        ${adminReportsItem}
        <a href="#" class="dropdown-item" onclick="event.preventDefault(); openMyProfileModal()">
          <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Профиль
        </a>
        <a href="#" class="dropdown-item logout" onclick="event.preventDefault(); logoutUser()">
          <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Выйти (${name})
        </a>
      `;
    } else {
      dropdownUsernameText.textContent = 'Гость';
      const settingsAuthLabelGuest = document.getElementById('settingsAuthLabel');
      if (settingsAuthLabelGuest) settingsAuthLabelGuest.textContent = 'Войти / Профиль';
      dropdownAvatarBox.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
      authDropdownSection.innerHTML = `
        <a href="#" class="dropdown-item" onclick="event.preventDefault(); openLoginModal()">
          <svg viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
          Войти
        </a>
        <a href="#" class="dropdown-item" onclick="event.preventDefault(); openRegisterModal()">
          <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
          Регистрация
        </a>
      `;
    }
  }

  // (Обработка входа теперь происходит через handleAuthUser() и primaryAuth.onAuthStateChanged
  // выше, в блоке "ВХОД ЧЕРЕЗ TELEGRAM + МУЛЬТИАККАУНТЫ" — так поддерживаются оба варианта:
  // и обычный email/пароль-аккаунт, и переключение между несколькими Telegram-аккаунтами.)

  // Отформатировать время сообщения для отображения
  function formatMessageTime(createdAt, localTime) {
    const date = createdAt ? createdAt.toDate() : (localTime ? new Date(localTime) : new Date());
    const now = new Date();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    const timeStr = `${hours}:${minutes}`;
    const dateStr = `${day}.${month}.${year}`;
    const tooltip = `${timeStr} ${dateStr}`;

    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    let display = '';
    if (isToday) display = `сегодня в ${timeStr}`;
    else if (isYesterday) display = `вчера в ${timeStr}`;
    else display = `${dateStr} в ${timeStr}`;

    return { display, tooltip };
  }

  // Обновить общую статистику платформы (счётчики и т.д.)
  function updateGlobalStatistics() {
    db.collection('users').get().then(snap => {
      if (statTotalUsersEl) statTotalUsersEl.textContent = snap.size || 1;
    }).catch(() => {});

    if (statCommentsCountEl) statCommentsCountEl.textContent = currentMessagesList.length;
    if (statVideosCountEl) statVideosCountEl.textContent = currentVideosList.length;
    if (statGamesCountEl) statGamesCountEl.textContent = 3;

    let totalViews = currentMessagesList.reduce((acc, m) => acc + (m.views || 0), 0);
    if (statViewsCountEl) {
      statViewsCountEl.textContent = totalViews > 1000 ? (totalViews / 1000).toFixed(1) + ' тыс.' : totalViews;
    }
    if (statOnlineTodayEl) {
      statOnlineTodayEl.textContent = Math.floor(Math.random() * 4) + 1;
    }
  }

  // Посчитать суммарное количество реакций
  function getTotalReactions(reactions) {
    if (!reactions) return 0;
    return Object.values(reactions).reduce((a, b) => a + b, 0);
  }

  // Получить счётчики лайк/дизлайк поста (с обратной совместимостью со старым полем reactions)
  function getPostVoteCounts(msg) {
    let votesUp = Number(msg.votesUp || 0);
    let votesDown = Number(msg.votesDown || 0);
    if (!msg.votesUp && !msg.votesDown && msg.reactions) {
      votesUp = Number(msg.reactions['👍'] || msg.reactions['❤'] || 0);
      votesDown = Number(msg.reactions['👎'] || 0);
    }
    return { votesUp, votesDown };
  }

  // Суммарный "рейтинг" поста (лайки минус дизлайки)
  function getPostScore(msg) {
    const { votesUp, votesDown } = getPostVoteCounts(msg);
    return votesUp - votesDown;
  }

  // ===== Кэш подписчиков (Premium / Lite) для бейджей и цвета ника =====
  let premiumUsersMap = {};
  primaryDb.collection('users').where('subTier', 'in', ['lite', 'premium']).onSnapshot((snap) => {
    const map = {};
    snap.forEach(d => {
      const u = d.data();
      if (u.subExpiresAt && u.subExpiresAt > Date.now()) map[d.id] = u;
    });
    premiumUsersMap = map;
    if (typeof renderMessages === 'function') renderMessages();
  }, (err) => console.error('premium users snapshot error:', err));

  // Обновить бейдж подписки (корона Premium / галочка Lite) и рамку аватара на странице профиля
  function applyProfilePremiumBadge(userId) {
    const badgeEl = document.getElementById('modalUserSubBadge');
    const avatarBox = document.getElementById('modalUserAvatar');
    if (!badgeEl) return;
    const u = premiumUsersMap[userId];
    if (avatarBox) avatarBox.classList.toggle('avatar-frame-premium', !!(u && u.subTier === 'premium'));
    if (!u) { badgeEl.innerHTML = ''; return; }
    if (u.subTier === 'premium') {
      badgeEl.innerHTML = `<span class="np-profile-badge-premium"><svg class="np-crown-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h18l1.2-9-5.2 4-3-6-3 6-5.2-4L3 18z"/></svg>PREMIUM</span>`;
    } else {
      badgeEl.innerHTML = `<span class="np-profile-badge-lite"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>LITE</span>`;
    }
  }

  // Сформировать HTML-бейдж подписки пользователя (Premium/Lite)
  function getUserBadgeHTML(userId) {
    const u = premiumUsersMap[userId];
    if (!u) return '';
    return u.subTier === 'premium'
      ? '<span class="user-sub-badge" title="Premium">PRO</span>'
      : '<span class="user-sub-badge" title="Lite">✓</span>';
  }

  // Сформировать inline-стиль отображения никнейма по подписке пользователя
  function getUserNameStyle(userId) {
    const u = premiumUsersMap[userId];
    if (!u) return '';
    if (u.subTier === 'premium') {
      return u.nickColor ? `style="background:${escapeHtml(u.nickColor)};-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:800;"` : 'class="name-premium"';
    }
    return u.nickColor ? `style="color:${escapeHtml(u.nickColor)};font-weight:700;"` : 'class="name-lite"';
  }

  db.collection('messages').onSnapshot((snapshot) => {
    currentMessagesList = [];
    snapshot.forEach(doc => { currentMessagesList.push({ id: doc.id, ...doc.data() }); });
    updateGlobalStatistics();
    sortAndRender();
    renderPhotosGrid();
    renderFriendsList();
    initialMessagesLoaded = true;
    tryHideInitialLoader();
    tryOpenDeepLinkPost();
  });

  db.collection('videos').onSnapshot((snapshot) => {
    currentVideosList = [];
    snapshot.forEach(doc => { currentVideosList.push({ id: doc.id, ...doc.data() }); });
    updateVideoCategoryCounts();
    renderVideosGrid();
    updateGlobalStatistics();
    initialVideosLoaded = true;
    tryHideInitialLoader();
  });

  // Найти пользователей платформы по поисковому запросу
  function searchPlatformUsers(query) {
    const container = document.getElementById('userSearchResults');
    const q = query.toLowerCase().trim();
    if (!q) {
      container.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 20px; grid-column: 1/-1;">Введите запрос для поиска пользователей...</div>';
      return;
    }
    db.collection('users').get().then(snapshot => {
      container.innerHTML = '';
      let results = [];
      snapshot.forEach(doc => {
        const u = doc.data();
        const uname = (u.username || '').toLowerCase();
        const uemail = (u.email || '').toLowerCase();
        if (uname.includes(q) || uemail.includes(q)) {
          results.push({ id: doc.id, ...u });
        }
      });
      if (results.length === 0) {
        container.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 20px; grid-column: 1/-1;">Пользователи не найдены</div>';
        return;
      }
      results.forEach(user => {
        const isMe = auth.currentUser && auth.currentUser.uid === user.id;
        const myFriends = currentUserProfile && currentUserProfile.friends ? currentUserProfile.friends : [];
        const isFriend = myFriends.includes(user.id);
        
        const card = document.createElement('div');
        card.style.cssText = 'background: rgba(150,150,150,0.05); border: 1px solid var(--card-border); border-radius: 10px; padding: 14px; display: flex; align-items: center; gap: 12px;';
        
        let avatarHtml = user.avatarUrl ? `<img src="${escapeHtml(user.avatarUrl)}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">` : `<div style="width:40px;height:40px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;">${(user.username || 'U')[0].toUpperCase()}</div>`;
        
        card.innerHTML = `
          ${avatarHtml}
          <div style="flex:1; min-width:0;">
            <div style="font-weight:700; color:var(--text); font-size:14px; cursor:pointer;" onclick="openUserProfile('${user.id}', '${escapeHtml(user.username)}', '${escapeHtml(user.avatarUrl || '')}')">${escapeHtml(user.username || 'Пользователь')}</div>
            <div style="font-size:12px; color:var(--muted); overflow:hidden; text-overflow:ellipsis;">@${escapeHtml((user.username || '').toLowerCase().replace(/\s+/g, ''))}</div>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="reaction-btn" onclick="openUserProfile('${user.id}', '${escapeHtml(user.username)}', '${escapeHtml(user.avatarUrl || '')}')">Профиль</button>
            ${!isMe ? `<button class="reaction-btn ${isFriend ? 'active' : ''}" onclick="toggleFriend('${user.id}')">${isFriend ? '✓ В друзьях' : '+ Друг'}</button>` : ''}
          </div>
        `;
        container.appendChild(card);
      });
    }).catch(err => {
      console.error(err);
      container.innerHTML = '<div style="color: var(--danger); text-align: center; padding: 20px; grid-column: 1/-1;">Ошибка поиска</div>';
    });
  }

  window.toggleFriend = function(targetUserId) {
    const user = auth.currentUser;
    if (!user) {
      showToast('Войдите в аккаунт, чтобы добавлять друзей!', 'error');
      return;
    }
    if (!currentUserProfile.friends) currentUserProfile.friends = [];
    const idx = currentUserProfile.friends.indexOf(targetUserId);
    if (idx > -1) {
      currentUserProfile.friends.splice(idx, 1);
      showToast('Пользователь удален из друзей');
    } else {
      currentUserProfile.friends.push(targetUserId);
      showToast('Пользователь добавлен в друзья!');
    }
    db.collection('users').doc(user.uid).update({
      friends: currentUserProfile.friends
    }).then(() => {
      const searchInp = document.getElementById('userSearchInput');
      if (searchInp && searchInp.value.trim()) {
        searchPlatformUsers(searchInp.value);
      }
      renderFriendsList();
    }).catch(err => {
      console.error(err);
      showToast('Ошибка обновления друзей', 'error');
    });
  };

  // Отрисовать список друзей
  function renderFriendsList() {
    const listContainer = document.getElementById('myFriendsList');
    const feedContainer = document.getElementById('friendsActivityFeed');
    if (!listContainer || !feedContainer) return;

    const user = auth.currentUser;
    if (!user) {
      listContainer.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 20px;">Войдите в аккаунт, чтобы управлять друзьями</div>';
      feedContainer.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 20px;">Войдите в аккаунт</div>';
      return;
    }

    const friendsIds = currentUserProfile && currentUserProfile.friends ? currentUserProfile.friends : [];
    if (friendsIds.length === 0) {
      listContainer.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 20px;">У вас пока нет друзей в списке. Используйте поиск выше!</div>';
      feedContainer.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 20px;">Нет активности друзей</div>';
      return;
    }

    listContainer.innerHTML = '';
    friendsIds.forEach(fId => {
      db.collection('users').doc(fId).get().then(doc => {
        if (!doc.exists) return;
        const fData = doc.data();
        const div = document.createElement('div');
        div.style.cssText = 'background: rgba(150,150,150,0.05); border: 1px solid var(--card-border); border-radius: 8px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between;';
        div.innerHTML = `
          <div style="display: flex; align-items: center; gap: 10px; cursor: pointer;" onclick="openUserProfile('${fId}', '${escapeHtml(fData.username)}', '${escapeHtml(fData.avatarUrl || '')}')">
            <div class="${premiumUsersMap[fId] && premiumUsersMap[fId].subTier === 'premium' ? 'avatar-frame-premium' : ''}" style="width:34px; height:34px; border-radius:50%; background:var(--accent); display:flex; align-items:center; justify-content:center; color:#fff; font-weight:700; overflow:hidden;">
              ${fData.avatarUrl ? `<img src="${escapeHtml(fData.avatarUrl)}" style="width:100%;height:100%;object-fit:cover;">` : (fData.username || 'U')[0].toUpperCase()}
            </div>
            <span style="font-weight:600; font-size:13.5px;" ${getUserNameStyle(fId)}>${escapeHtml(fData.username || 'Пользователь')}</span>${getUserBadgeHTML(fId)}
          </div>
          <button class="reaction-btn" style="color:var(--danger);" onclick="toggleFriend('${fId}')">Удалить</button>
        `;
        listContainer.appendChild(div);
      });
    });

    const friendMsgs = currentMessagesList.filter(m => friendsIds.includes(m.userId) || friendsIds.includes(m.author));
    feedContainer.innerHTML = '';
    if (friendMsgs.length === 0) {
      feedContainer.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 20px;">Друзья еще ничего не опубликовали</div>';
      return;
    }
    friendMsgs.slice(0, 10).forEach(m => {
      const timeInfo = formatMessageTime(m.createdAt, m.localTime);
      const div = document.createElement('div');
      div.style.cssText = 'background: rgba(150,150,150,0.04); border: 1px solid var(--card-border); border-radius: 8px; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px;';
      div.innerHTML = `
        <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--accent); font-weight: 600;">
          <span>@${escapeHtml(m.author)}</span>
          <span>${timeInfo.display}</span>
        </div>
        <div style="font-size: 13px; color: var(--text);">${escapeHtml(m.text)}</div>
      `;
      feedContainer.appendChild(div);
    });
  }

  // Обновить счётчики видео по категориям
  function updateVideoCategoryCounts() {
    const total = currentVideosList.length;
    const funny = currentVideosList.filter(v => v.category === 'Смешные').length;
    const truecrime = currentVideosList.filter(v => v.category === 'Трукрайм').length;
    const exposes = currentVideosList.filter(v => v.category === 'Разоблачения').length;
    const trailers = currentVideosList.filter(v => v.category === 'Трейлеры').length;
    const other = currentVideosList.filter(v => v.category === 'Разное').length;

    document.getElementById('count-rec').textContent = total;
    document.getElementById('count-funny').textContent = funny;
    document.getElementById('count-truecrime').textContent = truecrime;
    document.getElementById('count-exposes').textContent = exposes;
    document.getElementById('count-trailers').textContent = trailers;
    document.getElementById('count-other').textContent = other;
  }

  // Извлечь ID видео из ссылки на YouTube
  function extractYoutubeId(url) {
    if (!url) return null;
    const re = /(?:youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;
    const m = url.match(re);
    return m && m[1] ? m[1] : null;
  }

  window.filterVideos = function(category, btnEl) {
    currentVideoFilter = category;
    document.querySelectorAll('#videoFilterBar .video-filter-btn').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    renderVideosGrid();
  };

  window.handleVideoUrlInput = function(url) {
    const videoId = extractYoutubeId(url);
    const box = document.getElementById('suggestPreviewBox');
    const text = document.getElementById('suggestPreviewText');
    if (videoId) {
      suggestVideoId = videoId;
      box.style.backgroundImage = `url('https://img.youtube.com/vi/${videoId}/hqdefault.jpg')`;
      if (text) text.textContent = 'Видео найдено ✓';
      fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { suggestVideoTitle = (data && data.title) ? data.title : ''; })
        .catch(() => { suggestVideoTitle = ''; });
    } else {
      suggestVideoId = null;
      suggestVideoTitle = '';
      box.style.backgroundImage = 'none';
      if (text) text.textContent = 'Превью видео появится здесь';
    }
  };

  window.selectSuggestCategory = function(btnEl, category) {
    document.querySelectorAll('#suggestCategoryGrid .category-tag').forEach(b => b.classList.remove('selected'));
    btnEl.classList.add('selected');
    selectedSuggestCategory = category;
  };

  window.submitVideoSuggestion = function() {
    if (blockedByRestriction('media', 'Публикация фото/видео/аудио')) return;
    const urlInput = document.getElementById('suggestVideoUrl');
    const commentInput = document.getElementById('suggestVideoComment');
    const url = urlInput.value.trim();
    const comment = commentInput.value.trim();
    const videoId = extractYoutubeId(url);

    if (!url || !videoId) {
      showToast('Вставьте корректную ссылку на видео с YouTube!', 'error');
      return;
    }

    // Проверка на дубликат: такое видео уже есть в списке
    const alreadyExists = currentVideosList.some(v => v.videoId === videoId);
    if (alreadyExists) {
      showToast('Такое видео уже есть на сайте!', 'error');
      return;
    }

    const currentUser = auth.currentUser;
    const authorName = currentUserProfile ? currentUserProfile.username : (currentUser ? (currentUser.displayName || 'User') : ('guest_' + Math.floor(Math.random() * 900 + 100)));
    const userAvatarUrl = currentUserProfile ? currentUserProfile.avatarUrl : '';
    const userIdVal = currentUser ? currentUser.uid : ('guest_' + Math.random());

    showActionLoader('Отправка видео...');

    db.collection('videos').add({
      videoId: videoId,
      url: url,
      title: suggestVideoTitle || 'Видео без названия',
      category: selectedSuggestCategory,
      comment: comment,
      userId: userIdVal,
      author: authorName,
      avatarUrl: userAvatarUrl,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      localTime: Date.now(),
      likes: 0
    }).then(() => {
      hideActionLoader();
      showToast('Видео успешно отправлено!');
      closeSuggestVideoModal();
      switchTab('videos');
    }).catch(err => {
      hideActionLoader();
      console.error(err);
      showToast('Ошибка добавления видео', 'error');
    });
  };

  window.playVideoCard = function(containerEl, videoId) {
    // Переносим пользователя на YouTube в новой вкладке вместо показа видео на сайте
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank', 'noopener');
  };

  window.likeVideo = function(id) {
    const voteKey = `voted_video_${id}`;
    const hasVoted = localStorage.getItem(voteKey) === 'true';
    const videoRef = db.collection('videos').doc(id);

    db.runTransaction(async (transaction) => {
      const doc = await transaction.get(videoRef);
      if (!doc.exists) return;
      let likes = doc.data().likes || 0;
      if (hasVoted) {
        likes = Math.max(0, likes - 1);
        transaction.update(videoRef, { likes });
        localStorage.removeItem(voteKey);
      } else {
        likes = likes + 1;
        transaction.update(videoRef, { likes });
        localStorage.setItem(voteKey, 'true');
      }
    }).catch(err => {
      console.error(err);
      showToast('Ошибка реакции', 'error');
    });
  };

  // Отрисовать сетку видео
  function renderVideosGrid() {
    const grid = document.getElementById('videosGrid');
    if (!grid) return;
    grid.innerHTML = '';

    let list = currentVideosList.slice();
    if (currentVideoFilter !== 'Рекомендуем') {
      list = list.filter(v => v.category === currentVideoFilter);
    }

    list.sort((a, b) => {
      const timeA = a.createdAt?.toMillis() || a.localTime || 0;
      const timeB = b.createdAt?.toMillis() || b.localTime || 0;
      if (currentVideoFilter === 'Рекомендуем') return (b.likes || 0) - (a.likes || 0) || (timeB - timeA);
      return timeB - timeA;
    });

    if (list.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--muted); font-size: 14px;">В этой категории пока нет видео. Предложите первое!</div>`;
      return;
    }

    const isUserAdmin = isAdmin();

    list.forEach(v => {
      const timeInfo = formatMessageTime(v.createdAt, v.localTime);
      const card = document.createElement('div');
      card.className = 'video-card';

      let adminBtn = '';
      if (isUserAdmin) {
        adminBtn = `<button onclick="event.stopPropagation(); deleteVideo('${v.id}')" title="Удалить видео" style="position:absolute; top:10px; right:10px; background: rgba(239,68,68,0.9); border:none; color:#fff; display:flex; align-items:center; justify-content:center; width:26px; height:26px; padding:0; border-radius:6px; z-index:20; cursor:pointer;"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path></svg></button>`;
      }

      card.innerHTML = `
        <div class="video-thumb-container" style="background-image: url('https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg');" onclick="playVideoCard(this, '${v.videoId}')">
          ${adminBtn}
          <span class="video-badge">▶ ${escapeHtml(v.category || '')}</span>
        </div>
        <div class="video-info-box">
          <div class="video-title">${escapeHtml(v.title || 'Видео без названия')}</div>
          <div class="video-meta-row">
            <span class="video-author">@${escapeHtml(v.author || 'Гость')}</span>
            <span class="video-likes-count" style="cursor:pointer;" onclick="likeVideo('${v.id}')">👍 ${v.likes || 0}</span>
          </div>
          <div class="video-footer-meta">
            <span>${timeInfo.display}</span>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  if (sortSelect) sortSelect.addEventListener('change', sortAndRender);

  // Проверить, закреплено ли сообщение (и не истёк ли срок закрепления)
  function isMsgPinned(m) {
    return !!m.pinned && (!m.pinnedUntil || m.pinnedUntil > Date.now());
  }

  // Отсортировать и отрисовать список сообщений ленты/гостевой
  function sortAndRender() {
    const sortVal = sortSelect ? sortSelect.value : 'newest';
    const filteredList = currentMessagesList.filter(m => !isBlockedName(m.author) && !m.image);
    const sortedList = [...filteredList];

    sortedList.sort((a, b) => {
      const aPin = isMsgPinned(a), bPin = isMsgPinned(b);
      if (aPin && !bPin) return -1;
      if (!aPin && bPin) return 1;

      const timeA = a.createdAt?.toMillis() || a.localTime || 0;
      const timeB = b.createdAt?.toMillis() || b.localTime || 0;
      const popA = getTotalReactions(a.reactions);
      const popB = getTotalReactions(b.reactions);

      if (sortVal === 'newest') return timeB - timeA;
      if (sortVal === 'oldest') return timeA - timeB;
      if (sortVal === 'popular') {
        if (popB !== popA) return popB - popA;
        return timeB - timeA;
      }
      return timeB - timeA;
    });

    renderGuestbook(sortedList);
  }

  // Отрисовать гостевую книгу
  const GB_INITIAL_LIMIT = 3;
  let gbShowAllMessages = false;
  let gbLastFullList = [];
  let gbRevealPending = false;

  // Раскрыть гостевую книгу — показать все сообщения (остальные "вываливаются" вниз)
  function expandGuestbookMessages() {
    gbShowAllMessages = true;
    gbRevealPending = true;
    renderGuestbook(gbLastFullList);
  }

  // Отрисовать список сообщений гостевой книги
  function renderGuestbook(messagesToRender) {
    gbLastFullList = messagesToRender;
    gbMessagesContainer.innerHTML = '';
    const isUserAdmin = isAdmin();

    const hasMore = messagesToRender.length > GB_INITIAL_LIMIT;
    const displayList = gbShowAllMessages ? messagesToRender : messagesToRender.slice(0, GB_INITIAL_LIMIT);

    displayList.forEach((msg, index) => {
      const msgDiv = document.createElement('div');
      const isPinned = isMsgPinned(msg);
      let msgClass = isPinned ? 'gb-msg pinned-msg' : 'gb-msg';
      // Сообщения, появившиеся по кнопке "Показать ещё", плавно "вываливаются" вниз
      if (gbRevealPending && index >= GB_INITIAL_LIMIT) msgClass += ' gb-msg-reveal';
      msgDiv.className = msgClass;

      let reactionsHTML = '';
      if (msg.reactions) {
        for (const [emoji, count] of Object.entries(msg.reactions)) {
          const voteKey = `voted_${msg.id}_${emoji}`;
          const isMyVote = localStorage.getItem(voteKey) === 'true';
          const activeClass = isMyVote ? 'reaction-btn active' : 'reaction-btn';
          reactionsHTML += `<button class="${activeClass}" onclick="handleReaction('${msg.id}', '${emoji}')">${emoji} <span>${count}</span></button>`;
        }
      }

      const timeInfo = formatMessageTime(msg.createdAt, msg.localTime);

      let adminControlsHTML = '';
      if (isUserAdmin) {
        adminControlsHTML = `
          <button class="reaction-btn ${isPinned ? 'active' : ''}" onclick="togglePinMessage('${msg.id}', ${isPinned})" title="${isPinned ? 'Открепить' : 'Закрепить'}"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s7-7.58 7-12A7 7 0 0 0 5 10c0 4.42 7 12 7 12z"></path><circle cx="12" cy="10" r="2.5"></circle></svg></button>
          <button class="reaction-btn" style="color: var(--danger); border-color: var(--danger-bg);" onclick="deleteMessage('${msg.id}')" title="Удалить сообщение"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path></svg></button>
        `;
      } else if (!isPinned && auth.currentUser && msg.userId === auth.currentUser.uid && canSelfPin()) {
        adminControlsHTML = `<button class="reaction-btn" onclick="selfPinMessage('${msg.id}')" title="Закрепить на 1 час (привилегия подписки)">Закрепить</button>`;
      }

      const pinnedBadgeHTML = isPinned ? `<span style="background: rgba(59, 130, 246, 0.2); color: var(--accent); font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 700; margin-left: 6px;">Закреплено</span>` : '';

      let avatarHTML = '';
      if (msg.avatarUrl) {
        avatarHTML = `<img src="${escapeHtml(msg.avatarUrl)}" alt="Avatar">`;
      } else {
        avatarHTML = (msg.author || 'A')[0].toUpperCase();
      }

      const safeAuthor = escapeHtml(msg.author || 'Пользователь');
      const safeUserId = escapeHtml(msg.userId || '');
      const safeAvatarUrl = escapeHtml(msg.avatarUrl || '');

      msgDiv.innerHTML = `
        <div class="gb-avatar ${premiumUsersMap[msg.userId] && premiumUsersMap[msg.userId].subTier === 'premium' ? 'avatar-frame-premium' : ''}" onclick="openUserProfile('${safeUserId}', '${safeAuthor}', '${safeAvatarUrl}')" title="Посмотреть профиль">${avatarHTML}</div>
        <div class="gb-content">
          <div class="gb-user-row">
            <span class="gb-author" ${getUserNameStyle(msg.userId)} onclick="openUserProfile('${safeUserId}', '${safeAuthor}', '${safeAvatarUrl}')" title="Посмотреть профиль">${safeAuthor}</span>${getUserBadgeHTML(msg.userId)}
            <span class="gb-time" title="${timeInfo.tooltip}">${timeInfo.display}</span>
            ${pinnedBadgeHTML}
          </div>
          <div class="gb-text">${escapeHtml(msg.text)}</div>
          <div class="gb-reactions">
            ${reactionsHTML}
            <div class="emoji-picker-container">
              <button class="reaction-btn" onclick="togglePicker('${msg.id}')" title="Реакции"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg></button>
              <div class="emoji-picker-popup" id="picker-${msg.id}">
                <button class="picker-emoji-opt" onclick="handleReaction('${msg.id}', '👍')">👍</button>
                <button class="picker-emoji-opt" onclick="handleReaction('${msg.id}', '❤')">❤</button>
                <button class="picker-emoji-opt" onclick="handleReaction('${msg.id}', '🔥')">🔥</button>
                <button class="picker-emoji-opt" onclick="handleReaction('${msg.id}', '💀')">💀</button>
                <button class="picker-emoji-opt" onclick="handleReaction('${msg.id}', '🚀')">🚀</button>
                <button class="picker-emoji-opt" onclick="handleReaction('${msg.id}', '⭐')">⭐</button>
                <button class="picker-emoji-opt" onclick="handleReaction('${msg.id}', '💯')">💯</button>
              </div>
            </div>
            <button class="reaction-btn" onclick="reportMessage('${msg.id}')" title="Пожаловаться на спам / оскорбление"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V4"></path><path d="M4 4h14l-2.5 4L18 12H4"></path></svg></button>
            ${adminControlsHTML}
          </div>
        </div>
      `;
      gbMessagesContainer.appendChild(msgDiv);
    });

    const showMoreWrap = document.getElementById('gbShowMoreWrap');
    const showMoreCount = document.getElementById('gbShowMoreCount');
    if (showMoreWrap) {
      if (hasMore && !gbShowAllMessages) {
        showMoreWrap.style.display = 'flex';
        if (showMoreCount) showMoreCount.textContent = `(${messagesToRender.length - GB_INITIAL_LIMIT})`;
      } else {
        showMoreWrap.style.display = 'none';
      }
    }
    gbRevealPending = false;
  }

  // Отрисовать сетку фотографий
  // ===================== 18+ ЦЕНЗУРА: состояние и хелперы =====================
  window.revealedNsfwIds = window.revealedNsfwIds || new Set();
  window.reelAlbumIndexes = window.reelAlbumIndexes || {};
  // Идентификаторы постов, для которых подсказка "Это альбом, можно листать"
  // уже была показана в текущем сеансе просмотра (сбрасывается при закрытии модалки).
  window.albumHintShownIds = window.albumHintShownIds || new Set();
  let albumHintShowTimer = null;
  let albumHintHideTimer = null;

  // Сбросить оба таймера показа/скрытия подсказки об альбоме
  function clearAlbumHintTimers() {
    if (albumHintShowTimer) { clearTimeout(albumHintShowTimer); albumHintShowTimer = null; }
    if (albumHintHideTimer) { clearTimeout(albumHintHideTimer); albumHintHideTimer = null; }
  }

  // Спрятать подсказку об альбоме сразу же, если пользователь сам стал листать —
  // ему это уже не нужно объяснять.
  function dismissAlbumHint(msgId) {
    clearAlbumHintTimers();
    const hintEl = document.getElementById(`albumHint_${msgId}`);
    if (hintEl) hintEl.classList.remove('show');
  }

  // Запланировать одноразовый показ подсказки об альбоме: если пользователь через
  // 1.8с всё ещё смотрит на первое фото — показать подсказку на ~3.2с и убрать.
  function scheduleAlbumHint(msgId) {
    if (window.albumHintShownIds.has(msgId)) return;
    albumHintShowTimer = setTimeout(() => {
      if ((window.reelAlbumIndexes[msgId] || 0) !== 0) return;
      const hintEl = document.getElementById(`albumHint_${msgId}`);
      if (!hintEl) return;
      hintEl.classList.add('show');
      window.albumHintShownIds.add(msgId);
      albumHintHideTimer = setTimeout(() => {
        hintEl.classList.remove('show');
      }, 3200);
    }, 1800);
  }

  // Получить массив изображений поста (альбом или одиночное фото)
  function getPostImages(msg) {
    if (Array.isArray(msg.images) && msg.images.length > 0) return msg.images;
    return msg.image ? [msg.image] : [];
  }

  // Снять цензуру 18+ с конкретного поста по клику пользователя
  function revealNsfwPost(msgId, event) {
    if (event) event.stopPropagation();
    window.revealedNsfwIds.add(msgId);
    const overlay = document.querySelectorAll(`[data-nsfw-overlay="${msgId}"]`);
    overlay.forEach(el => el.remove());
    document.querySelectorAll(`[data-nsfw-media="${msgId}"]`).forEach(el => el.classList.remove('nsfw-blurred'));
  }

  // Сгенерировать HTML цензурной плашки 18+ (compact — для ленты, иначе — для поста)
  function nsfwOverlayHTML(msgId, compact) {
    if (compact) {
      // В ленте контент нельзя раскрыть прямо с плашки — клик только открывает пост,
      // а снять цензуру можно уже внутри поста кнопкой "Нажмите, чтобы открыть материалы".
      return `
        <div class="nsfw-censor-badge" data-nsfw-overlay="${msgId}" title="Не для стрима — откройте пост, чтобы посмотреть">
          <div class="nsfw-censor-badge-icon">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
          </div>
        </div>`;
    }
    return `
      <div class="nsfw-censor-overlay" data-nsfw-overlay="${msgId}" onclick="revealNsfwPost('${msgId}', event)">
        <div class="nsfw-censor-box">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
          <div class="nsfw-censor-title">Не для стрима</div>
          <div class="nsfw-censor-hint">Нажмите, чтобы открыть материалы</div>
        </div>
      </div>`;
  }

  // Переключить фото/видео в альбоме внутри развёрнутого просмотра поста
  function changeAlbumSlide(msgId, dir, event) {
    if (event) event.stopPropagation();
    const msg = reelsAllPosts.find(m => m.id === msgId) || currentMessagesList.find(m => m.id === msgId);
    if (!msg) return;
    const imgs = getPostImages(msg);
    if (imgs.length <= 1) return;
    let idx = window.reelAlbumIndexes[msgId] || 0;
    idx = (idx + dir + imgs.length) % imgs.length;
    window.reelAlbumIndexes[msgId] = idx;
    renderAlbumFrame(msgId, imgs, idx);
    dismissAlbumHint(msgId);
  }

  // Переключиться на конкретный слайд альбома по клику на точку-индикатор
  function goToAlbumSlide(msgId, idx, event) {
    if (event) event.stopPropagation();
    window.reelAlbumIndexes[msgId] = idx;
    const msg = reelsAllPosts.find(m => m.id === msgId) || currentMessagesList.find(m => m.id === msgId);
    if (!msg) return;
    renderAlbumFrame(msgId, getPostImages(msg), idx);
    dismissAlbumHint(msgId);
  }

  // Отрисовать текущий слайд альбома внутри поста (фото или видео)
  function renderAlbumFrame(msgId, imgs, idx) {
    const frame = document.getElementById(`albumFrame_${msgId}`);
    if (!frame) return;
    const src = imgs[idx];
    const isVideo = src.startsWith('data:video/') || src.includes('.mp4') || src.includes('.webm');
    frame.innerHTML = isVideo
      ? `<video controls src="${src}"></video>`
      : `<img src="${src}" alt="Media" onclick="openAlbumLightbox('${msgId}', event)" />`;
    frame.parentElement.querySelectorAll('.album-dot').forEach((dot, i) => dot.classList.toggle('active', i === idx));
    // Если открыт полноэкранный лайтбокс этого же поста — держим его в синхроне со слайдом.
    if (window.lightboxState && window.lightboxState.msgId === msgId) {
      window.lightboxState.idx = idx;
      renderLightboxSlide();
    }
  }

  // ===================== ПОЛНОЭКРАННЫЙ ЛАЙТБОКС ФОТО/АЛЬБОМА =====================
  window.lightboxState = null;

  // Открыть полноэкранный просмотр картинки/альбома по клику на фото в посте
  window.openAlbumLightbox = function(msgId, event) {
    if (event) event.stopPropagation();
    const msg = reelsAllPosts.find(m => m.id === msgId) || currentMessagesList.find(m => m.id === msgId);
    if (!msg) return;
    const images = getPostImages(msg);
    if (!images.length) return;
    const startIdx = window.reelAlbumIndexes[msgId] || 0;
    window.lightboxState = { msgId, images, idx: startIdx };
    renderLightboxSlide();
    document.getElementById('albumLightbox').classList.add('show');
    document.body.style.overflow = 'hidden';
  };

  // Отрисовать текущий слайд в полноэкранном лайтбоксе
  function renderLightboxSlide() {
    const state = window.lightboxState;
    if (!state) return;
    const mediaEl = document.getElementById('albumLightboxMedia');
    const counterEl = document.getElementById('albumLightboxCounter');
    const prevBtn = document.getElementById('albumLightboxPrev');
    const nextBtn = document.getElementById('albumLightboxNext');
    const src = state.images[state.idx];
    const isVideo = src.startsWith('data:video/') || src.includes('.mp4') || src.includes('.webm');
    mediaEl.innerHTML = isVideo
      ? `<video controls autoplay src="${src}"></video>`
      : `<img src="${src}" alt="Media" />`;
    const isAlbum = state.images.length > 1;
    counterEl.classList.toggle('hidden', !isAlbum);
    prevBtn.classList.toggle('hidden', !isAlbum);
    nextBtn.classList.toggle('hidden', !isAlbum);
    if (isAlbum) counterEl.textContent = `${state.idx + 1}/${state.images.length}`;
  }

  // Пролистать альбом внутри лайтбокса (стрелки заметно дальше от картинки, чем в посте)
  window.lightboxGoSlide = function(dir, event) {
    if (event) event.stopPropagation();
    const state = window.lightboxState;
    if (!state || state.images.length <= 1) return;
    state.idx = (state.idx + dir + state.images.length) % state.images.length;
    renderLightboxSlide();
    // Синхронизируем со слайдом внутри поста, чтобы при закрытии лайтбокса
    // на посте осталось то же фото.
    window.reelAlbumIndexes[state.msgId] = state.idx;
    const frame = document.getElementById(`albumFrame_${state.msgId}`);
    if (frame) {
      const src = state.images[state.idx];
      const isVideo = src.startsWith('data:video/') || src.includes('.mp4') || src.includes('.webm');
      frame.innerHTML = isVideo
        ? `<video controls src="${src}"></video>`
        : `<img src="${src}" alt="Media" onclick="openAlbumLightbox('${state.msgId}', event)" />`;
      frame.parentElement.querySelectorAll('.album-dot').forEach((dot, i) => dot.classList.toggle('active', i === state.idx));
    }
  };

  window.closeAlbumLightbox = function() {
    document.getElementById('albumLightbox').classList.remove('show');
    document.getElementById('albumLightboxMedia').innerHTML = '';
    document.body.style.overflow = '';
    window.lightboxState = null;
  };

  // Отрисовать сетку фотографий на странице "Фото"
  function renderPhotosGrid() {
    const grid = document.getElementById('photosGrid');
    if (!grid) return;
    grid.innerHTML = '';
    const isUserAdmin = isAdmin();

    let feedList = currentMessagesList.filter(m => {
      if (!m.image) return false;
      if (m.accessMode === 'link') return false;
      if (m.isExternalLink) return true;

      const img = m.image.toLowerCase();
      const isImage = img.startsWith('data:image/') || img.includes('image') || img.endsWith('.jpg') || img.endsWith('.png') || img.endsWith('.jpeg') || img.endsWith('.webp') || img.endsWith('.gif');
      const isVideo = img.startsWith('data:video/') || img.includes('video') || img.includes('.mp4') || img.includes('.webm') || img.includes('.mov');
      const isAudio = img.startsWith('data:audio/') || img.includes('audio') || img.includes('.mp3') || img.includes('.wav') || img.includes('.ogg');

      return isImage || isVideo || isAudio;
    });

    if (currentFeedType === 'image') {
      feedList = feedList.filter(m => {
        if (m.isExternalLink) return true;
        const img = m.image.toLowerCase();
        return img.startsWith('data:image/') || img.includes('image') || img.endsWith('.jpg') || img.endsWith('.png') || img.endsWith('.jpeg') || img.endsWith('.webp') || img.endsWith('.gif');
      });
    } else if (currentFeedType === 'video') {
      feedList = feedList.filter(m => {
        if (m.isExternalLink) return true;
        const img = m.image.toLowerCase();
        return img.startsWith('data:video/') || img.includes('video') || img.includes('.mp4') || img.includes('.webm') || img.includes('.mov');
      });
    } else if (currentFeedType === 'audio') {
      feedList = feedList.filter(m => {
        if (m.isExternalLink) return true;
        const img = m.image.toLowerCase();
        return img.startsWith('data:audio/') || img.includes('audio') || img.includes('.mp3') || img.includes('.wav') || img.includes('.ogg');
      });
    }

    const now = Date.now();
    feedList = feedList.filter(m => {
      const msgTime = m.createdAt?.toMillis() || m.localTime || now;
      const diffDays = (now - msgTime) / (1000 * 60 * 60 * 24);
      if (currentFeedTime === 'today') return diffDays <= 1;
      if (currentFeedTime === 'week') return diffDays <= 7;
      if (currentFeedTime === 'month') return diffDays <= 30;
      if (currentFeedTime === 'year') return diffDays <= 365;
      return true;
    });

    feedList.sort((a, b) => {
      const timeA = a.createdAt?.toMillis() || a.localTime || 0;
      const timeB = b.createdAt?.toMillis() || b.localTime || 0;
      const popA = getPostScore(a);
      const popB = getPostScore(b);

      if (currentFeedSort === 'best' || currentFeedSort === 'likes') return popB - popA;
      if (currentFeedSort === 'newest') return timeB - timeA;
      if (currentFeedSort === 'comments') return (b.text.length || 0) - (a.text.length || 0);
      return timeB - timeA;
    });

    // «Не интересно»: скрываем авторов, которых пользователь скрыл на выбранный срок
    feedList = feedList.filter(m => !isAuthorHidden(m));

    if (feedList.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--muted); font-size: 14px;">В ленте по заданным фильтрам ничего нет. В ленте публикуются сугубо видео, фото и аудио файлы!</div>`;
      return;
    }

    feedList.forEach(p => {
      const card = document.createElement('div');
      card.className = 'photo-card';
      card.onclick = () => openViewPostModal(p.id);

      const timeInfo = formatMessageTime(p.createdAt, p.localTime);
      const parsed = parsePostContent(p);

      let adminDeletePhotoBtn = '';
      if (isUserAdmin) {
        adminDeletePhotoBtn = `
          <button onclick="event.stopPropagation(); deleteMessage('${p.id}')" title="Удалить пост" style="position: absolute; top: 10px; left: 10px; background: rgba(239, 68, 68, 0.9); border: none; color: #fff; padding: 5px 9px; border-radius: 6px; font-size: 11px; font-weight: 700; z-index: 20; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">Удалить</button>
        `;
      }

      const imgLower = p.image.toLowerCase();
      const isVideoPost = imgLower.startsWith('data:video/') || imgLower.includes('.mp4') || imgLower.includes('.webm');
      const isAudioPost = imgLower.startsWith('data:audio/') || imgLower.includes('.mp3') || imgLower.includes('.wav');

      const isNsfwHidden = !!p.isNSFW && !window.revealedNsfwIds.has(p.id);
      const albumImgs = getPostImages(p);
      const albumBadge = albumImgs.length > 1
        ? `<div class="photo-album-count-badge"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="14" height="14" rx="2"></rect><path d="M7 21h10a2 2 0 0 0 2-2V7"></path></svg>${albumImgs.length}</div>`
        : '';
      const nsfwPill = p.isNSFW ? `<div class="nsfw-tag-pill">Не для стрима</div>` : '';
      const nsfwOverlay = isNsfwHidden ? nsfwOverlayHTML(p.id, true) : '';
      const blurClass = isNsfwHidden ? ' nsfw-blurred' : '';

      let typeBadge = '';
      let previewContent = '';
      if (p.isExternalLink) {
        previewContent = `<div class="photo-img-container" style="display: flex; align-items: center; justify-content: center; background: rgba(59,130,246,0.1); color: var(--accent);"><svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11 4.93"></path><path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07L13 19.07"></path></svg>${nsfwOverlay}</div>`;
      } else if (isVideoPost) {
        previewContent = `<div class="photo-media-wrap"><div class="photo-media-inner${blurClass}" data-nsfw-media="${p.id}"><video src="${p.image}" muted preload="metadata"></video></div>${nsfwOverlay}</div>`;
        typeBadge = `<div class="photo-type-badge"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg></div>`;
      } else if (isAudioPost) {
        previewContent = `<div class="photo-img-container" style="display: flex; align-items: center; justify-content: center; background: rgba(59,130,246,0.1); color: var(--accent);"><svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg></div>`;
      } else {
        previewContent = `<div class="photo-media-wrap"><div class="photo-media-inner${blurClass}" data-nsfw-media="${p.id}"><img src="${p.image}" loading="lazy" alt=""></div>${nsfwOverlay}</div>`;
      }

      const { votesUp, votesDown } = getPostVoteCounts(p);
      const score = votesUp - votesDown;
      const scoreClass = score > 0 ? 'stat-rating-up' : (score < 0 ? 'stat-rating-down' : '');
      const viewsCount = p.views || 0;

      let avatarInner = p.avatarUrl
        ? `<img src="${escapeHtml(p.avatarUrl)}" alt="">`
        : (p.author || 'A')[0].toUpperCase();

      card.innerHTML = `
        ${adminDeletePhotoBtn}
        ${nsfwPill}
        ${albumBadge}
        ${typeBadge}
        ${previewContent}
        <div class="photo-info">
          <div class="photo-author-row">
            <div class="photo-author-avatar">${avatarInner}</div>
            <span class="photo-author-name">@${escapeHtml(p.author)}</span>
            <span class="photo-author-dot">·</span>
            <span class="photo-author-time">${timeInfo.display}</span>
            <button type="button" class="photo-menu-btn" title="Ещё" aria-label="Ещё" onclick="openPostMenu(event, '${p.id}')"><svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="12" cy="19" r="1.9"/></svg></button>
          </div>
          <div class="photo-title">${escapeHtml(parsed.title)}</div>
          ${parsed.desc ? `<div class="photo-desc">${escapeHtml(parsed.desc)}</div>` : ''}
          <div class="photo-stats-row">
            <span class="photo-stat"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>${viewsCount}</span>
            <span class="photo-stat ${scoreClass}"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"></path></svg>${score}</span>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  // =====================================================================
  //  Меню «⋮» на карточке поста: Сохранить / Скопировать ссылку /
  //  Не интересно (скрыть автора на срок) / Пожаловаться
  // =====================================================================
  const HIDDEN_AUTHORS_KEY = 'discoragen_hidden_authors';
  const SAVED_POSTS_KEY = 'discoragen_saved_posts';

  function authorKeyOf(p) { return p.userId ? String(p.userId) : 'n:' + (p.author || ''); }

  function loadHiddenAuthors() {
    try {
      const o = JSON.parse(localStorage.getItem(HIDDEN_AUTHORS_KEY) || '{}');
      return (o && typeof o === 'object' && !Array.isArray(o)) ? o : {};
    } catch (e) { return {}; }
  }
  function saveHiddenAuthors(o) {
    try { localStorage.setItem(HIDDEN_AUTHORS_KEY, JSON.stringify(o)); } catch (e) {}
  }
  // until === 0 — навсегда; иначе метка времени, когда автор снова появится
  function isAuthorHidden(p) {
    const all = loadHiddenAuthors();
    const key = authorKeyOf(p);
    const e = all[key];
    if (!e) return false;
    if (e.until === 0 || e.until > Date.now()) return true;
    delete all[key];
    saveHiddenAuthors(all);
    return false;
  }
  window.unhideAllAuthors = function () {
    saveHiddenAuthors({});
    renderPhotosGrid();
    showToast('Скрытые авторы снова в ленте');
  };

  function loadSavedPosts() {
    try {
      const a = JSON.parse(localStorage.getItem(SAVED_POSTS_KEY) || '[]');
      return Array.isArray(a) ? a : [];
    } catch (e) { return []; }
  }
  function toggleSavedPost(id) {
    const list = loadSavedPosts();
    const i = list.indexOf(id);
    if (i === -1) list.push(id); else list.splice(i, 1);
    try { localStorage.setItem(SAVED_POSTS_KEY, JSON.stringify(list)); } catch (e) {}
    showToast(i === -1 ? 'Пост сохранён' : 'Пост убран из сохранённых');
  }

  function closePostMenu() {
    const m = document.getElementById('postMenu');
    if (m) m.remove();
    document.querySelectorAll('.photo-menu-btn.active').forEach(b => b.classList.remove('active'));
  }

  window.openPostMenu = function (ev, postId) {
    ev.stopPropagation();
    ev.preventDefault();
    const btn = ev.currentTarget;
    const wasOpenForThis = btn.classList.contains('active');
    closePostMenu();
    if (wasOpenForThis) return;

    // закрываем остальные выпадашки шапки/ленты, чтобы не наслаиваться
    document.querySelectorAll('.custom-dropdown-menu').forEach(m => m.classList.remove('show'));
    const sd = document.getElementById('smartSearchDropdown');
    if (sd) sd.style.display = 'none';

    const post = currentMessagesList.find(m => m.id === postId);
    if (!post) return;
    const saved = loadSavedPosts().includes(postId);

    const menu = document.createElement('div');
    menu.id = 'postMenu';
    menu.className = 'post-menu';
    menu.onclick = e => e.stopPropagation();
    menu.innerHTML = `
      <button type="button" class="post-menu-item" data-act="save">
        <svg viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"${saved ? ' fill="currentColor"' : ''}/></svg>
        <span>${saved ? 'Убрать из сохранённых' : 'Сохранить'}</span>
      </button>
      <button type="button" class="post-menu-item" data-act="copy">
        <svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11 4.93"/><path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07L13 19.07"/></svg>
        <span>Скопировать ссылку</span>
      </button>
      <div class="post-menu-sep"></div>
      <button type="button" class="post-menu-item" data-act="hide">
        <svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
        <span>Не интересно<small>Скрыть автора из ленты — выбрать срок</small></span>
      </button>
      <button type="button" class="post-menu-item danger" data-act="report">
        <svg viewBox="0 0 24 24"><path d="M4 21V4"/><path d="M4 4h14l-2.5 4L18 12H4"/></svg>
        <span>Пожаловаться</span>
      </button>`;
    document.body.appendChild(menu);
    btn.classList.add('active');

    // позиция: под кнопкой, прижато к её правому краю, в пределах экрана
    const r = btn.getBoundingClientRect();
    const mw = menu.offsetWidth, mh = menu.offsetHeight;
    let left = Math.min(Math.max(8, r.right - mw), window.innerWidth - mw - 8);
    let top = r.bottom + 6;
    if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 6);
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';

    menu.querySelectorAll('.post-menu-item').forEach(item => {
      item.onclick = () => {
        const act = item.getAttribute('data-act');
        closePostMenu();
        if (act === 'save') toggleSavedPost(postId);
        else if (act === 'copy') copyPostLink(postId);
        else if (act === 'hide') openNotInterestedModal(postId);
        else if (act === 'report') reportMessage(postId);
      };
    });
  };

  document.addEventListener('click', closePostMenu);
  window.addEventListener('resize', closePostMenu);
  window.addEventListener('scroll', closePostMenu, true);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closePostMenu(); closeNotInterestedModal(); }
  });

  // ---------- Окно «Не интересно» ----------
  const NI_DURATIONS = [
    { days: 1,  label: '1 день' },
    { days: 7,  label: '7 дней' },
    { days: 14, label: '14 дней' },
    { days: 30, label: '30 дней' },
    { days: 0,  label: 'Навсегда' }
  ];

  function closeNotInterestedModal() {
    const o = document.getElementById('niOverlay');
    if (o) o.remove();
  }

  window.openNotInterestedModal = function (postId) {
    const post = currentMessagesList.find(m => m.id === postId);
    if (!post) return;
    closeNotInterestedModal();

    const name = post.author || 'автора';
    let chosen = 30;

    const overlay = document.createElement('div');
    overlay.id = 'niOverlay';
    overlay.className = 'ni-overlay';
    overlay.innerHTML = `
      <div class="ni-box" role="dialog" aria-modal="true" aria-label="Не интересно">
        <div class="ni-head">
          <div class="ni-title">Не интересно</div>
          <button type="button" class="ni-close" aria-label="Закрыть">✕</button>
        </div>
        <div class="ni-body">
          <div class="ni-note"><b>Посты ${escapeHtml(name)} пропадут из вашей ленты.</b> Профиль, поиск и прямые ссылки останутся доступными. Автор об этом не узнает.</div>
          <div class="ni-label">На какой срок скрыть</div>
          <div class="ni-options">
            ${NI_DURATIONS.map(d => `
              <label class="ni-opt${d.days === chosen ? ' selected' : ''}" data-days="${d.days}">
                <input type="radio" name="niDuration" value="${d.days}"${d.days === chosen ? ' checked' : ''}>
                <span class="ni-radio"></span>
                <span>${d.label}</span>
              </label>`).join('')}
          </div>
          <button type="button" class="ni-submit">Скрыть</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', e => { if (e.target === overlay) closeNotInterestedModal(); });
    overlay.querySelector('.ni-close').onclick = closeNotInterestedModal;
    overlay.querySelectorAll('.ni-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        chosen = Number(opt.getAttribute('data-days'));
        overlay.querySelectorAll('.ni-opt').forEach(o => o.classList.toggle('selected', o === opt));
      });
    });
    overlay.querySelector('.ni-submit').onclick = () => {
      const all = pruneHiddenAuthors();
      if (!all[authorKeyOf(post)] && Object.keys(all).length >= HIDDEN_AUTHORS_LIMIT) {
        showToast('Можно скрыть не больше ' + HIDDEN_AUTHORS_LIMIT + ' авторов. Освободите место в Настройках', 'error');
        return;
      }
      all[authorKeyOf(post)] = {
        name: post.author || '',
        until: chosen === 0 ? 0 : Date.now() + chosen * 86400000
      };
      saveHiddenAuthors(all);
      closeNotInterestedModal();
      const lbl = (NI_DURATIONS.find(d => d.days === chosen) || {}).label || '';
      showToast(chosen === 0
        ? `Посты ${name} скрыты из ленты навсегда`
        : `Посты ${name} скрыты из ленты: ${lbl}`);
      renderPhotosGrid();
    };
  };

  // ---------- Окно со ссылкой после публикации «только по ссылке» ----------
  window.openPostLinkModal = function (postId) {
    const old = document.getElementById('plOverlay');
    if (old) old.remove();
    const link = getPostLink(postId);
    const overlay = document.createElement('div');
    overlay.id = 'plOverlay';
    overlay.className = 'ni-overlay';
    overlay.innerHTML = `
      <div class="ni-box" role="dialog" aria-modal="true" aria-label="Пост опубликован">
        <div class="ni-head">
          <div class="ni-title">Пост опубликован</div>
          <button type="button" class="ni-close" aria-label="Закрыть">✕</button>
        </div>
        <div class="ni-body">
          <div class="ni-note"><b>Этот пост не виден в ленте.</b> Открыть его можно только по ссылке — отправьте её тем, кому хотите показать. Свою ссылку потом можно скопировать в профиле, в списке ваших постов.</div>
          <div class="ni-label">Ссылка на пост</div>
          <input type="text" class="pl-input" readonly value="${escapeHtml(link)}">
          <button type="button" class="ni-submit pl-copy">Скопировать ссылку</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    overlay.querySelector('.ni-close').onclick = close;
    const input = overlay.querySelector('.pl-input');
    input.addEventListener('focus', () => input.select());
    overlay.querySelector('.pl-copy').onclick = () => {
      copyTextToClipboard(link).then(() => showToast('Ссылка на пост скопирована в буфер обмена!'))
        .catch(() => { input.focus(); input.select(); showToast('Выделите ссылку и скопируйте вручную', 'error'); });
    };
  };

  // ---------- Настройки: скрытые авторы ----------
  const HIDDEN_AUTHORS_LIMIT = 500;

  function pruneHiddenAuthors() {
    const all = loadHiddenAuthors();
    let changed = false;
    Object.keys(all).forEach(k => {
      const e = all[k];
      if (!e || (e.until !== 0 && !(e.until > Date.now()))) { delete all[k]; changed = true; }
    });
    if (changed) saveHiddenAuthors(all);
    return all;
  }

  function hiddenUntilLabel(e) {
    if (e.until === 0) return 'навсегда';
    const d = new Date(e.until);
    const left = Math.max(1, Math.ceil((e.until - Date.now()) / 86400000));
    return 'до ' + d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) + ' · осталось ' + left + ' дн.';
  }

  function renderHiddenAuthorsPane() {
    const pane = document.getElementById('stPaneHidden');
    if (!pane) return;
    const all = pruneHiddenAuthors();
    const keys = Object.keys(all);
    const list = keys.length === 0
      ? `<div class="st-empty"><b>Вы никого не скрывали</b><span>Нажмите «⋮» → «Не интересно» на посте в ленте.</span></div>`
      : `<div class="st-list">${keys.map(k => {
          const e = all[k];
          const nm = e.name || 'автор';
          return `<div class="st-row">
            <div class="st-avatar">${escapeHtml(nm[0] || '?').toUpperCase()}</div>
            <div class="st-row-info"><div class="st-row-name">@${escapeHtml(nm)}</div><div class="st-row-sub">${escapeHtml(hiddenUntilLabel(e))}</div></div>
            <button type="button" class="st-unhide" data-key="${escapeHtml(k)}">Вернуть</button>
          </div>`;
        }).join('')}</div>`;
    pane.innerHTML = `
      <div class="st-pane-title">Скрытые авторы <span class="st-count">${keys.length} из ${HIDDEN_AUTHORS_LIMIT}</span></div>
      <div class="st-pane-desc">Их посты не показываются в ленте. Статус снимается сам, когда истечёт выбранный срок; «навсегда» — только вручную. Авторы об этом не узнают.</div>
      ${list}`;
    pane.querySelectorAll('.st-unhide').forEach(btn => {
      btn.onclick = () => {
        const store = loadHiddenAuthors();
        delete store[btn.getAttribute('data-key')];
        saveHiddenAuthors(store);
        renderHiddenAuthorsPane();
        renderPhotosGrid();
        showToast('Автор снова в ленте');
      };
    });
  }

  document.addEventListener('keydown', e => { if (e.key === 'Escape' && settingsModal.classList.contains('show')) closeSettingsModal(); });

  // Экранировать спецсимволы HTML, чтобы избежать XSS
  // ИСПРАВЛЕНО (безопасность): раньше escapeHtml не экранировал кавычки ' и " —
  // это позволяло вырваться из onclick="...('${...}')" через ник/текст и выполнить
  // произвольный JS (stored XSS). Теперь экранируются все опасные для HTML/атрибутов символы.
  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  window.togglePicker = function(id) {
    document.querySelectorAll('.emoji-picker-popup').forEach(p => {
      if (p.id !== `picker-${id}`) p.classList.remove('show');
    });
    const picker = document.getElementById(`picker-${id}`);
    if (picker) picker.classList.toggle('show');
  };

  window.handleReaction = function(id, emoji) {
    const voteKey = `voted_${id}_${emoji}`;
    const hasVoted = localStorage.getItem(voteKey) === 'true';

    let totalUserVotesOnMsg = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`voted_${id}_`) && localStorage.getItem(key) === 'true') {
        totalUserVotesOnMsg++;
      }
    }

    const msgRef = db.collection('messages').doc(id);

    db.runTransaction(async (transaction) => {
      const doc = await transaction.get(msgRef);
      if (!doc.exists) return;
      let reactions = doc.data().reactions || {};

      if (hasVoted) {
        reactions[emoji] = (reactions[emoji] || 1) - 1;
        if (reactions[emoji] <= 0) delete reactions[emoji];
        transaction.update(msgRef, { reactions });
        localStorage.removeItem(voteKey);
      } else {
        if (totalUserVotesOnMsg >= maxReactionsForMe()) throw new Error('LIMIT_REACHED');
        reactions[emoji] = (reactions[emoji] || 0) + 1;
        transaction.update(msgRef, { reactions });
        localStorage.setItem(voteKey, 'true');
      }
    }).then(() => {
      const likeCountEl = document.getElementById(`reel_like_count_${id}`);
      if (likeCountEl) {
        db.collection('messages').doc(id).get().then(doc => {
          if (doc.exists) {
            const r = doc.data().reactions || {};
            likeCountEl.textContent = r['👍'] || r['❤'] || 0;
          }
        });
      }
      // Если сейчас открыт просмотр поста (reel), обновляем эмодзи-реакции на нём
      const reelCardEl = document.getElementById(`reel_card_${id}`);
      if (reelCardEl && typeof reelsAllPosts !== 'undefined') {
        db.collection('messages').doc(id).get().then(doc => {
          if (doc.exists) {
            const idx = reelsAllPosts.findIndex(m => m.id === id);
            if (idx !== -1) {
              reelsAllPosts[idx] = { id: doc.id, ...doc.data() };
              if (idx === reelsCurrentIndex) renderReelCard(idx);
            }
          }
        });
      }
      // Уведомление автору поста о новой реакции (лайке), только при добавлении, не при снятии
      if (!hasVoted && (emoji === '👍' || emoji === '❤')) {
        const currentUser = auth.currentUser;
        const myName = currentUserProfile ? currentUserProfile.username : 'Гость';
        db.collection('messages').doc(id).get().then(doc => {
          if (!doc.exists) return;
          const authorId = doc.data().userId;
          if (authorId && (!currentUser || authorId !== currentUser.uid)) {
            sendPersonalNotification(authorId, 'like', 'Новая реакция', `${myName} оценил(а) ваш пост`);
          }
        }).catch(() => {});
      }
    }).catch(err => {
      console.error(err);
      if (err.message === 'LIMIT_REACHED') {
        showToast(`Вы можете поставить максимум ${maxReactionsForMe()} реакции на один пост!`, 'error');
      } else {
        showToast('Ошибка реакции', 'error');
      }
    });
  }

  // Максимально доступное число реакций для текущего пользователя (зависит от подписки)
  function maxReactionsForMe() {
    if (!currentUserProfile || !currentUserProfile.subTier || !currentUserProfile.subExpiresAt || currentUserProfile.subExpiresAt <= Date.now()) return 3;
    return currentUserProfile.subTier === 'premium' ? 8 : 5;
  }

  // ===================== КОРОБКА СЕКРЕТОВ / АНОНИМНЫЕ ПРИЗНАНИЯ =====================
  let currentSecretsList = [];

  // Слушаем коллекцию secrets в primaryDb (чтобы работало независимо от активного TG-аккаунта)
  primaryDb.collection('secrets').onSnapshot((snapshot) => {
    currentSecretsList = [];
    snapshot.forEach(doc => {
      currentSecretsList.push({ id: doc.id, ...doc.data() });
    });
    renderSecrets();
  }, (err) => {
    console.error('secrets snapshot error:', err);
  });

  const secretInputEl = document.getElementById('secretInput');
  if (secretInputEl) {
    secretInputEl.addEventListener('input', () => {
      const counter = document.getElementById('secretCharCounter');
      if (counter) counter.textContent = `${secretInputEl.value.length} / 500`;
    });
  }

  window.submitSecret = function() {
    const text = (document.getElementById('secretInput').value || '').trim();
    if (!text) {
      showToast('Напишите текст признания', 'error');
      return;
    }
    if (text.length < 10) {
      showToast('Слишком коротко — минимум 10 символов', 'error');
      return;
    }

    // Кулдаун зависит от тарифа: free — 2 мин, lite — 1 мин, premium — без ожидания
    const mySub = (currentUserProfile && currentUserProfile.subTier && currentUserProfile.subExpiresAt && currentUserProfile.subExpiresAt > Date.now()) ? currentUserProfile.subTier : 'free';
    const cooldownMs = mySub === 'premium' ? 0 : (mySub === 'lite' ? 60 * 1000 : 2 * 60 * 1000);

    const lastSent = Number(localStorage.getItem('last_secret_sent') || 0);
    if (cooldownMs > 0 && Date.now() - lastSent < cooldownMs) {
      showToast(`⏳ Подождите ещё немного перед следующим сообщением`, 'error');
      return;
    }

    const btn = document.getElementById('secretSendBtn');
    if (btn) btn.disabled = true;
    showActionLoader('Отправка в коробку...');

    primaryDb.collection('secrets').add({
      text: text,
      status: 'pending', // pending | approved | rejected
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      localTime: Date.now(),
      // Не сохраняем userId / author — полная анонимность. Тег тарифа — только для приоритета модерации.
      authorTier: mySub === 'free' ? null : mySub,
      moderatedAt: null
    }).then(() => {
      hideActionLoader();
      localStorage.setItem('last_secret_sent', String(Date.now()));
      document.getElementById('secretInput').value = '';
      const counter = document.getElementById('secretCharCounter');
      if (counter) counter.textContent = '0 / 500';
      if (btn) btn.disabled = false;
      showToast('Сообщение отправлено на модерацию. Оно появится после проверки.');
    }).catch(err => {
      hideActionLoader();
      console.error(err);
      if (btn) btn.disabled = false;
      showToast('Ошибка отправки. Попробуйте позже.', 'error');
    });
  };

  window.approveSecret = function(id) {
    if (!isAdmin()) {
      showToast('Недостаточно прав', 'error');
      return;
    }
    primaryDb.collection('secrets').doc(id).update({
      status: 'approved',
      moderatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      showToast('Секрет опубликован');
    }).catch(err => {
      console.error(err);
      showToast('Ошибка', 'error');
    });
  };

  window.rejectSecret = function(id) {
    if (!isAdmin()) {
      showToast('Недостаточно прав', 'error');
      return;
    }
    if (!confirm('Отклонить и удалить это сообщение?')) return;
    primaryDb.collection('secrets').doc(id).delete().then(() => {
      showToast('Сообщение отклонено и удалено');
    }).catch(err => {
      console.error(err);
      showToast('Ошибка', 'error');
    });
  };

  window.deleteSecret = function(id) {
    if (!isAdmin()) {
      showToast('Недостаточно прав', 'error');
      return;
    }
    if (!confirm('Удалить опубликованный секрет?')) return;
    primaryDb.collection('secrets').doc(id).delete().then(() => {
      showToast('Удалено');
    }).catch(err => {
      console.error(err);
      showToast('Ошибка', 'error');
    });
  };

  // Отрисовать список анонимных признаний
  function renderSecrets() {
    const listEl = document.getElementById('secretsList');
    const pendingEl = document.getElementById('secretsPendingList');
    const adminSection = document.getElementById('secretsAdminSection');
    if (!listEl) return;

    const admin = isAdmin();
    if (adminSection) {
      adminSection.style.display = admin ? 'block' : 'none';
    }

    const sortVal = (document.getElementById('secretsSortSelect') || {}).value || 'newest';

    // --- Pending for admins ---
    if (admin && pendingEl) {
      const pending = currentSecretsList.filter(s => s.status === 'pending');
      // Приоритет: сначала premium, потом lite, потом остальные — внутри группы по свежести
      const tierRank = t => t === 'premium' ? 0 : (t === 'lite' ? 1 : 2);
      pending.sort((a, b) => {
        const r = tierRank(a.authorTier) - tierRank(b.authorTier);
        return r !== 0 ? r : (b.localTime || 0) - (a.localTime || 0);
      });
      if (pending.length === 0) {
        pendingEl.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 16px;">Нет сообщений на модерации 👍</div>';
      } else {
        pendingEl.innerHTML = '';
        pending.forEach(s => {
          const timeInfo = formatMessageTime(s.createdAt, s.localTime);
          const isPriority = s.authorTier === 'premium' || s.authorTier === 'lite';
          const priorityTag = s.authorTier === 'premium' ? 'Premium' : (s.authorTier === 'lite' ? '✓ Lite' : '');
          const div = document.createElement('div');
          div.style.cssText = isPriority
            ? 'background: rgba(250,204,21,0.08); border: 2px solid rgba(250,204,21,0.5); border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 10px;'
            : 'background: rgba(245,158,11,0.06); border: 1px solid rgba(245,158,11,0.3); border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 10px;';
          div.innerHTML = `
            <div style="font-size: 11px; color: var(--muted); display: flex; justify-content: space-between;"><span>${timeInfo.display}</span>${priorityTag ? `<span style="color:#facc15; font-weight:700;">${priorityTag}</span>` : ''}</div>
            <div style="font-size: 14px; color: var(--text); line-height: 1.45; white-space: pre-wrap; word-break: break-word;">${escapeHtml(s.text)}</div>
            <div style="display: flex; gap: 8px; justify-content: flex-end;">
              <button class="reaction-btn" style="color: var(--danger); border-color: rgba(239,68,68,0.35);" onclick="rejectSecret('${s.id}')">Отклонить</button>
              <button class="reaction-btn" style="color: #16a34a; border-color: rgba(22,163,74,0.35);" onclick="approveSecret('${s.id}')">Опубликовать</button>
            </div>
          `;
          pendingEl.appendChild(div);
        });
      }
    }

    // --- Approved list ---
    let approved = currentSecretsList.filter(s => s.status === 'approved');
    approved.sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() || a.localTime || 0;
      const tb = b.createdAt?.toMillis?.() || b.localTime || 0;
      return sortVal === 'oldest' ? ta - tb : tb - ta;
    });

    if (approved.length === 0) {
      listEl.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 28px;">Пока нет опубликованных секретов. Станьте первым — напишите анонимно выше.</div>';
      return;
    }

    listEl.innerHTML = '';
    approved.forEach(s => {
      const timeInfo = formatMessageTime(s.createdAt, s.localTime);
      const div = document.createElement('div');
      div.className = 'gb-msg';
      div.style.cssText = 'display:flex; gap:12px; padding:14px; background: rgba(150,150,150,0.03); border: 1px solid var(--card-border); border-radius: 10px;';
      const adminDel = admin
        ? `<button class="reaction-btn" style="color: var(--danger); margin-top: 8px;" onclick="deleteSecret('${s.id}')" title="Удалить"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path></svg></button>`
        : '';
      div.innerHTML = `
        <div class="gb-avatar" style="background: linear-gradient(135deg, #6366f1, #a855f7); color:#fff; font-size:16px;"></div>
        <div class="gb-content" style="flex:1;">
          <div class="gb-user-row">
            <span class="gb-author" style="color: var(--muted);">Аноним</span>
            <span class="gb-time" title="${timeInfo.tooltip}">${timeInfo.display}</span>
          </div>
          <div class="gb-text" style="white-space: pre-wrap;">${escapeHtml(s.text)}</div>
          ${adminDel}
        </div>
      `;
      listEl.appendChild(div);
    });
  }
// ============================================================================
// === УВЕДОМЛЕНИЯ (колокольчик в шапке + рассылка от админа из модорки) ===
// ============================================================================
// Как это работает:
//  - Все уведомления лежат в одной коллекции Firestore: primaryDb.collection('notifications').
//    Документ: { title, body, authorName, createdAt, readBy: [uid, uid, ...] }.
//  - Админ (через "Отправить уведомление всем" в админ-панели) добавляет туда документ
//    с заголовком и текстом. Уведомления НЕ удаляются автоматически и НЕ пропадают
//    через 24 часа — они остаются в колокольчике, пока пользователь сам не отметит
//    их прочитанными.
//  - У КАЖДОГО клиента работает live-подписка (onSnapshot) на последние 50 уведомлений,
//    поэтому новые уведомления прилетают сразу же, без перезагрузки страницы.
//  - "Прочитано" для авторизованных хранится прямо в документе (поле readBy, через
//    arrayUnion) — значит статус синхронизируется между устройствами и Telegram-аккаунтами.
//    Для гостей (без входа) читаем/пишем список id прочитанных уведомлений в localStorage,
//    т.к. у гостя нет стабильного uid в базе.
//  - Клик по заголовку в списке открывает модалку с полным текстом уведомления и сразу
//    отмечает его прочитанным. Кнопка-галочка в шапке дропдауна отмечает прочитанными
//    сразу все уведомления одним нажатием.
let notifListenerUnsub = null;
let personalNotifListenerUnsub = null;
let latestNotifications = [];
let broadcastNotifications = [];
let personalNotifications = [];
let notifActiveFilter = 'all';

// Отправить персональное уведомление конкретному пользователю (лайк/комментарий/подписка).
// Перед записью проверяем его настройки уведомлений (users/{uid}.notifSettings), по умолчанию — включено.
function sendPersonalNotification(targetUserId, type, title, body) {
  if (!targetUserId) return;
  const currentUser = (typeof auth !== 'undefined' && auth) ? auth.currentUser : null;
  if (currentUser && targetUserId === currentUser.uid) return; // не уведомляем самого себя

  const settingsKeyMap = { like: 'likes', comment: 'comments', subscribe: 'subscribes' };
  const settingsKey = settingsKeyMap[type];

  db.collection('users').doc(targetUserId).get().then(doc => {
    const data = doc.exists ? doc.data() : {};
    const notifSettings = data.notifSettings || {};
    if (settingsKey && notifSettings[settingsKey] === false) return; // пользователь отключил этот тип

    db.collection('users').doc(targetUserId).collection('notifications').add({
      type: type,
      title: title,
      body: body,
      read: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(err => console.warn('Не удалось отправить персональное уведомление:', err));
  }).catch(err => console.warn('Не удалось проверить настройки уведомлений получателя:', err));
}
// Флаг: первая порция уведомлений с сервера уже отрисована.
// Пока false — новые/старые документы считаются "историей" и НЕ показываются как всплывающий toast.
// Это и убирает баг с уведомлением "техработы", которое вылезало заново при каждом заходе на сайт.
let notifFirstLoadDone = false;

// ---- Прочитанные уведомления гостя (без входа) храним в localStorage ----
function getGuestReadNotifIds() {
  try { return new Set(JSON.parse(localStorage.getItem('notif_read_guest') || '[]')); } catch (e) { return new Set(); }
}
// Сохранить набор прочитанных гостем ID уведомлений
function saveGuestReadNotifIds(idsSet) {
  try { localStorage.setItem('notif_read_guest', JSON.stringify(Array.from(idsSet))); } catch (e) {}
}

// ---- Удалённые ("скрытые") пользователем уведомления — чтобы не висели вечно ----
function currentNotifStorageKey() {
  const user = (typeof auth !== 'undefined' && auth) ? auth.currentUser : null;
  return 'notif_dismissed_' + (user ? user.uid : 'guest');
}
// Получить набор скрытых пользователем уведомлений
function getDismissedNotifIds() {
  try { return new Set(JSON.parse(localStorage.getItem(currentNotifStorageKey()) || '[]')); } catch (e) { return new Set(); }
}
// Сохранить набор скрытых пользователем уведомлений
function saveDismissedNotifIds(idsSet) {
  try { localStorage.setItem(currentNotifStorageKey(), JSON.stringify(Array.from(idsSet))); } catch (e) {}
}

// Прочитано ли конкретное уведомление текущим пользователем (или гостем)
function isNotifRead(n) {
  if (n.personal) return !!n.read;
  const user = (typeof auth !== 'undefined' && auth) ? auth.currentUser : null;
  if (user) return (n.readBy || []).indexOf(user.uid) !== -1;
  return getGuestReadNotifIds().has(n.id);
}

// Объединить широковещательные и персональные уведомления в один отсортированный список и перерисовать
function mergeAndRenderNotifications() {
  latestNotifications = broadcastNotifications.concat(personalNotifications)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 80);
  renderNotifications();
}

// Запускаем один раз при загрузке сайта — работает и для гостей, и для авторизованных
function startNotificationsListener() {
  if (notifListenerUnsub) return; // уже слушаем, повторно не подписываемся
  notifListenerUnsub = primaryDb.collection('notifications')
    .orderBy('createdAt', 'desc')
    .limit(50)
    .onSnapshot((snapshot) => {
      const dismissed = getDismissedNotifIds();

      broadcastNotifications = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          const ts = (data.createdAt && typeof data.createdAt.toDate === 'function')
            ? data.createdAt.toDate().getTime()
            : Date.now(); // пока serverTimestamp не подтвердился локально — считаем "только что"
          return {
            id: doc.id,
            type: 'system',
            personal: false,
            title: data.title || 'Уведомление',
            body: data.body || '',
            authorName: data.authorName || '',
            readBy: data.readBy || [],
            ts: ts
          };
        })
        .filter((n) => !dismissed.has(n.id)); // скрытые пользователем не показываем вообще

      mergeAndRenderNotifications();

      // Всплывающий toast показываем ТОЛЬКО для новых уведомлений, пришедших ПОСЛЕ
      // того, как страница уже открылась. При самом заходе на сайт (первая загрузка
      // истории уведомлений) toast НЕ показываем — иначе он вылезал бы заново каждый раз.
      if (notifFirstLoadDone) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const n = broadcastNotifications.find((x) => x.id === change.doc.id);
            if (n && !isNotifRead(n)) showPushToast(n);
          }
        });
      }
      notifFirstLoadDone = true;
    }, (err) => {
      console.warn('Не удалось подписаться на уведомления:', err);
    });
}

// Флаг: первая порция ПЕРСОНАЛЬНЫХ уведомлений уже отрисована (свой аналог notifFirstLoadDone)
let personalNotifFirstLoadDone = false;

// Запустить подписку на персональные уведомления (лайки/комментарии/подписки) — только для авторизованных
function startPersonalNotificationsListener(uid) {
  stopPersonalNotificationsListener();
  personalNotifFirstLoadDone = false;
  personalNotifListenerUnsub = db.collection('users').doc(uid).collection('notifications')
    .orderBy('createdAt', 'desc')
    .limit(50)
    .onSnapshot((snapshot) => {
      const dismissed = getDismissedNotifIds();
      personalNotifications = snapshot.docs.map((doc) => {
        const data = doc.data();
        const ts = (data.createdAt && typeof data.createdAt.toDate === 'function')
          ? data.createdAt.toDate().getTime()
          : Date.now();
        return {
          id: doc.id,
          type: data.type || 'system',
          personal: true,
          title: data.title || 'Уведомление',
          body: data.body || '',
          authorName: '',
          read: !!data.read,
          ts: ts
        };
      }).filter((n) => !dismissed.has(n.id));

      mergeAndRenderNotifications();

      if (personalNotifFirstLoadDone) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const n = personalNotifications.find((x) => x.id === change.doc.id);
            if (n && !isNotifRead(n)) showPushToast(n);
          }
        });
      }
      personalNotifFirstLoadDone = true;
    }, (err) => {
      console.warn('Не удалось подписаться на персональные уведомления:', err);
    });
}

// Остановить подписку на персональные уведомления (например, при выходе из аккаунта)
function stopPersonalNotificationsListener() {
  if (personalNotifListenerUnsub) {
    personalNotifListenerUnsub();
    personalNotifListenerUnsub = null;
  }
  personalNotifications = [];
  mergeAndRenderNotifications();
}
window.startPersonalNotificationsListener = startPersonalNotificationsListener;
window.stopPersonalNotificationsListener = stopPersonalNotificationsListener;

// Всплывающее push-уведомление в правом верхнем углу (клик -> открыть полностью)
function showPushToast(n) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const shortBody = n.body.length > 100 ? n.body.slice(0, 100).trim() + '…' : n.body;

  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `
    <div class="toast-icon">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
    </div>
    <div class="toast-body">
      <div class="toast-title">${escapeHtml(n.title)}</div>
      <div class="toast-text">${escapeHtml(shortBody)}</div>
    </div>
    <button class="toast-close" title="Закрыть">✕</button>
    <div class="toast-progress"></div>
  `;

  el.addEventListener('click', () => {
    hidePushToast(el);
    openNotifDetail(n.id);
  });
  el.querySelector('.toast-close').addEventListener('click', (e) => {
    e.stopPropagation();
    hidePushToast(el);
  });

  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));

  const autoHideTimer = setTimeout(() => hidePushToast(el), 7000);
  el._autoHideTimer = autoHideTimer;
}

// Скрыть и удалить всплывающий toast с уведомлением
function hidePushToast(el) {
  if (!el || el._hiding) return;
  el._hiding = true;
  if (el._autoHideTimer) clearTimeout(el._autoHideTimer);
  el.classList.remove('show');
  el.classList.add('hide');
  setTimeout(() => el.remove(), 400);
}

// Отрисовать список уведомлений в дропдауне + пересчитать бейдж непрочитанных
function renderNotifications() {
  const listEl = document.getElementById('notifList');
  const badgeEl = document.getElementById('notifBadge');
  if (!listEl || !badgeEl) return;

  const unreadCount = latestNotifications.filter((n) => !isNotifRead(n)).length;
  const mbnBadgeEl = document.getElementById('mbnNotifBadge');
  const settingsBadgeEl = document.getElementById('settingsNotifBadge');

  if (unreadCount > 0) {
    badgeEl.textContent = unreadCount > 9 ? '9+' : String(unreadCount);
    badgeEl.style.display = 'flex';
    if (mbnBadgeEl) { mbnBadgeEl.textContent = badgeEl.textContent; mbnBadgeEl.style.display = 'flex'; }
    if (settingsBadgeEl) { settingsBadgeEl.textContent = badgeEl.textContent; settingsBadgeEl.style.display = 'flex'; }
  } else {
    badgeEl.style.display = 'none';
    if (mbnBadgeEl) mbnBadgeEl.style.display = 'none';
    if (settingsBadgeEl) settingsBadgeEl.style.display = 'none';
  }

  if (latestNotifications.length === 0) {
    listEl.innerHTML = '<div class="notif-empty">Пока нет уведомлений</div>';
    return;
  }

  const filtered = notifActiveFilter === 'all'
    ? latestNotifications
    : latestNotifications.filter((n) => n.type === notifActiveFilter);

  if (filtered.length === 0) {
    listEl.innerHTML = '<div class="notif-empty">Нет уведомлений в этой категории</div>';
    return;
  }

  const typeIcons = {
    like: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    comment: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
    subscribe: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>',
    system: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>'
  };

  listEl.innerHTML = filtered.map((n) => {
    const unread = !isNotifRead(n);
    const icon = typeIcons[n.type] || typeIcons.system;
    return `
      <div class="notif-item${unread ? ' unread' : ''}" onclick="openNotifDetail('${n.id}')">
        ${unread ? '<span class="notif-dot" title="Не прочитано"></span>' : ''}
        <div class="notif-item-type-icon type-${n.type}">${icon}</div>
        <div class="notif-item-body">
          <div class="notif-item-title">${escapeHtml(n.title)}</div>
          <div class="notif-item-time">${formatNotifTime(n.ts)}${n.authorName ? ' · ' + escapeHtml(n.authorName) : ''}</div>
        </div>
        <button class="notif-item-delete" title="Удалить уведомление" onclick="event.stopPropagation(); dismissNotification('${n.id}')">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>
    `;
  }).join('');
}

// Переключить активную вкладку-фильтр в дропдауне уведомлений
window.setNotifFilter = function (type) {
  notifActiveFilter = type;
  const row = document.getElementById('notifFilterRow');
  if (row) {
    row.querySelectorAll('.notif-filter-pill').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-filter') === type);
    });
  }
  renderNotifications();
};

// Удалить одно уведомление из своего списка (персональные удаляются полностью — это личная копия;
// широковещательные — у обычного юзера скрываются только у себя, у админа удаляются для всех)
window.dismissNotification = function (id) {
  const n = latestNotifications.find((x) => x.id === id);
  if (!n) return;

  if (n.personal) {
    // Правила Firestore разрешают удаление документов только админам, поэтому свои
    // персональные уведомления обычный пользователь просто скрывает у себя (как и рассылки).
    const set = getDismissedNotifIds();
    set.add(id);
    saveDismissedNotifIds(set);
    personalNotifications = personalNotifications.filter((x) => x.id !== id);
    mergeAndRenderNotifications();
    return;
  }

  if (typeof isAdmin === 'function' && isAdmin()) {
    primaryDb.collection('notifications').doc(id).delete().catch(() => {
      showToast('Ошибка удаления уведомления', 'error');
    });
    // Локально уберём сразу, не дожидаясь снепшота
    broadcastNotifications = broadcastNotifications.filter((x) => x.id !== id);
    mergeAndRenderNotifications();
    return;
  }

  const set = getDismissedNotifIds();
  set.add(id);
  saveDismissedNotifIds(set);
  broadcastNotifications = broadcastNotifications.filter((x) => x.id !== id);
  mergeAndRenderNotifications();
};

// Человекочитаемое "N минут/часов назад" для уведомления
function formatNotifTime(ts) {
  const diffMin = Math.floor((Date.now() - ts) / 60000);
  if (diffMin < 1) return 'только что';
  if (diffMin < 60) return diffMin + ' мин назад';
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return diffH + ' ч назад';
  const diffDays = Math.floor(diffH / 24);
  return diffDays + ' дн назад';
}

// Кнопка "Войти/Профиль" в нижнем мобильном меню — переиспользуем существующий
// дропдаун профиля из шапки сайта (там уже есть вход/регистрация/профиль/выход).
window.handleMobileBottomNavAuth = function () {
  const profileMenuBtn = document.getElementById('profileMenuBtn');
  if (profileMenuBtn) profileMenuBtn.click();
};

// Открыть/закрыть дропдаун уведомлений
window.toggleNotifDropdown = function () {
  const dd = document.getElementById('notifDropdown');
  if (!dd) return;
  const willOpen = !dd.classList.contains('show');
  const profileDropdownEl = document.getElementById('profileDropdown');
  if (profileDropdownEl) profileDropdownEl.classList.remove('show');
  dd.classList.toggle('show', willOpen);
};

// Отметить одно уведомление прочитанным (локально мгновенно + запись в Firestore/localStorage)
function markNotifRead(n) {
  if (isNotifRead(n)) return;

  if (n.personal) {
    n.read = true;
    const user = (typeof auth !== 'undefined' && auth) ? auth.currentUser : null;
    if (user) {
      db.collection('users').doc(user.uid).collection('notifications').doc(n.id).update({ read: true }).catch(() => {});
    }
    renderNotifications();
    return;
  }

  const user = (typeof auth !== 'undefined' && auth) ? auth.currentUser : null;
  if (user) {
    n.readBy = (n.readBy || []).concat(user.uid);
    primaryDb.collection('notifications').doc(n.id).update({
      readBy: firebase.firestore.FieldValue.arrayUnion(user.uid)
    }).catch(() => {});
  } else {
    const set = getGuestReadNotifIds();
    set.add(n.id);
    saveGuestReadNotifIds(set);
  }
  renderNotifications();
}

// Открыть подробный просмотр уведомления (заголовок в списке -> полный текст в модалке)
window.openNotifDetail = function (id) {
  const n = latestNotifications.find((x) => x.id === id);
  if (!n) return;
  const titleEl = document.getElementById('notifDetailTitle');
  const timeEl = document.getElementById('notifDetailTime');
  const bodyEl = document.getElementById('notifDetailBody');
  if (titleEl) titleEl.textContent = n.title;
  if (timeEl) timeEl.textContent = formatNotifTime(n.ts) + (n.authorName ? ' · ' + n.authorName : '');
  if (bodyEl) bodyEl.textContent = n.body;

  const dd = document.getElementById('notifDropdown');
  if (dd) dd.classList.remove('show');
  const modal = document.getElementById('notifDetailModal');
  if (modal) modal.classList.add('show');

  markNotifRead(n);
};
window.closeNotifDetailModal = function () {
  const modal = document.getElementById('notifDetailModal');
  if (modal) modal.classList.remove('show');
};

// Отметить ВСЕ уведомления прочитанными одной кнопкой
window.markAllNotificationsRead = function (e) {
  if (e) e.stopPropagation();
  const unread = latestNotifications.filter((n) => !isNotifRead(n));
  if (unread.length === 0) return;

  const user = (typeof auth !== 'undefined' && auth) ? auth.currentUser : null;
  if (user) {
    const batch = primaryDb.batch();
    unread.forEach((n) => {
      if (n.personal) {
        n.read = true;
        batch.update(db.collection('users').doc(user.uid).collection('notifications').doc(n.id), { read: true });
      } else {
        n.readBy = (n.readBy || []).concat(user.uid);
        batch.update(primaryDb.collection('notifications').doc(n.id), {
          readBy: firebase.firestore.FieldValue.arrayUnion(user.uid)
        });
      }
    });
    batch.commit().catch(() => {});
  } else {
    const set = getGuestReadNotifIds();
    unread.forEach((n) => set.add(n.id));
    saveGuestReadNotifIds(set);
  }
  renderNotifications();
  showToast('Все уведомления отмечены прочитанными');
};

/* ---- Рассылка уведомления всем пользователям (доступно только админу) ---- */
window.openNotifyAdminModal = function () {
  if (!isAdmin()) { showToast('Недостаточно прав!', 'error'); return; }
  const titleInput = document.getElementById('broadcastNotifTitleInput');
  const bodyInput = document.getElementById('broadcastNotifInput');
  if (titleInput) titleInput.value = '';
  if (bodyInput) bodyInput.value = '';
  window.updateBroadcastCharCounter();
  const modal = document.getElementById('notifyAdminModal');
  if (modal) modal.classList.add('show');
};
window.closeNotifyAdminModal = function () {
  const modal = document.getElementById('notifyAdminModal');
  if (modal) modal.classList.remove('show');
};
window.updateBroadcastCharCounter = function () {
  const bodyInput = document.getElementById('broadcastNotifInput');
  const counter = document.getElementById('broadcastCharCounter');
  if (bodyInput && counter) counter.textContent = bodyInput.value.length + ' / 600';
};
window.sendBroadcastNotification = function () {
  if (!isAdmin()) { showToast('Недостаточно прав!', 'error'); return; }
  const titleInput = document.getElementById('broadcastNotifTitleInput');
  const bodyInput = document.getElementById('broadcastNotifInput');
  const title = titleInput ? titleInput.value.trim() : '';
  const body = bodyInput ? bodyInput.value.trim() : '';
  if (!title) { showToast('Введите заголовок уведомления', 'error'); return; }
  if (!body) { showToast('Введите текст уведомления', 'error'); return; }

  const user = auth.currentUser;
  showActionLoader('Отправка уведомления...');
  primaryDb.collection('notifications').add({
    title: title,
    body: body,
    authorName: (user && (user.displayName || user.email)) || 'Админ',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    readBy: []
  }).then(() => {
    hideActionLoader();
    showToast('Уведомление отправлено всем 🔔');
    window.closeNotifyAdminModal();
  }).catch((err) => {
    hideActionLoader();
    showToast('Ошибка отправки: ' + err.message, 'error');
  });
};

// Подписка стартует сразу при загрузке скрипта — уведомления видны и гостям, и авторизованным
startNotificationsListener();
// ============================================================================
// === /УВЕДОМЛЕНИЯ ===
// ============================================================================

// ===================== /КОРОБКА СЕКРЕТОВ =====================



// ===================== ШТОРКА ПРОФИЛЯ (нижнее мобильное меню) =====================
window.toggleProfileSheet = function () {
  const overlay = document.getElementById('mpsOverlay');
  if (!overlay) return;
  overlay.classList.toggle('show');
};

window.closeProfileSheet = function () {
  const overlay = document.getElementById('mpsOverlay');
  if (overlay) overlay.classList.remove('show');
};
// ===================== /ШТОРКА ПРОФИЛЯ =====================


// ===================== АУДИОПЛЕЕР ПОСТА (как в референсе) =====================
(function () {
  const ICON_PLAY  = '<svg class="ap-ico-play" viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/></svg>';
  const ICON_PAUSE = '<svg class="ap-ico-pause" viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><rect x="6" y="4" width="4.5" height="16" rx="1"/><rect x="13.5" y="4" width="4.5" height="16" rx="1"/></svg>';
  const ICON_VOL   = '<svg class="ap-ico-vol" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none"/></svg>';
  const ICON_MUTE  = '<svg class="ap-ico-mute" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5" fill="none"/></svg>';

  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  window.buildAudioPlayerHTML = function (src, name) {
    return `
      <div class="reel-audio-frame">
        <div class="ap">
          <audio preload="metadata" src="${src}"></audio>
          <div class="ap-top">
            <button type="button" class="ap-play" aria-label="Воспроизвести / пауза">${ICON_PLAY}${ICON_PAUSE}</button>
            <div class="ap-name" title="${esc(name)}">${esc(name)}</div>
            <input type="range" class="ap-vol" min="0" max="1" step="0.01" value="0.5" style="--p:50%" aria-label="Громкость">
            <button type="button" class="ap-mute" aria-label="Выключить звук">${ICON_VOL}${ICON_MUTE}</button>
          </div>
          <input type="range" class="ap-seek" min="0" max="1000" step="1" value="0" style="--p:0%" aria-label="Перемотка">
        </div>
      </div>`;
  };

  function fill(el) {
    const min = parseFloat(el.min) || 0, max = parseFloat(el.max) || 1;
    el.style.setProperty('--p', (((parseFloat(el.value) - min) / (max - min)) * 100) + '%');
  }
  function initAudio(a, ap) {
    if (a.dataset.apInit) return;
    a.dataset.apInit = '1';
    a.volume = parseFloat(ap.querySelector('.ap-vol').value);
  }
  function syncTime(ap) {
    const a = ap.querySelector('audio'), seek = ap.querySelector('.ap-seek');
    seek.value = (a.duration && isFinite(a.duration)) ? (a.currentTime / a.duration) * 1000 : 0;
    fill(seek);
  }
  function syncVolume(ap) {
    const a = ap.querySelector('audio');
    ap.classList.toggle('is-muted', a.muted || a.volume === 0);
  }

  document.addEventListener('click', function (e) {
    const play = e.target.closest && e.target.closest('.ap-play');
    if (play) {
      e.stopPropagation();
      const ap = play.closest('.ap'), a = ap.querySelector('audio');
      initAudio(a, ap);
      if (a.paused) {
        document.querySelectorAll('.ap audio').forEach((o) => { if (o !== a) o.pause(); });
        const p = a.play();
        if (p && p.catch) p.catch(() => {});
      } else {
        a.pause();
      }
      return;
    }
    const mute = e.target.closest && e.target.closest('.ap-mute');
    if (mute) {
      e.stopPropagation();
      const ap = mute.closest('.ap'), a = ap.querySelector('audio');
      initAudio(a, ap);
      if (a.volume === 0) { a.volume = 0.5; ap.querySelector('.ap-vol').value = 0.5; fill(ap.querySelector('.ap-vol')); }
      a.muted = !a.muted;
      syncVolume(ap);
    }
  });

  document.addEventListener('input', function (e) {
    const t = e.target;
    if (!t.classList) return;
    if (t.classList.contains('ap-seek')) {
      const ap = t.closest('.ap'), a = ap.querySelector('audio');
      if (a.duration && isFinite(a.duration)) a.currentTime = (t.value / 1000) * a.duration;
      fill(t);
    } else if (t.classList.contains('ap-vol')) {
      const ap = t.closest('.ap'), a = ap.querySelector('audio');
      initAudio(a, ap);
      a.volume = parseFloat(t.value);
      a.muted = false;
      fill(t);
      syncVolume(ap);
    }
  });

  // Медиа-события не всплывают — слушаем в фазе перехвата
  ['timeupdate', 'loadedmetadata', 'durationchange', 'play', 'pause', 'ended'].forEach(function (ev) {
    document.addEventListener(ev, function (e) {
      const a = e.target;
      if (!a || a.tagName !== 'AUDIO') return;
      const ap = a.closest('.ap');
      if (!ap) return;
      ap.classList.toggle('is-playing', !a.paused && !a.ended);
      syncTime(ap);
    }, true);
  });
})();
