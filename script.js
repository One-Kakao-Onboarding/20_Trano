// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded!');

    // ========== 개월수 계산 유틸리티 함수 ==========

    /**
     * 생년월일로부터 현재 개월수 계산
     */
    function calculateAgeInMonths(birthDate) {
        const today = new Date();
        const birth = new Date(birthDate);
        const months = (today.getFullYear() - birth.getFullYear()) * 12
                     + (today.getMonth() - birth.getMonth());
        return months;
    }

    /**
     * 개월수를 DB에 저장된 가장 가까운 낮은 값으로 매핑
     * (12, 24, 36, 48, 60개월)
     */
    function mapToTargetAge(months) {
        if (months >= 60) return 60;
        if (months >= 48) return 48;
        if (months >= 36) return 36;
        if (months >= 24) return 24;
        return 12;
    }

    /**
     * API에서 쉬운 말로 변환된 질문 가져오기
     */
    async function fetchEasyQuestions(targetAge, limitPerCategory = 2) {
        const response = await fetch(`/api/questions/easy?age=${targetAge}&limit=${limitPerCategory}`);
        if (!response.ok) {
            throw new Error('질문을 불러오는데 실패했습니다.');
        }
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || '질문을 불러오는데 실패했습니다.');
        }
        return result.data;
    }

    // Page navigation elements
    const landingPage = document.getElementById('landing-page');
    const chatRoomPage = document.getElementById('chat-room-page');
    const surveyPage = document.getElementById('survey-page');
    const resultPage = document.getElementById('result-page');
    const infoPage = document.getElementById('info-page'); // 추가됨

    const toriProfile = document.getElementById('tori-profile');
    const backButton = document.getElementById('back-button');
    const goToInfoBtn = document.getElementById('go-to-info-btn');
    const submitInfoBtn = document.getElementById('submit-info-btn');
    const restartBtn = document.getElementById('restart-btn');
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

    // ========== Survey Logic ==========

    // 기본 설문 질문 (원본 - 변경 금지)
    const BASIC_SURVEY_QUESTIONS = [
        {
            question: '친구가 많은 당신! "발이 넓다!"라는 말을 들었다면 말 그대로 발이 정말로 큰 걸까요?',
            image: 'bigfoot.png',
            correctAnswer: 'x'
        },
        {
            question: '약속에 늦은 당신 ㅜㅜ! 친구가 "참~ 일찍도 온다!" 라고 말했다면 칭찬받아 기쁠까요?',
            image: 'late.png',
            correctAnswer: 'x'
        },
        {
            question: '1000원을 가진 당신! 물건이 비싸진다면 결국 내가 살 수 있는 물건의 개수는 줄어들까요?',
            image: '1000.png',
            correctAnswer: 'o'
        },
        {
            question: '민주주의라는 말의 뜻을 다른 사람에게 설명할 수 있나요?',
            image: 'demo.png',
            correctAnswer: 'o'
        }
    ];

    // 현재 활성 설문 질문 (동적으로 변경됨)
    let surveyQuestions = [...BASIC_SURVEY_QUESTIONS];

    // 현재 설문 타입 ('basic' = 기존 4문항, 'developmental' = 발달검사 10문항)
    let surveyType = 'basic';

    let currentQuestionIndex = 0;
    let userAnswers = [];

    // 카테고리별 제품 추천 데이터 (result.md 기반)
    const productRecommendations = {
        'motor': [
            { name: '컵쌓기', image: 'https://via.placeholder.com/150?text=컵쌓기', link: 'https://kko.to/cSmxh_Z687' },
            { name: '미끄럼틀', image: 'https://via.placeholder.com/150?text=미끄럼틀', link: 'https://kko.to/ARDMmQZeEo' },
            { name: '링끼우기', image: 'https://via.placeholder.com/150?text=링끼우기', link: 'https://kko.to/niB2dV75Br' }
        ],
        'cognition': [
            { name: '도형맞추기', image: 'https://via.placeholder.com/150?text=도형맞추기', link: 'https://kko.kakao.com/2QQc2aoL74' },
            { name: '비지북', image: 'https://via.placeholder.com/150?text=비지북', link: 'https://kko.to/MN5aJmea-q' }
        ],
        'language': [
            { name: '사운드카드', image: 'https://via.placeholder.com/150?text=사운드카드', link: 'https://kko.to/Iu3GiDafF8' },
            { name: '플랩북', image: 'https://via.placeholder.com/150?text=플랩북', link: 'https://kko.to/bM8-nC_h9h' },
            { name: '낱말 벽보', image: 'https://via.placeholder.com/150?text=낱말벽보', link: 'https://kko.to/voohUL9s33' }
        ],
        'social': [
            { name: '역할놀이', image: 'https://via.placeholder.com/150?text=역할놀이', link: 'https://kko.to/MmEcyi3QJP' },
            { name: '역할놀이2', image: 'https://via.placeholder.com/150?text=역할놀이2', link: 'https://kko.to/gBbg0HWhSN' },
            { name: '보드게임', image: 'https://via.placeholder.com/150?text=보드게임', link: 'https://kko.to/Q4lyiE1ReH' }
        ]
    };

    const startSurveyTrigger = document.getElementById('start-survey-trigger');
    const questionText = document.getElementById('question-text');
    const questionImage = document.getElementById('question-image');
    const xBtn = document.getElementById('x-btn');
    const oBtn = document.getElementById('o-btn');
    const progressText = document.getElementById('progress-text');
    const prevBtn = document.getElementById('prev-btn');

    if (startSurveyTrigger) {
        startSurveyTrigger.addEventListener('click', () => {
            startSurvey();
        });
    }

    function startSurvey() {
        surveyType = 'basic';  // 기본 설문 타입 설정
        surveyQuestions = [...BASIC_SURVEY_QUESTIONS];  // 기본 질문으로 복원
        currentQuestionIndex = 0;
        userAnswers = [];
        chatRoomPage.classList.remove('active');
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
            currentQuestionIndex--;
            userAnswers.pop();  // 마지막 답변 제거
            showQuestion(currentQuestionIndex);
        }
    }

    function answerQuestion(answer) {
        const currentQuestion = surveyQuestions[currentQuestionIndex];

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

    // 결과 출력 (기본 설문 / 발달 검사 분기)
    function showResults() {
        surveyPage.classList.remove('active');
        resultPage.classList.add('active');

        // 결과 페이지 완전 초기화
        resetResultPage();

        const answerDetails = document.getElementById('answer-details');
        const resultMessageText = document.getElementById('result-message-text');

        if (surveyType === 'basic') {
            // 기본 설문: 정답/오답 표시
            const correctCount = userAnswers.filter(a => a.isCorrect).length;

            // 결과 제목 표시 (기본)
            const resultTitleElement = document.querySelector('.result-title');
            if (resultTitleElement) {
                resultTitleElement.textContent = '발달 검사 완료!';
                resultTitleElement.className = 'result-title';
            }

            // 점수 박스 표시
            const resultScoreElement = document.querySelector('.result-score');
            if (resultScoreElement) {
                resultScoreElement.style.display = 'block';
                resultScoreElement.className = 'result-score';
            }

            document.getElementById('correct-count').textContent = correctCount;

            if (correctCount === 4) {
                resultMessageText.textContent = '완벽해요! 모든 질문을 올바르게 이해하셨네요!';
            } else if (correctCount >= 3) {
                resultMessageText.textContent = '잘하셨어요! 대부분의 질문을 이해하셨네요!';
            } else if (correctCount >= 2) {
                resultMessageText.textContent = '좋아요! 조금만 더 연습하면 완벽할 거예요!';
            } else {
                resultMessageText.textContent = '괜찮아요! 토리와 함께 천천히 배워가요!';
            }

            // 영역별 결과 표시
            const resultDetailElement = document.querySelector('.result-detail');
            if (resultDetailElement) {
                resultDetailElement.style.display = 'block';
                // 제목을 "답변 내역"으로 변경
                const detailTitle = resultDetailElement.querySelector('h3');
                if (detailTitle) {
                    detailTitle.textContent = '답변 내역';
                    detailTitle.style.color = '#1a1a1a';
                    detailTitle.style.textAlign = 'left';
                }
            }

            userAnswers.forEach((answer, index) => {
                const detailDiv = document.createElement('div');
                detailDiv.className = 'answer-detail-item';
                detailDiv.innerHTML = `
                    <span class="question-number">질문 ${index + 1}</span>
                    <span class="${answer.isCorrect ? 'answer-correct' : 'answer-incorrect'}">
                        ${answer.isCorrect ? '정답' : '오답'}
                    </span>
                    <span class="user-answer-text">답변: ${answer.userAnswer === 'o' ? '네' : '아니요'}</span>
                `;
                answerDetails.appendChild(detailDiv);
            });

            // 3초 후 아이 정보 입력 페이지로 이동
            setTimeout(() => {
                if (resultPage.classList.contains('active')) {
                    resultPage.classList.remove('active');
                    infoPage.classList.add('active');
                }
            }, 3000);
        } else {
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

            // Critical 질문 중 'O' 개수
            const criticalYesCount = criticalAnswers.filter(a => a.userAnswer === 'o').length;
            // 일반 질문 중 'O' 개수
            const normalYesCount = normalAnswers.filter(a => a.userAnswer === 'o').length;

            // 결과 판단
            let resultType = 'normal'; // 'critical', 'warning', 'normal'
            let resultTitle = '';
            let resultMessage = '';
            let resultStyle = '';

            if (criticalYesCount > 0) {
                // Critical 질문에 하나라도 O가 있으면 위험
                resultType = 'critical';
                resultTitle = '위험';
                resultMessage = '아이의 성장이 느려요.\n빨리 가까운 병원을 가야해요.';
                resultStyle = 'danger';
            } else if (normalYesCount <= 5) {
                // 일반 질문 중 O가 5개 이하면 주의
                resultType = 'warning';
                resultTitle = '주의';
                resultMessage = '아이의 성장이 조금 느려요!\n두 달 후에 토리가 다시 찾아올게요.';
                resultStyle = 'warning';
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

            // 영역별 결과 숨기기
            const resultDetailElement = document.querySelector('.result-detail');

            // 초기에는 숨김
            if (resultDetailElement) {
                resultDetailElement.style.display = 'none';
            }

            // "주의" 상태일 때만 제품 추천 표시
            if (resultType === 'warning' && resultDetailElement) {
                // 카테고리 통합 (gross_motor + fine_motor = motor)
                const groupedCategoryScores = {
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

                    if (groupedCategoryScores[mappedCategory]) {
                        groupedCategoryScores[mappedCategory].total++;
                        if (answer.userAnswer === 'o') {
                            groupedCategoryScores[mappedCategory].yes++;
                        }
                    }
                });

                // 가장 점수가 낮은 카테고리 찾기
                let lowestCategory = null;
                let lowestScore = 1;
                Object.keys(groupedCategoryScores).forEach(category => {
                    const scores = groupedCategoryScores[category];
                    if (scores.total > 0) {
                        const score = scores.yes / scores.total;
                        if (score < lowestScore) {
                            lowestScore = score;
                            lowestCategory = category;
                        }
                    }
                });

                // 제품 추천 표시 (타이핑 효과 후 표시)
                const typingDelay = resultTitle.length * 100 + resultMessage.length * 50 + 500;
                setTimeout(() => {
                    if (lowestCategory && productRecommendations[lowestCategory]) {
                        // 카테고리 한글명
                        const categoryDisplayNames = {
                            'motor': '근육',
                            'cognition': '인지',
                            'language': '언어',
                            'social': '사회성'
                        };

                        resultDetailElement.style.display = 'block';
                        resultDetailElement.innerHTML = `
                            <h3>아이의 성장을 도울 제품을 추천해요!</h3>
                            <p style="font-size: 14px; color: #666; margin-bottom: 10px;">${categoryDisplayNames[lowestCategory]} 발달을 위한 추천</p>
                            <div class="product-grid">
                                ${productRecommendations[lowestCategory].map(product => `
                                    <a href="${product.link}" target="_blank" class="product-card">
                                        <img src="${product.image}" alt="${product.name}" class="product-image">
                                        <p class="product-name">${product.name}</p>
                                    </a>
                                `).join('')}
                            </div>
                        `;
                    } else {
                        resultDetailElement.style.display = 'none';
                    }
                }, typingDelay);
            } else {
                if (resultDetailElement) {
                    resultDetailElement.style.display = 'none';
                }
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
            resultPage.classList.remove('active');
            landingPage.classList.add('active');
        });
    }

    // ========== Info Page Logic ==========

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

    // 커스텀 모달 표시 함수
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

            if (!name || !birth || !selectedGender) {
                showModal('모든 정보를 입력해주세요!');
                return;
            }

            // 1. 개월수 계산
            const ageInMonths = calculateAgeInMonths(birth);
            const targetAge = mapToTargetAge(ageInMonths);
            console.log(`아이 나이: ${ageInMonths}개월 → 검사 대상: ${targetAge}개월`);

            // 2. 등록 완료 모달 표시
            showModal(`${name} 어린이의 발달 검사를 시작합니다!`, async () => {
                // 3. 모달 닫힌 후 로딩 페이지로 전환
                infoPage.classList.remove('active');
                loadingPage.classList.add('active');

                try {
                    // 4. API 호출 (GPT 변환 포함)
                    console.log('질문 로딩 중...');
                    const questions = await fetchEasyQuestions(targetAge, 2);
                    console.log(`${questions.length}개 질문 로드 완료`);

                    // 5. 설문 타입 및 데이터 설정
                    surveyType = 'developmental';
                    surveyQuestions = questions.map(q => ({
                        question: q.easyText,
                        category: q.category,
                        originalId: q.id
                    }));

                    // 6. 설문 시작
                    loadingPage.classList.remove('active');
                    surveyPage.classList.add('active');
                    currentQuestionIndex = 0;
                    userAnswers = [];
                    showQuestion(0);
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