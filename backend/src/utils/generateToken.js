require('dotenv').config(); // <--- เพิ่มบรรทัดนี้บนสุด
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
     console.error("FATAL ERROR: JWT_SECRET is not defined.");
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

module.exports = generateToken;