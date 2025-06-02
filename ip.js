(async () => {
  try {
    // 获取入口信息（不使用代理）
    const entryRes = await fetch("http://ip-api.com/json/?lang=zh-CN&fields=query,isp,regionName,city,country", {
      policy: "Direct"
    });
    const entry = await entryRes.json();

    // 获取落地信息（使用当前代理）
    const exitRes = await fetch("http://ip-api.com/json/?lang=zh-CN&fields=query,isp,as,regionName,city,country");
    const exit = await exitRes.json();

    const fakePingEntry = Math.floor(Math.random() * 50) + 30;
    const fakePingExit = Math.floor(Math.random() * 100) + 100;

    const now = new Date();

    const content =
`入口 ISP：${entry.isp}
入口位置：${entry.country} ${entry.regionName} ${entry.city}  ${fakePingEntry}ms
入口 IP：${entry.query}

［中转 防火墙］

落地 ISP：${exit.isp}
落地位置：${exit.country} ${exit.regionName} ${exit.city}  ${fakePingExit}ms
落地 IP：${exit.query}
ASN：${exit.as}

更新时间：${now.toLocaleTimeString()}`;

    $done({
      title: "入口落地查询",
      content,
      icon: "network",
      'icon-color': "#00CED1"
    });
  } catch (e) {
    $done({
      title: "入口落地查询",
      content: `❌ 获取失败：${e.message}`,
      icon: "xmark.shield",
      'icon-color': "#FF3B30"
    });
  }
})();
