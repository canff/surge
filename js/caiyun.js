// 彩云天气预报版 (金黄色品牌头 + 星光徽标) for Egern
// 环境变量：TOKEN, LONGITUDE, LATITUDE

export default async function (ctx) {
  const token = ctx.env.TOKEN;
  const lon = ctx.env.LONGITUDE || '116.3795';
  const lat = ctx.env.LATITUDE || '39.9094';

  function skyconInfo(skycon) {
    const map = {
      CLEAR_DAY:           { text: '晴',     symbol: 'sun.max.fill',         color: '#FFD60A' },
      CLEAR_NIGHT:         { text: '晴',     symbol: 'moon.stars.fill',      color: '#BFC4D6' },
      PARTLY_CLOUDY_DAY:   { text: '多云',   symbol: 'cloud.sun.fill',       color: '#FFB340' },
      PARTLY_CLOUDY_NIGHT: { text: '多云',   symbol: 'cloud.moon.fill',      color: '#8E9DB5' },
      CLOUDY:              { text: '阴',     symbol: 'cloud.fill',           color: '#A0AABB' },
      LIGHT_HAZE:          { text: '轻度霾', symbol: 'sun.haze.fill',        color: '#C8AD7F' },
      MODERATE_HAZE:       { text: '中度霾', symbol: 'sun.haze.fill',        color: '#B89060' },
      HEAVY_HAZE:          { text: '重度霾', symbol: 'sun.haze.fill',        color: '#9E7040' },
      LIGHT_RAIN:          { text: '小雨',   symbol: 'cloud.drizzle.fill',   color: '#64B5F6' },
      MODERATE_RAIN:       { text: '中雨',   symbol: 'cloud.rain.fill',      color: '#42A5F5' },
      HEAVY_RAIN:          { text: '大雨',   symbol: 'cloud.heavyrain.fill', color: '#1E88E5' },
      STORM_RAIN:          { text: '暴雨',   symbol: 'cloud.bolt.rain.fill', color: '#1565C0' },
      FOG:                 { text: '雾',     symbol: 'cloud.fog.fill',       color: '#B0BEC5' },
      LIGHT_SNOW:          { text: '小雪',   symbol: 'cloud.snow.fill',      color: '#B3E5FC' },
      MODERATE_SNOW:       { text: '中雪',   symbol: 'cloud.snow.fill',      color: '#81D4FA' },
      HEAVY_SNOW:          { text: '大雪',   symbol: 'cloud.snow.fill',      color: '#4FC3F7' },
      STORM_SNOW:          { text: '暴雪',   symbol: 'snowflake',            color: '#29B6F6' },
      DUST:                { text: '浮尘',   symbol: 'aqi.medium',           color: '#D4B483' },
      SAND:                { text: '沙尘',   symbol: 'aqi.high',             color: '#C49A4A' },
      WIND:                { text: '大风',   symbol: 'wind',                 color: '#90A4AE' },
    };
    return map[skycon] || { text: skycon, symbol: 'cloud.fill', color: '#A0AABB' };
  }

  const C = {
    bg1:       { dark: '#1E293B', light: '#1E293B' },
    bg2:       { dark: '#33272A', light: '#33272A' },
    bg3:       { dark: '#78350F', light: '#78350F' },
    textPri:   { dark: '#FFFFFF',   light: '#FFFFFF' },
    textSec:   { dark: '#F3F4F6',   light: '#F3F4F6' },
    textTer:   { dark: '#D1D5DB',   light: '#D1D5DB' },
    textMuted: { dark: '#9CA3AF',   light: '#9CA3AF' },
    divider:   { dark: 'rgba(255,255,255,0.1)', light: 'rgba(255,255,255,0.1)' },
    locIcon:   { dark: '#FBBF24',   light: '#FBBF24' },
    gold:      { dark: '#FFD60A',   light: '#FFD60A' },
    tagBg:     { dark: 'rgba(255,255,255,0.12)', light: 'rgba(255,255,255,0.12)' },
    timeCapsuleBg: 'rgba(255,214,10,0.15)',
  };

  function aqiColor(desc) {
    const map = { '优':'#4ADE80','良':'#84CC16','轻度污染':'#FBBF24','中度污染':'#F97316','重度污染':'#EF4444' };
    return map[desc] || '#A0AABB';
  }

  // ★ 走势图（已恢复天气描述文字）
  function hourlyStrip(hourly) {
    const tempsData = hourly?.temperature;
    const skyconData = hourly?.skycon;
    if (!tempsData || tempsData.length === 0) return { type: 'spacer' };
    const hours = tempsData.slice(0, 12);
    const temps = hours.map(h => h.value);
    const min = Math.min(...temps), max = Math.max(...temps);
    const range = Math.max(max - min, 5);
    return {
      type: 'stack', direction: 'row', alignItems: 'end', gap: 2, padding: [2, 0, 0, 0],
      children: hours.map((h, i) => {
        const currentSkycon = skyconData?.[i]?.value || 'CLOUDY';
        const info = skyconInfo(currentSkycon);
        const ratio = range === 0 ? 0.5 : (h.value - min) / range;
        const barHeight = 6 + ratio * 14;
        return {
          type: 'stack', direction: 'column', alignItems: 'center', gap: 1, flex: 1,
          children: [
            { type: 'text', text: new Date(h.datetime).getHours() + '时', font: { size: 7 }, textColor: C.textMuted },
            { type: 'text', text: info.text, font: { size: 6.5 }, textColor: info.color },       // ★ 天气描述
            { type: 'image', src: 'sf-symbol:' + info.symbol, width: 8, height: 8, color: info.color },
            { type: 'stack', width: 3, height: barHeight, borderRadius: 1.5, backgroundColor: info.color, children: [] },
            { type: 'text', text: Math.round(h.value) + '°', font: { size: 7.5, weight: 'medium' }, textColor: C.textPri },
          ]
        };
      })
    };
  }

  if (!token) return { type: 'widget', children: [{ type: 'text', text: '请配置 TOKEN' }] };

  let data;
  try {
    const weatherUrl = `https://api.caiyunapp.com/v2.6/${token}/${lon},${lat}/weather?hourlysteps=24`;
    const resp = await ctx.http.get(weatherUrl, { timeout: 15000 });
    data = await resp.json();
  } catch (e) {
    return { type: 'widget', children: [{ type: 'text', text: '请求失败: ' + e.message }] };
  }

  const rt = data.result.realtime;
  const hourly = data.result.hourly;
  const daily = data.result.daily;
  const sky = skyconInfo(rt.skycon);
  const temp = Math.round(rt.temperature);
  let highTemp = '-', lowTemp = '-';
  if (daily?.temperature?.[0]) {
    highTemp = Math.round(daily.temperature[0].max);
    lowTemp = Math.round(daily.temperature[0].min);
  }
  const aqiVal = rt.air_quality?.aqi?.chn || '-';
  const aqiDesc = rt.air_quality?.description?.chn || '';
  const aqiCol = aqiColor(aqiDesc);
  const dressDesc = rt.life_index?.dressing?.desc || '';

  let locationName = '当前位置';
  const cached = ctx.storage.getJSON('location_cache');
  if (cached && cached.coord === (lon + ',' + lat)) locationName = cached.name;

  const updateDate = new Date(data.server_time * 1000);
  const updateTimeStr = updateDate.getHours().toString().padStart(2,'0') + ':' + updateDate.getMinutes().toString().padStart(2,'0');

  // ==================== 中尺寸（已优化中间主显示区域） ====================
  if (ctx.widgetFamily === 'systemMedium') {
    return {
      type: 'widget',
      refreshAfter: new Date(Date.now() + 30*60*1000).toISOString(),
      backgroundGradient: {
        type: 'linear', colors: [C.bg1, C.bg2, C.bg3], stops: [0, 0.5, 1],
        startPoint: { x:0, y:0 }, endPoint: { x:1, y:1 },
      },
      padding: [8, 10, 6, 10],
      children: [
        // 头部
        {
          type: 'stack', direction: 'row', alignItems: 'center', gap: 5,
          children: [
            { type: 'image', src: 'sf-symbol:sparkles', color: C.gold, width: 11, height: 11 },
            { type: 'text', text: '彩云天气', font: { size: 13, weight: 'bold' }, textColor: C.gold },
            { type: 'image', src: 'sf-symbol:location.fill', color: C.locIcon, width: 7, height: 7 },
            { type: 'text', text: locationName, font: { size: 9, weight: 'medium' }, textColor: C.textMuted },
            { type: 'spacer' },
            {
              type: 'stack', direction: 'row', alignItems: 'center', gap: 3, padding: [2, 7, 2, 7], borderRadius: 9, backgroundColor: C.timeCapsuleBg,
              children: [
                { type: 'image', src: 'sf-symbol:clock.fill', color: C.gold, width: 8, height: 8 },
                { type: 'text', text: updateTimeStr, font: { size: 9, weight: 'bold' }, textColor: C.gold },
              ]
            }
          ]
        },

        { type: 'spacer', length: 5 },

        // ==========【优化后的主信息行】==========
        {
          type: 'stack', direction: 'row', alignItems: 'center', gap:12,
          children: [
            // 左侧：天气图标 + 当前温度 + 昼夜温
            {
              type: 'stack', direction: 'row', alignItems: 'center', gap:6,
              children: [
                { type: 'image', src: 'sf-symbol:' + sky.symbol, color: sky.color, width: 30, height: 30 },
                {
                  type: 'stack', direction: 'column', gap:1,
                  children: [
                    { type: 'text', text: temp + '°', font: { size: 32, weight: 'bold' }, textColor: C.textPri },
                    { type: 'text', text: sky.text + '  ↑' + highTemp + '° ↓' + lowTemp + '°', font: { size: 10 }, textColor: C.textTer },
                  ]
                }
              ],
              flex: 2
            },

            // 中间：风速、湿度（增加图标，垂直紧凑）
            {
              type: 'stack', direction: 'column', gap:3, alignItems:'center',
              flex:1,
              children: [
                {
                  type: 'stack', direction:'row', gap:3, alignItems:'center',
                  children:[
                    {type:'image',src:'sf-symbol:wind',width:9,height:9,color:C.textSec},
                    { type: 'text', text: rt.wind.speed.toFixed(0) + 'km/h', font: { size: 9 }, textColor: C.textSec },
                  ]
                },
                {
                  type: 'stack', direction:'row', gap:3, alignItems:'center',
                  children:[
                    {type:'image',src:'sf-symbol:humidity',width:9,height:9,color:C.textSec},
                    { type: 'text', text: Math.round(rt.humidity*100) + '%', font: { size: 9 }, textColor: C.textSec },
                  ]
                }
              ]
            },

            // 右侧：AQI信息
            {
              type: 'stack', direction: 'column', alignItems: 'end', gap:2,
              flex:1,
              children: [
                { type: 'text', text: 'AQI ' + aqiVal, font: { size: 13, weight: 'bold' }, textColor: aqiCol },
                { type: 'text', text: aqiDesc, font: { size: 8.5 }, textColor: aqiCol },
              ]
            }
          ]
        },
        // ======================================

        { type: 'spacer', length: 6 },

        // 穿衣胶囊
        dressDesc ? {
          type: 'stack', direction: 'row', padding: [2, 7, 2, 7], borderRadius: 5, backgroundColor: C.tagBg,
          children: [
            { type: 'text', text: dressDesc, font: { size: 9, weight: 'medium' }, textColor: '#FBBF24' }
          ]
        } : { type: 'spacer', length: 0 },

        { type: 'spacer', length: 5 },
        { type: 'stack', height: 1, backgroundColor: C.divider, children: [] },
        { type: 'spacer', length: 4 },

        // ★ 走势图（每个时段含：时间 + 天气描述 + 图标 + 柱 + 温度）
        {
          type: 'stack', direction: 'column', height: 52,
          children: [hourlyStrip(hourly)]
        },
      ]
    };
  }

  // ==================== 大尺寸 ====================
  if (ctx.widgetFamily === 'systemLarge') {
    return {
      type: 'widget',
      backgroundGradient: {
        type: 'linear', colors: [C.bg1, C.bg2, C.bg3], stops: [0, 0.5, 1],
        startPoint: { x:0, y:0 }, endPoint: { x:1, y:1 },
      },
      padding: 20,
      children: [
        {
          type: 'stack', direction: 'row', alignItems: 'center', gap: 8,
          children: [
            { type: 'image', src: 'sf-symbol:sparkles', color: C.gold, width: 16, height: 16 },
            { type: 'text', text: '彩云天气', font: { size: 18, weight: 'bold' }, textColor: C.gold },
            { type: 'image', src: 'sf-symbol:location.fill', color: C.locIcon, width: 10, height: 10 },
            { type: 'text', text: locationName, font: { size: 11, weight: 'medium' }, textColor: C.textMuted },
            { type: 'spacer' },
            {
              type: 'stack', direction: 'row', alignItems: 'center', gap: 4, padding: [4, 10, 4, 10], borderRadius: 12, backgroundColor: C.timeCapsuleBg,
              children: [
                { type: 'image', src: 'sf-symbol:clock.fill', color: C.gold, width: 10, height: 10 },
                { type: 'text', text: updateTimeStr + ' 更新', font: { size: 11, weight: 'bold' }, textColor: C.gold },
              ]
            }
          ]
        },
        { type: 'spacer', length: 15 },
        {
          type: 'stack', direction: 'row', alignItems: 'center', gap: 15,
          children: [
            { type: 'image', src: 'sf-symbol:' + sky.symbol, color: sky.color, width: 50, height: 50 },
            {
              type: 'stack', direction: 'column', flex: 1,
              children: [
                { type: 'text', text: temp + '°C', font: { size: 36, weight: 'bold' }, textColor: C.textPri },
                { type: 'text', text: sky.text + '  ' + highTemp + '°/' + lowTemp + '°', font: { size: 14 }, textColor: C.textSec },
              ]
            },
            { type: 'spacer' },
            {
              type: 'stack', direction: 'column', alignItems: 'end', gap: 4,
              children: [
                { type: 'text', text: 'AQI ' + aqiVal, font: { size: 16, weight: 'bold' }, textColor: aqiCol },
                { type: 'text', text: aqiDesc, font: { size: 11 }, textColor: aqiCol },
              ]
            }
          ]
        },
        { type: 'spacer', length: 12 },
        {
          type: 'stack', direction: 'column', gap: 4, alignItems: 'start',
          children: [
            { type: 'text', text: '风速 ' + rt.wind.speed.toFixed(1) + ' km/h', font: { size: 12 }, textColor: '#FFFFFF' },
            { type: 'text', text: '湿度 ' + Math.round(rt.humidity*100) + '%', font: { size: 12 }, textColor: '#FFFFFF' },
          ]
        },
        { type: 'spacer', length: 12 },
        dressDesc ? { type: 'stack', padding: [4, 10, 4, 10], borderRadius: 8, backgroundColor: C.tagBg, children: [
          { type: 'text', text: dressDesc, font: { size: 11, weight: 'medium' }, textColor: '#FBBF24' }
        ]} : { type: 'spacer', length: 0 },
        { type: 'spacer', length: 20 },
        { type: 'text', text: '未来 12 小时预报', font: { size: 11, weight: 'bold' }, textColor: C.textTer },
        { type: 'spacer', length: 8 },
        { type: 'stack', direction: 'column', height: 56, children: [hourlyStrip(hourly)] },
        { type: 'spacer', length: 20 },
        { type: 'stack', height: 1, backgroundColor: C.divider, children: [] },
      ]
    };
  }

  return { type: 'widget', children: [{ type: 'text', text: temp + '° ' + sky.text }] };
}
