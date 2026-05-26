/**
 * Material Design 3 Progress components.
 *
 * Linear progress bar and circular progress indicator.
 */

import { defineComponent } from '@akashjs/runtime';

// --- ProgressBar ---

export interface ProgressBarProps {
  value?: number;
  variant?: 'determinate' | 'indeterminate';
  label?: string;
}

function injectProgressStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById('akash-progress-styles')) return;

  const style = document.createElement('style');
  style.id = 'akash-progress-styles';
  style.textContent = `
    @keyframes akash-progress-indeterminate {
      0% { left: -40%; width: 40%; }
      50% { left: 60%; width: 30%; }
      100% { left: 100%; width: 10%; }
    }
    @keyframes akash-progress-circular-rotate {
      100% { transform: rotate(360deg); }
    }
    @keyframes akash-progress-circular-dash {
      0% { stroke-dasharray: 1, 200; stroke-dashoffset: 0; }
      50% { stroke-dasharray: 89, 200; stroke-dashoffset: -35; }
      100% { stroke-dasharray: 89, 200; stroke-dashoffset: -124; }
    }
  `;
  document.head.appendChild(style);
}

export const ProgressBar = defineComponent<ProgressBarProps>((ctx) => {
  injectProgressStyles();

  const {
    value = 0,
    variant = 'determinate',
    label,
  } = ctx.props;

  return () => {
    const track = document.createElement('div');
    track.setAttribute('role', 'progressbar');
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', '100');
    track.setAttribute('aria-label', label ?? 'Progress');

    if (variant === 'determinate') {
      track.setAttribute('aria-valuenow', String(Math.round(value)));
    }

    track.style.cssText = `
      position: relative;
      width: 100%;
      height: 4px;
      border-radius: 2px;
      background-color: var(--md-sys-color-surface-container-highest, #e6e0e9);
      overflow: hidden;
    `;

    const indicator = document.createElement('div');

    if (variant === 'determinate') {
      const clamped = Math.max(0, Math.min(100, value));
      indicator.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: ${clamped}%;
        border-radius: 2px;
        background-color: var(--md-sys-color-primary, #6750a4);
        transition: width 200ms cubic-bezier(0.2, 0, 0, 1);
      `;
    } else {
      indicator.style.cssText = `
        position: absolute;
        top: 0;
        height: 100%;
        border-radius: 2px;
        background-color: var(--md-sys-color-primary, #6750a4);
        animation: akash-progress-indeterminate 2s cubic-bezier(0.65, 0, 0.35, 1) infinite;
      `;
    }

    track.appendChild(indicator);
    return track;
  };
});

// --- ProgressCircular ---

export interface ProgressCircularProps {
  value?: number;
  size?: number;
  variant?: 'determinate' | 'indeterminate';
  label?: string;
}

export const ProgressCircular = defineComponent<ProgressCircularProps>((ctx) => {
  injectProgressStyles();

  const {
    value = 0,
    size = 48,
    variant = 'indeterminate',
    label,
  } = ctx.props;

  return () => {
    const container = document.createElement('div');
    container.setAttribute('role', 'progressbar');
    container.setAttribute('aria-valuemin', '0');
    container.setAttribute('aria-valuemax', '100');
    container.setAttribute('aria-label', label ?? 'Progress');

    if (variant === 'determinate') {
      container.setAttribute('aria-valuenow', String(Math.round(value)));
    }

    container.style.cssText = `
      display: inline-flex;
      width: ${size}px;
      height: ${size}px;
      ${variant === 'indeterminate' ? `animation: akash-progress-circular-rotate 1.4s linear infinite;` : ''}
    `;

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 44 44');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));

    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', '22');
    circle.setAttribute('cy', '22');
    circle.setAttribute('r', '20');
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke-width', '4');

    // Track
    const trackCircle = document.createElementNS(svgNS, 'circle');
    trackCircle.setAttribute('cx', '22');
    trackCircle.setAttribute('cy', '22');
    trackCircle.setAttribute('r', '20');
    trackCircle.setAttribute('fill', 'none');
    trackCircle.setAttribute('stroke-width', '4');
    trackCircle.setAttribute('stroke', 'var(--md-sys-color-surface-container-highest, #e6e0e9)');
    svg.appendChild(trackCircle);

    if (variant === 'determinate') {
      const circumference = 2 * Math.PI * 20;
      const clamped = Math.max(0, Math.min(100, value));
      const offset = circumference - (clamped / 100) * circumference;

      circle.setAttribute('stroke', 'var(--md-sys-color-primary, #6750a4)');
      circle.setAttribute('stroke-dasharray', String(circumference));
      circle.setAttribute('stroke-dashoffset', String(offset));
      circle.setAttribute('stroke-linecap', 'round');
      circle.style.cssText = `
        transform: rotate(-90deg);
        transform-origin: center;
        transition: stroke-dashoffset 200ms cubic-bezier(0.2, 0, 0, 1);
      `;
    } else {
      circle.setAttribute('stroke', 'var(--md-sys-color-primary, #6750a4)');
      circle.setAttribute('stroke-linecap', 'round');
      circle.style.cssText = `
        animation: akash-progress-circular-dash 1.4s ease-in-out infinite;
      `;
    }

    svg.appendChild(circle);
    container.appendChild(svg);
    return container;
  };
});
