const Admin = require('../models/Admin')
const { ADMIN_COOKIE_NAME, getAuthPayloadFromRequest } = require('../utils/authToken')

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
  requireAdminAuth,
}
