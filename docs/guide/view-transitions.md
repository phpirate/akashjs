# View Transitions

View Transitions use the browser-native [View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API) to animate between page states. AkashJS provides a thin wrapper that handles feature detection, fallbacks, and integration with the router.

## What are View Transitions?

The View Transitions API lets the browser snapshot the current page, apply a DOM update, then crossfade between the old and new states. This produces smooth, native-feeling page transitions without manually orchestrating CSS animations.

Browser support is growing. AkashJS detects support at runtime and falls back to an instant swap (or a custom fade) when the API is unavailable.

## supportsViewTransitions()

Check whether the current browser supports the View Transitions API.

```ts
import { supportsViewTransitions } from '@akashjs/runtime';

if (supportsViewTransitions()) {
  console.log('Native view transitions available');
}
```

## startViewTransition()

Trigger a view transition. The callback should perform the DOM update. If the browser does not support view transitions, the callback runs immediately as a fallback.

```ts
import { startViewTransition } from '@akashjs/runtime';

startViewTransition(() => {
  // Update the DOM
  container.innerHTML = newContent;
});
```

### Options

Pass an options object to customize the transition:

```ts
startViewTransition(() => updateDOM(), {
  fallback: 'fade',     // 'none' | 'fade' (default: 'none')
  duration: 300,         // Fallback fade duration in ms
  onStart: () => {},     // Called when transition starts
  onFinish: () => {},    // Called when transition completes
});
```

When `fallback: 'fade'` is set and the browser does not support view transitions, AkashJS applies a CSS opacity crossfade to simulate the effect.

### Async updates

The callback can be async. The transition waits for the promise to resolve before animating in the new state:

```ts
await startViewTransition(async () => {
  const data = await fetchPageData(url);
  renderPage(data);
});
```

## viewTransitionCSS()

Generate custom CSS rules for view transition pseudo-elements. This gives you full control over the animation.

```ts
import { viewTransitionCSS } from '@akashjs/runtime';

const css = viewTransitionCSS({
  old: {
    animation: 'slide-out 0.3s ease-in forwards',
  },
  new: {
    animation: 'slide-in 0.3s ease-out forwards',
  },
});

// Inject the CSS into a <style> tag
document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);
```

The generated CSS targets the `::view-transition-old(root)` and `::view-transition-new(root)` pseudo-elements.

### Targeting specific elements

Pass a `name` to scope the transition CSS to a named element:

```ts
const css = viewTransitionCSS({
  name: 'hero-image',
  old: { animation: 'fade-out 0.2s ease-in' },
  new: { animation: 'fade-in 0.2s ease-out' },
});
```

## assignTransitionName()

Assign a `view-transition-name` to an element so it participates in the transition independently from the rest of the page.

```ts
import { assignTransitionName } from '@akashjs/runtime';

// The hero image will animate independently during transitions
assignTransitionName(heroImageEl, 'hero-image');
```

This sets the CSS property `view-transition-name` on the element. The browser then tracks this element separately during the transition, enabling morphing effects like a thumbnail expanding into a full-size image.

```ts
// In a list page
assignTransitionName(thumbnailEl, `product-${product.id}`);

// In the detail page — same name causes the browser to morph between them
assignTransitionName(heroEl, `product-${product.id}`);
```

## Router integration

AkashJS's router can use view transitions automatically for page navigations. Enable it in the router configuration:

```ts
import { createRouter } from '@akashjs/router';

const router = createRouter({
  routes: [
    { path: '/', component: Home },
    { path: '/about', component: About },
  ],
  viewTransitions: {
    enabled: true,
    fallback: 'fade',  // fade for unsupported browsers
  },
});
```

When enabled, every route navigation is wrapped in `startViewTransition()`. The old page is captured, the new route component mounts, and the browser crossfades between them.

### Per-route transitions

Override the transition for specific routes:

```ts
{
  path: '/gallery/:id',
  component: GalleryDetail,
  meta: {
    viewTransition: {
      name: 'gallery-detail',
      css: viewTransitionCSS({
        name: 'gallery-detail',
        old: { animation: 'scale-down 0.3s ease-in' },
        new: { animation: 'scale-up 0.3s ease-out' },
      }),
    },
  },
}
```

## Fade fallback for older browsers

When `fallback: 'fade'` is set, AkashJS applies a simple opacity crossfade for browsers without native support. The implementation:

1. Fades the current content to `opacity: 0`
2. Runs the DOM update callback
3. Fades the new content from `opacity: 0` to `1`

```ts
startViewTransition(() => swapPages(), {
  fallback: 'fade',
  duration: 250,
});
```

This ensures users on older browsers still get a polished transition rather than a jarring instant swap.
