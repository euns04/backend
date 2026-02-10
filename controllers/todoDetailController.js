const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const multer = require('multer');

const Todo = require('../models/todo');
const User = require('../models/user');
const TodoDetail = require('../models/todoDetail');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

async function getTodoOrThrow(todoId) {
  if (!mongoose.isValidObjectId(todoId)) {
    const err = new Error('todoId invalid');
    err.statusCode = 400;
    throw err;
  }

  const todo = await Todo.findById(todoId).select('userId title date category deletable isDone').lean();
  if (!todo) {
    const err = new Error('todo not found');
    err.statusCode = 404;
    throw err;
  }
  return todo;
}

async function assertAccess({ sessionUserId, sessionRole, todo }) {
  // mentee: todo.userId === me
  if (sessionRole === 'mentee') {
    if (String(todo.userId) !== String(sessionUserId)) {
      const err = new Error('권한이 없습니다.');
      err.statusCode = 403;
      throw err;
    }
    return { mode: 'mentee', menteeId: String(todo.userId) };
  }

  // mentor: todo.userId (mentee)의 mentorId === me
  if (sessionRole === 'mentor') {
    const mentee = await User.findById(todo.userId).select('mentorId role').lean();
    if (!mentee || mentee.role !== 'mentee' || String(mentee.mentorId) !== String(sessionUserId)) {
      const err = new Error('권한이 없습니다.');
      err.statusCode = 403;
      throw err;
    }
    return { mode: 'mentor', menteeId: String(todo.userId) };
  }

  const err = new Error('권한이 없습니다.');
  err.statusCode = 403;
  throw err;
}

function toFileDto({ todoId, file }) {
  const fileId = String(file._id);
  const base = `/api/todos/${todoId}/detail/files/${fileId}`;
  return {
    id: fileId,
    name: file.originalName,
    type: file.mimeType,
    size: file.size,
    uploadedAt: file.uploadedAt,
    url: base,
    downloadUrl: `${base}?download=1`,
  };
}

async function getOrCreateDetail(todoId) {
  let detail = await TodoDetail.findOne({ todoId });
  if (!detail) {
    detail = await TodoDetail.create({ todoId });
  }
  return detail;
}

exports.getTodoDetail = async (req, res) => {
  const sessionUserId = req.session?.userId;
  const sessionRole = req.session?.role ?? req.session?.user?.role;
  const { todoId } = req.params;
  if (!sessionUserId) return res.status(401).json({ ok: false, error: '로그인이 필요합니다.' });

  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ ok: false, error: 'DB 연결이 되어있지 않습니다.' });
    }

    const todo = await getTodoOrThrow(todoId);
    await assertAccess({ sessionUserId, sessionRole, todo });

    const detail = await getOrCreateDetail(todo._id);

    return res.json({
      ok: true,
      data: {
        todoId: String(todo._id),
        mentorDesc: detail.mentorDesc || '',
        menteeNote: detail.menteeNote || '',
        mentorFeedback: detail.mentorFeedback || '',
        menteeFiles: (detail.menteeFiles || []).map((f) => toFileDto({ todoId: String(todo._id), file: f })),
        mentorFiles: (detail.mentorFiles || []).map((f) => toFileDto({ todoId: String(todo._id), file: f })),
      },
    });
  } catch (err) {
    const status = err?.statusCode || 500;
    if (status === 500) console.error(err);
    return res.status(status).json({ ok: false, error: err?.message || '서버 오류' });
  }
};

exports.updateMenteeNote = async (req, res) => {
  const sessionUserId = req.session?.userId;
  const sessionRole = req.session?.role ?? req.session?.user?.role;
  const { todoId } = req.params;
  const { menteeNote } = req.body;
  if (!sessionUserId) return res.status(401).json({ ok: false, error: '로그인이 필요합니다.' });

  try {
    if (sessionRole !== 'mentee') return res.status(403).json({ ok: false, error: '권한이 없습니다.' });
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ ok: false, error: 'DB 연결이 되어있지 않습니다.' });
    }

    const todo = await getTodoOrThrow(todoId);
    await assertAccess({ sessionUserId, sessionRole, todo });

    const note = typeof menteeNote === 'string' ? menteeNote : '';
    const detail = await getOrCreateDetail(todo._id);
    detail.menteeNote = note;
    await detail.save();

    return res.json({ ok: true, data: { menteeNote: detail.menteeNote } });
  } catch (err) {
    const status = err?.statusCode || 500;
    if (status === 500) console.error(err);
    return res.status(status).json({ ok: false, error: err?.message || '서버 오류' });
  }
};

exports.updateMentorFeedback = async (req, res) => {
  const sessionUserId = req.session?.userId;
  const sessionRole = req.session?.role ?? req.session?.user?.role;
  const { todoId } = req.params;
  const { mentorFeedback } = req.body;
  if (!sessionUserId) return res.status(401).json({ ok: false, error: '로그인이 필요합니다.' });

  try {
    if (sessionRole !== 'mentor') return res.status(403).json({ ok: false, error: '권한이 없습니다.' });
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ ok: false, error: 'DB 연결이 되어있지 않습니다.' });
    }

    const todo = await getTodoOrThrow(todoId);
    await assertAccess({ sessionUserId, sessionRole, todo });

    const fb = typeof mentorFeedback === 'string' ? mentorFeedback : '';
    const detail = await getOrCreateDetail(todo._id);
    detail.mentorFeedback = fb;
    await detail.save();

    return res.json({ ok: true, data: { mentorFeedback: detail.mentorFeedback } });
  } catch (err) {
    const status = err?.statusCode || 500;
    if (status === 500) console.error(err);
    return res.status(status).json({ ok: false, error: err?.message || '서버 오류' });
  }
};

function makeUploader({ who }) {
  return multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const { todoId } = req.params;
        const dir = path.join(__dirname, '..', 'uploads', 'todo-details', String(todoId), who);
        ensureDir(dir);
        cb(null, dir);
      },
      filename: (req, file, cb) => {
        const safe = String(file.originalname || 'file').replace(/[^\w.\-()\[\] ]+/g, '_');
        cb(null, `${Date.now()}_${Math.random().toString(16).slice(2)}_${safe}`);
      },
    }),
    limits: {
      files: 10,
      fileSize: 15 * 1024 * 1024, // 15MB
    },
  });
}

exports.uploadMenteeFilesMiddleware = makeUploader({ who: 'mentee' }).array('files', 10);
exports.uploadMentorFilesMiddleware = makeUploader({ who: 'mentor' }).array('files', 10);

exports.uploadMenteeFiles = async (req, res) => {
  const sessionUserId = req.session?.userId;
  const sessionRole = req.session?.role ?? req.session?.user?.role;
  const { todoId } = req.params;
  if (!sessionUserId) return res.status(401).json({ ok: false, error: '로그인이 필요합니다.' });

  try {
    if (sessionRole !== 'mentee') return res.status(403).json({ ok: false, error: '권한이 없습니다.' });
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ ok: false, error: 'DB 연결이 되어있지 않습니다.' });
    }

    const todo = await getTodoOrThrow(todoId);
    await assertAccess({ sessionUserId, sessionRole, todo });

    const detail = await getOrCreateDetail(todo._id);
    const files = req.files || [];
    for (const f of files) {
      detail.menteeFiles.push({
        originalName: f.originalname,
        mimeType: f.mimetype,
        size: f.size,
        diskPath: f.path,
      });
    }
    await detail.save();

    const appended = files.length
      ? detail.menteeFiles.slice(-files.length).map((ff) => toFileDto({ todoId: String(todo._id), file: ff }))
      : [];
    return res.json({ ok: true, data: { files: appended } });
  } catch (err) {
    const status = err?.statusCode || 500;
    if (status === 500) console.error(err);
    return res.status(status).json({ ok: false, error: err?.message || '서버 오류' });
  }
};

exports.uploadMentorFiles = async (req, res) => {
  const sessionUserId = req.session?.userId;
  const sessionRole = req.session?.role ?? req.session?.user?.role;
  const { todoId } = req.params;
  if (!sessionUserId) return res.status(401).json({ ok: false, error: '로그인이 필요합니다.' });

  try {
    if (sessionRole !== 'mentor') return res.status(403).json({ ok: false, error: '권한이 없습니다.' });
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ ok: false, error: 'DB 연결이 되어있지 않습니다.' });
    }

    const todo = await getTodoOrThrow(todoId);
    await assertAccess({ sessionUserId, sessionRole, todo });

    const detail = await getOrCreateDetail(todo._id);
    const files = req.files || [];
    for (const f of files) {
      detail.mentorFiles.push({
        originalName: f.originalname,
        mimeType: f.mimetype,
        size: f.size,
        diskPath: f.path,
      });
    }
    await detail.save();

    const appended = files.length
      ? detail.mentorFiles.slice(-files.length).map((ff) => toFileDto({ todoId: String(todo._id), file: ff }))
      : [];
    return res.json({ ok: true, data: { files: appended } });
  } catch (err) {
    const status = err?.statusCode || 500;
    if (status === 500) console.error(err);
    return res.status(status).json({ ok: false, error: err?.message || '서버 오류' });
  }
};

async function deleteFileCommon({ req, res, who }) {
  const sessionUserId = req.session?.userId;
  const sessionRole = req.session?.role ?? req.session?.user?.role;
  const { todoId, fileId } = req.params;
  if (!sessionUserId) return res.status(401).json({ ok: false, error: '로그인이 필요합니다.' });

  try {
    if (sessionRole !== who) return res.status(403).json({ ok: false, error: '권한이 없습니다.' });
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ ok: false, error: 'DB 연결이 되어있지 않습니다.' });
    }

    const todo = await getTodoOrThrow(todoId);
    await assertAccess({ sessionUserId, sessionRole, todo });

    const detail = await getOrCreateDetail(todo._id);
    const key = who === 'mentee' ? 'menteeFiles' : 'mentorFiles';
    const arr = detail[key] || [];
    const idx = arr.findIndex((f) => String(f._id) === String(fileId));
    if (idx === -1) return res.status(404).json({ ok: false, error: 'file not found' });

    const [removed] = arr.splice(idx, 1);
    await detail.save();

    // 파일 삭제(best-effort)
    try {
      if (removed?.diskPath) fs.unlinkSync(removed.diskPath);
    } catch {}

    return res.json({ ok: true, data: { id: String(fileId) } });
  } catch (err) {
    const status = err?.statusCode || 500;
    if (status === 500) console.error(err);
    return res.status(status).json({ ok: false, error: err?.message || '서버 오류' });
  }
}

exports.deleteMenteeFile = (req, res) => deleteFileCommon({ req, res, who: 'mentee' });
exports.deleteMentorFile = (req, res) => deleteFileCommon({ req, res, who: 'mentor' });

exports.downloadDetailFile = async (req, res) => {
  const sessionUserId = req.session?.userId;
  const sessionRole = req.session?.role ?? req.session?.user?.role;
  const { todoId, fileId } = req.params;
  const download = String(req.query?.download || '') === '1';

  if (!sessionUserId) return res.status(401).end();

  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).end();
    }

    const todo = await getTodoOrThrow(todoId);
    await assertAccess({ sessionUserId, sessionRole, todo });

    const detail = await getOrCreateDetail(todo._id);
    const all = [...(detail.menteeFiles || []), ...(detail.mentorFiles || [])];
    const file = all.find((f) => String(f._id) === String(fileId));
    if (!file) return res.status(404).end();

    const abs = path.isAbsolute(file.diskPath)
      ? file.diskPath
      : path.join(__dirname, '..', file.diskPath);

    if (download) {
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(file.originalName)}"`,
      );
    } else {
      res.setHeader('Content-Disposition', 'inline');
    }
    if (file.mimeType) res.setHeader('Content-Type', file.mimeType);

    return res.sendFile(abs);
  } catch (err) {
    console.error(err);
    return res.status(500).end();
  }
};

