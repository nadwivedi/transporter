const mongoose = require('mongoose')

const whatsAppReminderLogSchema = new mongoose.Schema(
  {
    recordType: {
      type: String,
      required: true,
      trim: true,
    },
    recordId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    vehicleNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    mobileNumber: {
      type: String,
      trim: true,
    },
    expiryDate: {
      type: String,
      trim: true,
      required: true,
    },
    alertStage: {
      type: String,
      required: true,
      enum: ['within_30_days', 'before_2_days', 'before_1_day', 'on_expiry_day', 'after_7_days_expired'],
    },
    status: {
      type: String,
      required: true,
      enum: ['sent', 'failed'],
    },
    message: {
      type: String,
      trim: true,
    },
    error: {
      type: String,
      trim: true,
    },
    sentAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
)

whatsAppReminderLogSchema.index(
  { recordId: 1, recordType: 1, expiryDate: 1, alertStage: 1 },
  { unique: true }
)

module.exports = mongoose.model('WhatsAppReminderLog', whatsAppReminderLogSchema)
