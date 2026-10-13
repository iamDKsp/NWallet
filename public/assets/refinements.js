// NWallet System Refinements & Bespoke Component Engine
// Custom Tooltips, Invisible Scroll, Emoji-to-SVG Icons, Checkboxes, Menus & Calendar Refinements.
(() => {
  const root = document.getElementById('root');
  if (!root) return;

  // 0. iOS PWA Standalone Mode Viewport Stabilizer
  if (typeof window !== 'undefined') {
    const isStandalone = window.navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
    if (isStandalone) {
      document.documentElement.classList.add('ios-pwa-standalone');
      const statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
      if (statusBarMeta && statusBarMeta.getAttribute('content') !== 'black-translucent') {
        statusBarMeta.setAttribute('content', 'black-translucent');
      }
    }
  }

  const navigation = {
    'nav-home': 'Início',
    'nav-statistic': 'Estatísticas',
    'nav-wallet': 'Carteira',
    'nav-setting': 'Ajustes'
  };

  const labels = {
    ...navigation,
    'notif-btn': 'Notificações',
    'desktop-notif-btn': 'Notificações',
    'add-card': 'Adicionar cartão',
    'add-card-desktop': 'Adicionar cartão',
    'ai-center-btn': 'Abrir Nexus IA'
  };

  const iconLabels = {
    'lucide-x': 'Fechar',
    'lucide-chevron-left': 'Anterior',
    'lucide-chevron-right': 'Próximo',
    'lucide-plus': 'Adicionar',
    'lucide-trash-2': 'Excluir',
    'lucide-pencil': 'Editar'
  };

  // SVG definitions for emoji replacements
  const SVG_ICONS = {
    '⚠️': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    '💰': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    '💳': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',
    '👋': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>',
    '📅': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    '⏰': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    '🔔': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
    '⚙️': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    '❌': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    '✅': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'
  };

  const EMOJI_REGEX = /([\u{1F300}-\u{1FAD6}\u{200D}\u{FE0F}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}])/gu;

  // ------------------------------------------------------------------------
  // ORIGINAL SYSTEM TOOLTIP ENGINE
  // Eliminates default browser tooltips (title) and renders custom floating UI
  // ------------------------------------------------------------------------
  let tooltipEl = null;
  let tooltipTextEl = null;
  let tooltipArrowEl = null;
  let tooltipTimer = null;
  let activeTarget = null;

  function initTooltip() {
    if (tooltipEl) return;
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'nw-system-tooltip';
    tooltipEl.className = 'nw-system-tooltip';
    tooltipEl.setAttribute('role', 'tooltip');
    tooltipEl.setAttribute('aria-hidden', 'true');

    tooltipTextEl = document.createElement('span');
    tooltipTextEl.className = 'nw-tooltip-text';

    tooltipArrowEl = document.createElement('div');
    tooltipArrowEl.className = 'nw-tooltip-arrow';

    tooltipEl.appendChild(tooltipTextEl);
    tooltipEl.appendChild(tooltipArrowEl);
    document.body.appendChild(tooltipEl);
  }

  function showTooltip(target, text) {
    if (!text || !target.isConnected) return;
    initTooltip();
    clearTimeout(tooltipTimer);

    tooltipTimer = setTimeout(() => {
      activeTarget = target;
      tooltipTextEl.textContent = text;
      tooltipEl.classList.remove('nw-tooltip-visible', 'nw-tooltip-bottom');
      tooltipEl.style.display = 'flex';

      const rect = target.getBoundingClientRect();
      const tipWidth = tooltipEl.offsetWidth;
      const tipHeight = tooltipEl.offsetHeight;

      // Vertical positioning (default: above; flip to below if tight on top)
      let top = rect.top - tipHeight - 9;
      let placeBottom = false;
      if (top < 10) {
        top = rect.bottom + 9;
        placeBottom = true;
      }

      // Horizontal centering relative to target center
      const targetCenter = rect.left + rect.width / 2;
      let left = targetCenter - tipWidth / 2;

      // Clamp horizontally within screen
      const minLeft = 10;
      const maxLeft = window.innerWidth - tipWidth - 10;
      const clampedLeft = Math.max(minLeft, Math.min(left, maxLeft));

      // Calculate arrow offset
      const arrowOffset = targetCenter - clampedLeft - 4; // 4px is half arrow width
      tooltipArrowEl.style.left = `${Math.max(10, Math.min(arrowOffset, tipWidth - 18))}px`;

      if (placeBottom) {
        tooltipEl.classList.add('nw-tooltip-bottom');
      } else {
        tooltipEl.classList.remove('nw-tooltip-bottom');
      }

      tooltipEl.style.top = `${top}px`;
      tooltipEl.style.left = `${clampedLeft}px`;
      tooltipEl.setAttribute('aria-hidden', 'false');
      tooltipEl.classList.add('nw-tooltip-visible');
    }, 120);
  }

  function hideTooltip() {
    clearTimeout(tooltipTimer);
    activeTarget = null;
    if (tooltipEl) {
      tooltipEl.classList.remove('nw-tooltip-visible');
      tooltipEl.setAttribute('aria-hidden', 'true');
    }
  }

  // Intercept hover and focus for system tooltip
  document.addEventListener('pointerover', event => {
    const el = event.target.closest('[data-nw-tooltip]');
    if (!el) return;
    const text = el.getAttribute('data-nw-tooltip');
    if (text) showTooltip(el, text);
  }, true);

  document.addEventListener('pointerout', event => {
    const el = event.target.closest('[data-nw-tooltip]');
    if (el && el === activeTarget) hideTooltip();
  }, true);

  document.addEventListener('focusin', event => {
    const el = event.target.closest('[data-nw-tooltip]');
    if (el) {
      const text = el.getAttribute('data-nw-tooltip');
      if (text) showTooltip(el, text);
    }
  }, true);

  document.addEventListener('focusout', () => hideTooltip(), true);
  window.addEventListener('scroll', () => hideTooltip(), { passive: true, capture: true });
  document.addEventListener('pointerdown', () => hideTooltip(), true);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') hideTooltip();
  });

  // ------------------------------------------------------------------------
  // DYNAMIC EMOJI-TO-SVG PROCESSOR
  // ------------------------------------------------------------------------
  function replaceEmojisInNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const val = node.nodeValue;
      if (EMOJI_REGEX.test(val)) {
        const frag = document.createDocumentFragment();
        let lastIndex = 0;
        val.replace(EMOJI_REGEX, (match, emoji, offset) => {
          if (offset > lastIndex) {
            frag.appendChild(document.createTextNode(val.slice(lastIndex, offset)));
          }
          const span = document.createElement('span');
          span.className = 'nw-icon-replaced';
          span.setAttribute('aria-hidden', 'true');
          span.innerHTML = SVG_ICONS[emoji] || SVG_ICONS['⚠️'] || '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>';
          frag.appendChild(span);
          lastIndex = offset + match.length;
        });
        if (lastIndex < val.length) {
          frag.appendChild(document.createTextNode(val.slice(lastIndex)));
        }
        node.parentNode.replaceChild(frag, node);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE && !['SCRIPT', 'STYLE', 'SVG', 'NOSCRIPT'].includes(node.tagName)) {
      Array.from(node.childNodes).forEach(replaceEmojisInNode);
    }
  }

  // ------------------------------------------------------------------------
  // CORE REFINEMENT LOOP
  // ------------------------------------------------------------------------
  let nextId = 0, scheduled = false, opener = null, hadEntryPanel = false;

  function refine() {
    scheduled = false;

    // 1. Convert any title attribute to data-nw-tooltip and strip title
    root.querySelectorAll('[title]').forEach(el => {
      const title = el.getAttribute('title');
      if (title && title.trim()) {
        el.setAttribute('data-nw-tooltip', title.trim());
      }
      el.removeAttribute('title');
    });

    // 2. Navigation & Primary Action Buttons
    for (const [id, label] of Object.entries(labels)) {
      const button = document.getElementById(id);
      if (!button) continue;
      button.setAttribute('aria-label', label);
      button.setAttribute('data-nw-tooltip', label);
      button.removeAttribute('title');

      if (navigation[id]) {
        button.dataset.navLabel = label;
        const active = [...button.children].some(
          e => e.classList.contains('absolute') && e.classList.contains('bg-green-primary')
        );
        if (active) button.setAttribute('aria-current', 'page');
        else button.removeAttribute('aria-current');
        button.closest('nav')?.classList.add('nw-mobile-dock');
      }
    }

    // 3. Icon-only action buttons without text
    root.querySelectorAll('button:not([aria-label])').forEach(button => {
      if (button.textContent.trim()) return;
      for (const [svgClass, label] of Object.entries(iconLabels)) {
        if (!button.querySelector('svg.' + svgClass)) continue;
        button.setAttribute('aria-label', label);
        button.setAttribute('data-nw-tooltip', label);
        button.removeAttribute('title');
        if (label === 'Fechar') button.dataset.nwClose = '';
        break;
      }
    });

    // 4. Form inputs, labels & dialog semantics
    root.querySelectorAll('form').forEach(form => {
      form.querySelectorAll('label').forEach(label => {
        if (label.htmlFor) return;
        const fields = label.parentElement.querySelectorAll('input:not([type="file"]),select,textarea');
        if (fields.length !== 1) return;
        const field = fields[0];
        field.id ||= `nw-field-${++nextId}`;
        label.htmlFor = field.id;
      });

      const panel = form.parentElement?.parentElement;
      const heading = panel?.querySelector('h3');
      if (!heading || !/^Nova (Despesa|Receita)$/.test(heading.textContent.trim())) return;
      panel.classList.add('nw-entry-panel');
      panel.parentElement.classList.add('nw-entry-overlay');
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      heading.id ||= `nw-dialog-${++nextId}`;
      panel.setAttribute('aria-labelledby', heading.id);

      const amount = form.querySelector('input[type="number"]');
      if (amount) {
        amount.setAttribute('aria-label', 'Valor do lançamento');
        amount.setAttribute('inputmode', 'decimal');
      }
    });

    // 5. Amount styling
    root.querySelectorAll('p').forEach(p => {
      const text = p.textContent.trim();
      p.classList.toggle('nw-amount-expense', /^[-−]\s*R\$/.test(text));
      p.classList.toggle('nw-amount-income', /^\+\s*R\$/.test(text));
    });

    // 6. Dynamic emoji substitution in DOM text nodes
    replaceEmojisInNode(root);

    // 7. Focus retention for closed dialogs
    const hasEntryPanel = !!root.querySelector('.nw-entry-panel');
    if (hadEntryPanel && !hasEntryPanel && opener?.isConnected) {
      opener.focus({ preventScroll: true });
    }
    hadEntryPanel = hasEntryPanel;

    // 8. Update Settings dynamic values
    root.querySelectorAll('button').forEach(btn => {
      const pElements = btn.querySelectorAll('p');
      if (pElements.length >= 2) {
        const title = pElements[0].textContent.trim();
        if (title === 'Senha e Biometria') {
          const isEnabled = localStorage.getItem('nwallet_faceid_enabled') !== 'false';
          pElements[1].textContent = isEnabled ? 'FaceID Ativado' : 'Desativado';
        } else if (title === 'Visibilidade do Perfil') {
          pElements[1].textContent = localStorage.getItem('nwallet_profile_visibility') || 'Público';
        }
      }
    });
  }

  // ------------------------------------------------------------------------
  // MOBILE DOCK AUTO-HIDE & AUTO-SHOW (SCROLL & GESTURE ENGINE)
  // ------------------------------------------------------------------------
  let isDockHidden = false;
  let scrollRAF = null;
  let lastScrollTop = 0;
  let touchStartY = null;
  let touchStartX = null;

  function setDockHidden(hidden) {
    const dock = document.querySelector('nav.nw-mobile-dock') || document.querySelector('#root nav');
    if (!dock) return;
    if (isDockHidden === hidden) return;
    isDockHidden = hidden;
    dock.classList.toggle('nw-dock-hidden', hidden);
    dock.setAttribute('aria-hidden', hidden ? 'true' : 'false');
  }

  // 1. Passive captured scroll tracking across all scrollable containers & window
  window.addEventListener('scroll', event => {
    const target = event.target;
    const currentY = (target && typeof target.scrollTop === 'number')
      ? target.scrollTop
      : (window.scrollY || document.documentElement.scrollTop || 0);

    if (scrollRAF) cancelAnimationFrame(scrollRAF);
    scrollRAF = requestAnimationFrame(() => {
      const diff = currentY - lastScrollTop;

      // Near top of screen: always visible
      if (currentY <= 15) {
        setDockHidden(false);
      } else if (diff > 8 && currentY > 40) {
        // Dragging/scrolling down into content -> hide bottom dock
        setDockHidden(true);
      } else if (diff < -8) {
        // Dragging/scrolling up towards top -> show bottom dock
        setDockHidden(false);
      }
      lastScrollTop = Math.max(0, currentY);
    });
  }, { passive: true, capture: true });

  // 2. High-precision touch gesture detection (swipe physics)
  document.addEventListener('touchstart', event => {
    if (event.touches.length === 1) {
      touchStartY = event.touches[0].clientY;
      touchStartX = event.touches[0].clientX;
    }
  }, { passive: true });

  document.addEventListener('touchmove', event => {
    if (touchStartY === null || event.touches.length !== 1) return;
    const currentY = event.touches[0].clientY;
    const currentX = event.touches[0].clientX;
    const deltaY = currentY - touchStartY;
    const deltaX = currentX - touchStartX;

    // Trigger only on intentional vertical drags
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 12) {
      if (deltaY < -10) {
        // Swiping up -> scrolling down into content -> hide dock
        setDockHidden(true);
      } else if (deltaY > 10) {
        // Swiping down -> scrolling up towards top -> show dock
        setDockHidden(false);
      }
    }
  }, { passive: true });

  document.addEventListener('touchend', () => {
    touchStartY = null;
    touchStartX = null;
  }, { passive: true });

  // 3. Keep dock visible on tab selection or dialog interactions
  document.addEventListener('click', event => {
    if (event.target.closest('nav button') || event.target.closest('#ai-center-btn')) {
      setDockHidden(false);
    }
  }, true);

  // ------------------------------------------------------------------------
  // BESPOKE FACE ID, BIOMETRICS & SECURITY ENGINE
  // ------------------------------------------------------------------------
  const FACE_ID_ICON_SVG = '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8V6a2 2 0 0 1 2-2h2"/><path d="M4 16v2a2 2 0 0 0 2 2h2"/><path d="M16 4h2a2 2 0 0 1 2 2v2"/><path d="M16 20h2a2 2 0 0 0 2-2v-2"/><path d="M9 10h.01"/><path d="M15 10h.01"/><path d="M9.5 15a3.5 3.5 0 0 0 5 0"/><path d="M12 11v2"/></svg>';
  const SHIELD_ICON_SVG = '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
  const LOCK_ICON_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';

  function triggerHaptic(type) {
    try {
      if (window.Capacitor?.Plugins?.Haptics) {
        window.Capacitor.Plugins.Haptics.notification({ type: (type || 'success').toUpperCase() });
        return;
      }
      if (navigator.vibrate) {
        navigator.vibrate(type === 'error' ? [60] : [20, 40, 20]);
      }
    } catch (e) {}
  }

  function showToast(message) {
    let toast = document.getElementById('nw-floating-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'nw-floating-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('nw-toast-show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.remove('nw-toast-show');
    }, 2800);
  }

  async function triggerFaceIDVerification() {
    if (!window.isSecureContext) {
      throw new Error('A biometria requer HTTPS no iPhone ou localhost.');
    }
    if (!window.PublicKeyCredential) {
      throw new Error('WebAuthn / Biometria não suportada neste navegador.');
    }
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    const userId = new Uint8Array(16);
    crypto.getRandomValues(userId);

    try {
      const cred = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'NWallet', id: window.location.hostname },
          user: { id: userId, name: 'usuario@nwallet.com', displayName: 'NWallet' },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },
            { alg: -257, type: 'public-key' }
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'preferred'
          },
          timeout: 60000
        }
      });
      return { ok: true, cred };
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        throw new Error('Autenticação Face ID cancelada ou recusada.');
      }
      throw new Error(err.message || 'Falha ao autenticar com Face ID.');
    }
  }

  let biometricsOverlay = null;
  let privacyOverlay = null;
  let lockOverlay = null;

  function ensureModals() {
    if (biometricsOverlay) return;

    // 1. Biometrics Modal
    biometricsOverlay = document.createElement('div');
    biometricsOverlay.id = 'nw-biometrics-modal';
    biometricsOverlay.className = 'nw-modal-overlay';
    biometricsOverlay.innerHTML = `
      <div class="nw-modal-card" role="dialog" aria-modal="true" aria-label="Senha e Biometria">
        <div class="nw-modal-handle"></div>
        <div class="nw-modal-header">
          <div class="nw-modal-icon-box">${FACE_ID_ICON_SVG}</div>
          <div>
            <h3 class="nw-modal-title">Senha e Biometria</h3>
            <p class="nw-modal-subtitle">Proteção de acesso com Face ID e Touch ID</p>
          </div>
        </div>

        <div class="nw-card-box">
          <div class="nw-row-between">
            <div>
              <strong style="font-size:14px;display:block;">Exigir Face ID ao entrar</strong>
              <span style="font-size:11px;color:#9ba5b4;">Protege seus saldos ao iniciar o NWallet</span>
            </div>
            <label class="nw-switch">
              <input type="checkbox" id="nw-bio-toggle" />
              <span class="nw-slider"></span>
            </label>
          </div>
        </div>

        <div class="nw-card-box">
          <button type="button" class="nw-btn-action nw-btn-primary" id="nw-bio-test-btn">
            ${FACE_ID_ICON_SVG}
            <span>Testar Face ID agora</span>
          </button>
          <div class="nw-status-box" id="nw-bio-status"></div>
        </div>

        <div class="nw-card-box">
          <div class="nw-row-between" style="margin-bottom:12px;">
            <div>
              <strong style="font-size:14px;display:block;">PIN de Contingência</strong>
              <span style="font-size:11px;color:#9ba5b4;">Usado caso a biometria falhe</span>
            </div>
            <strong id="nw-current-pin-display" style="font-size:14px;letter-spacing:4px;color:#81c784;">••••</strong>
          </div>
          <button type="button" class="nw-btn-action nw-btn-secondary" id="nw-change-pin-btn" style="padding:10px 14px;font-size:12px;">
            Alterar PIN de 4 dígitos
          </button>
          <div id="nw-pin-change-box" style="display:none;margin-top:12px;">
            <input type="password" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" placeholder="Novo PIN" id="nw-new-pin-input" class="nw-pin-input" style="max-width:160px;font-size:20px;padding:8px;" />
            <div style="display:flex;gap:8px;margin-top:8px;">
              <button type="button" class="nw-btn-action nw-btn-secondary" id="nw-cancel-pin-btn" style="flex:1;padding:8px;">Cancelar</button>
              <button type="button" class="nw-btn-action nw-btn-primary" id="nw-save-pin-btn" style="flex:1;padding:8px;">Salvar PIN</button>
            </div>
          </div>
        </div>

        <div class="nw-card-box" style="background:rgba(82,183,83,0.06);border-color:rgba(82,183,83,0.2);">
          <p style="font-size:11px;color:#9ba5b4;line-height:1.5;margin:0;">
            <strong style="color:#81c784;">Dica iPhone:</strong> O NWallet conecta ao Face ID nativo do iOS via WebAuthn. Caso o Face ID esteja desativado nos Ajustes do seu iPhone ou em conexões sem HTTPS, use seu PIN de contingência (padrão: <strong>1234</strong>).
          </p>
        </div>

        <div style="display:flex;gap:10px;margin-top:16px;">
          <button type="button" class="nw-btn-action nw-btn-secondary" id="nw-lock-now-btn" style="flex:1;">
            ${LOCK_ICON_SVG} Bloquear app
          </button>
          <button type="button" class="nw-btn-action nw-btn-primary" id="nw-close-bio-btn" style="flex:1;">
            Concluir
          </button>
        </div>
      </div>
    `;

    // 2. Privacy Modal
    privacyOverlay = document.createElement('div');
    privacyOverlay.id = 'nw-privacy-modal';
    privacyOverlay.className = 'nw-modal-overlay';
    privacyOverlay.innerHTML = `
      <div class="nw-modal-card" role="dialog" aria-modal="true" aria-label="Privacidade">
        <div class="nw-modal-handle"></div>
        <div class="nw-modal-header">
          <div class="nw-modal-icon-box" style="background:rgba(59,130,246,0.15);border-color:rgba(59,130,246,0.3);color:#60a5fa;">
            ${SHIELD_ICON_SVG}
          </div>
          <div>
            <h3 class="nw-modal-title">Privacidade e Segurança</h3>
            <p class="nw-modal-subtitle">Seus dados pertencem 100% a você</p>
          </div>
        </div>

        <div class="nw-card-box">
          <div style="display:flex;gap:12px;margin-bottom:12px;">
            <div style="color:#81c784;font-size:18px;">🛡️</div>
            <div>
              <strong style="font-size:13px;display:block;">Armazenamento Local e Seguro</strong>
              <p style="font-size:11px;color:#9ba5b4;margin-top:2px;">Seus dados e históricos residem exclusivamente no seu container (volume privado). Nenhum dado bancário é vendido ou compartilhado.</p>
            </div>
          </div>
          <div style="display:flex;gap:12px;margin-bottom:12px;">
            <div style="color:#60a5fa;font-size:18px;">🔒</div>
            <div>
              <strong style="font-size:13px;display:block;">Criptografia Ponta a Ponta</strong>
              <p style="font-size:11px;color:#9ba5b4;margin-top:2px;">Comunicações via HTTPS protegido e notificações assinadas por chaves VAPID individuais geradas na sua instalação.</p>
            </div>
          </div>
          <div style="display:flex;gap:12px;">
            <div style="color:#a78bfa;font-size:18px;">👁️</div>
            <div>
              <strong style="font-size:13px;display:block;">Zero Rastreamento Externo</strong>
              <p style="font-size:11px;color:#9ba5b4;margin-top:2px;">Sem Google Analytics, Facebook Pixel ou cookies de terceiros.</p>
            </div>
          </div>
        </div>

        <button type="button" class="nw-btn-action nw-btn-primary" id="nw-close-privacy-btn">
          Entendi
        </button>
      </div>
    `;

    // 3. Lock Screen Overlay
    lockOverlay = document.createElement('div');
    lockOverlay.id = 'nw-faceid-lock-overlay';
    lockOverlay.innerHTML = `
      <div class="nw-lock-scanner-box">
        ${FACE_ID_ICON_SVG}
      </div>
      <h2 style="font-size:24px;font-weight:800;margin-bottom:6px;font-family:sans-serif;">NWallet Protegido</h2>
      <p style="font-size:13px;color:#9ba5b4;margin-bottom:28px;text-align:center;max-width:280px;" id="nw-lock-msg">
        Autentique com Face ID para acessar suas finanças
      </p>

      <div style="width:100%;max-width:320px;display:flex;flex-direction:column;gap:12px;" id="nw-lock-main-actions">
        <button type="button" class="nw-btn-action nw-btn-primary" id="nw-lock-faceid-btn" style="padding:16px;">
          ${FACE_ID_ICON_SVG}
          <span>Entrar com Face ID</span>
        </button>
        <button type="button" class="nw-btn-action nw-btn-secondary" id="nw-lock-use-pin-btn" style="padding:14px;">
          Entrar com PIN de segurança
        </button>
      </div>

      <div style="width:100%;max-width:280px;display:none;flex-direction:column;align-items:center;" id="nw-lock-pin-box">
        <p style="font-size:12px;color:#9ba5b4;margin-bottom:8px;">Digite seu PIN de 4 dígitos (padrão: 1234):</p>
        <input type="password" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" placeholder="••••" id="nw-lock-pin-input" class="nw-pin-input" />
        <p id="nw-lock-pin-error" style="color:#fca5a5;font-size:12px;display:none;margin-top:4px;">PIN incorreto</p>
        <div style="display:flex;gap:10px;width:100%;margin-top:12px;">
          <button type="button" class="nw-btn-action nw-btn-secondary" id="nw-lock-pin-cancel-btn" style="flex:1;">Voltar</button>
          <button type="button" class="nw-btn-action nw-btn-primary" id="nw-lock-pin-confirm-btn" style="flex:1;">Entrar</button>
        </div>
      </div>
    `;

    document.body.appendChild(biometricsOverlay);
    document.body.appendChild(privacyOverlay);
    document.body.appendChild(lockOverlay);

    // Biometrics Event Handlers
    const bioToggle = document.getElementById('nw-bio-toggle');
    const bioStatus = document.getElementById('nw-bio-status');
    const bioTestBtn = document.getElementById('nw-bio-test-btn');
    const closeBioBtn = document.getElementById('nw-close-bio-btn');
    const lockNowBtn = document.getElementById('nw-lock-now-btn');
    const changePinBtn = document.getElementById('nw-change-pin-btn');
    const pinChangeBox = document.getElementById('nw-pin-change-box');
    const cancelPinBtn = document.getElementById('nw-cancel-pin-btn');
    const savePinBtn = document.getElementById('nw-save-pin-btn');
    const newPinInput = document.getElementById('nw-new-pin-input');

    if (bioToggle) {
      bioToggle.checked = localStorage.getItem('nwallet_faceid_enabled') !== 'false';
      bioToggle.addEventListener('change', () => {
        const enabled = bioToggle.checked;
        localStorage.setItem('nwallet_faceid_enabled', enabled ? 'true' : 'false');
        showToast(enabled ? 'Face ID ativado no NWallet' : 'Face ID desativado');
        triggerHaptic('success');
        refine();
      });
    }

    if (bioTestBtn) {
      bioTestBtn.addEventListener('click', async () => {
        bioStatus.className = 'nw-status-box nw-status-info';
        bioStatus.textContent = 'Solicitando autenticação Face ID...';
        try {
          await triggerFaceIDVerification();
          bioStatus.className = 'nw-status-box nw-status-success';
          bioStatus.textContent = '✓ Face ID autenticado com sucesso!';
          triggerHaptic('success');
        } catch (err) {
          bioStatus.className = 'nw-status-box nw-status-error';
          bioStatus.textContent = '✕ ' + err.message;
          triggerHaptic('error');
        }
      });
    }

    if (closeBioBtn) {
      closeBioBtn.addEventListener('click', () => {
        biometricsOverlay.classList.remove('nw-visible');
      });
    }

    if (lockNowBtn) {
      lockNowBtn.addEventListener('click', () => {
        biometricsOverlay.classList.remove('nw-visible');
        window.nwLockApp();
      });
    }

    biometricsOverlay.addEventListener('click', e => {
      if (e.target === biometricsOverlay) biometricsOverlay.classList.remove('nw-visible');
    });

    if (changePinBtn && pinChangeBox) {
      changePinBtn.addEventListener('click', () => {
        pinChangeBox.style.display = 'block';
        changePinBtn.style.display = 'none';
        newPinInput.value = '';
        newPinInput.focus();
      });
    }
    if (cancelPinBtn && pinChangeBox) {
      cancelPinBtn.addEventListener('click', () => {
        pinChangeBox.style.display = 'none';
        changePinBtn.style.display = 'block';
      });
    }
    if (savePinBtn && newPinInput) {
      savePinBtn.addEventListener('click', () => {
        const val = (newPinInput.value || '').trim();
        if (/^[0-9]{4}$/.test(val)) {
          localStorage.setItem('nwallet_pin', val);
          showToast('Novo PIN de 4 dígitos salvo');
          pinChangeBox.style.display = 'none';
          changePinBtn.style.display = 'block';
          triggerHaptic('success');
        } else {
          alert('O PIN deve conter exatamente 4 números.');
        }
      });
    }

    // Privacy Handlers
    const closePrivacyBtn = document.getElementById('nw-close-privacy-btn');
    if (closePrivacyBtn) {
      closePrivacyBtn.addEventListener('click', () => {
        privacyOverlay.classList.remove('nw-visible');
      });
    }
    privacyOverlay.addEventListener('click', e => {
      if (e.target === privacyOverlay) privacyOverlay.classList.remove('nw-visible');
    });

    // Lock Overlay Handlers
    const lockFaceIdBtn = document.getElementById('nw-lock-faceid-btn');
    const lockUsePinBtn = document.getElementById('nw-lock-use-pin-btn');
    const lockMainActions = document.getElementById('nw-lock-main-actions');
    const lockPinBox = document.getElementById('nw-lock-pin-box');
    const lockPinInput = document.getElementById('nw-lock-pin-input');
    const lockPinCancelBtn = document.getElementById('nw-lock-pin-cancel-btn');
    const lockPinConfirmBtn = document.getElementById('nw-lock-pin-confirm-btn');
    const lockPinError = document.getElementById('nw-lock-pin-error');
    const lockMsg = document.getElementById('nw-lock-msg');

    if (lockFaceIdBtn) {
      lockFaceIdBtn.addEventListener('click', async () => {
        try {
          lockMsg.textContent = 'Escaneando Face ID...';
          await triggerFaceIDVerification();
          triggerHaptic('success');
          window.nwUnlockApp();
        } catch (err) {
          lockMsg.textContent = err.message;
          triggerHaptic('error');
        }
      });
    }

    if (lockUsePinBtn && lockPinBox && lockMainActions) {
      lockUsePinBtn.addEventListener('click', () => {
        lockMainActions.style.display = 'none';
        lockPinBox.style.display = 'flex';
        lockPinError.style.display = 'none';
        lockPinInput.value = '';
        lockPinInput.focus();
      });
    }

    if (lockPinCancelBtn && lockPinBox && lockMainActions) {
      lockPinCancelBtn.addEventListener('click', () => {
        lockPinBox.style.display = 'none';
        lockMainActions.style.display = 'flex';
      });
    }

    function verifyPin() {
      const entered = (lockPinInput.value || '').trim();
      const actual = localStorage.getItem('nwallet_pin') || '1234';
      if (entered === actual) {
        triggerHaptic('success');
        window.nwUnlockApp();
      } else {
        lockPinError.style.display = 'block';
        triggerHaptic('error');
        lockPinInput.value = '';
        lockPinInput.focus();
      }
    }

    if (lockPinConfirmBtn) lockPinConfirmBtn.addEventListener('click', verifyPin);
    if (lockPinInput) {
      lockPinInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') verifyPin();
      });
      lockPinInput.addEventListener('input', () => {
        if (lockPinInput.value.length === 4) verifyPin();
      });
    }
  }

  // --- Global Public API ---
  window.nwOpenNotifications = window.nwOpenNotifications || function() {
    const notifBtn = document.getElementById('notif-btn') || document.getElementById('desktop-notif-btn');
    if (notifBtn) {
      notifBtn.click();
      return;
    }
    const walletNav = document.getElementById('nav-wallet');
    if (walletNav) {
      walletNav.click();
      setTimeout(() => {
        const tabs = document.querySelectorAll('.nf-tabs button');
        for (const tab of tabs) {
          if (tab.textContent.includes('Notificações')) {
            tab.click();
            break;
          }
        }
      }, 150);
    }
  };

  window.nwOpenBiometrics = function() {
    ensureModals();
    const toggle = document.getElementById('nw-bio-toggle');
    if (toggle) toggle.checked = localStorage.getItem('nwallet_faceid_enabled') !== 'false';
    const statusBox = document.getElementById('nw-bio-status');
    if (statusBox) statusBox.style.display = 'none';
    const pinChangeBox = document.getElementById('nw-pin-change-box');
    if (pinChangeBox) pinChangeBox.style.display = 'none';
    const changePinBtn = document.getElementById('nw-change-pin-btn');
    if (changePinBtn) changePinBtn.style.display = 'block';
    biometricsOverlay.classList.add('nw-visible');
  };

  window.nwOpenPrivacy = function() {
    ensureModals();
    privacyOverlay.classList.add('nw-visible');
  };

  window.nwToggleVisibility = function() {
    const current = localStorage.getItem('nwallet_profile_visibility') || 'Público';
    const next = current === 'Público' ? 'Privado' : 'Público';
    localStorage.setItem('nwallet_profile_visibility', next);
    showToast(`Visibilidade do perfil: ${next}`);
    triggerHaptic('success');
    refine();
  };

  window.nwLockApp = function() {
    ensureModals();
    sessionStorage.removeItem('nwallet_unlocked');
    sessionStorage.setItem('nwallet_explicit_locked', 'true');
    const msg = document.getElementById('nw-lock-msg');
    if (msg) msg.textContent = 'Autentique com Face ID para acessar suas finanças';
    const mainActions = document.getElementById('nw-lock-main-actions');
    if (mainActions) mainActions.style.display = 'flex';
    const pinBox = document.getElementById('nw-lock-pin-box');
    if (pinBox) pinBox.style.display = 'none';
    lockOverlay.classList.add('nw-locked');
  };

  window.nwUnlockApp = function() {
    sessionStorage.setItem('nwallet_unlocked', 'true');
    sessionStorage.removeItem('nwallet_explicit_locked');
    if (lockOverlay) lockOverlay.classList.remove('nw-locked');
    showToast('NWallet Desbloqueado');
  };

  // Delegated capturing click listener for settings buttons
  document.addEventListener('click', event => {
    const btn = event.target.closest('button');
    if (!btn) return;
    const text = (btn.textContent || '').trim();
    if (text.includes('Notificações') && (text.includes('Sons e Vibração') || text.includes('Sons e Vibra'))) {
      event.preventDefault();
      event.stopPropagation();
      window.nwOpenNotifications();
    } else if (text.includes('Senha e Biometria') || text.includes('FaceID')) {
      event.preventDefault();
      event.stopPropagation();
      window.nwOpenBiometrics();
    } else if (text.includes('Privacidade') && btn.closest('section')) {
      event.preventDefault();
      event.stopPropagation();
      window.nwOpenPrivacy();
    } else if (text.includes('Visibilidade do Perfil')) {
      event.preventDefault();
      event.stopPropagation();
      window.nwToggleVisibility();
    } else if (text.includes('Sair da Conta')) {
      event.preventDefault();
      event.stopPropagation();
      window.nwLockApp();
    }
  }, true);

  // MutationObserver for continuous DOM stabilization
  new MutationObserver(() => {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(refine);
    }
  }).observe(root, { childList: true, subtree: true, characterData: true });

  root.addEventListener('click', event => {
    if (!root.querySelector('.nw-entry-panel')) {
      opener = event.target.closest('button');
    }
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(refine);
    }
  }, true);

  // Keyboard trap for entry dialog & escape for bespoke modals
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (biometricsOverlay?.classList.contains('nw-visible')) {
        biometricsOverlay.classList.remove('nw-visible');
        return;
      }
      if (privacyOverlay?.classList.contains('nw-visible')) {
        privacyOverlay.classList.remove('nw-visible');
        return;
      }
    }
    const panel = root.querySelector('.nw-entry-panel');
    if (!panel) return;
    if (event.key === 'Escape') {
      const close = panel.querySelector('[data-nw-close]');
      if (close) {
        event.preventDefault();
        close.click();
      }
    }
    if (event.key === 'Tab') {
      const fields = [
        ...panel.querySelectorAll('button,input,select,textarea,a[href],[tabindex]')
      ].filter(e => !e.disabled && e.tabIndex >= 0 && e.getClientRects().length);
      if (!fields.length) return;
      const first = fields[0], last = fields[fields.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  refine();

  if (sessionStorage.getItem('nwallet_explicit_locked') === 'true' && sessionStorage.getItem('nwallet_unlocked') !== 'true') {
    setTimeout(window.nwLockApp, 100);
  }
})();
