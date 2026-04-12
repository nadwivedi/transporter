const mongoose = require('mongoose')

const gpsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  vehicleNumber: {
    type: String,
    ref: 'VehicleRegistration',
    required: true,
    uppercase: true,
    trim: true,
  },
  ownerName: {
    type: String,
    trim: true
  },
  mobileNumber: {
    type: String,
    trim: true
  },
  gpsDocument: {
    type: String,
    trim: true
  },
  validFrom: {
    type: String,
    required: true
  },
  validTo: {
    type: String,
    required: true
  },
  totalFee: {
    type: Number,
    default: 0
  },
  paid: {
    type: Number,
    default: 0
  },
  balance: {
    type: Number,
    default: 0
  },

  // Renewal status - set to true when this GPS has been renewed
  isRenewed: {
    type: Boolean,
    default: false
  },

  // WhatsApp message tracking
  whatsappMessageCount: {
    type: Number,
    default: 0
  },
  lastWhatsappSentAt: {
    type: Date
  },
  lastWhatsappReminderFor: {
    type: String,
    trim: true
  },
  whatsappReminderStages: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
})

// Optimized indexes
// Index 1: vehicleNumber (for searching vehicle and getting all its GPS records)
gpsSchema.index({ vehicleNumber: 1 })

// Index 2: validTo (for filtering expired/expiring_soon/active status)
gpsSchema.index({ validTo: 1 })


// Index 3: createdAt (for default sorting - newest first)
gpsSchema.index({ createdAt: -1 })

const Gps = mongoose.model('Gps', gpsSchema)

module.exports = Gps




