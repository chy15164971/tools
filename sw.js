/* 任务管理台 Service Worker
   - M10/PWA：提供 fetch 处理（静态直连 + 离线兜底首页）满足可安装性
   - M2：页面关闭后定时检查提醒计划（Cache 'wb-remind-plan'），到点弹系统通知（尽力而为）
   注意：本文件与 manifest.json/icons 只在部署到 https 时生效；本地双击 HTML 不会触发注册。
   P2-11：SW 空闲会被浏览器冻结/终止，setInterval 仅尽力而为；页面关闭后不保证准时提醒。 */
const PLAN_CACHE="wb-remind-plan";
const SENT_CACHE="wb-remind-sent";
/* v10（2026-11-16 第三梯队）：明信片解除关联、门户卡片文案、看板暗色跳转壳
   三处 HTML 字节变化；另外预缓存失败不再静默吞掉（记录并 console.warn），
   海报缓存改为按 cache.keys() 计数 + LRU 淘汰（原先生命周期计数器重启归零，
   缓存可无限增长）。沿用既有约定：只改 HTML 不触发 install，故升版本强制重新预缓存。 */
/* v19（2026-11-21）：观剧记录并入站点正式页——六页导航条 + 门禁体系，海报墙/观剧页 HTML 字节变化。
   沿用既有约定：只改 HTML 不触发 install，故升版本强制重新预缓存；PRECACHE 与 NAV_MAP 同步纳入观剧页。 */
/* v20（2026-11-21）：旅行地图并入站点正式页——七页导航条 + 门禁体系，地图页改标准 key 加载并接入共享层。
   沿用既有约定：只改 HTML 不触发 install，故升版本强制重新预缓存；PRECACHE 与 NAV_MAP 同步纳入旅行地图。 */
const APP_CACHE="wb-app-v20";
/* v9（2026-11-16 低风险批）：海报墙补 viewport-fit / 缩略图 alt / 遮罩前缀，
   任务台与 index 补 -webkit- 前缀，门户降级计数标签纠正口径；另外 navigate
   分支补 res.ok 检查——此前 HTTP 404 会 resolve(!ok) 直接漏给离线用户。
   沿用既有约定：只改 HTML 不触发 install，故升版本强制重新预缓存。 */
/* v8（2026-11-16 遗留风险修复）：弹窗无障碍 IIFE 抽唯一源后四页 HTML 字节全变，
   海报墙另加「待认领感想」入口。沿用既有约定：只改 HTML 不触发 install，
   离线用户会继续读旧预缓存，故升版本强制重新预缓存。 */
/* v7（2026-11-15 P1+P2 修复）：任务台 / 海报墙 / 明信片三个 HTML 字节已变，
   沿用 v6 的约定：只改 HTML 不触发 install，离线用户会继续读旧预缓存，故升版本强制重新预缓存。 */
/* v6（2026-11-13 W-06 方案 A）：任务台收件箱拖放死代码移除、文案改为只提「安排」。
   只改 HTML 而不改 sw.js 字节不会触发 install，离线用户会继续从 v5 缓存读旧页面，故升版本强制重新预缓存。
   v5（2026-11-06 审查修复 C-11/C-12）：补齐 PRECACHE 缺项；navigate 失败按路径回对应页；
   非导航失败先查预缓存；海报图做限量 CacheFirst。升版本以强制重新预缓存。
   v4：页头工作台 logo 改用三卡组 SVG（icons/workbench-icon.svg）并纳入预缓存。
   v3：换了工作台图标 + 导航请求绕过 Pages 的 max-age=600 磁盘缓存。 */
/* "./" 是目录根，GitHub Pages 在该路径提供的正是 index.html，故不另列 ./index.html。 */
const PRECACHE=["./", "./home.html", "./任务管理台.html", "./明信片追踪.html", "./书影音海报墙.html", "./观剧记录.html", "./旅行地图.html",
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
      var failed=[];
      await Promise.all(PRECACHE.map(function(u){
        return c.add(u).then(function(){}, function(err){
          failed.push(u); console.warn("[sw] 预缓存失败:", u, err && err.message);
        });
      }));
      if(failed.length) console.warn("[sw] 预缓存完成，失败 "+failed.length+"/"+PRECACHE.length+": "+failed.join(", "));
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
  ["观剧记录.html", "./观剧记录.html"],
  ["旅行地图.html", "./旅行地图.html"],
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
/* 2026-11-16 第三梯队：原先 posterCached 是 SW 生命周期内计数器，重启归零后缓存可无限增长。
   改为按 cache.keys() 里真正的海报条目计数并淘汰最旧的（keys 按插入顺序）；
   串行链避免并发请求同时判断超量。只淘汰海报键，不动 PRECACHE 的 16 项。 */
var posterChain=Promise.resolve();
function cachePoster(req, copy){
  posterChain=posterChain.then(function(){
    return caches.open(APP_CACHE).then(function(c){
      return c.keys().then(function(keys){
        var posters=keys.filter(function(k){ return isPosterRequest(k.url); });
        var over=posters.length-POSTER_CACHE_LIMIT+1;
        if(over>0) return Promise.all(posters.slice(0,over).map(function(k){ return c.delete(k); }));
      }).then(function(){ return c.put(req, copy); });
    });
  }).catch(function(){});
  return posterChain;
}
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
          if(res && res.ok){ cachePoster(e.request, res.clone()); }
          return res;
        }).catch(function(){ return fromCache(e.request); });
      })
    );
    return;
  }
  var upstream;
  if(e.request.mode==="navigate"){
    upstream = fetch(e.request.url, {cache:"no-store", credentials:"same-origin", redirect:"follow"})
      .then(function(res){ if(res && !res.ok) throw new Error("HTTP "+res.status); return res; })
      .catch(function(){
        return fetch(e.request).then(function(res){
          if(res && !res.ok) throw new Error("HTTP "+res.status);
          return res;
        });
      });
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
