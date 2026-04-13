const express = require('express')
const controller = require('../controllers/whatsAppController')
const { requireAdminAuth } = require('../middleware/adminAuth')

const router = express.Router()

router.get('/status', requireAdminAuth, controller.getStatus)
router.get('/logs', requireAdminAuth, controller.getReminderLogs)
router.post('/start', requireAdminAuth, controller.startSession)
router.post('/stop', requireAdminAuth, controller.stopSession)
router.post('/reset', requireAdminAuth, controller.resetSession)
router.post('/run-reminders', requireAdminAuth, controller.runReminders)

module.exports = router
