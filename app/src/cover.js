// Vice Sunset Cover Maker — cover rendering engine (pure canvas, no network).
// Draws a GTA 6-style cover: gradient sky, sun, skyline, photo panels,
// caption with outline/shadow, grain and vignette. Deterministic: grain and
// skyline use a seeded PRNG so the same state always renders the same pixels.

export const LAYOUTS = {
  hero: { label: 'Hero', panels: 1 },
  duo: { label: 'Duo', panels: 2 },
  trio: { label: 'Trio', panels: 3 },
  quad: { label: 'Quad', panels: 4 },
};

export const GRADES = {
  sunset: { label: 'Sunset', sky: ['#ff9a3c', '#ff5e62', '#7b2d8b'], sun: '#ffd166', accent: '#ff6b6b', ink: '#1c0a1e' },
  neon: { label: 'Neon', sky: ['#0f0c29', '#302b63', '#ff00e5'], sun: '#00f5d4', accent: '#00f5d4', ink: '#05030f' },
  vice: { label: 'Vice', sky: ['#ff8fab', '#8338ec', '#3a0ca3'], sun: '#ffea00', accent: '#ffea00', ink: '#160a2e' },
  gold: { label: 'Gold', sky: ['#f7b733', '#fc4a1a', '#4a1c00'], sun: '#fff3b0', accent: '#ffd60a', ink: '#2a1500' },
  noir: { label: 'Noir', sky: ['#232526', '#414345', '#000000'], sun: '#e8e8e8', accent: '#ffffff', ink: '#000000' },
};

export const EXPORT_SIZES = [
  { label: 'Square 1080 × 1080', w: 1080, h: 1080 },
  { label: 'Portrait 1080 × 1350', w: 1080, h: 1350 },
  { label: 'Landscape 1920 × 1080', w: 1920, h: 1080 },
];

export function defaultState() {
  return {
    layout: 'hero',
    grade: 'sunset',
    title: 'VICE SUNSET',
    subtitle: 'Welcome back to Leonida',
    captionSize: 1.0,
    captionPosition: 'bottom',
    captionColor: '#ffffff',
    outline: true,
    shadow: true,
    grain: true,
    vignette: true,
    panels: [
      { photo: null, panX: 0, panY: 0, zoom: 1 },
      { photo: null, panX: 0, panY: 0, zoom: 1 },
      { photo: null, panX: 0, panY: 0, zoom: 1 },
      { photo: null, panX: 0, panY: 0, zoom: 1 },
    ],
  };
}

// Seeded PRNG (mulberry32) — deterministic grain + skyline.
export function seededRandom(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function panelRects(layout, w, h) {
  const gap = Math.round(Math.min(w, h) * 0.02);
  switch (layout) {
    case 'duo':
      return [
        { x: 0, y: 0, w: Math.round(w * 0.55), h },
        { x: Math.round(w * 0.55) + gap, y: 0, w: w - Math.round(w * 0.55) - gap, h },
      ];
    case 'trio':
      return [
        { x: 0, y: 0, w: Math.round(w * 0.58), h },
        { x: Math.round(w * 0.58) + gap, y: 0, w: w - Math.round(w * 0.58) - gap, h: Math.round(h * 0.5) - Math.floor(gap / 2) },
        { x: Math.round(w * 0.58) + gap, y: Math.round(h * 0.5) + Math.ceil(gap / 2), w: w - Math.round(w * 0.58) - gap, h: h - Math.round(h * 0.5) - Math.ceil(gap / 2) },
      ];
    case 'quad':
      return [
        { x: 0, y: 0, w: Math.round(w / 2) - Math.floor(gap / 2), h: Math.round(h / 2) - Math.floor(gap / 2) },
        { x: Math.round(w / 2) + Math.ceil(gap / 2), y: 0, w: w - Math.round(w / 2) - Math.ceil(gap / 2), h: Math.round(h / 2) - Math.floor(gap / 2) },
        { x: 0, y: Math.round(h / 2) + Math.ceil(gap / 2), w: Math.round(w / 2) - Math.floor(gap / 2), h: h - Math.round(h / 2) - Math.ceil(gap / 2) },
        { x: Math.round(w / 2) + Math.ceil(gap / 2), y: Math.round(h / 2) + Math.ceil(gap / 2), w: w - Math.round(w / 2) - Math.ceil(gap / 2), h: h - Math.round(h / 2) - Math.ceil(gap / 2) },
      ];
    case 'hero':
    default:
      return [{ x: 0, y: 0, w, h }];
  }
}

function drawSky(ctx, grade, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, grade.sky[0]);
  g.addColorStop(0.55, grade.sky[1]);
  g.addColorStop(1, grade.sky[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Sun with glow.
  const sunR = Math.min(w, h) * 0.16;
  const sunX = w * 0.5;
  const sunY = h * 0.38;
  const glow = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 2.6);
  glow.addColorStop(0, grade.sun);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;
  ctx.fillStyle = grade.sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();

  // Skyline silhouette along the horizon.
  const rand = seededRandom(20261121);
  const horizon = h * 0.72;
  ctx.fillStyle = grade.ink;
  ctx.globalAlpha = 0.85;
  let x = 0;
  while (x < w) {
    const bw = w * (0.04 + rand() * 0.09);
    const bh = h * (0.08 + rand() * 0.2);
    ctx.fillRect(x, horizon - bh, bw, bh + h - horizon);
    x += bw + w * 0.008;
  }
  ctx.globalAlpha = 1;
  // Palm-ish accent: a few slanted trunks.
  ctx.strokeStyle = grade.ink;
  ctx.lineWidth = Math.max(2, w * 0.004);
  for (let i = 0; i < 3; i++) {
    const px = w * (0.12 + i * 0.36);
    ctx.beginPath();
    ctx.moveTo(px, horizon + h * 0.02);
    ctx.quadraticCurveTo(px + w * 0.02, horizon - h * 0.12, px + w * 0.05, horizon - h * 0.16);
    ctx.stroke();
  }
}

function drawPhoto(ctx, photo, rect, panX, panY, zoom) {
  if (!photo || !photo.naturalWidth) {
    // Placeholder: diagonal stripes + label.
    const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    g.addColorStop(0, 'rgba(255,255,255,0.22)');
    g.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `700 ${Math.max(14, Math.round(rect.w * 0.045))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+ ADD PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2);
    return;
  }
  const scale = Math.max(rect.w / photo.naturalWidth, rect.h / photo.naturalHeight) * zoom;
  const dw = photo.naturalWidth * scale;
  const dh = photo.naturalHeight * scale;
  const dx = rect.x + (rect.w - dw) / 2 + panX;
  const dy = rect.y + (rect.h - dh) / 2 + panY;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(photo, dx, dy, dw, dh);
  ctx.restore();
}

function drawCaption(ctx, state, grade, w, h) {
  const base = Math.min(w, h) * 0.085 * state.captionSize;
  const yPos = { top: h * 0.14, center: h * 0.5, bottom: h * 0.86 }[state.captionPosition] || h * 0.86;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = state.captionColor;
  if (state.shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = Math.round(base * 0.25);
    ctx.shadowOffsetY = Math.round(base * 0.08);
  }
  ctx.font = `900 ${Math.round(base)}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  if (state.outline) {
    ctx.lineWidth = Math.max(2, Math.round(base * 0.09));
    ctx.strokeStyle = grade.ink;
    ctx.strokeText(state.title, w / 2, yPos - base * 0.55);
  }
  ctx.fillText(state.title, w / 2, yPos - base * 0.55);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  if (state.subtitle) {
    const subSize = Math.round(base * 0.32);
    ctx.font = `600 ${subSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.fillStyle = grade.accent;
    if (state.outline) {
      ctx.lineWidth = Math.max(1, Math.round(subSize * 0.12));
      ctx.strokeStyle = grade.ink;
      ctx.strokeText(state.subtitle, w / 2, yPos + base * 0.35);
    }
    ctx.fillText(state.subtitle, w / 2, yPos + base * 0.35);
  }
}

function drawGrain(ctx, w, h) {
  const rand = seededRandom(90210);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  const dots = Math.round((w * h) / 900);
  for (let i = 0; i < dots; i++) {
    ctx.fillRect(rand() * w, rand() * h, 1.5, 1.5);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  for (let i = 0; i < dots; i++) {
    ctx.fillRect(rand() * w, rand() * h, 1.5, 1.5);
  }
}

function drawVignette(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

// Main entry: draws the whole cover onto ctx at the given size.
export function drawCover(ctx, state, w, h) {
  const grade = GRADES[state.grade] || GRADES.sunset;
  drawSky(ctx, grade, w, h);
  const rects = panelRects(state.layout, w, h);
  const count = LAYOUTS[state.layout]?.panels || 1;
  for (let i = 0; i < count; i++) {
    const p = state.panels[i] || { photo: null, panX: 0, panY: 0, zoom: 1 };
    ctx.save();
    ctx.globalAlpha = 0.92;
    drawPhoto(ctx, p.photo, rects[i], p.panX, p.panY, p.zoom);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = Math.max(1, Math.round(Math.min(w, h) * 0.004));
    ctx.strokeRect(rects[i].x, rects[i].y, rects[i].w, rects[i].h);
  }
  drawCaption(ctx, state, grade, w, h);
  if (state.grain) drawGrain(ctx, w, h);
  if (state.vignette) drawVignette(ctx, w, h);
}

// Renders state to a fresh canvas of the requested size (for export).
export function renderCoverCanvas(state, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  drawCover(canvas.getContext('2d'), state, w, h);
  return canvas;
}

export function panelRectsFor(state, w, h) {
  return panelRects(state.layout, w, h);
}
