const express = require('express')
const { rcOcr, taxOcr, fitnessOcr, pucOcr, gpsOcr } = require('../controllers/ocrController')

const router = express.Router()

router.post('/rc', rcOcr)
router.post('/tax', taxOcr)
router.post('/fitness', fitnessOcr)
router.post('/puc', pucOcr)
router.post('/gps', gpsOcr)

module.exports = router
