const mongoose = require('mongoose');
const User = require('./models/user');

async function main() {
  const mongoUri =
    process.env.MONGODB_URI || 'mongodb://localhost:27017/compiling-project';

  await mongoose.connect(mongoUri);

  // 기본 테스트 계정들 (중복 실행 안전: upsert)
  const plainPassword = process.env.SEED_PASSWORD || '1234';

  const seedUsers = [
    {
      loginId: 'mentor01',
      username: '멘토01',
      role: 'mentor',
      password: plainPassword, // 테스트용: 평문 비밀번호
    },
    {
      loginId: 'mentee01',
      username: '멘티01',
      role: 'mentee',
      password: plainPassword, // 테스트용: 평문 비밀번호
    },
  ];

  for (const u of seedUsers) {
    await User.updateOne(
      { loginId: u.loginId },
      { $set: u },
      { upsert: true }
    );
  }

  console.log(
    `[seed] OK: ${seedUsers.length} users upserted (password: ${plainPassword})`
  );
}

main()
  .then(() => mongoose.disconnect())
  .catch((err) => {
    console.error('[seed] FAILED:', err);
    mongoose.disconnect().finally(() => process.exit(1));
  });

