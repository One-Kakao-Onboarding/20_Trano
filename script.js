// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded!');

    // Page navigation
    const landingPage = document.getElementById('landing-page');
    const chatRoomPage = document.getElementById('chat-room-page');
    const surveyPage = document.getElementById('survey-page');
    const resultPage = document.getElementById('result-page');
    const toriProfile = document.getElementById('tori-profile');
    const backButton = document.getElementById('back-button');

    console.log('toriProfile:', toriProfile);
    console.log('landingPage:', landingPage);
    console.log('chatRoomPage:', chatRoomPage);

    // Navigate to chat room when Tori profile is clicked
    if (toriProfile) {
        toriProfile.addEventListener('click', (e) => {
            console.log('Tori profile clicked!');
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
            // No action - stays on the same page
        });
    });

    // Optional: Add subtle animation on page load
    if (landingPage) {
        landingPage.style.opacity = '1';
    }

    // ========== Survey Logic ==========

    // Survey questions data
    const surveyQuestions = [
        {
            question: '친구가 많은 당신! "발이 넓다!"라는 말을 들었다면 말 그대로 발이 정말로 큰 걸까요?',
            image: 'big foot.png',
            correctAnswer: 'x' // x = 아니요 (비유적 표현이므로)
        },
        {
            question: '약속에 늦은 당신 ㅜㅜ! 친구가 "참~ 일찍도 온다!" 라고 말했다면 칭찬받아 기쁠까요?',
            image: 'late.png',
            correctAnswer: 'x' // x = 아니요 (비꼬는 표현이므로)
        },
        {
            question: '1000원을 가진 당신! 물건이 비싸진다면 결국 내가 살 수 있는 물건의 개수는 줄어들까요?',
            image: '1000.png',
            correctAnswer: 'o' // o = 네 (경제 개념)
        },
        {
            question: '민주주의라는 말의 뜻을 다른 사람에게 설명할 수 있나요?',
            image: 'demo.png',
            correctAnswer: 'o' // o = 네 (설명 가능 여부)
        }
    ];

    let currentQuestionIndex = 0;
    let userAnswers = [];

    // Survey elements
    const startSurveyTrigger = document.getElementById('start-survey-trigger');
    const questionText = document.getElementById('question-text');
    const questionImage = document.getElementById('question-image');
    const xBtn = document.getElementById('x-btn');
    const oBtn = document.getElementById('o-btn');
    const progressText = document.getElementById('progress-text');

    // Start survey when empty chat area is clicked
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
        // Store the answer
        userAnswers.push({
            questionIndex: currentQuestionIndex,
            userAnswer: answer,
            correctAnswer: surveyQuestions[currentQuestionIndex].correctAnswer,
            isCorrect: answer === surveyQuestions[currentQuestionIndex].correctAnswer
        });

        // Move to next question or show results
        currentQuestionIndex++;

        if (currentQuestionIndex < surveyQuestions.length) {
            showQuestion(currentQuestionIndex);
        } else {
            showResults();
        }
    }

    function showResults() {
        surveyPage.classList.remove('active');
        resultPage.classList.add('active');

        // Calculate correct answers
        const correctCount = userAnswers.filter(a => a.isCorrect).length;
        document.getElementById('correct-count').textContent = correctCount;

        // Set result message based on score
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

        // Show answer details
        const answerDetails = document.getElementById('answer-details');
        answerDetails.innerHTML = '';

        userAnswers.forEach((answer, index) => {
            const detailDiv = document.createElement('div');
            detailDiv.className = 'answer-detail-item';

            const questionNumber = document.createElement('span');
            questionNumber.className = 'question-number';
            questionNumber.textContent = `질문 ${index + 1}`;

            const answerStatus = document.createElement('span');
            answerStatus.className = answer.isCorrect ? 'answer-correct' : 'answer-incorrect';
            answerStatus.textContent = answer.isCorrect ? '✓ 정답' : '✗ 오답';

            const userAnswerText = document.createElement('span');
            userAnswerText.className = 'user-answer-text';
            userAnswerText.textContent = `답변: ${answer.userAnswer === 'o' ? '네' : '아니요'}`;

            detailDiv.appendChild(questionNumber);
            detailDiv.appendChild(answerStatus);
            detailDiv.appendChild(userAnswerText);

            answerDetails.appendChild(detailDiv);
        });
    }

    // Answer button event listeners
    if (xBtn) {
        xBtn.addEventListener('click', () => {
            answerQuestion('x');
        });
    }

    if (oBtn) {
        oBtn.addEventListener('click', () => {
            answerQuestion('o');
        });
    }

    // Restart button
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            resultPage.classList.remove('active');
            landingPage.classList.add('active');
        });
    }
});
