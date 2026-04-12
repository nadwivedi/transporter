const express = require('express')
const { requireAuth } = require('../middleware/auth')
const {
  getVehicles,
  getVehicleStatistics,
  getVehicleDetail,
  searchVehicle,
  checkVehicleExists,
  createVehicle,
  updateVehicle,
  deleteVehicle,
} = require('../controllers/vehicleController')

const router = express.Router()

router.use(requireAuth)

router.get('/', getVehicles)
router.get('/statistics', getVehicleStatistics)
router.get('/:id/detail', getVehicleDetail)
router.get('/search/:searchInput', searchVehicle)
router.get('/check-exists/:regNumber', checkVehicleExists)
router.post('/', createVehicle)
router.put('/:id', updateVehicle)
router.delete('/:id', deleteVehicle)

module.exports = router
