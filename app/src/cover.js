// Vice Sunset Cover Maker — cover renderer (cover.js).
//
// Pure canvas drawing: layouts, colour grades, lettering, grain and
// vignette. No network, no fonts, no external assets. The UI layer
// (main.js) owns state and hands it here to draw.

(function (global) {
  'use strict';

  /** Colour grades: a CSS filter plus one or two overlay gradients. */
  var GRADES = {
    sunset: {
      filter: 'saturate(1.35) contrast(1.12) brightness(1.02)',
      overlays: [
        { type: 'linear', from: [0, 0], to: [0, 1], stops: [[0, 'rgba(255,122,26,0.28)'], [0.55, 'rgba(255,94,168,0.16)'], [1, 'rgba(120,20,90,0.34)']] },
      ],
      vignette: 0.42,
    },
    neon: {
      filter: 'saturate(1.6) contrast(1.18)',
      overlays: [
        { type: 'linear', from: [0, 0], to: [1, 0], stops: [[0, 'rgba(255,0,180,0.30)'], [1, 'rgba(0,229,255,0.30)']] },
        { type: 'linear', from: [0, 0], to: [0, 1], stops: [[0, 'rgba(0,0,0,0)'], [1, 'rgba(20,0,60,0.35)']] },
      ],
      vignette: 0.38,
    },
    vice: {
      filter: 'saturate(1.45) contrast(1.1)',
      overlays: [
        { type: 'linear', from: [0, 0], to: [0, 1], stops: [[0, 'rgba(255,94,168,0.30)'], [1, 'rgba(124,58,237,0.38)']] },
      ],
      vignette: 0.4,
    },
    gold: {
      filter: 'saturate(1.3) contrast(1.08) brightness(1.06)',
      overlays: [
        { type: 'linear', from: [0, 0], to: [0, 1], stops: [[0, 'rgba(255,196,66,0.30)'], [0.6, 'rgba(255,150,50,0.14)'], [1, 'rgba(140,60,0,0.30)']] },
      ],
      vignette: 0.36,
    },
    noir: {
      filter: 'grayscale(1) contrast(1.45) brightness(1.03)',
      overlays: [
        { type: 'linear', from: [0, 0], to: [0, 1], stops: [[0, 'rgba(255,255,255,0.06)'], [1, 'rgba(0,0,0,0.30)']] },
      ],
      vignette: 0.5,
    },
  };

  /** Layouts: panel rectangles as fractions of the canvas, with a gap. */
  var LAYOUTS = {
    hero: function () { return [{ x: 0, y: 0, w: 1, h: 1 }]; },
    duo: function () {
      return [
        { x: 0, y: 0, w: 0.5, h: 1 },
        { x: 0.5, y: 0, w: 0.5, h: 1 },
      ];
    },
    trio: function () {
      return [
        { x: 0, y: 0, w: 1, h: 0.62 },
        { x: 0, y: 0.62, w: 0.5, h: 0.38 },
        { x: 0.5, y: 0.62, w: 0.5, h: 0.38 },
      ];
    },
    quad: function () {
      return [
        { x: 0, y: 0, w: 0.5, h: 0.5 },
        { x: 0.5, y: 0, w: 0.5, h: 0.5 },
        { x: 0, y: 0.5, w: 0.5, h: 0.5 },
        { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
      ];
    },
  };

  /** Panel count per layout, for the UI's panel bar. */
  var LAYOUT_PANEL_COUNT = { hero: 1, duo: 2, trio: 3, quad: 4 };

  /** A tiny seeded PRNG so grain looks the same on every render. */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Draw one photo into a rect, cover-fit, with zoom and pan offsets. */
  function drawPhoto(ctx, img, rect, panel) {
    var zoom = panel.zoom || 1;
    var panX = panel.panX || 0;
    var panY = panel.panY || 0;
    var iw = img.naturalWidth || img.width;
    var ih = img.naturalHeight || img.height;
    var scale = Math.max(rect.w / iw, rect.h / ih) * zoom;
    var dw = iw * scale;
    var dh = ih * scale;
    var dx = rect.x + (rect.w - dw) / 2 + panX * rect.w;
    var dy = rect.y + (rect.h - dh) / 2 + panY * rect.h;
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
  }

  /** Fill a rect with the placeholder pattern used when a panel has no photo. */
  function drawPlaceholder(ctx, rect) {
    var g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    g.addColorStop(0, '#3a1445');
    g.addColorStop(0.5, '#7a1e52');
    g.addColorStop(1, '#c2410c');
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = 'bold ' + Math.max(14, rect.w * 0.045) + 'px Impact, "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ADD PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2);
  }

  /** Paint a grade's overlay gradients over the whole canvas. */
  function applyOverlays(ctx, w, h, grade) {
    grade.overlays.forEach(function (ov) {
      var grad;
      if (ov.type === 'linear') {
        grad = ctx.createLinearGradient(ov.from[0] * w, ov.from[1] * h, ov.to[0] * w, ov.to[1] * h);
      } else {
        grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.75);
      }
      ov.stops.forEach(function (stop) { grad.addColorStop(stop[0], stop[1]); });
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    });
  }

  /** Darken the edges of the canvas. */
  function applyVignette(ctx, w, h, strength) {
    var r = Math.max(w, h) * 0.72;
    var grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, r);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,' + strength + ')');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  /** Scatter light speckles across the canvas. */
  function applyGrain(ctx, w, h) {
    var rand = mulberry32(20261120);
    var count = Math.floor((w * h) / 900);
    ctx.save();
    for (var i = 0; i < count; i++) {
      var v = rand();
      ctx.fillStyle = v > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
      ctx.fillRect(rand() * w, rand() * h, 1.6, 1.6);
    }
    ctx.restore();
  }

  /** Draw the title and subtitle lettering. */
  function drawCaption(ctx, w, h, state) {
    var title = (state.title || '').toUpperCase();
    var subtitle = (state.subtitle || '').toUpperCase();
    if (!title && !subtitle) return;
    var scale = w / 1080;
    var titleSize = Math.max(24, (state.titleSize || 96) * scale);
    var subSize = Math.max(14, titleSize * 0.32);
    var gap = Math.max(4, h * 0.012);
    var pad = Math.max(16, h * 0.045);
    var fontStack = 'Impact, "Arial Black", "Arial Narrow", sans-serif';
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    if (typeof ctx.letterSpacing !== 'undefined') ctx.letterSpacing = Math.max(1, titleSize * 0.02) + 'px';
    var titleY;
    var subY;
    if (state.titlePos === 'top') {
      titleY = pad + titleSize;
      subY = titleY + subSize + gap;
    } else {
      subY = h - pad;
      titleY = subY - subSize - gap;
    }
    if (state.shadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.65)';
      ctx.shadowBlur = titleSize * 0.12;
      ctx.shadowOffsetY = titleSize * 0.05;
    }
    // Title.
    if (title) {
      ctx.font = titleSize + 'px ' + fontStack;
      if (state.outline) {
        ctx.lineWidth = Math.max(2, titleSize * 0.09);
        ctx.strokeStyle = '#1a051f';
        ctx.lineJoin = 'round';
        ctx.strokeText(title, w / 2, titleY);
      }
      ctx.fillStyle = state.titleColor || '#ffffff';
      ctx.fillText(title, w / 2, titleY);
    }
    // Subtitle: thinner, wider-tracked, in the accent yellow by default.
    if (subtitle) {
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = subSize * 0.25;
      ctx.shadowOffsetY = subSize * 0.08;
      ctx.font = 'bold ' + subSize + 'px "Arial Narrow", Arial, sans-serif';
      if (typeof ctx.letterSpacing !== 'undefined') ctx.letterSpacing = Math.max(2, subSize * 0.28) + 'px';
      if (state.outline) {
        ctx.lineWidth = Math.max(1.5, subSize * 0.1);
        ctx.strokeStyle = '#1a051f';
        ctx.lineJoin = 'round';
        ctx.strokeText(subtitle, w / 2, subY);
      }
      ctx.fillStyle = '#ffd23f';
      ctx.fillText(subtitle, w / 2, subY);
    }
    ctx.restore();
  }

  /**
   * Draw the whole cover onto `canvas` (its width/height are the output size).
   * `state` carries: photos (HTMLImageElement[]), panels ([{photo, zoom, panX, panY}]),
   * layout, grade, title, subtitle, titleSize, titlePos, titleColor,
   * outline, shadow, grain, vignette.
   */
  function drawCover(canvas, state) {
    var ctx = canvas.getContext('2d');
    var w = canvas.width;
    var h = canvas.height;
    var grade = GRADES[state.grade] || GRADES.sunset;
    var gap = Math.max(2, Math.round(w * 0.006));
    var rects = (LAYOUTS[state.layout] || LAYOUTS.hero)().map(function (r) {
      return {
        x: r.x * w + (r.x > 0 ? gap / 2 : 0),
        y: r.y * h + (r.y > 0 ? gap / 2 : 0),
        w: r.w * w - (r.x > 0 ? gap / 2 : 0) - (r.x + r.w < 1 ? gap / 2 : 0),
        h: r.h * h - (r.y > 0 ? gap / 2 : 0) - (r.y + r.h < 1 ? gap / 2 : 0),
      };
    });

    ctx.save();
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#14091f';
    ctx.fillRect(0, 0, w, h);
    if (typeof ctx.filter !== 'undefined') ctx.filter = grade.filter;
    rects.forEach(function (rect, i) {
      var panel = state.panels[i] || { photo: -1, zoom: 1, panX: 0, panY: 0 };
      var img = panel.photo >= 0 ? state.photos[panel.photo] : null;
      if (img) drawPhoto(ctx, img, rect, panel);
      else drawPlaceholder(ctx, rect);
    });
    if (typeof ctx.filter !== 'undefined') ctx.filter = 'none';
    ctx.restore();

    applyOverlays(ctx, w, h, grade);
    if (state.vignette) applyVignette(ctx, w, h, grade.vignette);
    if (state.grain) applyGrain(ctx, w, h);
    drawCaption(ctx, w, h, state);
    return canvas;
  }

  /** Render the cover at an arbitrary size on a fresh offscreen canvas. */
  function renderToCanvas(state, width, height) {
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return drawCover(canvas, state);
  }

  /** Panel rectangles in canvas pixels, for hit-testing clicks and drags. */
  function panelRects(state, width, height) {
    var gap = Math.max(2, Math.round(width * 0.006));
    return (LAYOUTS[state.layout] || LAYOUTS.hero)().map(function (r) {
      return {
        x: r.x * width + (r.x > 0 ? gap / 2 : 0),
        y: r.y * height + (r.y > 0 ? gap / 2 : 0),
        w: r.w * width - (r.x > 0 ? gap / 2 : 0) - (r.x + r.w < 1 ? gap / 2 : 0),
        h: r.h * height - (r.y > 0 ? gap / 2 : 0) - (r.y + r.h < 1 ? gap / 2 : 0),
      };
    });
  }

  global.CoverArt = {
    GRADES: GRADES,
    LAYOUTS: LAYOUTS,
    LAYOUT_PANEL_COUNT: LAYOUT_PANEL_COUNT,
    drawCover: drawCover,
    renderToCanvas: renderToCanvas,
    panelRects: panelRects,
  };
})(typeof window !== 'undefined' ? window : globalThis);
