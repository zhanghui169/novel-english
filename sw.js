// Service Worker for 小说学英语 — 离线缓存
const CACHE_NAME = 'novel-eng-v4';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
];

// 安装：缓存核心文件
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching app shell');
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 请求：缓存优先（本地秒开），失败才走网络
self.addEventListener('fetch', e => {
  // 只处理 GET
  if(e.request.method !== 'GET') return;

  // 词典API和翻译API走网络优先，不做缓存（保证数据新鲜）
  const url = e.request.url;
  if(url.includes('dictionaryapi.dev') || url.includes('translate.googleapis.com') ||
     url.includes('mymemory.translated.net') || url.includes('googleapis.com')) {
    e.respondWith(
      fetch(e.request).catch(() => new Response(JSON.stringify({found:false}), {
        status: 200, headers: {'Content-Type': 'application/json'}
      }))
    );
    return;
  }

  // 其他请求：缓存优先
  e.respondWith(
    caches.match(e.request).then(cached => {
      if(cached) return cached;
      return fetch(e.request).then(response => {
        // 只缓存成功的GET响应
        if(!response || response.status !== 200 || response.type !== 'basic') return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return response;
      }).catch(() => {
        // 离线时HTML请求返回缓存
        if(e.request.headers.get('accept')?.includes('text/html')){
          return caches.match('./index.html');
        }
        return new Response('离线不可用', {status: 503});
      });
    })
  );
});
