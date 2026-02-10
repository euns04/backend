const app = require("./app");
const mongoose = require('mongoose');
const Todo = require('./models/todo');
const Reminder = require('./models/reminder');
const { sendToUser } = require('./sseHub');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

const CHECK_INTERVAL = 1000 * 5; // 5초 (해커톤에 충분)

async function checkDueReminders() {
  // mongoose 연결이 안 된 상태면 조용히 스킵 (프로세스가 죽지 않게)
  if (mongoose.connection.readyState !== 1) return;

  const now = new Date();

  const dueReminders = await Reminder.find({
    isSent: false,
    at: { $lte: now },
  }).limit(100);

  for (const r of dueReminders) {
    const todo = await Todo.findOne({
      _id: r.todoId,
      userId: r.userId,
    })
      .select('title isDone')
      .lean();

    // todo가 없거나 이미 완료면 reminder만 sent 처리
    if (!todo || todo.isDone) {
      await Reminder.updateOne({ _id: r._id }, { $set: { isSent: true } });
      continue;
    }

    // SSE 구독자에게 알림 푸시 (/sse/subscribe 연결)
    sendToUser(String(r.userId), {
      type: 'REMINDER',
      todoId: String(r.todoId),
      title: todo.title,
      at: r.at,
    });

    await Reminder.updateOne({ _id: r._id }, { $set: { isSent: true } });
  }
}

// IMPORTANT: async setInterval 콜백의 reject가 프로세스를 죽일 수 있어서
// 항상 catch로 흡수해서 nodemon이 종료되지 않게 한다.
setInterval(() => {
  checkDueReminders().catch((err) => {
    console.error('Reminder checker error:', err);
  });
}, CHECK_INTERVAL);