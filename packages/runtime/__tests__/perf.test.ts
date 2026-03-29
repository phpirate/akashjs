import { describe, it, expect, beforeEach } from 'vitest';
import {
  startProfiling,
  stopProfiling,
  isProfiling,
  recordPerfEntry,
  measureSync,
  getProfileSummary,
  createTimer,
  formatProfile,
} from '../src/perf.js';

beforeEach(() => {
  // Ensure clean state — stop any prior profiling
  if (isProfiling()) stopProfiling();
});

describe('startProfiling / stopProfiling', () => {
  it('records entries', () => {
    startProfiling();
    recordPerfEntry('render', 'App', 1.5);
    recordPerfEntry('effect', 'fetchData', 2.0);
    const profile = stopProfiling();

    expect(profile.entries).toHaveLength(2);
    expect(profile.totalDuration).toBeGreaterThanOrEqual(0);
    expect(profile.entries[0].name).toBe('App');
  });
});

describe('isProfiling', () => {
  it('reflects state', () => {
    expect(isProfiling()).toBe(false);
    startProfiling();
    expect(isProfiling()).toBe(true);
    stopProfiling();
    expect(isProfiling()).toBe(false);
  });
});

describe('recordPerfEntry', () => {
  it('only records when profiling', () => {
    recordPerfEntry('render', 'ignored', 1.0);
    startProfiling();
    recordPerfEntry('render', 'recorded', 1.0);
    const profile = stopProfiling();

    expect(profile.entries).toHaveLength(1);
    expect(profile.entries[0].name).toBe('recorded');
  });
});

describe('measureSync', () => {
  it('measures and returns result + duration', () => {
    startProfiling();
    const { result, duration } = measureSync('add', () => 2 + 3);
    stopProfiling();

    expect(result).toBe(5);
    expect(typeof duration).toBe('number');
    expect(duration).toBeGreaterThanOrEqual(0);
  });
});

describe('getProfileSummary', () => {
  it('counts entries by type', () => {
    startProfiling();
    recordPerfEntry('render', 'A', 1.0);
    recordPerfEntry('render', 'B', 2.0);
    recordPerfEntry('effect', 'C', 0.5);
    recordPerfEntry('signal-update', 'D', 0.1);
    recordPerfEntry('computed', 'E', 0.2);
    const profile = stopProfiling();

    const summary = getProfileSummary(profile);
    expect(summary.totalRenders).toBe(2);
    expect(summary.totalEffects).toBe(1);
    expect(summary.totalSignalUpdates).toBe(1);
    expect(summary.totalComputedEvals).toBe(1);
    expect(summary.avgRenderTime).toBe(1.5);
    expect(summary.slowestRender?.name).toBe('B');
  });
});

describe('createTimer', () => {
  it('measures start/stop duration', () => {
    startProfiling();
    const timer = createTimer('op');
    timer.start();
    // do a bit of work
    let sum = 0;
    for (let i = 0; i < 100; i++) sum += i;
    timer.stop();
    stopProfiling();

    expect(timer.duration).toBeGreaterThanOrEqual(0);
  });
});

describe('formatProfile', () => {
  it('returns a formatted string', () => {
    startProfiling();
    recordPerfEntry('render', 'App', 1.5);
    const profile = stopProfiling();

    const output = formatProfile(profile);
    expect(typeof output).toBe('string');
    expect(output).toContain('Performance Profile');
    expect(output).toContain('Renders');
    expect(output).toContain('Duration');
  });
});
