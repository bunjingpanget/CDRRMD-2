const express = require('express');
const auth = require('../middleware/auth');
const {
  listAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
} = require('../controllers/adminController');

const router = express.Router();

router.get('/', auth, listAdmins);
router.post('/', auth, createAdmin);
router.put('/:id', auth, updateAdmin);
router.delete('/:id', auth, deleteAdmin);

module.exports = router;
