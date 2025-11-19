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

        const data = {word};
        if(hints.length > 0){
            data.hints = hints;
        }
        if(aliases.length > 0){
            data.aliases = aliases;
        }
        items.push(data)
    });

    const topic = document.getElementById('topic').value.trim();
    const description = document.getElementById('description').value.trim();
    document.getElementById('json-output').textContent = JSON.stringify({topic, description, items}, null, 4);
}

function downloadJSON(){
    try{
        const jsonData = JSON.parse(document.getElementById('json-output')?.textContent || '') || {};
        if(jsonData.topic && jsonData.description && jsonData.items.length){
            const url = URL.createObjectURL(new Blob([output], {type: 'application/json'}));
            const a = document.createElement('a');
            a.href = url;
            a.download = `${jsonData.topic}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            return;
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

    document.getElementById('file-input').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if(!file) return;

        const rawText = await file.text()
        try{
            const jsonData = JSON.parse(rawText)
            // 기존 항목 초기화
            document.getElementById('items-container').innerHTML = '';
            itemCount = 0;

            // 메타 정보 로드
            document.getElementById('topic').value = jsonData.topic || '';
            document.getElementById('description').value = jsonData.description || '';

            // 항목 로드
            jsonData.items.forEach(item => {
                const quizItem = addItem().querySelector('input[type="text"]');

                quizItem.value = item.word;

                item.hints?.forEach(hint => addHint(quizItem, hint));
                item.aliases?.forEach(alias => addAlias(quizItem, alias));
            });
            updateQuizJSON();
        }catch{
            alert('JSON 파일 파싱에 실패했습니다.')
        }
        e.target.value = '';
    });
});