// NWallet System Refinements & Bespoke Component Engine
// Custom Tooltips, Invisible Scroll, Emoji-to-SVG Icons, Checkboxes, Menus & Calendar Refinements.
(() => {
  const root = document.getElementById('root');
  if (!root) return;

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
  }

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

  // Keyboard trap for entry dialog
  document.addEventListener('keydown', event => {
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
})();
