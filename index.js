const express = require('express');
const cors = require("cors");
const app = express();
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  credentials: true
}));


// JSON 요청 받기
app.use(express.json());

// 서버 테스트용
app.get('/', (req, res) => {
  res.send('서버 살아있음');
});


// 로그인 API (README 스펙 그대로)
app.post('/api/auth/login', (req, res) => {
  const { loginId, password } = req.body;

  // 임시 테스트 계정 (공모전용)
  if (loginId === '1' && password === '1234') {
    return res.json({
      success: true,
      userid: 1,
      role: 'mentor'
    });
  }

  if ((loginId === '2' || loginId === '3') && password === '1234') {
    return res.json({
      success: true,
      loginId: Number(loginId),
      role: 'student'
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Invalid credentials'
  });
});

// 서버 실행
app.listen(5000, () => {
  console.log('백엔드 실행중: http://localhost:5000');
});

///간단확인용..
app.get('/health', (req, res) => {
  res.send('ok');
});

