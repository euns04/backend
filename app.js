require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { applyDnsServers } = require('./dnsConfig');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const menteeRoutes = require('./routes/mentee');
const mentorRoutes = require('./routes/mentor');
const todoDetailRoutes = require('./routes/todoDetail');
const { MONGODB_URI, COOKIE_SECRET, FRONTEND_ORIGIN } = require('./env');

const app = express();

applyDnsServers();

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

const mongoUri = MONGODB_URI;
mongoose
  .connect(mongoUri)
  .then(() => {
    console.log('MongoDB 연결 성공');
  })
  .catch((err) => {
    console.warn('MongoDB 연결 실패 - DB 조회/저장이 동작하지 않습니다.');
    console.warn(err?.message || err);
  });

const secret = COOKIE_SECRET;

const allowedOrigins = (process.env.FRONTEND_ORIGINS || FRONTEND_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.length === 0) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS 차단: ${origin}`));
  },
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
    sameSite: process.env.COOKIE_SAMESITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax'),
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

app.use('/api/auth', require('./routes/login'));
app.use('/api/mentormentee', menteeRoutes);
app.use('/api/mentormentee/mentor', mentorRoutes);
app.use('/api/todos', todoDetailRoutes);
app.use('/sse', require('./routes/sse'));

console.log('menteeRoutes loaded:', !!menteeRoutes);

module.exports = app;