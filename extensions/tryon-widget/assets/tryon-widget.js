/**
 * assets/tryon-widget.js
 * Inserta un botón "Probar prenda" y abre un modal con un <iframe>
 * que carga SIEMPRE a través del App Proxy:
 *   /apps/tryon/widget?shop=<shop>&productId=<gid o id numérico>
 *
 * Idempotente: si se ejecuta dos veces no duplica UI.
 */
(() => {
  const SELECTOR = '[data-tryon-root]';
  const APP_PROXY_IFRAME_PATH = '/apps/tryon/widget';

  // ---- utilidades ----------------------------------------------------------
  const qs = (root, sel) => root.querySelector(sel);
  const ce = (tag, cls) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    return el;
  };

  const buildIframeSrc = ({ shop, productId }) => {
    const params = new URLSearchParams();
    if (shop) params.set('shop', shop);
    if (productId) params.set('productId', productId);
    return `${APP_PROXY_IFRAME_PATH}?${params.toString()}`;
  };

  const ensureBaseCSS = () => {
    if (document.getElementById('tryon-widget-base-css')) return;
    const css = `
      .tryon-modal__backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:2147483000;opacity:0;transition:opacity .18s ease}
      .tryon-modal__wrap{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:2147483001;pointer-events:none}
      .tryon-modal__content{width:min(980px,96vw);height:min(80vh,720px);background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.25);transform:translateY(6px);transition:transform .18s ease;pointer-events:auto}
      .tryon-modal--open .tryon-modal__backdrop{opacity:1}
      .tryon-modal--open .tryon-modal__content{transform:translateY(0)}
      .tryon-btn{appearance:none;border:0;border-radius:8px;padding:10px 14px;background:#111;color:#fff;font:600 14px/1.2 system-ui, -apple-system, Segoe UI, Roboto;cursor:pointer}
      .tryon-btn:focus{outline:2px solid #0a5}
      .tryon-iframe{width:100%;height:100%;border:0;display:block;background:#fff}
      .tryon-modal__close{position:absolute;top:10px;right:12px;border:0;background:transparent;font:700 22px/1 system-ui;cursor:pointer;color:#444}
      .tryon-modal__close:focus{outline:2px solid #0a5}
    `;
    const style = ce('style');
    style.id = 'tryon-widget-base-css';
    style.textContent = css;
    document.head.appendChild(style);
  };

  // ---- modal ---------------------------------------------------------------
  const createModal = (iframeSrc) => {
    ensureBaseCSS();

    const state = { open: false };

    const backdrop = ce('div', 'tryon-modal__backdrop');
    const wrap = ce('div', 'tryon-modal__wrap');
    const content = ce('div', 'tryon-modal__content');
    const closeBtn = ce('button', 'tryon-modal__close');
    closeBtn.setAttribute('aria-label', 'Cerrar');
    closeBtn.textContent = '×';

    const iframe = ce('iframe', 'tryon-iframe');
    iframe.src = iframeSrc;
    iframe.allow = 'camera; microphone; fullscreen; clipboard-read; clipboard-write';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';

    content.appendChild(closeBtn);
    content.appendChild(iframe);
    wrap.appendChild(content);

    const root = ce('div', 'tryon-modal');
    root.appendChild(backdrop);
    root.appendChild(wrap);

    const open = () => {
      if (state.open) return;
      state.open = true;
      document.body.appendChild(root);
      root.classList.add('tryon-modal--open');

      const onKey = (e) => e.key === 'Escape' && close();
      const onClickBackdrop = (e) => e.target === backdrop && close();
      backdrop.addEventListener('click', onClickBackdrop);
      closeBtn.addEventListener('click', close);
      document.addEventListener('keydown', onKey);

      state.cleanup = () => {
        backdrop.removeEventListener('click', onClickBackdrop);
        closeBtn.removeEventListener('click', close);
        document.removeEventListener('keydown', onKey);
      };
    };

    const close = () => {
      if (!state.open) return;
      state.open = false;
      root.classList.remove('tryon-modal--open');
      state.cleanup && state.cleanup();
      root.remove();
    };

    // Soporte para auto-resize/cerrar vía postMessage desde el iframe
    const onMessage = (ev) => {
      try {
        if (!ev || !ev.data) return;
        const msg = ev.data.__tryon;
        if (!msg) return;
        if (msg.type === 'resize' && typeof msg.height === 'number') {
          content.style.height = Math.min(Math.max(msg.height, 360), window.innerHeight * 0.95) + 'px';
        } else if (msg.type === 'close') {
          close();
        }
      } catch (_) {}
    };
    window.addEventListener('message', onMessage);

    return { open, close };
  };

  // ---- inicialización ------------------------------------------------------
  const initRoot = (root) => {
    if (!root || root.__tryonInited) return;
    root.__tryonInited = true;

    const shop = root.dataset.shop || '';
    const productId = root.dataset.productId || '';
    const label = root.dataset.buttonLabel || 'Probar prenda';
    const inline = root.dataset.embed === 'inline'; // opcional: data-embed="inline"

    const iframeSrc = buildIframeSrc({ shop, productId });

    if (inline) {
      // Modo "inline" (sin modal) – útil para pruebas
      const iframe = ce('iframe', 'tryon-iframe');
      iframe.style.minHeight = '520px';
      iframe.src = iframeSrc;
      root.appendChild(iframe);
      return;
    }

    // Botón + modal (por defecto)
    const btn = ce('button', 'tryon-btn');
    btn.type = 'button';
    btn.textContent = label;

    const modal = createModal(iframeSrc);
    btn.addEventListener('click', () => modal.open());

    // Limpia el contenedor antes de montar (idempotente)
    root.innerHTML = '';
    root.appendChild(btn);
  };

  const initAll = () => {
    document.querySelectorAll(SELECTOR).forEach(initRoot);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll, { once: true });
  } else {
    initAll();
  }
})();