/**
 * Security module — built-in protection for AkashJS apps.
 *
 * Auto-sanitization, CSP support, prototype pollution prevention,
 * and secure defaults. AkashJS is secure by default.
 */

// =========================================================================
// HTML Sanitizer — DOMPurify-style, zero dependencies
// =========================================================================

/** Tags allowed by default in sanitized HTML */
const SAFE_TAGS = new Set([
  'a', 'abbr', 'address', 'article', 'aside', 'b', 'bdi', 'bdo',
  'blockquote', 'br', 'caption', 'cite', 'code', 'col', 'colgroup',
  'dd', 'del', 'details', 'dfn', 'div', 'dl', 'dt', 'em', 'figcaption',
  'figure', 'footer', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header',
  'hr', 'i', 'img', 'ins', 'kbd', 'li', 'main', 'mark', 'nav', 'ol',
  'p', 'pre', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'section', 'small',
  'span', 'strong', 'sub', 'summary', 'sup', 'table', 'tbody', 'td',
  'tfoot', 'th', 'thead', 'time', 'tr', 'u', 'ul', 'var', 'wbr',
]);

/** Attributes allowed by default */
const SAFE_ATTRS = new Set([
  'alt', 'class', 'dir', 'href', 'id', 'lang', 'name', 'rel',
  'src', 'style', 'tabindex', 'target', 'title', 'type', 'width',
  'height', 'colspan', 'rowspan', 'scope', 'loading', 'decoding',
]);

/** Dangerous URL protocols */
const DANGEROUS_PROTOCOLS = /^(javascript|data|vbscript):/i;

/** Dangerous attribute names (event handlers) */
const DANGEROUS_ATTRS = /^on/i;

export interface SanitizeOptions {
  /** Additional allowed tags */
  allowTags?: string[];
  /** Additional allowed attributes */
  allowAttrs?: string[];
  /** Allow data-* attributes (default: true) */
  allowDataAttrs?: boolean;
  /** Allow aria-* attributes (default: true) */
  allowAriaAttrs?: boolean;
  /** Allow style attribute (default: false) */
  allowStyle?: boolean;
  /** Custom tag filter */
  tagFilter?: (tag: string) => boolean;
  /** Custom attribute filter */
  attrFilter?: (attr: string, value: string, tag: string) => boolean;
}

/**
 * Sanitize HTML string — remove dangerous tags, attributes, and URLs.
 *
 * ```ts
 * const safe = sanitize(userInput);
 * el.innerHTML = safe; // Safe from XSS
 *
 * // With options:
 * const safe = sanitize(html, { allowTags: ['iframe'], allowStyle: true });
 * ```
 */
export function sanitize(html: string, options: SanitizeOptions = {}): string {
  if (typeof document === 'undefined') {
    // SSR fallback — strip all tags
    return html.replace(/<[^>]*>/g, '');
  }

  const {
    allowTags = [],
    allowAttrs = [],
    allowDataAttrs = true,
    allowAriaAttrs = true,
    allowStyle = false,
    tagFilter,
    attrFilter,
  } = options;

  const allowedTags = new Set([...SAFE_TAGS, ...allowTags]);
  const allowedAttrs = new Set([...SAFE_ATTRS, ...allowAttrs]);

  if (!allowStyle) allowedAttrs.delete('style');

  // Parse HTML using browser's parser
  const doc = new DOMParser().parseFromString(html, 'text/html');
  sanitizeNode(doc.body, allowedTags, allowedAttrs, allowDataAttrs, allowAriaAttrs, tagFilter, attrFilter);

  return doc.body.innerHTML;
}

function sanitizeNode(
  node: Node,
  allowedTags: Set<string>,
  allowedAttrs: Set<string>,
  allowDataAttrs: boolean,
  allowAriaAttrs: boolean,
  tagFilter?: (tag: string) => boolean,
  attrFilter?: (attr: string, value: string, tag: string) => boolean,
): void {
  const children = Array.from(node.childNodes);

  for (const child of children) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as Element;
      const tag = el.tagName.toLowerCase();

      // Check if tag is allowed
      const isAllowed = tagFilter ? tagFilter(tag) : allowedTags.has(tag);

      if (!isAllowed) {
        // Replace dangerous element with its text content
        const text = document.createTextNode(el.textContent ?? '');
        node.replaceChild(text, child);
        continue;
      }

      // Sanitize attributes
      const attrs = Array.from(el.attributes);
      for (const attr of attrs) {
        const name = attr.name.toLowerCase();
        const value = attr.value;

        // Always remove event handlers
        if (DANGEROUS_ATTRS.test(name)) {
          el.removeAttribute(attr.name);
          continue;
        }

        // Check data-* and aria-*
        if (name.startsWith('data-') && allowDataAttrs) continue;
        if (name.startsWith('aria-') && allowAriaAttrs) continue;

        // Custom filter
        if (attrFilter && !attrFilter(name, value, tag)) {
          el.removeAttribute(attr.name);
          continue;
        }

        // Check if attribute is allowed
        if (!allowedAttrs.has(name)) {
          el.removeAttribute(attr.name);
          continue;
        }

        // Sanitize URLs
        if ((name === 'href' || name === 'src') && DANGEROUS_PROTOCOLS.test(value)) {
          el.removeAttribute(attr.name);
          continue;
        }
      }

      // Recurse into children
      sanitizeNode(el, allowedTags, allowedAttrs, allowDataAttrs, allowAriaAttrs, tagFilter, attrFilter);
    }
  }
}

/**
 * Escape HTML entities — prevents XSS in text content.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Create a safe HTML setter that sanitizes automatically.
 *
 * ```ts
 * const setHTML = createSafeHTML(el);
 * setHTML(userContent); // Auto-sanitized
 * ```
 */
export function createSafeHTML(el: HTMLElement, options?: SanitizeOptions): (html: string) => void {
  return (html: string) => {
    el.innerHTML = sanitize(html, options);
  };
}

// =========================================================================
// CSP (Content Security Policy) Support
// =========================================================================

export interface CSPConfig {
  /** Nonce for inline scripts/styles */
  nonce?: string;
  /** Report-only mode (default: false) */
  reportOnly?: boolean;
  /** Report URI for CSP violations */
  reportUri?: string;
  /** Custom directives */
  directives?: Record<string, string[]>;
}

/**
 * Generate a CSP header string.
 *
 * ```ts
 * const csp = generateCSP({
 *   nonce: 'abc123',
 *   directives: {
 *     'script-src': ["'self'"],
 *     'style-src': ["'self'", "'unsafe-inline'"],
 *     'img-src': ["'self'", 'data:', 'https:'],
 *   },
 * });
 * // "script-src 'self' 'nonce-abc123'; style-src 'self' 'unsafe-inline'; ..."
 * ```
 */
export function generateCSP(config: CSPConfig = {}): string {
  const defaults: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https:'],
    'font-src': ["'self'", 'https:'],
    'connect-src': ["'self'"],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'object-src': ["'none'"],
  };

  const directives = { ...defaults, ...config.directives };

  // Add nonce
  if (config.nonce) {
    const nonceValue = `'nonce-${config.nonce}'`;
    if (directives['script-src']) {
      directives['script-src'].push(nonceValue);
    }
    if (directives['style-src']) {
      directives['style-src'].push(nonceValue);
    }
  }

  // Add report-uri
  if (config.reportUri) {
    directives['report-uri'] = [config.reportUri];
  }

  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');
}

/**
 * Get the CSP header name based on config.
 */
export function getCSPHeaderName(config: CSPConfig = {}): string {
  return config.reportOnly
    ? 'Content-Security-Policy-Report-Only'
    : 'Content-Security-Policy';
}

// =========================================================================
// Security Headers (Helmet-like)
// =========================================================================

export interface SecurityHeadersConfig {
  /** Content Security Policy */
  csp?: CSPConfig;
  /** X-Frame-Options (default: 'DENY') */
  frameOptions?: 'DENY' | 'SAMEORIGIN' | false;
  /** X-Content-Type-Options (default: 'nosniff') */
  contentTypeOptions?: boolean;
  /** X-XSS-Protection (default: '0' — let CSP handle it) */
  xssProtection?: boolean;
  /** Strict-Transport-Security */
  hsts?: { maxAge: number; includeSubDomains?: boolean; preload?: boolean } | false;
  /** Referrer-Policy (default: 'strict-origin-when-cross-origin') */
  referrerPolicy?: string | false;
  /** Permissions-Policy */
  permissionsPolicy?: Record<string, string[]> | false;
  /** Cross-Origin-Opener-Policy */
  coop?: 'same-origin' | 'same-origin-allow-popups' | 'unsafe-none' | false;
  /** Cross-Origin-Embedder-Policy */
  coep?: 'require-corp' | 'credentialless' | 'unsafe-none' | false;
}

/**
 * Generate security headers for SSR responses.
 *
 * ```ts
 * const headers = generateSecurityHeaders();
 * // Apply to your server response
 * for (const [name, value] of Object.entries(headers)) {
 *   res.setHeader(name, value);
 * }
 * ```
 */
export function generateSecurityHeaders(config: SecurityHeadersConfig = {}): Record<string, string> {
  const headers: Record<string, string> = {};

  // CSP
  if (config.csp !== false) {
    const cspConfig = config.csp ?? {};
    headers[getCSPHeaderName(cspConfig)] = generateCSP(cspConfig);
  }

  // X-Frame-Options
  if (config.frameOptions !== false) {
    headers['X-Frame-Options'] = config.frameOptions ?? 'DENY';
  }

  // X-Content-Type-Options
  if (config.contentTypeOptions !== false) {
    headers['X-Content-Type-Options'] = 'nosniff';
  }

  // X-XSS-Protection (disabled by default — CSP is better)
  headers['X-XSS-Protection'] = config.xssProtection ? '1; mode=block' : '0';

  // HSTS
  if (config.hsts !== false) {
    const hsts = config.hsts ?? { maxAge: 31536000, includeSubDomains: true };
    let value = `max-age=${hsts.maxAge}`;
    if (hsts.includeSubDomains) value += '; includeSubDomains';
    if (hsts.preload) value += '; preload';
    headers['Strict-Transport-Security'] = value;
  }

  // Referrer-Policy
  if (config.referrerPolicy !== false) {
    headers['Referrer-Policy'] = config.referrerPolicy ?? 'strict-origin-when-cross-origin';
  }

  // Permissions-Policy
  if (config.permissionsPolicy !== false) {
    const policy = config.permissionsPolicy ?? {
      camera: [],
      microphone: [],
      geolocation: [],
      'payment': [],
    };
    headers['Permissions-Policy'] = Object.entries(policy)
      .map(([key, values]) => `${key}=(${values.join(' ')})`)
      .join(', ');
  }

  // COOP
  if (config.coop !== false) {
    headers['Cross-Origin-Opener-Policy'] = config.coop ?? 'same-origin';
  }

  // COEP
  if (config.coep !== false) {
    headers['Cross-Origin-Embedder-Policy'] = config.coep ?? 'require-corp';
  }

  return headers;
}

// =========================================================================
// Prototype Pollution Prevention
// =========================================================================

/**
 * Safe deep merge that prevents prototype pollution.
 * Will not set __proto__, constructor, or prototype keys.
 *
 * ```ts
 * const result = safeMerge(defaults, userConfig);
 * ```
 */
export function safeMerge<T extends Record<string, unknown>>(
  target: T,
  ...sources: Partial<T>[]
): T {
  const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;

    for (const key of Object.keys(source)) {
      if (DANGEROUS_KEYS.has(key)) continue;

      const targetVal = (target as any)[key];
      const sourceVal = (source as any)[key];

      if (isPlainObject(sourceVal) && isPlainObject(targetVal)) {
        (target as any)[key] = safeMerge({ ...targetVal }, sourceVal);
      } else {
        (target as any)[key] = sourceVal;
      }
    }
  }

  return target;
}

/**
 * Freeze an object deeply — prevents any modification.
 */
export function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== 'object') return obj;
  Object.freeze(obj);
  for (const value of Object.values(obj)) {
    if (typeof value === 'object' && value !== null) {
      deepFreeze(value);
    }
  }
  return obj;
}

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === 'object' && Object.getPrototypeOf(val) === Object.prototype;
}

// =========================================================================
// Subresource Integrity (SRI)
// =========================================================================

/**
 * Generate SRI hash for a script/style resource.
 * For use in <script integrity="..."> and <link integrity="...">.
 *
 * ```ts
 * // In Node.js build script:
 * const hash = await generateSRI(fileContent);
 * // 'sha384-...'
 * ```
 */
export async function generateSRI(content: string, algorithm: 'sha256' | 'sha384' | 'sha512' = 'sha384'): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);

  const hashAlgo = algorithm === 'sha256' ? 'SHA-256' : algorithm === 'sha384' ? 'SHA-384' : 'SHA-512';
  const hashBuffer = await crypto.subtle.digest(hashAlgo, data);
  const hashArray = new Uint8Array(hashBuffer);
  const base64 = btoa(String.fromCharCode(...hashArray));

  return `${algorithm}-${base64}`;
}

// =========================================================================
// CSRF Protection
// =========================================================================

/**
 * Generate a CSRF token.
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Create an HTTP interceptor that attaches CSRF tokens.
 *
 * ```ts
 * const csrf = createCSRFInterceptor();
 * const http = createHttpClient({ interceptors: [csrf.interceptor] });
 * // Token is auto-attached to every mutation request
 * ```
 */
export function createCSRFInterceptor(options: {
  headerName?: string;
  cookieName?: string;
  tokenGenerator?: () => string;
} = {}) {
  const {
    headerName = 'X-CSRF-Token',
    cookieName = 'csrf-token',
    tokenGenerator = generateCSRFToken,
  } = options;

  let token: string | null = null;

  function getToken(): string {
    if (!token) {
      // Try to read from cookie
      if (typeof document !== 'undefined') {
        const match = document.cookie.match(new RegExp(`${cookieName}=([^;]+)`));
        if (match) {
          token = match[1];
          return token;
        }
      }
      // Generate new token
      token = tokenGenerator();
    }
    return token;
  }

  const interceptor = async (request: Request, next: (req: Request) => Promise<Response>): Promise<Response> => {
    const method = request.method.toUpperCase();
    // Only attach to mutating requests
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      request.headers.set(headerName, getToken());
    }
    return next(request);
  };

  return {
    interceptor,
    token: getToken,
    refresh() { token = tokenGenerator(); },
  };
}

// =========================================================================
// Input Validation
// =========================================================================

/**
 * Validate and sanitize a URL — prevent open redirect attacks.
 *
 * ```ts
 * const safe = sanitizeURL(userInput, { allowedHosts: ['example.com'] });
 * if (safe) window.location.href = safe;
 * ```
 */
export function sanitizeURL(url: string, options: {
  allowedHosts?: string[];
  allowedProtocols?: string[];
  allowRelative?: boolean;
} = {}): string | null {
  const {
    allowedHosts,
    allowedProtocols = ['http:', 'https:'],
    allowRelative = true,
  } = options;

  // Relative URLs
  if (url.startsWith('/') && !url.startsWith('//')) {
    return allowRelative ? url : null;
  }

  try {
    const parsed = new URL(url);

    // Check protocol
    if (!allowedProtocols.includes(parsed.protocol)) return null;

    // Check host
    if (allowedHosts && !allowedHosts.includes(parsed.hostname)) return null;

    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Rate limiter for client-side actions (e.g., form submissions).
 *
 * ```ts
 * const limiter = createRateLimiter({ maxAttempts: 5, windowMs: 60000 });
 * if (!limiter.check()) {
 *   toast.error('Too many attempts. Please wait.');
 *   return;
 * }
 * ```
 */
export function createRateLimiter(options: {
  maxAttempts: number;
  windowMs: number;
}) {
  const { maxAttempts, windowMs } = options;
  const attempts: number[] = [];

  return {
    check(): boolean {
      const now = Date.now();
      // Remove old attempts
      while (attempts.length > 0 && attempts[0] < now - windowMs) {
        attempts.shift();
      }
      if (attempts.length >= maxAttempts) return false;
      attempts.push(now);
      return true;
    },
    remaining(): number {
      const now = Date.now();
      while (attempts.length > 0 && attempts[0] < now - windowMs) {
        attempts.shift();
      }
      return Math.max(0, maxAttempts - attempts.length);
    },
    reset(): void {
      attempts.length = 0;
    },
  };
}
