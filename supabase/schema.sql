-- =====================================================
-- 카나나 토리 백엔드 - 데이터베이스 스키마
-- Supabase SQL Editor에서 실행하세요
-- =====================================================

-- 1. questions 테이블: 설문 질문 저장
CREATE TABLE IF NOT EXISTS questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- 발달 영역 (언어, 인지, 사회성, 운동 등)
    category VARCHAR(50) NOT NULL,

    -- 설문 내용 (원본 텍스트)
    question_text TEXT NOT NULL,

    -- 대상 아이 개월수 (12, 24, 36 등)
    target_age_months INTEGER NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스: 개월수와 카테고리로 자주 조회
CREATE INDEX IF NOT EXISTS idx_questions_age ON questions(target_age_months);
CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);
CREATE INDEX IF NOT EXISTS idx_questions_age_category ON questions(target_age_months, category);

-- 2. easy_text_cache 테이블: GPT 변환 결과 캐싱
CREATE TABLE IF NOT EXISTS easy_text_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    original_text TEXT NOT NULL,
    easy_text TEXT NOT NULL,
    gpt_model VARCHAR(50) DEFAULT 'gpt-4',
    prompt_version VARCHAR(20) DEFAULT 'v1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- question_id + prompt_version 조합은 유일해야 함
    UNIQUE(question_id, prompt_version)
);

-- 캐시 조회 인덱스
CREATE INDEX IF NOT EXISTS idx_easy_text_cache_lookup
ON easy_text_cache(question_id, prompt_version);

-- =====================================================
-- Row Level Security (RLS) 설정
-- =====================================================

-- questions 테이블: 누구나 읽기 가능
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on questions" ON questions
    FOR SELECT USING (true);

-- easy_text_cache 테이블: 서버만 접근 (service_role key 사용)
ALTER TABLE easy_text_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access on easy_text_cache" ON easy_text_cache
    FOR ALL USING (true);

-- =====================================================
-- 업데이트 트리거 (updated_at 자동 갱신)
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_questions_updated_at
    BEFORE UPDATE ON questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
