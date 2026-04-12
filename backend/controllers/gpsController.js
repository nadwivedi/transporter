const Gps = require('../models/Gps')
const { createRecordController } = require('./recordControllerFactory')

module.exports = createRecordController({
  name: 'gps',
  label: 'GPS',
  Model: Gps,
  expiryField: 'validTo',
  requiredDateField: 'validFrom',
  expiringDays: 30,
  searchFields: ['vehicleNumber', 'ownerName', 'mobileNumber'],
  stringFields: ['vehicleNumber', 'ownerName', 'mobileNumber', 'validFrom', 'validTo', 'gpsDocument'],
  uppercaseFields: ['vehicleNumber'],
  numberFields: ['totalFee', 'paid', 'balance'],
  documentField: 'gpsDocument',
  documentDataField: 'gpsDocumentData',
  totalField: 'totalFee',
  paidField: 'paid',
  balanceField: 'balance',
})
