/**
 * <Image> component.
 *
 * Optimized image rendering with lazy loading, srcset/sizes,
 * blur placeholder, and error fallback.
 *
 * ```html
 * <Image
 *   src="/photos/hero.jpg"
 *   alt="Hero image"
 *   width={800}
 *   height={600}
 *   placeholder="blur"
 *   blurDataUrl="data:image/jpeg;base64,..."
 *   srcset="/photos/hero-400.jpg 400w, /photos/hero-800.jpg 800w"
 *   sizes="(max-width: 600px) 400px, 800px"
 *   loading="lazy"
 * />
 * ```
 */

import { defineComponent } from './component.js';
import { signal } from './signals.js';

// --- Types ---

export interface ImageProps {
  /** Image source URL */
  src: string;
  /** Alt text (required for accessibility) */
  alt: string;
  /** Width in pixels */
  width?: number;
  /** Height in pixels */
  height?: number;
  /** Loading strategy (default: 'lazy') */
  loading?: 'lazy' | 'eager';
  /** Srcset for responsive images */
  srcset?: string;
  /** Sizes attribute for responsive images */
  sizes?: string;
  /** Placeholder strategy */
  placeholder?: 'blur' | 'empty';
  /** Base64 data URL for blur placeholder */
  blurDataUrl?: string;
  /** CSS class */
  class?: string;
  /** Error fallback image URL */
  fallbackSrc?: string;
  /** Callback when image loads */
  onLoad?: () => void;
  /** Callback when image fails to load */
  onError?: (error: Event) => void;
}

// --- Component ---

export const Image = defineComponent<ImageProps>((ctx) => {
  const loaded = signal(false);
  const errored = signal(false);

  return () => {
    const {
      src,
      alt,
      width,
      height,
      loading = 'lazy',
      srcset,
      sizes,
      placeholder,
      blurDataUrl,
      class: className,
      fallbackSrc,
      onLoad,
      onError: onErrorCb,
    } = ctx.props;

    // Wrapper for placeholder
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';
    wrapper.style.overflow = 'hidden';
    if (width) wrapper.style.width = `${width}px`;
    if (height) wrapper.style.height = `${height}px`;

    // Blur placeholder
    if (placeholder === 'blur' && blurDataUrl && !loaded()) {
      const blur = document.createElement('img');
      blur.src = blurDataUrl;
      blur.alt = '';
      blur.setAttribute('aria-hidden', 'true');
      blur.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:blur(20px);transform:scale(1.1);';
      wrapper.appendChild(blur);
    }

    // Main image
    const img = document.createElement('img');
    img.alt = alt;
    img.loading = loading;

    if (errored() && fallbackSrc) {
      img.src = fallbackSrc;
    } else {
      img.src = src;
    }

    if (srcset) img.srcset = srcset;
    if (sizes) img.sizes = sizes;
    if (width) img.width = width;
    if (height) img.height = height;
    if (className) img.className = className;

    img.style.display = 'block';
    img.style.width = '100%';
    img.style.height = 'auto';

    img.addEventListener('load', () => {
      loaded.set(true);
      onLoad?.();
    });

    img.addEventListener('error', (e) => {
      errored.set(true);
      onErrorCb?.(e);
    });

    // Intersection Observer for lazy loading (fallback for browsers without native lazy)
    if (loading === 'lazy' && typeof IntersectionObserver !== 'undefined') {
      img.setAttribute('data-src', img.src);
      const actualSrc = img.src;
      img.removeAttribute('src');

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            img.src = actualSrc;
            observer.disconnect();
          }
        },
        { rootMargin: '200px' },
      );

      // Observe after appended to DOM
      requestAnimationFrame(() => {
        if (img.parentElement) {
          observer.observe(img);
        } else {
          // Fallback: set src immediately
          img.src = actualSrc;
        }
      });
    }

    wrapper.appendChild(img);
    return wrapper;
  };
});
