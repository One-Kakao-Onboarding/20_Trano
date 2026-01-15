#!/usr/bin/env node
/**
 * GPT 질문 변환 테스트 스크립트
 * 사용법: node test-questions.js [age]
 * 예시: node test-questions.js 12
 */

const age = process.argv[2] || 12;
const url = `http://localhost:3000/api/questions/easy?age=${age}&limit=2`;

console.log(`\n🧪 GPT 질문 변환 테스트 (age=${age})`);
console.log(`📡 API: ${url}\n`);
console.log('⏳ 요청 중...\n');

fetch(url)
  .then(res => res.json())
  .then(data => {
    if (!data.success) {
      console.error('❌ Error:', data.error);
      process.exit(1);
    }

    console.log(`✅ 총 질문 수: ${data.count}\n`);
    console.log('='.repeat(60));

    const categories = {};

    data.data.forEach((q, i) => {
      // 카테고리별 카운트
      categories[q.category] = (categories[q.category] || 0) + 1;

      const status = q.validationPassed ? '✅' : '❌';
      const cache = q.fromCache ? '캐시' : '신규';

      console.log(`\n[${i + 1}] ${q.category} (${cache}) ${status}`);
      console.log(`    원본: ${q.questionText}`);
      console.log(`    변환: ${q.easyText}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('\n📊 카테고리별 분포:');
    Object.entries(categories).forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count}개`);
    });

    // 유효성 검사 통계
    const passed = data.data.filter(q => q.validationPassed).length;
    const failed = data.data.length - passed;
    console.log(`\n📈 유효성 검사: ${passed}개 통과, ${failed}개 실패`);

    // 캐시 통계
    const cached = data.data.filter(q => q.fromCache).length;
    const fresh = data.data.length - cached;
    console.log(`💾 캐시 상태: ${cached}개 캐시, ${fresh}개 신규 생성\n`);
  })
  .catch(err => {
    console.error('❌ 요청 실패:', err.message);
    console.log('\n💡 서버가 실행 중인지 확인하세요: node server.js');
    process.exit(1);
  });
