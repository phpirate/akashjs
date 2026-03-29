import { describe, it, expect, afterEach } from 'vitest';
import {
  enableLeakDetection,
  disableLeakDetection,
  isLeakDetectionEnabled,
  trackEffect,
  untrackEffect,
  getActiveEffects,
  checkForLeaks,
  getLeakDetectionStats,
} from '../src/leak-detector.js';

afterEach(() => {
  disableLeakDetection();
});

describe('enableLeakDetection / disableLeakDetection', () => {
  it('toggles state', () => {
    expect(isLeakDetectionEnabled()).toBe(false);
    enableLeakDetection();
    expect(isLeakDetectionEnabled()).toBe(true);
    disableLeakDetection();
    expect(isLeakDetectionEnabled()).toBe(false);
  });
});

describe('trackEffect', () => {
  it('registers an effect', () => {
    enableLeakDetection();
    const id = trackEffect('TestComponent');
    expect(id).toBeGreaterThan(0);
    expect(getActiveEffects()).toHaveLength(1);
    expect(getActiveEffects()[0].componentName).toBe('TestComponent');
  });
});

describe('untrackEffect', () => {
  it('removes it', () => {
    enableLeakDetection();
    const id = trackEffect('TestComponent');
    expect(getActiveEffects()).toHaveLength(1);
    untrackEffect(id);
    expect(getActiveEffects()).toHaveLength(0);
  });
});

describe('getActiveEffects', () => {
  it('returns tracked effects', () => {
    enableLeakDetection();
    trackEffect('A');
    trackEffect('B');
    const effects = getActiveEffects();
    expect(effects).toHaveLength(2);
  });
});

describe('checkForLeaks', () => {
  it('returns empty when nothing is old', () => {
    enableLeakDetection();
    trackEffect('Fresh');
    // Default threshold is 30s, effect was just created
    const leaks = checkForLeaks();
    expect(leaks).toEqual([]);
  });
});

describe('getLeakDetectionStats', () => {
  it('returns correct counts', () => {
    enableLeakDetection();
    trackEffect('A');
    trackEffect('B');
    untrackEffect(getActiveEffects()[0].id);

    const stats = getLeakDetectionStats();
    expect(stats.enabled).toBe(true);
    expect(stats.activeCount).toBe(1);
    expect(stats.totalTracked).toBeGreaterThanOrEqual(2);
  });
});
