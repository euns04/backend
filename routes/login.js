const express = require('express');
const router = express.Router();
const User = require('../models/user');

router.get('/login', (req, res) => {
    console.log("GET!!");
})

router.post('/login', async(req, res) => {
    const {loginId, password} = req.body;

    try{
        const user = await User.findOne({loginId});

        // 아이디 확인
        if(!user){
            return res.json({ok: false, error: '해당하는 ID가 없습니다.'});
        }

        // 구현사항: 비밀번호 확인 -> 해시값으로 비밀번호 비교

        return res.json({
            ok: true,
            data: {
                "role": "mentor",
                "username": "..."
            }
        });

    } catch(e) {
        console.log(e);
        return res.status(500).json({ ok: false, error: '서버 오류가 발생했습니다.' });
    }
})

module.exports = router;