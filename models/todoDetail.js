const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    mimeType: { type: String, default: '' },
    size: { type: Number, default: 0 },
    diskPath: { type: String, required: true }, // backend 기준 상대/절대 경로
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const todoDetailSchema = new mongoose.Schema(
  {
    todoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Todo',
      required: true,
      unique: true,
      index: true,
    },

    // 멘토가 과제 등록 시 적는 "세부 내용"
    mentorDesc: { type: String, default: '' },

    // 멘티 오답노트/제출
    menteeNote: { type: String, default: '' },
    menteeFiles: { type: [fileSchema], default: [] },

    // 멘토 피드백
    mentorFeedback: { type: String, default: '' },
    mentorFiles: { type: [fileSchema], default: [] },
  },
  { timestamps: true },
);

module.exports = mongoose.model('TodoDetail', todoDetailSchema);

