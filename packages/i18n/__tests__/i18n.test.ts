import { describe, it, expect } from 'vitest';
import { createI18n } from '../src/index.js';

describe('createI18n', () => {
  it('translates a simple key', () => {
    const i18n = createI18n({
      defaultLocale: 'en',
      messages: { en: { hello: 'Hello' } },
    });
    expect(i18n.t('hello')).toBe('Hello');
  });

  it('returns the key when not found', () => {
    const i18n = createI18n({
      defaultLocale: 'en',
      messages: { en: {} },
    });
    expect(i18n.t('missing.key')).toBe('missing.key');
  });

  it('interpolates parameters', () => {
    const i18n = createI18n({
      defaultLocale: 'en',
      messages: { en: { greeting: 'Hello, {name}!' } },
    });
    expect(i18n.t('greeting', { name: 'Alice' })).toBe('Hello, Alice!');
  });

  it('handles multiple parameters', () => {
    const i18n = createI18n({
      defaultLocale: 'en',
      messages: { en: { msg: '{a} and {b}' } },
    });
    expect(i18n.t('msg', { a: 'X', b: 'Y' })).toBe('X and Y');
  });

  it('leaves unknown params as placeholders', () => {
    const i18n = createI18n({
      defaultLocale: 'en',
      messages: { en: { msg: 'Hello {name}' } },
    });
    expect(i18n.t('msg')).toBe('Hello {name}');
  });
});

describe('nested messages', () => {
  it('flattens nested message objects', () => {
    const i18n = createI18n({
      defaultLocale: 'en',
      messages: {
        en: {
          nav: { home: 'Home', about: 'About' },
          footer: { copyright: '© 2026' },
        },
      },
    });
    expect(i18n.t('nav.home')).toBe('Home');
    expect(i18n.t('footer.copyright')).toBe('© 2026');
  });
});

describe('locale switching', () => {
  it('switches locale', async () => {
    const i18n = createI18n({
      defaultLocale: 'en',
      messages: {
        en: { hello: 'Hello' },
        es: { hello: 'Hola' },
      },
    });

    expect(i18n.t('hello')).toBe('Hello');
    await i18n.setLocale('es');
    expect(i18n.t('hello')).toBe('Hola');
  });

  it('exposes current locale', async () => {
    const i18n = createI18n({
      defaultLocale: 'en',
      messages: { en: {}, fr: {} },
    });
    expect(i18n.locale()).toBe('en');
    await i18n.setLocale('fr');
    expect(i18n.locale()).toBe('fr');
  });
});

describe('fallback locale', () => {
  it('falls back to fallbackLocale when key is missing', async () => {
    const i18n = createI18n({
      defaultLocale: 'fr',
      fallbackLocale: 'en',
      messages: {
        en: { hello: 'Hello', goodbye: 'Goodbye' },
        fr: { hello: 'Bonjour' },
      },
    });
    expect(i18n.t('hello')).toBe('Bonjour');
    expect(i18n.t('goodbye')).toBe('Goodbye'); // falls back to en
  });
});

describe('te() — key existence', () => {
  it('returns true for existing keys', () => {
    const i18n = createI18n({
      defaultLocale: 'en',
      messages: { en: { hello: 'Hello' } },
    });
    expect(i18n.te('hello')).toBe(true);
  });

  it('returns false for missing keys', () => {
    const i18n = createI18n({
      defaultLocale: 'en',
      messages: { en: {} },
    });
    expect(i18n.te('missing')).toBe(false);
  });
});

describe('availableLocales', () => {
  it('lists loaded locales', () => {
    const i18n = createI18n({
      defaultLocale: 'en',
      messages: { en: {}, fr: {}, de: {} },
    });
    expect(i18n.availableLocales()).toEqual(['en', 'fr', 'de']);
  });
});

describe('lazy loading', () => {
  it('loads messages on demand', async () => {
    const i18n = createI18n({
      defaultLocale: 'en',
      messages: { en: { hello: 'Hello' } },
      loadMessages: async (locale) => {
        if (locale === 'ja') return { hello: 'こんにちは' };
        return {};
      },
    });

    await i18n.setLocale('ja');
    expect(i18n.t('hello')).toBe('こんにちは');
  });
});

describe('pluralization', () => {
  it('handles English plurals', () => {
    const i18n = createI18n({
      defaultLocale: 'en',
      messages: {
        en: {
          items: {
            one: '{count} item',
            other: '{count} items',
          },
        },
      },
    });
    expect(i18n.t('items', { count: 1 })).toBe('1 item');
    expect(i18n.t('items', { count: 5 })).toBe('5 items');
    expect(i18n.t('items', { count: 0 })).toBe('0 items');
  });

  it('handles pipe-separated plural forms (2 forms)', () => {
    const i18n = createI18n({
      defaultLocale: 'en',
      messages: { en: { items: '{count} item | {count} items' } },
    });
    expect(i18n.t('items', { count: 1 })).toBe('1 item');
    expect(i18n.t('items', { count: 5 })).toBe('5 items');
    expect(i18n.t('items', { count: 0 })).toBe('0 items');
  });

  it('handles pipe-separated plural forms (3 forms)', () => {
    const i18n = createI18n({
      defaultLocale: 'en',
      messages: { en: { items: 'no items | {count} item | {count} items' } },
    });
    expect(i18n.t('items', { count: 0 })).toBe('no items');
    expect(i18n.t('items', { count: 1 })).toBe('1 item');
    expect(i18n.t('items', { count: 5 })).toBe('5 items');
  });
});
