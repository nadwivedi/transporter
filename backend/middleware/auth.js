const User = require('../models/User')
const { getAuthPayloadFromRequest } = require('../utils/authToken')

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

module.exports = {
  requireAuth,
}
