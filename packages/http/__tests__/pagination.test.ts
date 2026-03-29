import { describe, it, expect } from 'vitest';
import { createPagination, createCursorPagination } from '../src/pagination.js';

describe('createPagination', () => {
  it('starts at the initial page', () => {
    const pager = createPagination({ pageSize: 10, totalItems: 50 });
    expect(pager.page()).toBe(1);
  });

  it('starts at a custom initial page', () => {
    const pager = createPagination({ pageSize: 10, totalItems: 50, initialPage: 3 });
    expect(pager.page()).toBe(3);
  });

  it('computes totalPages', () => {
    const pager = createPagination({ pageSize: 10, totalItems: 55 });
    expect(pager.totalPages()).toBe(6);
  });

  it('computes totalPages as at least 1', () => {
    const pager = createPagination({ pageSize: 10, totalItems: 0 });
    expect(pager.totalPages()).toBe(1);
  });

  it('next goes to the next page', () => {
    const pager = createPagination({ pageSize: 10, totalItems: 50 });
    pager.next();
    expect(pager.page()).toBe(2);
  });

  it('next does not go past the last page', () => {
    const pager = createPagination({ pageSize: 10, totalItems: 20, initialPage: 2 });
    pager.next();
    expect(pager.page()).toBe(2);
  });

  it('prev goes to the previous page', () => {
    const pager = createPagination({ pageSize: 10, totalItems: 50, initialPage: 3 });
    pager.prev();
    expect(pager.page()).toBe(2);
  });

  it('prev does not go below page 1', () => {
    const pager = createPagination({ pageSize: 10, totalItems: 50 });
    pager.prev();
    expect(pager.page()).toBe(1);
  });

  it('goTo navigates to a specific page', () => {
    const pager = createPagination({ pageSize: 10, totalItems: 50 });
    pager.goTo(4);
    expect(pager.page()).toBe(4);
  });

  it('goTo clamps to valid range', () => {
    const pager = createPagination({ pageSize: 10, totalItems: 50 });
    pager.goTo(100);
    expect(pager.page()).toBe(5);
    pager.goTo(-1);
    expect(pager.page()).toBe(1);
  });

  it('reset returns to page 1', () => {
    const pager = createPagination({ pageSize: 10, totalItems: 50 });
    pager.goTo(4);
    pager.reset();
    expect(pager.page()).toBe(1);
  });

  it('offset returns the correct value', () => {
    const pager = createPagination({ pageSize: 10, totalItems: 50 });
    expect(pager.offset()).toBe(0);
    pager.next();
    expect(pager.offset()).toBe(10);
    pager.goTo(3);
    expect(pager.offset()).toBe(20);
  });

  it('hasNext and hasPrev report correctly', () => {
    const pager = createPagination({ pageSize: 10, totalItems: 30 });
    expect(pager.hasNext()).toBe(true);
    expect(pager.hasPrev()).toBe(false);

    pager.goTo(2);
    expect(pager.hasNext()).toBe(true);
    expect(pager.hasPrev()).toBe(true);

    pager.goTo(3);
    expect(pager.hasNext()).toBe(false);
    expect(pager.hasPrev()).toBe(true);
  });

  it('range returns from/to/total', () => {
    const pager = createPagination({ pageSize: 10, totalItems: 25 });
    expect(pager.range()).toEqual({ from: 1, to: 10, total: 25 });

    pager.goTo(3);
    expect(pager.range()).toEqual({ from: 21, to: 25, total: 25 });
  });

  it('supports a function for totalItems', () => {
    // totalItems as a function is called each time totalPages is computed
    const pager = createPagination({ pageSize: 10, totalItems: () => 50 });
    expect(pager.totalPages()).toBe(5);
  });
});

describe('createCursorPagination', () => {
  it('starts with null cursor', () => {
    const pager = createCursorPagination({ pageSize: 20 });
    expect(pager.cursor()).toBe(null);
  });

  it('starts with an initial cursor', () => {
    const pager = createCursorPagination({ pageSize: 20, initialCursor: 'abc' });
    expect(pager.cursor()).toBe('abc');
  });

  it('setNextCursor updates hasMore', () => {
    const pager = createCursorPagination({ pageSize: 20 });
    expect(pager.hasMore()).toBe(true);

    pager.setNextCursor('page2');
    expect(pager.hasMore()).toBe(true);

    pager.setNextCursor(null);
    expect(pager.hasMore()).toBe(false);
  });

  it('loadMore advances the cursor', () => {
    const pager = createCursorPagination({ pageSize: 20 });
    pager.setNextCursor('cursor-2');
    pager.loadMore();
    expect(pager.cursor()).toBe('cursor-2');
  });

  it('loadMore does nothing when hasMore is false', () => {
    const pager = createCursorPagination({ pageSize: 20 });
    pager.setNextCursor(null); // no more pages
    pager.loadMore();
    expect(pager.cursor()).toBe(null);
  });

  it('reset restores initial state', () => {
    const pager = createCursorPagination({ pageSize: 20, initialCursor: 'start' });
    pager.setNextCursor('page2');
    pager.loadMore();
    expect(pager.cursor()).toBe('page2');

    pager.reset();
    expect(pager.cursor()).toBe('start');
    expect(pager.hasMore()).toBe(true);
  });
});
