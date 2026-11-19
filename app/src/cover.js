// Vice Sunset Cover Maker — cover drawing.
// Draws a multi-panel GTA-style poster onto a canvas: photos per panel with
// crop/zoom/pan, a Vice City sunset or neon colour grade, halftone dots, grain
// and vignette, plus bold Anton caption lettering top and bottom.
// All original art: no Rockstar logo, wordmark, artwork or font is used here.

export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

export const LAYOUTS = {
  'hero-left': { panels: 3, label: 'Hero left + 2' },
  'hero-top': { panels: 3, label: 'Hero top + 2' },
  grid: { panels: 4, label: 'Grid 2 x 2' },
};

export const GRADES = {
  sunset: { name: 'Vice Sunset', stops: ['#ffd166', '#ff7a18', '#ff2e88', '#7b2ff7'] },
  neon: { name: 'Neon Night', stops: ['#00e5ff', '#ff2e88', '#b537f2', '#2b1055'] },
  golden: { name: 'Golden Hour', stops: ['#fff3b0', '#ffb703', '#fb8500', '#e36414'] },
  noir: { name: 'Noir', stops: ['#f8f9fa', '#adb5bd', '#495057', '#111111'] },
};

export const CAPTION_STYLES = {
  neon: { name: 'Neon pink', fill: ['#ff5da2', '#ff2e88'], stroke: '#1a0520' },
  sunset: { name: 'Sunset gradient', fill: ['#ffd166', '#ff7a18', '#ff2e88'], stroke: '#1a0520' },
  white: { name: 'Clean white', fill: ['#ffffff', '#ffe9f3'], stroke: '#1a0520' },
  gold: { name: 'Gold', fill: ['#fff3b0', '#ffb703'], stroke: '#241300' },
};

/** Panel rectangles for a layout, as fractions of the canvas, with a gutter. */
export function panelRects(layout, w, h) {
  const g = Math.max(6, Math.round(Math.min(w, h) * 0.012));
  const full = { x: 0, y: 0, w, h };
  if (layout === 'hero-top') {
    const heroH = Math.round(h * 0.62) - g;
    const botY = heroH + g;
    const botH = h - botY;
    const halfW = Math.round(w / 2) - Math.ceil(g / 2);
    return [
      { x: 0, y: 0, w, h: heroH },
      { x: 0, y: botY, w: halfW, h: botH },
      { x: halfW + g, y: botY, w: w - halfW - g, h: botH },
    ];
  }
  if (layout === 'grid') {
    const halfW = Math.round(w / 2) - Math.ceil(g / 2);
    const halfH = Math.round(h / 2) - Math.ceil(g / 2);
    return [
      { x: 0, y: 0, w: halfW, h: halfH },
      { x: halfW + g, y: 0, w: w - halfW - g, h: halfH },
      { x: 0, y: halfH + g, w: halfW, h: h - halfH - g },
      { x: halfW + g, y: halfH + g, w: w - halfW - g, h: h - halfH - g },
    ];
  }
  // hero-left (default)
  const heroW = Math.round(w * 0.62) - g;
  const rightX = heroW + g;
  const rightW = w - rightX;
  const halfH = Math.round(h / 2) - Math.ceil(g / 2);
  return [
    { x: 0, y: 0, w: heroW, h },
    { x: rightX, y: 0, w: rightW, h: halfH },
    { x: rightX, y: halfH + g, w: rightW, h: h - halfH - g },
  ];
}

/** Deterministic pseudo-random generator, so grain looks the same every render. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Draws one photo cover-fitting a rect, with zoom (1 = fit) and pan offsets in rect units. */
export function drawPhotoInRect(ctx, img, rect, zoom, ox, oy) {
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const scale = base * (zoom || 1);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = rect.x + (rect.w - dw) / 2 + (ox || 0) * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + (oy || 0) * rect.h;
  ctx.drawImage(img, dx, dy, dw, dh);
}

/** Sunset placeholder for an empty panel: gradient sky, sun disc, palm-ish silhouette lines. */
function drawPlaceholder(ctx, rect, grade, index) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  g.addColorStop(0, grade.stops[0]);
  g.addColorStop(0.55, grade.stops[1]);
  g.addColorStop(1, grade.stops[2]);
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  // Sun disc.
  const cx = rect.x + rect.w * 0.5;
  const cy = rect.y + rect.h * 0.42;
  const r = Math.min(rect.w, rect.h) * 0.22;
  ctx.fillStyle = 'rgba(255, 244, 200, 0.95)';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  // Horizon bands.
  ctx.fillStyle = 'rgba(20, 8, 31, 0.55)';
  for (let i = 0; i < 4; i++) {
    const y = cy + r * 0.35 + i * r * 0.28;
    ctx.fillRect(rect.x, y, rect.w, Math.max(2, r * 0.07));
  }
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = `bold ${Math.max(14, rect.w * 0.045)}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(`PANEL ${index + 1} — ADD A PHOTO`, cx, rect.y + rect.h - rect.h * 0.08);
}

/** Colour-grade wash over one panel. */
function gradePanel(ctx, rect, grade, strength) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w * 0.25, rect.y + rect.h);
  g.addColorStop(0, grade.stops[0]);
  g.addColorStop(0.5, grade.stops[1]);
  g.addColorStop(1, grade.stops[grade.stops.length - 1]);
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.55 * strength;
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.28 * strength;
  const wash = ctx.createLinearGradient(rect.x, rect.y + rect.h * 0.45, rect.x, rect.y + rect.h);
  wash.addColorStop(0, 'rgba(255,46,136,0)');
  wash.addColorStop(1, 'rgba(255,46,136,0.9)');
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

/** Halftone dots, denser towards the bottom of each panel. */
function halftonePanel(ctx, rect, scale) {
  const step = Math.max(9, 13 * scale);
  ctx.save();
  ctx.fillStyle = '#14081f';
  for (let y = rect.y + rect.h * 0.55; y < rect.y + rect.h; y += step) {
    const t = (y - rect.y) / rect.h;
    const r = Math.max(0.6, (t - 0.5) * 6 * scale);
    for (let x = rect.x + step / 2; x < rect.x + rect.w; x += step) {
      ctx.globalAlpha = 0.10 + t * 0.12;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

/** Wraps text into at most two lines that fit maxWidth at the given font. */
function wrapTwoLines(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines = [''];
  for (const word of words) {
    const trial = lines[lines.length - 1] ? `${lines[lines.length - 1]} ${word}` : word;
    if (ctx.measureText(trial).width <= maxWidth || !lines[lines.length - 1]) {
      lines[lines.length - 1] = trial;
    } else if (lines.length < 2) {
      lines.push(word);
    } else {
      lines[lines.length - 1] = `${lines[lines.length - 1]}…`;
    }
  }
  return lines;
}

/** Draws a caption line with a thick outline and a gradient fill. */
function drawCaptionLine(ctx, line, cx, y, size, style, maxWidth) {
  ctx.font = `${size}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const grad = ctx.createLinearGradient(0, y - size, 0, y + size * 0.15);
  style.fill.forEach((c, i) => grad.addColorStop(i / Math.max(1, style.fill.length - 1), c));
  ctx.lineJoin = 'round';
  ctx.strokeStyle = style.stroke;
  ctx.lineWidth = Math.max(4, size * 0.14);
  ctx.strokeText(line, cx, y, maxWidth);
  ctx.fillStyle = grad;
  ctx.fillText(line, cx, y, maxWidth);
}

/**
 * Draws the whole cover.
 * @param {HTMLCanvasElement} canvas
 * @param {Array<HTMLImageElement|null>} photos - library, indexed by panel.photo
 * @param {object} state - { layout, topText, bottomText, subText, captionStyle,
 *   grade, gradeStrength, halftone, grain, vignette, panels: [{photo, zoom, ox, oy}] }
 */
export function drawCover(canvas, photos, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const scale = Math.min(w, h) / 1080;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const style = CAPTION_STYLES[state.captionStyle] || CAPTION_STYLES.neon;

  // White poster gutters, then panels.
  ctx.fillStyle = '#f5eef7';
  ctx.fillRect(0, 0, w, h);
  const rects = panelRects(state.layout, w, h);
  rects.forEach((rect, i) => {
    const panel = state.panels[i] || { photo: -1, zoom: 1, ox: 0, oy: 0 };
    ctx.save();
    ctx.beginPath(); ctx.rect(rect.x, rect.y, rect.w, rect.h); ctx.clip();
    const img = panel.photo >= 0 ? photos[panel.photo] : null;
    if (img) drawPhotoInRect(ctx, img, rect, panel.zoom, panel.ox, panel.oy);
    else drawPlaceholder(ctx, rect, grade, i);
    gradePanel(ctx, rect, grade, state.gradeStrength ?? 0.7);
    if (state.halftone) halftonePanel(ctx, rect, scale);
    ctx.restore();
    // Panel frame.
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = Math.max(2, 3 * scale);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });

  // Sun glow over the hero panel.
  const hero = rects[0];
  const glow = ctx.createRadialGradient(
    hero.x + hero.w * 0.72, hero.y + hero.h * 0.16, 0,
    hero.x + hero.w * 0.72, hero.y + hero.h * 0.16, Math.min(w, h) * 0.45,
  );
  glow.addColorStop(0, 'rgba(255, 209, 102, 0.30)');
  glow.addColorStop(1, 'rgba(255, 209, 102, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // Grain.
  if (state.grain) {
    const rand = mulberry32(20261119);
    ctx.save();
    ctx.fillStyle = '#000000';
    const n = Math.round((w * h) / 900);
    for (let i = 0; i < n; i++) {
      ctx.globalAlpha = 0.03 + rand() * 0.05;
      const s = 1 + rand() * 2 * scale;
      ctx.fillRect(rand() * w, rand() * h, s, s);
    }
    ctx.restore();
  }

  // Vignette.
  if (state.vignette) {
    const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
    v.addColorStop(0, 'rgba(10,4,20,0)');
    v.addColorStop(1, 'rgba(10,4,20,0.42)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }

  // Bottom caption band: dark gradient so lettering always reads.
  const bottom = (state.bottomText || '').trim().toUpperCase();
  const top = (state.topText || '').trim().toUpperCase();
  const sub = (state.subText || '').trim();
  if (bottom || top || sub) {
    const bandH = h * 0.20;
    const band = ctx.createLinearGradient(0, h - bandH, 0, h);
    band.addColorStop(0, 'rgba(16,5,28,0)');
    band.addColorStop(0.55, 'rgba(16,5,28,0.72)');
    band.addColorStop(1, 'rgba(16,5,28,0.88)');
    ctx.fillStyle = band;
    ctx.fillRect(0, h - bandH, w, bandH);
  }

  // Top caption.
  if (top) {
    let size = Math.round(h * 0.055);
    ctx.font = `${size}px Anton, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(size * 0.18)}px`; } catch { /* older canvas */ }
    while (ctx.measureText(top).width > w * 0.9 && size > 14) {
      size -= 2;
      ctx.font = `${size}px Anton, sans-serif`;
    }
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(16,5,28,0.9)';
    ctx.lineWidth = Math.max(3, size * 0.12);
    ctx.strokeText(top, w / 2, h * 0.075);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(top, w / 2, h * 0.075);
    // Neon underline.
    const tw = Math.min(ctx.measureText(top).width, w * 0.9);
    ctx.fillStyle = grade.stops[1];
    ctx.fillRect((w - tw) / 2, h * 0.095, tw, Math.max(3, h * 0.006));
    try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
  }

  // Bottom caption, up to two lines.
  if (bottom) {
    let size = Math.round(h * 0.115);
    ctx.font = `${size}px Anton, sans-serif`;
    let lines = wrapTwoLines(ctx, bottom, w * 0.92);
    while (lines.length > 2 && size > 14) {
      size -= 4;
      ctx.font = `${size}px Anton, sans-serif`;
      lines = wrapTwoLines(ctx, bottom, w * 0.92);
    }
    const lineH = size * 1.02;
    const totalH = lines.length * lineH;
    let y = h - h * 0.045 - (sub ? h * 0.045 : 0) - (totalH - lineH);
    lines.forEach((line) => {
      drawCaptionLine(ctx, line, w / 2, y, size, style, w * 0.94);
      y += lineH;
    });
  }

  // Sub-caption pill.
  if (sub) {
    const size = Math.round(h * 0.028);
    ctx.font = `${size}px Anton, sans-serif`;
    const tw = ctx.measureText(sub.toUpperCase()).width + size * 1.6;
    const pw = Math.min(tw, w * 0.9);
    const ph = size * 1.9;
    const px = (w - pw) / 2;
    const py = h - ph - h * 0.022;
    ctx.fillStyle = grade.stops[1];
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, ph / 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sub.toUpperCase(), w / 2, py + ph / 2 + size * 0.05, pw - size);
    ctx.textBaseline = 'alphabetic';
  }
}
