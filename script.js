/**
 * @fileoverview 카나나 토리 - 발달장애 아동 부모를 위한 AI 발달검사 서비스
 * @author One-Kakao-Onboarding Team
 * @version 1.0.0
 * @license MIT
 *
 * @description
 * K-DST(한국형 발달선별검사) 기반의 발달검사를 제공하며,
 * GPT-4를 활용해 전문 용어를 쉬운 말로 변환하고,
 * TTS를 통해 아이에게 직접 질문을 읽어주는 기능을 제공합니다.
 *
 * @see {@link https://github.com/One-Kakao-Onboarding/20_Trano}
 */

'use strict';

// ============================================================================
// 타입 정의 (Type Definitions)
// ============================================================================

/**
 * 설문 질문 객체
 * @typedef {Object} SurveyQuestion
 * @property {string} question - 질문 텍스트
 * @property {string} [image] - 질문에 표시할 이미지 파일명
 * @property {string} correctAnswer - 정답 ('o' 또는 'x')
 * @property {string} [category] - 발달 영역 카테고리
 * @property {number} [id] - 질문 ID (DB 기준)
 */

/**
 * 사용자 답변 객체
 * @typedef {Object} UserAnswer
 * @property {string} question - 질문 텍스트
 * @property {string} userAnswer - 사용자 답변 ('o' 또는 'x')
 * @property {string} correctAnswer - 정답
 * @property {boolean} isCorrect - 정답 여부
 * @property {string} [category] - 발달 영역 카테고리
 */

/**
 * 카테고리별 점수 객체
 * @typedef {Object} CategoryScore
 * @property {number} yes - 'O' 답변 개수
 * @property {number} total - 전체 질문 개수
 */

/**
 * 검사 결과 객체
 * @typedef {Object} AssessmentResult
 * @property {string} type - 결과 유형 (critical, warning, normal)
 * @property {string} title - 결과 제목
 * @property {string} message - 결과 메시지
 * @property {string} style - CSS 스타일 클래스
 * @property {string[]} weakestCategories - 가장 약한 발달 영역 목록
 */

/**
 * 아이 정보 객체
 * @typedef {Object} ChildInfo
 * @property {string} name - 아이 이름
 * @property {string} birthDate - 생년월일
 * @property {string} gender - 성별 ('male' 또는 'female')
 * @property {number} ageInMonths - 개월수
 */

// ============================================================================
// 커스텀 에러 클래스 (Custom Error Classes)
// ============================================================================

/**
 * API 호출 실패 에러
 * @extends Error
 */
class ApiError extends Error {
    /**
     * @param {string} message - 에러 메시지
     * @param {number} [statusCode] - HTTP 상태 코드
     */
    constructor(message, statusCode = null) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
    }
}

/**
 * 유효성 검사 에러
 * @extends Error
 */
class ValidationError extends Error {
    /**
     * @param {string} message - 에러 메시지
     * @param {string} [field] - 문제가 있는 필드명
     */
    constructor(message, field = null) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
    }
}

// ============================================================================
// 상수 정의 (Constants)
// ============================================================================

/**
 * 발달검사 대상 월령 목록
 * @constant {number[]}
 */
const TARGET_AGE_MONTHS = [12, 24, 36, 48, 60];

/**
 * 결과 유형 정의
 * @constant {Object}
 */
const RESULT_TYPES = {
    CRITICAL: 'critical',
    WARNING: 'warning',
    NORMAL: 'normal'
};

/**
 * 발달 영역 카테고리 정의
 * @constant {Object}
 */
const CATEGORIES = {
    CRITICAL: 'critical',
    GROSS_MOTOR: 'gross_motor',
    FINE_MOTOR: 'fine_motor',
    COGNITION: 'cognition',
    LANGUAGE: 'language',
    SOCIAL: 'social',
    MOTOR: 'motor'  // gross_motor + fine_motor 통합
};

/**
 * 카테고리별 한글 명칭
 * @constant {Object}
 */
const CATEGORY_NAMES = {
    [CATEGORIES.CRITICAL]: '핵심 발달 지표',
    [CATEGORIES.GROSS_MOTOR]: '대근육 운동',
    [CATEGORIES.FINE_MOTOR]: '소근육 운동',
    [CATEGORIES.COGNITION]: '인지',
    [CATEGORIES.LANGUAGE]: '언어',
    [CATEGORIES.SOCIAL]: '사회성'
};

/**
 * 카테고리별 피드백 문구
 * @constant {Object}
 */
const CATEGORY_PHRASES = {
    [CATEGORIES.MOTOR]: '몸을 움직이는 것',
    [CATEGORIES.COGNITION]: '생각하는 것',
    [CATEGORIES.LANGUAGE]: '말하는 것',
    [CATEGORIES.SOCIAL]: '친구들과 노는 것'
};

/**
 * TTS 설정
 * @constant {Object}
 */
const TTS_CONFIG = {
    LANG: 'ko-KR',
    RATE: 0.9,
    PITCH: 1.0,
    VOLUME: 1.0
};

/**
 * 결과 판단 기준
 * @constant {Object}
 */
const RESULT_THRESHOLDS = {
    WARNING_MAX_YES: 5,  // O가 5개 이하면 주의
    NORMAL_MIN_YES: 6    // O가 6개 이상이면 안심
};

// ============================================================================
// 애플리케이션 초기화
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    // 앱 초기화

    // ========================================================================
    // 유틸리티 함수 (Utility Functions)
    // ========================================================================

    /**
     * 생년월일로부터 현재 개월수를 계산합니다.
     * @param {string|Date} birthDate - 생년월일
     * @returns {number} 개월수
     */
    function calculateAgeInMonths(birthDate) {
        const today = new Date();
        const birth = new Date(birthDate);
        const months = (today.getFullYear() - birth.getFullYear()) * 12
                     + (today.getMonth() - birth.getMonth());
        return Math.max(0, months);
    }

    /**
     * 개월수를 DB에 저장된 가장 가까운 낮은 값으로 매핑합니다.
     * @param {number} months - 개월수
     * @returns {number} 매핑된 월령 (12, 24, 36, 48, 60)
     */
    function mapToTargetAge(months) {
        for (let i = TARGET_AGE_MONTHS.length - 1; i >= 0; i--) {
            if (months >= TARGET_AGE_MONTHS[i]) {
                return TARGET_AGE_MONTHS[i];
            }
        }
        return TARGET_AGE_MONTHS[0];
    }

    // ========================================================================
    // 입력 유효성 검증 함수 (Input Validation)
    // ========================================================================

    /**
     * 아이 이름을 검증합니다.
     * @param {string} name - 아이 이름
     * @returns {{valid: boolean, error?: string}} 검증 결과
     */
    function validateChildName(name) {
        if (!name || typeof name !== 'string') {
            return { valid: false, error: '이름을 입력해주세요.' };
        }
        const trimmedName = name.trim();
        if (trimmedName.length < 1) {
            return { valid: false, error: '이름을 입력해주세요.' };
        }
        if (trimmedName.length > 20) {
            return { valid: false, error: '이름은 20자 이내로 입력해주세요.' };
        }
        // XSS 방지를 위한 특수문자 검사
        const invalidChars = /[<>\"\'&]/;
        if (invalidChars.test(trimmedName)) {
            return { valid: false, error: '이름에 특수문자를 사용할 수 없습니다.' };
        }
        return { valid: true };
    }

    /**
     * 생년월일을 검증합니다.
     * @param {string} birthDate - 생년월일 (YYYY-MM-DD 형식)
     * @returns {{valid: boolean, error?: string}} 검증 결과
     */
    function validateBirthDate(birthDate) {
        if (!birthDate) {
            return { valid: false, error: '생년월일을 입력해주세요.' };
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(birthDate)) {
            return { valid: false, error: '올바른 날짜 형식이 아닙니다.' };
        }

        const birth = new Date(birthDate);
        const today = new Date();

        if (isNaN(birth.getTime())) {
            return { valid: false, error: '유효하지 않은 날짜입니다.' };
        }

        if (birth > today) {
            return { valid: false, error: '미래 날짜는 입력할 수 없습니다.' };
        }

        // 최대 10년 전까지만 허용
        const tenYearsAgo = new Date();
        tenYearsAgo.setFullYear(today.getFullYear() - 10);
        if (birth < tenYearsAgo) {
            return { valid: false, error: '10세 이하의 아이만 검사할 수 있습니다.' };
        }

        return { valid: true };
    }

    /**
     * 성별을 검증합니다.
     * @param {string} gender - 성별 ('male' 또는 'female')
     * @returns {{valid: boolean, error?: string}} 검증 결과
     */
    function validateGender(gender) {
        if (!gender) {
            return { valid: false, error: '성별을 선택해주세요.' };
        }
        if (gender !== 'male' && gender !== 'female') {
            return { valid: false, error: '올바른 성별을 선택해주세요.' };
        }
        return { valid: true };
    }

    /**
     * 모든 아이 정보를 검증합니다.
     * @param {string} name - 아이 이름
     * @param {string} birthDate - 생년월일
     * @param {string} gender - 성별
     * @returns {{valid: boolean, error?: string}} 검증 결과
     */
    function validateChildInfo(name, birthDate, gender) {
        const nameValidation = validateChildName(name);
        if (!nameValidation.valid) return nameValidation;

        const birthValidation = validateBirthDate(birthDate);
        if (!birthValidation.valid) return birthValidation;

        const genderValidation = validateGender(gender);
        if (!genderValidation.valid) return genderValidation;

        return { valid: true };
    }

    /**
     * API에서 쉬운 말로 변환된 질문을 가져옵니다.
     * @param {number} targetAge - 대상 월령
     * @param {number} [limitPerCategory=2] - 카테고리당 질문 수
     * @returns {Promise<Array>} 질문 목록
     * @throws {Error} API 호출 실패 시
     */
    async function fetchEasyQuestions(targetAge, limitPerCategory = 2) {
        try {
            const response = await fetch(`/api/questions/easy?age=${targetAge}&limit=${limitPerCategory}`);

            if (!response.ok) {
                throw new Error(`HTTP 오류: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || '알 수 없는 오류');
            }

            return result.data;
        } catch (error) {
            console.error('❌ 질문 로드 실패:', error);
            throw new Error('질문을 불러오는데 실패했습니다.');
        }
    }

    // ========================================================================
    // DOM 요소 참조 (DOM Element References)
    // ========================================================================

    /** @type {HTMLElement} 랜딩 페이지 */
    const landingPage = document.getElementById('landing-page');
    /** @type {HTMLElement} 채팅방 페이지 */
    const chatRoomPage = document.getElementById('chat-room-page');
    /** @type {HTMLElement} 부모 설문 안내 페이지 */
    const parentSurveyIntroPage = document.getElementById('parent-survey-intro-page');
    /** @type {HTMLElement} 설문 페이지 */
    const surveyPage = document.getElementById('survey-page');
    /** @type {HTMLElement} 결과 페이지 */
    const resultPage = document.getElementById('result-page');
    const infoPage = document.getElementById('info-page'); // 추가됨

    const toriProfile = document.getElementById('tori-profile');
    const backButton = document.getElementById('back-button');
    const goToInfoBtn = document.getElementById('go-to-info-btn');
    const submitInfoBtn = document.getElementById('submit-info-btn');
    const restartBtn = document.getElementById('restart-btn');
    const startParentSurveyBtn = document.getElementById('start-parent-survey-btn');
    const genderBtns = document.querySelectorAll('.gender-btn');

    const loadingPage = document.getElementById('loading-page');
    const customModal = document.getElementById('custom-modal');
    const modalMessage = document.getElementById('modal-message');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    let selectedGender = '';

    // Navigate to chat room when Tori profile is clicked
    if (toriProfile) {
        toriProfile.addEventListener('click', (e) => {
            e.preventDefault();
            landingPage.classList.remove('active');
            chatRoomPage.classList.add('active');
        });
    }

    // Navigate back to landing page
    if (backButton) {
        backButton.addEventListener('click', () => {
            chatRoomPage.classList.remove('active');
            landingPage.classList.add('active');
        });
    }

    // Prevent other AI mates from being clicked
    const disabledMates = document.querySelectorAll('.ai-mate-card.disabled');
    disabledMates.forEach(mate => {
        mate.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    // ========================================================================
    // 설문 데이터 (Survey Data)
    // ========================================================================

    /**
     * 부모 발달 이해도 검사를 위한 기본 설문 질문
     * @constant {SurveyQuestion[]}
     */
    const BASIC_SURVEY_QUESTIONS = [
        {
            question: '친구가 많은 당신! "발이 넓다!"라는 말을 들었다면 말 그대로 발이 정말로 큰 걸까요?',
            image: 'assets/images/survey/bigfoot.png',
            correctAnswer: 'x'
        },
        {
            question: '약속에 늦은 당신 ㅜㅜ! 친구가 "참~ 일찍도 온다!" 라고 말했다면 칭찬받아 기쁠까요?',
            image: 'assets/images/survey/late.png',
            correctAnswer: 'x'
        },
        {
            question: '1000원을 가진 당신! 물건이 비싸진다면 결국 내가 살 수 있는 물건의 개수는 줄어들까요?',
            image: 'assets/images/survey/1000.png',
            correctAnswer: 'o'
        },
        {
            question: '민주주의라는 말의 뜻을 다른 사람에게 설명할 수 있나요?',
            image: 'assets/images/survey/demo.png',
            correctAnswer: 'o'
        }
    ];

    // ========================================================================
    // 설문 상태 관리 (Survey State)
    // ========================================================================

    /** @type {SurveyQuestion[]} 현재 활성 설문 질문 (동적으로 변경됨) */
    let surveyQuestions = [...BASIC_SURVEY_QUESTIONS];

    /** @type {'basic'|'developmental'} 현재 설문 타입 */
    let surveyType = 'basic';

    /** @type {number} 현재 질문 인덱스 */
    let currentQuestionIndex = 0;

    /** @type {UserAnswer[]} 사용자 답변 목록 */
    let userAnswers = [];

    /** @type {boolean} TTS 활성화 여부 (부모 설문 결과에 따라 결정) */
    let enableTTS = false;

    /**
     * 부모 설문 결과를 기반으로 TTS 발현 여부 판단
     * @param {Array} answers - userAnswers 배열
     * @returns {boolean} - TTS 발현 여부
     */
    function shouldEnableTTS(answers) {
        // 오답 문항 번호 추출 (1-based index)
        const wrongQuestions = answers
            .map((answer, index) => (!answer.isCorrect ? index + 1 : null))
            .filter(q => q !== null);

        const wrongSet = new Set(wrongQuestions);
        const wrongCount = wrongQuestions.length;

        // TTS 발현 조건 체크
        const ttsPatterns = [
            // 2개 틀림
            [1, 3], [1, 4], [2, 3], [2, 4],
            // 3개 틀림
            [1, 2, 3], [1, 2, 4], [1, 3, 4], [2, 3, 4],
            // 4개 틀림
            [1, 2, 3, 4]
        ];

        // 패턴 매칭
        for (const pattern of ttsPatterns) {
            if (pattern.length === wrongCount) {
                const isMatch = pattern.every(q => wrongSet.has(q));
                if (isMatch) {
                    return true;
                }
            }
        }

        return false;
    }

    // ========================================================================
    // TTS (Text-to-Speech) 관련 함수
    // ========================================================================

    /** @type {{abort: boolean}|null} 현재 실행 중인 TTS 제어 객체 */
    let currentTTSController = null;

    /**
     * TTS를 완전히 중지하는 함수
     * @returns {void}
     */
    function stopTTS() {
        // 컨트롤러가 있으면 중단
        if (currentTTSController) {
            currentTTSController.abort = true;
        }

        // 음성 합성 중지
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }

        // 토리 애니메이션 중지
        toggleToriSpeakingAnimation(false);

    }

    /**
     * TTS로 텍스트를 읽어주는 함수
     * @param {string} text - 읽어줄 텍스트
     * @returns {Promise} - TTS 완료를 알리는 Promise
     */
    function speakText(text) {
        return new Promise((resolve, reject) => {
            if (!('speechSynthesis' in window)) {
                console.warn('TTS not supported');
                resolve();
                return;
            }

            // 기존 음성 중지
            window.speechSynthesis.cancel();

            // 컨트롤러 객체 생성
            const controller = { abort: false };
            currentTTSController = controller;

            // 짧은 딜레이 후 음성 시작 (cancel 처리를 위해)
            setTimeout(() => {
                // 중단 요청이 있었으면 실행하지 않음
                if (controller.abort) {
                    resolve();
                    return;
                }

                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'ko-KR';
                utterance.rate = 0.9; // 읽는 속도 (0.1 ~ 10)
                utterance.pitch = 1.0; // 음높이 (0 ~ 2)
                utterance.volume = 1.0; // 볼륨 (0 ~ 1)

                utterance.onend = () => {
                    resolve();
                };

                utterance.onerror = (event) => {
                    console.error('TTS 에러:', event);
                    resolve(); // 에러가 나도 계속 진행
                };

                window.speechSynthesis.speak(utterance);
            }, 50);
        });
    }

    /**
     * 토리 이미지에 말하는 애니메이션 추가/제거
     * @param {boolean} isActive - 애니메이션 활성화 여부
     */
    function toggleToriSpeakingAnimation(isActive) {
        // 설문 페이지 토리
        const surveyTori = document.getElementById('survey-tori');
        if (surveyTori) {
            if (isActive) {
                surveyTori.classList.add('speaking');
            } else {
                surveyTori.classList.remove('speaking');
            }
        }

        // 결과 페이지 토리
        const resultTori = document.querySelector('.tori-face-large');
        if (resultTori) {
            if (isActive) {
                resultTori.classList.add('speaking');
            } else {
                resultTori.classList.remove('speaking');
            }
        }
    }

    /**
     * 아이 설문 질문을 TTS로 읽어주는 함수
     * @param {string} questionText - 질문 텍스트
     */
    async function readQuestionWithTTS(questionText) {
        if (!enableTTS) return;

        try {
            // 토리 애니메이션 시작
            toggleToriSpeakingAnimation(true);

            // 질문 텍스트 읽기
            await speakText(questionText);

            // 중단 요청 확인
            if (currentTTSController && currentTTSController.abort) {
                toggleToriSpeakingAnimation(false);
                return;
            }

            // 버튼 안내 멘트 읽기
            await speakText('아니오 버튼은 왼쪽, 네 버튼은 오른쪽에 있습니다');

            // 토리 애니메이션 종료
            toggleToriSpeakingAnimation(false);
        } catch (error) {
            console.error('TTS 실행 중 오류:', error);
            toggleToriSpeakingAnimation(false);
        }
    }

    /**
     * 결과 페이지를 TTS로 읽어주는 함수
     * @param {string} resultTitle - 결과 제목 (위험/주의/안심)
     * @param {string} resultMessage - 결과 메시지
     */
    async function readResultWithTTS(resultTitle, resultMessage) {
        if (!enableTTS) return;

        try {
            // 토리 애니메이션 시작
            toggleToriSpeakingAnimation(true);

            // 결과 제목 읽기
            await speakText(resultTitle);

            // 중단 요청 확인
            if (currentTTSController && currentTTSController.abort) {
                toggleToriSpeakingAnimation(false);
                return;
            }

            // 결과 메시지 읽기
            await speakText(resultMessage);

            // 토리 애니메이션 종료
            toggleToriSpeakingAnimation(false);
        } catch (error) {
            console.error('TTS 실행 중 오류:', error);
            toggleToriSpeakingAnimation(false);
        }
    }

    // ========================================================================
    // 제품 추천 데이터 (Product Recommendations)
    // ========================================================================

    /**
     * 카테고리별 제품 추천 데이터
     * 발달 영역에 따라 적합한 교육/놀이 용품을 추천합니다.
     * @constant {Object.<string, Array<{name: string, link: string, image: string}>>}
     */
    const productRecommendations = {
        'motor': [
            { name: '컵쌓기', link: 'https://kko.to/cSmxh_Z687', image: 'https://st.kakaocdn.net/product/gift/product/20220826170316_ccf540dab12d438b88a1a50ba28220d4.jpg' },
            { name: '미끄럼틀', link: 'https://kko.to/ARDMmQZeEo', image: 'https://st.kakaocdn.net/product/gift/product/20200225110922_fceabf087d3c4dd9ad6f950c509b0905' },
            { name: '링끼우기', link: 'https://kko.to/niB2dV75Br', image: 'https://st.kakaocdn.net/product/gift/product/20251203085745_d87e6541ebb247a2a2dd9766a77a90c4.jpg' }
        ],
        'cognition': [
            { name: '도형맞추기', link: 'https://kko.kakao.com/2QQc2aoL74', image: 'https://st.kakaocdn.net/product/gift/product/u4jZnJcsCo-TcsErTPPBng/OSPj2WQ16VEVAxF6oNbBi_1mgoMJ24C91XpjQ2GPJDc.jpg' },
            { name: '비지북', link: 'https://kko.to/MN5aJmea-q', image: 'https://st.kakaocdn.net/product/gift/product/20250124084638_7bc0091ca9c44922a6590624d0982a66.jpg' }
        ],
        'language': [
            { name: '사운드카드', link: 'https://kko.to/Iu3GiDafF8', image: 'https://st.kakaocdn.net/product/gift/product/20201223111726_15479f2ce2a840f98e3dd22b8c8bfc7b.jpg' },
            { name: '플랩북', link: 'https://kko.to/bM8-nC_h9h', image: 'https://st.kakaocdn.net/product/gift/product/SXH2IfpuCrG038xLIeitiw/y03d_Ku_2zTIPR-U5tApL7Jc6_UFd_zj6c9Tq0WzDSU.jpg' },
            { name: '낱말 벽보', link: 'https://kko.to/voohUL9s33', image: 'https://st.kakaocdn.net/product/gift/product/20250425155441_062ce1a1bc6e424f96f05811a90b6a3b.jpg' }
        ],
        'social': [
            { name: '역할놀이', link: 'https://kko.to/MmEcyi3QJP', image: 'https://st.kakaocdn.net/product/gift/product/20260108104252_e7809fb4a3254ad6a75c61f22b22fd7d.jpg' },
            { name: '역할놀이2', link: 'https://kko.to/gBbg0HWhSN', image: 'https://st.kakaocdn.net/product/gift/product/20200404031915_353209a8016a4fa5ab10368c5771d706' },
            { name: '보드게임', link: 'https://kko.to/Q4lyiE1ReH', image: 'https://st.kakaocdn.net/product/gift/product/ri8LX3NVFWgOV6Ve3SnTXQ/XU-F6mCNi79PfdcMTCLwAyIoN7jmIuSSyv8YXyOJ2Ks.jpg' }
        ]
    };

    // ========================================================================
    // 설문 UI 요소 참조 (Survey UI Elements)
    // ========================================================================

    /** @type {HTMLElement} 설문 시작 트리거 */
    const startSurveyTrigger = document.getElementById('start-survey-trigger');
    /** @type {HTMLElement} 질문 텍스트 표시 영역 */
    const questionText = document.getElementById('question-text');
    /** @type {HTMLImageElement} 질문 이미지 표시 영역 */
    const questionImage = document.getElementById('question-image');
    /** @type {HTMLButtonElement} 아니요 버튼 */
    const xBtn = document.getElementById('x-btn');
    /** @type {HTMLButtonElement} 네 버튼 */
    const oBtn = document.getElementById('o-btn');
    /** @type {HTMLElement} 진행 상태 텍스트 */
    const progressText = document.getElementById('progress-text');
    /** @type {HTMLButtonElement} 이전 버튼 */
    const prevBtn = document.getElementById('prev-btn');

    // ========================================================================
    // 설문 이벤트 핸들러 (Survey Event Handlers)
    // ========================================================================

    if (startSurveyTrigger) {
        startSurveyTrigger.addEventListener('click', () => {
            // 부모 설문 안내 페이지로 이동
            chatRoomPage.classList.remove('active');
            parentSurveyIntroPage.classList.add('active');
        });
    }

    if (startParentSurveyBtn) {
        startParentSurveyBtn.addEventListener('click', () => {
            startSurvey();
        });
    }

    // ========================================================================
    // 설문 핵심 함수 (Survey Core Functions)
    // ========================================================================

    /**
     * 설문을 시작하고 첫 번째 질문을 표시합니다.
     * @returns {void}
     */
    function startSurvey() {
        surveyType = 'basic';  // 기본 설문 타입 설정
        surveyQuestions = [...BASIC_SURVEY_QUESTIONS];  // 기본 질문으로 복원
        currentQuestionIndex = 0;
        userAnswers = [];
        parentSurveyIntroPage.classList.remove('active');
        surveyPage.classList.add('active');
        showQuestion(currentQuestionIndex);
    }

    function showQuestion(index) {
        const question = surveyQuestions[index];
        questionText.textContent = question.question;

        // 말풍선 스타일 변경
        const questionBubble = document.querySelector('.question-bubble');
        if (questionBubble) {
            if (surveyType === 'basic') {
                // 부모 설문: 큰 말풍선 + 이미지 포함
                questionBubble.className = 'question-bubble question-bubble-with-image';
            } else {
                // 발달 검사: 기본 말풍선 (토리 이미지 표시)
                questionBubble.className = 'question-bubble question-bubble-large';
            }
        }

        // 기본 설문은 이미지 표시, 발달 검사는 이미지 숨김
        const imageWrapper = document.querySelector('.question-image-wrapper');
        if (questionImage && imageWrapper) {
            if (surveyType === 'basic' && question.image) {
                questionImage.src = question.image;
                imageWrapper.style.display = 'flex';
            } else {
                imageWrapper.style.display = 'none';
            }
        }

        // 발달검사일 때만 토리 이미지 표시
        const surveyTori = document.getElementById('survey-tori');
        if (surveyTori) {
            surveyTori.style.display = surveyType === 'developmental' ? 'block' : 'none';
        }

        progressText.textContent = `${index + 1} / ${surveyQuestions.length}`;
        updatePrevButtonVisibility();

        // 발달검사일 때 TTS 실행
        if (surveyType === 'developmental' && enableTTS) {
            // 약간의 딜레이 후 TTS 시작 (이전 TTS 완전 중지 및 화면 전환 대기)
            setTimeout(() => {
                readQuestionWithTTS(question.question);
            }, 500);
        }
    }

    // 뒤로가기 버튼 표시/숨김
    function updatePrevButtonVisibility() {
        if (prevBtn) {
            prevBtn.style.display = currentQuestionIndex > 0 ? 'inline-block' : 'none';
        }
    }

    // 이전 질문으로 이동
    function goToPreviousQuestion() {
        if (currentQuestionIndex > 0) {
            // 이전 질문으로 이동 시 TTS 중지
            if (enableTTS && surveyType === 'developmental') {
                stopTTS();
            }

            currentQuestionIndex--;
            userAnswers.pop();  // 마지막 답변 제거
            showQuestion(currentQuestionIndex);
        }
    }

    function answerQuestion(answer) {
        const currentQuestion = surveyQuestions[currentQuestionIndex];

        // 답변 시 TTS 완전 중지
        if (enableTTS && surveyType === 'developmental') {
            stopTTS();
        }

        if (surveyType === 'basic') {
            // 기본 설문: 정답/오답 기록
            userAnswers.push({
                questionIndex: currentQuestionIndex,
                userAnswer: answer,
                correctAnswer: currentQuestion.correctAnswer,
                isCorrect: answer === currentQuestion.correctAnswer
            });
        } else {
            // 발달 검사: 응답만 기록
            userAnswers.push({
                questionIndex: currentQuestionIndex,
                userAnswer: answer,
                category: currentQuestion.category,
                questionText: currentQuestion.question
            });

            // Critical 질문에 X(아니요) 답변이 나오면 즉시 결과 페이지로 이동
            if (currentQuestion.category === 'critical' && answer === 'x') {
                // Critical 질문에 X 답변 - 즉시 결과 페이지로 이동
                showResults();
                return;
            }
        }

        currentQuestionIndex++;

        if (currentQuestionIndex < surveyQuestions.length) {
            showQuestion(currentQuestionIndex);
        } else {
            showResults();
        }
    }

    // 결과 페이지 초기화 함수
    function resetResultPage() {
        // 제목 초기화
        const resultTitleElement = document.querySelector('.result-title');
        if (resultTitleElement) {
            resultTitleElement.textContent = '';
            resultTitleElement.className = 'result-title';
        }

        // 점수 박스 초기화
        const resultScoreElement = document.querySelector('.result-score');
        if (resultScoreElement) {
            resultScoreElement.className = 'result-score';
            resultScoreElement.style.display = 'block';
        }

        // 메시지 초기화
        const resultMessageText = document.getElementById('result-message-text');
        if (resultMessageText) {
            resultMessageText.textContent = '';
            resultMessageText.style.whiteSpace = 'normal';
        }

        // 영역별 결과 초기화
        const resultDetailElement = document.querySelector('.result-detail');
        if (resultDetailElement) {
            // 내부 HTML을 완전히 재생성
            resultDetailElement.innerHTML = '<h3>영역별 결과</h3><div id="answer-details"></div>';
            resultDetailElement.style.display = 'none';
        }
    }

    // ========================================================================
    // 결과 표시 함수 (Result Display Functions)
    // ========================================================================

    /**
     * 설문 결과를 계산하고 화면에 표시합니다.
     * 기본 설문 완료 시 아이 정보 입력 페이지로,
     * 발달 검사 완료 시 결과 페이지로 이동합니다.
     * @returns {void}
     */
    function showResults() {
        // 결과 페이지 표시 전 TTS 중지
        if (enableTTS && surveyType === 'developmental') {
            stopTTS();
        }

        if (surveyType === 'basic') {
            // 기본 설문: TTS 발현 여부만 판단하고 바로 아이 정보 입력 페이지로 이동
            enableTTS = shouldEnableTTS(userAnswers);

            // 결과 페이지를 표시하지 않고 바로 아이 정보 입력 페이지로 이동
            surveyPage.classList.remove('active');
            infoPage.classList.add('active');
            return; // 여기서 함수 종료
        }

        // 발달 검사인 경우에만 결과 페이지 표시
        surveyPage.classList.remove('active');
        resultPage.classList.add('active');

        // 결과 페이지 완전 초기화
        resetResultPage();

        const answerDetails = document.getElementById('answer-details');
        const resultMessageText = document.getElementById('result-message-text');

        // 발달 검사: 영역별 결과 표시 및 위험도 판단
        const categoryNames = {
                'critical': '핵심 발달 지표',
                'gross_motor': '대근육 운동',
                'fine_motor': '소근육 운동',
                'cognition': '인지',
                'language': '언어',
                'social': '사회성'
            };

            // Critical 질문과 일반 질문 분리
            const criticalAnswers = userAnswers.filter(a => a.category === 'critical');
            const normalAnswers = userAnswers.filter(a => a.category !== 'critical');

            // Critical 질문 중 'X(아니요)' 개수
            const criticalNoCount = criticalAnswers.filter(a => a.userAnswer === 'x').length;
            // 일반 질문 중 'O(예)' 개수
            const normalYesCount = normalAnswers.filter(a => a.userAnswer === 'o').length;

            // 결과 판단
            let resultType = 'normal'; // 'critical', 'warning', 'normal'
            let resultTitle = '';
            let resultMessage = '';
            let resultStyle = '';
            let weakestCategories = [];

            if (criticalNoCount > 0) {
                // Critical 질문에 하나라도 X(아니요)가 있으면 위험
                resultType = 'critical';
                resultTitle = '위험';
                resultMessage = '아이의 성장이 느려요.\n빨리 가까운 병원을 가야해요.';
                resultStyle = 'danger';
            } else if (normalYesCount <= 5) {
                // 일반 질문 중 O가 5개 이하면 주의
                resultType = 'warning';
                resultTitle = '주의';
                resultStyle = 'warning';

                // 카테고리별 점수 계산 (피드백 + 제품추천 공용) - 4가지 유형
                const categoryScores = {
                    'motor': { yes: 0, total: 0 },
                    'cognition': { yes: 0, total: 0 },
                    'language': { yes: 0, total: 0 },
                    'social': { yes: 0, total: 0 }
                };

                normalAnswers.forEach(answer => {
                    let mappedCategory = answer.category;
                    // gross_motor와 fine_motor를 motor로 통합
                    if (answer.category === 'gross_motor' || answer.category === 'fine_motor') {
                        mappedCategory = 'motor';
                    }
                    if (categoryScores[mappedCategory]) {
                        categoryScores[mappedCategory].total++;
                        if (answer.userAnswer === 'o') categoryScores[mappedCategory].yes++;
                    }
                });

                // 가장 낮은 카테고리 찾기 (2-pass: 같은 비율의 모든 카테고리 수집)
                let lowestRatio = 1;

                // 1차: 가장 낮은 비율 찾기
                for (const [cat, score] of Object.entries(categoryScores)) {
                    if (score.total > 0) {
                        const ratio = score.yes / score.total;
                        if (ratio < lowestRatio) {
                            lowestRatio = ratio;
                        }
                    }
                }

                // 2차: 가장 낮은 비율과 같은 모든 카테고리 수집
                for (const [cat, score] of Object.entries(categoryScores)) {
                    if (score.total > 0) {
                        const ratio = score.yes / score.total;
                        if (ratio === lowestRatio) {
                            weakestCategories.push(cat);
                        }
                    }
                }

                // 카테고리별 한글 표현 (문장 조합용)
                const categoryPhrases = {
                    'motor': '몸을 움직이는 것',
                    'cognition': '생각하는 것',
                    'language': '말하는 것',
                    'social': '친구들과 노는 것'
                };


                // 메시지 생성
                if (weakestCategories.length === 1) {
                    // 1개: "아이가 몸을 움직이는 것을 조금 어려워해요."
                    resultMessage = `아이가 ${categoryPhrases[weakestCategories[0]]}을 조금 어려워해요.`;
                } else if (weakestCategories.length > 1) {
                    // 여러 개: "아이가 몸을 움직이는 것과 말하는 것을 조금 어려워해요."
                    const phrases = weakestCategories.map(cat => categoryPhrases[cat]);
                    const combined = phrases.slice(0, -1).join(', ') + '과 ' + phrases.slice(-1);
                    resultMessage = `아이가 ${combined}을 조금 어려워해요.`;
                } else {
                    resultMessage = '아이의 성장이 조금 느려요!';
                }
                resultMessage += '\n\n두 달 후에 토리가 다시 찾아올게요.';
            } else {
                // 일반 질문 중 O가 6개 이상이면 안심
                resultType = 'normal';
                resultTitle = '안심';
                resultMessage = '아이가 잘 자라고 있어요!\n걱정하지 마세요. 1년 뒤 토리가 다시 찾아올게요.';
                resultStyle = 'success';
            }

            // 결과 제목 및 메시지 표시
            const resultTitleElement = document.querySelector('.result-title');
            if (resultTitleElement) {
                resultTitleElement.textContent = '';
                resultTitleElement.className = `result-title ${resultStyle}`;
                // 타이핑 효과
                typeText(resultTitleElement, resultTitle, 100);
            }

            // 결과 점수 박스 숨기기
            const resultScoreElement = document.querySelector('.result-score');
            if (resultScoreElement) {
                resultScoreElement.style.display = 'none';
            }

            // 결과 메시지에 타이핑 효과
            resultMessageText.textContent = '';
            resultMessageText.style.whiteSpace = 'pre-line';
            setTimeout(() => {
                typeText(resultMessageText, resultMessage, 50);
            }, resultTitle.length * 100 + 200);

            // TTS로 결과 읽어주기 (타이핑 효과와 함께)
            if (enableTTS) {
                setTimeout(() => {
                    readResultWithTTS(resultTitle, resultMessage.replace(/\n/g, '. '));
                }, 500);
            }

            // 영역별 결과 숨기기
            const resultDetailElement = document.querySelector('.result-detail');

            // 초기에는 숨김
            if (resultDetailElement) {
                resultDetailElement.style.display = 'none';
            }

            // result-content 요소 가져오기
            const resultContentElement = document.querySelector('.result-content');

            // "주의" 상태일 때만 제품 추천 표시
            if (resultType === 'warning' && resultDetailElement && weakestCategories.length > 0) {
                // 주의일 때는 flex: 1로 공간 채우기
                if (resultContentElement) {
                    resultContentElement.style.flex = '1';
                }
                // 제품 추천 표시 (타이핑 효과 후 표시)
                const typingDelay = resultTitle.length * 100 + resultMessage.length * 50 + 500;
                setTimeout(() => {
                    // 카테고리 한글명
                    const categoryDisplayNames = {
                        'motor': '근육',
                        'cognition': '인지',
                        'language': '언어',
                        'social': '사회성'
                    };

                    // 각 카테고리에서 첫 번째 제품만 선택
                    const selectedProducts = [];
                    weakestCategories.forEach(cat => {
                        if (productRecommendations[cat] && productRecommendations[cat].length > 0) {
                            selectedProducts.push({
                                ...productRecommendations[cat][0],
                                category: categoryDisplayNames[cat]
                            });
                        }
                    });

                    if (selectedProducts.length > 0) {
                        resultDetailElement.style.display = 'block';
                        resultDetailElement.innerHTML = `
                            <h3>아이의 성장을 도울 제품을 추천해요!</h3>
                            <div class="product-grid">
                                ${selectedProducts.map(product => `
                                    <a href="${product.link}" target="_blank" class="product-card">
                                        <img src="${product.image}" alt="${product.name}" class="product-image">
                                        <p class="product-name">${product.name}</p>
                                        <span class="product-category">${product.category}</span>
                                    </a>
                                `).join('')}
                            </div>
                        `;
                    } else {
                        resultDetailElement.style.display = 'none';
                    }
                }, typingDelay);
            } else if (resultType === 'normal' && resultDetailElement) {
                // 안심일 때는 랜덤으로 3개 제품 추천
                if (resultContentElement) {
                    resultContentElement.style.flex = '1';
                }

                const typingDelay = resultTitle.length * 100 + resultMessage.length * 50 + 500;
                setTimeout(() => {
                    const categoryDisplayNames = {
                        'motor': '근육',
                        'cognition': '인지',
                        'language': '언어',
                        'social': '사회성'
                    };

                    // 모든 제품을 하나의 배열로 합치기
                    const allProducts = [];
                    Object.entries(productRecommendations).forEach(([cat, products]) => {
                        products.forEach(product => {
                            allProducts.push({
                                ...product,
                                category: categoryDisplayNames[cat]
                            });
                        });
                    });

                    // 랜덤으로 3개 선택
                    const shuffled = allProducts.sort(() => Math.random() - 0.5);
                    const randomProducts = shuffled.slice(0, 3);

                    if (randomProducts.length > 0) {
                        resultDetailElement.style.display = 'block';
                        resultDetailElement.innerHTML = `
                            <h3>아이에게 선물해보세요!</h3>
                            <div class="product-grid">
                                ${randomProducts.map(product => `
                                    <a href="${product.link}" target="_blank" class="product-card">
                                        <img src="${product.image}" alt="${product.name}" class="product-image">
                                        <p class="product-name">${product.name}</p>
                                        <span class="product-category">${product.category}</span>
                                    </a>
                                `).join('')}
                            </div>
                        `;
                    }
                }, typingDelay);
            } else if (resultType === 'critical' && resultDetailElement) {
                // 위험일 때 주변 소아과 검색
                if (resultContentElement) {
                    resultContentElement.style.flex = '1';
                }

                const typingDelay = resultTitle.length * 100 + resultMessage.length * 50 + 500;
                setTimeout(() => {
                    resultDetailElement.style.display = 'block';

                    // 용인시 수지구 동천로 기준 가까운 소아과
                    const nearbyHospitals = [
                        {
                            name: '동천아이들소아청소년과의원',
                            address: '용인시 수지구 동천동 887-5',
                            phone: '031-263-5500',
                            url: 'https://map.kakao.com/link/map/동천아이들소아청소년과의원,37.3378,127.1089'
                        },
                        {
                            name: '수지삼성소아청소년과의원',
                            address: '용인시 수지구 동천동 851',
                            phone: '031-262-8275',
                            url: 'https://map.kakao.com/link/map/수지삼성소아청소년과의원,37.3365,127.1052'
                        },
                        {
                            name: '동천연세소아청소년과의원',
                            address: '용인시 수지구 동천동 868',
                            phone: '031-264-8582',
                            url: 'https://map.kakao.com/link/map/동천연세소아청소년과의원,37.3371,127.1075'
                        }
                    ];

                    resultDetailElement.innerHTML = `
                        <div class="hospital-search-section">
                            <h3>가까운 소아과</h3>
                            <p class="hospital-search-desc">전문의 상담이 필요해요</p>
                            <div class="hospital-list">
                                ${nearbyHospitals.map(hospital => `
                                    <a href="${hospital.url}" target="_blank" class="hospital-card">
                                        <div class="hospital-info">
                                            <h4 class="hospital-name">${hospital.name}</h4>
                                            <p class="hospital-address">${hospital.address}</p>
                                            <p class="hospital-phone">${hospital.phone}</p>
                                        </div>
                                    </a>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }, typingDelay);
            } else {
                // 기타 상태
                if (resultContentElement) {
                    resultContentElement.style.flex = 'none';
                }
                if (resultDetailElement) {
                    resultDetailElement.style.display = 'none';
                }
            }
    }

    // 위치 기반 카카오맵 열기
    function openKakaoMapWithLocation() {
        const btn = document.getElementById('find-hospital-btn');
        if (btn) {
            btn.innerHTML = '<span>위치를 확인하고 있어요...</span>';
            btn.disabled = true;
        }

        if (!navigator.geolocation) {
            // 위치 서비스 미지원 시 일반 검색으로
            window.open('https://map.kakao.com/?q=소아과', '_blank');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                // 카카오맵 좌표 기반 검색 URL
                const kakaoMapUrl = `https://map.kakao.com/?q=소아과&x=${longitude}&y=${latitude}`;
                window.open(kakaoMapUrl, '_blank');

                if (btn) {
                    btn.innerHTML = '<span>내 주변 소아과 찾기</span>';
                    btn.disabled = false;
                }
            },
            (error) => {
                console.error('위치 오류:', error);
                // 위치 가져오기 실패 시 일반 검색으로
                window.open('https://map.kakao.com/?q=소아과', '_blank');

                if (btn) {
                    btn.innerHTML = '<span>내 주변 소아과 찾기</span>';
                    btn.disabled = false;
                }
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }

    // OG 이미지 로드 함수
    async function loadOgImages() {
        const wrappers = document.querySelectorAll('.product-image-wrapper[data-link]');

        for (const wrapper of wrappers) {
            const link = wrapper.dataset.link;
            if (!link) continue;

            try {
                const apiUrl = `/api/og-image?url=${encodeURIComponent(link)}`;

                const response = await fetch(apiUrl);
                const data = await response.json();


                if (data.success && data.ogImage) {
                    wrapper.innerHTML = `<img src="${data.ogImage}" alt="상품 이미지" class="product-image">`;
                } else {
                    wrapper.innerHTML = `<div class="product-no-image">이미지 없음</div>`;
                }
            } catch (error) {
                wrapper.innerHTML = `<div class="product-no-image">로드 실패</div>`;
            }
        }
    }

    // 타이핑 효과 함수
    function typeText(element, text, speed) {
        let index = 0;
        const interval = setInterval(() => {
            if (index < text.length) {
                element.textContent += text[index];
                index++;
            } else {
                clearInterval(interval);
            }
        }, speed);
    }

    if (xBtn) xBtn.addEventListener('click', () => answerQuestion('x'));
    if (oBtn) oBtn.addEventListener('click', () => answerQuestion('o'));
    if (prevBtn) prevBtn.addEventListener('click', goToPreviousQuestion);

    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            // 처음으로 돌아갈 때 TTS 중지 및 초기화
            if (enableTTS) {
                stopTTS();
            }
            enableTTS = false;

            // 모든 페이지 비활성화
            chatRoomPage.classList.remove('active');
            parentSurveyIntroPage.classList.remove('active');
            surveyPage.classList.remove('active');
            if (resultPage) resultPage.classList.remove('active');
            infoPage.classList.remove('active');
            loadingPage.classList.remove('active');

            // 랜딩 페이지로 이동
            landingPage.classList.add('active');
        });
    }

    // ========================================================================
    // 아이 정보 입력 페이지 (Child Info Page)
    // ========================================================================

    // 결과 페이지에서 수동으로 이동하고 싶을 때 사용
    if (goToInfoBtn) {
        goToInfoBtn.addEventListener('click', () => {
            resultPage.classList.remove('active');
            infoPage.classList.add('active');
        });
    }

    // 성별 버튼 선택 효과
    genderBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            genderBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedGender = btn.dataset.gender;
        });
    });

    // ========================================================================
    // 모달 및 UI 유틸리티 (Modal & UI Utilities)
    // ========================================================================

    /**
     * 커스텀 모달을 표시합니다.
     * @param {string} message - 모달에 표시할 메시지
     * @param {Function} [callback] - 모달 닫기 후 실행할 콜백
     * @returns {void}
     */
    function showModal(message, callback) {
        modalMessage.textContent = message;
        customModal.style.display = 'flex';
        modalCloseBtn.onclick = () => {
            customModal.style.display = 'none';
            if (callback) callback();
        };
    }

    // 최종 등록 버튼 로직 - API 호출 및 설문 시작
    if (submitInfoBtn) {
        submitInfoBtn.addEventListener('click', async () => {
            const name = document.getElementById('child-name').value;
            const birth = document.getElementById('child-birth').value;

            // 입력 유효성 검증
            const validation = validateChildInfo(name, birth, selectedGender);
            if (!validation.valid) {
                showModal(validation.error);
                return;
            }

            // 1. 개월수 계산
            const ageInMonths = calculateAgeInMonths(birth);
            const targetAge = mapToTargetAge(ageInMonths);

            // 2. 등록 완료 모달 표시
            showModal(`${name} 어린이의 발달 검사를 시작합니다!`, async () => {
                // 3. 모달 닫힌 후 로딩 페이지로 전환
                infoPage.classList.remove('active');
                loadingPage.classList.add('active');

                // 로딩 시작 시간 기록
                const loadingStartTime = Date.now();
                const MIN_LOADING_TIME = 4000; // 최소 4초

                try {
                    // 4. API 호출 (GPT 변환 포함)
                    // API 호출하여 질문 로드
                    const questions = await fetchEasyQuestions(targetAge, 2);

                    // 5. 설문 타입 및 데이터 설정
                    surveyType = 'developmental';
                    surveyQuestions = questions.map(q => ({
                        question: q.easyText,
                        category: q.category,
                        originalId: q.id
                    }));

                    // 6. 최소 로딩 시간 보장
                    const elapsedTime = Date.now() - loadingStartTime;
                    const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);

                    setTimeout(() => {
                        // 7. 설문 시작
                        loadingPage.classList.remove('active');
                        surveyPage.classList.add('active');
                        currentQuestionIndex = 0;
                        userAnswers = [];
                        showQuestion(0);
                    }, remainingTime);
                } catch (error) {
                    console.error('질문 로드 실패:', error);
                    showModal('질문을 불러오는데 실패했습니다. 다시 시도해주세요.');
                    loadingPage.classList.remove('active');
                    infoPage.classList.add('active');
                }
            });
        });
    }
});