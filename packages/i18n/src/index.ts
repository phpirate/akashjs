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

export type Messages = Record<string, string | Messages>;
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
  const result: FlatMessages = {};
  for (const [key, value] of Object.entries(messages)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      result[fullKey] = value;
    } else {
      Object.assign(result, flattenMessages(value, fullKey));
    }
  }
  return result;
}

// --- Interpolation ---

function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return key in params ? String(params[key]) : `{${key}}`;
  });
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

  // Initialize with static messages
  if (config.messages) {
    const initial: Record<string, FlatMessages> = {};
    for (const [loc, msgs] of Object.entries(config.messages)) {
      initial[loc] = flattenMessages(msgs);
    }
    loadedMessages.set(initial);
  }

  // Get flat messages for current locale
  const currentMessages = computed(() => {
    const msgs = loadedMessages();
    return msgs[locale()] ?? {};
  });

  const fallbackMessages = computed(() => {
    if (!config.fallbackLocale) return {};
    return loadedMessages()[config.fallbackLocale] ?? {};
  });

  function t(key: string, params?: Record<string, string | number>): string {
    // Check for pluralization
    if (params && 'count' in params) {
      const count = Number(params.count);
      const rules = config.pluralRules ?? DEFAULT_PLURAL_RULES;
      const rule = rules[locale()] ?? rules.en;
      const pluralKey = `${key}.${rule(count)}`;

      const pluralTemplate = currentMessages()[pluralKey]
        ?? fallbackMessages()[pluralKey];
      if (pluralTemplate) {
        return interpolate(pluralTemplate, params);
      }
    }

    const template = currentMessages()[key]
      ?? fallbackMessages()[key]
      ?? key;

    return params ? interpolate(template, params) : template;
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
