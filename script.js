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
            image: 'big foot.png',
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

    const startSurveyTrigger = document.getElementById('start-survey-trigger');
    const questionText = document.getElementById('question-text');
    const questionImage = document.getElementById('question-image');
    const xBtn = document.getElementById('x-btn');
    const oBtn = document.getElementById('o-btn');
    const progressText = document.getElementById('progress-text');

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

        // 기본 설문은 이미지 표시, 발달 검사는 이미지 숨김
        if (questionImage) {
            if (surveyType === 'basic' && question.image) {
                questionImage.src = question.image;
                questionImage.style.display = 'block';
            } else {
                questionImage.style.display = 'none';
            }
        }
        progressText.textContent = `${index + 1} / ${surveyQuestions.length}`;
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

    // 결과 출력 (기본 설문 / 발달 검사 분기)
    function showResults() {
        surveyPage.classList.remove('active');
        resultPage.classList.add('active');

        const answerDetails = document.getElementById('answer-details');
        answerDetails.innerHTML = '';
        const resultMessageText = document.getElementById('result-message-text');

        if (surveyType === 'basic') {
            // 기본 설문: 정답/오답 표시
            const correctCount = userAnswers.filter(a => a.isCorrect).length;
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
            // 발달 검사: 영역별 결과 표시
            const yesCount = userAnswers.filter(a => a.userAnswer === 'o').length;
            const totalCount = userAnswers.length;
            document.getElementById('correct-count').textContent = yesCount;

            const categoryNames = {
                'gross_motor': '대근육 운동',
                'fine_motor': '소근육 운동',
                'cognition': '인지',
                'language': '언어',
                'social': '사회성'
            };

            resultMessageText.textContent = `${totalCount}개 질문 중 ${yesCount}개 항목에서 발달이 확인되었습니다.`;

            // 영역별로 그룹화하여 표시
            const groupedByCategory = {};
            userAnswers.forEach(answer => {
                if (!groupedByCategory[answer.category]) {
                    groupedByCategory[answer.category] = [];
                }
                groupedByCategory[answer.category].push(answer);
            });

            Object.keys(groupedByCategory).forEach(category => {
                const categoryDiv = document.createElement('div');
                categoryDiv.className = 'category-result';

                const categoryAnswers = groupedByCategory[category];
                const categoryYesCount = categoryAnswers.filter(a => a.userAnswer === 'o').length;

                categoryDiv.innerHTML = `
                    <div class="category-header">
                        <strong>${categoryNames[category] || category}</strong>
                        <span>${categoryYesCount} / ${categoryAnswers.length}</span>
                    </div>
                `;
                answerDetails.appendChild(categoryDiv);
            });
        }
    }

    if (xBtn) xBtn.addEventListener('click', () => answerQuestion('x'));
    if (oBtn) oBtn.addEventListener('click', () => answerQuestion('o'));

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