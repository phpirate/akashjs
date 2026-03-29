/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  useQueryState,
  useQueryStates,
  clearQueryState,
  getQueryParams,
  resetQueryState,
} from '../src/query-state.js';

beforeEach(() => {
  // Reset URL and state between tests
  window.history.replaceState(null, '', '/');
  resetQueryState();
});

describe('useQueryState', () => {
  it('returns a signal with the default value', () => {
    const search = useQueryState('q', '');
    expect(search()).toBe('');
  });

  it('reads initial value from URL', () => {
    window.history.replaceState(null, '', '/?q=hello');
    const search = useQueryState('q', '');
    expect(search()).toBe('hello');
  });

  it('updates the URL when signal is set', () => {
    const search = useQueryState('q', '');
    search.set('akashjs');
    expect(window.location.search).toContain('q=akashjs');
  });

  it('removes param when set back to default', () => {
    const search = useQueryState('q', '');
    search.set('test');
    expect(window.location.search).toContain('q=test');
    search.set('');
    expect(window.location.search).not.toContain('q=');
  });

  it('handles number values', () => {
    const page = useQueryState('page', 1);
    expect(page()).toBe(1);
    page.set(3);
    expect(window.location.search).toContain('page=3');
  });

  it('reads number from URL', () => {
    window.history.replaceState(null, '', '/?page=5');
    const page = useQueryState('page', 1);
    expect(page()).toBe(5);
  });

  it('handles boolean values', () => {
    const debug = useQueryState('debug', false);
    debug.set(true);
    expect(window.location.search).toContain('debug=true');
  });

  it('reads boolean from URL', () => {
    window.history.replaceState(null, '', '/?debug=true');
    const debug = useQueryState('debug', false);
    expect(debug()).toBe(true);
  });

  it('handles array values', () => {
    const tags = useQueryState('tags', [] as string[]);
    tags.set(['js', 'ts']);
    expect(window.location.search).toContain('tags=js%2Cts');
  });

  it('reads array from URL', () => {
    window.history.replaceState(null, '', '/?tags=js,ts');
    const tags = useQueryState('tags', [] as string[]);
    expect(tags()).toEqual(['js', 'ts']);
  });

  it('supports update()', () => {
    const count = useQueryState('count', 0);
    count.update((c) => c + 1);
    expect(count()).toBe(1);
    expect(window.location.search).toContain('count=1');
  });

  it('preserves other params when updating', () => {
    window.history.replaceState(null, '', '/?existing=yes');
    const search = useQueryState('q', '');
    search.set('test');
    expect(window.location.search).toContain('existing=yes');
    expect(window.location.search).toContain('q=test');
  });
});

describe('useQueryStates', () => {
  it('creates multiple synced signals', () => {
    const { q, page } = useQueryStates({
      q: { default: '' },
      page: { default: 1 },
    });
    expect(q()).toBe('');
    expect(page()).toBe(1);
  });

  it('reads from URL', () => {
    window.history.replaceState(null, '', '/?q=hello&page=3');
    const { q, page } = useQueryStates({
      q: { default: '' },
      page: { default: 1 },
    });
    expect(q()).toBe('hello');
    expect(page()).toBe(3);
  });

  it('updates URL on set', () => {
    const { q, page } = useQueryStates({
      q: { default: '' },
      page: { default: 1 },
    });
    q.set('test');
    page.set(2);
    expect(window.location.search).toContain('q=test');
    expect(window.location.search).toContain('page=2');
  });
});

describe('clearQueryState', () => {
  it('removes all query params and resets signals', () => {
    const search = useQueryState('q', '');
    search.set('test');
    expect(window.location.search).toContain('q=test');

    clearQueryState();
    expect(window.location.search).toBe('');
    expect(search()).toBe('');
  });
});

describe('getQueryParams', () => {
  it('returns current params as object', () => {
    window.history.replaceState(null, '', '/?a=1&b=2');
    expect(getQueryParams()).toEqual({ a: '1', b: '2' });
  });

  it('returns empty object when no params', () => {
    window.history.replaceState(null, '', '/');
    expect(getQueryParams()).toEqual({});
  });
});
