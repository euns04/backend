/**
 * Node의 c-ares DNS resolver가 SRV 레코드 조회를 실패(ECONNREFUSED 등)하는 환경에서
 * 특정 DNS 서버를 강제로 쓰도록 설정하는 보조 모듈.
 *
 * 사용:
 * - .env에 DNS_SERVERS=8.8.8.8,1.1.1.1 처럼 넣고
 * - 앱 시작/시드 실행 초기에 applyDnsServers() 호출
 */

const dns = require('dns');

function applyDnsServers() {
  const raw = process.env.DNS_SERVERS;
  if (!raw) return;

  const servers = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (servers.length === 0) return;

  try {
    dns.setServers(servers);
  } catch (e) {
    // DNS 설정 실패해도 앱이 죽지 않게 한다.
    // (Mongo 연결 에러는 mongoose.connect에서 노출됨)
    console.warn('DNS_SERVERS 적용 실패:', e?.message || e);
  }
}

module.exports = { applyDnsServers };

