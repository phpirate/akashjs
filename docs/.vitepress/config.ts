import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'AkashJS',
  description: 'Angular structure, Svelte simplicity',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/introduction' },
      { text: 'API', link: '/api/runtime' },
      { text: 'UI Components', link: '/ui/getting-started' },
      { text: 'Errors', link: '/errors/' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/guide/introduction' },
            { text: 'Quick Start', link: '/guide/getting-started' },
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
      { icon: 'github', link: 'https://github.com/akashjs/akashjs' },
    ],
  },
});
