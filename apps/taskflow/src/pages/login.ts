/**
 * Login page — centered card on gradient background.
 */

import { signal, effect, createElement, createRateLimiter } from '@akashjs/runtime';

const loginLimiter = createRateLimiter({ maxAttempts: 5, windowMs: 60000 });
import { authStore } from '../stores/auth.js';

export function renderLoginPage(container: HTMLElement): void {
  container.innerHTML = '';

  // --- Reactive state ---
  const email = signal('');
  const password = signal('');
  const error = signal('');
  const loading = signal(false);

  // --- Wrapper with gradient background ---
  const wrapper = createElement('div');
  Object.assign(wrapper.style, {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #6750A4 0%, #3b82f6 100%)',
    padding: '24px',
  });

  // --- Card ---
  const card = createElement('div');
  Object.assign(card.style, {
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-xl)',
    boxShadow: 'var(--shadow-xl)',
    padding: '48px 40px',
    width: '100%',
    maxWidth: '420px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  });

  // --- Logo area ---
  const logoArea = createElement('div');
  Object.assign(logoArea.style, { textAlign: 'center', marginBottom: '8px' });

  const logoIcon = createElement('div');
  Object.assign(logoIcon.style, {
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, #6750A4, #3b82f6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
    fontSize: '24px',
    color: '#fff',
    fontWeight: '700',
  });
  logoIcon.textContent = 'T';

  const logoTitle = createElement('h1');
  Object.assign(logoTitle.style, {
    fontSize: 'var(--font-2xl)',
    fontWeight: '700',
    color: 'var(--color-on-surface)',
    letterSpacing: '-0.02em',
  });
  logoTitle.textContent = 'TaskFlow';

  const tagline = createElement('p');
  Object.assign(tagline.style, {
    fontSize: 'var(--font-base)',
    color: 'var(--color-on-surface-variant)',
    marginTop: '4px',
  });
  tagline.textContent = 'Manage projects with clarity and speed.';

  logoArea.append(logoIcon, logoTitle, tagline);

  // --- Error message ---
  const errorEl = createElement('div');
  Object.assign(errorEl.style, {
    background: 'var(--color-error-container)',
    color: 'var(--color-error)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    fontSize: 'var(--font-sm)',
    display: 'none',
  });
  effect(() => {
    const msg = error();
    errorEl.textContent = msg;
    errorEl.style.display = msg ? 'block' : 'none';
  });

  // --- Form ---
  const form = createElement('form');
  Object.assign(form.style, {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleLogin();
  });

  // Email field
  const emailLabel = createElement('label');
  Object.assign(emailLabel.style, {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: 'var(--font-sm)',
    fontWeight: '500',
    color: 'var(--color-on-surface-variant)',
  });
  emailLabel.textContent = 'Email';

  const emailInput = createElement('input') as HTMLInputElement;
  emailInput.type = 'email';
  emailInput.placeholder = 'maamoon@taskflow.dev';
  emailInput.autocomplete = 'email';
  Object.assign(emailInput.style, {
    width: '100%',
  });
  emailInput.addEventListener('input', () => {
    email.set(emailInput.value);
    error.set('');
  });
  emailLabel.appendChild(emailInput);

  // Password field
  const passwordLabel = createElement('label');
  Object.assign(passwordLabel.style, {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: 'var(--font-sm)',
    fontWeight: '500',
    color: 'var(--color-on-surface-variant)',
  });
  passwordLabel.textContent = 'Password';

  const passwordInput = createElement('input') as HTMLInputElement;
  passwordInput.type = 'password';
  passwordInput.placeholder = 'Any password works for demo';
  Object.assign(passwordInput.style, {
    width: '100%',
  });
  passwordInput.addEventListener('input', () => {
    password.set(passwordInput.value);
    error.set('');
  });
  passwordLabel.appendChild(passwordInput);

  // --- Sign In button ---
  const signInBtn = createElement('button');
  signInBtn.type = 'submit';
  Object.assign(signInBtn.style, {
    background: 'var(--color-primary)',
    color: 'var(--color-on-primary)',
    borderRadius: 'var(--radius-full)',
    padding: '12px 24px',
    fontSize: 'var(--font-md)',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    transition: 'background var(--transition-fast), transform var(--transition-fast)',
    marginTop: '8px',
  });
  signInBtn.textContent = 'Sign In';
  signInBtn.addEventListener('mouseenter', () => {
    signInBtn.style.background = 'var(--color-primary-light)';
    signInBtn.style.transform = 'translateY(-1px)';
  });
  signInBtn.addEventListener('mouseleave', () => {
    signInBtn.style.background = 'var(--color-primary)';
    signInBtn.style.transform = 'translateY(0)';
  });

  form.append(emailLabel, passwordLabel, signInBtn);

  // --- Divider ---
  const divider = createElement('div');
  Object.assign(divider.style, {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: 'var(--color-outline)',
    fontSize: 'var(--font-sm)',
  });
  const line1 = createElement('div');
  Object.assign(line1.style, { flex: '1', height: '1px', background: 'var(--color-outline-variant)' });
  const orText = createElement('span');
  orText.textContent = 'or';
  const line2 = createElement('div');
  Object.assign(line2.style, { flex: '1', height: '1px', background: 'var(--color-outline-variant)' });
  divider.append(line1, orText, line2);

  // --- Try Demo button ---
  const demoBtn = createElement('button');
  demoBtn.type = 'button';
  Object.assign(demoBtn.style, {
    background: 'var(--color-surface-container)',
    color: 'var(--color-primary)',
    borderRadius: 'var(--radius-full)',
    padding: '12px 24px',
    fontSize: 'var(--font-md)',
    fontWeight: '600',
    border: '1px solid var(--color-outline-variant)',
    cursor: 'pointer',
    transition: 'background var(--transition-fast), border-color var(--transition-fast)',
  });
  demoBtn.textContent = 'Try Demo';
  demoBtn.addEventListener('mouseenter', () => {
    demoBtn.style.background = 'var(--color-surface-container-high)';
    demoBtn.style.borderColor = 'var(--color-primary)';
  });
  demoBtn.addEventListener('mouseleave', () => {
    demoBtn.style.background = 'var(--color-surface-container)';
    demoBtn.style.borderColor = 'var(--color-outline-variant)';
  });
  demoBtn.addEventListener('click', () => {
    authStore.loginAsDemo();
  });

  // --- Hint ---
  const hint = createElement('p');
  Object.assign(hint.style, {
    textAlign: 'center',
    fontSize: 'var(--font-xs)',
    color: 'var(--color-outline)',
    marginTop: '4px',
  });
  hint.textContent = 'Hint: use any demo email (maamoon@taskflow.dev) with any password.';

  // --- Assemble card ---
  card.append(logoArea, errorEl, form, divider, demoBtn, hint);
  wrapper.appendChild(card);
  container.appendChild(wrapper);

  // --- Login handler ---
  function handleLogin(): void {
    const e = email().trim();
    const p = password();
    if (!e) { error.set('Please enter your email address.'); return; }
    if (!p) { error.set('Please enter your password.'); return; }

    // Prevent brute-force login attempts
    if (!loginLimiter.check()) {
      error.set('Too many attempts. Please wait a minute before trying again.');
      return;
    }

    loading.set(true);
    // Simulate brief delay
    setTimeout(() => {
      const ok = authStore.login(e, p);
      loading.set(false);
      if (!ok) {
        error.set('Invalid email. Try maamoon@taskflow.dev, sarah@taskflow.dev, or alex@taskflow.dev.');
      }
    }, 300);
  }
}
