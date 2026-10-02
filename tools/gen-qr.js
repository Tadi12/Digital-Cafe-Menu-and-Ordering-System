// Renders real table QRs to tools/out/qr-<n>.png for compose-preview.ps1.
const fs = require('fs');
const path = require('path');
const { generateTableQRCode } = require('../server/services/qrService');

const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });

const BASE = process.env.CLIENT_URL || 'http://localhost:5173';
const TABLES = [
  { num: 1, id: '507f1f77bcf86cd799439011' },
  { num: 42, id: '507f191e810c19729de860ea' },
];

(async () => {
  for (const t of TABLES) {
    const dataUrl = await generateTableQRCode(t.id);
    const file = path.join(OUT, `qr-${t.num}.png`);
    fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
    console.log(`table ${t.num}: ${BASE}/menu/table/${t.id} -> ${path.basename(file)}`);
  }
})().catch((e) => {
  console.error('FAIL', e);
  process.exit(1);
});
