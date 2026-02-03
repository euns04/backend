const express = require('express');
const router = express.Router();
const User = require('../models/user');
const bcrypt = require('bcrypt');
const { loginControl } = require('../controllers/loginController');

router.get('/login', (req, res) => {
    if (req.session && req.session.user) {
        return res.json({ ok: true, data: req.session.user });
    }
    return res.json({ ok: false, error: '로그인되지 않음' });
});

router.post('/login', async (req, res) => {
    const { loginId, password } = req.body;

    try {
        const user = await User.findOne({ loginId });

        if (!user) {
            return res.json({ ok: false, error: '해당하는 ID가 없습니다.' });
        }

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

module.exports = router;