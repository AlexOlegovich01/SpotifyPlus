// ==UserScript==
// @name         SpotifyPlus
// @namespace    local.spotify.shift-select
// @version      1.2
// @description  Shift — выделение текста; ↑/↓ — громкость 2%; ←/→ — перемотка 2 с; колесо над ползунками — громкость 5% / перемотка 20 с; Пробел — пауза; Ctrl+←/→ — трек; Ctrl+C — копировать трек
// @match        https://open.spotify.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const CLS = 'tm-shift-select';

  // CSS: разрешаем выделение везде, но только когда зажат Shift
  const style = document.createElement('style');
  style.textContent = `
    html.${CLS}, html.${CLS} * {
      -webkit-user-select: text !important;
      user-select: text !important;
    }
    html.${CLS} * { cursor: text !important; }
  `;
  (document.head || document.documentElement).appendChild(style);

  const root = document.documentElement;
  const setMode = (on) => root.classList.toggle(CLS, on);

  window.addEventListener('keydown', (e) => { if (e.key === 'Shift') setMode(true); }, true);
  window.addEventListener('keyup',   (e) => { if (e.key === 'Shift') setMode(false); }, true);
  window.addEventListener('blur', () => setMode(false));

  // Временно отключаем draggable у элемента и ссылок под курсором,
  // иначе браузер начинает "перетаскивание" вместо выделения
  let restore = [];
  window.addEventListener('mousedown', (e) => {
    if (!e.shiftKey || e.button !== 0) return;

    let el = e.target;
    while (el && el !== document) {
      if (el.nodeType === 1 && (el.getAttribute('draggable') === 'true' || el.tagName === 'A')) {
        restore.push([el, el.getAttribute('draggable')]);
        el.setAttribute('draggable', 'false');
      }
      el = el.parentNode;
    }
    // Не даём Спотифаю обработать Shift+клик (выделение строк и т.п.)
    e.stopImmediatePropagation();
  }, true);

  window.addEventListener('mouseup', () => {
    restore.forEach(([el, val]) => {
      if (val === null) el.removeAttribute('draggable');
      else el.setAttribute('draggable', val);
    });
    restore = [];
  }, true);

  // Блокируем реакцию сайта (и переходы по ссылкам) на Shift+клик / двойной клик
  ['click', 'dblclick', 'mouseup', 'pointerdown', 'pointerup'].forEach((type) => {
    window.addEventListener(type, (e) => {
      if (!e.shiftKey) return;
      e.stopImmediatePropagation();
      if (type === 'click' || type === 'dblclick') e.preventDefault();
    }, true);
  });

  // Если сайт отменяет начало выделения — не даём
  window.addEventListener('selectstart', (e) => {
    if (root.classList.contains(CLS)) e.stopImmediatePropagation();
  }, true);

  // ================= Громкость и перемотка =================
  const KEY_VOLUME_STEP = 2;     // % за нажатие ↑/↓
  const KEY_SEEK_STEP = 2;       // секунд за нажатие ←/→
  const WHEEL_VOLUME_STEP = 5;   // % за тик колеса над громкостью
  const WHEEL_SEEK_STEP = 20;    // секунд за тик колеса над шкалой времени

  const SEL_VOLUME = '[data-testid="volume-bar"]';
  const SEL_PROGRESS = '[data-testid="playback-progressbar"]';
  const SEL_DURATION = '[data-testid="playback-duration"]';

  const nativeValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;

  // Выставляем значение range-инпута так, чтобы React это заметил
  function setRange(input, value) {
    const min = parseFloat(input.min) || 0;
    const max = parseFloat(input.max);
    value = Math.min(max, Math.max(min, value));
    input.step = 'any'; // иначе браузер округлит до шага (у громкости он 0.1)
    nativeValueSetter.call(input, String(value));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function getInput(sel) {
    return document.querySelector(sel + ' input[type="range"]');
  }

  function changeVolume(percent) {
    const input = getInput(SEL_VOLUME);
    if (!input) return;
    const min = parseFloat(input.min) || 0;
    const max = parseFloat(input.max);
    if (!isFinite(max)) return;
    setRange(input, parseFloat(input.value) + (max - min) * percent / 100);
  }

  // Длительность трека в секундах из текста "m:ss" / "h:mm:ss"
  function trackDurationSec() {
    const el = document.querySelector(SEL_DURATION);
    if (!el) return 0;
    return el.textContent.trim().split(':').reduce((acc, p) => acc * 60 + (parseInt(p, 10) || 0), 0);
  }

  function seek(seconds) {
    const input = getInput(SEL_PROGRESS);
    if (!input) return;
    const max = parseFloat(input.max);
    if (!isFinite(max) || max <= 0) return;
    // Шкала может быть в секундах или миллисекундах — определяем по длительности
    const dur = trackDurationSec();
    const unit = dur > 0 && max > dur * 10 ? 1000 : 1;
    setRange(input, parseFloat(input.value) + seconds * unit);
  }

  function isTyping(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.isContentEditable) return true;
    if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
    if (el.tagName === 'INPUT') return !['range', 'checkbox', 'radio', 'button'].includes(el.type);
    return false;
  }

  window.addEventListener('keydown', (e) => {
    if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
    if (isTyping(e.target)) return;

    switch (e.key) {
      case 'ArrowUp':    changeVolume(KEY_VOLUME_STEP); break;
      case 'ArrowDown':  changeVolume(-KEY_VOLUME_STEP); break;
      case 'ArrowRight': seek(KEY_SEEK_STEP); break;
      case 'ArrowLeft':  seek(-KEY_SEEK_STEP); break;
      default: return;
    }
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);

  // ================= Пауза, переключение треков, копирование =================
  const clickBtn = (testid) => {
    const b = document.querySelector('[data-testid="' + testid + '"]');
    if (b) b.click();
    return !!b;
  };

  function copyText(text) {
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (_) {}
      ta.remove();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(fallback);
    } else {
      fallback();
    }
  }

  function currentTrackString() {
    const widget = document.querySelector('[data-testid="now-playing-widget"]')
      || document.querySelector('[data-testid="now-playing-bar"]')
      || document;
    // Ищем по data-testid, а если не вышло — по структуре нижней панели:
    // первая ссылка с текстом — название, остальные — исполнители (работает и на паузе)
    let title = widget.querySelector('[data-testid="context-item-link"], [data-testid="context-item-info-title"]');
    let artists = [...widget.querySelectorAll(
      '[data-testid="context-item-info-artist"], [data-testid="context-item-info-subtitles"] a'
    )].map((el) => el.textContent.trim()).filter(Boolean);
    if (!title || !artists.length) {
      const links = [...widget.querySelectorAll('a')].filter((el) => el.textContent.trim());
      if (!title) title = links[0] || null;
      if (!artists.length) {
        artists = links.filter((el) => el !== title && !el.contains(title) && !title.contains(el))
          .map((el) => el.textContent.trim());
      }
    }
    if (title) {
      const t = title.textContent.trim();
      const a = [...new Set(artists)].join(', ');
      return a ? a + ' — ' + t : t;
    }
    // Запасной вариант: во время воспроизведения заголовок вкладки "Название • Артист"
    const m = document.title.match(/^(.+?) • (.+)$/);
    return m ? m[2] + ' — ' + m[1] : '';
  }

  window.addEventListener('keydown', (e) => {
    if (e.altKey || e.metaKey || isTyping(e.target)) return;

    let handled = false;
    if (e.code === 'Space' && !e.ctrlKey && !e.shiftKey) {
      if (!e.repeat) clickBtn('control-button-playpause');
      handled = true;
    } else if (e.ctrlKey && !e.shiftKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      clickBtn(e.key === 'ArrowRight' ? 'control-button-skip-forward' : 'control-button-skip-back');
      handled = true;
    } else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyC') {
      // Обычное копирование выделенного текста не трогаем
      if (String(window.getSelection()).length > 0) {
        console.debug('[SpotifyPlus] Ctrl+C: есть выделенный текст, обычное копирование');
        return;
      }
      const text = currentTrackString();
      if (!text) {
        console.warn('[SpotifyPlus] Ctrl+C: не удалось определить трек (нижняя панель пуста или изменилась разметка)');
        return;
      }
      console.debug('[SpotifyPlus] Скопировано:', text);
      copyText(text);
      handled = true;
    }
    if (handled) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);

  window.addEventListener('wheel', (e) => {
    if (!e.target.closest) return;
    const dir = e.deltaY < 0 ? 1 : -1; // вверх — громче / вперёд
    if (e.target.closest(SEL_VOLUME)) {
      changeVolume(dir * WHEEL_VOLUME_STEP);
    } else if (e.target.closest(SEL_PROGRESS)) {
      seek(dir * WHEEL_SEEK_STEP);
    } else {
      return;
    }
    e.preventDefault();
    e.stopImmediatePropagation();
  }, { capture: true, passive: false });
})();