import { QR_CARD } from '../config/qrCard';

/** Load an image source into a decoded HTMLImageElement. */
const loadImage = (src) =>
  new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error('QR card image source is missing'));
      return;
    }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load image: ${src}`));
    img.src = src;
  });

/** Google Fonts load async; drawing before they land silently falls back. */
const ensureFontsReady = async () => {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load(`700 ${QR_CARD.tableNumber.fontSize}px ${QR_CARD.tableNumber.font}`),
      document.fonts.load(`700 ${QR_CARD.tableName.fontSize}px ${QR_CARD.tableName.font}`),
    ]);
    await document.fonts.ready;
  } catch {
    // Best effort only - the card still renders with the fallback family.
  }
};

/**
 * Draw text scaled down until it fits `maxWidth`, so a long table name can
 * never bleed over the QR panel.
 */
const drawFittedText = (ctx, text, spec) => {
  if (!text) return;
  let size = spec.fontSize;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (;;) {
    ctx.font = `700 ${size}px ${spec.font}`;
    if (ctx.measureText(text).width <= spec.maxWidth || size <= 10) break;
    size -= 1;
  }
  ctx.fillStyle = spec.color;
  ctx.fillText(text, spec.cx, spec.cy);
};

/** Only caption the card when the name adds information over the number. */
const isDistinctTableName = (table) => {
  const name = (table.tableName || '').trim();
  if (!name) return '';
  const generic = [`table ${table.tableNumber}`, `table #${table.tableNumber}`, `table${table.tableNumber}`];
  return generic.includes(name.toLowerCase()) ? '' : name;
};

/**
 * Compose a print-ready table-tent card.
 *
 * @param {{ qrSrc: string, table: { tableNumber: number|string, tableName?: string } }} params
 * @returns {Promise<HTMLCanvasElement>}
 */
export const composeQrCard = async ({ qrSrc, table }) => {
  const { width, height, panel, seal } = QR_CARD;

  const [template, qr, logo] = await Promise.all([
    loadImage(QR_CARD.templateSrc),
    loadImage(qrSrc),
    loadImage(QR_CARD.logoSrc).catch(() => null),
  ]);
  await ensureFontsReady();

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(template, 0, 0, width, height);

  // Repaint the panel so a QR generated before the current colours (or by an
  // older deploy) still lands on a clean surface.
  ctx.fillStyle = panel.fill;
  ctx.fillRect(panel.x, panel.y, panel.size, panel.size);

  // Paste the code at its NATIVE pixel size, centred in the panel.
  //
  // The server renders whole-pixel modules (see services/qrService.js), so any
  // fractional rescale here would give modules uneven widths - measured: a 392px
  // code stretched to the 440px panel becomes 8px AND 9px modules, the classic
  // "printed table tent won't scan" failure. Centring keeps every module exactly
  // 8px and turns the leftover margin into bonus quiet zone.
  const natural = qr.naturalWidth || qr.width;
  const qrSize = Math.min(natural, panel.size);
  const qrOffset = Math.round((panel.size - qrSize) / 2);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qr, panel.x + qrOffset, panel.y + qrOffset, qrSize, qrSize);
  ctx.imageSmoothingEnabled = true;

  drawFittedText(ctx, `T - ${table.tableNumber}`, QR_CARD.tableNumber);
  drawFittedText(ctx, isDistinctTableName(table), QR_CARD.tableName);

  if (logo) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(seal.cx, seal.cy, seal.size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logo, seal.cx - seal.size / 2, seal.cy - seal.size / 2, seal.size, seal.size);
    ctx.restore();
  }

  return canvas;
};

export const qrCardFileName = (table) =>
  `Hable-Cafe-Table-${table.tableNumber}-QR-Card.png`;

export default composeQrCard;
