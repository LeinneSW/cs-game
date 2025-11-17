let itemCount = 0;

function addItem(){
    const itemCard = document.createElement('div');
    itemCard.className = 'border-bottom';
    itemCard.id = `item-${++itemCount}`;

    itemCard.innerHTML = `
        <div class="d-flex gap-2 p-2">
            <input type="text" class="form-control" aria-label="word" style="flex: 1">
            <button class="btn btn-outline-secondary" onclick="">세부</button>
            <button class="btn btn-outline-danger" onclick="removeItem(${itemCount})">제거</button>
        </div>`
    /*<div class="card-body">
        <div class="input-group">
            <label>힌트 (1~3개)</label>
            <div class="hint-container" id="hints-${itemCount}">
                <div class="hint-item">
                    <input type="text" placeholder="힌트 1">
                    <button class="btn btn-danger btn-small" onclick="removeHint(this)">삭제</button>
                </div>
            </div>
            <div class="add-buttons">
                <button class="btn btn-secondary btn-small" onclick="addHint(${itemCount})">+ 힌트 추가</button>
            </div>
        </div>

        <div class="input-group">
            <label>별칭 (Aliases) - 선택사항</label>
            <div class="alias-container" id="aliases-${itemCount}"></div>
            <div class="add-buttons">
                <button class="btn btn-secondary btn-small" onclick="addAlias(${itemCount})">+ 별칭 추가</button>
            </div>
        </div>
    </div>
    `;*/

    const container = document.getElementById('items-container');
    container.appendChild(itemCard);
    requestAnimationFrame(() => itemCard.scrollIntoView({behavior: 'smooth', block: 'nearest', inline: 'center'}))
    return itemCard;
}

function removeItem(id){
    document.getElementById(`item-${id}`)?.remove()
}

function addHint(element, hint){
    const hints = element.dataset.hints || '';
    element.dataset.hints = `${hints}\n${hint}`
}

function setHints(element, hints){
    element.dataset.hints = hints;
}

function addAlias(element, alias){
    const aliases = element.dataset.aliases || '';
    element.dataset.aliases = `${aliases},${alias}`
}

function updateQuizJSON(){
    const items = [];
    document.querySelectorAll(`#items-container input[type='text']`).forEach(card => {
        const word = card.value.trim() || ''
        if(word.length < 2) return;

        const hints = (card.dataset.hints || '').split('\n').filter(Boolean)
        const aliases = (card.dataset.aliases || '').split(',').filter(Boolean)

        const data = {word, hints};
        if(aliases.length > 0){
            data.aliases = aliases;
        }
        items.push(data)
    });

    const topic = document.getElementById('topic').value.trim();
    const description = document.getElementById('description').value.trim();
    document.getElementById('json-output').textContent = JSON.stringify({topic, description, items}, null, 4);
}

function copyJSON(){
    const output = document.getElementById('json-output').textContent;
    navigator.clipboard.writeText(output)
        .then(() => alert('JSON이 클립보드에 복사되었습니다!'))
        .catch(err => alert('복사에 실패했습니다: ' + err));
}

function downloadJSON(){
    const output = document.getElementById('json-output').textContent;
    const topic = document.getElementById('topic').value.trim() || '';
    const description = document.getElementById('description').value.trim() || '';
    try{
        if(JSON.parse(output) != null && topic && description){
            const url = URL.createObjectURL(new Blob([output], {type: 'application/json'}));
            const a = document.createElement('a');
            a.href = url;
            a.download = `${topic}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }catch{}
    alert('주제, 설명, 단어가 모두 있어야합니다.')
}

function loadFromJSON(){
    document.getElementById('file-input')?.click();
}

// 페이지 로드 시 기본 항목 추가
window.addEventListener('load', () => {
    addItem();
    updateQuizJSON();
    document.querySelector('.container-fluid').addEventListener('input', (e) => {
        e.target.matches('input[type="text"], textarea') && updateQuizJSON();
    });

    document.getElementById('file-input').addEventListener('change', function(e){
        const file = e.target.files[0];
        if(!file) return;

        const reader = new FileReader();
        reader.onload = function(event){
            try{
                const jsonData = JSON.parse(event.target.result);

                // 기존 항목 초기화
                document.getElementById('items-container').innerHTML = '';
                itemCount = 0;

                // 메타 정보 로드
                document.getElementById('topic').value = jsonData.topic || '';
                document.getElementById('description').value = jsonData.description || '';

                // 항목 로드
                jsonData.items.forEach(item => {
                    const currentCard = addItem();

                    // 단어 입력
                    currentCard.querySelector('input[type="text"]').value = item.word;

                    item.hints.forEach(hint => addHint(currentCard, hint));
                    item.aliases?.forEach(alias => addAlias(currentCard, alias));

                    // 별칭 입력
                    if(item.aliases && item.aliases.length > 0){
                        const aliasesContainer = currentCard.querySelector('.alias-container');
                        item.aliases.forEach(alias => {
                            const aliasItem = document.createElement('div');
                            aliasItem.className = 'alias-item';
                            aliasItem.innerHTML = `
                                <input type="text" value="${alias.replace(/"/g, '&quot;')}">
                                <button class="btn btn-danger btn-small" onclick="removeAlias(this)">삭제</button>
                            `;
                            aliasesContainer.appendChild(aliasItem);
                        });
                    }
                });

                alert('JSON 파일이 성공적으로 로드되었습니다!');
            }catch(err){
                alert('JSON 파일 파싱에 실패했습니다: ' + err.message);
            }
        };
        reader.readAsText(file);

        // 파일 입력 초기화 (같은 파일을 다시 선택할 수 있도록)
        e.target.value = '';
    });
});