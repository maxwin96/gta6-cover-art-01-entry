// Vice Sunset Cover Maker — UI layer (main.js).
//
// Owns editor state, wires the controls, and calls CoverArt (cover.js)
// to paint the preview and the export canvas. Everything runs locally:
// photos are read with FileReader and never uploaded anywhere.

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  /** The editor state. `photos` holds loaded Image objects; each panel
   *  points at one by index (-1 = empty). */
  var state = {
    photos: [],
    panels: [{ photo: -1, zoom: 1, panX: 0, panY: 0 }],
    layout: 'hero',
    grade: 'sunset',
    title: 'VICE SUNSET',
    subtitle: 'NEON COAST',
    titleSize: 96,
    titlePos: 'bottom',
    titleColor: '#ffffff',
    outline: true,
    shadow: true,
    grain: true,
    vignette: true,
  };
  var selectedPhoto = -1;
  var selectedPanel = 0;
  var sampleIndex = 0;
  var SAMPLES = ['samples/boulevard.jpg', 'samples/pier.jpg'];

  var canvas = $('preview');
  var ctx = canvas.getContext('2d');

  /** Resize the preview canvas to the chosen export ratio (capped at 960 wide). */
  function resizePreview() {
    var size = $('exportSize').value.split('x');
    var w = parseInt(size[0], 10);
    var h = parseInt(size[1], 10);
    var scale = Math.min(1, 960 / w);
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
  }

  function render() {
    CoverArt.drawCover(canvas, state);
  }

  /** Rebuild the panel buttons under the preview for the active layout. */
  function renderPanelBar() {
    var bar = $('panelBar');
    bar.innerHTML = '';
    var count = CoverArt.LAYOUT_PANEL_COUNT[state.layout];
    for (var i = 0; i < count; i++) {
      (function (index) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = 'Panel ' + (index + 1);
        if (index === selectedPanel) btn.classList.add('active');
        btn.addEventListener('click', function () {
          selectedPanel = index;
          syncPanelControls();
          renderPanelBar();
        });
        bar.appendChild(btn);
      })(i);
    }
  }

  /** Keep the zoom slider in step with the selected panel. */
  function syncPanelControls() {
    var panel = state.panels[selectedPanel];
    $('zoomSlider').value = String(panel.zoom);
    $('zoomValue').textContent = panel.zoom.toFixed(2) + '×';
  }

  /** Make sure `state.panels` has exactly the panels the layout needs. */
  function ensurePanels() {
    var count = CoverArt.LAYOUT_PANEL_COUNT[state.layout];
    while (state.panels.length < count) state.panels.push({ photo: -1, zoom: 1, panX: 0, panY: 0 });
    state.panels.length = count;
    if (selectedPanel >= count) selectedPanel = 0;
  }

  /** Rebuild the photo thumbnail strip. */
  function renderThumbs() {
    var strip = $('thumbs');
    strip.innerHTML = '';
    if (state.photos.length === 0) {
      var empty = document.createElement('span');
      empty.className = 'empty';
      empty.textContent = 'No photos yet — upload one or use a sample.';
      strip.appendChild(empty);
      return;
    }
    state.photos.forEach(function (img, i) {
      var thumb = document.createElement('img');
      thumb.src = img.src;
      thumb.alt = 'Photo ' + (i + 1);
      if (i === selectedPhoto) thumb.classList.add('selected');
      thumb.addEventListener('click', function () {
        selectedPhoto = i;
        renderThumbs();
      });
      strip.appendChild(thumb);
    });
  }

  /** Add an image (already loaded) to the library and select it. */
  function addPhoto(img) {
    state.photos.push(img);
    selectedPhoto = state.photos.length - 1;
    // Fill the first empty panel so the cover shows something at once.
    for (var i = 0; i < state.panels.length; i++) {
      if (state.panels[i].photo < 0) {
        state.panels[i].photo = selectedPhoto;
        break;
      }
    }
    renderThumbs();
    render();
  }

  /** Load one File object locally via FileReader. */
  function loadFile(file) {
    if (!file || file.type.indexOf('image/') !== 0) return;
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () { addPhoto(img); };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  /** Load a bundled sample photo (a local file under app/samples/). */
  function loadSample() {
    var path = SAMPLES[sampleIndex % SAMPLES.length];
    sampleIndex += 1;
    var img = new Image();
    img.onload = function () { addPhoto(img); };
    img.onerror = function () { window.alert('Could not load the sample photo.'); };
    img.src = path;
  }

  /** Which panel (if any) sits under a point in preview-canvas pixels. */
  function panelAt(x, y) {
    var rects = CoverArt.panelRects(state, canvas.width, canvas.height);
    for (var i = 0; i < rects.length; i++) {
      var r = rects[i];
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
    }
    return -1;
  }

  function canvasPoint(event) {
    var box = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - box.left) * (canvas.width / box.width),
      y: (event.clientY - box.top) * (canvas.height / box.height),
    };
  }

  /** Click assigns the selected photo; drag pans the panel's photo. */
  var drag = null;
  canvas.addEventListener('pointerdown', function (event) {
    var p = canvasPoint(event);
    var index = panelAt(p.x, p.y);
    if (index < 0) return;
    selectedPanel = index;
    syncPanelControls();
    renderPanelBar();
    if (selectedPhoto >= 0) {
      state.panels[index].photo = selectedPhoto;
      render();
    }
    drag = { panel: index, x: p.x, y: p.y, moved: false };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', function (event) {
    if (!drag) return;
    var p = canvasPoint(event);
    var panel = state.panels[drag.panel];
    var rects = CoverArt.panelRects(state, canvas.width, canvas.height);
    var rect = rects[drag.panel];
    var dx = (p.x - drag.x) / rect.w;
    var dy = (p.y - drag.y) / rect.h;
    if (Math.abs(dx) > 0.002 || Math.abs(dy) > 0.002) drag.moved = true;
    panel.panX = Math.max(-0.5, Math.min(0.5, panel.panX + dx));
    panel.panY = Math.max(-0.5, Math.min(0.5, panel.panY + dy));
    drag.x = p.x;
    drag.y = p.y;
    render();
  });
  canvas.addEventListener('pointerup', function () { drag = null; });

  /** Export-size changes also reshape the preview. */
  $('exportSize').addEventListener('change', function () {
    resizePreview();
    render();
  });

  $('photoInput').addEventListener('change', function (event) {
    Array.prototype.forEach.call(event.target.files, loadFile);
    event.target.value = '';
  });
  $('sampleBtn').addEventListener('click', loadSample);

  $('layoutRow').addEventListener('click', function (event) {
    var btn = event.target.closest('[data-layout]');
    if (!btn) return;
    state.layout = btn.getAttribute('data-layout');
    ensurePanels();
    Array.prototype.forEach.call($('layoutRow').children, function (b) {
      b.classList.toggle('active', b === btn);
    });
    syncPanelControls();
    renderPanelBar();
    render();
  });

  $('gradeRow').addEventListener('click', function (event) {
    var btn = event.target.closest('[data-grade]');
    if (!btn) return;
    state.grade = btn.getAttribute('data-grade');
    Array.prototype.forEach.call($('gradeRow').children, function (b) {
      b.classList.toggle('active', b === btn);
    });
    render();
  });

  $('zoomSlider').addEventListener('input', function () {
    var panel = state.panels[selectedPanel];
    panel.zoom = parseFloat($('zoomSlider').value);
    $('zoomValue').textContent = panel.zoom.toFixed(2) + '×';
    render();
  });

  $('fillAllBtn').addEventListener('click', function () {
    if (selectedPhoto < 0) {
      window.alert('Load a photo first, then fill all panels with it.');
      return;
    }
    state.panels.forEach(function (panel) { panel.photo = selectedPhoto; });
    render();
  });

  $('titleInput').addEventListener('input', function () {
    state.title = $('titleInput').value;
    render();
  });
  $('subtitleInput').addEventListener('input', function () {
    state.subtitle = $('subtitleInput').value;
    render();
  });
  $('titleSizeSlider').addEventListener('input', function () {
    state.titleSize = parseInt($('titleSizeSlider').value, 10);
    $('titleSizeValue').textContent = String(state.titleSize);
    render();
  });
  $('titlePosRow').addEventListener('click', function (event) {
    var btn = event.target.closest('[data-titlepos]');
    if (!btn) return;
    state.titlePos = btn.getAttribute('data-titlepos');
    Array.prototype.forEach.call($('titlePosRow').children, function (b) {
      b.classList.toggle('active', b === btn);
    });
    render();
  });
  $('titleColorRow').addEventListener('click', function (event) {
    var btn = event.target.closest('[data-titlecolor]');
    if (!btn) return;
    state.titleColor = btn.getAttribute('data-titlecolor');
    Array.prototype.forEach.call($('titleColorRow').children, function (b) {
      b.classList.toggle('active', b === btn);
    });
    render();
  });
  $('outlineToggle').addEventListener('change', function () {
    state.outline = $('outlineToggle').checked;
    render();
  });
  $('shadowToggle').addEventListener('change', function () {
    state.shadow = $('shadowToggle').checked;
    render();
  });
  $('grainToggle').addEventListener('change', function () {
    state.grain = $('grainToggle').checked;
    render();
  });
  $('vignetteToggle').addEventListener('change', function () {
    state.vignette = $('vignetteToggle').checked;
    render();
  });

  /** Download the cover at the chosen export size as a PNG. */
  $('downloadBtn').addEventListener('click', function () {
    var size = $('exportSize').value.split('x');
    var w = parseInt(size[0], 10);
    var h = parseInt(size[1], 10);
    var out = CoverArt.renderToCanvas(state, w, h);
    out.toBlob(function (blob) {
      if (!blob) {
        window.alert('Export failed — please try again.');
        return;
      }
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'vice-sunset-cover-' + w + 'x' + h + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }, 'image/png');
  });

  // Boot: load both sample photos so the first paint already shows a cover.
  resizePreview();
  ensurePanels();
  renderThumbs();
  renderPanelBar();
  syncPanelControls();
  render();
  loadSample();
  loadSample();
})();
