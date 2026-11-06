/* 任务管理台 Service Worker
   - M10/PWA：提供 fetch 处理（静态直连 + 离线兜底首页）满足可安装性
   - M2：页面关闭后定时检查提醒计划（Cache 'wb-remind-plan'），到点弹系统通知（尽力而为）
   注意：本文件与 manifest.json/icons 只在部署到 https 时生效；本地双击 HTML 不会触发注册。 */
const PLAN_CACHE="wb-remind-plan";
const SENT_CACHE="wb-remind-sent";
const APP_CACHE="wb-app-v5";
/* v5（2026-11-06 审查修复 C-11/C-12）：补齐 PRECACHE 缺项；navigate 失败按路径回对应页；
   非导航失败先查预缓存；海报图做限量 CacheFirst。升版本以强制重新预缓存。
   v4：页头工作台 logo 改用三卡组 SVG（icons/workbench-icon.svg）并纳入预缓存。
   v3：换了工作台图标 + 导航请求绕过 Pages 的 max-age=600 磁盘缓存。 */
/* "./" 是目录根，GitHub Pages 在该路径提供的正是 index.html，故不另列 ./index.html。 */
const PRECACHE=["./", "./home.html", "./任务管理台.html", "./明信片追踪.html", "./书影音海报墙.html",
                "./manifest.json", "./媒体自定义条目.js", "./媒体进度看板.html",
                "./icons/icon-152.png", "./icons/icon-167.png", "./icons/icon-180.png",
                "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-512-maskable.png",
                "./icons/favicon.ico", "./icons/workbench-icon.svg"];

// 2026-11-04 站点统一：预缓存门户 + 三个子页，离线可从任一页兜底回工作台首页
self.addEventListener("install", function(e){
  self.skipWaiting();
  e.waitUntil((async function(){
    try{
      const c=await caches.open(APP_CACHE);
      await Promise.all(PRECACHE.map(function(u){ return c.add(u).catch(function(){}); }));
    }catch(_){}
  })());
});
self.addEventListener("activate", function(e){
  e.waitUntil((async function(){
    const names=await caches.keys();
    await Promise.all(names.filter(function(n){ return n.indexOf("wb-app-")===0 && n!==APP_CACHE; }).map(function(n){ return caches.delete(n); }));
    await self.clients.claim();
  })());
});

async function readCacheJSON(cacheName, key){
  try{
    const c=await caches.open(cacheName);
    const r=await c.match(key);
    if(!r) return null;
    return await r.json();
  }catch(e){ return null; }
}
async function writeCacheJSON(cacheName, key, obj){
  try{
    const c=await caches.open(cacheName);
    await c.put(key, new Response(JSON.stringify(obj), {headers:{"Content-Type":"application/json"}}));
  }catch(e){}
}

async function remindTick(){
  try{
    const plan=await readCacheJSON(PLAN_CACHE,"plan");
    const items=(plan&&Array.isArray(plan.items))?plan.items:[];
    if(!items.length) return;
    const sent=await readCacheJSON(SENT_CACHE,"keys");
    const sentSet=new Set(Array.isArray(sent&&sent.keys)?sent.keys:[]);
    const now=Date.now();
    const fired=[];
    for(const it of items){
      if(!it || sentSet.has(it.key) || !(it.at>0) || it.at>now+60000) continue;
      try{
        await self.registration.showNotification((it.title||"任务提醒"), {
          body:(it.body||"该开始啦"),
          tag:String(it.key).slice(0,120),
          icon:"icons/icon-192.png",
          badge:"icons/icon-192.png"
        });
      }catch(e){}
      fired.push(it.key);
      sentSet.add(it.key);
      if(sentSet.size>800){ const arr=Array.from(sentSet); sentSet.clear(); arr.slice(-500).forEach(k=>sentSet.add(k)); }
    }
    if(fired.length) await writeCacheJSON(SENT_CACHE,"keys",{keys:Array.from(sentSet)});
  }catch(e){}
}

self.addEventListener("notificationclick", function(e){
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type:"window", includeUncontrolled:true}).then(function(ws){
    for(const w of ws){ if("focus" in w){ w.focus(); return; } }
    return self.clients.openWindow("./");
  }));
});

// 页面关闭后 SW 是否被节流/冻结取决于浏览器与系统；尽力而为每 30s 检查一次
setInterval(remindTick, 30000);
remindTick();

// 静态资源：先网络（保证拿到最新代码），失败回退缓存首页（离线可用）
// 2026-11-04 加固：GitHub Pages 对 HTML 返回 cache-control: max-age=600，
// 普通 fetch(req) 的 cache:"default" 会命中浏览器磁盘缓存，改版后 10 分钟内
// 从门户点进子页可能仍是旧版 HTML（用户报告「看到之前的任务台画面」的次要成因）。
// 导航请求用 URL 重新构造并指定 no-store 强制走网络；不能直接 fetch(e.request, init)，
// 因为 navigate 模式的 Request 带 init 重建在部分浏览器会抛 TypeError。
// 任何失败都退回原请求，再走缓存兜底；离线行为不变。
/* C-11：离线时按 URL 回对应缓存页，回不到才退门户；避免「打开任务台却被门户替换」。 */
const NAV_MAP=[
  ["任务管理台.html", "./任务管理台.html"],
  ["明信片追踪.html", "./明信片追踪.html"],
  ["书影音海报墙.html", "./书影音海报墙.html"],
  ["媒体进度看板.html", "./媒体进度看板.html"],
  ["index.html", "./"],
  ["home.html", "./home.html"]
];
function offlineFallback(url){
  var p="";
  try{ p=decodeURIComponent(new URL(url).pathname); }catch(_){}
  var chain=[];
  for(var i=0;i<NAV_MAP.length;i++){
    if(p.indexOf(NAV_MAP[i][0])>=0){ chain.push(NAV_MAP[i][1]); break; }
  }
  chain.push("./home.html", "./");
  return chain.reduce(function(prev,u){
    return prev.then(function(r){
      return r || caches.match(u, {cacheName:APP_CACHE, ignoreSearch:true});
    });
  }, Promise.resolve(null)).then(function(r){ return r || Response.error(); });
}
/* C-11：海报图做限量 CacheFirst（只缓存本次 SW 生命周期内前 120 张，避免撑爆配额）。 */
const POSTER_CACHE_LIMIT=120;
var posterCached=0;
function isPosterRequest(url){
  try{ return decodeURIComponent(new URL(url).pathname).indexOf("/媒体海报/")>=0; }catch(_){ return false; }
}
function fromCache(req){
  return caches.match(req, {cacheName:APP_CACHE, ignoreSearch:true})
    .then(function(r){ return r || Response.error(); });
}
self.addEventListener("fetch", function(e){
  if(e.request.method!=="GET") return;
  if(e.request.mode!=="navigate" && isPosterRequest(e.request.url)){
    e.respondWith(
      caches.match(e.request, {cacheName:APP_CACHE, ignoreSearch:true}).then(function(hit){
        if(hit) return hit;
        return fetch(e.request).then(function(res){
          if(res && res.ok && posterCached < POSTER_CACHE_LIMIT){
            posterCached++;
            var copy=res.clone();
            caches.open(APP_CACHE).then(function(c){ return c.put(e.request, copy); }).catch(function(){});
          }
          return res;
        }).catch(function(){ return fromCache(e.request); });
      })
    );
    return;
  }
  var upstream;
  if(e.request.mode==="navigate"){
    upstream = fetch(e.request.url, {cache:"no-store", credentials:"same-origin", redirect:"follow"})
      .catch(function(){ return fetch(e.request); });
  }else{
    upstream = fetch(e.request);
  }
  e.respondWith(
    upstream.catch(function(){
      if(e.request.mode==="navigate") return offlineFallback(e.request.url);
      return fromCache(e.request);
    })
  );
});
