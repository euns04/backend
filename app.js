const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const menteeRoutes = require('./routes/mentee');

const app = express();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/compiling-project';
mongoose.connect(mongoUri).catch(() => {
  console.warn('MongoDB 연결 실패 - 로그인 DB 조회는 동작하지 않습니다.');
});

const secret = process.env.COOKIE_SECRET || 'dev-secret-change-in-production';

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser(secret));

app.use(session({
  secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.get('/', (req, res) => {
  if (!req.session.num) req.session.num = 1;
  else req.session.num += 1;
  res.send(String(req.session.num));
})

// 예: 로그인한 사람만 접근 가능한 라우트 (미들웨어 사용)
const { requireLogin, requireRole } = require('./middlewares/loginMiddleware');
app.get('/api/mentomentee', requireLogin, (req, res) => {
  res.json({ ok: true, data: req.session.user });
});
// app.get('/api/mentor-only', requireLogin, requireRole('mentor'), (req, res) => { ... });

app.use('/api/auth', require('./routes/login'));
app.use('/api/mentormentee', menteeRoutes);

console.log('menteeRoutes loaded:', !!menteeRoutes);

module.exports = app;