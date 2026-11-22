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
const APP_CACHE="wb-app-v38";
/* v32（2026-11-22 P2 打磨）：八页 HTML / timeline-core 字节变化。
   SW 级（全站审查 P2）：① 预缓存失败不再 console.warn 后照常 activate——改为 throw 让
   install 失败，浏览器会按生命周期自动重试；否则弱网下某页预缓存失败即永久缺页，
   activate 还会无条件删掉旧缓存，离线兜底只能退首页。② 导航请求 no-store→no-cache：
   no-store 每次跳页全量重下 842KB，no-cache 命中 ETag 走 304 条件重验。
   页面级：海报墙导出文件名本地日期 / toast 键盘避让 / 触屏 hover 复位 / theme-color 统一，
   时间线筛选焦点保持 + theme-color 跟随，地图日记脏检查 + 布局 flex 化 + askConfirm，
   任务台次级域写盘走安全通道 + 撤销回滚统计流水 + 月视图触屏拖拽 + 命令面板性能，
   明信片双转义 / 折叠条键盘可达 / Esc 关菜单，timeline-core 精确替换补计数递减。 */
/* v31（2026-11-22 批三体感与无障碍）：八页 HTML / timeline-core / site-nav 字节全部变化。
   页面级：任务台习惯格改 <button>（键盘可达）+ 六个弹窗补 Escape + 状态色全套换语义 token；
   明信片筛选条按视图缓存（搜索不再失焦）+ toast/徽章对比度；地图切层级清搜索词、
   日记默认本地日期、toast 反色；观剧保存幂等锁、toast 反色；时间线核心新增 loadDiaryEvents
   与 collect extra 合并（首页摘要含日记，与时间线页口径对齐）。
   SW 级：预缓存改 cache:"reload"（绕过 Pages max-age=600 预缓存旧 HTML）、
   静态资源 no-cache 条件重验、注册加 updateViaCache:"none"；
   观剧/地图补 manifest 与 theme-color。 */
/* v29（2026-11-22 批一止血）：四处真缺陷修复，观剧 / 明信片 / 地图三页 HTML 字节已变。
   ① 观剧补 idbGet（删除带照片的记录此前抛 ReferenceError，删除静默失效）；
   ② 观剧照片 src 补转义 + 导入只接受图片 dataURL（此前备份里的 dataUrl 原样当缩略图，构成注入面）；
   ③ 明信片「本地备份」面板初始态由内联 display:none 改为 hidden 属性（内联样式永不移除，
      该面板此前永远打不开，导出 / 导入按钮完全不可达）；
   ④ 地图 #mapWrap 补 position:relative（降级层此前脱离容器铺满视口、吃掉全页点击），
      清空视图时同步删 litAt（此前时间线继续报已清空的点亮）。
   沿用既有约定：只改 HTML 不触发 install，故升版本强制重新预缓存。 */
/* v28（2026-11-22 字段分家）：海报墙内置影音的 date 改名为 release（1377 条），
   date 从此只表示「我完成的日期」。完成年份分布 / 月度完成节奏 / 最近完成 / 兴趣画像
   近期权重 / 最近完成排序全部改按 date，影音发行年份另设「影音发行年代」图表；
   弹窗改按字段（不是按类型）区分「读完于 / 完成于 / 发行于」。海报墙 HTML 字节已变，
   按既定约定升版本强制重新预缓存（只改 HTML 不触发 install）。 */
/* v27（2026-11-22 时间戳）：海报墙书本 date 补到日级（豆瓣导出真实读过日期）、新增心愿单 wishAt、
   详情弹窗区分「读完于 / 发行于」，并新增只读索引 wb_mediawall_readlog_v1 供时间线取「读完了」；
   时间线加「含历史读完」开关与月/年精度显示。海报墙与时间线两个 HTML 字节已变，
   按既定约定升版本强制重新预缓存（只改 HTML 不触发 install）。 */
/* v26（2026-11-22 时间线）：新增第八页 时间线.html，导航条加「时间线」并注入 TIMELINE-CORE，
   六页 HTML 字节全变、首页多一张汇总卡，按既定约定升版本强制重新预缓存。 */
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
const PRECACHE=["./", "./home.html", "./任务管理台.html", "./明信片追踪.html", "./书影音海报墙.html", "./观剧记录.html", "./旅行地图.html", "./时间线.html",
                "./manifest.json", "./媒体自定义条目.js", "./媒体进度看板.html",
                "./icons/icon-152.png", "./icons/icon-167.png", "./icons/icon-180.png",
                "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-512-maskable.png",
                "./icons/favicon.ico", "./icons/workbench-icon.svg",
                "./icons/timeline-icon.svg", "./icons/timeline-icon-180.png", "./icons/timeline-icon-192.png",
                "./随笔.html", "./作品集.html",
                "./assets/portfolio/g01.png", "./assets/portfolio/g02.png", "./assets/portfolio/g03.png",
                "./assets/portfolio/g04.png", "./assets/portfolio/g05.png", "./assets/portfolio/g06.png",
                "./assets/portfolio/g07.png", "./assets/portfolio/g08.png", "./assets/portfolio/g09.png"];

// 2026-11-04 站点统一：预缓存门户 + 三个子页，离线可从任一页兜底回工作台首页
self.addEventListener("install", function(e){
  self.skipWaiting();
  e.waitUntil((async function(){
    const c=await caches.open(APP_CACHE);
    var failed=[];
    await Promise.all(PRECACHE.map(function(u){
      /* 批三：cache:"reload" 强制绕过 GitHub Pages 的 max-age=600 磁盘缓存——
         否则 install 可能正好把改版前 10 分钟内的旧 HTML 预缓存进 APP_CACHE，
         离线用户读到的永远是旧版。 */
      return c.add(new Request(u, {cache:"reload"})).then(function(){}, function(err){
        failed.push(u); console.warn("[sw] 预缓存失败:", u, err && err.message);
      });
    }));
    /* P2：失败即 throw 让 install 失败（浏览器自动重试），旧 SW 继续服务——
       此前只 warn 后照常 activate，且 activate 无条件删旧缓存，
       弱网下某页预缓存失败即永久缺页、离线兜底只能退首页。 */
    if(failed.length) throw new Error("[sw] 预缓存失败 "+failed.length+"/"+PRECACHE.length+" 项: "+failed.join(", "));
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
  ["时间线.html", "./时间线.html"],
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
    /* P2：no-store→no-cache——no-store 每次跳页全量重下整页 HTML，
       no-cache 同样绕过磁盘缓存旧字节但可命中 ETag 走 304 条件重验，跳页便宜得多。 */
    upstream = fetch(e.request.url, {cache:"no-cache", credentials:"same-origin", redirect:"follow"})
      .then(function(res){ if(res && !res.ok) throw new Error("HTTP "+res.status); return res; })
      .catch(function(){
        return fetch(e.request).then(function(res){
          if(res && !res.ok) throw new Error("HTTP "+res.status);
          return res;
        });
      });
  }else{
    /* 批三：no-cache 条件重验（304 便宜）——GitHub Pages max-age=600 会让
       媒体自定义条目.js 等静态资源在改版后 10 分钟内还是旧字节。 */
    upstream = fetch(e.request, {cache:"no-cache"});
  }
  e.respondWith(
    upstream.catch(function(){
      if(e.request.mode==="navigate") return offlineFallback(e.request.url);
      return fromCache(e.request);
    })
  );
});
