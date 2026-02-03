// 비로그인시 라우터 사용 x
const requireLogin = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    return res.status(401).json({ ok: false, error: '로그인이 필요합니다.' });
};

// 멘티 -> 멘토 화면 접근 x / 멘토 -> 멘티 화면 접근 x
const requireRole = (role) => {
    return (req, res, next) => {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ ok: false, error: '로그인이 필요합니다.' });
        }
        if (req.session.user.role !== role) {
            return res.status(403).json({ ok: false, error: '권한이 없습니다.' });
        }
        next();
    };
};

module.exports = {
    requireLogin,
    requireRole
};
