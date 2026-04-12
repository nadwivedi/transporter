const Insurance = require('../models/Insurance')
const { createRecordController } = require('./recordControllerFactory')

module.exports = createRecordController({
  name: 'insurance',
  label: 'Insurance',
  Model: Insurance,
  expiryField: 'validTo',
  requiredDateField: 'validFrom',
  expiringDays: 30,
  searchFields: ['vehicleNumber', 'policyNumber', 'policyHolderName', 'mobileNumber'],
  stringFields: ['vehicleNumber', 'policyNumber', 'policyHolderName', 'mobileNumber', 'validFrom', 'validTo', 'issueDate', 'insuranceDocument', 'remarks'],
  uppercaseFields: ['vehicleNumber', 'policyNumber'],
  numberFields: ['totalFee', 'paid', 'balance'],
  arrayField: 'feeBreakup',
  documentField: 'insuranceDocument',
  documentDataField: 'insuranceDocumentData',
  totalField: 'totalFee',
  paidField: 'paid',
  balanceField: 'balance',
})
