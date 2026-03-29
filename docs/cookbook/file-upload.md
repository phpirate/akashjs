# File Upload

## Problem

You need file uploads with drag-and-drop, progress tracking, image preview, chunked upload for large files, cancellation, and validation.

## Solution

Build a reusable upload zone using signals for state management and the Fetch API with `XMLHttpRequest` for progress tracking.

### 1. Upload State

```ts
// src/upload.ts
import { signal, computed } from '@akashjs/runtime';

interface UploadFile {
  id: string;
  file: File;
  progress: number;    // 0-100
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
  previewUrl?: string;
  abort?: AbortController;
}

const files = signal<UploadFile[]>([]);
const isUploading = computed(() => files().some((f) => f.status === 'uploading'));

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

function validate(file: File): string | null {
  if (file.size > MAX_SIZE) return `File too large (max ${MAX_SIZE / 1024 / 1024}MB)`;
  if (!ALLOWED_TYPES.includes(file.type)) return `Type not allowed: ${file.type}`;
  return null;
}
```

### 2. Drag-and-Drop Zone

```ts
const isDragOver = signal(false);

function handleDragOver(e: DragEvent) {
  e.preventDefault();
  isDragOver.set(true);
}

function handleDragLeave() {
  isDragOver.set(false);
}

function handleDrop(e: DragEvent) {
  e.preventDefault();
  isDragOver.set(false);
  const dropped = Array.from(e.dataTransfer?.files ?? []);
  addFiles(dropped);
}

function handleFileInput(e: Event) {
  const input = e.target as HTMLInputElement;
  const selected = Array.from(input.files ?? []);
  addFiles(selected);
  input.value = ''; // Reset so the same file can be re-selected
}

function addFiles(newFiles: File[]) {
  const entries: UploadFile[] = newFiles.map((file) => {
    const error = validate(file);
    const entry: UploadFile = {
      id: crypto.randomUUID(),
      file,
      progress: 0,
      status: error ? 'error' : 'pending',
      error: error ?? undefined,
    };
    // Generate preview for images
    if (!error && file.type.startsWith('image/')) {
      entry.previewUrl = URL.createObjectURL(file);
    }
    return entry;
  });
  files.update((prev) => [...prev, ...entries]);
}
```

### 3. Template

```html
<div class="upload-zone"
     :class="{ 'drag-over': isDragOver() }"
     @dragover={handleDragOver}
     @dragleave={handleDragLeave}
     @drop={handleDrop}>

  <input type="file" id="file-input" multiple
         accept={ALLOWED_TYPES.join(',')}
         @change={handleFileInput}
         class="sr-only" />

  <label for="file-input" class="upload-label">
    <p>Drag files here or <span class="link">browse</span></p>
    <p class="muted">Max 10MB. JPEG, PNG, WebP, PDF.</p>
  </label>
</div>

<!-- File list -->
<div :for={entry of files()} :key={entry.id} class="file-item">
  <img :if={entry.previewUrl} :src={entry.previewUrl}
       alt="Preview" class="file-preview" />
  <div class="file-info">
    <span class="file-name">{entry.file.name}</span>
    <span class="file-size">{formatSize(entry.file.size)}</span>
  </div>

  <!-- Progress bar -->
  <div :if={entry.status === 'uploading'} class="progress-bar">
    <div class="progress-fill" :style="{ width: entry.progress + '%' }"></div>
  </div>

  <span :if={entry.status === 'done'} class="status-done">Uploaded</span>
  <span :if={entry.status === 'error'} class="status-error">{entry.error}</span>

  <button :if={entry.status === 'uploading'} @click={() => cancelUpload(entry.id)}>
    Cancel
  </button>
  <button :if={entry.status === 'pending' || entry.status === 'error'}
          @click={() => removeFile(entry.id)}>
    Remove
  </button>
</div>

<button :if={files().some(f => f.status === 'pending')}
        @click={uploadAll} :disabled={isUploading()}>
  Upload All
</button>
```

::: tip
Use `URL.createObjectURL` for image previews instead of `FileReader.readAsDataURL`. It is faster and does not block the main thread for large images.
:::

### 4. Upload with Progress Tracking

```ts
function uploadFile(id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const entry = files().find((f) => f.id === id);
    if (!entry) return reject(new Error('File not found'));

    const xhr = new XMLHttpRequest();
    const abort = new AbortController();

    updateFile(id, { status: 'uploading', progress: 0, abort });

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        updateFile(id, { progress: Math.round((e.loaded / e.total) * 100) });
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        updateFile(id, { status: 'done', progress: 100 });
        resolve();
      } else {
        updateFile(id, { status: 'error', error: `Server error: ${xhr.status}` });
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      updateFile(id, { status: 'error', error: 'Network error' });
      reject(new Error('Network error'));
    });

    const formData = new FormData();
    formData.append('file', entry.file);

    xhr.open('POST', '/api/upload');
    xhr.send(formData);

    abort.signal.addEventListener('abort', () => xhr.abort());
  });
}

function updateFile(id: string, patch: Partial<UploadFile>) {
  files.update((list) =>
    list.map((f) => (f.id === id ? { ...f, ...patch } : f))
  );
}

function cancelUpload(id: string) {
  const entry = files().find((f) => f.id === id);
  entry?.abort?.abort();
  updateFile(id, { status: 'error', error: 'Cancelled' });
}

function removeFile(id: string) {
  files.update((list) => list.filter((f) => f.id !== id));
}

async function uploadAll() {
  const pending = files().filter((f) => f.status === 'pending');
  await Promise.allSettled(pending.map((f) => uploadFile(f.id)));
}
```

::: warning
Use `XMLHttpRequest` instead of `fetch` when you need upload progress. The Fetch API does not support upload progress events in most browsers.
:::

### 5. Chunked Upload for Large Files

```ts
const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB chunks

async function uploadChunked(id: string) {
  const entry = files().find((f) => f.id === id);
  if (!entry) return;

  const totalChunks = Math.ceil(entry.file.size / CHUNK_SIZE);
  updateFile(id, { status: 'uploading', progress: 0 });

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, entry.file.size);
    const chunk = entry.file.slice(start, end);

    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('index', String(i));
    formData.append('total', String(totalChunks));
    formData.append('filename', entry.file.name);

    await fetch('/api/upload/chunk', { method: 'POST', body: formData });
    updateFile(id, { progress: Math.round(((i + 1) / totalChunks) * 100) });
  }

  updateFile(id, { status: 'done', progress: 100 });
}
```

### 6. Helper

```ts
function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
```

### 7. Styles

```css
.upload-zone {
  border: 2px dashed var(--color-border);
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}
.upload-zone.drag-over {
  border-color: var(--color-primary);
  background: rgba(103, 80, 164, 0.05);
}
.file-preview {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 6px;
}
.progress-bar {
  height: 4px;
  background: var(--color-border);
  border-radius: 2px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width 0.2s;
}
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
```

## Result

A complete file upload component with drag-and-drop, instant image previews, per-file progress bars, cancellation, chunked upload for large files, and client-side validation for type and size.
