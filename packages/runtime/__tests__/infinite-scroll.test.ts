/** @vitest-environment happy-dom */
import { describe, it, expect } from 'vitest';
import { useInfiniteScroll } from '../src/infinite-scroll.js';

describe('useInfiniteScroll', () => {
  it('returns sentinel/loading/done/reset/dispose', () => {
    const scroll = useInfiniteScroll({
      onLoadMore: async () => {},
      hasMore: () => true,
    });

    expect(typeof scroll.sentinel).toBe('function');
    expect(typeof scroll.loading).toBe('function');
    expect(typeof scroll.done).toBe('function');
    expect(typeof scroll.reset).toBe('function');
    expect(typeof scroll.dispose).toBe('function');
  });

  it('loading starts false', () => {
    const scroll = useInfiniteScroll({
      onLoadMore: async () => {},
      hasMore: () => true,
    });

    expect(scroll.loading()).toBe(false);
  });

  it('done starts false', () => {
    const scroll = useInfiniteScroll({
      onLoadMore: async () => {},
      hasMore: () => true,
    });

    expect(scroll.done()).toBe(false);
  });

  it('reset resets done to false', () => {
    const scroll = useInfiniteScroll({
      onLoadMore: async () => {},
      hasMore: () => false,
    });

    // Manually test reset behavior
    scroll.reset();
    expect(scroll.done()).toBe(false);
    expect(scroll.loading()).toBe(false);
  });
});
