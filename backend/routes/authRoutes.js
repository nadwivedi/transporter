const express = require('express')
const controller = require('../controllers/authController')
const { requireAuth } = require('../middleware/auth')
const { requireAdminAuth } = require('../middleware/adminAuth')

const router = express.Router()

router.post('/login', controller.login)
router.get('/profile', requireAuth, controller.profile)
router.post('/logout', controller.logout)
router.post('/admin/login', controller.adminLogin)
router.get('/admin/profile', requireAdminAuth, controller.adminProfile)
router.post('/admin/logout', controller.adminLogout)

module.exports = router
