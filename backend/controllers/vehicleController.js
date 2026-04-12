const Vehicle = require('../models/Vehicle')
const Fitness = require('../models/Fitness')
const Tax = require('../models/Tax')
const Puc = require('../models/Puc')
const Insurance = require('../models/Insurance')
const Gps = require('../models/Gps')

const normalizeNumberField = (value) => {
  if (value === undefined || value === null || value === '') return undefined

  if (typeof value === 'number') {
    return Number.isNaN(value) ? undefined : value
  }

  const cleaned = String(value).trim()
  if (!cleaned) return undefined

  const numeric = Number(cleaned)
  if (!Number.isNaN(numeric)) return numeric

  return undefined
}

const normalizeManufactureYear = (value) => {
  if (value === undefined || value === null || value === '') return undefined

  if (typeof value === 'number') {
    return Number.isNaN(value) ? undefined : value
  }

  const cleaned = String(value).trim()
  if (!cleaned) return undefined

  const exactYearMatch = cleaned.match(/\b(19|20)\d{2}\b/g)
  if (exactYearMatch?.length) {
    return Number(exactYearMatch[exactYearMatch.length - 1])
  }

  const numeric = Number(cleaned)
  if (!Number.isNaN(numeric)) return numeric

  return undefined
}

const normalizeVehiclePayload = (payload) => {
  const normalized = { ...payload }

  if (normalized.registrationNumber || normalized.vehicleNumber) {
    normalized.registrationNumber = (normalized.registrationNumber || normalized.vehicleNumber || '').trim().toUpperCase()
  }

  normalized.seatingCapacity = normalizeNumberField(normalized.seatingCapacity)
  normalized.ladenWeight = normalizeNumberField(normalized.ladenWeight)
  normalized.unladenWeight = normalizeNumberField(normalized.unladenWeight)
  normalized.numberOfCylinders = normalizeNumberField(normalized.numberOfCylinders)
  normalized.cubicCapacity = normalizeNumberField(normalized.cubicCapacity)
  normalized.wheelBase = normalizeNumberField(normalized.wheelBase)
  normalized.manufactureYear = normalizeManufactureYear(normalized.manufactureYear)

  Object.keys(normalized).forEach((key) => {
    if (normalized[key] === undefined) {
      delete normalized[key]
    }
  })

  return normalized
}

const buildSearchFilter = (search) => {
  if (!search || !search.trim()) return {}

  const regex = new RegExp(search.trim(), 'i')
  return {
    $or: [
      { registrationNumber: regex },
      { ownerName: regex },
      { chassisNumber: regex },
      { engineNumber: regex },
      { mobileNumber: regex },
    ],
  }
}

const parseDateString = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return null

  const parts = dateStr.trim().split(/[/-]/)
  if (parts.length !== 3) return null

  const day = Number(parts[0])
  const month = Number(parts[1]) - 1
  const year = Number(parts[2])
  if ([day, month, year].some(Number.isNaN) || year < 1900) return null

  const date = new Date(year, month, day)
  if (Number.isNaN(date.getTime())) return null
  if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) return null

  return date
}

const calculateDocumentStatus = (expiryDateStr) => {
  const expiryDate = parseDateString(expiryDateStr)
  if (!expiryDate) return 'unknown'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  expiryDate.setHours(0, 0, 0, 0)

  const diffMs = expiryDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'expired'
  if (diffDays <= 30) return 'expiring_soon'
  return 'active'
}

const mapRecordsWithStatus = (records, expiryField) =>
  records.map((record) => ({
    ...record,
    status: calculateDocumentStatus(record?.[expiryField]),
  }))

const getVehicles = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1)
    const limit = Math.max(Number(req.query.limit) || 20, 1)
    const search = req.query.search || ''
    const filter = {
      userId: req.user._id,
      ...buildSearchFilter(search),
    }

    const totalRecords = await Vehicle.countDocuments(filter)
    const data = await Vehicle.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()

    res.json({
      success: true,
      data,
      pagination: {
        currentPage: page,
        totalPages: Math.max(Math.ceil(totalRecords / limit), 1),
        totalRecords,
        limit,
      },
    })
  } catch (error) {
    console.error('Error fetching vehicles:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch vehicles' })
  }
}

const getVehicleStatistics = async (req, res) => {
  try {
    const total = await Vehicle.countDocuments({ userId: req.user._id })
    res.json({ success: true, data: { total } })
  } catch (error) {
    console.error('Error fetching vehicle statistics:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch vehicle statistics' })
  }
}

const getVehicleDetail = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({ _id: req.params.id, userId: req.user._id }).lean()

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' })
    }

    const vehicleNumber = (vehicle.registrationNumber || vehicle.vehicleNumber || '').trim().toUpperCase()

    const [fitnessRecords, taxRecords, pucRecords, insuranceRecords, gpsRecords] = await Promise.all([
      Fitness.find({ vehicleNumber, userId: req.user._id }).sort({ createdAt: -1 }).lean(),
      Tax.find({ vehicleNumber, userId: req.user._id }).sort({ createdAt: -1 }).lean(),
      Puc.find({ vehicleNumber, userId: req.user._id }).sort({ createdAt: -1 }).lean(),
      Insurance.find({ vehicleNumber, userId: req.user._id }).sort({ createdAt: -1 }).lean(),
      Gps.find({ vehicleNumber, userId: req.user._id }).sort({ createdAt: -1 }).lean(),
    ])

    const fitnessWithStatus = mapRecordsWithStatus(fitnessRecords, 'validTo')
    const taxWithStatus = mapRecordsWithStatus(taxRecords, 'taxTo')
    const pucWithStatus = mapRecordsWithStatus(pucRecords, 'validTo')
    const insuranceWithStatus = mapRecordsWithStatus(insuranceRecords, 'validTo')
    const gpsWithStatus = mapRecordsWithStatus(gpsRecords, 'validTo')

    res.json({
      success: true,
      data: {
        vehicle,
        overview: {
          vehicleNumber,
          totalRelatedRecords:
            fitnessRecords.length +
            taxRecords.length +
            pucRecords.length +
            insuranceRecords.length +
            gpsRecords.length,
          fitnessCount: fitnessWithStatus.length,
          taxCount: taxWithStatus.length,
          pucCount: pucWithStatus.length,
          insuranceCount: insuranceWithStatus.length,
          gpsCount: gpsWithStatus.length,
        },
        records: {
          rc: vehicle,
          fitness: fitnessWithStatus,
          tax: taxWithStatus,
          puc: pucWithStatus,
          insurance: insuranceWithStatus,
          gps: gpsWithStatus,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching vehicle detail:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch vehicle detail' })
  }
}

const searchVehicle = async (req, res) => {
  try {
    const searchInput = (req.params.searchInput || '').trim()
    if (!searchInput) {
      return res.status(400).json({ success: false, message: 'Search input is required' })
    }

    const regex = new RegExp(searchInput, 'i')
    const data = await Vehicle.find({ userId: req.user._id, registrationNumber: regex }).sort({ createdAt: -1 }).limit(10).lean()

    if (!data.length) {
      return res.status(404).json({ success: false, message: 'No vehicles found matching the search' })
    }

    if (data.length === 1) {
      return res.json({ success: true, multiple: false, data: data[0] })
    }

    res.json({ success: true, multiple: true, data })
  } catch (error) {
    console.error('Error searching vehicle:', error)
    res.status(500).json({ success: false, message: 'Failed to search vehicle' })
  }
}

const checkVehicleExists = async (req, res) => {
  try {
    const regNumber = (req.params.regNumber || '').trim().toUpperCase()
    const existingVehicle = await Vehicle.findOne({ userId: req.user._id, registrationNumber: regNumber }).lean()

    res.json({
      success: true,
      exists: Boolean(existingVehicle),
      data: existingVehicle || null,
    })
  } catch (error) {
    console.error('Error checking vehicle:', error)
    res.status(500).json({ success: false, message: 'Failed to check vehicle' })
  }
}

const createVehicle = async (req, res) => {
  try {
    const payload = normalizeVehiclePayload({
      ...req.body,
      userId: req.user._id,
    })

    if (!payload.registrationNumber || !payload.chassisNumber) {
      return res.status(400).json({ success: false, message: 'registrationNumber and chassisNumber are required' })
    }

    const vehicle = await Vehicle.create(payload)
    res.status(201).json({ success: true, data: vehicle })
  } catch (error) {
    console.error('Error creating vehicle:', error)
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Vehicle already exists' })
    }
    res.status(500).json({ success: false, message: 'Failed to create vehicle' })
  }
}

const updateVehicle = async (req, res) => {
  try {
    const payload = normalizeVehiclePayload({
      ...req.body,
    })

    const vehicle = await Vehicle.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, payload, {
      returnDocument: 'after',
      runValidators: true,
    }).lean()

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' })
    }

    res.json({ success: true, data: vehicle })
  } catch (error) {
    console.error('Error updating vehicle:', error)
    res.status(500).json({ success: false, message: 'Failed to update vehicle' })
  }
}

const deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOneAndDelete({ _id: req.params.id, userId: req.user._id }).lean()

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' })
    }

    res.json({ success: true, message: 'Vehicle deleted successfully' })
  } catch (error) {
    console.error('Error deleting vehicle:', error)
    res.status(500).json({ success: false, message: 'Failed to delete vehicle' })
  }
}

module.exports = {
  getVehicles,
  getVehicleStatistics,
  getVehicleDetail,
  searchVehicle,
  checkVehicleExists,
  createVehicle,
  updateVehicle,
  deleteVehicle,
}
