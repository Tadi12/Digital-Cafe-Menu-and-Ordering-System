const QRCode = require('qrcode');

/**
 * Generate Data URI QR Code for a given Table ID
 * Example menu URL: http://localhost:5173/menu/table/{tableId}
 */
const generateTableQRCode = async (tableId) => {
  try {
    const clientBaseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const menuUrl = `${clientBaseUrl}/menu/table/${tableId}`;
    
    // Generate QR Code as Data URL
    const qrDataUrl = await QRCode.toDataURL(menuUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 2,
      width: 400,
      color: {
        dark: '#3D2314', // Warm coffee dark color
        light: '#FAF7F2', // Warm cream background
      },
    });

    return qrDataUrl;
  } catch (error) {
    console.error('[QR Generation Error]:', error);
    throw new Error('Failed to generate table QR code');
  }
};

module.exports = { generateTableQRCode };
