const RANK_LIMIT = 5;

function createLeaderboardItem(profile){
    const itemElement = document.createElement('div');
    itemElement.className = 'leaderboard-item new-item';
    itemElement.id = profile.userIdHash;

    itemElement.innerHTML = `
        <div class="score-background"></div>
        <div class="content-container">
            <div class="rank-number"></div>
            <div class="profile-image"></div>
            <div class="user-info">${profile.nickname}</div>
            <div class="score-text"></div>
        </div>`;

    const testImgUrl = new Image();
    const profileImage = itemElement.querySelector('.profile-image');
    testImgUrl.onload = () => profileImage.style.backgroundImage = `url('${profile.profileImageUrl}')`;
    testImgUrl.onerror = () => profileImage.style.backgroundImage = `url('/assets/images/default-profile.png')`;
    testImgUrl.src = profile.profileImageUrl;

    const itemsContainer = document.querySelector('.leaderboard-items-container');
    itemsContainer.appendChild(itemElement);
    return itemElement;
}

export function updateRankGraph(scores){
    // 점수 데이터를 배열로 변환하고 점수별로 정렬
    const sortedUsers = Object.values(scores)
        .sort((a, b) => b.score - a.score)
        .slice(0, RANK_LIMIT); // 최대 출력 제한

    // 최대 점수를 기준으로 바 길이 계산
    const maxScore = sortedUsers[0]?.score || 100;

    // 각 참가자마다 요소 생성 또는 업데이트
    const calc = (rank) => `calc(${rank * 100}% + ${rank * 6}px)`
    sortedUsers.forEach((user, rankIndex) => {
        let itemElement = document.getElementById(user.profile.userIdHash);
        if(itemElement){
            // 위치 업데이트를 위한 설정
            itemElement.style.transform = `translateY(${calc(rankIndex)})`;
        }else{
            itemElement = createLeaderboardItem(user.profile)
            itemElement.style.setProperty('--y-pos', calc(rankIndex));
            setTimeout(() => {
                itemElement.classList.remove('new-item');
                itemElement.style.transform = `translateY(${calc(itemElement.dataset.rank)})`;
            }, 300);

        }
        itemElement.dataset.rank = rankIndex + '';
        itemElement.style.zIndex = Math.max(RANK_LIMIT, 10) - rankIndex + ''; // 높은 순위가 위에 오도록

        // 순위, 메달 업데이트
        let className = 'rank-number'
        if(rankIndex === 0) className += ' gold';
        else if(rankIndex === 1) className += ' silver';
        else if(rankIndex === 2) className += ' bronze';

        const rankNumber = itemElement.querySelector('.rank-number');
        rankNumber.className = className;
        rankNumber.textContent = rankIndex + 1 + '';

        // 점수 업데이트
        const scoreText = itemElement.querySelector('.score-text');
        scoreText.textContent = user.score;

        // 점수 바 길이 업데이트
        const scoreBackground = itemElement.querySelector('.score-background');
        scoreBackground.style.width = (user.score / maxScore) * 100 + '%'
    });

    // 더 이상 리더보드에 없는 사용자 항목 제거
    const existingItems = document.querySelectorAll('.leaderboard-item');
    existingItems.forEach(item => {
        if(+item.dataset.rank >= RANK_LIMIT){
            item.style.opacity = 0 + '';
            setTimeout(() => item.remove(), 500);
        }
    });
}