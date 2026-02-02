const express = require("express");
const router = express.Router();
//DB아직 안쓰므로 주석
// const User = require("../models/user");

// 서버연결확인용
router.get("/ping", (req, res) => {
  return res.json({ ok: true, message: "auth route alive" });
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { loginId, password } = req.body;

  if (!loginId || !password) {
    return res.status(400).json({ ok: false, error: "loginId와 password가 필요합니다." });
  }

  /*
  try {
    const user = await User.findOne({ loginId });

    // 아이디 확인
    if (!user) {
      return res.status(401).json({ ok: false, error: "해당하는 ID가 없습니다." });
    }

    // 비밀번호 확인 (일단은 '평문' 비교로 빠르게 완성)
    // 네 DB가 해시를 쓰고 있으면 여기 bcrypt.compare로 바꿔야 함
    if (user.password !== password) {
      return res.status(401).json({ ok: false, error: "비밀번호가 올바르지 않습니다." });
    }

    // 성공 응답: role 내려주기 (프론트가 role 보고 라우팅)
    return res.json({
      ok: true,
      data: {
        role: user.role || "mentor",
        username: user.username || user.loginId
      }
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ ok: false, error: "서버 오류가 발생했습니다." });
  }
}); */

  return res.status(501).json({ok:false, error: "DB가 아직 준비되지 않음(서버연결OK)"});
});

module.exports = router;
