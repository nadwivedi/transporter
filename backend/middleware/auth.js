const User = require('../models/User')
const Admin = require('../models/Admin')
const { ADMIN_COOKIE_NAME, getAuthPayloadFromRequest } = require('../utils/authToken')

const requireAuth = async (req, res, next) => {
  try {
    const payload = getAuthPayloadFromRequest(req)
    if (!payload?.userId || payload.type !== 'user') {
      return res.status(401).json({ success: false, message: 'Unauthorized' })
    }

    const user = await User.findById(payload.userId).lean()
    if (!user || user.isActive === false) {
      return res.status(401).json({ success: false, message: 'Unauthorized' })
    }

    req.user = user
    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    res.status(401).json({ success: false, message: 'Unauthorized' })
  }
}

const requireAdminAuth = async (req, res, next) => {
  try {
    const payload = getAuthPayloadFromRequest(req, ADMIN_COOKIE_NAME)
    if (!payload?.adminId || payload.type !== 'admin') {
      return res.status(401).json({ success: false, message: 'Unauthorized' })
    }

    const admin = await Admin.findById(payload.adminId).lean()
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Unauthorized' })
    }

    req.admin = admin
    next()
  } catch (error) {
    console.error('Admin auth middleware error:', error)
    res.status(401).json({ success: false, message: 'Unauthorized' })
  }
}

module.exports = {
  requireAuth,
  requireAdminAuth,
}
