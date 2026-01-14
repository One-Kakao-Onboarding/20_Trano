# 카나나 토리

발달장애인 부모를 위한 자녀 발달 체크 서비스

## 기술 스택

- **프론트엔드**: HTML, CSS, JavaScript (Vanilla)
- **백엔드**: Vercel Serverless Functions
- **데이터베이스**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4 (쉬운 말 변환)

## 프로젝트 구조

```
20_Trano/
├── api/                        # 백엔드 API (Vercel Serverless)
│   ├── _lib/
│   │   ├── supabase.js         # Supabase 클라이언트
│   │   ├── openai.js           # OpenAI 클라이언트
│   │   └── prompts.js          # GPT 프롬프트
│   └── questions/
│       ├── index.js            # GET /api/questions
│       └── easy.js             # GET /api/questions/easy
│
├── supabase/                   # 데이터베이스 스크립트
│   ├── schema.sql              # 테이블 생성
│   └── seed.sql                # 초기 데이터
│
├── index.html                  # 프론트엔드 메인
├── script.js                   # 프론트엔드 로직
├── styles.css                  # 스타일
├── *.png, *.jpg                # 이미지 자산
│
├── package.json
├── vercel.json
└── .env.example
```

## 배포 URL

배포 후:
- **프론트엔드**: `https://your-project.vercel.app/`
- **API**: `https://your-project.vercel.app/api/questions`

## 설정 방법

### 1. Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com) 접속
2. "New Project" 클릭
3. 프로젝트 이름: `kanana-tori`
4. 리전: `Northeast Asia (Seoul)` 권장

### 2. 데이터베이스 설정

Supabase Dashboard → SQL Editor에서:

```bash
# 1. 테이블 생성
supabase/schema.sql 내용 실행

# 2. 초기 데이터 삽입
supabase/seed.sql 내용 실행
```

### 3. 환경 변수 설정

```bash
cp .env.example .env.local
```

`.env.local` 수정:
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPENAI_API_KEY=sk-...
```

### 4. 로컬 개발

```bash
npm install
npm run dev
```

- 프론트엔드: http://localhost:3000
- API: http://localhost:3000/api/questions

### 5. Vercel 배포

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

Vercel Dashboard에서 환경 변수 설정 필요:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`

## API 엔드포인트

### GET /api/questions

원본 설문 질문 조회

### GET /api/questions/easy

GPT로 변환된 쉬운 버전 질문 조회 (캐싱 적용)

## 프론트엔드 연동 예시

```javascript
// script.js에서 API 호출
async function loadQuestions() {
  const res = await fetch('/api/questions/easy');
  const { data } = await res.json();
  return data;
}
```
