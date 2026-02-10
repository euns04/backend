const express = require('express');
const router = express.Router();
const User = require('../models/user');
const bcrypt = require('bcrypt');
const { loginControl } = require('../controllers/loginController');
const { requireLogin } = require('../middlewares/loginMiddleware');

router.get('/login', (req, res) => {
    if (req.session && (req.session.userId || req.session.user)) {
        const data = req.session.userId
            ? {
                userId: String(req.session.userId),
                loginId: req.session.loginId,
                username: req.session.username,
                role: req.session.role,
                themeId: req.session.themeId,
            }
            : req.session.user;

        return res.json({ ok: true, data });
    }
    return res.json({ ok: false, error: '로그인되지 않음' });
});

router.post('/login', async (req, res) => {
    const { loginId, password } = req.body;

    try {
        const user = await User.findOne({ loginId });
        // id 검사
        if (!user) {
            return res.json({ ok: false, error: '해당하는 ID가 없습니다.' });
        }
        // 비밀번호 검사
        if (!bcrypt.compareSync(password, user.password)) {
            return res.json({ ok: false, error: '비밀번호가 틀렸습니다.' });
        }

        return loginControl(req, res, user);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ ok: false, error: '서버 오류가 발생했습니다.' });
    }
});

router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ ok: false, error: '로그아웃 처리 실패' });
        }
        res.clearCookie('connect.sid');
        return res.json({ ok: true });
    });
});

// ✅ 테마 저장 (DB + 세션)
router.patch('/preferences/theme', requireLogin, async (req, res) => {
    const userId = req.session?.userId;
    const { themeId } = req.body || {};

    if (!userId) {
        return res.status(401).json({ ok: false, error: '로그인이 필요합니다.' });
    }
    if (typeof themeId !== 'string' || themeId.trim().length === 0) {
        return res.status(400).json({ ok: false, error: 'themeId(string) 필수' });
    }

    const next = themeId.trim();

    try {
        await User.updateOne({ _id: userId }, { $set: { themeId: next } });
        req.session.themeId = next;
        if (req.session.user) req.session.user.themeId = next;
        req.session.save(() => {});

        return res.json({ ok: true, data: { themeId: next } });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ ok: false, error: '서버 오류' });
    }
});

module.exports = router;