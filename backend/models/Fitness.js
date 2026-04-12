const mongoose = require('mongoose')

const fitnessSchema = new mongoose.Schema({
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
  partyId: {
    type: String,
    trim: true
  },
  fitnessDocument: {
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
  feeBreakup: [{
    name: {
      type: String,
      trim: true
    },
    amount: {
      type: Number,
      default: 0
    }
  }],

  // Renewal status - set to true when this fitness has been renewed
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

// Optimized indexes for exact requirements:
// Optimized indexes for active fitness lookups

// Index 1: vehicleNumber (for searching vehicle and getting all its fitness records)
fitnessSchema.index({ vehicleNumber: 1 })

// Index 2: validTo (for filtering expired/expiring_soon/active status)
fitnessSchema.index({ validTo: 1 })


// Index 3: createdAt (for default sorting - newest first)
fitnessSchema.index({ createdAt: -1 })

const Fitness = mongoose.model('Fitness', fitnessSchema)

module.exports = Fitness




