const loginControl = (req, res, user) => {
    if (!user) {
        return res.status(404).json({ ok: false, error: 'user 불러오기 실패' });
    }
    // 세션 필드 통일: 앞으로는 req.session.userId / req.session.role를 1차 소스로 사용
    // (하위호환을 위해 req.session.user도 같이 유지)
    req.session.userId = user._id;
    req.session.role = user.role;
    req.session.username = user.username;
    req.session.loginId = user.loginId;

    req.session.user = {
        userId: user._id,
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
                userId: String(user._id),
                role: user.role,
                username: user.username,
                mentoId: user.mentorId
            }
        });
    });
};

module.exports = { loginControl };