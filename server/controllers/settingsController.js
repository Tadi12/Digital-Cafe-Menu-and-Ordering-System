const CafeSettings = require('../models/CafeSettings');

const getSettings = async (req, res) => {
  let settings = await CafeSettings.findOne();
  if (!settings) settings = await CafeSettings.create({});
  // If not admin, don't return the PIN (wait, we actually DO need the PIN for validation, but we validate on the backend)
  // Actually, the customer POSTs the PIN to validate.
  res.json({ success: true, data: settings });
};

const updateSettings = async (req, res) => {
  const { accessPin } = req.body;
  let settings = await CafeSettings.findOne();
  if (!settings) settings = await CafeSettings.create({});
  if (accessPin) settings.accessPin = accessPin;
  await settings.save();
  res.json({ success: true, data: settings });
};

const validatePin = async (req, res) => {
  const { pin } = req.body;
  const settings = await CafeSettings.findOne();
  if (!settings || settings.accessPin !== pin) {
    return res.status(403).json({ success: false, message: 'Invalid PIN code.' });
  }
  res.json({ success: true, message: 'PIN Accepted' });
};

module.exports = { getSettings, updateSettings, validatePin };
