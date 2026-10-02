/**
 * Geometry for the printed Habl Cafe table-tent QR card.
 *
 * All values are in TEMPLATE PIXELS on a 1080 x 1440 (3:4) canvas, which maps
 * cleanly to an A5 / 4x6" print.
 *
 * These were MEASURED from the clean artwork, not guessed. The QR panel is the
 * largest square that fits between the "SCAN ME" caption and the red wave, so
 * the code never collides with the artwork on any side.
 *
 * If you re-export the artwork, re-measure and update these numbers.
 *
 * server/services/qrService.js -> QR_PANEL_SIZE must equal `panel.size`.
 */
export const QR_CARD = {
  /** Clean artwork with no QR and no table number baked in. */
  templateSrc: '/qr-card-template.png',

  width: 1080,
  height: 1440,

  /**
   * 440x440 at (300, 480) is verified to sit entirely on the flat black band:
   * it clears "SCAN ME" above (y=462) and the red wave below (dark ends at
   * y=924-931 across this x-range). Sized down from the 458px theoretical
   * maximum because that hit the wave by 2px on the right edge.
   */
  panel: {
    x: 300,
    y: 480,
    size: 440,
    fill: '#FAF7F2',
  },

  /** Big "T - 4" label on the black band, left of the QR. */
  tableNumber: {
    cx: 150,
    cy: 672,
    maxWidth: 250,
    fontSize: 50,
    color: '#CCCCCC',
    font: '"Playfair Display", Georgia, serif',
  },

  /** Optional "VIP Corner Table 4" caption under the number. */
  tableName: {
    cx: 150,
    cy: 720,
    maxWidth: 250,
    fontSize: 18,
    color: 'rgba(204, 204, 204, 0.75)',
    font: '"Playfair Display", Georgia, serif',
  },

  /** Logo dropped into the empty red seal on the right. */
  seal: {
    cx: 894,
    cy: 659,
    size: 150,
  },

  logoSrc: '/logo.png',
};

export default QR_CARD;
