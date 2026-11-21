// Vice Sunset Cover Maker — editor UI: state, panel interaction, export.
import { LAYOUTS, GRADES, CAPTION_COLORS, panelRects, drawCover, renderExport } from './cover.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const SAMPLES = [
  { name: 'Boulevard', src: 'samples/boulevard.jpg' },
  { name: 'Pier', src: 'samples/pier.jpg' },
];

const state = {
  layout: 'hero',
  grade: 'sunset',
  title: 'VICE SUNSET',
  subtitle: 'Leonida Nights',
  titleSize: 1,
  position: 'bottom',
  color: 'white',
  outline: true,
  shadow: true,
  grain: true,
  vignette: true,
  zoom: 1,
  photos: [],
  selectedPanel: 0,
};

let previewCanvas;
let previewCtx;
let previewW = 1080;
let previewH = 1080;
let sampleImgs = [];
let drag = null;

function panelCount() {
  return LAYOUTS[state.layout].panels;
}

function ensurePhotos() {
  while (state.photos.length < panelCount()) {
    state.photos.push({ img: null, panX: 0, panY: 0, zoom: 1, index: state.photos.length });
  }
  state.photos.length = panelCount();
  state.photos.forEach((p, i) => { p.index = i; });
  if (state.selectedPanel >= panelCount()) state.selectedPanel = 0;
}

function aspectFor(layout) {
  // Preview aspect follows the layout: wide duo, square otherwise.
  return state.layout === 'duo' ? 16 / 9 : 1;
}

function render() {
  ensurePhotos();
  const ratio = aspectFor(state.layout);
  previewW = 1080;
  previewH = Math.round(1080 / ratio);
  if (previewCanvas.width !== previewW || previewCanvas.height !== previewH) {
    previewCanvas.width = previewW;
    previewCanvas.height = previewH;
  }
  drawCover(previewCtx, state, previewW, previewH);
  updateSelectedPanelUI();
}

function updateSelectedPanelUI() {
  $$('.panel-chip').forEach((chip, i) => {
    chip.classList.toggle('active', i === state.selectedPanel);
    chip.disabled = i >= panelCount();
  });
  const photo = state.photos[state.selectedPanel];
  const zoom = $('#zoom');
  if (photo && zoom) zoom.value = String(photo.zoom || 1);
  $('#zoomVal').textContent = `${Math.round((photo ? photo.zoom || 1 : 1) * 100)}%`;
}

function assignPhoto(img, panelIndex) {
  ensurePhotos();
  const target = panelIndex === undefined ? state.selectedPanel : panelIndex;
  state.photos[target] = { img, panX: 0, panY: 0, zoom: state.zoom, index: target };
  render();
}

function fillAll() {
  const img = sampleImgs[0] || null;
  if (!img) return;
  ensurePhotos();
  for (let i = 0; i < panelCount(); i++) {
    state.photos[i] = { img, panX: 0, panY: 0, zoom: state.zoom, index: i };
  }
  render();
}

function exportPNG(width, height) {
  const canvas = renderExport(state, width, height);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vice-sunset-cover-${width}x${height}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, 'image/png');
}

function canvasPos(evt) {
  const rect = previewCanvas.getBoundingClientRect();
  return {
    x: (evt.clientX - rect.left) / rect.width,
    y: (evt.clientY - rect.top) / rect.height,
  };
}

function hitPanel(pos) {
  const rects = panelRects(state.layout);
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    if (pos.x >= r.x && pos.x <= r.x + r.w && pos.y >= r.y && pos.y <= r.y + r.h) return i;
  }
  return 0;
}

function bindEvents() {
  // Layout buttons.
  $$('[data-layout]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.layout = btn.dataset.layout;
      $$('[data-layout]').forEach((b) => b.classList.toggle('active', b === btn));
      render();
    });
  });

  // Grade buttons.
  $$('[data-grade]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.grade = btn.dataset.grade;
      $$('[data-grade]').forEach((b) => b.classList.toggle('active', b === btn));
      render();
    });
  });

  // Caption inputs.
  $('#title').addEventListener('input', (e) => { state.title = e.target.value; render(); });
  $('#subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; render(); });
  $('#titleSize').addEventListener('input', (e) => {
    state.titleSize = Number(e.target.value);
    $('#titleSizeVal').textContent = `${Math.round(state.titleSize * 100)}%`;
    render();
  });
  $('#position').addEventListener('change', (e) => { state.position = e.target.value; render(); });
  $('#color').addEventListener('change', (e) => { state.color = e.target.value; render(); });
  $('#outline').addEventListener('change', (e) => { state.outline = e.target.checked; render(); });
  $('#shadow').addEventListener('change', (e) => { state.shadow = e.target.checked; render(); });
  $('#grain').addEventListener('change', (e) => { state.grain = e.target.checked; render(); });
  $('#vignette').addEventListener('change', (e) => { state.vignette = e.target.checked; render(); });

  // Panel controls.
  $$('.panel-chip').forEach((chip, i) => {
    chip.addEventListener('click', () => { state.selectedPanel = i; render(); });
  });
  $('#zoom').addEventListener('input', (e) => {
    state.zoom = Number(e.target.value);
    const photo = state.photos[state.selectedPanel];
    if (photo) photo.zoom = state.zoom;
    $('#zoomVal').textContent = `${Math.round(state.zoom * 100)}%`;
    render();
  });
  $('#fillAll').addEventListener('click', fillAll);
  $('#upload').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => assignPhoto(img);
    img.src = URL.createObjectURL(file);
    e.target.value = '';
  });
  $('#chooseFile').addEventListener('click', () => $('#upload').click());

  // Sample thumbnails: click assigns to the selected panel.
  $$('.sample-thumb').forEach((thumb, i) => {
    thumb.addEventListener('click', () => {
      if (sampleImgs[i]) assignPhoto(sampleImgs[i]);
    });
  });

  // Canvas: click selects a panel, drag pans its photo.
  previewCanvas.addEventListener('pointerdown', (e) => {
    const pos = canvasPos(e);
    const panel = hitPanel(pos);
    state.selectedPanel = panel;
    drag = { panel, startX: pos.x, startY: pos.y, moved: false };
    previewCanvas.setPointerCapture(e.pointerId);
    render();
  });
  previewCanvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const pos = canvasPos(e);
    const photo = state.photos[drag.panel];
    if (photo && photo.img) {
      const dx = pos.x - drag.startX;
      const dy = pos.y - drag.startY;
      if (Math.abs(dx) + Math.abs(dy) > 0.002) drag.moved = true;
      photo.panX = Math.max(-0.5, Math.min(0.5, (photo.panX || 0) + dx));
      photo.panY = Math.max(-0.5, Math.min(0.5, (photo.panY || 0) + dy));
      drag.startX = pos.x;
      drag.startY = pos.y;
      render();
    }
  });
  previewCanvas.addEventListener('pointerup', () => { drag = null; });

  // Export buttons.
  $$('[data-export]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [w, h] = btn.dataset.export.split('x').map(Number);
      exportPNG(w, h);
    });
  });
}

function fillDefaults() {
  ensurePhotos();
  for (let i = 0; i < panelCount(); i++) {
    if (!state.photos[i].img && sampleImgs.length > 0) {
      state.photos[i] = { img: sampleImgs[i % sampleImgs.length], panX: 0, panY: 0, zoom: 1, index: i };
    }
  }
}

function loadSamples(done) {
  let loaded = 0;
  SAMPLES.forEach((s, i) => {
    const img = new Image();
    img.onload = () => {
      sampleImgs[i] = img;
      loaded++;
      if (loaded === SAMPLES.length) done();
    };
    img.onerror = () => {
      loaded++;
      if (loaded === SAMPLES.length) done();
    };
    img.src = s.src;
  });
}

function coverMode() {
  // Full-screen cover preview (used for screenshots): ?cover=1&ratio=16:9|4:5|1:1
  const params = new URLSearchParams(window.location.search);
  if (params.get('cover') !== '1') return false;
  document.body.classList.add('cover-mode');
  const ratio = params.get('ratio') || '1:1';
  const [rw, rh] = ratio.split(':').map(Number);
  const W = 1080;
  const H = Math.round((W * rh) / rw);
  previewCanvas.width = W;
  previewCanvas.height = H;
  previewW = W;
  previewH = H;
  drawCover(previewCtx, state, W, H);
  return true;
}

function init() {
  previewCanvas = $('#cover');
  previewCtx = previewCanvas.getContext('2d');
  // Default photos: alternate the bundled samples across the panels.
  loadSamples(() => {
    state.layout = 'trio';
    const trioBtn = document.querySelector('[data-layout="trio"]');
    if (trioBtn) {
      $$('[data-layout]').forEach((b) => b.classList.toggle('active', b === trioBtn));
    }
    fillDefaults();
    if (!coverMode()) {
      render();
    } else {
      // In cover mode, apply the requested layout for the shot.
      const params = new URLSearchParams(window.location.search);
      const layout = params.get('layout');
      if (layout && LAYOUTS[layout]) state.layout = layout;
      fillDefaults();
      drawCover(previewCtx, state, previewW, previewH);
    }
  });
  bindEvents();
}

document.addEventListener('DOMContentLoaded', init);
