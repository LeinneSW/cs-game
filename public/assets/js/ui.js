import {toChosung} from "./util/kor.js";
import {loadQuizzes, saveQuizzes, setGameState, uploadQuiz} from "./data.js";
import {createModal} from "./util/modal.js";
import {shuffle} from "./util/array.js";
import {PHASE_IN_GAME, setGamePhase} from "./logic.js";

const nicknameColors = [
    "#EEA05D", "#EAA35F", "#E98158", "#E97F58",
    "#E76D53", "#E66D5F", "#E16490", "#E481AE",
    "#E481AE", "#D25FAC", "#D263AE", "#D66CB4",
    "#D071B6", "#AF71B5", "#A96BB2", "#905FAA",
    "#B38BC2", "#9D78B8", "#8D7AB8", "#7F68AE",
    "#9F99C8", "#717DC6", "#7E8BC2", "#5A90C0",
    "#628DCC", "#81A1CA", "#ADD2DE", "#83C5D6",
    "#8BC8CB", "#91CBC6", "#83C3BB", "#7DBFB2",
    "#AAD6C2", "#84C194", "#92C896", "#94C994",
    "#9FCE8E", "#A6D293", "#ABD373", "#BFDE73"
]

const tier2ColorList = {};
const cheatKeyColorList = {};
const selectedQuizzes = new Set();

function getUserColor(seed){
    const index = seed.split("")
        .map((c) => c.charCodeAt(0))
        .reduce((a, b) => a + b, 0) % nicknameColors.length
    return nicknameColors[index]
}

const htmlEntity = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
}
export function escapeHTML(s){
    return s.replace(/[&<>"']/g, m => htmlEntity[m]);
}

export async function updateSteamerInfo(channel){
    const nickname = document.getElementById('streamer-name');
    const avatar = document.getElementById('streamer-avatar');
    const defaultURL = avatar.src;
    avatar.src = channel.channelImageUrl || defaultURL;
    avatar.onerror = () => avatar.src = defaultURL;
    nickname.textContent = channel.channelName;
}

/**
 * @param {Object} profile
 * @param {string} message
 * @param {number} msecs
 * @param {Record<string, unknown> | string} colorData
 * @param {Object} emojiList
 */
export function addMessage(profile, message, msecs = Date.now(), colorData = 'white', emojiList = {}){
    const messageList = document.getElementById('message-list');
    const messageDiv = document.createElement('div')
    messageDiv.id = msecs + ''
    messageDiv.dataset.userIdHash = profile.userIdHash
    messageDiv.className = 'message'
    messageList.appendChild(messageDiv)

    const nickSpan = document.createElement('span')
    nickSpan.className = 'message-nickname'
    nickSpan.textContent = profile.nickname
    if(typeof colorData === 'string'){
        nickSpan.style.color = colorData
    }else{
        switch(colorData.effectType){
            case 'GRADATION':
                const direction = colorData.effectValue.direction.toLowerCase();
                const startColor = colorData.lightRgbValue;
                const endColor = colorData.effectValue.lightRgbEndValue;
                nickSpan.style.backgroundImage = `linear-gradient(to ${direction}, ${startColor}, ${endColor})`;
                nickSpan.style.backgroundClip = 'text';
                nickSpan.style.webkitBackgroundClip = 'text';
                nickSpan.style.color = 'transparent';
                break;
            case 'HIGHLIGHT':
                nickSpan.style.color = colorData.lightRgbValue;
                nickSpan.style.backgroundColor = colorData.effectValue.lightRgbBackgroundValue;
                break;
            case 'STEALTH':
                nickSpan.style.color = 'transparent';
                break;
        }
    }
    messageDiv.appendChild(nickSpan)

    const textSpan = document.createElement('span')
    textSpan.className = 'message-text'

    message = escapeHTML(message)
    for(const emojiName in emojiList){
        message = message.replaceAll(`{:${emojiName}:}`, `<img class='message-emoji' src='${emojiList[emojiName]}' alt="emoji">`)
    }
    textSpan.innerHTML = ` : ${message}`
    messageDiv.appendChild(textSpan)

    const threshold = 10; // 오차 허용값 (px)
    if(messageList.scrollHeight - (messageList.scrollTop + messageList.clientHeight + messageDiv.clientHeight) <= threshold){
        messageList.scrollTop = messageList.scrollHeight;
    }
}

export function clearMessageList(){
    const messageList = document.getElementById('message-list');
    messageList.innerHTML = '';
}

export function convertColorCode(colorCode, userId, chatChannelId){
    if(colorCode.startsWith('CC')){
        return cheatKeyColorList[colorCode] || getUserColor(userId + chatChannelId);
    }
    return tier2ColorList[colorCode];
}

/**
 * @param {GameState} gameState
 */
export function updateQuiz(gameState){
    const round = Math.min(gameState.quizItems.length - 1, gameState.round) || 0;

    const titleSpan = document.createElement('span');
    titleSpan.style.display = 'none';
    titleSpan.textContent = gameState.quizItems[round].topic;

    const topicTitle = document.getElementById('topic-title');
    topicTitle.textContent = "주제: ";
    topicTitle.onclick = () => {
        titleSpan.style.display = titleSpan.style.display === 'none' ? '' : 'none';
    }
    topicTitle.appendChild(titleSpan);

    const currentWord = gameState.quizItems[round].word;
    const currentHints = gameState.quizItems[round].hints;

    // UI 초기화
    const $roundInfo = document.getElementById('round-info');
    $roundInfo.textContent = `라운드 ${round + 1} / ${gameState.roundLength}`;

    const $answerLabel = document.getElementById('answer-label');
    $answerLabel.innerText = currentWord;

    const hintBox = document.getElementById('hint-list');
    hintBox.innerHTML = ''; // 기존 힌트 초기화
    currentHints.forEach(h => {
        const li = document.createElement('li');
        li.textContent = h;
        hintBox.appendChild(li);
    });

    const csListElement = document.getElementById('chosung-list');
    csListElement.innerHTML = ''; // 기존 단어 초기화
    toChosung(currentWord).forEach((cho, index) => {
        const li = document.createElement('li');
        li.className = 'chosung-item'
        li.dataset.char = currentWord[index];
        li.textContent = cho;
        if(li.dataset.char !== cho) li.dataset.cho = cho;
        csListElement.appendChild(li);
    });
    return csListElement.querySelectorAll('li')
}

function updateControlPanel(){
    const selectedSize = selectedQuizzes.size;
    const startBtn = document.getElementById('start-btn');
    const selectedCount = document.getElementById('selected-count');

    startBtn.disabled = selectedSize === 0;
    selectedCount.textContent = `${selectedSize}개 주제 선택됨`;

    const quizzes = loadQuizzes();
    const selectAllBtn = document.getElementById('select-all-btn');
    selectAllBtn.textContent = selectedSize === quizzes.length ? '전체 해제' : '전체 선택';
}

function toggleQuizSelection(index){
    const card = document.querySelector(`[data-quiz-index="${index}"]`);
    if(selectedQuizzes.has(index)){
        selectedQuizzes.delete(index);
        card.classList.remove('bg-body-secondary');
    }else{
        selectedQuizzes.add(index);
        card.classList.add('bg-body-secondary');
    }
    updateControlPanel();
}

function selectAllQuizzes(){
    const quizzes = loadQuizzes();
    const cardElements = document.querySelectorAll('[data-quiz-index]');
    const allSelected = selectedQuizzes.size === quizzes.length;

    if(allSelected){
        selectedQuizzes.clear();
        cardElements.forEach(card => card.classList.remove('bg-body-secondary'));
    }else{
        quizzes.forEach((_, index) => selectedQuizzes.add(index));
        cardElements.forEach(card => card.classList.add('bg-body-secondary'));
    }
    updateControlPanel();
}

export function renderQuizList(){
    const quizListElement = document.getElementById('quiz-list');
    quizListElement.innerHTML = '';
    const quizzes = loadQuizzes();

    selectedQuizzes.clear()

    if(!quizzes.length){
        quizListElement.innerHTML = '<p>추가된 주제가 없습니다.</p>';
        updateControlPanel();
        return;
    }

    quizzes.forEach((quiz, index) => {
        const card = document.createElement('div');
        card.className = 'border rounded-4 p-2';
        card.dataset.quizIndex = index + '';

        card.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div class="fs-4 fw-semibold">${quiz.topic}</div>
                <button class="btn btn-sm btn-outline-danger del-btn" title="삭제">✕</button>
            </div>
            <div>${quiz.description}</div>
            <div>문제 개수: 총 ${quiz.items.length}개</div>`;
        card.onclick = (e) => {
            if(e.target.classList.contains('del-btn')) return;
            toggleQuizSelection(index);
        };
        quizListElement.appendChild(card);

        card.querySelector('.del-btn').onclick = (e) => {
            e.stopPropagation(); // 카드 클릭 이벤트 막기
            if(confirm(`'${quiz.topic}'을(를) 제거하시겠습니까?`)){
                quizzes.splice(index, 1);
                saveQuizzes(quizzes);
                renderQuizList();
            }
        };
    });
    updateControlPanel();
}

async function startGame(){
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

    let input;
    while(true){
        input = await createModal({
            type: 'prompt',
            title: '진행할 라운드 수',
            backdrop: 'static',
            message: `진행할 총 라운드 수를 입력해주세요(최대 라운드: ${quizItems.length})`,
            defaultInput: Math.min(20, quizItems.length).toString()
        });
        if(input == null) return;
        const roundLength = Number((input + '').trim());
        if(!Number.isFinite(roundLength) || roundLength < 1){
            await createModal({
                type: 'alert',
                message: '올바른 숫자를 입력해주세요.'
            });
            continue;
        }

        setGameState({
            round: 0,
            roundLength: Math.min(roundLength, quizItems.length),
            scores: {},
            solved: false,
            topics,
            quizItems: shuffle(quizItems),
        })
        setGamePhase(PHASE_IN_GAME)
        break;
    }
}

window.addEventListener('load', async () => {
    /** @var {Record<string, unknown>[]} colorCodes */
    const colorCodes = await (await fetch('/colorCodes')).json();
    for(const index in colorCodes){
        const colorData = colorCodes[index];
        switch(colorData.availableScope){
            case 'CHEATKEY':
                cheatKeyColorList[colorData.code] = colorData.lightRgbValue;
                break;
            case 'SUBSCRIPTION_TIER2':
                tier2ColorList[colorData.code] = colorData;
                break;
        }
    }

    document.getElementById('start-btn').onclick = startGame;
    document.getElementById('upload-quiz').onchange = uploadQuiz;
    document.getElementById('select-all-btn').onclick = selectAllQuizzes;
})