import express from 'express';

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept"
};
const agentHeaders = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
};
const baseURLs = {
    chzzk: "https://api.chzzk.naver.com",
    game: "https://comm-api.game.naver.com/nng_main"
};

const app = express();
app.use(express.json());
app.use(express.text());
app.use(express.static('public'));

app.get('/cors/:base/*', async (req, res) => {
    const {base} = req.params;
    const baseURL = baseURLs[base];
    if(!baseURL){
        return res.status(404).set(corsHeaders).send("Not Found");
    }

    // 대상 URL 구성
    const targetURL = `${baseURL}${req.url.replace(`/cors/${base}`, '')}`;
    try{
        const response = await fetch(targetURL, {headers: agentHeaders});
        const data = await response.text();
        res.set(corsHeaders);
        if(
            (data.startsWith("{") && data.endsWith("}")) ||
            (data.startsWith("[")) && data.endsWith("]")
        ){
            res.type("application/json");
        }
        res.send(data);
    }catch (error){
        console.error("Error fetching data:", error);
        res.status(500).set(corsHeaders).send("Failed to fetch data from the target URL.");
    }
});
app.get('/colorCodes', async (req, res) => {
    try{
        const httpData = await fetch(
            'https://api.chzzk.naver.com/service/v2/nickname/color/codes',
            {headers: agentHeaders}
        );
        const resData = await httpData.json();
        res.type("application/json");
        res.send(resData.content?.codeList || []);
    }catch{
        res.sendStatus(404);
    }
});
app.get('*', (req, res) => res.redirect('/'))

const PORT = process.env.HTTP_PORT || 6633;
app.listen(PORT, () => {
    console.log(`서버가 ${PORT} 포트에서 실행 중입니다.`);
});