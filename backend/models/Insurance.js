const mongoose = require('mongoose')

const InsuranceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Policy Information
  policyNumber: {
    type: String,
    trim: true,
    uppercase: true
  },

  policyHolderName: {
    type: String,
    trim: true
  },

  mobileNumber: {
    type: String,
    trim: true
  },

  // Vehicle Information
  vehicleNumber: {
    type: String,
    ref: 'VehicleRegistration',
    required: true,
    trim: true,
    uppercase: true,
  },


  validFrom: {
    type: String,
    required: true
  },
  validTo: {
    type: String,
    required: true
  },

  issueDate: {
    type: String
  },

  // Renewal status - set to true when this insurance has been renewed
  isRenewed: {
    type: Boolean,
    default: false
  },

  // Insurance Document
  insuranceDocument: {
    type: String,
    trim: true
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

  feeBreakup: [
    {
      name: {
        type: String,
        trim: true
      },
      amount: {
        type: Number,
        default: 0
      }
    }
  ],

  // Additional Information
  remarks: {
    type: String,
    trim: true
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
  timestamps: true // Automatically adds createdAt and updatedAt fields
})



const Insurance = mongoose.model('Insurance', InsuranceSchema)

module.exports = Insurance




