const expiryReminderService = require('../services/expiryReminderService')

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

const calculateStatus = (record, expiryField, expiringDays) => {
  const expiryDate = parseDateString(record[expiryField])
  if (!expiryDate) return 'unknown'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  expiryDate.setHours(0, 0, 0, 0)

  const diffMs = expiryDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'expired'
  if (diffDays <= expiringDays) return 'expiring_soon'
  return 'active'
}

const buildSearchMatcher = (searchFields, search) => {
  if (!search || !search.trim()) return () => true
  const normalized = search.trim().toLowerCase()
  return (record) => searchFields.some((field) => String(record[field] || '').toLowerCase().includes(normalized))
}

const normalizeNumber = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const buildPayload = (body, config, userId, isCreate = false) => {
  const payload = {}

  config.stringFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      const value = body[field]
      payload[field] = typeof value === 'string' ? value.trim() : value
    }
  })

  config.uppercaseFields.forEach((field) => {
    if (payload[field]) {
      payload[field] = String(payload[field]).trim().toUpperCase()
    }
  })

  config.numberFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      payload[field] = normalizeNumber(body[field], 0)
    }
  })

  if (config.arrayField && Array.isArray(body[config.arrayField])) {
    payload[config.arrayField] = body[config.arrayField]
      .map((item) => ({
        name: String(item?.name || '').trim(),
        amount: normalizeNumber(item?.amount, 0),
      }))
      .filter((item) => item.name)
  }

  if (config.documentField && body[config.documentDataField]) {
    payload[config.documentField] = body[config.documentDataField]
  } else if (config.documentField && Object.prototype.hasOwnProperty.call(body, config.documentField)) {
    payload[config.documentField] = body[config.documentField]
  }

  if (isCreate) {
    payload.userId = userId
  }

  return payload
}

const createRecordController = (config) => {
  const {
    Model,
    expiryField,
    expiringDays,
    searchFields,
    balanceField,
    paidField,
  } = config

  const listRecords = async (req, res, filterType = 'all') => {
    try {
      const page = Math.max(Number(req.query.page) || 1, 1)
      const limit = Math.max(Number(req.query.limit) || 20, 1)
      const matcher = buildSearchMatcher(searchFields, req.query.search || '')

      const rawRecords = await Model.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean()

      const enriched = rawRecords
        .map((record) => ({
          ...record,
          status: calculateStatus(record, expiryField, expiringDays),
        }))
        .filter(matcher)
        .filter((record) => {
          if (filterType === 'expiring_soon') return record.status === 'expiring_soon'
          if (filterType === 'expired') return record.status === 'expired'
          if (filterType === 'pending') return normalizeNumber(record[balanceField], 0) > 0
          return true
        })

      const totalRecords = enriched.length
      const data = enriched.slice((page - 1) * limit, page * limit)

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
      console.error(`Error fetching ${config.name} records:`, error)
      res.status(500).json({ success: false, message: `Failed to fetch ${config.label} records` })
    }
  }

  const getAll = async (req, res) => listRecords(req, res, 'all')
  const getExpiringSoon = async (req, res) => listRecords(req, res, 'expiring_soon')
  const getExpired = async (req, res) => listRecords(req, res, 'expired')
  const getPendingPayment = async (req, res) => listRecords(req, res, 'pending')

  const getStatistics = async (req, res) => {
    try {
      const records = await Model.find({ userId: req.user._id }).lean()
      const totals = records.reduce((acc, record) => {
        const status = calculateStatus(record, expiryField, expiringDays)
        const balance = normalizeNumber(record[balanceField], 0)
        acc.total += 1
        if (status === 'active') acc.active += 1
        if (status === 'expiring_soon') acc.expiringSoon += 1
        if (status === 'expired') acc.expired += 1
        if (balance > 0) {
          acc.pendingPaymentCount += 1
          acc.pendingPaymentAmount += balance
        }
        return acc
      }, {
        total: 0,
        active: 0,
        expiringSoon: 0,
        expired: 0,
        pendingPaymentCount: 0,
        pendingPaymentAmount: 0,
      })

      res.json({ success: true, data: totals })
    } catch (error) {
      console.error(`Error fetching ${config.name} statistics:`, error)
      res.status(500).json({ success: false, message: `Failed to fetch ${config.label} statistics` })
    }
  }

  const create = async (req, res) => {
    try {
      const payload = buildPayload(req.body, config, req.user._id, true)
      if (!payload.vehicleNumber || !payload[config.requiredDateField]) {
        return res.status(400).json({ success: false, message: `vehicleNumber and ${config.requiredDateField} are required` })
      }

      if (!Object.prototype.hasOwnProperty.call(payload, balanceField) && Object.prototype.hasOwnProperty.call(payload, paidField)) {
        payload[balanceField] = Math.max(normalizeNumber(payload.totalFee || payload.totalAmount, 0) - normalizeNumber(payload[paidField], 0), 0)
      }

      const record = await Model.create(payload)
      expiryReminderService.runOnce().catch((error) => {
        console.error(`Post-create ${config.name} reminder run failed:`, error.message)
      })
      res.status(201).json({ success: true, data: record })
    } catch (error) {
      console.error(`Error creating ${config.name} record:`, error)
      res.status(500).json({ success: false, message: `Failed to create ${config.label} record` })
    }
  }

  const update = async (req, res) => {
    try {
      const payload = buildPayload(req.body, config, req.user._id, false)
      const record = await Model.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, payload, {
        returnDocument: 'after',
        runValidators: true,
      }).lean()

      if (!record) {
        return res.status(404).json({ success: false, message: `${config.label} record not found` })
      }

      expiryReminderService.runOnce().catch((error) => {
        console.error(`Post-update ${config.name} reminder run failed:`, error.message)
      })
      res.json({ success: true, data: record })
    } catch (error) {
      console.error(`Error updating ${config.name} record:`, error)
      res.status(500).json({ success: false, message: `Failed to update ${config.label} record` })
    }
  }

  const remove = async (req, res) => {
    try {
      const record = await Model.findOneAndDelete({ _id: req.params.id, userId: req.user._id }).lean()
      if (!record) {
        return res.status(404).json({ success: false, message: `${config.label} record not found` })
      }

      res.json({ success: true, message: `${config.label} record deleted successfully` })
    } catch (error) {
      console.error(`Error deleting ${config.name} record:`, error)
      res.status(500).json({ success: false, message: `Failed to delete ${config.label} record` })
    }
  }

  const markAsPaid = async (req, res) => {
    try {
      const record = await Model.findOne({ _id: req.params.id, userId: req.user._id })
      if (!record) {
        return res.status(404).json({ success: false, message: `${config.label} record not found` })
      }

      const totalField = config.totalField
      record[paidField] = normalizeNumber(record[totalField], 0)
      record[balanceField] = 0
      await record.save()

      res.json({ success: true, data: record })
    } catch (error) {
      console.error(`Error marking ${config.name} as paid:`, error)
      res.status(500).json({ success: false, message: `Failed to mark ${config.label} payment as paid` })
    }
  }

  const incrementWhatsapp = async (req, res) => {
    try {
      const record = await Model.findOne({ _id: req.params.id, userId: req.user._id })
      if (!record) {
        return res.status(404).json({ success: false, message: `${config.label} record not found` })
      }

      record.whatsappMessageCount = normalizeNumber(record.whatsappMessageCount, 0) + 1
      record.lastWhatsappSentAt = new Date()
      await record.save()

      res.json({
        success: true,
        data: {
          whatsappMessageCount: record.whatsappMessageCount,
          lastWhatsappSentAt: record.lastWhatsappSentAt,
        },
      })
    } catch (error) {
      console.error(`Error incrementing ${config.name} WhatsApp count:`, error)
      res.status(500).json({ success: false, message: `Failed to update ${config.label} WhatsApp count` })
    }
  }

  return {
    getAll,
    getExpiringSoon,
    getExpired,
    getPendingPayment,
    getStatistics,
    create,
    update,
    remove,
    markAsPaid,
    incrementWhatsapp,
  }
}

module.exports = { createRecordController }
