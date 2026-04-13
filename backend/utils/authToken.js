const crypto = require('crypto')

const COOKIE_NAME = 'transport_auth'
const ADMIN_COOKIE_NAME = 'transport_admin_auth'

const getSecret = () => process.env.AUTH_SECRET || 'transport-dev-secret'

const base64UrlEncode = (value) => Buffer.from(value).toString('base64url')
const base64UrlDecode = (value) => Buffer.from(value, 'base64url').toString('utf8')

const signToken = (payload) => {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const signature = crypto.createHmac('sha256', getSecret()).update(encodedPayload).digest('base64url')
  return `${encodedPayload}.${signature}`
}

const verifyToken = (token) => {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null

  const [encodedPayload, signature] = token.split('.')
  const expectedSignature = crypto.createHmac('sha256', getSecret()).update(encodedPayload).digest('base64url')

  if (signature !== expectedSignature) return null

  try {
    return JSON.parse(base64UrlDecode(encodedPayload))
  } catch (_error) {
    return null
  }
}

const parseCookies = (cookieHeader = '') =>
  cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const separatorIndex = part.indexOf('=')
      if (separatorIndex === -1) return acc
      const key = part.slice(0, separatorIndex)
      const value = decodeURIComponent(part.slice(separatorIndex + 1))
      acc[key] = value
      return acc
    }, {})

const getAuthPayloadFromRequest = (req, cookieName = COOKIE_NAME) => {
  const cookies = parseCookies(req.headers.cookie || '')
  return verifyToken(cookies[cookieName])
}

const buildCookie = (cookieName, token) =>
  `${cookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`

const buildClearCookie = (cookieName) =>
  `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`

const buildAuthCookie = (token) => buildCookie(COOKIE_NAME, token)
const buildAdminAuthCookie = (token) => buildCookie(ADMIN_COOKIE_NAME, token)

const buildClearAuthCookie = () => buildClearCookie(COOKIE_NAME)
const buildClearAdminAuthCookie = () => buildClearCookie(ADMIN_COOKIE_NAME)

module.exports = {
  COOKIE_NAME,
  ADMIN_COOKIE_NAME,
  signToken,
  verifyToken,
  parseCookies,
  getAuthPayloadFromRequest,
  buildCookie,
  buildClearCookie,
  buildAuthCookie,
  buildAdminAuthCookie,
  buildClearAuthCookie,
  buildClearAdminAuthCookie,
}
