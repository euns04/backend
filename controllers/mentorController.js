const mongoose = require('mongoose');
const User = require('../models/user');
const Todo = require('../models/todo');
const Feedback = require('../models/feedback');
const TodoDetail = require('../models/todoDetail');

function parseYmdOrThrow(v, fieldName) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const err = new Error(`${fieldName} must be YYYY-MM-DD`);
    err.statusCode = 400;
    throw err;
  }
  return v;
}

function ymdToRange(ymd) {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  const start = new Date(d);
  const end = new Date(d);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
}

async function assertMenteeOwnedByMentor({ mentorId, menteeId }) {
  if (!mongoose.isValidObjectId(menteeId)) {
    const err = new Error('menteeId invalid');
    err.statusCode = 400;
    throw err;
  }

  const mentee = await User.findOne({
    _id: menteeId,
    role: 'mentee',
    mentorId,
  })
    .select('_id loginId username role mentorId')
    .lean();

  if (!mentee) {
    const err = new Error('담당 멘티가 아니거나 멘티가 아닙니다.');
    err.statusCode = 403;
    throw err;
  }

  return mentee;
}

exports.getMyMentees = async (req, res) => {
  const mentorId = req.session?.userId;
  if (!mentorId) return res.status(401).json({ ok: false, error: '로그인이 필요합니다.' });

  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ ok: false, error: 'DB 연결이 되어있지 않습니다.' });
    }

    const mentees = await User.find({ role: 'mentee', mentorId })
      .select('loginId username mentorId')
      .sort({ username: 1, _id: 1 })
      .lean();

    return res.json({
      ok: true,
      data: (mentees || []).map((m) => ({
        id: String(m._id),
        loginId: m.loginId,
        username: m.username,
      })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: '서버 오류' });
  }
};

exports.getMenteeOverview = async (req, res) => {
  const mentorId = req.session?.userId;
  const { menteeId } = req.params;
  const { start, end } = req.query; // YYYY-MM-DD

  if (!mentorId) return res.status(401).json({ ok: false, error: '로그인이 필요합니다.' });

  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ ok: false, error: 'DB 연결이 되어있지 않습니다.' });
    }

    const mentee = await assertMenteeOwnedByMentor({ mentorId, menteeId });

    // 기본: start/end 없으면 오늘 하루
    const startYmd = start ? parseYmdOrThrow(start, 'start') : null;
    const endYmd = end ? parseYmdOrThrow(end, 'end') : null;

    let todoQuery = { userId: mentee._id };
    if (startYmd && endYmd) {
      const { start: s } = ymdToRange(startYmd);
      const { end: e } = ymdToRange(endYmd);
      todoQuery = { ...todoQuery, date: { $gte: s, $lte: e } };
    }

    const todos = await Todo.find(todoQuery)
      .select('title date category deletable isDone')
      .sort({ date: 1, _id: 1 })
      .lean();

    const feedback = await Feedback.find({ menteeId: mentee._id, mentorId })
      .select('date title body createdAt')
      .sort({ createdAt: -1, _id: -1 })
      .limit(200)
      .lean();

    return res.json({
      ok: true,
      data: {
        mentee: {
          id: String(mentee._id),
          loginId: mentee.loginId,
          username: mentee.username,
        },
        todos: (todos || []).map((t) => ({
          id: String(t._id),
          title: t.title,
          date: t.date,
          category: t.category,
          deletable: t.deletable,
          isDone: t.isDone,
        })),
        feedback: (feedback || []).map((f) => ({
          id: String(f._id),
          date: f.date,
          title: f.title,
          body: f.body,
          createdAt: f.createdAt,
        })),
      },
    });
  } catch (err) {
    const status = err?.statusCode || 500;
    const msg =
      status === 500 ? '서버 오류' : (err?.message || '요청 처리 실패');
    if (status === 500) console.error(err);
    return res.status(status).json({ ok: false, error: msg });
  }
};

exports.assignTodoToMentee = async (req, res) => {
  const mentorId = req.session?.userId;
  const { menteeId } = req.params;
  const { title, date, subject, category, detail, mentorDesc } = req.body;

  if (!mentorId) return res.status(401).json({ ok: false, error: '로그인이 필요합니다.' });

  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ ok: false, error: 'DB 연결이 되어있지 않습니다.' });
    }

    await assertMenteeOwnedByMentor({ mentorId, menteeId });

    const cleanTitle = String(title || '').trim();
    if (!cleanTitle) return res.status(400).json({ ok: false, error: 'title 필수' });
    const dateYmd = parseYmdOrThrow(String(date || ''), 'date');
    const cat = String(category || subject || 'uncategorized').trim() || 'uncategorized';

    // Todo.date는 Date 타입이라 ymd를 Date로 변환(로컬 타임존 영향 줄이려 UTC 사용)
    const todoDate = new Date(`${dateYmd}T00:00:00.000Z`);

    const todo = await Todo.create({
      userId: menteeId,
      title: cleanTitle,
      date: todoDate,
      category: cat,
      deletable: false, // 멘토가 부여한 과제는 멘티 삭제 불가
      isDone: false,
    });

    // ✅ 과제 세부 내용(설명) 저장: TodoDetail에 upsert
    const descRaw = typeof mentorDesc === 'string' ? mentorDesc : (typeof detail === 'string' ? detail : '');
    const desc = String(descRaw || '').trim();
    if (desc) {
      await TodoDetail.updateOne(
        { todoId: todo._id },
        { $set: { mentorDesc: desc } },
        { upsert: true },
      );
    }

    return res.json({
      ok: true,
      data: {
        id: String(todo._id),
        title: todo.title,
        date: todo.date,
        category: todo.category,
        deletable: todo.deletable,
        isDone: todo.isDone,
      },
    });
  } catch (err) {
    const status = err?.statusCode || 500;
    const msg =
      status === 500 ? '서버 오류' : (err?.message || '요청 처리 실패');
    if (status === 500) console.error(err);
    return res.status(status).json({ ok: false, error: msg });
  }
};

exports.addFeedback = async (req, res) => {
  const mentorId = req.session?.userId;
  const { menteeId } = req.params;
  const { date, title, body } = req.body;

  if (!mentorId) return res.status(401).json({ ok: false, error: '로그인이 필요합니다.' });

  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ ok: false, error: 'DB 연결이 되어있지 않습니다.' });
    }

    await assertMenteeOwnedByMentor({ mentorId, menteeId });

    const dateYmd = parseYmdOrThrow(String(date || ''), 'date');
    const t = String(title || '').trim();
    const b = String(body || '').trim();
    if (!t || !b) return res.status(400).json({ ok: false, error: 'title/body 필수' });

    const fb = await Feedback.create({
      mentorId,
      menteeId,
      date: dateYmd,
      title: t,
      body: b,
    });

    return res.json({
      ok: true,
      data: {
        id: String(fb._id),
        date: fb.date,
        title: fb.title,
        body: fb.body,
        createdAt: fb.createdAt,
      },
    });
  } catch (err) {
    const status = err?.statusCode || 500;
    const msg =
      status === 500 ? '서버 오류' : (err?.message || '요청 처리 실패');
    if (status === 500) console.error(err);
    return res.status(status).json({ ok: false, error: msg });
  }
};

exports.updateFeedback = async (req, res) => {
  const mentorId = req.session?.userId;
  const { feedbackId } = req.params;
  const { title, body } = req.body;

  if (!mentorId) return res.status(401).json({ ok: false, error: '로그인이 필요합니다.' });

  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ ok: false, error: 'DB 연결이 되어있지 않습니다.' });
    }
    if (!mongoose.isValidObjectId(feedbackId)) {
      return res.status(400).json({ ok: false, error: 'feedbackId invalid' });
    }

    const t = String(title || '').trim();
    const b = String(body || '').trim();
    if (!t || !b) return res.status(400).json({ ok: false, error: 'title/body 필수' });

    const updated = await Feedback.findOneAndUpdate(
      { _id: feedbackId, mentorId },
      { $set: { title: t, body: b } },
      { new: true },
    )
      .select('date title body createdAt')
      .lean();

    if (!updated) return res.status(404).json({ ok: false, error: '피드백이 없습니다.' });

    return res.json({
      ok: true,
      data: {
        id: String(updated._id),
        date: updated.date,
        title: updated.title,
        body: updated.body,
        createdAt: updated.createdAt,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: '서버 오류' });
  }
};

exports.deleteFeedback = async (req, res) => {
  const mentorId = req.session?.userId;
  const { feedbackId } = req.params;

  if (!mentorId) return res.status(401).json({ ok: false, error: '로그인이 필요합니다.' });

  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ ok: false, error: 'DB 연결이 되어있지 않습니다.' });
    }
    if (!mongoose.isValidObjectId(feedbackId)) {
      return res.status(400).json({ ok: false, error: 'feedbackId invalid' });
    }

    const out = await Feedback.deleteOne({ _id: feedbackId, mentorId });
    if (!out?.deletedCount) return res.status(404).json({ ok: false, error: '피드백이 없습니다.' });

    return res.json({ ok: true, data: { id: String(feedbackId) } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: '서버 오류' });
  }
};

