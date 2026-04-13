const whatsAppSessionManager = require('../services/whatsAppSessionManager')
const expiryReminderService = require('../services/expiryReminderService')

const getStatus = async (_req, res) => {
  try {
    const status = await whatsAppSessionManager.getStatus()
    res.json({ success: true, data: status })
  } catch (error) {
    console.error('Failed to get WhatsApp status:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch WhatsApp status' })
  }
}

const createSession = async (req, res) => {
  try {
    const session = await whatsAppSessionManager.createSession({
      sessionKey: req.body?.sessionKey,
      displayName: req.body?.displayName,
    })
    res.json({ success: true, data: session })
  } catch (error) {
    console.error('Failed to create WhatsApp session:', error)
    res.status(400).json({ success: false, message: error.message || 'Failed to create WhatsApp session' })
  }
}

const startSession = async (req, res) => {
  try {
    const session = await whatsAppSessionManager.startSession(req.params.sessionKey)
    res.json({ success: true, data: session })
  } catch (error) {
    console.error('Failed to start WhatsApp session:', error)
    res.status(500).json({ success: false, message: error.message || 'Failed to start WhatsApp session' })
  }
}

const stopSession = async (req, res) => {
  try {
    const session = await whatsAppSessionManager.stopSession(req.params.sessionKey)
    res.json({ success: true, data: session })
  } catch (error) {
    console.error('Failed to stop WhatsApp session:', error)
    res.status(500).json({ success: false, message: 'Failed to stop WhatsApp session' })
  }
}

const resetSession = async (req, res) => {
  try {
    const session = await whatsAppSessionManager.resetSession(req.params.sessionKey)
    res.json({ success: true, data: session })
  } catch (error) {
    console.error('Failed to reset WhatsApp session:', error)
    res.status(500).json({ success: false, message: error.message || 'Failed to reset WhatsApp session' })
  }
}

const setActiveSession = async (req, res) => {
  try {
    const session = await whatsAppSessionManager.setActiveSession(req.params.sessionKey)
    res.json({ success: true, data: session })
  } catch (error) {
    console.error('Failed to set active WhatsApp session:', error)
    res.status(400).json({ success: false, message: error.message || 'Failed to set active WhatsApp session' })
  }
}

const runReminders = async (_req, res) => {
  try {
    const result = await expiryReminderService.runOnce()
    res.json({ success: true, data: result })
  } catch (error) {
    console.error('Failed to run reminders:', error)
    res.status(500).json({ success: false, message: error.message || 'Failed to run reminders' })
  }
}

const getReminderLogs = async (req, res) => {
  try {
    const limit = Number(req.query.limit || 100)
    const logs = await expiryReminderService.getLogs(limit)
    res.json({ success: true, data: logs })
  } catch (error) {
    console.error('Failed to fetch reminder logs:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch reminder logs' })
  }
}

module.exports = {
  getStatus,
  createSession,
  startSession,
  stopSession,
  resetSession,
  setActiveSession,
  runReminders,
  getReminderLogs,
}
