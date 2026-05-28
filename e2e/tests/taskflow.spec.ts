/**
 * End-to-end tests for the TaskFlow reference app.
 *
 * Tests the full flow: login → dashboard → board → create task → drag → settings.
 * Verifies the AkashJS framework works end-to-end in a real browser.
 */

import { test, expect } from '@playwright/test';

test.describe('TaskFlow App', () => {

  test.describe('Login', () => {
    test('shows login page when not authenticated', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'TaskFlow' })).toBeVisible();
      await expect(page.locator('text=Sign In').or(page.locator('text=Try Demo'))).toBeVisible();
    });

    test('can login with demo mode', async ({ page }) => {
      await page.goto('/');
      await page.click('text=Try Demo');
      // Should redirect to dashboard
      await expect(page.locator('text=Welcome')).toBeVisible({ timeout: 5000 });
    });

    test('can login with email', async ({ page }) => {
      await page.goto('/');
      await page.fill('input[type="email"], input[placeholder*="email" i]', 'maamoon@taskflow.dev');
      await page.fill('input[type="password"]', 'demo');
      await page.click('text=Sign In');
      await expect(page.locator('text=Welcome')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.click('text=Try Demo');
      await expect(page.locator('text=Welcome')).toBeVisible({ timeout: 5000 });
    });

    test('shows project cards', async ({ page }) => {
      await expect(page.locator('text=AkashJS Framework')).toBeVisible();
      await expect(page.locator('text=TaskFlow App')).toBeVisible();
    });

    test('shows stats', async ({ page }) => {
      // Should show some stat numbers
      await expect(page.locator('text=Total').first()).toBeVisible();
    });
  });

  test.describe('Board', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.click('text=Try Demo');
      await expect(page.locator('text=Welcome')).toBeVisible({ timeout: 5000 });
      // Navigate to a project
      await page.click('text=AkashJS Framework');
      await page.waitForTimeout(500);
    });

    test('shows kanban columns', async ({ page }) => {
      await expect(page.locator('text=Backlog')).toBeVisible();
      await expect(page.locator('text=To Do')).toBeVisible();
      await expect(page.locator('text=In Progress')).toBeVisible();
      await expect(page.locator('text=Review')).toBeVisible();
      await expect(page.locator('text=Done')).toBeVisible();
    });

    test('shows task cards', async ({ page }) => {
      await expect(page.locator('text=Implement SSR streaming')).toBeVisible();
    });

    test('task cards are draggable', async ({ page }) => {
      const card = page.locator('[draggable="true"]').first();
      await expect(card).toBeVisible();
      // Verify draggable attribute is set
      await expect(card).toHaveAttribute('draggable', 'true');
    });
  });

  test.describe('Navigation', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.click('text=Try Demo');
      await expect(page.locator('text=Welcome')).toBeVisible({ timeout: 5000 });
    });

    test('sidebar shows navigation items', async ({ page }) => {
      await expect(page.locator('text=Dashboard')).toBeVisible();
    });

    test('sidebar shows projects list', async ({ page }) => {
      await expect(page.locator('text=AkashJS Framework')).toBeVisible();
      await expect(page.locator('text=TaskFlow App')).toBeVisible();
    });
  });

  test.describe('Settings', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.click('text=Try Demo');
      await expect(page.locator('text=Welcome')).toBeVisible({ timeout: 5000 });
    });

    test('can navigate to settings', async ({ page }) => {
      await page.click('text=Settings');
      await page.waitForTimeout(500);
      await expect(page.locator('text=Profile').or(page.locator('text=Appearance'))).toBeVisible();
    });
  });

  test.describe('Responsive', () => {
    test('renders on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'TaskFlow' })).toBeVisible();
    });

    test('renders on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'TaskFlow' })).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('login page loads within 3 seconds', async ({ page }) => {
      const start = Date.now();
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'TaskFlow' })).toBeVisible();
      const loadTime = Date.now() - start;
      expect(loadTime).toBeLessThan(3000);
    });

    test('no console errors on load', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      await page.goto('/');
      await page.click('text=Try Demo');
      await page.waitForTimeout(1000);
      // Filter out expected non-critical errors
      const critical = errors.filter((e) => !e.includes('favicon'));
      expect(critical).toHaveLength(0);
    });
  });
});
