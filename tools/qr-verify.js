// Diagnostic: prove the QR renders with whole-pixel modules and sits in the
// panel without a fractional resample (which is what breaks real-world scans).
const path = require('path');
const { PNG } = require(path.join(__dirname, '../server/node_modules/pngjs'));
const QRCode = require('../server/node_modules/qrcode');
const { generateTableQRCode, QUIET_MODULES } = require('../server/services/qrService');

const PANEL = 440;
const CREAM = [250, 247, 242];

const isDark = (png, x, y) => {
  const o = (y * png.width + x) * 4;
  return png.data[o] < 128 && png.data[o + 1] < 128 && png.data[o + 2] < 128;
};

/** Smallest run length on the centre row = module width in pixels. */
const measureModule = (png) => {
  let firstDarkY = -1;
  for (let y = 0; y < png.height; y++) {
    if (isDark(png, Math.floor(png.width / 2), y)) { firstDarkY = y; break; }
  }
  if (firstDarkY < 0) return null;
  let minRun = Infinity;
  let run = 0;
  let prev = false;
  for (let x = 0; x < png.width; x++) {
    const dark = isDark(png, x, firstDarkY);
    if (dark && !prev) run = 0;
    if (dark) run++;
    if (!dark && prev) minRun = Math.min(minRun, run);
    prev = dark;
  }
  if (prev) minRun = Math.min(minRun, run);
  return minRun;
};

/** Replicate ctx.drawImage(nearest) of `src` into a `size`x`size` cream square. */
const paste = (src, size) => {
  const out = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sx = Math.min(src.width - 1, Math.floor((x * src.width) / size));
      const sy = Math.min(src.height - 1, Math.floor((y * src.height) / size));
      const si = (sy * src.width + sx) * 4;
      const di = (y * size + x) * 4;
      out.data[di] = src.data[si];
      out.data[di + 1] = src.data[si + 1];
      out.data[di + 2] = src.data[si + 2];
      out.data[di + 3] = 255;
    }
  }
  return out;
};

(async () => {
  const url = `${process.env.CLIENT_URL || 'http://localhost:5173'}/menu/table/507f1f77bcf86cd799439011`;
  const sym = QRCode.create(url, { errorCorrectionLevel: 'H', margin: QUIET_MODULES });
  const totalUnits = sym.modules.size + QUIET_MODULES * 2;
  const unit = Math.max(1, Math.floor(PANEL / totalUnits));
  const render = unit * totalUnits;

  console.log(`url ${url}`);
  console.log(`  version=${sym.version} modules=${sym.modules.size} totalUnits=${totalUnits}`);
  console.log(`  unit=${unit}px -> render ${render}px, panel ${PANEL}px, slack ${PANEL - render}px`);
  console.log('');

  const dataUrl = await generateTableQRCode('507f1f77bcf86cd799439011');
  const src = PNG.sync.read(Buffer.from(dataUrl.split(',')[1], 'base64'));
  const nativeModule = measureModule(src);
  console.log(`source PNG ${src.width}x${src.height}`);
  console.log(`  module width ${nativeModule}px  (even, unscaled): ${nativeModule === unit ? 'YES' : 'NO'}`);

  // Option A: what the card does today - stretch 392px up to the 440px panel.
  const stretched = paste(src, PANEL);
  const stretchModule = measureModule(stretched);

  // Option B: paste at native size, centred, cream showing around it.
  const centred = new PNG({ width: PANEL, height: PANEL });
  for (let i = 0; i < centred.data.length; i += 4) {
    centred.data[i] = CREAM[0]; centred.data[i + 1] = CREAM[1];
    centred.data[i + 2] = CREAM[2]; centred.data[i + 3] = 255;
  }
  const off = Math.floor((PANEL - src.width) / 2);
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const si = (y * src.width + x) * 4;
      const di = ((y + off) * PANEL + (x + off)) * 4;
      centred.data[di] = src.data[si];
      centred.data[di + 1] = src.data[si + 1];
      centred.data[di + 2] = src.data[si + 2];
      centred.data[di + 3] = 255;
    }
  }
  const centreModule = measureModule(centred);

  console.log('');
  console.log(`A) stretched to ${PANEL}px  -> module ${stretchModule}px  ${stretchModule === unit ? 'clean' : 'MIXED MODULE WIDTHS (unscannable)'}`);
  console.log(`B) centred at ${src.width}px -> module ${centreModule}px  ${centreModule === unit ? 'clean' : 'MIXED MODULE WIDTHS'}`);

  const ok = centreModule === unit;
  console.log('');
  console.log(ok
    ? `PASS: centring keeps ${unit}px modules; ${off}px cream quiet zone on every side.`
    : 'FAIL: centring did not preserve module width');
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
