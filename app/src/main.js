// Vice Sunset Cover Maker — UI wiring: controls, panel assign/pan/zoom, export.
import { defaultState, drawCover, renderCoverCanvas, panelRectsFor, LAYOUTS, GRADES, EXPORT_SIZES } from './cover.js';

const state = defaultState();
let selectedPanel = 0;
let dragging = null;

const stage = document.getElementById('stage');
const ctx = stage.getContext('2d');
const fileInput = document.getElementById('file-input');

function fitStage() {
  const wrap = document.getElementById('stage-wrap');
  const ratio = stage.width / stage.height;
  const maxW = Math.min(wrap.clientWidth, 760);
  const maxH = Math.min(window.innerHeight * 0.62, 760);
  let w = maxW;
  let h = w / ratio;
  if (h > maxH) { h = maxH; w = h * ratio; }
  stage.style.width = `${Math.round(w)}px`;
  stage.style.height = `${Math.round(h)}px`;
}

function render() {
  drawCover(ctx, state, stage.width, stage.height);
  document.querySelectorAll('[data-panel]').forEach((el) => {
    el.classList.toggle('active', Number(el.dataset.panel) === selectedPanel);
  });
  document.getElementById('panel-label').textContent = `Panel ${selectedPanel + 1} of ${LAYOUTS[state.layout].panels}`;
  document.getElementById('zoom-value').textContent = `${state.panels[selectedPanel].zoom.toFixed(2)}×`;
}

function setAspect(w, h) {
  stage.width = w;
  stage.height = h;
  fitStage();
  render();
}

function buildButtons(containerId, entries, current, onPick) {
  const box = document.getElementById(containerId);
  box.innerHTML = '';
  for (const [key, value] of Object.entries(entries)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = value.label || value;
    b.className = key === current ? 'chip active' : 'chip';
    b.addEventListener('click', () => {
      onPick(key);
      buildButtons(containerId, entries, key, onPick);
    });
    box.appendChild(b);
  }
}

function initControls() {
  buildButtons('layout-buttons', LAYOUTS, state.layout, (key) => {
    state.layout = key;
    selectedPanel = 0;
    render();
  });
  buildButtons('grade-buttons', GRADES, state.grade, (key) => {
    state.grade = key;
    render();
  });

  const bind = (id, event, fn) => document.getElementById(id).addEventListener(event, fn);
  bind('title-input', 'input', (e) => { state.title = e.target.value.toUpperCase(); render(); });
  bind('subtitle-input', 'input', (e) => { state.subtitle = e.target.value; render(); });
  bind('size-slider', 'input', (e) => { state.captionSize = Number(e.target.value); render(); });
  bind('position-select', 'change', (e) => { state.captionPosition = e.target.value; render(); });
  bind('color-input', 'input', (e) => { state.captionColor = e.target.value; render(); });
  bind('outline-toggle', 'change', (e) => { state.outline = e.target.checked; render(); });
  bind('shadow-toggle', 'change', (e) => { state.shadow = e.target.checked; render(); });
  bind('grain-toggle', 'change', (e) => { state.grain = e.target.checked; render(); });
  bind('vignette-toggle', 'change', (e) => { state.vignette = e.target.checked; render(); });
  bind('zoom-slider', 'input', (e) => { state.panels[selectedPanel].zoom = Number(e.target.value); render(); });
  bind('fill-all', 'click', () => {
    const src = state.panels[selectedPanel].photo;
    if (!src) return;
    state.panels.forEach((p) => { p.photo = src; });
    render();
  });
  bind('assign-photo', 'click', () => fileInput.click());
  bind('clear-photo', 'click', () => {
    state.panels[selectedPanel].photo = null;
    state.panels[selectedPanel].panX = 0;
    state.panels[selectedPanel].panY = 0;
    state.panels[selectedPanel].zoom = 1;
    document.getElementById('zoom-slider').value = '1';
    render();
  });
  bind('aspect-select', 'change', (e) => {
    const [w, h] = e.target.value.split('x').map(Number);
    setAspect(w, h);
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      state.panels[selectedPanel].photo = img;
      state.panels[selectedPanel].panX = 0;
      state.panels[selectedPanel].panY = 0;
      render();
      URL.revokeObjectURL(url);
    };
    img.src = url;
    fileInput.value = '';
  });

  // Export buttons.
  const exportBox = document.getElementById('export-buttons');
  EXPORT_SIZES.forEach((size) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip export';
    b.textContent = `PNG ${size.label}`;
    b.addEventListener('click', () => {
      const canvas = renderCoverCanvas(state, size.w, size.h);
      canvas.toBlob((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `vice-sunset-cover-${size.w}x${size.h}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      }, 'image/png');
    });
    exportBox.appendChild(b);
  });

  // Panel picker chips.
  const picker = document.getElementById('panel-picker');
  for (let i = 0; i < 4; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.dataset.panel = String(i);
    b.textContent = `Panel ${i + 1}`;
    b.addEventListener('click', () => { selectedPanel = i; render(); });
    picker.appendChild(b);
  }
}

function stagePoint(e) {
  const r = stage.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * stage.width,
    y: ((e.clientY - r.top) / r.height) * stage.height,
  };
}

function panelAt(point) {
  const rects = panelRectsFor(state, stage.width, stage.height);
  const count = LAYOUTS[state.layout].panels;
  for (let i = 0; i < count; i++) {
    const rc = rects[i];
    if (point.x >= rc.x && point.x <= rc.x + rc.w && point.y >= rc.y && point.y <= rc.y + rc.h) return i;
  }
  return -1;
}

function initStage() {
  stage.addEventListener('pointerdown', (e) => {
    const point = stagePoint(e);
    const idx = panelAt(point);
    if (idx >= 0) {
      selectedPanel = idx;
      dragging = { x: point.x, y: point.y };
      stage.setPointerCapture(e.pointerId);
      render();
    }
  });
  stage.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const point = stagePoint(e);
    const p = state.panels[selectedPanel];
    p.panX += point.x - dragging.x;
    p.panY += point.y - dragging.y;
    dragging = { x: point.x, y: point.y };
    render();
  });
  const endDrag = () => { dragging = null; };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  window.addEventListener('resize', fitStage);
}

function loadSamples() {
  // Default photos so the cover is alive on first load (offline, local files).
  const urls = ['samples/boulevard.jpg', 'samples/pier.jpg'];
  urls.forEach((url, i) => {
    const img = new Image();
    img.onload = () => {
      state.panels[i].photo = img;
      render();
    };
    img.onerror = () => { /* sample missing: panel stays a placeholder */ };
    img.src = url;
  });
}

setAspect(1080, 1080);
initControls();
initStage();
loadSamples();
render();
