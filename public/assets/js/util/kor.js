const KOR_BASE = 0xAC00;
const CHOSUNG_LIST = [
    'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ',
    'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
];
export function toChosung(str){
    return [...str].map(ch => {
        const code = ch.charCodeAt(0) - KOR_BASE;
        if(code < 0 || code > 11171) return ch;
        return CHOSUNG_LIST[Math.floor(code / 588)];
    });
}