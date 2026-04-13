const express = require('express')
const controller = require('../controllers/whatsAppController')
const { requireAdminAuth } = require('../middleware/adminAuth')

const router = express.Router()

router.get('/status', requireAdminAuth, controller.getStatus)
router.get('/logs', requireAdminAuth, controller.getReminderLogs)
router.post('/sessions', requireAdminAuth, controller.createSession)
router.post('/sessions/:sessionKey/start', requireAdminAuth, controller.startSession)
router.post('/sessions/:sessionKey/stop', requireAdminAuth, controller.stopSession)
router.post('/sessions/:sessionKey/reset', requireAdminAuth, controller.resetSession)
router.post('/sessions/:sessionKey/activate', requireAdminAuth, controller.setActiveSession)
router.post('/run-reminders', requireAdminAuth, controller.runReminders)

module.exports = router
