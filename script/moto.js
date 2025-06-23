/**
 * @fileoverview 摩托范一体化脚本（抓 token + 签到）
 * @version 1.0.0
 * @author sudojia
 *
 * [Script]
 * http-request ^https:\/\/api\.58moto\.com\/user\/center\/info\/v2\/principal script-path=moto.js, requires-body=true, timeout=10, tag=摩托范Token抓取
 * cron "33 3 * * *" script-path=moto.js, timeout=30, tag=摩托范自动签到
 */

const isRequest = typeof $request !== "undefined";
const isCron = typeof $request === "undefined";

// 公共配置
const BASE_URL = 'https://api.58moto.com';
const KEY = 'MOTO_TOKEN';
const headers = {
  'User-Agent': 'okhttp/4.11.0',
  'Content-Type': 'application/x-www-form-urlencoded',
  'Accept-Encoding': 'gzip',
  'os': 'OPPO:OPPO+R9s',
  'osversion': '28',
  'referer': 'api.58moto.com',
  'version': '3.57.63'
};

// 自动抓 token（请求拦截执行）
if (isRequest) {
  autoCaptureToken();
} else if (isCron) {
  main();
}

function autoCaptureToken() {
  try {
    const token = $request.headers.token;
    const body = JSON.parse($response.body || '{}');
    const uid = body?.data?.uid;

    if (token && uid) {
      let existing = $persistentStore.read(KEY) || '';
      let entries = existing ? existing.split(/[\n&]/) : [];

      let index = entries.findIndex(e => e.split('#')[1] === uid);

      if (index === -1) {
        // 第一次新增
        entries.push(`${token}#${uid}`);
        $notification.post("🎉 第一次成功抓取 Token", "", `UID: ${uid}`);
      } else {
        let [oldToken] = entries[index].split('#');
        if (oldToken !== token) {
          // Token 有变，更新
          entries[index] = `${token}#${uid}`;
          $notification.post("🔄 已更新 Token", "", `UID: ${uid}`);
        } else {
          // Token 未变
          $notification.post("ℹ️ 已存在相同 Token", "", `UID: ${uid} 的 Token 已记录`);
        }
      }

      $persistentStore.write(entries.join('&'), KEY);
    } else {
      $notification.post("⚠️ 抓取失败", "", "未获取到 token 或 uid");
    }
  } catch (err) {
    $notification.post("❌ 抓取异常", "", err.message);
  }
  $done();
}

// 主逻辑：签到
async function main() {
  const MOTOs = ($persistentStore.read(KEY) || '').split(/[\n&]/);
  if (MOTOs.length === 0 || !MOTOs[0].includes('#')) {
    $notification.post("⚠️ 摩托范", "", "未配置任何账号，请先使用 App 抓取 token");
    return $done();
  }

  let results = [];

  for (let [index, item] of MOTOs.entries()) {
    const [token, uid] = item.split('#');
    if (!token || !uid) continue;

    headers.token = token;

    try {
      const userRes = await send('POST', '/user/center/info/v2/principal', `uid=${uid}`);
      const name = userRes.data?.nickname || `账号${index + 1}`;
      results.push(`🧍‍♂️ ${name}`);

      const isSign = await send('GET', `/coins/task/v2/isSign?uid=${uid}`);
      if (isSign?.data?.isSign) {
        results.push('✅ 已签到');
      } else {
        const signRes = await send('POST', '/coins/task/dailyCheckIn', `uid=${uid}&weekDate=${formatDate()}`);
        results.push(signRes.code === 0 ? '🎉 签到成功' : `❌ 签到失败：${signRes.msg}`);
      }

      const energy = await send('GET', `/coins/account/energy?uid=${uid}`);
      results.push(`🔋 当前能量：${energy.data?.available ?? '获取失败'}`);
    } catch (err) {
      results.push(`❌ 执行异常：${err.message}`);
    }

    results.push(''); // 分隔
  }

  $notification.post("摩托范签到结果", "", results.join('\n'));
  $done();
}

// 通用请求
function send(method, path, body = '') {
  return new Promise((resolve) => {
    const opts = {
      url: BASE_URL + path,
      headers: headers,
      method,
    };
    if (method === 'POST') opts.body = body;

    $httpClient[method.toLowerCase()](opts, (err, resp, data) => {
      if (err) {
        resolve({ code: -1, msg: err.message });
      } else {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve({ code: -2, msg: 'JSON解析失败' });
        }
      }
    });
  });
}

function formatDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}