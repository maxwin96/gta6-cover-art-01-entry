// Vice Sunset Cover Maker — cover drawing.
//
// Draws a multi-panel GTA-style poster onto a canvas: a photo per panel with
// crop, zoom and pan, a Vice City sunset or neon colour grade, halftone dots,
// grain and vignette, plus bold Anton caption lettering top and bottom.
// All art here is original: no Rockstar logo, wordmark, artwork or font.

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

const POSTER_BG = '#f5eef7';
const PANEL_FRAME = 'rgba(255,255,255,0.95)';
const DARK_INK = '#14081f';
const HOT_PINK = 'rgba(255,46,136,0.9)';

/** Width of the gutter between panels, derived from the canvas size. */
function gutterFor(w, h) {
  return Math.max(6, Math.round(Math.min(w, h) * 0.012));
}

/** Splits a rect into two side-by-side cells with a gutter between them. */
function splitHorizontal(rect, gutter) {
  const leftW = Math.round(rect.w / 2) - Math.ceil(gutter / 2);
  const left = { x: rect.x, y: rect.y, w: leftW, h: rect.h };
  const right = { x: leftW + gutter + rect.x, y: rect.y, w: rect.w - leftW - gutter, h: rect.h };
  return [left, right];
}

/** Splits a rect into two stacked cells with a gutter between them. */
function splitVertical(rect, gutter) {
  const topH = Math.round(rect.h / 2) - Math.ceil(gutter / 2);
  const top = { x: rect.x, y: rect.y, w: rect.w, h: topH };
  const bottom = { x: rect.x, y: topH + gutter + rect.y, w: rect.w, h: rect.h - topH - gutter };
  return [top, bottom];
}

/** Panel rectangles for a layout, as fractions of the canvas, with a gutter. */
export function panelRects(layout, w, h) {
  const g = gutterFor(w, h);
  const full = { x: 0, y: 0, w, h };
  if (layout === 'hero-top') {
    const heroH = Math.round(h * 0.62) - g;
    const hero = { x: 0, y: 0, w, h: heroH };
    const bottomStrip = { x: 0, y: heroH + g, w, h: h - heroH - g };
    return [hero, ...splitHorizontal(bottomStrip, g)];
  }
  if (layout === 'grid') {
    const [top, bottom] = splitVertical(full, g);
    return [...splitHorizontal(top, g), ...splitHorizontal(bottom, g)];
  }
  // hero-left (default): one tall hero panel, two stacked on the right.
  const heroW = Math.round(w * 0.62) - g;
  const hero = { x: 0, y: 0, w: heroW, h };
  const rightStrip = { x: heroW + g, y: 0, w: w - heroW - g, h };
  return [hero, ...splitVertical(rightStrip, g)];
}

/** Deterministic pseudo-random generator, so grain looks the same every render. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Draws one photo cover-fitting a rect, with zoom (1 = fit) and pan offsets in rect units. */
export function drawPhotoInRect(ctx, img, rect, zoom, ox, oy) {
  const coverScale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const scale = coverScale * (zoom || 1);
  const drawW = img.naturalWidth * scale;
  const drawH = img.naturalHeight * scale;
  const drawX = rect.x + (rect.w - drawW) / 2 + (ox || 0) * rect.w;
  const drawY = rect.y + (rect.h - drawH) / 2 + (oy || 0) * rect.h;
  ctx.drawImage(img, drawX, drawY, drawW, drawH);
}

/** Vertical sunset gradient covering a rect. */
function sunsetGradient(ctx, rect, grade) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  g.addColorStop(0, grade.stops[0]);
  g.addColorStop(0.55, grade.stops[1]);
  g.addColorStop(1, grade.stops[2]);
  return g;
}

/** Sunset placeholder for an empty panel: gradient sky, sun disc, horizon bands. */
function drawPlaceholder(ctx, rect, grade, index) {
  ctx.fillStyle = sunsetGradient(ctx, rect, grade);
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const cx = rect.x + rect.w * 0.5;
  const cy = rect.y + rect.h * 0.42;
  const radius = Math.min(rect.w, rect.h) * 0.22;
  ctx.fillStyle = 'rgba(255, 244, 200, 0.95)';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  // Horizon bands below the sun.
  ctx.fillStyle = 'rgba(20, 8, 31, 0.55)';
  for (let i = 0; i < 4; i++) {
    const y = cy + radius * 0.35 + i * radius * 0.28;
    ctx.fillRect(rect.x, y, rect.w, Math.max(2, radius * 0.07));
  }
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = `bold ${Math.max(14, rect.w * 0.045)}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(`PANEL ${index + 1} — ADD A PHOTO`, cx, rect.y + rect.h - rect.h * 0.08);
}

/** Soft-light colour wash plus a pink multiply wash towards the bottom. */
function gradePanel(ctx, rect, grade, strength) {
  const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w * 0.25, rect.y + rect.h);
  wash.addColorStop(0, grade.stops[0]);
  wash.addColorStop(0.5, grade.stops[1]);
  wash.addColorStop(1, grade.stops[grade.stops.length - 1]);
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.55 * strength;
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.28 * strength;
  const pink = ctx.createLinearGradient(rect.x, rect.y + rect.h * 0.45, rect.x, rect.y + rect.h);
  pink.addColorStop(0, 'rgba(255,46,136,0)');
  pink.addColorStop(1, HOT_PINK);
  ctx.fillStyle = pink;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

/** Halftone dots, denser towards the bottom of each panel. */
function halftonePanel(ctx, rect, scale) {
  const step = Math.max(9, 13 * scale);
  ctx.save();
  ctx.fillStyle = DARK_INK;
  for (let y = rect.y + rect.h * 0.55; y < rect.y + rect.h; y += step) {
    const t = (y - rect.y) / rect.h;
    const radius = Math.max(0.6, (t - 0.5) * 6 * scale);
    for (let x = rect.x + step / 2; x < rect.x + rect.w; x += step) {
      ctx.globalAlpha = 0.10 + t * 0.12;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Draws one panel: photo or placeholder, grade, halftone, then its frame. */
function drawPanel(ctx, rect, panel, img, grade, state, scale) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (img) drawPhotoInRect(ctx, img, rect, panel.zoom, panel.ox, panel.oy);
  else drawPlaceholder(ctx, rect, grade, rect.index ?? 0);
  gradePanel(ctx, rect, grade, state.gradeStrength ?? 0.7);
  if (state.halftone) halftonePanel(ctx, rect, scale);
  ctx.restore();
  ctx.strokeStyle = PANEL_FRAME;
  ctx.lineWidth = Math.max(2, 3 * scale);
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
}

/** Warm sun glow centred over the hero panel. */
function sunGlow(ctx, hero, w, h) {
  const glowX = hero.x + hero.w * 0.72;
  const glowY = hero.y + hero.h * 0.16;
  const glow = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, Math.min(w, h) * 0.45);
  glow.addColorStop(0, 'rgba(255, 209, 102, 0.30)');
  glow.addColorStop(1, 'rgba(255, 209, 102, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
}

/** Deterministic film grain over the whole canvas. */
function grainLayer(ctx, w, h, scale) {
  const rand = mulberry32(20261119);
  ctx.save();
  ctx.fillStyle = '#000000';
  const count = Math.round((w * h) / 900);
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = 0.03 + rand() * 0.05;
    const size = 1 + rand() * 2 * scale;
    ctx.fillRect(rand() * w, rand() * h, size, size);
  }
  ctx.restore();
}

/** Darkened corners so the centre reads brighter. */
function vignetteLayer(ctx, w, h) {
  const v = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42,
    w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  v.addColorStop(0, 'rgba(10,4,20,0)');
  v.addColorStop(1, 'rgba(10,4,20,0.42)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

/** Dark gradient band at the bottom so caption lettering always reads. */
function captionBand(ctx, w, h) {
  const bandH = h * 0.20;
  const band = ctx.createLinearGradient(0, h - bandH, 0, h);
  band.addColorStop(0, 'rgba(16,5,28,0)');
  band.addColorStop(0.55, 'rgba(16,5,28,0.72)');
  band.addColorStop(1, 'rgba(16,5,28,0.88)');
  ctx.fillStyle = band;
  ctx.fillRect(0, h - bandH, w, bandH);
}

/** Wraps text into at most two lines that fit maxWidth at the given font. */
function wrapTwoLines(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines = [''];
  for (const word of words) {
    const current = lines[lines.length - 1];
    const trial = current ? `${current} ${word}` : word;
    if (ctx.measureText(trial).width <= maxWidth || !current) {
      lines[lines.length - 1] = trial;
    } else if (lines.length < 2) {
      lines.push(word);
    } else {
      lines[lines.length - 1] = `${current}…`;
    }
  }
  return lines;
}

/** Builds the vertical gradient fill for a caption style. */
function captionGradient(ctx, y, size, style) {
  const grad = ctx.createLinearGradient(0, y - size, 0, y + size * 0.15);
  style.fill.forEach((color, i) => grad.addColorStop(i / Math.max(1, style.fill.length - 1), color));
  return grad;
}

/** Draws a caption line with a thick outline and a gradient fill. */
function drawCaptionLine(ctx, line, cx, y, size, style, maxWidth) {
  ctx.font = `${size}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = style.stroke;
  ctx.lineWidth = Math.max(4, size * 0.14);
  ctx.strokeText(line, cx, y, maxWidth);
  ctx.fillStyle = captionGradient(ctx, y, size, style);
  ctx.fillText(line, cx, y, maxWidth);
}

/** Finds the largest Anton size whose text still fits the target width. */
function fitTextSize(ctx, text, startSize, targetWidth, minSize = 14) {
  let size = startSize;
  ctx.font = `${size}px Anton, sans-serif`;
  while (ctx.measureText(text).width > targetWidth && size > minSize) {
    size -= 2;
    ctx.font = `${size}px Anton, sans-serif`;
  }
  return size;
}

/** Top caption with a neon underline. */
function topCaption(ctx, text, w, h, grade) {
  const size = fitTextSize(ctx, text, Math.round(h * 0.055), w * 0.9);
  try { ctx.letterSpacing = `${Math.round(size * 0.18)}px`; } catch { /* older canvas */ }
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(16,5,28,0.9)';
  ctx.lineWidth = Math.max(3, size * 0.12);
  ctx.strokeText(text, w / 2, h * 0.075);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, w / 2, h * 0.075);
  const textW = Math.min(ctx.measureText(text).width, w * 0.9);
  ctx.fillStyle = grade.stops[1];
  ctx.fillRect((w - textW) / 2, h * 0.095, textW, Math.max(3, h * 0.006));
  try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
}

/** Main bottom caption, up to two lines. */
function bottomCaption(ctx, text, w, h, style, hasSub) {
  let size = Math.round(h * 0.115);
  ctx.font = `${size}px Anton, sans-serif`;
  let lines = wrapTwoLines(ctx, text, w * 0.92);
  while (lines.length > 2 && size > 14) {
    size -= 4;
    ctx.font = `${size}px Anton, sans-serif`;
    lines = wrapTwoLines(ctx, text, w * 0.92);
  }
  const lineH = size * 1.02;
  const totalH = lines.length * lineH;
  let y = h - h * 0.045 - (hasSub ? h * 0.045 : 0) - (totalH - lineH);
  lines.forEach((line) => {
    drawCaptionLine(ctx, line, w / 2, y, size, style, w * 0.94);
    y += lineH;
  });
}

/** Sub-caption pill at the very bottom. */
function subCaption(ctx, text, w, h, grade) {
  const size = Math.round(h * 0.028);
  ctx.font = `${size}px Anton, sans-serif`;
  const textW = ctx.measureText(text.toUpperCase()).width + size * 1.6;
  const pillW = Math.min(textW, w * 0.9);
  const pillH = size * 1.9;
  const pillX = (w - pillW) / 2;
  const pillY = h - pillH - h * 0.022;
  ctx.fillStyle = grade.stops[1];
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.toUpperCase(), w / 2, pillY + pillH / 2 + size * 0.05, pillW - size);
  ctx.textBaseline = 'alphabetic';
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

  ctx.fillStyle = POSTER_BG;
  ctx.fillRect(0, 0, w, h);
  const rects = panelRects(state.layout, w, h);
  rects.forEach((rect, i) => {
    const panel = state.panels[i] || { photo: -1, zoom: 1, ox: 0, oy: 0 };
    const img = panel.photo >= 0 ? photos[panel.photo] : null;
    drawPanel(ctx, { ...rect, index: i }, panel, img, grade, state, scale);
  });

  sunGlow(ctx, rects[0], w, h);
  if (state.grain) grainLayer(ctx, w, h, scale);
  if (state.vignette) vignetteLayer(ctx, w, h);

  const bottom = (state.bottomText || '').trim().toUpperCase();
  const top = (state.topText || '').trim().toUpperCase();
  const sub = (state.subText || '').trim();
  if (bottom || top || sub) captionBand(ctx, w, h);
  if (top) topCaption(ctx, top, w, h, grade);
  if (bottom) bottomCaption(ctx, bottom, w, h, style, Boolean(sub));
  if (sub) subCaption(ctx, sub, w, h, grade);
}
