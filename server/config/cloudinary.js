const cloudinary = require('cloudinary').v2;
const fs = require('fs');

if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

/**
 * Upload local file to Cloudinary or return local relative URL fallback
 */
const uploadToCloudinary = async (filePath, folder = 'digital_cafe') => {
  try {
    if (
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ) {
      const result = await cloudinary.uploader.upload(filePath, {
        folder,
      });
      // Delete temporary local file after Cloudinary upload
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return {
        url: result.secure_url,
        publicId: result.public_id,
      };
    } else {
      // Local fallback URL
      const filename = filePath.split(/[\\/]/).pop();
      const relativeUrl = `/uploads/${filename}`;
      return {
        url: relativeUrl,
        publicId: filename,
      };
    }
  } catch (error) {
    console.error('[Cloudinary Upload Error]:', error);
    const filename = filePath.split(/[\\/]/).pop();
    return {
      url: `/uploads/${filename}`,
      publicId: filename,
    };
  }
};

/**
 * Delete image from Cloudinary or local uploads folder
 */
const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  try {
    if (
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET &&
      !publicId.includes('.')
    ) {
      await cloudinary.uploader.destroy(publicId);
    } else {
      const fs = require('fs');
      const path = require('path');
      const localPath = path.join(__dirname, '../uploads', publicId);
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }
    }
  } catch (error) {
    console.error('[Delete Image Error]:', error);
  }
};

module.exports = { uploadToCloudinary, deleteFromCloudinary };
