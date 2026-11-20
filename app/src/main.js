// Vice Sunset Cover Maker — editor wiring.
//
// Upload photos, assign them to panels, crop and position by dragging on the
// preview, edit captions and grade, then export the cover as a PNG.
// URL helpers for screenshots: ?sample=1 loads the sample photos,
// ?demo=export&size=1920x1080 shows only the finished cover full-screen.
import { drawCover, panelRects, SIZES, LAYOUTS, GRADES, CAPTION_STYLES } from './cover.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const params = new URLSearchParams(location.search);

const editor = {
  size: '1920x1080',
  layout: 'hero-left',
  topText: 'VICE CITY',
  bottomText: 'Sunset Heist',
  subText: 'A story in three panels',
  captionStyle: 'neon',
  grade: 'sunset',
  gradeStrength: 0.7,
  halftone: true,
  grain: true,
  vignette: true,
  panels: [
    { photo: -1, zoom: 1, ox: 0, oy: 0 },
    { photo: -1, zoom: 1, ox: 0, oy: 0 },
    { photo: -1, zoom: 1, ox: 0, oy: 0 },
  ],
};

let photos = []; // { img, name }
let activePanel = 0;
let fontReady = false;

/** Grows or shrinks the panel list to match the current layout. */
function ensurePanels() {
  const count = LAYOUTS[editor.layout].panels;
  while (editor.panels.length < count) editor.panels.push({ photo: -1, zoom: 1, ox: 0, oy: 0 });
  editor.panels.length = count;
  if (activePanel >= count) activePanel = 0;
}

/** Loads an image from a URL into an HTMLImageElement. */
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Redraws the preview at a capped resolution (full size in demo mode). */
function redraw() {
  const [w, h] = SIZES[editor.size];
  const demo = document.body.classList.contains('demo');
  const previewScale = demo ? 1 : Math.min(1, 900 / Math.max(w, h));
  canvas.width = Math.round(w * previewScale);
  canvas.height = Math.round(h * previewScale);
  drawCover(canvas, photos.map((p) => p.img), editor);
  syncPanelControls();
}

/** Reflects the active panel in the sidebar controls. */
function syncPanelControls() {
  const panel = editor.panels[activePanel];
  $('panelLabel').textContent = `Panel ${activePanel + 1} of ${editor.panels.length}`;
  $('zoom').value = String(panel.zoom);
  $('zoomVal').textContent = `${Math.round(panel.zoom * 100)}%`;
  const options = ['<option value="-1">— empty panel —</option>'];
  photos.forEach((p, i) => {
    options.push(`<option value="${i}"${panel.photo === i ? ' selected' : ''}>${escapeHtml(p.name)}</option>`);
  });
  $('panelPhoto').innerHTML = options.join('');
  document.querySelectorAll('.panel-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === activePanel);
    dot.disabled = i >= editor.panels.length;
  });
}

/** Escapes text for safe use inside an option label. */
function escapeHtml(s) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return s.replace(/[&<>"']/g, (c) => map[c]);
}

/** Renders the cover at full export size on an offscreen canvas. */
function renderExport() {
  const [w, h] = SIZES[editor.size];
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off, photos.map((p) => p.img), editor);
  return off;
}

/** Downloads the current cover as a PNG at the chosen export size. */
function exportPng() {
  const [w, h] = SIZES[editor.size];
  renderExport().toBlob((blob) => {
    if (!blob) {
      $('status').textContent = 'Export failed — try again.';
      return;
    }
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `vice-cover-${w}x${h}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 5000);
    $('status').textContent = `Saved vice-cover-${w}x${h}.png`;
  }, 'image/png');
}

/** Adds user-uploaded files as photos, filling empty panels in order. */
async function addPhotoFiles(files) {
  let added = 0;
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    try {
      const img = await loadImage(URL.createObjectURL(file));
      photos.push({ img, name: file.name.replace(/\.[^.]+$/, '') });
      added++;
    } catch { /* skip unreadable files */ }
  }
  if (!added) return;
  let next = photos.length - added;
  editor.panels.forEach((panel) => {
    if (panel.photo === -1 && next < photos.length) panel.photo = next++;
  });
  renderThumbs();
  redraw();
  $('status').textContent = `${added} photo${added > 1 ? 's' : ''} added — drag on the cover to position, zoom below.`;
}

/** Loads the two bundled sample photos and assigns them to the panels. */
async function loadSamples() {
  const pier = await loadImage('samples/pier.jpg');
  const boulevard = await loadImage('samples/boulevard.jpg');
  photos = [
    { img: pier, name: 'Pier sunset' },
    { img: boulevard, name: 'Boulevard' },
  ];
  const slots = [
    { photo: 0 },
    { photo: 1 },
    { photo: 1, zoom: 1.25, ox: 0, oy: -0.06 },
    { photo: 0 },
  ];
  editor.panels.forEach((panel, i) => {
    if (slots[i]) Object.assign(panel, slots[i]);
  });
  renderThumbs();
  redraw();
}

/** Rebuilds the thumbnail strip from the photo library. */
function renderThumbs() {
  const strip = $('thumbs');
  strip.innerHTML = '';
  photos.forEach((p, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'thumb';
    button.title = `Use “${p.name}” in panel ${activePanel + 1}`;
    const thumb = document.createElement('img');
    thumb.src = p.img.src;
    thumb.alt = p.name;
    button.appendChild(thumb);
    button.appendChild(document.createTextNode(p.name));
    button.addEventListener('click', () => {
      editor.panels[activePanel].photo = i;
      redraw();
    });
    strip.appendChild(button);
  });
  $('photoCount').textContent = photos.length
    ? `${photos.length} photo${photos.length > 1 ? 's' : ''} loaded`
    : 'No photos yet';
}

/** Applies one photo to every panel (same photo, different crops). */
function fillAllWith(photoIndex) {
  editor.panels.forEach((panel, i) => {
    panel.photo = photoIndex;
    panel.zoom = 1 + i * 0.12;
    panel.ox = i % 2 ? 0.06 : -0.06;
    panel.oy = 0;
  });
  redraw();
}

/** Empties every panel and drops the whole photo library. */
function clearAllPhotos() {
  photos = [];
  editor.panels.forEach((p) => { p.photo = -1; p.zoom = 1; p.ox = 0; p.oy = 0; });
  renderThumbs();
  redraw();
}

/** Reads the initial editor state from the URL (?caption=, ?size=, ?layout=). */
function applyUrlParams() {
  if (params.get('caption')) {
    editor.bottomText = params.get('caption');
    $('bottomText').value = editor.bottomText;
  }
  if (params.get('size') && SIZES[params.get('size')]) {
    editor.size = params.get('size');
    $('size').value = editor.size;
  }
  if (params.get('layout') && LAYOUTS[params.get('layout')]) {
    editor.layout = params.get('layout');
    document.querySelectorAll('[data-layout]').forEach((b) => {
      b.classList.toggle('active', b.dataset.layout === editor.layout);
    });
  }
}

// ---- Sidebar controls ----
$('photo').addEventListener('change', (e) => addPhotoFiles([...e.target.files]));
$('loadSample').addEventListener('click', loadSamples);
$('fillAll').addEventListener('click', () => {
  const panel = editor.panels[activePanel];
  if (panel.photo >= 0) fillAllWith(panel.photo);
  else $('status').textContent = 'Pick a photo for the active panel first.';
});
$('clearPhotos').addEventListener('click', clearAllPhotos);

document.querySelectorAll('[data-layout]').forEach((btn) => {
  btn.addEventListener('click', () => {
    editor.layout = btn.dataset.layout;
    ensurePanels();
    document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('active', b === btn));
    redraw();
  });
});

$('size').addEventListener('change', (e) => { editor.size = e.target.value; redraw(); });
$('topText').addEventListener('input', (e) => { editor.topText = e.target.value; redraw(); });
$('bottomText').addEventListener('input', (e) => { editor.bottomText = e.target.value; redraw(); });
$('subText').addEventListener('input', (e) => { editor.subText = e.target.value; redraw(); });
$('captionStyle').addEventListener('change', (e) => { editor.captionStyle = e.target.value; redraw(); });
$('grade').addEventListener('change', (e) => { editor.grade = e.target.value; redraw(); });
$('gradeStrength').addEventListener('input', (e) => {
  editor.gradeStrength = Number(e.target.value);
  $('gradeVal').textContent = `${Math.round(editor.gradeStrength * 100)}%`;
  redraw();
});
[['halftone', 'halftone'], ['grain', 'grain'], ['vignette', 'vignette']].forEach(([id, key]) => {
  $(id).addEventListener('change', (e) => { editor[key] = e.target.checked; redraw(); });
});
$('panelPhoto').addEventListener('change', (e) => {
  editor.panels[activePanel].photo = Number(e.target.value);
  redraw();
});
$('zoom').addEventListener('input', (e) => {
  editor.panels[activePanel].zoom = Number(e.target.value);
  redraw();
});
$('resetCrop').addEventListener('click', () => {
  Object.assign(editor.panels[activePanel], { zoom: 1, ox: 0, oy: 0 });
  redraw();
});
document.querySelectorAll('.panel-dot').forEach((dot, i) => {
  dot.addEventListener('click', () => { activePanel = i; redraw(); });
});
$('export').addEventListener('click', exportPng);

// ---- Drag to pan, wheel to zoom, click to pick a panel ----
let drag = null;

/** Converts a pointer event to canvas pixel coordinates. */
function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) / rect.width * canvas.width,
    y: (e.clientY - rect.top) / rect.height * canvas.height,
  };
}

/** Returns the index of the panel under a canvas point, or -1. */
function panelAt(x, y) {
  const rects = panelRects(editor.layout, canvas.width, canvas.height);
  return rects.findIndex((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
}

canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const i = panelAt(p.x, p.y);
  if (i < 0) return;
  activePanel = i;
  canvas.setPointerCapture(e.pointerId);
  drag = { x: p.x, y: p.y, ox: editor.panels[i].ox, oy: editor.panels[i].oy };
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const rect = panelRects(editor.layout, canvas.width, canvas.height)[activePanel];
  editor.panels[activePanel].ox = drag.ox + (p.x - drag.x) / rect.w;
  editor.panels[activePanel].oy = drag.oy + (p.y - drag.y) / rect.h;
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const panel = editor.panels[activePanel];
  panel.zoom = Math.min(3, Math.max(1, panel.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
  redraw();
}, { passive: false });

// ---- Fill the selects from the cover module's tables ----
function fillSelect(id, entries) {
  const select = $(id);
  for (const [key, entry] of Object.entries(entries)) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = entry.name;
    select.appendChild(option);
  }
}
fillSelect('grade', GRADES);
fillSelect('captionStyle', CAPTION_STYLES);
$('grade').value = editor.grade;
$('captionStyle').value = editor.captionStyle;

applyUrlParams();
ensurePanels();

/** Boots the editor: waits for the Anton display font, then loads samples/demo if requested. */
async function boot() {
  try {
    await document.fonts.load('40px Anton');
    await document.fonts.ready;
    fontReady = true;
  } catch { /* fall back to sans-serif */ }
  if (params.get('sample') === '1' || params.get('demo') === 'export') {
    if (params.get('caption')) editor.bottomText = params.get('caption');
    await loadSamples();
  }
  if (params.get('demo') === 'export') {
    document.body.classList.add('demo');
    $('topText').value = editor.topText;
  }
  redraw();
  if (fontReady) redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

redraw();
boot();
