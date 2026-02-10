const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middlewares/loginMiddleware');
const todoDetailController = require('../controllers/todoDetailController');

// 공통: 멘티(본인 todo) / 멘토(담당 멘티 todo) 모두 조회 가능
router.get('/:todoId/detail', requireLogin, todoDetailController.getTodoDetail);

// 멘티 전용 제출
router.patch('/:todoId/detail/mentee-note', requireLogin, todoDetailController.updateMenteeNote);
router.post(
  '/:todoId/detail/mentee-files',
  requireLogin,
  todoDetailController.uploadMenteeFilesMiddleware,
  todoDetailController.uploadMenteeFiles,
);
router.delete('/:todoId/detail/mentee-files/:fileId', requireLogin, todoDetailController.deleteMenteeFile);

// 멘토 전용 피드백
router.patch('/:todoId/detail/mentor-feedback', requireLogin, todoDetailController.updateMentorFeedback);
router.post(
  '/:todoId/detail/mentor-files',
  requireLogin,
  todoDetailController.uploadMentorFilesMiddleware,
  todoDetailController.uploadMentorFiles,
);
router.delete('/:todoId/detail/mentor-files/:fileId', requireLogin, todoDetailController.deleteMentorFile);

// 파일 다운로드/미리보기(권한 체크 포함)
router.get('/:todoId/detail/files/:fileId', requireLogin, todoDetailController.downloadDetailFile);

module.exports = router;

