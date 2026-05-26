/** @vitest-environment happy-dom */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import axe from 'axe-core';

// Input Components
import { Button } from '../src/components/button.js';
import { TextField } from '../src/components/text-field.js';
import { Checkbox } from '../src/components/checkbox.js';
import { Radio } from '../src/components/radio.js';
import { Switch } from '../src/components/switch-toggle.js';
import { Select } from '../src/components/select.js';
import { Slider } from '../src/components/slider.js';

// Navigation Components
import { AppBar } from '../src/components/app-bar.js';
import { Tabs } from '../src/components/tabs.js';
import { Breadcrumb } from '../src/components/breadcrumb.js';

// Data Display Components
import { Card } from '../src/components/card.js';
import { List, ListItem } from '../src/components/list.js';
import { Badge } from '../src/components/badge.js';
import { Chip } from '../src/components/chip.js';
import { Avatar } from '../src/components/avatar.js';

// Feedback Components
import { Dialog } from '../src/components/dialog.js';
import { Snackbar } from '../src/components/snackbar.js';
import { ProgressBar, ProgressCircular } from '../src/components/progress.js';
import { Skeleton } from '../src/components/skeleton.js';

// Layout Components
import { Divider } from '../src/components/divider.js';

// ── Helper ────────────────────────────────────────────────────
let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  container.remove();
});

/**
 * Render a component into the test container and run axe-core.
 * Returns the list of violations (empty = pass).
 */
async function checkA11y(node: Node): Promise<axe.Result[]> {
  container.appendChild(node);
  const results = await axe.run(container, {
    rules: {
      // Disable rules that require full page context
      'page-has-heading-one': { enabled: false },
      'landmark-one-main': { enabled: false },
      'region': { enabled: false },
      // Disable color contrast — requires computed styles which happy-dom doesn't fully support
      'color-contrast': { enabled: false },
    },
  });
  return results.violations;
}

function formatViolations(violations: axe.Result[]): string {
  return violations
    .map(v => `[${v.id}] ${v.help} (${v.impact})\n  ${v.nodes.map(n => n.html).join('\n  ')}`)
    .join('\n');
}

// ── Input Components ──────────────────────────────────────────

describe('Accessibility: Input Components', () => {
  it('Button has no a11y violations', async () => {
    const el = Button({ variant: 'filled', children: () => 'Click me' });
    const violations = await checkA11y(el);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  it('Button (disabled) has no a11y violations', async () => {
    const el = Button({ variant: 'filled', disabled: true, children: () => 'Disabled' });
    const violations = await checkA11y(el);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  it('TextField has no a11y violations', async () => {
    const el = TextField({ label: 'Name', placeholder: 'Enter your name' });
    const violations = await checkA11y(el);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  it('Checkbox has no a11y violations', async () => {
    const el = Checkbox({ label: 'Accept terms' });
    const violations = await checkA11y(el);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  it('Radio has no a11y violations', async () => {
    const el = Radio({ label: 'Option A', name: 'choices', value: 'a' });
    const violations = await checkA11y(el);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  it('Switch has no a11y violations', async () => {
    const el = Switch({ label: 'Notifications' });
    const violations = await checkA11y(el);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  it('Select has no a11y violations', async () => {
    const el = Select({
      label: 'Country',
      options: [
        { value: 'us', label: 'United States' },
        { value: 'uk', label: 'United Kingdom' },
      ],
    });
    const violations = await checkA11y(el);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  it('Slider has no a11y violations', async () => {
    const el = Slider({ label: 'Volume', min: 0, max: 100, value: 50 });
    const violations = await checkA11y(el);
    expect(violations, formatViolations(violations)).toEqual([]);
  });
});

// ── Navigation Components ─────────────────────────────────────

describe('Accessibility: Navigation Components', () => {
  it('AppBar has no a11y violations', async () => {
    const el = AppBar({ title: 'My App' });
    const violations = await checkA11y(el);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  it('Tabs has no a11y violations', async () => {
    const el = Tabs({
      tabs: [
        { label: 'Tab 1', value: 'tab1' },
        { label: 'Tab 2', value: 'tab2' },
      ],
      value: 'tab1',
    });
    const violations = await checkA11y(el);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  it('Breadcrumb has no a11y violations', async () => {
    const el = Breadcrumb({
      items: [
        { label: 'Home', href: '/' },
        { label: 'Products', href: '/products' },
        { label: 'Widget' },
      ],
    });
    const violations = await checkA11y(el);
    expect(violations, formatViolations(violations)).toEqual([]);
  });
});

// ── Data Display Components ───────────────────────────────────

describe('Accessibility: Data Display Components', () => {
  it('Card has no a11y violations', async () => {
    const el = Card({ children: () => 'Card content' });
    const violations = await checkA11y(el);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  it('List with ListItems has no a11y violations', async () => {
    const list = List({
      children: () => {
        const frag = document.createDocumentFragment();
        frag.appendChild(ListItem({ children: () => 'Item 1' }));
        frag.appendChild(ListItem({ children: () => 'Item 2' }));
        return frag;
      },
    });
    const violations = await checkA11y(list);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  it('Badge has no a11y violations', async () => {
    const el = Badge({ content: '5', children: () => 'Notifications' });
    const violations = await checkA11y(el);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  it('Chip has no a11y violations', async () => {
    const el = Chip({ label: 'JavaScript' });
    const violations = await checkA11y(el);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  it('Avatar has no a11y violations', async () => {
    const el = Avatar({ alt: 'John Doe', initials: 'JD' });
    const violations = await checkA11y(el);
    expect(violations, formatViolations(violations)).toEqual([]);
  });
});

// ── Feedback Components ───────────────────────────────────────

describe('Accessibility: Feedback Components', () => {
  it('Dialog has no a11y violations', async () => {
    const el = Dialog({
      open: true,
      title: 'Confirm',
      children: () => 'Are you sure?',
    });
    const violations = await checkA11y(el);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  it('Snackbar has no a11y violations', async () => {
    const el = Snackbar({ message: 'Item saved', open: true });
    const violations = await checkA11y(el);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  it('ProgressBar has no a11y violations', async () => {
    const el = ProgressBar({ value: 60, label: 'Loading' });
    const violations = await checkA11y(el);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  it('ProgressCircular has no a11y violations', async () => {
    const el = ProgressCircular({ value: 75, label: 'Uploading' });
    const violations = await checkA11y(el);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  it('Skeleton has no a11y violations', async () => {
    const el = Skeleton({ width: 200, height: 20 });
    const violations = await checkA11y(el);
    expect(violations, formatViolations(violations)).toEqual([]);
  });
});

// ── Layout Components ─────────────────────────────────────────

describe('Accessibility: Layout Components', () => {
  it('Divider has no a11y violations', async () => {
    const el = Divider({});
    const violations = await checkA11y(el);
    expect(violations, formatViolations(violations)).toEqual([]);
  });
});
