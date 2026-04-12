const User = require('../models/User')
const { signToken, buildAuthCookie, buildClearAuthCookie } = require('../utils/authToken')

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name || '',
  mobile: user.mobile || '',
  isActive: user.isActive !== false,
  lastLogin: user.lastLogin || null,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
})

const login = async (req, res) => {
  try {
    const identifier = String(req.body.identifier || '').trim()
    const password = String(req.body.password || '')

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Identifier and password are required' })
    }

    const user = await User.findOne({ mobile: identifier })

    if (!user || user.isActive === false) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }

    const isValidPassword = await user.comparePassword(password)
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }

    user.lastLogin = new Date()
    await user.save()

    const token = signToken({ userId: String(user._id), type: 'user' })
    res.setHeader('Set-Cookie', buildAuthCookie(token))

    res.json({
      success: true,
      data: {
        user: sanitizeUser(user),
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ success: false, message: 'Failed to login' })
  }
}

const profile = async (req, res) => {
  res.json({
    success: true,
    data: {
      user: sanitizeUser(req.user),
    },
  })
}

const logout = async (_req, res) => {
  res.setHeader('Set-Cookie', buildClearAuthCookie())
  res.json({ success: true, message: 'Logged out successfully' })
}

module.exports = {
  login,
  profile,
  logout,
}
