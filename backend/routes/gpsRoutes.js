const express = require('express')
const controller = require('../controllers/gpsController')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

router.use(requireAuth)

router.get('/statistics', controller.getStatistics)
router.get('/expiring-soon', controller.getExpiringSoon)
router.get('/expired', controller.getExpired)
router.get('/pending', controller.getPendingPayment)
router.get('/', controller.getAll)
router.post('/', controller.create)
router.put('/id/:id', controller.update)
router.delete('/id/:id', controller.remove)
router.patch('/id/:id/mark-as-paid', controller.markAsPaid)
router.patch('/id/:id/whatsapp-increment', controller.incrementWhatsapp)

module.exports = router
