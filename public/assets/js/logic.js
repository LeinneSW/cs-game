import {addMessage, clearMessageList, convertColorCode, renderQuizList, updateQuiz} from "./ui.js";
import {getChannelId, getGameState, loadQuizzes, saveGameState, setGameState} from "./data.js";
import {createModal} from "./util/modal.js";
import {Leaderboard} from "./leaderboard.js";
import {shuffle} from "./util/array.js";

export const PHASE_SELECT_QUIZ = 0;
export const PHASE_IN_GAME = 1;

export async function connectChannel(client){
    let liveStatus;
    try{
        liveStatus = await client.live.status(getChannelId());
    }catch(e){}
    if(typeof liveStatus !== 'object' || liveStatus?.chatChannelId == null){ // liveStatus nullable 방지
        setTimeout(() => connectChannel(client), 1000); // 1초뒤 재시도
        return;
    }

    let startTime = Date.now();
    const chzzkChat = client.chat(liveStatus.chatChannelId);
    chzzkChat.on('connect', () => {
        clearMessageList()
        startTime = Date.now();
        chzzkChat.requestRecentChat(50)
    })
    chzzkChat.on('disconnect', () => setTimeout(() => connectChannel(client), 1000))
    chzzkChat.on('chat', chat => {
        const message = chat.message;
        const date = +chat.time || Date.now();

        let colorData;
        const streamingProperty = chat.profile.streamingProperty;
        if(chat.profile.title){ // 스트리머, 매니저 등 특수 역할
            colorData = chat.profile.title.color;
        }else{
            colorData = convertColorCode(
                streamingProperty.nicknameColor.colorCode,
                chat.profile.userIdHash,
                chzzkChat.chatChannelId
            );
        }

        let emojiList = chat.extras?.emojis;
        if(!emojiList || typeof emojiList !== 'object'){
            emojiList = {};
        }

        addMessage(chat.profile, message, date, colorData, emojiList);
        startTime <= date && checkQuizAnswer(message.trim(), chat.profile)
    });
    chzzkChat.connect().catch(() => {});
}

function checkQuizAnswer(inputValue, profile){
    const gameState = getGameState()
    if(gameState.solved){ // 이미 정답을 맞춘 경우
        return
    }

    const currentItem = gameState.quizItems[gameState.round];
    if(profile == null){
        if(inputValue != null){
            return
        }
        gameState.solved = true;
        saveGameState()
        createModal({
            type: 'alert',
            message: '아무도 정답을 맞추지 못했습니다.'
        }).then(() => nextRound())
        return;
    }

    const answerWord = currentItem.word.replaceAll(' ', '');
    if(answerWord !== inputValue || currentItem.aliases.includes(inputValue)){
        return;
    }
    gameState.solved = true;
    gameState.scores[profile.userIdHash] ??= {
        profile,
        score: 0
    }
    gameState.scores[profile.userIdHash].score += 100;
    saveGameState()

    // TODO: fanfare effect
    createModal({
        type: 'alert',
        title: `${profile.nickname}님 정답!`,
        message: `정답: ${inputValue}`,
    }).then(() => nextRound())
}

function nextRound(){
    const gameState = getGameState()
    ++gameState.round
    gameState.solved = false;
    saveGameState();

    if(gameState.round >= gameState.roundLength){
        location.href = '/result/';
    }
    renderRound();
}

function renderRound(){
    const gameState = getGameState();
    if(gameState.solved){
        nextRound()
        return;
    }

    const showChar = [];
    const chosungList = updateQuiz(gameState)
    chosungList.forEach((li, index) => {
        if(li.dataset.cho == null){ // 한글이 아닌 경우(공백 등)
            showChar[index] = true;
        }else{
            li.onclick = () => {
                li.textContent = (showChar[index] = !showChar[index]) ? li.dataset.char : li.dataset.cho;
                showChar.filter(Boolean).length === chosungList.length && checkQuizAnswer()
            };
        }
    })
    Leaderboard.updateGraph(gameState.scores)
}

export function setGamePhase(phase){
    const quitBtn = document.getElementById('quit-btn')
    const gameContainer = document.getElementById('game-container');
    const quizContainer = document.getElementById('quiz-container');
    switch(phase){
        case PHASE_SELECT_QUIZ:
            quitBtn.classList.add('hidden')

            gameContainer.classList.add('hidden');
            gameContainer.classList.remove('d-flex');

            quizContainer.classList.add('d-flex')
            quizContainer.classList.remove('hidden');
            renderQuizList();
            break;
        case PHASE_IN_GAME:
            quitBtn.classList.remove('hidden')

            quizContainer.classList.add('hidden');
            quizContainer.classList.remove('d-flex');

            gameContainer.classList.add('d-flex')
            gameContainer.classList.remove('hidden');
            renderRound();
            break;
    }
}