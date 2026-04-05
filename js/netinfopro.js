/**
 * 📌 桌面小组件: 🛡️ 网络诊断雷达 (全栈解锁 Pro 版 - 全彩终端优化版)
 * 🍏 全彩字体适配 | 服务器监控面板同款深色主题 | 中轴分割线 | 双延迟 | 影视+AI全解锁检测
 */
export default async function(ctx) {
  // 1. 全局系统配色 - 全彩终端风格，完全匹配参考面板
  // 背景色：参考面板同款深黑底
  const BG_COLORS = [{ light: '#14141B', dark: '#14141B' }, { light: '#14141B', dark: '#14141B' }];
  // 基础文字色
  const C_WHITE = { light: '#FFFFFF', dark: '#FFFFFF' };    // 主标题纯白
  const C_GRAY = { light: '#8E8E98', dark: '#8E8E98' };     // 辅助说明浅灰
  const C_DIVIDER = { light: 'rgba(255,255,255,0.1)', dark: 'rgba(255,255,255,0.1)' }; // 分割线

  // 全彩模块专属色 - 对应参考面板彩色风格
  const COLOR = {
    green: { light: '#50FA7B', dark: '#50FA7B' },    // 本地模块/成功/健康 亮绿
    yellow: { light: '#F1FA8C', dark: '#F1FA8C' },   // 数值/中等风险 亮黄
    purple: { light: '#BD93F9', dark: '#BD93F9' },   // 代理模块/AI 浅紫
    pink: { light: '#FF79C6', dark: '#FF79C6' },     // 网络/出口 粉紫
    blue: { light: '#8BE9FD', dark: '#8BE9FD' },     // IP/地址 青蓝
    orange: { light: '#FFB86C', dark: '#FFB86C' },   // 机房属性 暖橙
    red: { light: '#FF5555', dark: '#FF5555' },      // 失败/高危 亮红
    cyan: { light: '#00FFFF', dark: '#00FFFF' }       // 厂商/特殊标识 青色
  };

  // --- 辅助与解析函数 ---
  const fmtProxyISP = (isp) => {
    if (!isp) return "未知";
    let s = String(isp);
    if (/it7/i.test(s)) return "IT7 Network";
    if (/dmit/i.test(s)) return "DMIT Network";
    if (/cloudflare/i.test(s)) return "Cloudflare";
    if (/akamai/i.test(s)) return "Akamai";
    if (/amazon|aws/i.test(s)) return "AWS";
    if (/google/i.test(s)) return "Google Cloud";
    if (/microsoft|azure/i.test(s)) return "Azure";
    if (/alibaba|aliyun/i.test(s)) return "阿里云";
    if (/tencent/i.test(s)) return "腾讯云";
    if (/oracle/i.test(s)) return "Oracle Cloud";
    return s.length > 11 ? s.substring(0, 11) + "..." : s; 
  };

  const getFlag = (code) => {
    if (!code || code.toUpperCase() === 'TW') return '🇨🇳'; 
    if (code.toUpperCase() === 'XX' || code === 'OK') return '✅';
    return String.fromCodePoint(...code.toUpperCase().split('').map(c => 127397 + c.charCodeAt()));
  };

  const BASE_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";
  const commonHeaders = { "User-Agent": BASE_UA, "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8" };
  const readBody = async (r) => {
    if (!r) return "";
    if (typeof r.body === "string" && r.body.length) return r.body;
    if (typeof r.text === "function") {
      try { const t = await r.text(); return typeof t === "string" ? t : ""; } catch { return ""; }
    }
    return "";
  };

  // 2. 获取本地网络数据
  const d = ctx.device || {};
  const isWifi = !!d.wifi?.ssid;
  let netName = "未连接", netIcon = "antenna.radiowaves.left.and.right";
  
  const netInfo = (typeof $network !== 'undefined') ? $network : (ctx.network || {});
  let localIp = netInfo.v4?.primaryAddress || d.ipv4?.address || "获取失败";
  let gateway = netInfo.v4?.primaryRouter || d.ipv4?.gateway || "无网关";

  if (isWifi) { netName = d.wifi.ssid; netIcon = "wifi"; }
  else if (d.cellular?.radio) {
    const radioMap = { "GPRS": "2.5G", "EDGE": "2.75G", "WCDMA": "3G", "LTE": "4G", "NR": "5G", "NRNSA": "5G" };
    netName = `${radioMap[d.cellular.radio.toUpperCase().replace(/\s+/g, "")] || d.cellular.radio}`;
    gateway = "蜂窝内网";
  }

  // 3. 基础网络请求
  const fetchLocal = async () => {
    try {
      const res = await ctx.http.get('https://myip.ipip.net/json', { headers: commonHeaders, timeout: 4000 });
      const body = JSON.parse(await res.text());
      if (body?.data?.ip) return { ip: body.data.ip, loc: `${body.data.location[1] || ""} ${body.data.location[2] || ""}`.trim() };
    } catch (e) {}
    return { ip: "获取失败", loc: "未知" };
  };

  const fetchProxy = async () => {
    try {
      const res = await ctx.http.get('http://ip-api.com/json/?lang=zh-CN', { timeout: 4000 });
      const data = JSON.parse(await res.text());
      const flag = getFlag(data.countryCode);
      return { ip: data.query || "获取失败", loc: `${flag} ${data.city || data.country || ""}`.trim(), isp: fmtProxyISP(data.isp || data.org), cc: data.countryCode || "XX" };
    } catch (e) { return { ip: "获取失败", loc: "未知", isp: "未知", cc: "XX" }; }
  };

  const fetchPurity = async () => {
    try {
      const res = await ctx.http.get('https://my.ippure.com/v1/info', { timeout: 4000 });
      return JSON.parse(await res.text());
    } catch (e) { return {}; }
  };

  const fetchLocalDelay = async () => {
    const start = Date.now();
    try { await ctx.http.get('http://www.baidu.com', { timeout: 2000 }); return `${Date.now() - start} ms`; } catch (e) { return "超时"; }
  };

  const fetchProxyDelay = async () => {
    const start = Date.now();
    try { await ctx.http.get('http://cp.cloudflare.com/generate_204', { timeout: 2000 }); return `${Date.now() - start} ms`; } catch (e) { return "超时"; }
  };

  // 🎬 流媒体解锁测试 
  async function checkNetflix() {
    try {
      const checkStatus = async (id) => {
        const r = await ctx.http.get(`https://www.netflix.com/title/${id}`, { timeout: 4000, headers: commonHeaders, followRedirect: false }).catch(() => null);
        return r ? r.status : 0;
      };
      const sFull = await checkStatus(70143836); 
      const sOrig = await checkStatus(81280792); 
      
      if (sFull === 200) return "OK"; 
      if (sOrig === 200) return "🍿"; 
      return "❌"; 
    } catch { return "❌"; }
  }

  async function checkDisney() {
    try {
      const res = await ctx.http.get("https://www.disneyplus.com", { timeout: 4000, headers: commonHeaders, followRedirect: false }).catch(() => null);
      if (!res || res.status === 403) return "❌";
      const loc = res.headers?.location || res.headers?.Location || "";
      if (loc.includes("unavailable")) return "❌";
      return "OK"; 
    } catch { return "❌"; }
  }

  async function checkTikTok() {
    try {
      const r = await ctx.http.get("https://www.tiktok.com/explore", { timeout: 4000, headers: commonHeaders, followRedirect: false }).catch(() => null);
      if (!r || r.status === 403 || r.status === 401) return "❌";
      const body = await readBody(r);
      if (body.includes("Access Denied") || body.includes("Please wait...")) return "❌";
      const m = body.match(/"region":"([A-Z]{2})"/i);
      return m?.[1] ? m[1].toUpperCase() : "OK";
    } catch { return "❌"; }
  }

  // 🤖 AI 解锁测试
  async function checkChatGPT() {
    try {
      const traceRes = await ctx.http.get("https://chatgpt.com/cdn-cgi/trace", { timeout: 3000 }).catch(() => null);
      const tb = await readBody(traceRes);
      const m = tb?.match(/loc=([A-Z]{2})/);
      return m?.[1] ? m[1].toUpperCase() : "OK";
    } catch { return "❌"; }
  }

  async function checkClaude() {
    try {
      const res = await ctx.http.get("https://claude.ai/login", { 
        timeout: 5000, 
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      }).catch(() => null);
      
      if (!res) return "❌";
      const status = res.status;
      const body = await readBody(res);

      if (body.includes("App unavailable") || body.includes("certain regions")) return "❌";
      if (status === 403 && body.includes("1020")) return "❌";
      if (status === 403 && (body.includes("cf-turnstile") || body.includes("Just a moment") || body.includes("Challenge"))) return "OK";
      if (status === 200 || status === 301 || status === 302) return "OK";

      return "❌";
    } catch { return "❌"; }
  }

  async function checkGemini() {
    try {
      const res = await ctx.http.get("https://gemini.google.com/app", { timeout: 4000, headers: commonHeaders, followRedirect: false }).catch(() => null);
      if (!res) return "❌";
      const loc = res.headers?.location || res.headers?.Location || "";
      if (loc.includes("faq")) return "❌";
      return "OK";
    } catch { return "❌"; }
  }

  // 🚦 并发执行所有核心网络请求
  const [localData, proxyData, purityData, localDelay, proxyDelay, rNF, rDP, rTK, rGPT, rCL, rGM] = await Promise.all([
    fetchLocal(), fetchProxy(), fetchPurity(), fetchLocalDelay(), fetchProxyDelay(),
    checkNetflix(), checkDisney(), checkTikTok(), 
    checkChatGPT(), checkClaude(), checkGemini()
  ]);

  // 4. 数据清洗与动态配色逻辑
  const isRes = purityData.isResidential;
  let nativeText = "未知属性", nativeIc = "questionmark.building.fill", nativeCol = C_GRAY;
  if (isRes === true) { nativeText = "原生住宅"; nativeIc = "house.fill"; nativeCol = COLOR.green; } 
  else if (isRes === false) { nativeText = "商业机房"; nativeIc = "building.2.fill"; nativeCol = COLOR.orange; }

  const risk = purityData.fraudScore;
  let riskTxt = "无数据", riskCol = C_GRAY, riskIc = "questionmark.circle.fill";
  if (risk !== undefined) {
    if (risk >= 70) { riskTxt = `高危 (${risk})`; riskCol = COLOR.red; riskIc = "xmark.shield.fill"; } 
    else if (risk >= 30) { riskTxt = `中危 (${risk})`; riskCol = COLOR.yellow; riskIc = "exclamationmark.triangle.fill"; } 
    else { riskTxt = `纯净 (${risk})`; riskCol = COLOR.green; riskIc = "checkmark.shield.fill"; }
  }

  // 解锁状态彩色格式化
  const fmtUnlock = (name, res, cc) => {
    let flag = "🚫";
    let textColor = COLOR.red;
    if (res === "🍿" || res === "APP") {
      flag = res;
      textColor = COLOR.yellow;
    } else if (res !== "❌") {
      flag = getFlag(res === "OK" || res === "XX" ? cc : res);
      textColor = COLOR.green;
    }
    return { text: `${name} ${flag}`, color: textColor };
  };
  
  // 流媒体解锁彩色文本
  const nfRes = fmtUnlock('NF', rNF, proxyData.cc);
  const dpRes = fmtUnlock('DP', rDP, proxyData.cc);
  const tkRes = fmtUnlock('TK', rTK, proxyData.cc);
  // AI解锁彩色文本
  const gptRes = fmtUnlock('GPT', rGPT, proxyData.cc);
  const clRes = fmtUnlock('CL', rCL, proxyData.cc);
  const gmRes = fmtUnlock('GM', rGM, proxyData.cc);

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const TIME_COL = { light: 'rgba(255,255,255,0.3)', dark: 'rgba(255,255,255,0.3)' };

  // 5. 全彩网格行组件 - 支持标签和数值分别自定义颜色
  const Row = (ic, icCol, label, labelCol, val, valCol) => ({
    type: 'stack', direction: 'row', alignItems: 'center', gap: 5,
    children: [
      { type: 'image', src: `sf-symbol:${ic}`, color: icCol, width: 11, height: 11 },
      { type: 'text', text: label, font: { size: 10, weight: 'regular' }, textColor: labelCol, maxLines: 1 }, 
      { type: 'spacer' },
      { type: 'text', text: val, font: { size: 10, weight: 'medium' }, textColor: valCol, maxLines: 1, minScale: 0.4 }
    ]
  });

  // 6. 最终渲染 - 全彩双列布局
  return {
    type: 'widget', padding: 14,
    backgroundGradient: { type: 'linear', colors: BG_COLORS, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } },
    children: [
      // 顶部 Header - 主标题纯白高亮
      { type: 'stack', direction: 'row', alignItems: 'center', gap: 6, children: [
          { type: 'image', src: 'sf-symbol:waveform.path.ecg', color: COLOR.green, width: 16, height: 16 },
          { type: 'text', text: '网络诊断雷达', font: { size: 14, weight: 'bold' }, textColor: C_WHITE },
          { type: 'spacer' },
          { type: 'text', text: timeStr, font: { size: 10, weight: 'medium' }, textColor: TIME_COL }
      ]},
      { type: 'spacer', length: 12 },
      
      // 双列网格 + 中轴线
      { type: 'stack', direction: 'row', gap: 10, children: [
          
          // 【左列】：本地网络模块 - 绿/蓝/黄 彩色体系
          { type: 'stack', direction: 'column', gap: 4.5, flex: 1, children: [
              Row(netIcon, COLOR.green, "环境", COLOR.green, netName, C_WHITE),
              Row("wifi.router.fill", COLOR.blue, "网关", COLOR.blue, gateway, C_WHITE),
              Row("iphone", COLOR.cyan, "内网", COLOR.cyan, localIp, C_WHITE),
              Row("globe.asia.australia.fill", COLOR.purple, "公网", COLOR.purple, localData.ip, C_WHITE),
              Row("map.fill", COLOR.yellow, "位置", COLOR.yellow, localData.loc, C_WHITE),
              Row("timer", COLOR.orange, "延迟", COLOR.orange, localDelay, C_WHITE),
              // 流媒体解锁行 - 多色拼接
              {
                type: 'stack', direction: 'row', alignItems: 'center', gap: 5,
                children: [
                  { type: 'image', src: 'sf-symbol:play.tv.fill', color: COLOR.pink, width: 11, height: 11 },
                  { type: 'text', text: "影视", font: { size: 10, weight: 'regular' }, textColor: COLOR.pink, maxLines: 1 },
                  { type: 'spacer' },
                  { type: 'text', text: nfRes.text, font: { size: 10, weight: 'medium' }, textColor: nfRes.color, maxLines: 1 },
                  { type: 'text', text: dpRes.text, font: { size: 10, weight: 'medium' }, textColor: dpRes.color, maxLines: 1, margin: { left: 6 } },
                  { type: 'text', text: tkRes.text, font: { size: 10, weight: 'medium' }, textColor: tkRes.color, maxLines: 1, margin: { left: 6 } }
                ]
              }
          ]},

          // 中轴线分割线
          { type: 'stack', width: 0.5, backgroundColor: C_DIVIDER },
          
          // 【右列】：代理/AI模块 - 粉紫/紫/青 彩色体系（代理模块专属强化）
          { type: 'stack', direction: 'column', gap: 4.5, flex: 1, children: [
              Row("paperplane.fill", COLOR.pink, "出口", COLOR.pink, proxyData.ip, C_WHITE),
              Row("mappin.and.ellipse", COLOR.purple, "落地", COLOR.purple, proxyData.loc, C_WHITE),
              Row("server.rack", COLOR.cyan, "厂商", COLOR.cyan, proxyData.isp, C_WHITE),
              Row(nativeIc, nativeCol, "属性", nativeCol, nativeText, C_WHITE),
              Row(riskIc, riskCol, "纯净", riskCol, riskTxt, riskCol),
              Row("timer", COLOR.orange, "延迟", COLOR.orange, proxyDelay, C_WHITE),
              // AI解锁行 - 多色拼接
              {
                type: 'stack', direction: 'row', alignItems: 'center', gap: 5,
                children: [
                  { type: 'image', src: 'sf-symbol:cpu', color: COLOR.purple, width: 11, height: 11 },
                  { type: 'text', text: "AI", font: { size: 10, weight: 'regular' }, textColor: COLOR.purple, maxLines: 1 },
                  { type: 'spacer' },
                  { type: 'text', text: gptRes.text, font: { size: 10, weight: 'medium' }, textColor: gptRes.color, maxLines: 1 },
                  { type: 'text', text: clRes.text, font: { size: 10, weight: 'medium' }, textColor: clRes.color, maxLines: 1, margin: { left: 6 } },
                  { type: 'text', text: gmRes.text, font: { size: 10, weight: 'medium' }, textColor: gmRes.color, maxLines: 1, margin: { left: 6 } }
                ]
              }
          ]}
      ]},
      { type: 'spacer' }
    ]
  };
}