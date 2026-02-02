const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const User = require("../models/user");

// (선택) 연결 테스트용
router.get("/", (req, res) => {
  return res.json({ ok: true, message: "login route alive" });
});

router.post("/", async (req, res) => {
  const { loginId, password } = req.body;

  // 입력값 검증
  if (!loginId || !password) {
    return res.status(400).json({ ok: false, error: "loginId와 password가 필요합니다." });
  }

  try {
    const user = await User.findOne({ loginId });

    // 아이디 확인
    if (!user) {
      return res.status(401).json({ ok: false, error: "해당하는 ID가 없습니다." });
    }

    // 비밀번호 확인 (DB에 해시가 저장되어 있다는 전제)
    // user.password 또는 user.passwordHash 등 필드명은 네 모델에 맞춰야 함
    const hashed = user.password; // <-- 모델 필드명이 다르면 여기만 바꿔
    const isValid = await bcrypt.compare(password, hashed);

    if (!isValid) {
      return res.status(401).json({ ok: false, error: "비밀번호가 올바르지 않습니다." });
    }

    // 성공 응답: role 기반 라우팅을 위해 role 내려주기
    return res.json({
      ok: true,
      data: {
        role: user.role,       // user.role이 없다면 임시로 "mentor"로
        username: user.username || user.loginId
      }
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ ok: false, error: "서버 오류가 발생했습니다." });
  }
});

module.exports = router;
