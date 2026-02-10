const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    menteeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // UI에서 쓰는 날짜키(YYYY-MM-DD). 멘티 dailyComment/studyTime과 동일 타입
    date: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true },
);

feedbackSchema.index({ mentorId: 1, menteeId: 1, date: 1, createdAt: -1 });

module.exports = mongoose.model('Feedback', feedbackSchema);

