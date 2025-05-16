// 摩托范 Surge 签到脚本
const BASE_URL = "https://api.58moto.com";
const MOTO_TOKENS = $persistentStore.read("MOTO_TOKENS")?.split(/[\n&]/) || [];

(async () => {
  try {
    for (const tokenInfo of MOTO_TOKENS) {
      const [token, uid] = tokenInfo.split("#");
      const headers = {
        "User-Agent": "okhttp/4.11.0",
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept-Encoding": "gzip",
        os: "OPPO:OPPO+R9s",
        osversion: "28",
        referer: "api.58moto.com",
        version: "3.57.63",
        timestamp: Date.now().toString(),
        token: token,
      };

      await getUserInfo(headers, uid);
      await $delay(1000);
      await checkSign(headers, uid);
      await $delay(2000);
      await getEnergy(headers, uid);
    }
  } catch (err) {
    console.log(`脚本运行异常: ${err}`);
    $notification.post("摩托范", "脚本运行异常", err.message || "未知错误");
  } finally {
    $done(); // 必须调用 $done() 结束脚本
  }
})();

function getUserInfo(headers, uid) {
  return new Promise((resolve) => {
    const url = `${BASE_URL}/user/center/info/v2/principal`;
    const body = `uid=${uid}`;
    $httpClient.post({ url, headers, body }, (error, response, data) => {
      if (error) {
        console.log(`获取用户信息失败: ${error}`);
        return resolve();
      }
      const result = JSON.parse(data);
      if (result.code === 0) {
        const user = result.data;
        const mobile = user.mobile ? `${user.mobile.slice(0, 3)}***${user.mobile.slice(-3)}` : "未知";
        console.log(`用户: ${user.nickname} (${mobile})`);
        $notification.post("摩托范", `用户: ${user.nickname}`, `手机号: ${mobile}`);
      }
      resolve();
    });
  });
}

function checkSign(headers, uid) {
  return new Promise((resolve) => {
    const url = `${BASE_URL}/coins/task/v2/isSign?uid=${uid}`;
    $httpClient.get({ url, headers }, (error, response, data) => {
      if (error) {
        console.log(`检查签到失败: ${error}`);
        return resolve();
      }
      const result = JSON.parse(data);
      if (result.code === 0 && !result.data.isSign) {
        doSign(headers, uid).then(resolve);
      } else {
        console.log("今日已签到");
        resolve();
      }
    });
  });
}

function doSign(headers, uid) {
  return new Promise((resolve) => {
    const url = `${BASE_URL}/coins/task/dailyCheckIn`;
    const body = `uid=${uid}&weekDate=${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
    $httpClient.post({ url, headers, body }, (error, response, data) => {
      if (error) {
        console.log(`签到失败: ${error}`);
        return resolve();
      }
      const result = JSON.parse(data);
      if (result.code === 0) {
        console.log("签到成功");
        $notification.post("摩托范", "签到成功", result.data.contentDesc || "签到成功");
      }
      resolve();
    });
  });
}

function getEnergy(headers, uid) {
  return new Promise((resolve) => {
    const url = `${BASE_URL}/coins/account/energy?uid=${uid}`;
    $httpClient.get({ url, headers }, (error, response, data) => {
      if (error) {
        console.log(`获取能量失败: ${error}`);
        return resolve();
      }
      const result = JSON.parse(data);
      if (result.code === 0) {
        console.log(`当前能量: ${result.data.available}`);
        $notification.post("摩托范", "当前能量", `能量值: ${result.data.available}`);
      }
      resolve();
    });
  });
}