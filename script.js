// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded!');

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

    const surveyQuestions = [
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
        currentQuestionIndex = 0;
        userAnswers = [];
        chatRoomPage.classList.remove('active');
        surveyPage.classList.add('active');
        showQuestion(currentQuestionIndex);
    }

    function showQuestion(index) {
        const question = surveyQuestions[index];
        questionText.textContent = question.question;
        questionImage.src = question.image;
        progressText.textContent = `${index + 1} / ${surveyQuestions.length}`;
    }

    function answerQuestion(answer) {
        userAnswers.push({
            questionIndex: currentQuestionIndex,
            userAnswer: answer,
            correctAnswer: surveyQuestions[currentQuestionIndex].correctAnswer,
            isCorrect: answer === surveyQuestions[currentQuestionIndex].correctAnswer
        });

        currentQuestionIndex++;

        if (currentQuestionIndex < surveyQuestions.length) {
            showQuestion(currentQuestionIndex);
        } else {
            showResults();
        }
    }

    // 결과 출력 및 자동 페이지 전환 로직
    function showResults() {
        surveyPage.classList.remove('active');
        resultPage.classList.add('active');

        const correctCount = userAnswers.filter(a => a.isCorrect).length;
        document.getElementById('correct-count').textContent = correctCount;

        const resultMessageText = document.getElementById('result-message-text');
        if (correctCount === 4) {
            resultMessageText.textContent = '완벽해요! 모든 질문을 올바르게 이해하셨네요! 👏';
        } else if (correctCount >= 3) {
            resultMessageText.textContent = '잘하셨어요! 대부분의 질문을 이해하셨네요! 😊';
        } else if (correctCount >= 2) {
            resultMessageText.textContent = '좋아요! 조금만 더 연습하면 완벽할 거예요! 💪';
        } else {
            resultMessageText.textContent = '괜찮아요! 토리와 함께 천천히 배워가요! 🌱';
        }

        const answerDetails = document.getElementById('answer-details');
        answerDetails.innerHTML = '';

        userAnswers.forEach((answer, index) => {
            const detailDiv = document.createElement('div');
            detailDiv.className = 'answer-detail-item';
            detailDiv.innerHTML = `
                <span class="question-number">질문 ${index + 1}</span>
                <span class="${answer.isCorrect ? 'answer-correct' : 'answer-incorrect'}">
                    ${answer.isCorrect ? '✓ 정답' : '✗ 오답'}
                </span>
                <span class="user-answer-text">답변: ${answer.userAnswer === 'o' ? '네' : '아니요'}</span>
            `;
            answerDetails.appendChild(detailDiv);
        });

        // [핵심] 3초 뒤에 아이 정보 입력 페이지로 자동 전환
        setTimeout(() => {
            // 사용자가 이미 '처음으로' 버튼을 눌러 페이지를 떠나지 않았을 때만 작동
            if (resultPage.classList.contains('active')) {
                resultPage.classList.remove('active');
                infoPage.classList.add('active');
                console.log('3초 경과: 아이 정보 입력 페이지로 이동합니다.');
            }
        }, 3000);
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

    // 아이 정보 제출 버튼
    if (submitInfoBtn) {
        submitInfoBtn.addEventListener('click', () => {
            const name = document.getElementById('child-name').value;
            const birth = document.getElementById('child-birth').value;

            if (!name || !birth || !selectedGender) {
                alert('모든 정보를 입력해주세요!');
                return;
            }

            console.log('등록된 아이 정보:', { name, birth, selectedGender });
            
            infoPage.classList.remove('active');
            //landingPage.classList.add('active');
        });
    }

    // 커스텀 모달 표시 함수
    function showModal(message, callback) {
        modalMessage.textContent = message;
        customModal.style.display = 'flex';
        modalCloseBtn.onclick = () => {
            customModal.style.display = 'none';
            if (callback) callback();
        };
    }

    // 최종 등록 버튼 로직 수정
    if (submitInfoBtn) {
        submitInfoBtn.addEventListener('click', () => {
            const name = document.getElementById('child-name').value;
            const birth = document.getElementById('child-birth').value;

            if (!name || !birth || !selectedGender) {
                showModal('모든 정보를 입력해주세요! 😊');
                return;
            }

            // 1. 등록 완료 모달 표시
            showModal([`${name} 어린이의`, `발달 검사를 시작합니다!`], () => {
                // 2. 모달 닫힌 후 로딩 페이지로 전환
                infoPage.classList.remove('active');
                loadingPage.classList.add('active');

                // 3. 3.5초간 로딩 애니메이션 보여준 후 메인으로 이동
                setTimeout(() => {
                    loadingPage.classList.remove('active');
                    landingPage.classList.add('active');
                    
                    // (선택사항) 메인에 왔을 때 환영 메시지 같은 걸 콘솔이나 UI에 남길 수 있음
                    console.log('검사 준비 완료');
                }, 6500);
            });
        });
    }
});