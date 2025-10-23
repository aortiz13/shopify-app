/**
 * assets/tryon-widget.js
 * Widget del Probador Virtual con detección de contexto
 * - En theme editor: usa HOST externo (Cloudflare)
 * - En tienda real: usa App Proxy local
 */
(() => {
  const SELECTOR = '[data-tryon-root]';
  const APP_PROXY_IFRAME_PATH = '/apps/tryon/widget';

  // ---- Detección de contexto ----------------------------------------------
  const isThemeEditor = () => {
    return window.location.hostname.includes('myshopify.com') && 
           (window.parent !== window || document.referrer.includes('admin.shopify.com'));
  };

  const isPreviewMode = () => {
    return window.location.search.includes('preview_theme_id') || 
           window.location.search.includes('oseid=');
  };

  // ---- Utilidades ---------------------------------------------------------
  const qs = (root, sel) => root.querySelector(sel);
  const ce = (tag, cls) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    return el;
  };

  const buildIframeSrc = ({ shop, productId, host }) => {
    const params = new URLSearchParams();
    if (shop) params.set('shop', shop);
    if (productId) params.set('productId', productId);

    // Si estamos en theme editor o preview, usar HOST externo
    if ((isThemeEditor() || isPreviewMode()) && host) {
      return `${host}/widget?${params.toString()}`;
    }
    
    // En producción, usar App Proxy
    return `${APP_PROXY_IFRAME_PATH}?${params.toString()}`;
  };

  const ensureBaseCSS = () => {
    if (document.getElementById('tryon-widget-base-css')) return;
    const css = `
      .tryon-modal__backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:2147483000;opacity:0;transition:opacity .18s ease}
      .tryon-modal__wrap{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:2147483001;pointer-events:none}
      .tryon-modal__content{width:min(980px,96vw);height:min(80vh,720px);background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.25);transform:translateY(6px);transition:transform .18s ease;pointer-events:auto;position:relative}
      .tryon-modal--open .tryon-modal__backdrop{opacity:1}
      .tryon-modal--open .tryon-modal__content{transform:translateY(0)}
      .tryon-btn{appearance:none;border:0;border-radius:8px;padding:10px 14px;background:#111;color:#fff;font:600 14px/1.2 system-ui, -apple-system, Segoe UI, Roboto;cursor:pointer;transition:background .15s ease}
      .tryon-btn:hover{background:#222}
      .tryon-btn:focus{outline:2px solid #0a5;outline-offset:2px}
      .tryon-btn:disabled{background:#666;cursor:not-allowed}
      .tryon-iframe{width:100%;height:100%;border:0;display:block;background:#f8f9fa}
      .tryon-modal__close{position:absolute;top:12px;right:12px;width:32px;height:32px;border:0;background:rgba(0,0,0,0.7);color:#fff;border-radius:50%;font:700 18px/1 system-ui;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:10}
      .tryon-modal__close:hover{background:rgba(0,0,0,0.9)}
      .tryon-modal__close:focus{outline:2px solid #0a5;outline-offset:2px}
      .tryon-loading{display:flex;align-items:center;justify-content:center;height:100%;font:14px system-ui;color:#666}
      .tryon-error{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;text-align:center;font:14px system-ui;color:#666}
      .tryon-error__title{font-weight:600;margin-bottom:8px;color:#d73027}
    `;
    const style = ce('style');
    style.id = 'tryon-widget-base-css';
    style.textContent = css;
    document.head.appendChild(style);
  };

  // ---- Modal --------------------------------------------------------------
  const createModal = ({ iframeSrc, fallbackSrc }) => {
    ensureBaseCSS();

    const state = { open: false, loaded: false, usingFallback: false };

    const backdrop = ce('div', 'tryon-modal__backdrop');
    const wrap = ce('div', 'tryon-modal__wrap');
    const content = ce('div', 'tryon-modal__content');
    const closeBtn = ce('button', 'tryon-modal__close');
    closeBtn.setAttribute('aria-label', 'Cerrar probador virtual');
    closeBtn.innerHTML = '&times;';

    // Loading state
    const loading = ce('div', 'tryon-loading');
    loading.textContent = 'Cargando probador virtual...';

    const iframe = ce('iframe', 'tryon-iframe');
    iframe.style.display = 'none'; // Oculto hasta que cargue

    // Permisos más específicos para el context
    if (isThemeEditor() || isPreviewMode()) {
      // En theme editor, permisos más restrictivos
      iframe.allow = 'camera *; microphone *; fullscreen *';
    } else {
      // En producción, permisos completos
      iframe.allow = 'camera; microphone; fullscreen; clipboard-read; clipboard-write';
    }
    
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.loading = 'lazy';

    // Handle iframe load/error
    let loadTimeout;

    const showError = (title, message) => {
      loading.innerHTML = `
        <div class="tryon-error">
          <div class="tryon-error__title">${title}</div>
          <div>${message}</div>
          <button onclick="this.parentElement.parentElement.parentElement.querySelector('.tryon-modal__close').click()"
                  style="margin-top:12px;padding:8px 16px;border:1px solid #ddd;background:#fff;border-radius:4px;cursor:pointer;">
            Cerrar
          </button>
        </div>
      `;
    };

    const restartLoadTimeout = () => {
      clearTimeout(loadTimeout);

      const timeoutMs = state.usingFallback ? 8000 : 5000;
      loadTimeout = setTimeout(() => {
        if (!state.loaded) {
          if (fallbackSrc && !state.usingFallback) {
            state.usingFallback = true;
            loading.textContent = 'Reconectando probador en modo de compatibilidad...';
            setIframeSrc(fallbackSrc);
            return;
          }

          showError(
            'Error de configuración',
            state.usingFallback
              ? 'No pudimos cargar el probador virtual incluso con el modo de compatibilidad.'
              : 'El probador no está disponible en el Theme Editor. Funcionará correctamente en la tienda publicada.'
          );
        }
      }, timeoutMs);
    };

    const setIframeSrc = (src) => {
      state.loaded = false;
      if (!state.usingFallback) {
        loading.textContent = 'Cargando probador virtual...';
      }
      loading.style.display = 'flex';
      iframe.style.display = 'none';
      iframe.src = src;
      restartLoadTimeout();
    };

    setIframeSrc(iframeSrc);

    iframe.onload = () => {
      clearTimeout(loadTimeout);
      state.loaded = true;
      loading.style.display = 'none';
      iframe.style.display = 'block';
    };

    iframe.onerror = () => {
      clearTimeout(loadTimeout);
      if (fallbackSrc && !state.usingFallback) {
        state.usingFallback = true;
        loading.textContent = 'Reconectando probador en modo de compatibilidad...';
        setIframeSrc(fallbackSrc);
        return;
      }

      showError('Error de conexión', 'No se pudo cargar el probador virtual');
    };

    content.appendChild(closeBtn);
    content.appendChild(loading);
    content.appendChild(iframe);
    wrap.appendChild(content);

    const root = ce('div', 'tryon-modal');
    root.appendChild(backdrop);
    root.appendChild(wrap);

    const open = () => {
      if (state.open) return;
      state.open = true;
      document.body.appendChild(root);
      
      // Pequeño delay para transición
      requestAnimationFrame(() => {
        root.classList.add('tryon-modal--open');
      });

      const onKey = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          close();
        }
      };
      
      const onClickBackdrop = (e) => {
        if (e.target === backdrop) {
          close();
        }
      };

      backdrop.addEventListener('click', onClickBackdrop);
      closeBtn.addEventListener('click', close);
      document.addEventListener('keydown', onKey);
      
      // Prevenir scroll del body
      document.body.style.overflow = 'hidden';

      state.cleanup = () => {
        backdrop.removeEventListener('click', onClickBackdrop);
        closeBtn.removeEventListener('click', close);
        document.removeEventListener('keydown', onKey);
        document.body.style.overflow = '';
      };
    };

    const close = () => {
      if (!state.open) return;
      state.open = false;
      root.classList.remove('tryon-modal--open');
      
      // Delay para permitir transición antes de remover
      setTimeout(() => {
        if (state.cleanup) state.cleanup();
        if (root.parentNode) {
          root.parentNode.removeChild(root);
        }
      }, 200);
    };

    // PostMessage handling
    const onMessage = (ev) => {
      try {
        if (!ev?.data?.__tryon) return;
        
        const msg = ev.data.__tryon;
        
        if (msg.type === 'resize' && typeof msg.height === 'number') {
          const maxHeight = window.innerHeight * 0.9;
          const newHeight = Math.min(Math.max(msg.height, 400), maxHeight);
          content.style.height = newHeight + 'px';
        } else if (msg.type === 'close') {
          close();
        }
      } catch (error) {
        console.warn('Error processing tryon message:', error);
      }
    };
    
    window.addEventListener('message', onMessage);

    return { open, close };
  };

  // ---- Inicialización -----------------------------------------------------
  const initRoot = (root) => {
    if (!root || root.__tryonInited) return;
    root.__tryonInited = true;

    const shop = root.dataset.shop || '';
    const productId = root.dataset.productId || '';
    const host = root.dataset.host || '';
    const label = root.dataset.buttonLabel || 'Probar prenda';
    const inline = root.dataset.embed === 'inline';

    // Validación básica
    if (!shop || !productId) {
      console.warn('TryOn Widget: Missing required data (shop, productId)');
      root.innerHTML = '<div style="color:#d73027;font-size:12px;">Error: Configuración incompleta del probador</div>';
      return;
    }

    const iframeSrc = buildIframeSrc({ shop, productId, host });

    if (inline) {
      // Modo inline (para testing)
      root.innerHTML = '';
      const iframe = ce('iframe', 'tryon-iframe');
      iframe.style.cssText = 'min-height:520px;width:100%;border:1px solid #ddd;border-radius:8px;';
      iframe.src = iframeSrc;
      iframe.allow = 'camera; microphone; fullscreen';
      root.appendChild(iframe);
      return;
    }

    // Modo modal (default)
    const btn = ce('button', 'tryon-btn');
    btn.type = 'button';
    btn.textContent = label;
    btn.setAttribute('aria-label', `Abrir probador virtual para ${label}`);

    const modal = createModal({
      iframeSrc,
      fallbackSrc: (isThemeEditor() || isPreviewMode()) && host ? buildIframeSrc({ shop, productId }) : null,
    });
    
   btn.addEventListener('click', (e) => {
  e.preventDefault();
  
  // En Theme Editor o Preview Mode, mostrar alerta en lugar de abrir modal
  if (isThemeEditor() || isPreviewMode()) {
    alert('✓ Probador Virtual configurado correctamente\n\nEl probador funcionará cuando:\n• Guardes los cambios en el Theme Editor\n• Publiques el theme\n• Visites una página de producto en tu tienda\n\nEn el Theme Editor solo verás esta vista previa.');
    return;
  }
  
  // En producción: abrir el modal normalmente
  modal.open();
});

    // Debug info en theme editor
    if (isThemeEditor() || isPreviewMode()) {
      const debugInfo = ce('div');
      debugInfo.style.cssText = 'font-size:10px;color:#666;margin-top:4px;';
      debugInfo.textContent = `Modo: ${isThemeEditor() ? 'Theme Editor' : 'Preview'} | URL: ${iframeSrc}`;
      root.innerHTML = '';
      root.appendChild(btn);
      root.appendChild(debugInfo);
    } else {
      root.innerHTML = '';
      root.appendChild(btn);
    }
  };

  const initAll = () => {
    document.querySelectorAll(SELECTOR).forEach(initRoot);
  };

  // Inicialización
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll, { once: true });
  } else {
    initAll();
  }

  // Re-init en cambios dinámicos (útil en theme editor)
  if (isThemeEditor()) {
    const observer = new MutationObserver(() => {
      initAll();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
})();