const express = require('express');
const router = express.Router();
const menteeController = require('../controllers/menteeController');
const {requireLogin, requireRole} = require('../middlewares/loginMiddleware');

router.get(
    '/dashboard',
    requireLogin,
    requireRole,
    menteeController.getDashboard
)

router.post(
    '/todos',
    requireLogin,
    requireRole,
    menteeController.addTodo
)

module.exports = router;