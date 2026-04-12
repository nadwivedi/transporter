const mongoose = require('mongoose')

const whatsAppSessionSchema = new mongoose.Schema(
  {
    sessionKey: {
      type: String,
      required: true,
      unique: true,
      default: 'primary',
    },
    status: {
      type: String,
      enum: ['new', 'initializing', 'qr_ready', 'authenticated', 'disconnected', 'auth_failure'],
      default: 'new',
    },
    qrCodeDataUrl: {
      type: String,
      default: null,
    },
    phoneNumber: {
      type: String,
      default: null,
    },
    lastConnectedAt: {
      type: Date,
      default: null,
    },
    lastError: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('WhatsAppSession', whatsAppSessionSchema)
