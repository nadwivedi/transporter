require('dotenv').config()
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const readline = require('readline')
const Admin = require('../models/Admin')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/transport'

const askQuestion = (rl, prompt) =>
  new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(String(answer || ''))
    })
  })

const run = async () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  const rawEmail = await askQuestion(rl, 'Enter admin email: ')
  const rawPassword = await askQuestion(rl, 'Enter admin password: ')
  rl.close()

  const email = rawEmail.trim().toLowerCase()
  const password = rawPassword

  if (!email || !password) {
    console.error('Email and password are required.')
    process.exit(1)
  }

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
