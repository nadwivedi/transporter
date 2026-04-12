const express = require('express')
const { uploadRcImage } = require('../controllers/uploadController')

const router = express.Router()

router.post('/rc-image', uploadRcImage)

module.exports = router
