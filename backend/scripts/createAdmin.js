require('dotenv').config()
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const Admin = require('../models/Admin')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/transport'

const readArgValue = (name) => {
  const exactPrefix = `--${name}=`
  const argv = process.argv.slice(2)

  for (let index = 0; index < argv.length; index += 1) {
    const part = argv[index]
    if (part.startsWith(exactPrefix)) {
      return part.slice(exactPrefix.length)
    }

    if (part === `--${name}`) {
      return argv[index + 1] || ''
    }
  }

  return ''
}

const email = String(readArgValue('email') || process.env.ADMIN_EMAIL || '')
  .trim()
  .toLowerCase()
const password = String(readArgValue('password') || process.env.ADMIN_PASSWORD || '')

if (!email || !password) {
  console.error('Usage: npm run create-admin -- --email admin@example.com --password yourPassword')
  process.exit(1)
}

const run = async () => {
  await mongoose.connect(MONGODB_URI)

  try {
    const passwordHash = await bcrypt.hash(password, 10)
    const existingAdmin = await Admin.findOne({ email })

    if (existingAdmin) {
      existingAdmin.password = passwordHash
      await existingAdmin.save()
      console.log(`Admin updated: ${email}`)
      return
    }

    await Admin.create({
      email,
      password: passwordHash,
    })

    console.log(`Admin created: ${email}`)
  } finally {
    await mongoose.disconnect()
  }
}

run().catch((error) => {
  console.error('Failed to create admin:', error)
  process.exit(1)
})
