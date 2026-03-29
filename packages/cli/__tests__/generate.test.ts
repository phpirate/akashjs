import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createProgram } from '../src/index.js';

const TEST_DIR = join(process.cwd(), '.test-generate-output');

describe('generate component', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    vi.spyOn(process, 'cwd').mockReturnValue(TEST_DIR);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('generates an .akash component file', async () => {
    const program = createProgram();
    await program.parseAsync(['node', 'akash', 'generate', 'component', 'my-button']);

    const filePath = join(TEST_DIR, 'src', 'components', 'MyButton.akash');
    expect(existsSync(filePath)).toBe(true);

    const content = readFileSync(filePath, 'utf-8');
    expect(content).toContain('MyButton');
    expect(content).toContain('<template>');
    expect(content).toContain('<style scoped>');
  });

  it('generates a .tsx component file with --tsx flag', async () => {
    const program = createProgram();
    await program.parseAsync(['node', 'akash', 'g', 'c', 'sidebar', '--tsx']);

    const filePath = join(TEST_DIR, 'src', 'components', 'Sidebar.tsx');
    expect(existsSync(filePath)).toBe(true);

    const content = readFileSync(filePath, 'utf-8');
    expect(content).toContain('Sidebar');
    expect(content).toContain('defineComponent');
  });

  it('converts kebab-case to PascalCase', async () => {
    const program = createProgram();
    await program.parseAsync(['node', 'akash', 'g', 'c', 'user-profile-card']);

    const filePath = join(TEST_DIR, 'src', 'components', 'UserProfileCard.akash');
    expect(existsSync(filePath)).toBe(true);
  });
});

describe('generate route', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    vi.spyOn(process, 'cwd').mockReturnValue(TEST_DIR);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('generates a page.akash in the route directory', async () => {
    const program = createProgram();
    await program.parseAsync(['node', 'akash', 'generate', 'route', 'about']);

    const filePath = join(TEST_DIR, 'src', 'routes', 'about', 'page.akash');
    expect(existsSync(filePath)).toBe(true);

    const content = readFileSync(filePath, 'utf-8');
    expect(content).toContain('About');
  });

  it('generates loader.ts with --loader flag', async () => {
    const program = createProgram();
    await program.parseAsync(['node', 'akash', 'g', 'r', 'blog', '--loader']);

    const pagePath = join(TEST_DIR, 'src', 'routes', 'blog', 'page.akash');
    const loaderPath = join(TEST_DIR, 'src', 'routes', 'blog', 'loader.ts');
    expect(existsSync(pagePath)).toBe(true);
    expect(existsSync(loaderPath)).toBe(true);

    const content = readFileSync(loaderPath, 'utf-8');
    expect(content).toContain('RouteLoader');
  });

  it('generates guard.ts with --guard flag', async () => {
    const program = createProgram();
    await program.parseAsync(['node', 'akash', 'g', 'r', 'dashboard', '--guard']);

    const guardPath = join(TEST_DIR, 'src', 'routes', 'dashboard', 'guard.ts');
    expect(existsSync(guardPath)).toBe(true);

    const content = readFileSync(guardPath, 'utf-8');
    expect(content).toContain('RouteGuard');
  });

  it('supports nested route paths', async () => {
    const program = createProgram();
    await program.parseAsync(['node', 'akash', 'g', 'r', 'blog/[slug]']);

    const filePath = join(TEST_DIR, 'src', 'routes', 'blog', '[slug]', 'page.akash');
    expect(existsSync(filePath)).toBe(true);
  });

  it('strips leading slash from route path', async () => {
    const program = createProgram();
    await program.parseAsync(['node', 'akash', 'g', 'r', '/settings']);

    const filePath = join(TEST_DIR, 'src', 'routes', 'settings', 'page.akash');
    expect(existsSync(filePath)).toBe(true);
  });
});
