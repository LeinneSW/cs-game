import {shuffle} from "./util/array.js";
import {createModal} from "./util/modal.js";
import {renderQuizList} from "./ui.js";

/**
 * @typedef {Object} QuizItem
 * @property {string} topic 주제
 * @property {string} word 정답 단어
 * @property {string[]} hints 단어 힌트 목록
 * @property {string[]} aliases 동의어 목록
 */

/**
 * @typedef {Object} Quiz
 * @property {string} topic 주제
 * @property {string} description 설명
 * @property {QuizItem[]} items 퀴즈 항목 목록
 */

/**
 * @typedef {Object} Profile
 * @property {string} userIdHash 유저 고유 ID
 * @property {string} nickname 유저 이름
 * @property {string} profileImageUrl 유저 프로필 사진
 */

/**
 * @typedef {Object} Score
 * @property {Profile} profile
 * @property {number} score
 */

/**
 * @typedef {Object} GameState
 * @property {boolean} solved 문제 해결 여부
 * @property {number} round 현재 라운드
 * @property {number} roundLength 전체 라운드 수
 * @property {Record<string, Score>} scores 현재 스코어
 * @property {Record<string, string>} topics 선택된 주제
 * @property {QuizItem[]} quizItems 퀴즈 항목
 */

const QUIZ_KEY = 'quizzes';
const GAME_STATE_KEY = 'gameState'
const CHANNEL_ID_KEY = 'channelId'

/** @type {GameState | null} */
let cachedGameState = null;

/**
 * @param {Object} json
 * @returns {Quiz}
 */
export function parseQuiz(json){
    const {topic, description, items} = json;
    if(typeof topic !== 'string' || typeof description !== 'string' || !Array.isArray(items)){
        throw new Error('데이터 구조가 잘못되었습니다.\n올바른 구조: {topic: string, description: string, items: QuizItem[]}');
    }
    for(const index in items){
        const item = items[index];
        item.topic = topic; // 다중 주제 선택 기능을 위해 추가
        item.hints ??= [] // 힌트 목록
        item.aliases ??= [] // 외래어 등을 위해 추가(프루트, 푸르트 등)
        if(typeof item.word !== 'string' || !Array.isArray(item.hints) || !Array.isArray(item.aliases)){
            throw new Error('QuizItem 구조가 올바르지 않습니다.\n올바른 구조: {word: string, hints: string[], aliases: string[]}');
        }
    }
    return {topic, description, items}
}

export async function uploadQuiz(e){
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

    // 동일한 파일을 다시 선택할 수 있도록 value 초기화
    e.target.value = '';
}

/**
 * @returns {Quiz[]}
 */
export function loadQuizzes(){
    try{
        const dataStr = localStorage.getItem(QUIZ_KEY);
        if(dataStr != null){
            return JSON.parse(localStorage.getItem(QUIZ_KEY));
        }
    }catch{}
    saveQuizzes([]);
    return [];
}

/**
 * @param {Quiz[]} quizzes
 */
export function saveQuizzes(quizzes){
    localStorage.setItem(QUIZ_KEY, JSON.stringify(quizzes));
}

/**
 * @returns {GameState | null}
 */
export function getGameState(){
    if(cachedGameState) return cachedGameState;
    try{
        cachedGameState = JSON.parse(sessionStorage.getItem(GAME_STATE_KEY));
        return cachedGameState
    }catch{}
    resetGameState();
    return null;
}

/**
 * @param {GameState} newState
 */
export function setGameState(newState){
    cachedGameState = newState;
    sessionStorage.setItem(GAME_STATE_KEY, JSON.stringify(newState));
}

export function saveGameState(){
    if(!cachedGameState) return;
    sessionStorage.setItem(GAME_STATE_KEY, JSON.stringify(cachedGameState));
}

export function resetGameState(){
    cachedGameState = null
    sessionStorage.removeItem(GAME_STATE_KEY);
}

export function restartGame(){
    if(!cachedGameState) return;
    cachedGameState.round = 0
    cachedGameState.scores = {}
    cachedGameState.solved = false
    shuffle(cachedGameState.quiz.items)
    saveGameState()
}

export function getChannelId(){
    const channelId = sessionStorage.getItem(CHANNEL_ID_KEY) || '';
    if(channelId.length === 32){
        return channelId;
    }
    sessionStorage.removeItem(CHANNEL_ID_KEY);
    return ''
}

export function setChannelId(channelId){
    if(channelId.length === 32){
        sessionStorage.setItem(CHANNEL_ID_KEY, channelId);
        return true
    }
    return false
}

export function resetChannelId(){
    sessionStorage.removeItem(CHANNEL_ID_KEY);
}