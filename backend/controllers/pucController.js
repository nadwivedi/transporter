const Puc = require('../models/Puc')
const { createRecordController } = require('./recordControllerFactory')

module.exports = createRecordController({
  name: 'puc',
  label: 'PUC',
  Model: Puc,
  expiryField: 'validTo',
  requiredDateField: 'validFrom',
  expiringDays: 30,
  searchFields: ['vehicleNumber', 'ownerName', 'mobileNumber'],
  stringFields: ['vehicleNumber', 'ownerName', 'mobileNumber', 'validFrom', 'validTo', 'pucDocument'],
  uppercaseFields: ['vehicleNumber'],
  numberFields: ['totalFee', 'paid', 'balance'],
  documentField: 'pucDocument',
  documentDataField: 'pucDocumentData',
  totalField: 'totalFee',
  paidField: 'paid',
  balanceField: 'balance',
})
