const express = require('express');
const router = express.Router();
const mentorController = require('../controllers/mentorController');
const { requireLogin, requireRole } = require('../middlewares/loginMiddleware');

// 멘토 전용
router.get('/mentees', requireLogin, requireRole('mentor'), mentorController.getMyMentees);

router.get(
  '/mentees/:menteeId/overview',
  requireLogin,
  requireRole('mentor'),
  mentorController.getMenteeOverview,
);

router.post(
  '/mentees/:menteeId/todos',
  requireLogin,
  requireRole('mentor'),
  mentorController.assignTodoToMentee,
);

router.post(
  '/mentees/:menteeId/feedback',
  requireLogin,
  requireRole('mentor'),
  mentorController.addFeedback,
);

router.patch(
  '/feedback/:feedbackId',
  requireLogin,
  requireRole('mentor'),
  mentorController.updateFeedback,
);

router.delete(
  '/feedback/:feedbackId',
  requireLogin,
  requireRole('mentor'),
  mentorController.deleteFeedback,
);

module.exports = router;

