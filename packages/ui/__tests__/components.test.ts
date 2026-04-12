/** @vitest-environment happy-dom */

import { describe, it, expect } from 'vitest';

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
import { Drawer } from '../src/components/drawer.js';
import { Breadcrumb } from '../src/components/breadcrumb.js';

// Data Display Components
import { Card } from '../src/components/card.js';
import { List, ListItem } from '../src/components/list.js';
import { Badge } from '../src/components/badge.js';
import { Chip } from '../src/components/chip.js';
import { Avatar } from '../src/components/avatar.js';
import { Tooltip } from '../src/components/tooltip.js';

// Feedback Components
import { Dialog } from '../src/components/dialog.js';
import { Snackbar } from '../src/components/snackbar.js';
import { ProgressBar, ProgressCircular } from '../src/components/progress.js';
import { Skeleton } from '../src/components/skeleton.js';

// Layout Components
import { Divider } from '../src/components/divider.js';
import { Grid, GridItem } from '../src/components/grid.js';
import { Stack } from '../src/components/stack.js';

describe('Input Components', () => {
  it('Button is a valid component', () => {
    expect(Button._akash).toBe(true);
  });

  it('TextField is a valid component', () => {
    expect(TextField._akash).toBe(true);
  });

  it('Checkbox is a valid component', () => {
    expect(Checkbox._akash).toBe(true);
  });

  it('Radio is a valid component', () => {
    expect(Radio._akash).toBe(true);
  });

  it('Switch is a valid component', () => {
    expect(Switch._akash).toBe(true);
  });

  it('Select is a valid component', () => {
    expect(Select._akash).toBe(true);
  });

  it('Slider is a valid component', () => {
    expect(Slider._akash).toBe(true);
  });
});

describe('Navigation Components', () => {
  it('AppBar is a valid component', () => {
    expect(AppBar._akash).toBe(true);
  });

  it('Tabs is a valid component', () => {
    expect(Tabs._akash).toBe(true);
  });

  it('Drawer is a valid component', () => {
    expect(Drawer._akash).toBe(true);
  });

  it('Breadcrumb is a valid component', () => {
    expect(Breadcrumb._akash).toBe(true);
  });
});

describe('Data Display Components', () => {
  it('Card is a valid component', () => {
    expect(Card._akash).toBe(true);
  });

  it('List is a valid component', () => {
    expect(List._akash).toBe(true);
  });

  it('ListItem is a valid component', () => {
    expect(ListItem._akash).toBe(true);
  });

  it('Badge is a valid component', () => {
    expect(Badge._akash).toBe(true);
  });

  it('Chip is a valid component', () => {
    expect(Chip._akash).toBe(true);
  });

  it('Avatar is a valid component', () => {
    expect(Avatar._akash).toBe(true);
  });

  it('Tooltip is a valid component', () => {
    expect(Tooltip._akash).toBe(true);
  });
});

describe('Feedback Components', () => {
  it('Dialog is a valid component', () => {
    expect(Dialog._akash).toBe(true);
  });

  it('Snackbar is a valid component', () => {
    expect(Snackbar._akash).toBe(true);
  });

  it('ProgressBar is a valid component', () => {
    expect(ProgressBar._akash).toBe(true);
  });

  it('ProgressCircular is a valid component', () => {
    expect(ProgressCircular._akash).toBe(true);
  });

  it('Skeleton is a valid component', () => {
    expect(Skeleton._akash).toBe(true);
  });
});

describe('Layout Components', () => {
  it('Divider is a valid component', () => {
    expect(Divider._akash).toBe(true);
  });

  it('Grid is a valid component', () => {
    expect(Grid._akash).toBe(true);
  });

  it('GridItem is a valid component', () => {
    expect(GridItem._akash).toBe(true);
  });

  it('Stack is a valid component', () => {
    expect(Stack._akash).toBe(true);
  });
});

// --- markdownToHtml ---

import { markdownToHtml } from '../src/components/rich-text.js';

describe('markdownToHtml', () => {
  it('escapes script tags (XSS)', () => {
    const html = markdownToHtml('<script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes event handler attributes (XSS)', () => {
    const html = markdownToHtml('<img src=x onerror=alert(1)>');
    // The < and > are escaped, so the browser won't parse it as a tag
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });

  it('blocks javascript: URIs in links', () => {
    const html = markdownToHtml('[click](javascript:alert(1))');
    expect(html).not.toContain('javascript:');
  });

  it('renders inline code', () => {
    const html = markdownToHtml('use `signal()` here');
    expect(html).toContain('<code>signal()</code>');
  });

  it('renders fenced code blocks', () => {
    const html = markdownToHtml('```ts\nconst x = 1;\n```');
    expect(html).toContain('<pre><code class="language-ts">');
    expect(html).toContain('const x = 1;');
  });

  it('renders images', () => {
    const html = markdownToHtml('![logo](logo.png)');
    expect(html).toContain('<img src="logo.png" alt="logo">');
  });

  it('renders horizontal rules', () => {
    const html = markdownToHtml('above\n\n---\n\nbelow');
    expect(html).toContain('<hr>');
  });

  it('renders tables', () => {
    const html = markdownToHtml('| A | B |\n|---|---|\n| 1 | 2 |');
    expect(html).toContain('<table>');
    expect(html).toContain('<th>A</th>');
    expect(html).toContain('<td>1</td>');
  });

  it('renders headings and bold/italic', () => {
    expect(markdownToHtml('# Title')).toContain('<h1>Title</h1>');
    expect(markdownToHtml('**bold**')).toContain('<strong>bold</strong>');
    expect(markdownToHtml('*italic*')).toContain('<em>italic</em>');
  });
});
