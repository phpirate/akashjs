/**
 * Material Design 3 Skeleton component.
 *
 * Placeholder shimmer effect for loading states.
 */

import { defineComponent } from '@akashjs/runtime';

export interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string;
  height?: string;
  animation?: 'pulse' | 'wave';
}

function injectSkeletonStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById('akash-skeleton-styles')) return;

  const style = document.createElement('style');
  style.id = 'akash-skeleton-styles';
  style.textContent = `
    @keyframes akash-skeleton-pulse {
      0% { opacity: 1; }
      50% { opacity: 0.4; }
      100% { opacity: 1; }
    }
    @keyframes akash-skeleton-wave {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `;
  document.head.appendChild(style);
}

export const Skeleton = defineComponent<SkeletonProps>((ctx) => {
  injectSkeletonStyles();

  const {
    variant = 'text',
    width,
    height,
    animation = 'pulse',
  } = ctx.props;

  return () => {
    const el = document.createElement('div');
    el.setAttribute('aria-hidden', 'true');

    const variantStyles: Record<string, { borderRadius: string; w: string; h: string }> = {
      text: { borderRadius: '4px', w: '100%', h: '1em' },
      circular: { borderRadius: '50%', w: '40px', h: '40px' },
      rectangular: { borderRadius: '4px', w: '100%', h: '120px' },
    };

    const v = variantStyles[variant] ?? variantStyles.text;

    const bgColor = 'var(--md-sys-color-surface-container-highest, #e6e0e9)';

    let animationCSS = '';
    if (animation === 'pulse') {
      animationCSS = `animation: akash-skeleton-pulse 1.5s ease-in-out infinite;`;
    } else {
      animationCSS = `
        background: linear-gradient(
          90deg,
          ${bgColor} 25%,
          var(--md-sys-color-surface-container-low, #f7f2fa) 50%,
          ${bgColor} 75%
        );
        background-size: 200% 100%;
        animation: akash-skeleton-wave 1.5s linear infinite;
      `;
    }

    el.style.cssText = `
      display: block;
      width: ${width ?? v.w};
      height: ${height ?? v.h};
      border-radius: ${v.borderRadius};
      ${animation === 'pulse' ? `background-color: ${bgColor};` : ''}
      ${animationCSS}
    `;

    return el;
  };
});
