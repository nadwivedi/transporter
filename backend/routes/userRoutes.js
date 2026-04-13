const express = require('express')
const controller = require('../controllers/userController')
const { requireAdminAuth } = require('../middleware/adminAuth')

const router = express.Router()

router.get('/', requireAdminAuth, controller.listUsers)
router.post('/', requireAdminAuth, controller.createUser)
router.put('/:id', requireAdminAuth, controller.updateUser)

module.exports = router
