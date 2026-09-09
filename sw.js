/* 任务管理台 Service Worker
   - M10/PWA：提供 fetch 处理（静态直连 + 离线兜底首页）满足可安装性
   - M2：页面关闭后定时检查提醒计划（Cache 'wb-remind-plan'），到点弹系统通知（尽力而为）
   注意：本文件与 manifest.json/icons 只在部署到 https 时生效；本地双击 HTML 不会触发注册。 */
const PLAN_CACHE="wb-remind-plan";
const SENT_CACHE="wb-remind-sent";
const APP_CACHE="wb-app-v1";

// P1-3：install 时 precache 首页，让离线兜底真正可用（fetch 兜底 caches.match 才能命中）
self.addEventListener("install", function(e){
  self.skipWaiting();
  e.waitUntil((async function(){
    try{
      const c=await caches.open(APP_CACHE);
      await c.add("./");
    }catch(_){}
  })());
});
self.addEventListener("activate", function(e){
  e.waitUntil(self.clients.claim());
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
self.addEventListener("fetch", function(e){
  if(e.request.method!=="GET") return;
  e.respondWith(
    fetch(e.request).then(function(r){ return r; }).catch(function(){
      if(e.request.mode==="navigate") return caches.match("./", {cacheName:APP_CACHE, ignoreSearch:true});
      return Response.error();
    })
  );
});
