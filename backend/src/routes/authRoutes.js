const express = require('express')
const router = express.Router()
const { login, getMe } = require('../controllers/authController')
const { protect } = require('../middlewares/authMiddleware')

// POST /api/auth/login
router.post('/login', login)

// GET /api/auth/me (ต้องแนบ Token มาด้วย)
router.get('/me', protect, getMe)

module.exports = router