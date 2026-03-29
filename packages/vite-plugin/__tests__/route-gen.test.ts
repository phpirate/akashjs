import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { scanRoutes, generateRouteManifest, generateRouteTypes } from '../src/route-gen.js';

const TEST_DIR = join(process.cwd(), '.test-routes-output');
const ROUTES_DIR = join(TEST_DIR, 'src', 'routes');

function createFile(path: string, content = '') {
  writeFileSync(join(ROUTES_DIR, path), content, 'utf-8');
}

function createDir(path: string) {
  mkdirSync(join(ROUTES_DIR, path), { recursive: true });
}

describe('scanRoutes', () => {
  beforeEach(() => {
    mkdirSync(ROUTES_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('returns empty array for non-existent directory', () => {
    expect(scanRoutes('/nonexistent')).toEqual([]);
  });

  it('scans root page.akash', () => {
    createFile('page.akash', '');
    const routes = scanRoutes(ROUTES_DIR);
    expect(routes).toHaveLength(1);
    expect(routes[0].path).toBe('/');
    expect(routes[0].componentPath).toContain('page.akash');
  });

  it('scans nested static routes', () => {
    createFile('page.akash', '');
    createDir('about');
    createFile('about/page.akash', '');
    const routes = scanRoutes(ROUTES_DIR);

    const root = routes.find((r) => r.path === '/');
    expect(root).toBeDefined();
    expect(root!.children).toHaveLength(1);
    expect(root!.children[0].path).toBe('/about');
  });

  it('scans dynamic parameter routes', () => {
    createDir('blog/[slug]');
    createFile('blog/[slug]/page.akash', '');
    const routes = scanRoutes(ROUTES_DIR);

    expect(routes).toHaveLength(1);
    expect(routes[0].path).toContain(':slug');
    expect(routes[0].params).toContain('slug');
  });

  it('detects layout.akash', () => {
    createFile('page.akash', '');
    createFile('layout.akash', '');
    const routes = scanRoutes(ROUTES_DIR);
    expect(routes[0].layoutPath).toContain('layout.akash');
  });

  it('detects loader.ts', () => {
    createFile('page.akash', '');
    createFile('loader.ts', '');
    const routes = scanRoutes(ROUTES_DIR);
    expect(routes[0].loaderPath).toContain('loader.ts');
  });

  it('detects guard.ts', () => {
    createFile('page.akash', '');
    createFile('guard.ts', '');
    const routes = scanRoutes(ROUTES_DIR);
    expect(routes[0].guardPath).toContain('guard.ts');
  });

  it('detects error.akash', () => {
    createFile('page.akash', '');
    createFile('error.akash', '');
    const routes = scanRoutes(ROUTES_DIR);
    expect(routes[0].errorPath).toContain('error.akash');
  });
});

describe('generateRouteManifest', () => {
  beforeEach(() => {
    mkdirSync(ROUTES_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('generates import code for routes', () => {
    createFile('page.akash', '');
    createDir('about');
    createFile('about/page.akash', '');

    const routes = scanRoutes(ROUTES_DIR);
    const code = generateRouteManifest(routes, ROUTES_DIR);

    expect(code).toContain('export const routes');
    expect(code).toContain('path: "/"');
    expect(code).toContain('path: "/about"');
    expect(code).toContain('component: () => import(');
  });

  it('includes loader and guard imports', () => {
    createFile('page.akash', '');
    createFile('loader.ts', '');
    createFile('guard.ts', '');

    const routes = scanRoutes(ROUTES_DIR);
    const code = generateRouteManifest(routes, ROUTES_DIR);

    expect(code).toContain('loader: () => import(');
    expect(code).toContain('guard: () => import(');
  });
});

describe('generateRouteTypes', () => {
  beforeEach(() => {
    mkdirSync(ROUTES_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('generates type declarations for parameterized routes', () => {
    createDir('blog/[slug]');
    createFile('blog/[slug]/page.akash', '');

    const routes = scanRoutes(ROUTES_DIR);
    const types = generateRouteTypes(routes);

    expect(types).toContain("declare module '@akashjs/router'");
    expect(types).toContain('RouteParamMap');
    expect(types).toContain('slug: string');
  });

  it('skips routes without params', () => {
    createFile('page.akash', '');
    const routes = scanRoutes(ROUTES_DIR);
    const types = generateRouteTypes(routes);

    // Should declare the module but have no entries for paramless routes
    expect(types).toContain('RouteParamMap');
    expect(types).not.toContain("'/'");
  });
});
