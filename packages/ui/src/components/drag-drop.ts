/**
 * Drag & Drop components for AkashJS.
 *
 * - DragDropList — sortable list reordering with optional handle + axis lock
 * - Draggable — free-form element dragging with handle, boundary, axis lock
 * - Resizable — panel resize via edge drag handles
 * - DropZone — file upload drop zone (native HTML5 drag-drop)
 */

import { defineComponent, effect, signal } from '@akashjs/runtime';
import type { AkashNode } from '@akashjs/runtime';

// --- Helpers ---

function readProp<T>(val: T | (() => T)): T {
  return typeof val === 'function' ? (val as () => T)() : val as T;
}

function nodeToDOM(node: AkashNode): Node {
  if (node == null || typeof node === 'boolean') return document.createTextNode('');
  if (typeof node === 'string' || typeof node === 'number') return document.createTextNode(String(node));
  if (node instanceof Node) return node;
  return document.createTextNode(String(node));
}

function resolveChildren(ctx: { children: () => AkashNode; props: any }): AkashNode {
  let children = ctx.children();
  if (children == null || (Array.isArray(children) && children.length === 0)) {
    const pc = ctx.props.children;
    if (typeof pc === 'function') children = pc();
    else if (pc != null) children = pc;
  }
  return children;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export interface DragPosition {
  x: number;
  y: number;
}

// ============================================================================
// DragDropList — Sortable list reordering
// ============================================================================

export interface DragDropListProps<T = any> {
  /** Items array (reactive signal or static) */
  items?: T[];
  /** Called when an item is reordered */
  onReorder?: (fromIndex: number, toIndex: number) => void;
  /** Lock drag to an axis */
  lockAxis?: 'x' | 'y';
  /** Show drag handle icon (if false, whole item is draggable) */
  handle?: boolean;
  /** Render function for each item */
  renderItem?: (item: T, index: number) => AkashNode;
  /** Disabled state */
  disabled?: boolean;
  /** Gap between items (default: '0') */
  gap?: string;
  /** Custom class on container */
  class?: string;
}

export const DragDropList = defineComponent<DragDropListProps>((ctx) => {
  return () => {
    const props = ctx.props;
    const lockAxis = props.lockAxis;
    const showHandle = props.handle ?? false;
    const disabled = props.disabled ?? false;
    const gap = props.gap ?? '0';

    const container = document.createElement('div');
    container.setAttribute('role', 'list');
    if (props.class) container.className = props.class;
    container.style.cssText = `
      display: flex; flex-direction: ${lockAxis === 'x' ? 'row' : 'column'};
      gap: ${gap}; position: relative;
    `;

    let dragIdx = -1;
    let placeholder: HTMLElement | null = null;

    function buildItems() {
      container.textContent = '';
      const items = readProp(props.items) ?? [];
      const renderItem = props.renderItem;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const row = document.createElement('div');
        row.setAttribute('role', 'listitem');
        row.dataset.index = String(i);
        row.style.cssText = `
          display: flex; align-items: center; gap: 8px;
          transition: transform 150ms ease;
          ${disabled ? 'pointer-events: none; opacity: 0.38;' : ''}
        `;

        // Drag handle
        if (showHandle) {
          const handle = document.createElement('span');
          handle.className = 'akash-drag-handle';
          handle.textContent = '⠿';
          handle.style.cssText = `
            cursor: grab; font-size: 18px; padding: 4px;
            color: var(--md-sys-color-on-surface-variant, #49454f);
            user-select: none; flex-shrink: 0;
          `;
          handle.draggable = true;
          attachDragHandlers(handle, row, i);
          row.appendChild(handle);
        } else {
          row.draggable = true;
          row.style.cursor = 'grab';
          attachDragHandlers(row, row, i);
        }

        // Content
        const content = document.createElement('div');
        content.style.cssText = 'flex: 1; pointer-events: none;';
        if (renderItem) {
          content.appendChild(nodeToDOM(renderItem(item, i)));
        } else {
          content.textContent = String(item);
        }
        row.appendChild(content);

        container.appendChild(row);
      }
    }

    function attachDragHandlers(dragEl: HTMLElement, row: HTMLElement, idx: number) {
      dragEl.addEventListener('dragstart', (e) => {
        dragIdx = idx;
        row.style.opacity = '0.4';
        e.dataTransfer!.effectAllowed = 'move';
        e.dataTransfer!.setData('text/plain', String(idx));
      });
      dragEl.addEventListener('dragend', () => {
        row.style.opacity = '1';
        dragIdx = -1;
        removePlaceholder();
      });
      row.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'move';
        const targetIdx = parseInt(row.dataset.index!, 10);
        if (targetIdx !== dragIdx) {
          showPlaceholder(row, targetIdx > dragIdx);
        }
      });
      row.addEventListener('dragleave', () => {
        removePlaceholder();
      });
      row.addEventListener('drop', (e) => {
        e.preventDefault();
        removePlaceholder();
        const targetIdx = parseInt(row.dataset.index!, 10);
        if (dragIdx >= 0 && dragIdx !== targetIdx) {
          props.onReorder?.(dragIdx, targetIdx);
        }
      });
    }

    function showPlaceholder(beforeEl: HTMLElement, after: boolean) {
      removePlaceholder();
      placeholder = document.createElement('div');
      placeholder.style.cssText = `
        height: 2px; background: var(--md-sys-color-primary, #6750a4);
        border-radius: 1px; margin: -1px 0;
      `;
      if (after && beforeEl.nextSibling) {
        container.insertBefore(placeholder, beforeEl.nextSibling);
      } else {
        container.insertBefore(placeholder, beforeEl);
      }
    }

    function removePlaceholder() {
      if (placeholder?.parentNode) {
        placeholder.parentNode.removeChild(placeholder);
        placeholder = null;
      }
    }

    // Rebuild reactively
    effect(() => {
      readProp(props.items);
      buildItems();
    });

    return container;
  };
});

// ============================================================================
// Draggable — Free-form element dragging
// ============================================================================

export interface DraggableProps {
  /** CSS selector for the drag handle within children (if omitted, entire element is draggable) */
  handle?: string;
  /** Lock drag to an axis */
  lockAxis?: 'x' | 'y';
  /** Disable dragging */
  disabled?: boolean;
  /** Constrain to a boundary: 'viewport', 'parent', or an HTMLElement */
  boundary?: 'viewport' | 'parent' | HTMLElement;
  /** Initial position */
  initialPosition?: DragPosition;
  /** Drag start callback */
  onDragStart?: (pos: DragPosition) => void;
  /** Drag move callback (fires continuously) */
  onDragMove?: (pos: DragPosition) => void;
  /** Drag end callback */
  onDragEnd?: (pos: DragPosition) => void;
}

export const Draggable = defineComponent<DraggableProps>((ctx) => {
  return () => {
    const props = ctx.props;
    const lockAxis = props.lockAxis;
    const initPos = props.initialPosition ?? { x: 0, y: 0 };

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      position: relative;
      display: inline-block;
      width: fit-content;
      transform: translate(${initPos.x}px, ${initPos.y}px);
      touch-action: none;
      will-change: transform;
    `;

    // Render children
    const children = resolveChildren(ctx);
    if (children != null) {
      const items = Array.isArray(children) ? children : [children];
      for (const child of items) {
        if (child instanceof Node) wrapper.appendChild(child);
        else if (child != null) wrapper.appendChild(nodeToDOM(child));
      }
    }

    let pos = { ...initPos };
    let startMouse = { x: 0, y: 0 };
    let startPos = { x: 0, y: 0 };
    let dragging = false;

    function getHandleEl(): HTMLElement {
      if (props.handle) {
        return wrapper.querySelector(props.handle) as HTMLElement ?? wrapper;
      }
      return wrapper;
    }

    // Cached bounds — computed once on drag start, cleared on drag end.
    // Avoids getBoundingClientRect() reflows on every pointermove frame.
    let cachedBounds: { minX: number; maxX: number; minY: number; maxY: number } | null = null;

    function cacheBounds(): void {
      const boundary = props.boundary;
      if (!boundary) { cachedBounds = null; return; }

      const wRect = wrapper.getBoundingClientRect();
      const elW = wRect.width;
      const elH = wRect.height;

      // The element's visual position = its natural position + current transform delta (pos).
      // We need: min/max values for the transform delta such that the element
      // stays within the boundary.
      //
      // initialLeft = wRect.left - boundaryRect.left  (element offset within boundary)
      // This already includes the current transform (pos.x), so the element's
      // offset WITHOUT transform = initialLeft - pos.x
      //
      // For the element's left edge to stay >= boundary left:
      //   (initialLeft - pos.x) + newDelta >= 0  →  newDelta >= -(initialLeft - pos.x)
      //                                            →  newDelta >= pos.x - initialLeft
      // For the element's right edge to stay <= boundary right:
      //   (initialLeft - pos.x) + newDelta + elW <= boundaryW
      //   newDelta <= boundaryW - elW - (initialLeft - pos.x)
      //   newDelta <= boundaryW - elW - initialLeft + pos.x

      if (boundary === 'viewport') {
        const initialLeft = wRect.left;
        const initialTop = wRect.top;
        cachedBounds = {
          minX: pos.x - initialLeft,
          maxX: window.innerWidth - elW - initialLeft + pos.x,
          minY: pos.y - initialTop,
          maxY: window.innerHeight - elH - initialTop + pos.y,
        };
      } else {
        const boundaryEl = boundary === 'parent' ? wrapper.parentElement : boundary;
        if (boundaryEl instanceof HTMLElement) {
          const pRect = boundaryEl.getBoundingClientRect();
          const initialLeft = wRect.left - pRect.left;
          const initialTop = wRect.top - pRect.top;
          cachedBounds = {
            minX: pos.x - initialLeft,
            maxX: pRect.width - elW - initialLeft + pos.x,
            minY: pos.y - initialTop,
            maxY: pRect.height - elH - initialTop + pos.y,
          };
        } else {
          cachedBounds = null;
        }
      }
    }

    let rafId = 0;
    let pendingPos: DragPosition | null = null;

    function onPointerDown(e: PointerEvent) {
      if (readProp(props.disabled)) return;
      e.preventDefault();
      dragging = true;
      startMouse = { x: e.clientX, y: e.clientY };
      startPos = { ...pos };
      cacheBounds(); // measure once — no reflows during drag
      document.body.style.userSelect = 'none';
      wrapper.style.zIndex = '9999';
      wrapper.style.pointerEvents = 'none';
      const handleEl = getHandleEl();
      handleEl.style.cursor = 'grabbing';
      handleEl.setPointerCapture(e.pointerId);
      props.onDragStart?.(pos);
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
    }

    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      let dx = e.clientX - startMouse.x;
      let dy = e.clientY - startMouse.y;
      if (lockAxis === 'x') dy = 0;
      if (lockAxis === 'y') dx = 0;

      pos = { x: startPos.x + dx, y: startPos.y + dy };

      if (cachedBounds) {
        pos.x = clamp(pos.x, cachedBounds.minX, cachedBounds.maxX);
        pos.y = clamp(pos.y, cachedBounds.minY, cachedBounds.maxY);
      }

      // Throttle DOM updates to rAF for smooth 60fps rendering
      pendingPos = { ...pos };
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          if (pendingPos) {
            wrapper.style.transform = `translate(${pendingPos.x}px, ${pendingPos.y}px)`;
            props.onDragMove?.(pendingPos);
            pendingPos = null;
          }
          rafId = 0;
        });
      }
    }

    function onPointerUp(e: PointerEvent) {
      if (!dragging) return;
      dragging = false;
      // Flush any pending position
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      if (pendingPos) {
        wrapper.style.transform = `translate(${pendingPos.x}px, ${pendingPos.y}px)`;
        pendingPos = null;
      }
      document.body.style.userSelect = '';
      wrapper.style.zIndex = '';
      wrapper.style.pointerEvents = ''; // restore pointer events
      const handleEl = getHandleEl();
      handleEl.style.cursor = props.handle ? 'grab' : '';
      try { handleEl.releasePointerCapture(e.pointerId); } catch {}
      cachedBounds = null; // clear cached bounds
      props.onDragEnd?.(pos);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    }

    // Attach to handle or wrapper after DOM is built
    requestAnimationFrame(() => {
      const handleEl = getHandleEl();
      handleEl.style.cursor = 'grab';
      handleEl.addEventListener('pointerdown', onPointerDown);
    });

    // React to disabled changes
    effect(() => {
      const dis = readProp(props.disabled) ?? false;
      wrapper.style.pointerEvents = dis ? 'none' : '';
      wrapper.style.opacity = dis ? '0.5' : '';
    });

    return wrapper;
  };
});

// ============================================================================
// Resizable — Panel resize via edge handles
// ============================================================================

export interface ResizableProps {
  /** Which edge(s) can be dragged: 'left' | 'right' | 'top' | 'bottom' | 'both' (left+right) */
  direction?: 'left' | 'right' | 'top' | 'bottom' | 'both';
  /** Minimum size in px or CSS (default: 100) */
  minSize?: number;
  /** Maximum size in px (default: Infinity) */
  maxSize?: number;
  /** Resize callback (receives new size in px) */
  onResize?: (size: number) => void;
  /** Drag end callback */
  onResizeEnd?: (size: number) => void;
  /** Handle width/height in px (default: 6) */
  handleSize?: number;
  /** Disabled */
  disabled?: boolean;
}

export const Resizable = defineComponent<ResizableProps>((ctx) => {
  return () => {
    const props = ctx.props;
    const direction = props.direction ?? 'right';
    const minSize = props.minSize ?? 100;
    const maxSize = props.maxSize ?? Infinity;
    const handleSize = props.handleSize ?? 8;
    const isHorizontal = direction === 'left' || direction === 'right' || direction === 'both';
    const isVertical = direction === 'top' || direction === 'bottom';

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position: relative; overflow: hidden;';

    // Append children directly into wrapper (no inner content div).
    // Resize operates on wrapper itself.
    const children = resolveChildren(ctx);
    if (children != null) {
      const items = Array.isArray(children) ? children : [children];
      for (const child of items) {
        if (child instanceof Node) wrapper.appendChild(child);
        else if (child != null) wrapper.appendChild(nodeToDOM(child));
      }
    }

    // Set initial size from natural content size on first frame
    requestAnimationFrame(() => {
      if (isHorizontal && !wrapper.style.width) {
        wrapper.style.width = `${wrapper.offsetWidth}px`;
      }
      if (isVertical && !wrapper.style.height) {
        wrapper.style.height = `${wrapper.offsetHeight}px`;
      }
    });

    function createHandle(edge: 'left' | 'right' | 'top' | 'bottom'): HTMLElement {
      const handle = document.createElement('div');
      const isH = edge === 'left' || edge === 'right';
      // Visual handle is handleSize wide, but the hit area extends further
      // inward via padding for easier targeting.
      const hitPad = Math.max(4, handleSize);
      handle.style.cssText = `
        position: absolute;
        ${isH ? `${edge}: -${Math.floor(handleSize / 2)}px; top: 0; bottom: 0; width: ${handleSize}px; cursor: col-resize; padding: 0 ${hitPad}px;` : ''}
        ${!isH ? `${edge}: -${Math.floor(handleSize / 2)}px; left: 0; right: 0; height: ${handleSize}px; cursor: row-resize; padding: ${hitPad}px 0;` : ''}
        z-index: 5;
        background-clip: content-box;
        background: transparent;
        transition: background 120ms;
        box-sizing: content-box;
        margin: ${isH ? `0 -${hitPad}px` : `-${hitPad}px 0`};
      `;
      handle.addEventListener('mouseenter', () => {
        handle.style.background = 'var(--md-sys-color-primary, #6750a4)';
      });
      handle.addEventListener('mouseleave', () => {
        if (!handle.dataset.dragging) handle.style.background = 'transparent';
      });

      handle.addEventListener('pointerdown', (e) => {
        if (readProp(props.disabled)) return;
        e.preventDefault();
        handle.dataset.dragging = '1';
        handle.style.background = 'var(--md-sys-color-primary, #6750a4)';
        const startPos = isH ? e.clientX : e.clientY;
        const startSize = isH ? wrapper.offsetWidth : wrapper.offsetHeight;
        const sign = (edge === 'right' || edge === 'bottom') ? 1 : -1;
        document.body.style.cursor = isH ? 'col-resize' : 'row-resize';
        document.body.style.userSelect = 'none';

        const onMove = (ev: PointerEvent) => {
          const delta = ((isH ? ev.clientX : ev.clientY) - startPos) * sign;
          const newSize = clamp(startSize + delta, minSize, maxSize);
          if (isH) {
            wrapper.style.width = `${newSize}px`;
          } else {
            wrapper.style.height = `${newSize}px`;
          }
          props.onResize?.(newSize);
        };
        const onUp = () => {
          document.removeEventListener('pointermove', onMove);
          document.removeEventListener('pointerup', onUp);
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
          delete handle.dataset.dragging;
          handle.style.background = 'transparent';
          const finalSize = isH ? wrapper.offsetWidth : wrapper.offsetHeight;
          props.onResizeEnd?.(finalSize);
        };
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
      });

      return handle;
    }

    // Add handles
    if (direction === 'both') {
      wrapper.appendChild(createHandle('left'));
      wrapper.appendChild(createHandle('right'));
    } else {
      wrapper.appendChild(createHandle(direction as any));
    }

    return wrapper;
  };
});

// ============================================================================
// DropZone — File upload drop zone
// ============================================================================

export interface DropZoneProps {
  /** Called when files are dropped */
  onFileDrop?: (files: FileList) => void;
  /** CSS class added when files are dragged over */
  activeClass?: string;
  /** Accepted file types (e.g., '.jpg,.png' or 'image/*') */
  accept?: string;
  /** Allow multiple files (default: true) */
  multiple?: boolean;
  /** Disabled */
  disabled?: boolean;
}

export const DropZone = defineComponent<DropZoneProps>((ctx) => {
  return () => {
    const props = ctx.props;
    const activeClass = props.activeClass ?? 'akash-drop-active';
    const multiple = props.multiple ?? true;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position: relative;';

    // Render children
    const children = resolveChildren(ctx);
    if (children != null) {
      const items = Array.isArray(children) ? children : [children];
      for (const child of items) {
        if (child instanceof Node) wrapper.appendChild(child);
        else if (child != null) wrapper.appendChild(nodeToDOM(child));
      }
    }

    let dragCounter = 0; // Track nested dragenter/dragleave

    wrapper.addEventListener('dragenter', (e) => {
      if (readProp(props.disabled)) return;
      e.preventDefault();
      dragCounter++;
      if (dragCounter === 1) wrapper.classList.add(activeClass);
    });

    wrapper.addEventListener('dragover', (e) => {
      if (readProp(props.disabled)) return;
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'copy';
    });

    wrapper.addEventListener('dragleave', (e) => {
      if (readProp(props.disabled)) return;
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        wrapper.classList.remove(activeClass);
      }
    });

    wrapper.addEventListener('drop', (e) => {
      if (readProp(props.disabled)) return;
      e.preventDefault();
      dragCounter = 0;
      wrapper.classList.remove(activeClass);

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      // Filter by accept type if specified
      if (props.accept) {
        const accept = props.accept;
        const filtered = filterFiles(files, accept);
        if (filtered.length > 0) {
          props.onFileDrop?.(multiple ? toFileList(filtered) : toFileList([filtered[0]]));
        }
      } else {
        props.onFileDrop?.(multiple ? files : toFileList([files[0]]));
      }
    });

    // Also support click-to-browse
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = multiple;
    if (props.accept) fileInput.accept = props.accept;
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files.length > 0) {
        props.onFileDrop?.(fileInput.files);
        fileInput.value = ''; // reset for re-selection
      }
    });
    wrapper.appendChild(fileInput);
    wrapper.addEventListener('click', () => {
      if (!readProp(props.disabled)) fileInput.click();
    });

    // Inject default active style if not custom
    if (activeClass === 'akash-drop-active' && !document.getElementById('akash-drop-styles')) {
      const style = document.createElement('style');
      style.id = 'akash-drop-styles';
      style.textContent = `.akash-drop-active { outline: 2px dashed var(--md-sys-color-primary, #6750a4); outline-offset: -2px; background: var(--md-sys-color-primary-container, #eaddff22); }`;
      document.head.appendChild(style);
    }

    return wrapper;
  };
});

// --- File helpers ---

function filterFiles(files: FileList, accept: string): File[] {
  const types = accept.split(',').map(t => t.trim().toLowerCase());
  return Array.from(files).filter(file => {
    const name = file.name.toLowerCase();
    const mime = file.type.toLowerCase();
    return types.some(t => {
      if (t.startsWith('.')) return name.endsWith(t);
      if (t.endsWith('/*')) return mime.startsWith(t.replace('/*', '/'));
      return mime === t;
    });
  });
}

function toFileList(files: File[]): FileList {
  const dt = new DataTransfer();
  for (const f of files) dt.items.add(f);
  return dt.files;
}
