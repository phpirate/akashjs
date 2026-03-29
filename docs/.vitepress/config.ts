import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'AkashJS',
  description: 'Angular structure, Svelte simplicity — a TypeScript-first UI framework',
  ignoreDeadLinks: true,
  head: [
    ['meta', { name: 'theme-color', content: '#6750A4' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'AkashJS' }],
    ['meta', { property: 'og:description', content: 'Angular structure, Svelte simplicity — a TypeScript-first UI framework' }],
    ['meta', { property: 'og:url', content: 'https://akash.js.org' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
  ],
  lastUpdated: true,
  cleanUrls: true,
  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: 'Guide', link: '/guide/introduction' },
      { text: 'Tutorial', link: '/tutorial/introduction' },
      { text: 'API', link: '/api/runtime' },
      {
        text: 'More',
        items: [
          { text: 'UI Components', link: '/ui/getting-started' },
          { text: 'Cookbook', link: '/cookbook/' },
          { text: 'Best Practices', link: '/best-practices/' },
          { text: 'Migration Guides', link: '/migration/' },
          { text: 'FAQ', link: '/faq/' },
          { text: 'Error Reference', link: '/errors/' },
        ],
      },
    ],
    search: {
      provider: 'local',
    },
    editLink: {
      pattern: 'https://github.com/phpirate/akashjs/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
    footer: {
      message: 'Released under the MIT License.',
      copyright: "Copyright © 2026 Ma'moon Al-Akash",
    },
    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/guide/introduction' },
            { text: 'Quick Start', link: '/guide/getting-started' },
            { text: 'Upgrading', link: '/guide/upgrading' },
          ],
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'Reactivity', link: '/guide/reactivity' },
            { text: 'Components', link: '/guide/components' },
            { text: 'State Management', link: '/guide/state-management' },
            { text: 'Styling', link: '/guide/styling' },
          ],
        },
        {
          text: 'Features',
          items: [
            { text: 'Routing', link: '/guide/routing' },
            { text: 'Forms', link: '/guide/forms' },
            { text: 'HTTP Client', link: '/guide/http' },
            { text: 'Internationalization', link: '/guide/i18n' },
            { text: 'Accessibility', link: '/guide/accessibility' },
            { text: 'SEO', link: '/guide/seo' },
            { text: 'Pipes', link: '/guide/pipes' },
            { text: 'Directives', link: '/guide/directives' },
            { text: 'PWA', link: '/guide/pwa' },
            { text: 'Web Components', link: '/guide/web-components' },
            { text: 'SSG / Prerendering', link: '/guide/ssg' },
            { text: 'URL State', link: '/guide/query-state' },
            { text: 'Animations', link: '/guide/animations' },
            { text: 'Deferred Loading', link: '/guide/defer' },
            { text: 'View Transitions', link: '/guide/view-transitions' },
            { text: 'Tweened & FLIP', link: '/guide/tweened' },
            { text: 'Await Blocks', link: '/guide/await' },
            { text: 'Event Modifiers', link: '/guide/event-modifiers' },
            { text: 'Watch', link: '/guide/watch' },
            { text: 'State Machines', link: '/guide/machines' },
            { text: 'Testing', link: '/guide/testing' },
            { text: 'Performance', link: '/guide/performance' },
            { text: 'Security', link: '/guide/security-module' },
          ],
        },
        {
          text: 'Advanced',
          items: [
            { text: 'Collaborative Signals', link: '/guide/collaborative' },
            { text: 'Type-safe API', link: '/guide/api' },
            { text: 'Offline First', link: '/guide/offline' },
            { text: 'Visual Inspector', link: '/guide/inspector' },
            { text: 'Deployment', link: '/guide/deployment' },
          ],
        },
      ],
      '/tutorial/': [
        {
          text: 'Tutorial',
          items: [
            { text: 'Introduction', link: '/tutorial/introduction' },
            { text: '1. Setup', link: '/tutorial/setup' },
            { text: '2. First Component', link: '/tutorial/first-component' },
            { text: '3. Reactivity', link: '/tutorial/reactivity' },
            { text: '4. Routing', link: '/tutorial/routing' },
            { text: '5. Forms & Validation', link: '/tutorial/forms' },
            { text: '6. Data Fetching', link: '/tutorial/data-fetching' },
            { text: '7. State Management', link: '/tutorial/state' },
            { text: '8. Styling & Theme', link: '/tutorial/styling' },
            { text: '9. Testing', link: '/tutorial/testing' },
            { text: '10. Deployment', link: '/tutorial/deployment' },
          ],
        },
      ],
      '/cookbook/': [
        {
          text: 'Cookbook',
          items: [
            { text: 'Overview', link: '/cookbook/' },
            { text: 'Authentication Flow', link: '/cookbook/auth' },
            { text: 'Dark Mode', link: '/cookbook/dark-mode' },
            { text: 'Infinite Scroll', link: '/cookbook/infinite-scroll' },
            { text: 'Modal System', link: '/cookbook/modals' },
            { text: 'Data Fetching Patterns', link: '/cookbook/data-fetching' },
            { text: 'Form Patterns', link: '/cookbook/forms' },
            { text: 'Real-time Updates', link: '/cookbook/realtime' },
            { text: 'File Upload', link: '/cookbook/file-upload' },
            { text: 'Drag and Drop', link: '/cookbook/drag-drop' },
            { text: 'Keyboard Shortcuts', link: '/cookbook/keyboard' },
          ],
        },
      ],
      '/best-practices/': [
        {
          text: 'Best Practices',
          items: [
            { text: 'Overview', link: '/best-practices/' },
            { text: 'Project Structure', link: '/best-practices/project-structure' },
            { text: 'Component Patterns', link: '/best-practices/components' },
            { text: 'State Management', link: '/best-practices/state' },
            { text: 'Performance', link: '/best-practices/performance' },
            { text: 'Testing Strategy', link: '/best-practices/testing' },
            { text: 'Accessibility', link: '/best-practices/accessibility' },
            { text: 'Security', link: '/best-practices/security' },
            { text: 'TypeScript Tips', link: '/best-practices/typescript' },
          ],
        },
      ],
      '/migration/': [
        {
          text: 'Migration Guides',
          items: [
            { text: 'Overview', link: '/migration/' },
            { text: 'From Angular', link: '/migration/angular' },
            { text: 'From React', link: '/migration/react' },
            { text: 'From Vue', link: '/migration/vue' },
            { text: 'From Svelte', link: '/migration/svelte' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Runtime', link: '/api/runtime' },
            { text: 'Compiler', link: '/api/compiler' },
            { text: 'Router', link: '/api/router' },
            { text: 'Forms', link: '/api/forms' },
            { text: 'HTTP', link: '/api/http' },
            { text: 'i18n', link: '/api/i18n' },
            { text: 'DevTools', link: '/api/devtools' },
            { text: 'CLI', link: '/api/cli' },
          ],
        },
      ],
      '/ui/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Installation', link: '/ui/getting-started' },
            { text: 'Design Tokens', link: '/ui/tokens' },
          ],
        },
        {
          text: 'Components',
          items: [
            { text: 'Button', link: '/ui/button' },
            { text: 'TextField', link: '/ui/text-field' },
            { text: 'Checkbox & Radio', link: '/ui/checkbox-radio' },
            { text: 'Switch & Slider', link: '/ui/switch-slider' },
            { text: 'Select', link: '/ui/select' },
            { text: 'AppBar', link: '/ui/app-bar' },
            { text: 'Tabs', link: '/ui/tabs' },
            { text: 'Drawer', link: '/ui/drawer' },
            { text: 'Card', link: '/ui/card' },
            { text: 'List', link: '/ui/list' },
            { text: 'Chips & Badges', link: '/ui/chips-badges' },
            { text: 'Dialog', link: '/ui/dialog' },
            { text: 'Progress & Skeleton', link: '/ui/progress' },
            { text: 'Layout', link: '/ui/layout' },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/phpirate/akashjs' },
      { icon: 'npm', link: 'https://www.npmjs.com/org/akashjs' },
    ],
  },
});
