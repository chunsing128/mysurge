// 摩托范自动抓取 Token (Surge 脚本)
const BASE_URL = "https://api.58moto.com";

// 监听摩托范 API 请求
$httpClient.get(BASE_URL, (error, response, data) => {
  if (error) {
    console.log(`请求失败: ${error}`);
    $done();
    return;
  }

  // 检查是否是摩托范 API 请求
  if (response.headers?.["token"]) {
    const token = response.headers["token"];
    const uid = response.headers["uid"] || extractUidFromResponse(data);

    if (token && uid) {
      const storedTokens = $persistentStore.read("MOTO_TOKENS") || "";
      const newTokenEntry = `${token}#${uid}`;

      // 避免重复存储
      if (!storedTokens.includes(newTokenEntry)) {
        const updatedTokens = storedTokens ? `${storedTokens}&${newTokenEntry}` : newTokenEntry;
        $persistentStore.write(updatedTokens, "MOTO_TOKENS");
        console.log(`✅ 成功获取 Token: ${token}#${uid}`);
        $notification.post("摩托范 Token 获取", `UID: ${uid}`, `Token: ${token}`);
      } else {
        console.log("⚠️ Token 已存在，无需重复存储");
      }
    }
  }

  $done();
});

// 从响应数据中提取 UID（如果不在 Header 里）
function extractUidFromResponse(data) {
  try {
    const jsonData = JSON.parse(data);
    return jsonData?.data?.uid || jsonData?.uid || "";
  } catch (e) {
    return "";
  }
}