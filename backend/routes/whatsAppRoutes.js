const express = require('express')
const controller = require('../controllers/whatsAppController')

const router = express.Router()

router.get('/status', controller.getStatus)
router.get('/logs', controller.getReminderLogs)
router.post('/start', controller.startSession)
router.post('/stop', controller.stopSession)
router.post('/reset', controller.resetSession)
router.post('/run-reminders', controller.runReminders)

module.exports = router
