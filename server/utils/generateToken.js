const jwt = require('jsonwebtoken');

const generateToken = (id, sessionId) => {
  return jwt.sign({ id, sessionId }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

module.exports = generateToken;
