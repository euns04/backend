const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { applyDnsServers } = require('../dnsConfig');
const mongoose = require('mongoose');
const User = require('../models/user');
const bcrypt = require('bcrypt');
const { MONGODB_URI } = require('../env');

async function main(){
    const mongoUri = MONGODB_URI || 'mongodb://localhost:27017/compiling-project';
    applyDnsServers();

    try {
        await mongoose.connect(mongoUri);
    } catch (err) {
        console.warn('user db 조회 실패');
        console.warn(err?.message || err);
        console.warn('MONGODB_URI를 확인하세요. 예) mongodb+srv://USER:PASSWORD@HOST/DB?retryWrites=true&w=majority');
        throw err;
    }

    const password1 = process.env.SEED_PASSWORD_MENTEE || 'mentee1234';
    const password2 = process.env.SEED_PASSWORD_MENTOR || 'mentor1234';
    const password3 = process.env.SEED_PASSWORD_MENTEE2 || 'mentee2345';
    const passwordHash1 = await bcrypt.hash(password1, 10);
    const passwordHash2 = await bcrypt.hash(password2, 10);
    const passwordHash3 = await bcrypt.hash(password3, 10);

    const users = [
        {
            loginId: 'mentee1',
            username: '민지',
            role: 'mentee',
            password: passwordHash1
        },
        {
            loginId: 'mentor1',
            username: '박설아',
            role: 'mentor',
            password: passwordHash2
        },
        {
            loginId: 'mentee2',
            username: '민수',
            role: 'mentee',
            password: passwordHash3
        }
    ];

    for(const user of users){
        await User.updateOne(
            {loginId: user.loginId},
            {$set: user},
            {upsert: true}
        )
    }

    // ✅ 관계 설정: mentee1/mentee2의 mentorId -> mentor1
    const mentor = await User.findOne({ loginId: 'mentor1' }).select('_id').lean();
    if (mentor?._id) {
        await User.updateOne(
            { loginId: 'mentee1' },
            { $set: { mentorId: mentor._id } }
        );
        await User.updateOne(
            { loginId: 'mentee2' },
            { $set: { mentorId: mentor._id } }
        );
    }
}

main()
.then(() => mongoose.disconnect())
.catch(err => {
    console.error('user 시드 업데이트 실패');
    mongoose.disconnect().finally(() => process.exit(1));
})