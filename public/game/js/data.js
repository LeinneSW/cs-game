import {shuffle} from "../../util/array.js";

const QUIZ_KEY = 'quizzes';
const GAME_STATE_KEY = 'gameState'
const CHANNEL_ID_KEY = 'channelId'

let cachedGameState = null;

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

/**
 * @returns {Quiz[]}
 */
export function loadQuizzes(){
    try{
        return JSON.parse(localStorage.getItem(QUIZ_KEY));
    }catch{
        saveQuizzes([]);
        return [];
    }
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