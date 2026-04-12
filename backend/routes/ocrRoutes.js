const express = require('express')
const { rcOcr, taxOcr, fitnessOcr, pucOcr, gpsOcr, insuranceOcr } = require('../controllers/ocrController')

const router = express.Router()

router.post('/rc', rcOcr)
router.post('/tax', taxOcr)
router.post('/fitness', fitnessOcr)
router.post('/puc', pucOcr)
router.post('/gps', gpsOcr)
router.post('/insurance', insuranceOcr)

module.exports = router
