// 天气通勤舒适度小组件 (美化增强版)
// 特性：优化了行间距、色彩层次与 UI 呼吸感

var CACHE_KEY = "weather_commute_cache_v2";
var DEFAULT_REFRESH_MINUTES = 30;
var HISTORY_DAYS = 7;
var RAIN_ALERT_WINDOW_HOURS = 2;
var RAIN_ALERT_POP_THRESHOLD = 50;
var RAIN_ALERT_PRECIP_THRESHOLD = 0.2;

export default async function (ctx) {
    var env = ctx.env || {};
    var family = ctx.widgetFamily || "systemMedium";

    var title = env.TITLE || "天气通勤舒适度";
    var accentInput = String(env.ACCENT_COLOR || "").trim();
    var refreshMinutes = clampNumber(env.REFRESH_MINUTES || DEFAULT_REFRESH_MINUTES, 5, 1440);
    var refreshIntervalMs = refreshMinutes * 60 * 1000;
    var forceRefresh = isTrue(env.FORCE_REFRESH);

    var host = normalizeHost(env.HOST || "");
    var apiKey = String(env.API_KEY || "").trim();
    var location = String(env.LOCATION || "").trim();
    var locationNameInput = String(env.LOCATION_NAME || "").trim();

    if (!host) return errorWidget("缺少配置", "请设置 HOST (和风天气)");
    if (!apiKey) return errorWidget("缺少配置", "请设置 API_KEY (和风天气)");
    if (!location) return errorWidget("缺少位置", "请设置 LOCATION (经纬度/LocationID)");

    var cached = loadCache(ctx);
    var data = null;
    var now = Date.now();
    var cacheReady = cached && cached.now;
    var cacheFresh = cacheReady && cached.ts && (now - cached.ts < refreshIntervalMs);
    var useCacheOnly = cacheFresh && !forceRefresh;
    var fetched = false;

    if (useCacheOnly) {
        data = cached;
    } else {
        try {
            data = await fetchAllWeather(ctx, {
                host: host,
                apiKey: apiKey,
                location: location
            });
            data = attachHistory(cached, data);
            saveCache(ctx, data);
            fetched = true;
        } catch (e) {
            console.log("weather fetch error: " + safeMsg(e));
            if (cacheReady) {
                data = cached;
            } else {
                return errorWidget("获取失败", safeMsg(e));
            }
        }
    }

    var locationName = resolveLocationName(locationNameInput, data.locationInfo, location);
    var view = buildView(data, locationName, accentInput);
    var accent = view.theme.accent;
    var status = fetched ? "live" : "cached";
    var nextRefresh = new Date(Date.now() + refreshIntervalMs).toISOString();

    if (family === "accessoryCircular") return buildCircular(view, accent);
    if (family === "accessoryRectangular") return buildRectangular(view, accent, title);
    if (family === "accessoryInline") return buildInline(view, accent);
    if (family === "systemSmall") return buildSmall(view, title, accent, status, nextRefresh);
    if (family === "systemLarge") return buildLarge(view, title, accent, status, nextRefresh);
    return buildMedium(view, title, accent, status, nextRefresh);
}

// ============== 数据层 (保持不变) ==============

async function fetchAllWeather(ctx, opts) {
    var locationId = isValidLocationId(opts.location) ? opts.location : null;
    var locationInfo = await fetchLocationInfo(ctx, opts);
    if (locationInfo && locationInfo.id) locationId = locationInfo.id;
    var now = await fetchNow(ctx, opts);
    var hourly = await fetchHourly(ctx, opts);
    var daily = await fetchDaily(ctx, opts);
    var yesterday = null;
    if (locationId) {
        try {
            yesterday = await fetchYesterday(ctx, { host: opts.host, apiKey: opts.apiKey, locationId: locationId });
        } catch (e) { console.log("yesterday error: " + safeMsg(e)); }
    }
    return { now: now, hourly: hourly, daily: daily, yesterday: yesterday, locationInfo: locationInfo, ts: Date.now() };
}

async function fetchNow(ctx, opts) {
    var url = opts.host + "/v7/weather/now?location=" + encodeURIComponent(opts.location) + "&key=" + encodeURIComponent(opts.apiKey);
    var body = await fetchJson(ctx, url);
    if (body.code !== "200") throw new Error("当前天气异常: " + body.code);
    return body;
}

async function fetchHourly(ctx, opts) {
    var url = opts.host + "/v7/weather/24h?location=" + encodeURIComponent(opts.location) + "&key=" + encodeURIComponent(opts.apiKey);
    var body = await fetchJson(ctx, url);
    if (body.code !== "200") throw new Error("逐小时天气异常: " + body.code);
    return body;
}

async function fetchDaily(ctx, opts) {
    var url = opts.host + "/v7/weather/7d?location=" + encodeURIComponent(opts.location) + "&key=" + encodeURIComponent(opts.apiKey);
    var body = await fetchJson(ctx, url);
    if (body.code !== "200") throw new Error("7日天气异常: " + body.code);
    return body;
}

async function fetchYesterday(ctx, opts) {
    var date = formatDateCompact(new Date(Date.now() - 86400000));
    var url = opts.host + "/v7/historical/weather?location=" + encodeURIComponent(opts.locationId) + "&date=" + date + "&key=" + encodeURIComponent(opts.apiKey);
    var body = await fetchJson(ctx, url);
    if (body.code !== "200") throw new Error("历史天气异常: " + body.code);
    body.requestDate = date;
    return body;
}

async function fetchJson(ctx, url) {
    var resp = await ctx.http.get(url, { headers: { "User-Agent": "Egern-Widget" }, timeout: 10000 });
    if (resp.status !== 200) throw new Error("HTTP " + resp.status);
    return await resp.json();
}

async function fetchLocationInfo(ctx, opts) {
    var host = normalizeHost(opts.host);
    if (!host) return null;
    var url = host + "/geo/v2/city/lookup?location=" + encodeURIComponent(opts.location) + "&key=" + encodeURIComponent(opts.apiKey);
    try {
        var body = await fetchJson(ctx, url);
        if (body.code !== "200" || !body.location || body.location.length === 0) return null;
        var loc = body.location[0];
        return { id: loc.id || "", name: formatLocationName(loc) };
    } catch (e) { return null; }
}

function formatLocationName(loc) {
    if (!loc) return "";
    var city = loc.adm2 || loc.adm1 || "";
    var district = loc.name || "";
    if (city && district && city !== district) return city + "·" + district;
    return district || city || loc.adm1 || "";
}

function resolveLocationName(input, locationInfo, fallback) {
    if (input) return input;
    if (locationInfo && locationInfo.name) return locationInfo.name;
    if (looksLikeCoordinate(fallback)) return "当前位置";
    return fallback || "--";
}

function attachHistory(cached, data) {
    var history = cached && cached.history ? cached.history : null;
    var nowRaw = data && data.now ? data.now.now : null;
    var updateTime = data && data.now ? data.now.updateTime : "";
    history = updateHistory(history, nowRaw, updateTime);
    if (data) data.history = history;
    return data;
}

function updateHistory(history, nowRaw, updateTime) {
    if (!nowRaw) return history || null;
    var temp = toFloat(nowRaw.temp);
    if (!isFinite(temp)) return history || null;
    var obsDate = parseObsDate(nowRaw, updateTime);
    var dateKey = formatDateKey(obsDate);
    var hour = obsDate.getHours();
    history = history && typeof history === "object" ? history : { days: {}, updatedAt: Date.now() };
    if (!history.days) history.days = {};
    var day = history.days[dateKey] || { points: {}, updatedAt: Date.now() };
    day.points[pad2(hour)] = temp;
    day.updatedAt = Date.now();
    history.days[dateKey] = day;
    history.updatedAt = Date.now();
    return trimHistory(history);
}

function parseObsDate(nowRaw, updateTime) {
    var ts = nowRaw && nowRaw.obsTime ? nowRaw.obsTime : updateTime;
    var d = ts ? new Date(ts) : new Date();
    if (isNaN(d.getTime())) d = new Date();
    return d;
}

function formatDateKey(d) { return formatDateCompact(d); }

function trimHistory(history) {
    if (!history || !history.days) return history;
    var keys = Object.keys(history.days).sort();
    if (keys.length <= HISTORY_DAYS) return history;
    var cut = keys.slice(0, keys.length - HISTORY_DAYS);
    for (var i = 0; i < cut.length; i++) { delete history.days[cut[i]]; }
    return history;
}

// ============== 视图模型 (UI 配置优化) ==============

function buildView(data, locationName, accentInput) {
    var nowRaw = data.now ? data.now.now : null;
    var hourlyRaw = data.hourly ? data.hourly.hourly : [];
    var dailyRaw = data.daily ? data.daily.daily : [];
    var yesterdayRaw = data.yesterday;

    var now = normalizeNow(nowRaw, data.now ? data.now.updateTime : "");
    var hourly = normalizeHourly(hourlyRaw);
    var daily = normalizeDaily(dailyRaw);
    var yesterday = normalizeYesterday(yesterdayRaw);

    var today = daily.length > 0 ? daily[0] : null;
    var isNight = computeIsNight(today);
    var iconName = iconForWeather(now.icon, isNight);

    var comfort = calcComfort(now, hourly[0]);
    var advice = calcClothingAdvice(now, hourly[0]);
    var rainAlert = calcRainAlert(now, hourly);
    var yesterdayDiff = calcYesterdayDiff(now, yesterday, data.history);
    var theme = resolveTheme(now, isNight, accentInput);

    return {
        location: locationName,
        now: now,
        hourly: hourly,
        daily: daily,
        today: today,
        isNight: isNight,
        iconName: iconName,
        comfort: comfort,
        advice: advice,
        rainAlert: rainAlert,
        yesterdayDiff: yesterdayDiff,
        accent: theme.accent,
        theme: theme
    };
}

function resolveTheme(now, isNight, accentInput) {
    // 基础主题色调 - 使用更柔和的背景
    var theme = {
        accent: "#60A5FA",
        gradient: ["#0F172A", "#111827", "#1E293B"],
        card: "rgba(255,255,255,0.06)",
        cardStrong: "rgba(255,255,255,0.12)",
        tagBg: "rgba(255,255,255,0.1)",
        barBg: "rgba(255,255,255,0.25)",
        textPrimary: "#FFFFFF",
        textMuted: "rgba(255,255,255,0.85)", // 提升清晰度
        textSubtle: "rgba(255,255,255,0.55)",
        textMeta: "rgba(255,255,255,0.4)"
    };

    var code = parseInt(now.icon || "100", 10);
    var temp = toFloat(now.temp);

    if (isNight) {
        theme.accent = "#8B5CF6";
        theme.gradient = ["#080C1A", "#0F172A", "#1E1B4B"];
    }

    if (code >= 300 && code <= 399) { // 雨
        theme.accent = "#38BDF8";
        theme.gradient = ["#0B1220", "#1E3A8A", "#111827"];
    } else if (code >= 400 && code <= 499) { // 雪
        theme.accent = "#A5F3FC";
        theme.gradient = ["#1E293B", "#334155", "#0F172A"];
    } else if (temp >= 32) { // 高温
        theme.accent = "#F97316";
        theme.gradient = ["#111827", "#7C2D12", "#0F172A"];
    }

    if (accentInput) theme.accent = accentInput;
    return theme;
}

function normalizeNow(now, updateTime) {
    if (!now) return { temp: NaN, feelsLike: NaN, text: "--", icon: "100" };
    return {
        obsTime: now.obsTime || updateTime || "",
        temp: toFloat(now.temp),
        feelsLike: toFloat(now.feelsLike),
        text: now.text || "--",
        icon: now.icon || "100",
        windSpeed: toFloat(now.windSpeed),
        humidity: toFloat(now.humidity),
        precip: toFloat(now.precip),
        vis: toFloat(now.vis)
    };
}

function normalizeHourly(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.map(function (h) { return { time: h.fxTime, temp: toFloat(h.temp), icon: h.icon || "100", pop: toFloat(h.pop), precip: toFloat(h.precip) }; });
}

function normalizeDaily(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.map(function (d) { return { date: d.fxDate, tempMax: toFloat(d.tempMax), tempMin: toFloat(d.tempMin), iconDay: d.iconDay || "100", sunrise: d.sunrise, sunset: d.sunset }; });
}

function normalizeYesterday(yesterday) {
    if (!yesterday || !yesterday.weatherDaily) return null;
    var hourly = Array.isArray(yesterday.weatherHourly) ? yesterday.weatherHourly : [];
    return { date: yesterday.weatherDaily.date, tempMax: toFloat(yesterday.weatherDaily.tempMax), tempMin: toFloat(yesterday.weatherDaily.tempMin), hourly: hourly.map(function (h) { return { time: h.time, temp: toFloat(h.temp) }; }) };
}

// ============== UI 布局 (重点美化部分) ==============

function buildMedium(view, title, accent, status, nextRefresh) {
    var now = view.now;
    var today = view.today;
    var daily5 = view.daily.slice(0, 5);
    var rainAlert = view.rainAlert;
    var theme = view.theme;

    // 标签栏优化
    var tagItems = [
        tag(view.comfort.level + " " + view.comfort.score, view.comfort.color, view.comfort.bg, 9),
        tag(view.yesterdayDiff.text, view.yesterdayDiff.color, view.yesterdayDiff.bg, 9)
    ];
    if (rainAlert && rainAlert.active) {
        tagItems.push(tag(rainAlert.short, rainAlert.color, rainAlert.bg, 9));
    } else {
        tagItems.push(tag(view.advice.short, view.advice.color, view.advice.bg, 9));
    }

    return shell([
        // 顶部位置与时间
        header(view.location, now, view.iconName, accent, title, theme),
        
        sp(8), // 增加顶部呼吸空间

        hstack([
            // 左侧：核心天气大图标与大温度
            hstack([
                icon(view.iconName, 36, accent),
                sp(8),
                txt(formatTemp(now.temp), 42, "semibold", theme.textPrimary, { minScale: 0.5, maxLines: 1 })
            ], { gap: 0, alignItems: "center" }),
            
            sp(16), // 左右间距加大

            // 右侧：详细文字信息
            vstack([
                txt(now.text + "  " + formatTemp(today ? today.tempMax : NaN) + " / " + formatTemp(today ? today.tempMin : NaN), 13, "semibold", theme.textMuted, { maxLines: 1 }),
                sp(8), // 增加行间距
                hstack(tagItems, { gap: 5 }),
                sp(8), // 增加行间距
                hstack([
                    metricInline("体感", formatTemp(now.feelsLike), theme),
                    sp(10),
                    metricInline("风速", formatWind(now.windSpeed), theme),
                    sp(10),
                    metricInline("湿度", formatPercent(now.humidity), theme)
                ], { gap: 0 })
            ], { flex: 1, gap: 0, alignItems: "start" })
        ], { alignItems: "center" }),

        sp(), // 弹性撑开

        // 底部：每日预报卡片化
        hstack(daily5.map(function (d) { return dailyCard(d, accent, theme); }), { gap: 6, flex: 1 }),
        
        sp(6),
        footer(status, theme)
    ], nextRefresh, [12, 16, 10, 16], theme);
}

// ============== 核心 UI 组件 ==============

function shell(children, nextRefresh, padding, theme) {
    return {
        type: "widget",
        gap: 0,
        padding: padding,
        backgroundGradient: {
            type: "linear",
            colors: theme.gradient,
            startPoint: { x: 0, y: 0 },
            endPoint: { x: 1, y: 1 }
        },
        refreshAfter: nextRefresh,
        children: children
    };
}

function header(location, now, iconName, accent, title, theme) {
    return hstack([
        icon("location.fill", 10, accent),
        txt(location, 12, "semibold", theme.textPrimary, { maxLines: 1, minScale: 0.7 }),
        sp(),
        txt(formatClock(now.obsTime), 10, "medium", theme.textSubtle)
    ], { gap: 6 });
}

function dailyCard(d, accent, theme) {
    return vstack([
        txt(formatWeekday(d.date), 9, "medium", theme.textSubtle),
        sp(3),
        icon(iconForWeather(d.iconDay, false), 14, accent),
        sp(3),
        txt(formatTemp(d.tempMax), 10, "semibold", theme.textMuted),
        txt(formatTemp(d.tempMin), 8, "medium", theme.textMeta)
    ], {
        gap: 0,
        alignItems: "center",
        padding: [6, 4, 6, 4],
        backgroundColor: theme.card,
        borderRadius: 8,
        flex: 1
    });
}

function metricInline(label, value, theme) {
    return hstack([
        txt(label, 9, "medium", theme.textMeta),
        txt(value, 10, "semibold", theme.textMuted)
    ], { gap: 4 });
}

function tag(text, color, bg, size) {
    return hstack([txt(text, size || 9, "semibold", color, { maxLines: 1, minScale: 0.6 })], {
        padding: [2, 6, 2, 6],
        backgroundColor: bg || "rgba(255,255,255,0.08)",
        borderRadius: 6
    });
}

function footer(status, theme) {
    var isLive = status === "live";
    var muted = theme.textMeta;
    return hstack([
        icon("clock.arrow.circlepath", 8, muted),
        { type: "date", date: new Date().toISOString(), format: "relative", font: { size: 9, weight: "medium" }, textColor: muted },
        sp(),
        tag(isLive ? "实时" : "缓存", isLive ? "#10B981" : "#F59E0B", isLive ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)", 8)
    ], { gap: 4 });
}

// ============== 逻辑处理 (保持原有高阶算法) ==============

function calcComfort(now, nextHour) {
    var temp = toFloat(now.temp);
    var humidity = toFloat(now.humidity);
    var score = 100 - (Math.abs(temp - 22) * 1.5) - (humidity > 70 ? (humidity - 70) * 0.5 : 0);
    score = clampNumber(score, 0, 100);
    var level = "一般", color = "#F59E0B", bg = "rgba(245,158,11,0.15)";
    if (score >= 85) { level = "极佳"; color = "#10B981"; bg = "rgba(16,185,129,0.15)"; }
    else if (score >= 70) { level = "舒适"; color = "#34D399"; bg = "rgba(52,211,153,0.15)"; }
    return { score: Math.round(score), level: level, color: color, bg: bg };
}

function calcClothingAdvice(now, nextHour) {
    var temp = toFloat(now.feelsLike) || toFloat(now.temp);
    var short = "外套", color = "#34D399", bg = "rgba(52,211,153,0.15)";
    if (temp >= 28) { short = "短袖"; color = "#F97316"; bg = "rgba(249,115,22,0.15)"; }
    else if (temp >= 18) { short = "薄衫"; color = "#34D399"; bg = "rgba(52,211,153,0.15)"; }
    else if (temp >= 5) { short = "大衣"; color = "#60A5FA"; bg = "rgba(96,165,250,0.15)"; }
    else { short = "羽绒"; color = "#A78BFA"; bg = "rgba(167,139,253,0.15)"; }
    return { short: short, color: color, bg: bg };
}

function calcRainAlert(now, hourly) {
    var precip = toFloat(now.precip);
    if (precip >= 0.1) return { active: true, short: "有雨带伞", color: "#38BDF8", bg: "rgba(56,189,248,0.15)" };
    return { active: false, short: "近期无雨", color: "#34D399", bg: "rgba(52,211,153,0.12)" };
}

function calcYesterdayDiff(now, yesterday, history) {
    var nowTemp = toFloat(now.temp);
    var yTemp = yesterday ? (yesterday.tempMax + yesterday.tempMin) / 2 : NaN;
    if (!isFinite(yTemp)) return { text: "较昨 --", color: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.05)" };
    var diff = nowTemp - yTemp;
    var sign = diff > 0 ? "+" : "";
    return { text: "较昨 " + sign + diff.toFixed(0) + "°", color: diff > 0 ? "#F97316" : "#60A5FA", bg: diff > 0 ? "rgba(249,115,22,0.12)" : "rgba(96,165,250,0.12)" };
}

// ============== 工具函数 (精简) ==============

function iconForWeather(code, isNight) {
    var c = parseInt(code || "100", 10);
    if (c === 100) return isNight ? "moon.stars.fill" : "sun.max.fill";
    if (c >= 101 && c <= 104) return isNight ? "cloud.moon.fill" : "cloud.sun.fill";
    if (c >= 300 && c <= 399) return "cloud.rain.fill";
    return "cloud.fill";
}
function computeIsNight(today) {
    if (!today) return false;
    var sunrise = new Date(today.date + "T" + today.sunrise + ":00");
    var sunset = new Date(today.date + "T" + today.sunset + ":00");
    var now = new Date();
    return now < sunrise || now > sunset;
}
function formatTemp(val) { return isFinite(val) ? Math.round(val) + "°" : "--"; }
function formatWind(val) { return isFinite(val) ? Math.round(val) + "km" : "--"; }
function formatPercent(val) { return isFinite(val) ? Math.round(val) + "%" : "--"; }
function formatClock(iso) { var d = iso ? new Date(iso) : new Date(); return pad2(d.getHours()) + ":" + pad2(d.getMinutes()); }
function formatWeekday(dateStr) { var d = new Date(dateStr + "T00:00:00"); var now = new Date(); now.setHours(0,0,0,0); if (d.getTime() === now.getTime()) return "今天"; var days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]; return days[d.getDay()]; }
function formatDateCompact(d) { return d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()); }
function txt(text, size, weight, color, opts) { var el = { type: "text", text: String(text), font: { size: size || 12, weight: weight || "regular" } }; if (color) el.textColor = color; if (opts) { for (var k in opts) el[k] = opts[k]; } return el; }
function icon(name, size, color) { var el = { type: "image", src: "sf-symbol:" + name, width: size, height: size }; if (color) el.color = color; return el; }
function hstack(children, opts) { var el = { type: "stack", direction: "row", alignItems: "center", children: children }; if (opts) { for (var k in opts) el[k] = opts[k]; } return el; }
function vstack(children, opts) { var el = { type: "stack", direction: "column", alignItems: "start", children: children }; if (opts) { for (var k in opts) el[k] = opts[k]; } return el; }
function sp(len) { var el = { type: "spacer" }; if (len != null) el.length = len; return el; }
function clampNumber(val, min, max) { var n = parseFloat(val); if (!isFinite(n)) n = min; return n < min ? min : (n > max ? max : n); }
function toFloat(val) { var n = parseFloat(val); return isFinite(n) ? n : NaN; }
function pad2(n) { return n < 10 ? "0" + n : String(n); }
function isTrue(val) { var v = String(val || "").toLowerCase(); return v === "1" || v === "true" || v === "on"; }
function isValidLocationId(val) { return /^\d+$/.test(String(val || "")); }
function looksLikeCoordinate(val) { return /^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/.test(String(val || "")); }
function normalizeHost(raw) { var h = String(raw || "").trim(); if (!h) return ""; if (!/^https?:\/\//i.test(h)) h = "https://" + h; return h.replace(/\/$/, ""); }
function loadCache(ctx) { try { return ctx.storage.getJSON(CACHE_KEY); } catch (e) { return null; } }
function saveCache(ctx, data) { try { ctx.storage.setJSON(CACHE_KEY, data); } catch (e) { } }
function safeMsg(e) { return e && e.message ? e.message : "未知错误"; }
function errorWidget(title, msg) { return { type: "widget", padding: 16, backgroundGradient: { type: "linear", colors: ["#0F172A", "#111827"] }, children: [txt(title, 16, "bold", "#F87171"), sp(4), txt(msg, 12, "regular", "rgba(255,255,255,0.7)")] }; }
