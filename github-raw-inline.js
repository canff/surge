// Surge Script: 强制在线预览 GitHub Raw 的 .conf / .list
(() => {
  const h = $response.headers || {};
  // 统一大小写处理，删除可能存在的 Content-Disposition
  for (const k of Object.keys(h)) {
    if (k.toLowerCase() === 'content-disposition') delete h[k];
  }
  // 设置为 inline，避免提示下载
  h['Content-Disposition'] = 'inline';
  // 强制文本类型，保证可预览
  h['Content-Type'] = 'text/plain; charset=utf-8';

  $done({ headers: h });
})();
