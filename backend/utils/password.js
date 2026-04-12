const crypto = require('crypto')

const HASH_PREFIX = 'scrypt'

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex')
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${HASH_PREFIX}:${salt}:${derivedKey}`
}

const comparePassword = (candidatePassword, hashedPassword) => {
  if (!candidatePassword || !hashedPassword || typeof hashedPassword !== 'string') {
    return false
  }

  const parts = hashedPassword.split(':')
  if (parts.length !== 3 || parts[0] !== HASH_PREFIX) {
    return false
  }

  const [, salt, storedHash] = parts
  const derivedKey = crypto.scryptSync(candidatePassword, salt, 64).toString('hex')

  return crypto.timingSafeEqual(Buffer.from(storedHash, 'hex'), Buffer.from(derivedKey, 'hex'))
}

module.exports = {
  hashPassword,
  comparePassword,
}
