# Drag & Drop

Components for sortable lists, free-form dragging, panel resizing, and file upload drop zones.

## Import

```ts
import { DragDropList, Draggable, Resizable, DropZone } from '@akashjs/ui';
```

## DragDropList — Sortable List

Reorder items within a list via drag-and-drop.

```ts
DragDropList({
  items: () => columns(),
  onReorder: (from, to) => reorderColumns(from, to),
  handle: true,
  lockAxis: 'y',
  renderItem: (item) => {
    const div = document.createElement('div');
    div.textContent = item.label;
    return div;
  },
})
```

### DragDropList Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `T[] \| (() => T[])` | `[]` | Items to render |
| `onReorder` | `(from, to) => void` | -- | Reorder callback |
| `lockAxis` | `'x' \| 'y'` | -- | Lock drag axis |
| `handle` | `boolean` | `false` | Show drag handle icon |
| `renderItem` | `(item, index) => AkashNode` | -- | Item renderer |
| `disabled` | `boolean` | `false` | Disable dragging |
| `gap` | `string` | `'0'` | Gap between items |

---

## Draggable — Free-Form Dragging

Make any element draggable with optional handle, axis lock, and boundary constraints.

```ts
Draggable({
  handle: '.panel-header',
  boundary: 'parent',
  onDragEnd: (pos) => savePosition(pos),
  children: () => {
    const panel = document.createElement('div');
    panel.innerHTML = `
      <div class="panel-header">Drag me</div>
      <div class="panel-body">Content</div>
    `;
    return panel;
  },
})
```

### Axis Lock

```ts
Draggable({ lockAxis: 'x', children: () => slider })
Draggable({ lockAxis: 'y', children: () => scrollHandle })
```

### Boundary Constraint

```ts
Draggable({ boundary: 'viewport', children: () => fab })
Draggable({ boundary: 'parent', children: () => card })
Draggable({ boundary: containerEl, children: () => widget })
```

### Initial Position

```ts
const savedPos = JSON.parse(localStorage.getItem('fab-pos') ?? '{"x":0,"y":0}');

Draggable({
  initialPosition: savedPos,
  onDragEnd: (pos) => localStorage.setItem('fab-pos', JSON.stringify(pos)),
  children: () => fabButton,
})
```

### Draggable Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `handle` | `string` | -- | CSS selector for drag handle |
| `lockAxis` | `'x' \| 'y'` | -- | Lock to axis |
| `disabled` | `boolean` | `false` | Disable dragging |
| `boundary` | `'viewport' \| 'parent' \| HTMLElement` | -- | Constrain movement |
| `initialPosition` | `{ x, y }` | `{ x: 0, y: 0 }` | Starting offset |
| `onDragStart` | `(pos) => void` | -- | Drag start callback |
| `onDragMove` | `(pos) => void` | -- | Continuous move callback |
| `onDragEnd` | `(pos) => void` | -- | Drag end callback |

---

## Resizable — Panel Resize

Drag edge handles to resize panels.

```ts
Resizable({
  direction: 'right',
  minSize: 200,
  maxSize: 600,
  onResize: (width) => sidebarWidth.set(width),
  onResizeEnd: (width) => localStorage.setItem('sidebar', String(width)),
  children: () => sidebar,
})
```

### Both Edges

```ts
Resizable({
  direction: 'both',
  minSize: 100,
  children: () => centerPanel,
})
```

### Vertical Resize

```ts
Resizable({
  direction: 'bottom',
  minSize: 50,
  maxSize: 400,
  onResize: (h) => editorHeight.set(h),
  children: () => editor,
})
```

### Resizable Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `direction` | `'left' \| 'right' \| 'top' \| 'bottom' \| 'both'` | `'right'` | Resize edge(s) |
| `minSize` | `number` | `100` | Minimum size (px) |
| `maxSize` | `number` | `Infinity` | Maximum size (px) |
| `onResize` | `(size) => void` | -- | Continuous resize callback |
| `onResizeEnd` | `(size) => void` | -- | Resize end callback |
| `handleSize` | `number` | `8` | Handle width/height (px) |
| `disabled` | `boolean` | `false` | Disable resizing |

---

## DropZone — File Upload

Native HTML5 drag-drop for file uploads with click-to-browse fallback.

```ts
DropZone({
  onFileDrop: (files) => handleUpload(files),
  accept: 'image/*,.pdf',
  activeClass: 'drag-over',
  children: () => {
    const area = document.createElement('div');
    area.style.cssText = 'padding: 40px; text-align: center; border: 2px dashed #ccc; border-radius: 8px;';
    area.textContent = 'Drop files here or click to browse';
    return area;
  },
})
```

### DropZone Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `onFileDrop` | `(files: FileList) => void` | -- | File drop callback |
| `activeClass` | `string` | `'akash-drop-active'` | Class added during drag-over |
| `accept` | `string` | -- | Accepted types (e.g., `'image/*,.pdf'`) |
| `multiple` | `boolean` | `true` | Allow multiple files |
| `disabled` | `boolean` | `false` | Disable drop zone |
