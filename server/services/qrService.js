const QRCode = require('qrcode');

/**
 * The QR panel on the printed table card. MUST stay in sync with
 * client/src/config/qrCard.js -> QR_CARD.panel.size
 */
const QR_PANEL_SIZE = 440;

/** ISO/IEC 18004 requires a quiet zone of 4 modules on every side. */
const QUIET_MODULES = 4;

/**
 * Generate Data URI QR Code for a given Table ID
 * Example menu URL: http://localhost:5173/menu/table/{tableId}
 *
 * The code is rendered at an exact whole-pixel module size that fits the card's
 * QR panel, so the client can paste it into the template 1:1 with no resampling.
 * Scaled-up QR codes develop uneven module widths, which is the usual cause of
 * "won't scan from a printed table tent" bugs.
 *
 * @param {string} tableId
 * @param {{ targetSize?: number }} [options]
 * @returns {Promise<string>} data URI
 */
const generateTableQRCode = async (tableId, options = {}) => {
  try {
    const clientBaseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const menuUrl = `${clientBaseUrl}/menu/table/${tableId}`;
    const targetSize = options.targetSize || QR_PANEL_SIZE;

    const qrOptions = {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: QUIET_MODULES,
      color: {
        dark: '#3D2314', // Warm coffee dark color
        light: '#FAF7F2', // Warm cream background - matches the card panel
      },
    };

    // Ask the library how many modules this payload needs, then round the
    // render size down to a whole number of modules.
    const symbol = QRCode.create(menuUrl, qrOptions);
    const totalUnits = symbol.modules.size + QUIET_MODULES * 2;
    const unit = Math.max(1, Math.floor(targetSize / totalUnits));

    const qrDataUrl = await QRCode.toDataURL(menuUrl, {
      ...qrOptions,
      width: unit * totalUnits,
    });

    return qrDataUrl;
  } catch (error) {
    console.error('[QR Generation Error]:', error);
    throw new Error('Failed to generate table QR code');
  }
};

module.exports = { generateTableQRCode, QR_PANEL_SIZE, QUIET_MODULES };
