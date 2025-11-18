import {createModal} from "./util/modal.js";
import {getChannelId, getGameState, resetChannelId, resetGameState, setChannelId} from "./data.js";
import {updateSteamerInfo} from "./ui.js";
import {ChzzkClient} from "https://cdn.skypack.dev/chzzk"
import {connectChannel, setGamePhase, PHASE_IN_GAME, PHASE_SELECT_QUIZ} from "./logic.js";

async function onLoadForConnectedChatServer(){
    const client = new ChzzkClient({
        baseUrls: {
            chzzkBaseUrl: "/cors/chzzk",
            gameBaseUrl: "/cors/game"
        }
    });
    let channelId = getChannelId()
    if(channelId.length !== 32){
        const modalOptions = {
            type: 'prompt',
            message: '본인의 치지직 닉네임 혹은 채널 ID를 입력해주세요',
            backdrop: 'static',
        }
        channelId = await createModal(modalOptions)
    }
    let liveDetail;
    try{
        channelId.length === 32 && (liveDetail = await client.live.detail(channelId));
    }catch(e){}
    if(liveDetail == null || typeof liveDetail !== 'object'){
        let channel = null
        try{
            const channelList = await client.search.channels(channelId); // 닉네임으로 판단하여 채널 검색 수행
            channel = channelList.channels.find(channel => channel.channelName === channelId); // '정확히'일치하는 닉네임 탐색
        }catch{}
        channel && (liveDetail = await client.live.detail(channel.channelId))
    }

    if(!liveDetail?.channel.channelId || liveDetail.channel.channelId.length !== 32){
        resetChannelId()
        const modalOptions = {
            type: 'alert',
            message: '해당 채널을 찾지 못했습니다. 채널명 혹은 채널 ID를 "정확히" 입력해주세요.'
        }
        await createModal(modalOptions)
        // TODO: 재접속 기능 구현
        //setTimeout(() => location.reload(), 500);
        return
    }

    if(liveDetail.chatChannelId == null){
        const modalOptions = {
            type: 'alert',
            message: '현재 방송이 19세로 설정되어있습니다.\n19세 해제 후 이용 부탁드립니다. (19세 설정시 채팅 조회 불가)'
        }
        await createModal(modalOptions)
    }
    liveDetail.channel.channelId !== channelId && setChannelId(liveDetail.channel.channelId)
    updateSteamerInfo(liveDetail.channel).catch(console.error)
    connectChannel(client).then(() => {});
}

window.addEventListener('load', async () => {
    document.getElementById('quit-btn').onclick = () => {
        const modalOptions = {
            type: 'confirm',
            title: '게임 종료',
            message: '정말 진행중이던 게임을 종료하고 홈 화면으로 돌아가시겠습니까?',
        }
        createModal(modalOptions).then(result => {
            if(!result) return;
            resetGameState()
            location.reload()
        })
    };
    const gameState = getGameState();
    if(gameState){
        setGamePhase(PHASE_IN_GAME);
    }else{
        setGamePhase(PHASE_SELECT_QUIZ);
    }

    // 실수로 인한 페이지 이동 방지
    const lockHistory = () => history.pushState(null, '', location.href) // 더미 스택 추가
    lockHistory();
    window.addEventListener('popstate', lockHistory);

    await onLoadForConnectedChatServer();
});

