/**
 * 📌 桌面小组件 3: 📶 网络信息 (像素级统一字号版)
 */
export default async function(ctx) {
  const BG_COLORS = [{ light: '#0D0D1A', dark: '#0D0D1A' }, { light: '#2D1B69', dark: '#2D1B69' }];
  const C_TITLE = { light: '#FFD700', dark: '#FFD700' };
  const C_SUB = { light: '#A2A2B5', dark: '#A2A2B5' };
  const C_GREEN = { light: '#32D74B', dark: '#32D74B' };
  const C_MAIN = { light: '#FFFFFF', dark: '#FFFFFF' };

  const fmtISP = (isp) => {
    if (!isp) return "未知";
    const s = String(isp).toLowerCase();
    if (/移动|mobile|cmcc/i.test(s)) return "中国移动";
    if (/电信|telecom|chinanet/i.test(s)) return "中国电信";
    if (/联通|unicom/i.test(s)) return "中国联通";
    if (/广电|broadcast|cbn/i.test(s)) return "中国广电";
    return isp; 
  };

  const d = ctx.device || {};
  const isWifi = !!d.wifi?.ssid;
  
  let netName = "未连接", netIcon = "antenna.radiowaves.left.and.right";
  if (isWifi) {
    netName = d.wifi.ssid; 
    netIcon = "wifi";
  } else if (d.cellular?.radio) {
    const radioMap = { "GPRS": "2.5G", "EDGE": "2.75G", "WCDMA": "3G", "LTE": "4G", "NR": "5G (NR)", "NRNSA": "5G (NR)" };
    const rawRadio = d.cellular.radio.toUpperCase().replace(/\s+/g, "");
    netName = `蜂窝: ${radioMap[rawRadio] || rawRadio}`;
  }

  const localIp = d.ipv4?.address || "获取失败";
  const gateway = d.ipv4?.gateway || "获取失败";

  let pubIp = "获取失败", pubLoc = "未知位置", pubIsp = "未知运营商";
  try {
    const res = await ctx.http.get('https://myip.ipip.net/json', { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 4000 });
    const body = JSON.parse(await res.text());
    if (body && body.data) {
      pubIp = body.data.ip || "获取失败";
      const locArr = body.data.location || [];
      pubLoc = `🇨🇳 ${locArr[0] || "中国"} ${locArr[1] || ""} ${locArr[2] || ""}`.trim() || "未知位置";
      pubIsp = fmtISP(locArr[4] || locArr[3]);
    }
  } catch (e) {}

  if (pubIp === "获取失败" || !pubIp) {
    try {
      const res126 = await ctx.http.get('https://ipservice.ws.126.net/locate/api/getLocByIp', { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 4000 });
      const body126 = JSON.parse(await res126.text());
      if (body126 && body126.result) {
        pubIp = body126.result.ip;
        pubLoc = `🇨🇳 中国 ${body126.result.province || ""} ${body126.result.city || ""}`.trim();
        pubIsp = fmtISP(body126.result.operator || body126.result.company);
      }
    } catch (e) {}
  }

  // ✨ 100% 统一 Row 样式：字号全部锁死在 11
  const Row = (ic, icCol, label, val, valCol) => ({
    type: 'stack', direction: 'row', alignItems: 'center', gap: 6,
    children: [
      { type: 'image', src: `sf-symbol:${ic}`, color: icCol, width: 13, height: 13 },
      { type: 'text', text: label, font: { size: 11 }, textColor: C_SUB },
      { type: 'spacer' }, 
      { type: 'text', text: val, font: { size: 11, weight: 'bold', family: 'Menlo' }, textColor: valCol, maxLines: 1, minScale: 0.6 }
    ]
  });

  return {
    type: 'widget', padding: 14,
    backgroundGradient: { type: 'linear', colors: BG_COLORS, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } },
    children: [
      { type: 'stack', direction: 'row', alignItems: 'center', gap: 6, children: [
          { type: 'image', src: `sf-symbol:${netIcon}`, color: C_TITLE, width: 16, height: 16 },
          { type: 'text', text: '网络信息', font: { size: 14, weight: 'heavy' }, textColor: C_TITLE },
          { type: 'spacer' },
          { type: 'text', text: 'Local & Public', font: { size: 9 }, textColor: 'rgba(255,255,255,0.2)' }
      ]},
      { type: 'spacer', length: 12 },
      { type: 'stack', direction: 'column', gap: 4, children: [
          Row("network", { light: '#00AAE4', dark: '#00AAE4' }, "当前连接", netName, C_GREEN),
          Row("iphone", { light: '#32D74B', dark: '#32D74B' }, "内网 IP", localIp, C_GREEN),
          Row("wifi.router.fill", { light: '#FF9500', dark: '#FF9500' }, "路由网关", gateway, C_GREEN),
          { type: 'spacer', length: 2 },
          Row("globe", { light: '#9945FF', dark: '#9945FF' }, "直连公网", pubIp, C_GREEN),
          Row("mappin.and.ellipse", { light: '#9945FF', dark: '#9945FF' }, "所在位置", pubLoc, C_MAIN),
          Row("antenna.radiowaves.left.and.right", { light: '#9945FF', dark: '#9945FF' }, "运营商", pubIsp, C_MAIN)
      ]},
      { type: 'spacer' }
    ]
  };
}