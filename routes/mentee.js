const express = require('express');
const router = express.Router();
const menteeController = require('../controllers/menteeController');
const {requireLogin, requireRole} = require('../middlewares/loginMiddleware');

router.get(
    '/dashboard',
    requireLogin,
    requireRole('mentee'),
    menteeController.getDashboard
)

router.post(
    '/comment',
    requireLogin,
    requireRole('mentee'),
    menteeController.saveDailyComment
)

router.post(
    '/todos',
    requireLogin,
    requireRole('mentee'),
    menteeController.addTodo
)

router.post(
    '/studytime',
    requireLogin,
    requireRole('mentee'),
    menteeController.saveStudyTime
)

router.delete(
    '/todos/:id',
    requireLogin,
    requireRole('mentee'),
    menteeController.deleteTodo
)

module.exports = router;