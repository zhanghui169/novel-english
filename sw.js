// Service Worker for 小说学英语 — 离线缓存 v5
const CACHE_NAME = 'novel-eng-v5';

// 安装
self.addEventListener('install', e => {
  self.skipWaiting();
});

// 激活：清掉所有旧缓存
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 请求：网络优先（保证永远是最新版），离线才用缓存
self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;

  const url = e.request.url;

  // 词典/翻译API：只走网络，不做缓存
  if(url.includes('dictionaryapi.dev') || url.includes('translate.googleapis.com') ||
     url.includes('mymemory.translated.net') || url.includes('googleapis.com')) {
    return;
  }

  // HTML/核心文件：网络优先，网络失败才用缓存
  e.respondWith(
    fetch(e.request).then(response => {
      // 网络成功 → 更新缓存 → 返回新版
      const clone = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
      return response;
    }).catch(() => {
      // 网络失败 → 尝试缓存
      return caches.match(e.request).then(cached => {
        if(cached) return cached;
        // 完全没有缓存时返回离线提示
        if(e.request.headers.get('accept')?.includes('text/html')){
          return new Response('<h1>离线</h1><p>请联网后刷新</p>', {
            status: 200, headers: {'Content-Type': 'text/html; charset=utf-8'}
          });
        }
        return new Response('', {status: 503});
      });
    })
  );
});
