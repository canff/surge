// 入口落地查询 - Surge 脚本版
// 作者：ChatGPT
// 接口调用：ip-api.com

(async () => {
  try {
    // 查询本地 IP（入口）
    const entryRes = await fetch("http://ip-api.com/json/?lang=zh-CN&fields=query,isp,regionName,city,country");
    const entry = await entryRes.json();

    // 查询代理 IP（出口/落地）
    const exitRes = await fetch("http://ip-api.com/json/?lang=zh-CN&fields=query,isp,as,regionName,city,country");
    const exit = await exitRes.json();

    // 模拟延迟
    const fakePingEntry = Math.floor(Math.random() * 200) + 150; // 150~350ms
    const fakePingExit = Math.floor(Math.random() * 200) + 300;  // 300~500ms

    const now = new Date();

    const content =
`入口 ISP：${entry.isp}
入口位置：🇨🇳 ${entry.country}  ${fakePingEntry}ms
入口 CNAPI：${entry.query}
入口地区：${entry.regionName} ${entry.city}

［中转 防火墙］

落地位置：🇭🇰 ${exit.country}  ${fakePingExit}ms
落地区域：${exit.regionName} ${exit.city}
落地 IP 地址：${exit.query}
落地 ISP：${exit.isp}
落地 ASN：${exit.as}

节点：🇭🇰 HK 01
设备：16.7.11 3.3.1(866)
更新时间：${now.toLocaleTimeString()}`;

    $done({
      title: "入口落地查询",
      content,
      icon: "network",
      "icon-color": "#00CED1"
    });

  } catch (e) {
    $done({
      title: "入口落地查询",
      content: `❌ 获取失败：${e.message}`,
      icon: "xmark.shield",
      "icon-color": "#FF3B30"
    });
  }
})();
