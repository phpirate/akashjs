import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { detectPlatform, generateAdapter, generatePlatformConfig } from '../src/commands/deploy.js';

describe('detectPlatform', () => {
  it("returns 'static' for empty dir", () => {
    const dir = mkdtempSync(join(tmpdir(), 'deploy-test-'));
    expect(detectPlatform(dir)).toBe('static');
  });
});

describe('generateAdapter', () => {
  it("('vercel') contains 'Vercel'", () => {
    expect(generateAdapter('vercel')).toContain('Vercel');
  });

  it("('cloudflare') contains 'Cloudflare'", () => {
    expect(generateAdapter('cloudflare')).toContain('Cloudflare');
  });

  it("('netlify') contains 'Netlify'", () => {
    expect(generateAdapter('netlify')).toContain('Netlify');
  });

  it("('deno') contains 'Deno'", () => {
    expect(generateAdapter('deno')).toContain('Deno');
  });

  it("('static') returns empty string", () => {
    expect(generateAdapter('static')).toBe('');
  });
});

describe('generatePlatformConfig', () => {
  it("('vercel') has vercel.json key", () => {
    const config = generatePlatformConfig('vercel');
    expect(config).toHaveProperty('vercel.json');
  });

  it("('cloudflare') has wrangler.toml key", () => {
    const config = generatePlatformConfig('cloudflare');
    expect(config).toHaveProperty('wrangler.toml');
  });

  it("('netlify') has netlify.toml key", () => {
    const config = generatePlatformConfig('netlify');
    expect(config).toHaveProperty('netlify.toml');
  });
});
