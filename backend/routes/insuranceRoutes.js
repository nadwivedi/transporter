const express = require('express')
const controller = require('../controllers/insuranceController')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

router.use(requireAuth)

router.get('/statistics', controller.getStatistics)
router.get('/expiring-soon', controller.getExpiringSoon)
router.get('/expired', controller.getExpired)
router.get('/pending', controller.getPendingPayment)
router.get('/', controller.getAll)
router.post('/', controller.create)
router.put('/:id', controller.update)
router.delete('/:id', controller.remove)
router.patch('/:id/mark-as-paid', controller.markAsPaid)
router.patch('/:id/whatsapp-increment', controller.incrementWhatsapp)

module.exports = router
