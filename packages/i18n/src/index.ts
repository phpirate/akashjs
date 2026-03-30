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
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return key in params ? escapeHtml(String(params[key])) : `{${key}}`;
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
        return interpolate(pluralTemplate, params!);
      }
    }

    // Direct key lookup — also check if this is a pluralization key
    // that needs fallback (e.g., key missing in current locale but exists in fallback)
    const template = currentMessages()[key]
      ?? fallbackMessages()[key];

    if (template !== undefined) {
      return params ? interpolate(template, params) : template;
    }

    // Key not found directly — check if fallback has pluralization sub-keys
    if (params) {
      const n = 'count' in params ? params.count : 'n' in params ? params.n : undefined;
      if (n !== undefined) {
        const count = Number(n);
        const rules = config.pluralRules ?? DEFAULT_PLURAL_RULES;
        // Use fallback locale's rule when current locale has no translation
        const fallbackLoc = config.fallbackLocale ?? config.defaultLocale;
        const rule = rules[fallbackLoc] ?? rules.en;
        const pluralKey = `${key}.${rule(count)}`;
        const fallbackTemplate = fallbackMessages()[pluralKey];
        if (fallbackTemplate) {
          return interpolate(fallbackTemplate, params);
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
