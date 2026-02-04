const express = require('express');
const router = express.Router();
const menteeController = require('../controllers/menteeController');
const {requireLogin, requireMentee} = require('../middlewares/auth');

router.get(
    '/dashboard',
    requireLogin,
    requireMentee,
    menteeController.getDashboard
)

router.post(
    '/todos',
    requireLogin,
    requireMentee,
    menteeController.addTodo
)

module.exports = router;