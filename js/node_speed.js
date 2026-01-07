/**
 * Egern Panel - Final
 * 节点出口信息 + 实时测速（仿 Surge）
 */

function flag(code) {
  if (!code || code.length !== 2) return "🏳️"
  return String.fromCodePoint(
    0x1F1E6 + code.charCodeAt(0) - 65,
    0x1F1E6 + code.charCodeAt(1) - 65
  )
}

async function run() {
  try {
    // 出口 IP 信息
    const ipRes = await $http.get({
      url: "https://ipapi.co/json/",
      timeout: 5000
    })

    const ip = JSON.parse(ipRes.body)
    const country = ip.country_code || "??"
    const city = ip.city || "Unknown"
    const asn = ip.asn || "ASN"
    const ipAddr = ip.ip || ""

    // 测速
    const sizeMB = 5
    const testUrl = `https://speed.cloudflare.com/__down?bytes=${sizeMB * 1024 * 1024}`

    const start = Date.now()
    await $http.get(testUrl)
    const sec = (Date.now() - start) / 1000
    const mbps = ((sizeMB * 8) / sec).toFixed(1)

    // 延迟
    const pingStart = Date.now()
    await $http.get("https://www.cloudflare.com/cdn-cgi/trace")
    const ping = Date.now() - pingStart

    return `${flag(country)} ${country} · ${city}\n${asn} · ${ipAddr}\n⬇️ ${mbps} Mbps · ⏱ ${ping} ms`
  } catch (e) {
    return "❌ 节点测速失败"
  }
}

await run()
