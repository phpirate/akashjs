/**
 * Material Design ripple effect.
 *
 * Adds an ink ripple animation on click/touch.
 * Used by Button, IconButton, Card, List items, etc.
 */

export function addRipple(el: HTMLElement): void {
  el.style.position = 'relative';
  el.style.overflow = 'hidden';

  el.addEventListener('pointerdown', (e: PointerEvent) => {
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.style.cssText = `
      position: absolute;
      border-radius: 50%;
      background: currentColor;
      opacity: 0.12;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      transform: scale(0);
      pointer-events: none;
      animation: akash-ripple 450ms cubic-bezier(0.2, 0, 0, 1) forwards;
    `;

    el.appendChild(ripple);

    const remove = () => {
      ripple.style.opacity = '0';
      ripple.style.transition = 'opacity 300ms';
      setTimeout(() => ripple.remove(), 300);
    };

    el.addEventListener('pointerup', remove, { once: true });
    el.addEventListener('pointerleave', remove, { once: true });
  });
}

/** Inject the ripple keyframes CSS (call once) */
export function injectRippleStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById('akash-ripple-styles')) return;

  const style = document.createElement('style');
  style.id = 'akash-ripple-styles';
  style.textContent = `
    @keyframes akash-ripple {
      to { transform: scale(1); }
    }
  `;
  document.head.appendChild(style);
}
