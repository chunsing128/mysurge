// 摩托范 Surge 脚本 with Cookie获取
// 支持: https://t.me/sudojia
// 更新时间: 2024-08-27

const $ = $substore;
const console = {
    log: (message) => $notify("摩托范", "", message),
    error: (message) => $notify("摩托范 错误", "", message)
};

// 从环境变量获取账号信息
const motoList = $environment["MOTO_TOKEN"] ? $environment["MOTO_TOKEN"].split(/[\n&]/) : [];

// 接口地址
const baseUrl = 'https://api.58moto.com';

// 持久化存储Cookie
const cookieKey = "motofan_cookies";
let cookies = $persistentStore.read(cookieKey) ? JSON.parse($persistentStore.read(cookieKey)) : {};

(async () => {
    if (typeof $request !== "undefined") {
        // 如果是请求拦截模式，处理Cookie获取
        await handleCookieCapture();
    } else {
        // 正常执行签到流程
        await executeSignTask();
    }
})();

async function handleCookieCapture() {
    const url = $request.url;
    const headers = $request.headers;
    
    if (url.includes("api.58moto.com/user/center/info")) {
        const token = headers["token"];
        const uidMatch = url.match(/uid=(\d+)/);
        const uid = uidMatch ? uidMatch[1] : null;
        
        if (token && uid) {
            cookies[uid] = {
                token: token,
                uid: uid,
                updateTime: new Date().getTime()
            };
            $persistentStore.write(JSON.stringify(cookies), cookieKey);
            console.log(`成功获取UID:${uid}的Token`);
        }
    }
    
    $done({});
}

async function executeSignTask() {
    // 优先使用环境变量配置的账号
    if (motoList.length > 0) {
        for (let i = 0; i < motoList.length; i++) {
            const index = i + 1;
            const [token, uid] = motoList[i].split('#');
            
            const headers = getHeaders(token);
            console.log(`\n*****第[${index}]个摩托范账号(环境变量)*****`);
            await main(headers, uid);
            await $.wait(getRandomWait(2000, 2500));
        }
    }
    
    // 其次使用抓取的Cookie
    if (Object.keys(cookies).length > 0) {
        console.log("\n*****开始处理抓取的Cookie账号*****");
        for (const uid in cookies) {
            const account = cookies[uid];
            // 检查Cookie是否过期（7天）
            if (new Date().getTime() - account.updateTime > 7 * 24 * 60 * 60 * 1000) {
                delete cookies[uid];
                continue;
            }
            
            const headers = getHeaders(account.token);
            console.log(`\n*****摩托范账号(抓取Cookie) UID:${uid}*****`);
            await main(headers, uid);
            await $.wait(getRandomWait(2000, 2500));
        }
        // 更新存储的Cookie
        $persistentStore.write(JSON.stringify(cookies), cookieKey);
    }
}

function getHeaders(token) {
    return {
        'User-Agent': 'okhttp/4.11.0',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept-Encoding': 'gzip',
        'os': 'OPPO:OPPO+R9s',
        'osversion': '28',
        'referer': 'api.58moto.com',
        'version': '3.57.63',
        'timestamp': Date.now().toString(),
        'token': token
    };
}

async function main(headers, uid) {
    await getUserInfo(headers, uid);
    await $.wait(getRandomWait(800, 1200));
    await isSign(headers, uid);
    await $.wait(getRandomWait(1000, 2000));
    await getPoints(headers, uid);
}

async function getUserInfo(headers, uid) {
    try {
        const response = await $http.post({
            url: `${baseUrl}/user/center/info/v2/principal`,
            headers: headers,
            body: `uid=${uid}`
        });
        
        if (response.data.code !== 0) {
            return console.log(response.data.msg);
        }
        
        const data = response.data.data;
        const mobile = data.mobile;
        const hiddenMobile = `${mobile.slice(0, 3)}***${mobile.slice(-3)}` || '18888888888';
        console.log(`${data.nickname}(${hiddenMobile})`);
        headers.token = data.token;
        
        // 更新Cookie
        if (cookies[uid]) {
            cookies[uid].token = data.token;
            cookies[uid].updateTime = new Date().getTime();
            $persistentStore.write(JSON.stringify(cookies), cookieKey);
        }
    } catch (e) {
        console.error(`获取用户信息时发生异常：` + e);
    }
}

// ... 保持原有的 isSign, sign, getPoints 函数不变 ...

function getRandomWait(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}