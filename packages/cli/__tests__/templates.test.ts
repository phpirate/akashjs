import { describe, it, expect } from 'vitest';
import {
  packageJson,
  tsconfig,
  viteConfig,
  vitestConfig,
  indexHtml,
  mainTs,
  appAkash,
  counterAkash,
  gitignore,
  componentTemplate,
  routePageTemplate,
  routeLoaderTemplate,
  routeGuardTemplate,
} from '../src/templates/index.js';

const baseOpts = { name: 'my-app', includeRouter: false, includeForms: false };

describe('packageJson', () => {
  it('generates valid JSON', () => {
    const result = JSON.parse(packageJson(baseOpts));
    expect(result.name).toBe('my-app');
    expect(result.private).toBe(true);
    expect(result.scripts.dev).toBe('vite');
  });

  it('includes runtime dependency', () => {
    const result = JSON.parse(packageJson(baseOpts));
    expect(result.dependencies['@akashjs/runtime']).toBeDefined();
  });

  it('includes router when requested', () => {
    const result = JSON.parse(packageJson({ ...baseOpts, includeRouter: true }));
    expect(result.dependencies['@akashjs/router']).toBeDefined();
  });

  it('excludes router when not requested', () => {
    const result = JSON.parse(packageJson(baseOpts));
    expect(result.dependencies['@akashjs/router']).toBeUndefined();
  });

  it('includes forms when requested', () => {
    const result = JSON.parse(packageJson({ ...baseOpts, includeForms: true }));
    expect(result.dependencies['@akashjs/forms']).toBeDefined();
  });

  it('includes vite and typescript in devDependencies', () => {
    const result = JSON.parse(packageJson(baseOpts));
    expect(result.devDependencies.vite).toBeDefined();
    expect(result.devDependencies.typescript).toBeDefined();
  });
});

describe('tsconfig', () => {
  it('generates valid JSON with strict mode', () => {
    const result = JSON.parse(tsconfig());
    expect(result.compilerOptions.strict).toBe(true);
    expect(result.compilerOptions.target).toBe('ES2022');
  });
});

describe('viteConfig', () => {
  it('imports akash plugin', () => {
    const result = viteConfig();
    expect(result).toContain("import akash from '@akashjs/vite-plugin'");
    expect(result).toContain('plugins: [akash()]');
  });
});

describe('vitestConfig', () => {
  it('uses happy-dom environment', () => {
    const result = vitestConfig();
    expect(result).toContain("environment: 'happy-dom'");
  });
});

describe('indexHtml', () => {
  it('includes project name in title', () => {
    const result = indexHtml(baseOpts);
    expect(result).toContain('<title>my-app</title>');
  });

  it('has app div and script tag', () => {
    const result = indexHtml(baseOpts);
    expect(result).toContain('id="app"');
    expect(result).toContain('/src/main.ts');
  });
});

describe('mainTs', () => {
  it('imports App and mounts it', () => {
    const result = mainTs();
    expect(result).toContain("import App from './App.akash'");
    expect(result).toContain("getElementById('app')");
  });
});

describe('appAkash', () => {
  it('includes project name', () => {
    const result = appAkash(baseOpts);
    expect(result).toContain("'my-app'");
  });

  it('includes Counter import', () => {
    const result = appAkash(baseOpts);
    expect(result).toContain("import Counter from './components/Counter.akash'");
  });

  it('includes Outlet when router enabled', () => {
    const result = appAkash({ ...baseOpts, includeRouter: true });
    expect(result).toContain("import { Outlet } from '@akashjs/router'");
    expect(result).toContain('<Outlet />');
  });

  it('excludes Outlet when no router', () => {
    const result = appAkash(baseOpts);
    expect(result).not.toContain('Outlet');
  });
});

describe('counterAkash', () => {
  it('includes signal import', () => {
    const result = counterAkash();
    expect(result).toContain("import { signal } from '@akashjs/runtime'");
  });

  it('has increment and decrement', () => {
    const result = counterAkash();
    expect(result).toContain('increment');
    expect(result).toContain('decrement');
  });
});

describe('gitignore', () => {
  it('ignores node_modules and dist', () => {
    const result = gitignore();
    expect(result).toContain('node_modules');
    expect(result).toContain('dist');
  });
});

describe('componentTemplate', () => {
  it('uses the component name', () => {
    const result = componentTemplate('UserCard');
    expect(result).toContain('UserCard');
    expect(result).toContain('usercard');
  });
});

describe('routePageTemplate', () => {
  it('capitalizes the route name', () => {
    const result = routePageTemplate('/about');
    expect(result).toContain('About');
    expect(result).toContain('about-page');
  });
});

describe('routeLoaderTemplate', () => {
  it('imports RouteLoader type', () => {
    const result = routeLoaderTemplate('/blog');
    expect(result).toContain("import type { RouteLoader } from '@akashjs/router'");
    expect(result).toContain('/blog');
  });
});

describe('routeGuardTemplate', () => {
  it('imports RouteGuard type', () => {
    const result = routeGuardTemplate('/dashboard');
    expect(result).toContain("import type { RouteGuard } from '@akashjs/router'");
    expect(result).toContain('/dashboard');
  });
});
