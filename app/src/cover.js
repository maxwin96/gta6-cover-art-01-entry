// Vice Sunset Cover Maker — cover rendering engine (pure canvas, offline).
// Draws a GTA 6 style cover: photo panels + colour grade + caption + grain + vignette.

export const LAYOUTS = {
  hero: { panels: 1, label: 'Hero' },
  duo: { panels: 2, label: 'Duo' },
  trio: { panels: 3, label: 'Trio' },
  quad: { panels: 4, label: 'Quad' },
};

// Each grade: overlay gradient stops (top -> bottom) and an accent colour.
export const GRADES = {
  sunset: { name: 'Sunset', top: 'rgba(255, 94, 58, 0.28)', bottom: 'rgba(122, 28, 110, 0.42)', accent: '#ff9e57' },
  neon: { name: 'Neon', top: 'rgba(0, 229, 255, 0.22)', bottom: 'rgba(255, 0, 153, 0.38)', accent: '#00e5ff' },
  vice: { name: 'Vice', top: 'rgba(255, 0, 128, 0.25)', bottom: 'rgba(0, 184, 255, 0.35)', accent: '#ff4fd8' },
  gold: { name: 'Gold', top: 'rgba(255, 196, 0, 0.22)', bottom: 'rgba(120, 53, 0, 0.45)', accent: '#ffc400' },
  noir: { name: 'Noir', top: 'rgba(20, 20, 28, 0.30)', bottom: 'rgba(0, 0, 0, 0.55)', accent: '#e8e8e8' },
};

export const CAPTION_COLORS = {
  white: '#ffffff',
  black: '#111111',
  yellow: '#ffd400',
  pink: '#ff5da2',
  cyan: '#37e6ff',
};

/** Panel rectangles for a layout, in fractions of the cover (x, y, w, h). */
export function panelRects(layout, gap = 0.008) {
  const g = gap;
  switch (layout) {
    case 'duo':
      return [
        { x: 0, y: 0, w: 0.5 - g / 2, h: 1 },
        { x: 0.5 + g / 2, y: 0, w: 0.5 - g / 2, h: 1 },
      ];
    case 'trio':
      return [
        { x: 0, y: 0, w: 0.62 - g / 2, h: 1 },
        { x: 0.62 + g / 2, y: 0, w: 0.38 - g / 2, h: 0.5 - g / 2 },
        { x: 0.62 + g / 2, y: 0.5 + g / 2, w: 0.38 - g / 2, h: 0.5 - g / 2 },
      ];
    case 'quad':
      return [
        { x: 0, y: 0, w: 0.5 - g / 2, h: 0.5 - g / 2 },
        { x: 0.5 + g / 2, y: 0, w: 0.5 - g / 2, h: 0.5 - g / 2 },
        { x: 0, y: 0.5 + g / 2, w: 0.5 - g / 2, h: 0.5 - g / 2 },
        { x: 0.5 + g / 2, y: 0.5 + g / 2, w: 0.5 - g / 2, h: 0.5 - g / 2 },
      ];
    case 'hero':
    default:
      return [{ x: 0, y: 0, w: 1, h: 1 }];
  }
}

function drawPlaceholder(ctx, x, y, w, h, index) {
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, '#3a2b5c');
  grad.addColorStop(0.55, '#c2437a');
  grad.addColorStop(1, '#ff7a3d');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(2, w * 0.01);
  for (let i = -2; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * w * 0.25, y + h);
    ctx.lineTo(x + i * w * 0.25 + w * 0.4, y);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = `700 ${Math.round(h * 0.09)}px Arial, Helvetica, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`PHOTO ${index + 1}`, x + w / 2, y + h / 2);
}

function drawPhoto(ctx, photo, x, y, w, h) {
  const img = photo.img;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return drawPlaceholder(ctx, x, y, w, h, photo.index);
  const zoom = photo.zoom || 1;
  const scale = Math.max(w / iw, h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = x + (w - dw) / 2 + (photo.panX || 0) * w;
  const dy = y + (h - dh) / 2 + (photo.panY || 0) * h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

/** Deterministic pseudo-random grain, seeded per render so exports are stable. */
function drawGrain(ctx, W, H, amount) {
  let seed = 1337;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const count = Math.floor(W * H * amount);
  ctx.save();
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < count; i++) {
    const px = rand() * W;
    const py = rand() * H;
    ctx.globalAlpha = 0.05 + rand() * 0.12;
    ctx.fillRect(px, py, 1.4, 1.4);
  }
  ctx.restore();
}

/**
 * Render the cover into ctx at size W x H.
 * state: { layout, grade, title, subtitle, titleSize (0.5..2), position,
 *   color, outline, shadow, grain, vignette, photos: [{img|null, panX, panY, zoom, index}] }
 */
export function drawCover(ctx, state, W, H) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#14101f';
  ctx.fillRect(0, 0, W, H);

  const rects = panelRects(state.layout || 'hero');
  const photos = state.photos || [];
  rects.forEach((r, i) => {
    const x = r.x * W;
    const y = r.y * H;
    const w = r.w * W;
    const h = r.h * H;
    const photo = photos[i];
    if (photo && photo.img) drawPhoto(ctx, photo, x, y, w, h);
    else drawPlaceholder(ctx, x, y, w, h, i);
  });

  // Colour grade overlay.
  const grade = GRADES[state.grade] || GRADES.sunset;
  const overlay = ctx.createLinearGradient(0, 0, 0, H);
  overlay.addColorStop(0, grade.top);
  overlay.addColorStop(1, grade.bottom);
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, W, H);

  // Vignette.
  if (state.vignette) {
    const vg = ctx.createRadialGradient(
      W / 2, H / 2, Math.min(W, H) * 0.35,
      W / 2, H / 2, Math.max(W, H) * 0.75,
    );
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  // Grain.
  if (state.grain) drawGrain(ctx, W, H, 0.00012);

  // Caption.
  const title = (state.title || '').trim();
  const subtitle = (state.subtitle || '').trim();
  if (title || subtitle) {
    const sizeScale = state.titleSize || 1;
    const titlePx = Math.round(H * 0.085 * sizeScale);
    const subPx = Math.round(titlePx * 0.42);
    const color = CAPTION_COLORS[state.color] || '#ffffff';
    const pos = state.position || 'bottom';
    const pad = H * 0.06;
    let baselineY;
    if (pos === 'top') baselineY = pad + titlePx;
    else if (pos === 'center') baselineY = H / 2 + titlePx / 2;
    else baselineY = H - pad - (subtitle ? subPx + H * 0.015 : 0);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    if (state.shadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.65)';
      ctx.shadowBlur = Math.round(H * 0.012);
      ctx.shadowOffsetY = Math.round(H * 0.006);
    }
    if (title) {
      // Shrink the title until it fits the cover width (portrait covers are narrow).
      let titlePxFit = titlePx;
      ctx.font = `900 ${titlePxFit}px Arial, Helvetica, sans-serif`;
      const maxW = W * 0.94;
      while (titlePxFit > 10 && ctx.measureText(title.toUpperCase()).width > maxW) {
        titlePxFit = Math.round(titlePxFit * 0.92);
        ctx.font = `900 ${titlePxFit}px Arial, Helvetica, sans-serif`;
      }
      ctx.fillStyle = color;
      if (state.outline) {
        ctx.lineWidth = Math.max(2, titlePx * 0.09);
        ctx.strokeStyle = color === '#111111' ? '#ffffff' : '#111111';
        ctx.lineJoin = 'round';
        ctx.strokeText(title.toUpperCase(), W / 2, baselineY);
      }
      ctx.fillText(title.toUpperCase(), W / 2, baselineY);
    }
    if (subtitle) {
      const subY = baselineY + subPx + H * 0.02;
      ctx.font = `700 ${subPx}px Arial, Helvetica, sans-serif`;
      ctx.fillStyle = color;
      if (state.outline) {
        ctx.lineWidth = Math.max(1.5, subPx * 0.09);
        ctx.strokeStyle = color === '#111111' ? '#ffffff' : '#111111';
        ctx.lineJoin = 'round';
        ctx.strokeText(subtitle, W / 2, subY);
      }
      ctx.fillText(subtitle, W / 2, subY);
    }
    ctx.restore();
  }

  // Thin accent frame.
  ctx.save();
  ctx.strokeStyle = grade.accent;
  ctx.lineWidth = Math.max(3, W * 0.004);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, H - ctx.lineWidth);
  ctx.restore();
}

/** Render the cover to a fresh offscreen canvas at the requested export size. */
export function renderExport(state, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  drawCover(ctx, state, width, height);
  return canvas;
}
