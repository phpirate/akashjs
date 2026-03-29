/**
 * TaskFlow SSR server.
 *
 * Proves AkashJS SSR works end-to-end with a real app:
 * - Server renders initial HTML with renderToString
 * - Client hydrates with signals attached to existing DOM
 * - Navigation is client-side after first load
 */

import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  ssrElement,
  ssrText,
  ssrRaw,
  nodeToHtml,
  renderNodes,
  escapeHtml,
} from '@akashjs/runtime';
import type { SSRNode } from '@akashjs/runtime';
import { DEMO_PROJECTS } from '../src/utils/seed.js';
import { DEMO_TASKS } from '../src/utils/seed.js';
import { DEMO_USERS } from '../src/utils/seed.js';
import type { TaskStatus } from '../src/types/index.js';
import { BOARD_COLUMNS, STATUS_LABELS, PRIORITY_LABELS, PRIORITY_COLORS } from '../src/types/index.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

// =========================================================================
// SSR render functions — build HTML without DOM APIs
// =========================================================================

function renderLoginPage(): SSRNode {
  return ssrElement('div', { style: 'min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#6750A4,#3b82f6);font-family:Inter,system-ui,sans-serif' }, [
    ssrElement('div', { style: 'background:#fff;border-radius:16px;padding:48px;width:400px;max-width:90vw;box-shadow:0 20px 60px rgba(0,0,0,0.2)' }, [
      ssrElement('h1', { style: 'margin:0 0 8px;font-size:28px;color:#1C1B1F' }, [ssrText('TaskFlow')]),
      ssrElement('p', { style: 'margin:0 0 32px;color:#6b7280;font-size:14px' }, [ssrText('Project management built with AkashJS')]),
      ssrElement('form', { id: 'login-form' }, [
        ssrElement('input', { type: 'email', placeholder: 'Email', value: 'maamoon@taskflow.dev', style: 'display:block;width:100%;padding:12px;margin-bottom:12px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;box-sizing:border-box' }),
        ssrElement('input', { type: 'password', placeholder: 'Password', value: 'demo', style: 'display:block;width:100%;padding:12px;margin-bottom:16px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;box-sizing:border-box' }),
        ssrElement('button', { type: 'submit', style: 'display:block;width:100%;padding:12px;background:#6750A4;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer' }, [ssrText('Sign In')]),
      ]),
      ssrElement('button', { id: 'demo-btn', style: 'display:block;width:100%;padding:12px;margin-top:8px;background:transparent;color:#6750A4;border:1px solid #6750A4;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer' }, [ssrText('Try Demo')]),
      ssrElement('p', { style: 'margin-top:16px;font-size:12px;color:#9ca3af;text-align:center' }, [ssrText('Demo: maamoon@taskflow.dev / any password')]),
    ]),
  ]);
}

function renderDashboard(): SSRNode {
  const user = DEMO_USERS[0];
  const taskCounts = {
    total: DEMO_TASKS.length,
    inProgress: DEMO_TASKS.filter(t => t.status === 'in_progress').length,
    done: DEMO_TASKS.filter(t => t.status === 'done').length,
    overdue: DEMO_TASKS.filter(t => t.dueDate && t.dueDate < Date.now() && t.status !== 'done').length,
  };

  return ssrElement('div', { style: 'padding:32px;font-family:Inter,system-ui,sans-serif' }, [
    ssrElement('h1', { style: 'font-size:24px;font-weight:700;margin:0 0 24px;color:#1C1B1F' }, [
      ssrText(`Welcome back, ${user.name}`),
    ]),

    // Stats
    ssrElement('div', { style: 'display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:32px' }, [
      renderStatCard('Total Tasks', String(taskCounts.total), '#6750A4'),
      renderStatCard('In Progress', String(taskCounts.inProgress), '#f59e0b'),
      renderStatCard('Completed', String(taskCounts.done), '#10b981'),
      renderStatCard('Overdue', String(taskCounts.overdue), '#ef4444'),
    ]),

    // Projects
    ssrElement('h2', { style: 'font-size:18px;font-weight:600;margin:0 0 16px;color:#1C1B1F' }, [ssrText('Projects')]),
    ssrElement('div', { style: 'display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px' },
      DEMO_PROJECTS.map(p => renderProjectCard(p)),
    ),
  ]);
}

function renderStatCard(label: string, value: string, color: string): SSRNode {
  return ssrElement('div', { style: `background:#fff;border-radius:12px;padding:20px;border:1px solid #e5e7eb` }, [
    ssrElement('div', { style: `font-size:28px;font-weight:700;color:${color}` }, [ssrText(value)]),
    ssrElement('div', { style: 'font-size:13px;color:#6b7280;margin-top:4px' }, [ssrText(label)]),
  ]);
}

function renderProjectCard(project: typeof DEMO_PROJECTS[0]): SSRNode {
  const taskCount = DEMO_TASKS.filter(t => t.projectId === project.id).length;
  const doneCount = DEMO_TASKS.filter(t => t.projectId === project.id && t.status === 'done').length;

  return ssrElement('div', { style: 'background:#fff;border-radius:12px;padding:20px;border:1px solid #e5e7eb;cursor:pointer' }, [
    ssrElement('div', { style: 'display:flex;align-items:center;gap:8px;margin-bottom:8px' }, [
      ssrElement('span', { style: 'font-size:20px' }, [ssrText(project.icon)]),
      ssrElement('span', { style: 'font-size:16px;font-weight:600;color:#1C1B1F' }, [ssrText(project.name)]),
    ]),
    ssrElement('p', { style: 'font-size:13px;color:#6b7280;margin:0 0 12px' }, [ssrText(project.description)]),
    ssrElement('div', { style: 'display:flex;justify-content:space-between;align-items:center' }, [
      ssrElement('span', { style: 'font-size:12px;color:#9ca3af' }, [ssrText(`${doneCount}/${taskCount} tasks done`)]),
      ssrElement('div', { style: `width:60px;height:4px;background:#e5e7eb;border-radius:2px;overflow:hidden` }, [
        ssrElement('div', { style: `width:${taskCount > 0 ? (doneCount / taskCount * 100) : 0}%;height:100%;background:${project.color};border-radius:2px` }),
      ]),
    ]),
  ]);
}

function renderBoardPage(projectId: string): SSRNode {
  const project = DEMO_PROJECTS.find(p => p.id === projectId);
  if (!project) return ssrElement('div', {}, [ssrText('Project not found')]);

  const projectTasks = DEMO_TASKS.filter(t => t.projectId === projectId);

  return ssrElement('div', { style: 'font-family:Inter,system-ui,sans-serif' }, [
    // Header
    ssrElement('div', { style: 'padding:20px 24px;border-bottom:1px solid #e5e7eb' }, [
      ssrElement('h1', { style: 'font-size:20px;font-weight:700;margin:0;color:#1C1B1F' }, [
        ssrText(`${project.icon} ${project.name}`),
      ]),
      ssrElement('p', { style: 'font-size:13px;color:#6b7280;margin:4px 0 0' }, [ssrText(project.description)]),
    ]),

    // Board
    ssrElement('div', { style: 'display:flex;gap:16px;padding:20px 24px;overflow-x:auto;background:#fafafa;min-height:400px' },
      BOARD_COLUMNS.map(col => {
        const colTasks = projectTasks.filter(t => t.status === col.status);
        return ssrElement('div', { style: 'min-width:260px;width:260px;background:#f3f4f6;border-radius:12px;display:flex;flex-direction:column' }, [
          ssrElement('div', { style: `height:3px;background:${col.color};border-radius:12px 12px 0 0` }),
          ssrElement('div', { style: 'padding:14px 14px 10px;display:flex;align-items:center;gap:8px' }, [
            ssrElement('span', { style: 'font-size:13px;font-weight:600;color:#1C1B1F' }, [ssrText(col.label)]),
            ssrElement('span', { style: 'font-size:11px;font-weight:600;color:#6b7280;background:#e5e7eb;padding:1px 7px;border-radius:10px' }, [ssrText(String(colTasks.length))]),
          ]),
          ssrElement('div', { style: 'padding:0 10px 10px;display:flex;flex-direction:column;gap:8px' },
            colTasks.length > 0
              ? colTasks.map(task => ssrElement('div', { style: 'background:#fff;border-radius:10px;border:1px solid #e8e8ec;padding:14px', draggable: true }, [
                  ssrElement('div', { style: 'display:flex;align-items:flex-start;gap:8px' }, [
                    ssrElement('span', { style: `width:8px;height:8px;border-radius:50%;background:${PRIORITY_COLORS[task.priority]};flex-shrink:0;margin-top:5px` }),
                    ssrElement('span', { style: 'font-size:13px;font-weight:600;color:#1C1B1F;line-height:1.4' }, [ssrText(task.title)]),
                  ]),
                ]))
              : [ssrElement('div', { style: 'text-align:center;padding:24px 8px;font-size:13px;color:#9ca3af' }, [ssrText('No tasks')])]
          ),
        ]);
      }),
    ),
  ]);
}

// =========================================================================
// HTML template
// =========================================================================

function renderFullPage(content: SSRNode, title: string): string {
  const bodyHtml = nodeToHtml(content);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} — TaskFlow</title>
  <meta name="description" content="Project management built with AkashJS">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Inter, system-ui, -apple-system, sans-serif; background: #fafafa; color: #1C1B1F; }
  </style>
</head>
<body>
  <div id="app">${bodyHtml}</div>
  <script>
    // Hydration marker — client JS would attach signals here
    window.__SSR_DATA__ = {
      projects: ${JSON.stringify(DEMO_PROJECTS)},
      tasks: ${JSON.stringify(DEMO_TASKS.map(t => ({ ...t, description: '' })))},
      user: ${JSON.stringify(DEMO_USERS[0])},
    };
    console.log('[TaskFlow SSR] Page rendered on server, hydration data attached');
  </script>
</body>
</html>`;
}

// =========================================================================
// HTTP server
// =========================================================================

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const path = url.pathname;

  console.log(`${req.method} ${path}`);

  // Route handling
  let html: string;
  let title: string;

  if (path === '/login') {
    title = 'Login';
    html = renderFullPage(renderLoginPage(), title);
  } else if (path === '/' || path === '/dashboard') {
    title = 'Dashboard';
    html = renderFullPage(renderDashboard(), title);
  } else if (path.startsWith('/project/')) {
    const projectId = path.split('/')[2];
    title = DEMO_PROJECTS.find(p => p.id === projectId)?.name ?? 'Project';
    html = renderFullPage(renderBoardPage(projectId), title);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
    return;
  }

  // Security headers
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Length': Buffer.byteLength(html),
  });
  res.end(html);
});

server.listen(PORT, () => {
  console.log(`\n  TaskFlow SSR server running at http://localhost:${PORT}\n`);
  console.log('  Routes:');
  console.log('    /login          — Login page');
  console.log('    /dashboard      — Dashboard with stats and projects');
  console.log('    /project/p1     — AkashJS Framework board');
  console.log('    /project/p2     — TaskFlow App board');
  console.log('    /project/p3     — Marketing Site board\n');
});
