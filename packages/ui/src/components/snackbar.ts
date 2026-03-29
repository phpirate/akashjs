/**
 * Material Design 3 Snackbar component.
 *
 * Brief message at the bottom of the screen with optional action.
 */

import { defineComponent, onMount } from '@akashjs/runtime';

export interface SnackbarAction {
  label: string;
  onClick: () => void;
}

export interface SnackbarProps {
  message: string;
  action?: SnackbarAction;
  duration?: number;
  onDismiss?: () => void;
}

export const Snackbar = defineComponent<SnackbarProps>((ctx) => {
  const {
    message,
    action,
    duration = 4000,
    onDismiss,
  } = ctx.props;

  // Auto-dismiss after duration
  if (duration > 0 && onDismiss) {
    onMount(() => {
      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    });
  }

  return () => {
    const snackbar = document.createElement('div');
    snackbar.setAttribute('role', 'status');
    snackbar.setAttribute('aria-live', 'polite');

    snackbar.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 3000;
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 288px;
      max-width: 560px;
      padding: 14px 16px;
      border-radius: 4px;
      background-color: var(--md-sys-color-inverse-surface, #313033);
      color: var(--md-sys-color-inverse-on-surface, #f4eff4);
      box-shadow: 0 4px 8px 3px rgba(0,0,0,0.15), 0 1px 3px 0 rgba(0,0,0,0.3);
      font-family: inherit;
      font-size: 14px;
      line-height: 20px;
      letter-spacing: 0.25px;
      box-sizing: border-box;
      animation: akash-snackbar-in 200ms cubic-bezier(0.2, 0, 0, 1) forwards;
    `;

    // Inject animation once
    if (typeof document !== 'undefined' && !document.getElementById('akash-snackbar-styles')) {
      const style = document.createElement('style');
      style.id = 'akash-snackbar-styles';
      style.textContent = `
        @keyframes akash-snackbar-in {
          from { opacity: 0; transform: translateX(-50%) translateY(16px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `;
      document.head.appendChild(style);
    }

    // --- Message ---
    const messageEl = document.createElement('span');
    messageEl.textContent = message;
    messageEl.style.cssText = 'flex: 1;';
    snackbar.appendChild(messageEl);

    // --- Action button ---
    if (action) {
      const actionBtn = document.createElement('button');
      actionBtn.type = 'button';
      actionBtn.textContent = action.label;
      actionBtn.style.cssText = `
        border: none;
        background: none;
        color: var(--md-sys-color-inverse-primary, #d0bcff);
        font-family: inherit;
        font-size: 14px;
        font-weight: 500;
        letter-spacing: 0.1px;
        line-height: 20px;
        padding: 0 8px;
        cursor: pointer;
        white-space: nowrap;
      `;
      actionBtn.addEventListener('click', action.onClick);
      snackbar.appendChild(actionBtn);
    }

    // --- Close button ---
    if (onDismiss) {
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.setAttribute('aria-label', 'Dismiss');
      closeBtn.textContent = '\u2715';
      closeBtn.style.cssText = `
        border: none;
        background: none;
        color: var(--md-sys-color-inverse-on-surface, #f4eff4);
        font-size: 16px;
        cursor: pointer;
        padding: 0 4px;
        opacity: 0.7;
      `;
      closeBtn.addEventListener('click', onDismiss);
      snackbar.appendChild(closeBtn);
    }

    return snackbar;
  };
});
