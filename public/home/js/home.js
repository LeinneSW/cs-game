import {shuffle} from '../../util/array.js';
import {loadQuizzes, saveQuizzes, setGameState} from "../../game/js/data.js";
import {createModal} from "../../util/modal.js";

let selectedQuizzes = new Set();

const updateControlPanel = () => {
    const selectedSize = selectedQuizzes.size;
    const startBtn = document.getElementById('start-btn');
    const selectedCount = document.getElementById('selected-count');

    startBtn.disabled = selectedSize === 0;
    selectedCount.textContent = `${selectedSize}개 주제 선택됨`;

    const quizzes = loadQuizzes();
    const selectAllBtn = document.getElementById('select-all-btn');
    selectAllBtn.textContent = selectedSize === quizzes.length ? '전체 해제' : '전체 선택';
}

const toggleQuizSelection = (index) => {
    const card = document.querySelector(`[data-quiz-index="${index}"]`);
    if(selectedQuizzes.has(index)){
        selectedQuizzes.delete(index);
        card.classList.remove('selected');
    }else{
        selectedQuizzes.add(index);
        card.classList.add('selected');
    }
    updateControlPanel();
}

const selectAllQuizzes = () => {
    const quizzes = loadQuizzes();
    const cardElements = document.querySelectorAll('.card');
    const allSelected = selectedQuizzes.size === quizzes.length;

    if(allSelected){
        selectedQuizzes.clear();
        cardElements.forEach(card => card.classList.remove('selected'));
    }else{
        quizzes.forEach((_, index) => selectedQuizzes.add(index));
        cardElements.forEach(card => card.classList.add('selected'));
    }
    updateControlPanel();
}

const startGame = async () => {
    if(selectedQuizzes.size === 0) return;

    const quizzes = loadQuizzes();
    const selectedQuizList = Array.from(selectedQuizzes).map(index => quizzes[index]);

    // 모든 선택된 주제의 아이템들을 합치기
    const topics = {};
    const quizItems = [];
    selectedQuizList.forEach(quiz => {
        topics[quiz.topic] = quiz.description;
        quiz.items.forEach(item => quizItems.push(structuredClone(item)));
    });

    createModal({
        type: 'prompt',
        title: '진행할 라운드 수',
        backdrop: 'static',
        message: `진행할 총 라운드 수를 입력해주세요(최대 라운드: ${quizItems.length})`,
        defaultInput: Math.min(20, quizItems.length).toString()
    }).then(input => {
        if(input == null) return;
        const roundLength = Number((input + '').trim());
        if(!Number.isFinite(roundLength)){
            createModal({
                type: 'alert',
                message: '올바른 숫자를 입력해주세요.'
            }).then(() => startGame());
            return;
        }
        setGameState({
            round: 0,
            roundLength: Math.max(1, Math.min(roundLength, quizItems.length)),
            scores: {},
            solved: false,
            topics,
            quizItems: shuffle(quizItems),
        });
        location.href = '/game/';
    })
}

const renderQuizList = () => {
    const quizListElement = document.getElementById('quiz-list');
    quizListElement.innerHTML = '';
    const quizzes = loadQuizzes();

    // 선택된 퀴즈 인덱스 초기화 (삭제된 항목들 제거)
    selectedQuizzes = new Set([...selectedQuizzes].filter(index => index < quizzes.length));

    if(!quizzes.length){
        quizListElement.innerHTML = '<p>추가된 주제가 없습니다.</p>';
        updateControlPanel();
        return;
    }

    quizzes.forEach((quiz, index) => {
        const card = document.createElement('article');
        card.className = 'card';
        card.dataset.quizIndex = index + '';

        const isSelected = selectedQuizzes.has(index);
        if(isSelected){
            card.classList.add('selected');
        }
        card.innerHTML = `
            <button class="del-btn" title="삭제">✕</button>
            <h2>${quiz.topic}</h2>
            <p>${quiz.description}</p>
            <small>총 ${quiz.items.length}개 문제</small>`;
        card.onclick = (e) => {
            if(e.target.classList.contains('del-btn')) return;
            toggleQuizSelection(index);
        };
        quizListElement.appendChild(card);

        card.querySelector('.del-btn').onclick = (e) => {
            e.stopPropagation(); // 카드 클릭 이벤트 막기
            if(confirm(`선택된 주제 '${quiz.topic}'을(를) 제거하시겠습니까?`)){
                quizzes.splice(index, 1);
                saveQuizzes(quizzes);
                renderQuizList();
            }
        };
    });
    updateControlPanel();
}

/**
 * @param {Object} json
 * @returns {Quiz}
 */
const parseQuiz = (json) => {
    const {topic, description, items} = json;
    if(typeof topic !== 'string' || typeof description !== 'string' || !Array.isArray(items)){
        throw new Error('데이터 구조가 잘못되었습니다.\n올바른 구조: {topic: string, description: string, items: QuizItem[]}');
    }
    for(const index in items){
        const {word, hints} = items[index];
        if(typeof word !== 'string' || !Array.isArray(hints)){
            throw new Error('QuizItem 구조가 올바르지 않습니다.\n올바른 구조: {word: string, hints: string[], aliases: string[]}');
        }
        items[index].topic = topic; // 다중 주제 선택 기능을 위해 추가
        items[index].aliases ??= [] // 외래어 등을 위해 추가(프루트, 푸르트 등)
    }
    return {topic, description, items}
}

const uploadQuiz = async (e) => {
    const quizzes = loadQuizzes();
    for(const file of e.target.files){
        let json
        try{
            json = JSON.parse(await file.text())
        }catch{}
        if(!json){
            await createModal({
                type: 'alert',
                message: `'${file.name}'에 대해 문제 발생.\n올바른 JSON 파일이 아닙니다.`
            });
            continue;
        }
        try{
            const quiz = parseQuiz(json);
            quizzes.push(quiz);
        }catch(e){
            await createModal({
                type: 'alert',
                message: `'${file.name}'에 대해 문제 발생.\n${e.message}`
            })
        }
    }
    saveQuizzes(quizzes);
    renderQuizList();
}

window.addEventListener('load', async () => {
    renderQuizList();
    const file = document.getElementById('file-input');
    file.addEventListener('change', uploadQuiz);

    // 컨트롤 패널 이벤트 리스너 추가
    document.getElementById('start-btn').onclick = startGame;
    document.getElementById('select-all-btn').onclick = selectAllQuizzes;
})