/**
 * Material Design 3 Avatar component.
 *
 * Circle with image or initials fallback.
 */

import { defineComponent } from '@akashjs/runtime';

export interface AvatarProps {
  src?: string;
  alt?: string;
  initials?: string;
  size?: 'small' | 'medium' | 'large';
}

export const Avatar = defineComponent<AvatarProps>((ctx) => {
  const {
    src,
    alt = '',
    initials = '',
    size = 'medium',
  } = ctx.props;

  return () => {
    const sizeMap = {
      small: { dimension: '28px', fontSize: '12px' },
      medium: { dimension: '40px', fontSize: '16px' },
      large: { dimension: '56px', fontSize: '22px' },
    };
    const s = sizeMap[size] ?? sizeMap.medium;

    const container = document.createElement('div');
    container.setAttribute('role', 'img');
    container.setAttribute('aria-label', alt || initials);

    container.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: ${s.dimension};
      height: ${s.dimension};
      border-radius: 50%;
      overflow: hidden;
      background-color: var(--md-sys-color-primary-container, #eaddff);
      color: var(--md-sys-color-on-primary-container, #21005d);
      font-family: inherit;
      font-size: ${s.fontSize};
      font-weight: 500;
      flex-shrink: 0;
      user-select: none;
    `;

    if (src) {
      const img = document.createElement('img');
      img.src = src;
      img.alt = alt;
      img.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
      `;

      // Fallback to initials on image error
      img.addEventListener('error', () => {
        img.remove();
        const fallback = document.createElement('span');
        fallback.textContent = initials.slice(0, 2).toUpperCase();
        container.appendChild(fallback);
      });

      container.appendChild(img);
    } else {
      const fallback = document.createElement('span');
      fallback.textContent = initials.slice(0, 2).toUpperCase();
      container.appendChild(fallback);
    }

    return container;
  };
});
