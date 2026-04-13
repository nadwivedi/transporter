const crypto = require('crypto')

const COOKIE_NAME = 'transport_auth'
const ADMIN_COOKIE_NAME = 'transport_admin_auth'

const getSecret = () => process.env.AUTH_SECRET || 'transport-dev-secret'
const isProduction = () => process.env.NODE_ENV === 'production'
const getCookieDomain = (cookieName) => {
  if (cookieName === ADMIN_COOKIE_NAME && process.env.ADMIN_COOKIE_DOMAIN) {
    return process.env.ADMIN_COOKIE_DOMAIN
  }

  return process.env.COOKIE_DOMAIN || ''
}

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

const buildCookieAttributes = (maxAge, cookieName) => {
  const attributes = ['Path=/', 'HttpOnly', `Max-Age=${maxAge}`]
  const cookieDomain = getCookieDomain(cookieName)

  // Set SameSite=None and Secure to support cross-origin domains.
  // Modern browsers require this for cross-domain cookies to be attached.
  attributes.push('SameSite=None', 'Secure')

  if (cookieDomain) {
    attributes.push(`Domain=${cookieDomain}`)
  }

  return attributes.join('; ')
}

const buildCookie = (cookieName, token) =>
  `${cookieName}=${encodeURIComponent(token)}; ${buildCookieAttributes(7 * 24 * 60 * 60, cookieName)}`

const buildClearCookie = (cookieName) =>
  `${cookieName}=; ${buildCookieAttributes(0, cookieName)}`

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
