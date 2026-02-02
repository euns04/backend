const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/compiling-project';
mongoose.connect(mongoUri).catch(() => {
  console.warn('MongoDB 연결 실패 - 로그인 DB 조회는 동작하지 않습니다.');
});

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/login'));

module.exports = app;