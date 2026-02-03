const express = require('express');
const router = express.Router();
const User = require('../models/user');
const bcrypt = require('bcrypt');

router.get('/login', (req, res) => {
    console.log("GET!!");
})

router.post('/login', async(req, res) => {
    let {loginId, password} = req.body;

    // 테스트 편의를 위해 앞뒤 공백 제거
    loginId = String(loginId || '').trim();

    try{
        const user = await User.findOne({loginId});

        // 아이디 확인
        if(!user){
            return res.json({ok: false, error: '해당하는 ID가 없습니다.'});
        }

        // 테스트용: 평문 비밀번호 비교
        if(bcrypt.compareSync(password, user.password)){
            return res.json({ok: false, error: '비밀번호가 틀렸습니다.'});
        }

        return res.json({
            ok: true,
            data: {
                "role": user.role,
                "username": user.username
            }
        });

    } catch(e) {
        console.log(e);
        return res.status(500).json({ ok: false, error: '서버 오류가 발생했습니다.' });
    }
})

module.exports = router;