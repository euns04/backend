const mongoose = require('mongoose');
const User = require('../models/user');
const bcrypt = require('bcrypt');

async function main(){
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/compiling-project';
    await mongoose.connect(mongoUri).catch(() => {
    console.warn('user db 조회 실패');
    });

    const password1 = process.env.SEED_PASSWORD_MENTEE || 'mentee1234';
    const password2 = process.env.SEED_PASSWORD_MENTOR || 'mentor1234';
    const passwordHash1 = await bcrypt.hash(password1, 10);
    const passwordHash2 = await bcrypt.hash(password2, 10);

    const users = [
        {
            loginId: 'mentee1',
            username: '멘티1',
            role: 'mentee',
            password: passwordHash1
        },
        {
            loginId: 'mentor1',
            username: '멘토1',
            role: 'mentor',
            password: passwordHash2
        }
    ];

    for(const user of users){
        await User.updateOne(
            {loginId: user.loginId},
            {$set: user},
            {upsert: true}
        )
    }
}

main()
.then(() => mongoose.disconnect())
.catch(err => {
    console.error('user 시드 업데이트 실패');
    mongoose.disconnect().finally(() => process.exit(1));
})