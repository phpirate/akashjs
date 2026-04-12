/**
 * @akashjs/i18n — Signal-based internationalization.
 *
 * ```ts
 * const i18n = createI18n({
 *   defaultLocale: 'en',
 *   messages: {
 *     en: { greeting: 'Hello, {name}!' },
 *     es: { greeting: '¡Hola, {name}!' },
 *   },
 * });
 *
 * const { t, locale, setLocale } = i18n;
 * t('greeting', { name: 'World' }); // 'Hello, World!'
 * setLocale('es');
 * t('greeting', { name: 'Mundo' }); // '¡Hola, Mundo!'
 * ```
 */

import { signal, computed } from '@akashjs/runtime';
import type { ReadonlySignal } from '@akashjs/runtime';

// --- Types ---

export interface Messages { [key: string]: string | Messages; }
export type FlatMessages = Record<string, string>;
export type LocaleMessages = Record<string, Messages>;

export interface I18nConfig {
  /** Default locale */
  defaultLocale: string;
  /** Static messages keyed by locale */
  messages?: LocaleMessages;
  /** Lazy-load messages for a locale */
  loadMessages?: (locale: string) => Promise<Messages>;
  /** Fallback locale when key is missing */
  fallbackLocale?: string;
  /** Pluralization rules */
  pluralRules?: Record<string, (count: number) => string>;
  /** Sanitize message templates (escape HTML). Default: true */
  sanitize?: boolean;
}

export interface I18n {
  /** Translate a key with optional interpolation params */
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Current locale (reactive signal) */
  locale: ReadonlySignal<string>;
  /** Set the current locale */
  setLocale: (locale: string) => Promise<void>;
  /** Check if a translation key exists */
  te: (key: string) => boolean;
  /** Get all available locales */
  availableLocales: () => string[];
}

// --- Flatten nested messages ---

function flattenMessages(messages: Messages, prefix = ''): FlatMessages {
  const result: FlatMessages = Object.create(null);
  for (const [key, value] of Object.entries(messages)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      if (fullKey in result) {
        console.warn(`[AkashJS i18n] Duplicate key "${fullKey}" — nested object and flat dotted key both define this path. The flat key will be used.`);
      }
      result[fullKey] = value;
    } else {
      Object.assign(result, flattenMessages(value, fullKey));
    }
  }
  return result;
}

// --- Interpolation ---

function escapeHtml(str: string): string {
  if (typeof str !== 'string') return String(str);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function interpolate(template: string, params: Record<string, string | number>, sanitize = true): string {
  // Replace placeholders first, then sanitize the entire result.
  // This escapes both the template text AND the interpolated values.
  const result = template.replace(/\{(\w+)\}/g, (_, key) => {
    return key in params ? String(params[key]) : `{${key}}`;
  });
  return sanitize ? escapeHtml(result) : result;
}

// --- Pluralization ---

const DEFAULT_PLURAL_RULES: Record<string, (count: number) => string> = {
  en: (count: number) => (count === 1 ? 'one' : 'other'),
  es: (count: number) => (count === 1 ? 'one' : 'other'),
  fr: (count: number) => (count <= 1 ? 'one' : 'other'),
  ar: (count: number) => {
    if (count === 0) return 'zero';
    if (count === 1) return 'one';
    if (count === 2) return 'two';
    if (count >= 3 && count <= 10) return 'few';
    if (count >= 11 && count <= 99) return 'many';
    return 'other';
  },
};

// --- createI18n ---

/**
 * Create an i18n instance with signal-based locale switching.
 */
export function createI18n(config: I18nConfig): I18n {
  const locale = signal(config.defaultLocale);
  const loadedMessages = signal<Record<string, FlatMessages>>({});
  const shouldSanitize = config.sanitize !== false; // default true

  // Initialize with static messages
  if (config.messages) {
    const initial: Record<string, FlatMessages> = {};
    for (const [loc, msgs] of Object.entries(config.messages)) {
      initial[loc] = flattenMessages(msgs);
    }
    loadedMessages.set(initial);
  }

  // Get flat messages for current locale
  const emptyMessages: FlatMessages = Object.create(null);

  const currentMessages = computed(() => {
    const msgs = loadedMessages();
    return msgs[locale()] ?? emptyMessages;
  });

  const fallbackMessages = computed(() => {
    const fallbackLoc = config.fallbackLocale ?? config.defaultLocale;
    if (fallbackLoc === locale()) return emptyMessages;
    return loadedMessages()[fallbackLoc] ?? emptyMessages;
  });

  function t(key: string, params?: Record<string, string | number>): string {
    // Check for pluralization — accept 'count' or 'n' as the plural param
    const pluralCount = params && ('count' in params ? params.count : 'n' in params ? params.n : undefined);
    if (pluralCount !== undefined) {
      const count = Number(pluralCount);
      const rules = config.pluralRules ?? DEFAULT_PLURAL_RULES;
      const rule = rules[locale()] ?? rules.en;
      const pluralKey = `${key}.${rule(count)}`;

      const pluralTemplate = currentMessages()[pluralKey]
        ?? fallbackMessages()[pluralKey];
      if (pluralTemplate) {
        return interpolate(pluralTemplate, params!, shouldSanitize);
      }
    }

    // Direct key lookup
    const template = currentMessages()[key]
      ?? fallbackMessages()[key];

    if (template !== undefined && typeof template === 'string') {
      // Handle pipe-separated plural forms: "singular | plural" or "zero | one | many"
      if (pluralCount !== undefined && template.includes(' | ')) {
        const forms = template.split(' | ');
        const count = Number(pluralCount);
        let form: string;
        if (forms.length === 3) {
          form = count === 0 ? forms[0] : count === 1 ? forms[1] : forms[2];
        } else if (forms.length === 2) {
          form = count === 1 ? forms[0] : forms[1];
        } else {
          form = forms[forms.length - 1];
        }
        return params ? interpolate(form, params, shouldSanitize) : (shouldSanitize ? escapeHtml(form) : form);
      }
      return params ? interpolate(template, params, shouldSanitize) : (shouldSanitize ? escapeHtml(template) : template);
    }

    // Key not found directly — check if fallback has pluralization sub-keys
    if (params) {
      const n = 'count' in params ? params.count : 'n' in params ? params.n : undefined;
      if (n !== undefined) {
        const count = Number(n);
        const rules = config.pluralRules ?? DEFAULT_PLURAL_RULES;
        const fallbackLoc = config.fallbackLocale ?? config.defaultLocale;
        const rule = rules[fallbackLoc] ?? rules.en;
        const pluralKey = `${key}.${rule(count)}`;
        const fallbackTemplate = fallbackMessages()[pluralKey];
        if (fallbackTemplate) {
          return interpolate(fallbackTemplate, params, shouldSanitize);
        }
      }
    }

    return key;
  }

  function te(key: string): boolean {
    return key in currentMessages() || key in fallbackMessages();
  }

  async function setLocale(newLocale: string): Promise<void> {
    // Load messages if not already loaded
    const msgs = loadedMessages();
    if (!msgs[newLocale] && config.loadMessages) {
      const loaded = await config.loadMessages(newLocale);
      loadedMessages.set({
        ...loadedMessages(),
        [newLocale]: flattenMessages(loaded),
      });
    }
    locale.set(newLocale);
  }

  function availableLocales(): string[] {
    return Object.keys(loadedMessages());
  }

  return {
    t,
    locale: () => locale(),
    te,
    setLocale,
    availableLocales,
  };
}
