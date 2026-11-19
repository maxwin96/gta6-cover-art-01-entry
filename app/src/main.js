// Vice Sunset Cover Maker — editor wiring.
// Upload photos, assign them to panels, crop/position by dragging on the
// preview, edit captions and grade, export the cover as a PNG.
// URL helpers for screenshots: ?sample=1 loads the sample photos,
// ?demo=export&size=1920x1080 shows only the finished cover full-screen.
import { drawCover, panelRects, SIZES, LAYOUTS, GRADES, CAPTION_STYLES } from './cover.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const previewWrap = $('preview');
const params = new URLSearchParams(location.search);

const state = {
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

function ensurePanels() {
  const n = LAYOUTS[state.layout].panels;
  while (state.panels.length < n) state.panels.push({ photo: -1, zoom: 1, ox: 0, oy: 0 });
  state.panels.length = n;
  if (activePanel >= n) activePanel = 0;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function redraw() {
  const [w, h] = SIZES[state.size];
  // Preview stays light: cap the long side at 900 px, keep the export ratio.
  // Demo mode (cover-only screenshots) renders at full export resolution.
  const demo = document.body.classList.contains('demo');
  const previewScale = demo ? 1 : Math.min(1, 900 / Math.max(w, h));
  canvas.width = Math.round(w * previewScale);
  canvas.height = Math.round(h * previewScale);
  drawCover(canvas, photos.map((p) => p.img), state);
  syncPanelControls();
}

function syncPanelControls() {
  const panel = state.panels[activePanel];
  $('panelLabel').textContent = `Panel ${activePanel + 1} of ${state.panels.length}`;
  $('zoom').value = String(panel.zoom);
  $('zoomVal').textContent = `${Math.round(panel.zoom * 100)}%`;
  const sel = $('panelPhoto');
  sel.innerHTML = '<option value="-1">— empty panel —</option>' + photos.map((p, i) =>
    `<option value="${i}"${panel.photo === i ? ' selected' : ''}>${escapeHtml(p.name)}</option>`).join('');
  document.querySelectorAll('.panel-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === activePanel);
    dot.disabled = i >= state.panels.length;
  });
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Renders the cover at full export size on an offscreen canvas. */
function renderExport() {
  const [w, h] = SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off, photos.map((p) => p.img), state);
  return off;
}

function exportPng() {
  const [w, h] = SIZES[state.size];
  renderExport().toBlob((blob) => {
    if (!blob) { $('status').textContent = 'Export failed — try again.'; return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    $('status').textContent = `Saved vice-cover-${w}x${h}.png`;
  }, 'image/png');
}

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
  // Fill empty panels with the new photos, in order.
  let next = photos.length - added;
  state.panels.forEach((panel) => {
    if (panel.photo === -1 && next < photos.length) panel.photo = next++;
  });
  renderThumbs();
  redraw();
  $('status').textContent = `${added} photo${added > 1 ? 's' : ''} added — drag on the cover to position, zoom below.`;
}

async function loadSamples() {
  const pier = await loadImage('samples/pier.jpg');
  const boulevard = await loadImage('samples/boulevard.jpg');
  photos = [
    { img: pier, name: 'Pier sunset' },
    { img: boulevard, name: 'Boulevard' },
  ];
  state.panels[0].photo = 0;
  if (state.panels[1]) state.panels[1].photo = 1;
  if (state.panels[2]) { state.panels[2].photo = 1; state.panels[2].zoom = 1.25; state.panels[2].ox = 0; state.panels[2].oy = -0.06; }
  if (state.panels[3]) state.panels[3].photo = 0;
  renderThumbs();
  redraw();
}

function renderThumbs() {
  const strip = $('thumbs');
  strip.innerHTML = '';
  photos.forEach((p, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb';
    b.title = `Use “${p.name}” in panel ${activePanel + 1}`;
    const t = document.createElement('img');
    t.src = p.img.src;
    t.alt = p.name;
    b.appendChild(t);
    b.appendChild(document.createTextNode(p.name));
    b.addEventListener('click', () => {
      state.panels[activePanel].photo = i;
      redraw();
    });
    strip.appendChild(b);
  });
  $('photoCount').textContent = photos.length ? `${photos.length} photo${photos.length > 1 ? 's' : ''} loaded` : 'No photos yet';
}

/** Applies one photo to every panel (same photo, different crops). */
function fillAllWith(photoIndex) {
  state.panels.forEach((panel, i) => {
    panel.photo = photoIndex;
    panel.zoom = 1 + i * 0.12;
    panel.ox = i % 2 ? 0.06 : -0.06;
    panel.oy = 0;
  });
  redraw();
}

// ---- Controls ----
$('photo').addEventListener('change', (e) => addPhotoFiles([...e.target.files]));
$('loadSample').addEventListener('click', loadSamples);
$('fillAll').addEventListener('click', () => {
  const panel = state.panels[activePanel];
  if (panel.photo >= 0) fillAllWith(panel.photo);
  else $('status').textContent = 'Pick a photo for the active panel first.';
});
$('clearPhotos').addEventListener('click', () => {
  photos = [];
  state.panels.forEach((p) => { p.photo = -1; p.zoom = 1; p.ox = 0; p.oy = 0; });
  renderThumbs();
  redraw();
});

document.querySelectorAll('[data-layout]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.layout = btn.dataset.layout;
    ensurePanels();
    document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('active', b === btn));
    redraw();
  });
});

$('size').addEventListener('change', (e) => { state.size = e.target.value; redraw(); });
$('topText').addEventListener('input', (e) => { state.topText = e.target.value; redraw(); });
$('bottomText').addEventListener('input', (e) => { state.bottomText = e.target.value; redraw(); });
$('subText').addEventListener('input', (e) => { state.subText = e.target.value; redraw(); });
$('captionStyle').addEventListener('change', (e) => { state.captionStyle = e.target.value; redraw(); });
$('grade').addEventListener('change', (e) => { state.grade = e.target.value; redraw(); });
$('gradeStrength').addEventListener('input', (e) => {
  state.gradeStrength = Number(e.target.value);
  $('gradeVal').textContent = `${Math.round(state.gradeStrength * 100)}%`;
  redraw();
});
[['halftone', 'halftone'], ['grain', 'grain'], ['vignette', 'vignette']].forEach(([id, key]) => {
  $(id).addEventListener('change', (e) => { state[key] = e.target.checked; redraw(); });
});
$('panelPhoto').addEventListener('change', (e) => {
  state.panels[activePanel].photo = Number(e.target.value);
  redraw();
});
$('zoom').addEventListener('input', (e) => {
  state.panels[activePanel].zoom = Number(e.target.value);
  redraw();
});
$('resetCrop').addEventListener('click', () => {
  Object.assign(state.panels[activePanel], { zoom: 1, ox: 0, oy: 0 });
  redraw();
});
document.querySelectorAll('.panel-dot').forEach((dot, i) => {
  dot.addEventListener('click', () => { activePanel = i; redraw(); });
});
$('export').addEventListener('click', exportPng);

// ---- Drag to pan, wheel to zoom, click to pick a panel ----
let dragging = null;
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width * canvas.width, y: (e.clientY - r.top) / r.height * canvas.height };
}
function panelAt(x, y) {
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  return rects.findIndex((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
}
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const i = panelAt(p.x, p.y);
  if (i < 0) return;
  activePanel = i;
  canvas.setPointerCapture(e.pointerId);
  dragging = { x: p.x, y: p.y, ox: state.panels[i].ox, oy: state.panels[i].oy };
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const p = canvasPoint(e);
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  const rect = rects[activePanel];
  state.panels[activePanel].ox = dragging.ox + (p.x - dragging.x) / rect.w;
  state.panels[activePanel].oy = dragging.oy + (p.y - dragging.y) / rect.h;
  redraw();
});
canvas.addEventListener('pointerup', () => { dragging = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const panel = state.panels[activePanel];
  panel.zoom = Math.min(3, Math.max(1, panel.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
  redraw();
}, { passive: false });

// ---- Fill the selects from the cover module's tables ----
for (const [key, g] of Object.entries(GRADES)) {
  const o = document.createElement('option');
  o.value = key; o.textContent = g.name;
  $('grade').appendChild(o);
}
for (const [key, s] of Object.entries(CAPTION_STYLES)) {
  const o = document.createElement('option');
  o.value = key; o.textContent = s.name;
  $('captionStyle').appendChild(o);
}
$('grade').value = state.grade;
$('captionStyle').value = state.captionStyle;

// ---- URL params: ?caption=, ?sample=1, ?demo=export&size=... ----
if (params.get('caption')) {
  state.bottomText = params.get('caption');
  $('bottomText').value = state.bottomText;
}
if (params.get('size') && SIZES[params.get('size')]) {
  state.size = params.get('size');
  $('size').value = state.size;
}
if (params.get('layout') && LAYOUTS[params.get('layout')]) {
  state.layout = params.get('layout');
  document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
}
ensurePanels();

async function boot() {
  // Wait for Anton so the first paint already uses the display font.
  try {
    await document.fonts.load('40px Anton');
    await document.fonts.ready;
    fontReady = true;
  } catch { /* fall back to sans-serif */ }
  if (params.get('sample') === '1' || params.get('demo') === 'export') {
    if (params.get('caption')) state.bottomText = params.get('caption');
    await loadSamples();
  }
  if (params.get('demo') === 'export') {
    document.body.classList.add('demo');
    $('topText').value = state.topText;
  }
  redraw();
  if (fontReady) redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

redraw();
boot();
