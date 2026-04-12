const User = require('../models/User')
const bcrypt = require('bcryptjs')

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name || '',
  mobile: user.mobile || '',
  isActive: user.isActive !== false,
  lastLogin: user.lastLogin || null,
  createdAt: user.createdAt,
})

const listUsers = async (_req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 }).lean()
    res.json({ success: true, data: users.map(sanitizeUser) })
  } catch (error) {
    console.error('Error listing users:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch users' })
  }
}

const createUser = async (req, res) => {
  try {
    const name = String(req.body.name || '').trim()
    const password = String(req.body.password || '')
    const mobile = String(req.body.mobile || '').trim()

    if (!name || !mobile || !password) {
      return res.status(400).json({ success: false, message: 'Name, mobile, and password are required' })
    }

    const existingUser = await User.findOne({ mobile }).lean()

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists with this mobile number' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await User.create({
      name,
      mobile,
      password: hashedPassword,
      isActive: true,
    })

    res.status(201).json({
      success: true,
      data: sanitizeUser(user),
    })
  } catch (error) {
    console.error('Error creating user:', error)
    res.status(500).json({ success: false, message: 'Failed to create user' })
  }
}

module.exports = {
  listUsers,
  createUser,
}
