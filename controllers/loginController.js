const loginControl = (req, res, user) => {
    if (!user) {
        return res.status(404).json({ ok: false, error: 'user 불러오기 실패' });
    }
    req.session.user = {
        loginId: user.loginId,
        username: user.username,
        role: user.role
    };
    req.session.save((err) => {
        if (err) {
            console.error('session save error:', err);
            return res.status(500).json({ ok: false, error: '세션 저장 실패' });
        }
        return res.json({
            ok: true,
            data: {
                role: user.role,
                username: user.username
            }
        });
    });
};

module.exports = { loginControl };