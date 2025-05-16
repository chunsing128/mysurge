// surge-moto-signin-complete.js v3.0
const BASE_URL = 'https://api.58moto.com'
const headers = {
    'User-Agent': 'okhttp/4.11.0',
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept-Encoding': 'gzip',
    'os': 'OPPO:OPPO+R9s',
    'osversion': '28',
    'referer': BASE_URL,
    'version': '3.57.63',
    'timestamp': Date.now()
}

// 环境变量验证函数
const validateEnv = () => {
    const requiredVars = ['MOTO_TOKENS']
    for (const varName of requiredVars) {
        if (!$env[varName]) {
            $notify('致命错误', '', `缺少必要环境变量: ${varName}`)
            $done()
        }
    }
}

// 多账号解析
const parseAccounts = () => {
    try {
        return $env.MOTO_TOKENS.split('\n').map(item => {
            const [token, uid] = item.split('#')
            if (!token || !uid) throw new Error('账号格式错误')
            return { token, uid }
        })
    } catch (err) {
        $notify('配置错误', '', err.message)
        $done()
    }
}

// 主执行流程
!(async () => {
    try {
        validateEnv()
        const accounts = parseAccounts()
        let results = []
        
        for (const account of accounts) {
            try {
                headers.token = account.token
                const userInfo = await getUserInfo(account.uid)
                const signInRes = await checkAndSign(account.uid)
                const points = await getEnergyPoints(account.uid)
                results.push(`【${account.uid}】\n${userInfo}\n签到结果：${signInRes}\n能量值：${points}\n`);
            } catch (err) {
                results.push(`【${account.uid}】异常: ${err.message}`);
                await $task.delay(sudojia.getRandomDelay(3000, 5000));
                continue;
            }
            await $task.delay(sudojia.getRandomDelay(2000, 2500));
        }
        
        // 生成报告
        const report = results.join('\n\n') + `\n\n执行时间：${new Date().toLocaleString()}`;
        await $file.write('/sdcard/signin.log', report);
        await notify.sendNotify('摩托范签到报告', report);
    } catch (err) {
        $notify('严重错误', '', err.stack);
    } finally {
        $done();
    }
})()

// 核心功能函数
async function getUserInfo(uid) {
    const response = await $task.fetch(`${BASE_URL}/user/center/info/v2/principal`, {
        method: 'POST',
        headers,
        body: `uid=${uid}`
    });
    
    if (response.body.code !== 0) throw new Error(response.body.msg);
    const data = response.body.data;
    headers.token = data.token;
    return `${maskPhone(data.mobile)} (${data.nickname})`;
}

async function checkAndSign(uid) {
    const isSigned = await checkSignInStatus(uid);
    if (isSigned) return '今日已签到';
    
    const response = await performSignIn(uid);
    return response.data.contentDesc || '签到成功';
}

async function performSignIn(uid) {
    return $task.fetch(`${BASE_URL}/coins/task/dailyCheckIn`, {
        method: 'POST',
        headers,
        body: `uid=${uid}&weekDate=${moment().format('YYYYMMDD')}`
    });
}

// 辅助函数
const maskPhone = (num) => num.replace(/(\d{3})\d{4}(\d{3})/, '$1***$2');
const log = (msg) => $file.append('/sdcard/signin.log', `[${new Date().toISOString()}] ${msg}\n`);
