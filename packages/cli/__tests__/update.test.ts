import { describe, it, expect } from 'vitest';
import {
  compareVersions,
  getMigrationsFor,
  registerMigration,
} from '../src/commands/update.js';

describe('update', () => {
  describe('compareVersions', () => {
    it('returns -1 when first version is less', () => {
      expect(compareVersions('0.1.0', '0.2.0')).toBe(-1);
    });

    it('returns 1 when first version is greater', () => {
      expect(compareVersions('1.0.0', '0.9.0')).toBe(1);
    });

    it('returns 0 when versions are equal', () => {
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    });
  });

  describe('getMigrationsFor', () => {
    it('returns matching migrations', () => {
      const results = getMigrationsFor('0.1.0', '0.3.0');
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThanOrEqual(1);
      for (const m of results) {
        expect(m).toHaveProperty('from');
        expect(m).toHaveProperty('to');
        expect(m).toHaveProperty('description');
        expect(typeof m.migrate).toBe('function');
      }
    });
  });

  describe('registerMigration', () => {
    it('adds a migration that can be retrieved', () => {
      const custom = {
        from: '0.9.0',
        to: '1.0.0',
        description: 'Test migration',
        migrate: () => {},
      };
      registerMigration(custom);
      const results = getMigrationsFor('0.9.0', '1.0.0');
      const found = results.find((m) => m.description === 'Test migration');
      expect(found).toBeDefined();
    });
  });
});
