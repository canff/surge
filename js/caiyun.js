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
    textFaint: { dark: '#4B5563',   light: '#4B5563' },
    divider:   { dark: 'rgba(255,255,255,0.1)', light: 'rgba(255,255,255,0.1)' },
    locIcon:   { dark: '#FBBF24',   light: '#FBBF24' },
    gold:      { dark: '#FFD60A',   light: '#FFD60A' }, 
  };

  function aqiColor(desc) {
    const map = { '优': '#4ADE80', '良': '#84CC16', '轻度污染': '#FBBF24', '中度污染': '#F97316', '重度污染': '#EF4444' };
    return map[desc] || '#A0AABB';
  }

  // 【修改点1】这里接收完整的 hourly 对象，而不是只接收 hourly.temperature
  function hourlyStrip(hourly) {
    const tempsData = hourly?.temperature;
    const skyconData = hourly?.skycon;
    
    if (!tempsData || tempsData.length === 0) return { type: 'spacer' };
    
    const hours = tempsData.slice(0, 12);
    const temps = hours.map(h => h.value);
    const min = Math.min(...temps);
    const max = Math.max(...temps);
    const range = Math.max(max - min, 5);

    return {
      type: 'stack', direction: 'row', alignItems: 'end', gap: 4, padding: [4, 0, 0, 0],
      children: hours.map((h, i) => {
        // 【修改点2】通过索引 i 获取对应小时的真实天气状况（skycon）
        const currentSkycon = skyconData && skyconData[i] ? skyconData[i].value : 'CLOUDY';
        const info = skyconInfo(currentSkycon);
        
        const ratio = range === 0 ? 0.5 : (h.value - min) / range;
        const barHeight = 8 + ratio * 16;
        return {
          type: 'stack', direction: 'column', alignItems: 'center', gap: 2, flex: 1,
          children: [
            { type: 'text', text: new Date(h.datetime).getHours() + '时', font: { size: 8 }, textColor: C.textMuted },
            { type: 'image', src: 'sf-symbol:' + info.symbol, width: 10, height: 10, color: info.color },
            { type: 'stack', width: 4, height: barHeight, borderRadius: 2, backgroundColor: info.color, children: [] },
            { type: 'text', text: Math.round(h.value) + '°', font: { size: 9, weight: 'medium' }, textColor: C.textPri },
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
  const sky = skyconInfo(rt.skycon);
  const temp = Math.round(rt.temperature);
  const feelTemp = Math.round(rt.apparent_temperature);
  
  let locationName = '当前位置';
  const cached = ctx.storage.getJSON('location_cache');
  if (cached && cached.coord === (lon + ',' + lat)) locationName = cached.name;

  const updateTime = new Date(data.server_time * 1000).getHours().toString().padStart(2, '0') + ':' + new Date(data.server_time * 1000).getMinutes().toString().padStart(2, '0') + ' 更新';

  // --- 中尺寸布局 ---
  if (ctx.widgetFamily === 'systemMedium') {
    return {
      type: 'widget',
      refreshAfter: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      backgroundGradient: {
        type: 'linear', colors: [C.bg1, C.bg2, C.bg3], stops: [0, 0.5, 1],
        startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 },
      },
      padding: 10,
      children: [
        {
          type: 'stack', direction: 'row', alignItems: 'center', gap: 6,
          children: [
            { type: 'spacer' },
            { type: 'image', src: 'sf-symbol:sparkles', color: C.gold, width: 14, height: 14 },
            { type: 'text', text: '彩云天气', font: { size: 16, weight: 'bold' }, textColor: C.gold },
            { type: 'spacer' },
          ]
        },
        { type: 'spacer', length: 6 },
        {
          type: 'stack', direction: 'row', alignItems: 'center',
          children: [
            { type: 'image', src: 'sf-symbol:location.fill', color: C.locIcon, width: 10, height: 10 },
            { type: 'text', text: ' ' + locationName, font: { size: 10, weight: 'medium' }, textColor: C.textSec },
            { type: 'spacer' },
            { type: 'text', text: updateTime, font: { size: 9 }, textColor: C.textFaint },
          ]
        },
        { type: 'spacer', length: 6 },
        {
          type: 'stack', direction: 'row', alignItems: 'center',
          children: [
            {
              type: 'stack', direction: 'row', alignItems: 'center', gap: 8, flex: 1,
              children: [
                { type: 'image', src: 'sf-symbol:' + sky.symbol, color: sky.color, width: 32, height: 32 },
                { type: 'text', text: temp + '°', font: { size: 30, weight: 'bold' }, textColor: C.textPri },
                {
                  type: 'stack', direction: 'column',
                  children: [
                    { type: 'text', text: sky.text, font: { size: 12, weight: 'semibold' }, textColor: C.textSec },
                    { type: 'text', text: '体感 ' + feelTemp + '°', font: { size: 10 }, textColor: C.textTer },
                  ]
                }
              ]
            },
            {
              type: 'stack', direction: 'column', alignItems: 'end', gap: 2,
              children: [
                { type: 'text', text: 'AQI ' + (rt.air_quality?.aqi?.chn || '-'), font: { size: 10, weight: 'bold' }, textColor: aqiColor(rt.air_quality?.description?.chn) },
                { type: 'text', text: '湿度 ' + Math.round(rt.humidity * 100) + '%', font: { size: 10 }, textColor: C.textMuted },
              ]
            }
          ]
        },
        { type: 'spacer', length: 8 },
        { type: 'stack', height: 1, backgroundColor: C.divider, children: [] },
        { type: 'spacer', length: 6 },
        // 【修改点3】调用处改为传入整个 hourly 对象
        hourlyStrip(hourly),
      ]
    };
  }

  // --- 大尺寸布局 ---
  if (ctx.widgetFamily === 'systemLarge') {
    return {
      type: 'widget',
      backgroundGradient: {
        type: 'linear', colors: [C.bg1, C.bg2, C.bg3], stops: [0, 0.5, 1],
        startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 },
      },
      padding: 20,
      children: [
        {
          type: 'stack', direction: 'row', alignItems: 'center', gap: 8,
          children: [
            { type: 'spacer' },
            { type: 'image', src: 'sf-symbol:sparkles', color: C.gold, width: 18, height: 18 },
            { type: 'text', text: '彩云天气', font: { size: 20, weight: 'bold' }, textColor: C.gold },
            { type: 'spacer' },
          ]
        },
        { type: 'spacer', length: 15 },
        {
          type: 'stack', direction: 'row', alignItems: 'center',
          children: [
            { type: 'image', src: 'sf-symbol:location.fill', color: C.locIcon, width: 12, height: 12 },
            { type: 'text', text: ' ' + locationName, font: { size: 13, weight: 'medium' }, textColor: C.textPri },
            { type: 'spacer' },
            { type: 'text', text: updateTime, font: { size: 10 }, textColor: C.textFaint },
          ]
        },
        { type: 'spacer', length: 15 },
        {
          type: 'stack', direction: 'row', alignItems: 'center', gap: 15,
          children: [
            { type: 'image', src: 'sf-symbol:' + sky.symbol, color: sky.color, width: 50, height: 50 },
            {
              type: 'stack', direction: 'column',
              children: [
                { type: 'text', text: temp + '°C', font: { size: 36, weight: 'bold' }, textColor: C.textPri },
                { type: 'text', text: sky.text + ' · 体感 ' + feelTemp + '°C', font: { size: 14 }, textColor: C.textSec },
              ]
            }
          ]
        },
        { type: 'spacer', length: 20 },
        { type: 'text', text: '未来 12 小时预报', font: { size: 11, weight: 'bold' }, textColor: C.textTer },
        { type: 'spacer', length: 8 },
        // 【修改点4】调用处改为传入整个 hourly 对象
        hourlyStrip(hourly),
        { type: 'spacer', length: 20 },
        { type: 'stack', height: 1, backgroundColor: C.divider, children: [] },
        { type: 'spacer', length: 15 },
        {
          type: 'stack', direction: 'row',
          children: [
            {
              type: 'stack', direction: 'column', flex: 1, gap: 10,
              children: [
                { type: 'text', text: '湿度 ' + Math.round(rt.humidity * 100) + '%', font: { size: 12 }, textColor: C.textSec },
                { type: 'text', text: '风速 ' + rt.wind.speed.toFixed(1) + ' km/h', font: { size: 12 }, textColor: C.textSec },
              ]
            },
            {
              type: 'stack', direction: 'column', flex: 1, gap: 10,
              children: [
                { type: 'text', text: 'AQI ' + (rt.air_quality?.aqi?.chn || '-'), font: { size: 12, weight: 'bold' }, textColor: aqiColor(rt.air_quality?.description?.chn) },
                { type: 'text', text: '紫外线 ' + (rt.life_index?.ultraviolet?.desc || '-'), font: { size: 12 }, textColor: C.textSec },
              ]
            }
          ]
        }
      ]
    };
  }

  return { type: 'widget', children: [{ type: 'text', text: temp + '° ' + sky.text }] };
}
