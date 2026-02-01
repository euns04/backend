const app = require('./app');

// // JSON 요청 받기
// app.use(express.json());

// // 서버 테스트용
// app.get('/', (req, res) => {
//   res.send('서버 살아있음');
// });

// 서버 실행
app.listen(4000, () => {
  console.log('서버 실행중: http://localhost:4000');
});
