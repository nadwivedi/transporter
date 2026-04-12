const path = require('path')
const fs = require('fs/promises')
const QRCode = require('qrcode')
const { Client, LocalAuth } = require('whatsapp-web.js')
const WhatsAppSession = require('../models/WhatsAppSession')

class WhatsAppSessionManager {
  constructor() {
    this.client = null
    this.startingPromise = null
    this.sessionKey = 'primary'
  }

  async getSession() {
    let session = await WhatsAppSession.findOne({ sessionKey: this.sessionKey })
    if (!session) {
      session = await WhatsAppSession.create({ sessionKey: this.sessionKey })
    }
    return session
  }

  hasClient() {
    return Boolean(this.client)
  }

  async updateSession(update) {
    return WhatsAppSession.findOneAndUpdate(
      { sessionKey: this.sessionKey },
      { $set: update },
      { upsert: true, returnDocument: 'after' }
    )
  }

  getAuthDir() {
    return process.env.WHATSAPP_AUTH_DIR || path.join(process.cwd(), '.wwebjs_auth')
  }

  isRecoverableProtocolError(error) {
    const message = String(error?.message || '')
    return (
      message.includes('Execution context was destroyed') ||
      message.includes('Cannot find context with specified id') ||
      message.includes('Target closed') ||
      message.includes('Session closed')
    )
  }

  async startSession() {
    if (this.startingPromise) {
      return this.startingPromise
    }

    this.startingPromise = this.startSessionInternal()
    try {
      return await this.startingPromise
    } finally {
      this.startingPromise = null
    }
  }

  async startSessionInternal() {
    const session = await this.getSession()

    if (this.client) {
      try {
        await this.client.getState()
        return session
      } catch (_error) {
        await this.stopSession()
      }
    }

    const authDir = this.getAuthDir()

    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'transport-admin',
        dataPath: authDir,
      }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      },
    })

    client.on('qr', async (qr) => {
      const qrCodeDataUrl = await QRCode.toDataURL(qr, { width: 300 })
      await this.updateSession({
        status: 'qr_ready',
        qrCodeDataUrl,
        lastError: null,
      })
    })

    client.on('authenticated', async () => {
      await this.updateSession({
        status: 'initializing',
        lastError: null,
      })
    })

    client.on('ready', async () => {
      await this.updateSession({
        status: 'authenticated',
        phoneNumber: client.info?.wid?.user || null,
        lastConnectedAt: new Date(),
        qrCodeDataUrl: null,
        lastError: null,
      })
    })

    client.on('auth_failure', async (message) => {
      await this.updateSession({
        status: 'auth_failure',
        lastError: message || 'Authentication failure',
      })
    })

    client.on('disconnected', async (reason) => {
      this.client = null
      await this.updateSession({
        status: 'disconnected',
        qrCodeDataUrl: null,
        lastError: typeof reason === 'string' ? reason : 'Disconnected from WhatsApp Web',
      })
    })

    this.client = client
    await this.updateSession({ status: 'initializing', lastError: null })
    await client.initialize()
    return this.getSession()
  }

  async stopSession() {
    if (this.client) {
      try {
        await this.client.destroy()
      } catch (_error) {
        // ignore destroy errors
      }
      this.client = null
    }

    await this.updateSession({
      status: 'disconnected',
      qrCodeDataUrl: null,
      lastError: null,
    })

    return this.getSession()
  }

  async resetSession() {
    await this.stopSession()

    try {
      await fs.rm(this.getAuthDir(), { recursive: true, force: true })
    } catch (_error) {
      // ignore auth dir cleanup errors
    }

    await this.updateSession({
      status: 'new',
      qrCodeDataUrl: null,
      phoneNumber: null,
      lastConnectedAt: null,
      lastError: null,
    })

    return this.getSession()
  }

  normalizeRecipient(recipient) {
    return String(recipient || '').replace(/[^\d]/g, '')
  }

  async resolveRecipientChatId(recipient) {
    if (!this.client) {
      throw new Error('WhatsApp session is not active')
    }

    const normalized = this.normalizeRecipient(recipient)
    if (!normalized) {
      throw new Error('Recipient number is invalid')
    }

    const candidates = [normalized, `+${normalized}`]
    for (const candidate of candidates) {
      try {
        const numberId = await this.client.getNumberId(candidate)
        if (numberId?._serialized) {
          return numberId._serialized
        }
      } catch (_error) {
        // continue
      }
    }

    return `${normalized}@c.us`
  }

  async sendTextMessage(recipient, text) {
    if (!this.client) {
      throw new Error('WhatsApp session is not active')
    }

    try {
      const chatId = await this.resolveRecipientChatId(recipient)
      const result = await this.client.sendMessage(chatId, text)
      return result?.id?._serialized || null
    } catch (error) {
      if (this.isRecoverableProtocolError(error)) {
        await this.stopSession()
        throw new Error('WhatsApp session reset. Please reconnect by scanning QR again.')
      }
      throw error
    }
  }

  async restoreSession() {
    const session = await this.getSession()
    if (session.status === 'authenticated' || session.status === 'initializing' || session.status === 'qr_ready') {
      try {
        await this.startSession()
      } catch (error) {
        await this.updateSession({
          status: 'disconnected',
          lastError: `Restore failed: ${error.message}`,
        })
      }
    }
  }
}

module.exports = new WhatsAppSessionManager()
