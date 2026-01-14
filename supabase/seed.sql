-- =====================================================
-- 카나나 토리 백엔드 - 초기 데이터 (Seed)
-- schema.sql 실행 후 이 파일을 실행하세요
-- =====================================================

-- 기존 데이터 삭제 (재실행 시)
TRUNCATE TABLE easy_text_cache CASCADE;
TRUNCATE TABLE questions CASCADE;

-- 설문 질문 삽입 (현재 프론트엔드 script.js의 데이터와 동일)
INSERT INTO questions (question_order, original_text, image_filename, correct_answer, category) VALUES

(1,
 '친구가 많은 당신! "발이 넓다!"라는 말을 들었다면 말 그대로 발이 정말로 큰 걸까요?',
 'big foot.png',
 'x',
 '비유표현'),

(2,
 '약속에 늦은 당신 ㅜㅜ! 친구가 "참~ 일찍도 온다!" 라고 말했다면 칭찬받아 기쁠까요?',
 'late.png',
 'x',
 '반어법'),

(3,
 '1000원을 가진 당신! 물건이 비싸진다면 결국 내가 살 수 있는 물건의 개수는 줄어들까요?',
 '1000.png',
 'o',
 '경제개념'),

(4,
 '민주주의라는 말의 뜻을 다른 사람에게 설명할 수 있나요?',
 'demo.png',
 'o',
 '사회개념');

-- 삽입 확인
SELECT
    question_order,
    LEFT(original_text, 30) || '...' as question_preview,
    correct_answer,
    category
FROM questions
ORDER BY question_order;
