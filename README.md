# 카나나 토리

<p align="center">
  <img src="assets/images/tori.png" alt="토리" width="150">
</p>

<p align="center">
  <strong>우리아이 성장지킴이 토리</strong><br>
  발달장애 아동 부모를 위한 AI 발달검사 서비스
</p>

---

## 프로젝트 동기

> "발달검사 문항이 너무 어려워요. 아이에게 어떻게 설명해야 할지 모르겠어요."

많은 부모님들이 자녀의 발달검사를 진행할 때 **전문 용어**와 **복잡한 문장** 때문에 어려움을 겪습니다.
특히 발달장애 아동의 경우, 부모님이 질문을 이해하고 아이에게 다시 설명해야 하는 이중 부담이 있습니다.

**카나나 토리**는 이런 부모님들의 고민을 해결하기 위해 탄생했습니다.

---

## 프로젝트 설명

**카나나 토리**는 K-DST(한국형 발달선별검사) 기반의 발달검사를 **AI가 쉬운 말로 변환**하여 제공하는 서비스입니다.

### 주요 기능

| 기능 | 설명 |
|------|------|
| **AI 쉬운 말 변환** | GPT-4가 어려운 검사 문항을 아이도 이해할 수 있는 쉬운 말로 바꿔줍니다 |
| **TTS 음성 지원** | 토리가 직접 아이에게 질문을 읽어줍니다 |
| **발달 영역별 분석** | 대근육, 소근육, 인지, 언어, 사회성 5개 영역 평가 |
| **맞춤 추천** | 검사 결과에 따른 발달 지원 제품 추천 |
| **병원 안내** | 추가 검사가 필요한 경우 근처 소아과 정보 제공 |

---

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

