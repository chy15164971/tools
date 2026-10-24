/* ============================================================================
 * shared.js —— 任务管理台 / 明信片追踪 公共层（单一事实源）
 * ----------------------------------------------------------------------------
 * 用法：改完本文件后运行 `python3 _shared/inject_shared.py`，
 *       会把本文件内容内联进两个 HTML 的 SHARED 块（保持单文件零依赖可离线）。
 *
 * 收录原则（实测依据见代码审查报告第九节）：
 *   1. 两文件实现逐字节一致 → 直接抽；
 *   2. 有分歧但可统一且某版更优 → 取优版（本文件 3 处，见下）；
 *   3. 同名但实现不同（esc / save / load / renderAll …）→ 一律不抽。
 *
 * 已取优统一的分歧：
 *   · fetchWithTimeout —— 任务台 12000ms / 明信片 15000ms → 统一 15000（云同步更宽容）
 *   · safeUrl          —— 任务台返回原串 / 明信片返回 esc(u) → 统一带转义（防 XSS）
 *   · toast            —— 任务台用全局 toastT / 明信片用 el._timer → 统一挂元素（免全局污染）
 *
 * 依赖约定：本层函数引用宿主文件已定义的 cloud / CLOUD_KEY / CLOUD_KEY_ALT /
 *   esc / EMOJI_ICON / _emojiRe 等。
 *
 * ⚠️ 放置位置铁律（2026-09-10 血案，务必先读）：
 *   本块必须与上述标识符 **处于同一作用域**，否则静默失效。
 *   · 任务管理台 —— 应用代码在脚本顶层 → 本块置于脚本最前即可；
 *   · 明信片追踪 —— 应用整体包在 (function(){ … })() 内，esc / cloud / CLOUD_KEY
 *     都是 IIFE 私有 → 本块必须置于该 IIFE **内部**。
 *     曾因放在 IIFE 外，导致 safeUrl() 里的 esc() 抛 `ReferenceError: esc is not
 *     defined`，初始化中断、页面整片空白。
 *   移动本块后，务必在浏览器/jsdom 里实测「零报错 + 页面正常渲染」再发布。
 * ==========================================================================*/

/* ===== 配置常量集中（P2-6，2026-10-24）=====
 * 只收「两页同语义、且取值相同」的时间/阈值，避免改一处漏三处。
 * ⚠️ 不收的几类（保持字面量就地书写，勿强行统一）：
 *   · 页面特有节奏 —— 任务台静默拉取 15s / 提醒轮询 30s、明信片自动拉取 30s、
 *     拉取节流 8s、失败退避（15s 基数 / 429 专项 30000）：取值与语义都随页面
 *     策略走，共用一个常量会让「调超时」意外改动「退避曲线」这类不相关行为；
 *   · toast 时长阶梯档位（4800/7000/5000/3200/1800）：是「文本越长停越久」的
 *     连续档位之一，单独抽 7000 会与 CFG_FAIL_TOAST_MS 撞名撞义。
 */
const CFG_DAY_MS             = 86400000;  // 一天的毫秒数（日期差 / 日期偏移）
const CFG_FETCH_TIMEOUT_MS   = 15000;     // 云同步单次请求超时（fetchWithTimeout 默认值）
const CFG_WARN_THROTTLE_MS   = 30000;     // 同类告警 toast 节流窗口（窗口内只提示一次）
const CFG_FAIL_TOAST_MS      = 7000;      // 保存 / 写入失败类 toast 停留时长
const CFG_UNDO_TOAST_MS      = 8000;      // 删除类（带撤销）toast 停留时长
const CFG_UPLOAD_DEBOUNCE_MS = 1500;      // 连续保存后的上传防抖

const PAGE_SIZE=100;
const _pg={}, _pgSig={}, _pgGo={};
/* P0-4（2026-10-04 紧急修复）：补回 pgSig —— 此前**只有调用、零定义**（_pgSig 是下面 pgSlice 内部的 Map，不是这个函数），
   明信片的 renderTable 四分支与分页条都调它 → 一进 renderAll 就抛 ReferenceError 中断整个 script（页面只剩静态 HTML）。
   作用：给当前列表算「数据指纹」传给 pgSlice —— 指纹变了（筛掉了 / 换视图 / 数据变了）就把页码重置回第 1 页，
   否则删到第 2 页再改筛选条件，会停在空白页上（"我明明还有数据"）。
   ⚠️ 本函数依赖各文件宿主的 view / postcards / received / proxies / activities / filter / rfilter / pfilter / afilter / sort，
      在 shared.js 里以宿主全局变量引用（两文件均有这些变量，故可共用）。 */
function pgSig(){
  var src = view==="sent" ? postcards : view==="received" ? received : view==="proxy" ? proxies : activities;
  var flt = view==="sent" ? filter : view==="received" ? rfilter : view==="proxy" ? pfilter : afilter;
  var mx=0; (src||[]).forEach(function(x){ var u=Number(x&&x.updatedAt); if(u>mx) mx=u; });
  return view+"|"+(src?src.length:0)+"|"+JSON.stringify(flt)+"|"+((sort&&sort[view])||"")+"|"+mx;
}

function pgSlice(list,key,sig){
  const n=Array.isArray(list)?list.length:0;
  const pages=Math.max(1,Math.ceil(n/PAGE_SIZE));
  if(sig!=null && _pgSig[key]!==sig){ _pgSig[key]=sig; _pg[key]=1; }
  let p=Number(_pg[key])||1;
  if(p>pages) p=pages;
  if(p<1) p=1;
  _pg[key]=p;
  // 非数组/null 一律退化为空数组，避免调用方 .length/.map 崩溃
  return n>PAGE_SIZE ? list.slice((p-1)*PAGE_SIZE, p*PAGE_SIZE) : (Array.isArray(list)?list:[]);
}

function pgBar(total,key,onGo){
  if(onGo) _pgGo[key]=onGo;
  const n=Number(total)||0;
  if(n<=PAGE_SIZE) return "";
  const pages=Math.max(1,Math.ceil(n/PAGE_SIZE));
  const p=Math.max(1,Math.min(pages,Number(_pg[key])||1));
  const from=(p-1)*PAGE_SIZE+1, to=Math.min(n,p*PAGE_SIZE);
  const btn=(act,label,dis,cur)=>`<button type="button" class="pgbtn${cur?" cur":""}" data-pg="${act}" data-pgk="${key}"${dis?" disabled":""}>${label}</button>`;
  // 页码窗口：首页/末页常驻，当前页左右各 2 页，其余折叠为 …
  let nums="";
  for(let i=1;i<=pages;i++){
    if(i===1||i===pages||Math.abs(i-p)<=2){ nums+=btn("go:"+i,String(i),false,i===p); }
    else if(nums.slice(-20).indexOf("…")<0){ nums+=`<span class="pgdots">…</span>`; }
  }
  /* 低-6（2026-10-24）：prev/next 为纯字形按钮，无可见可读名；补 aria-label 让读屏可辨识。
     页码按钮本身带数字文本，无需 aria-label，故只特例 prev/next。data-pg 保留 prev/next 供 pgBind 识别。 */
  const prevBtn=`<button type="button" class="pgbtn" data-pg="prev" data-pgk="${key}" aria-label="上一页"${p<=1?" disabled":""}>‹</button>`;
  const nextBtn=`<button type="button" class="pgbtn" data-pg="next" data-pgk="${key}" aria-label="下一页"${p>=pages?" disabled":""}>›</button>`;
  return `<div class="pager"><span class="pg-info">第 ${from}–${to} 条 / 共 ${n} 条</span><span class="pg-nums">${prevBtn}${nums}${nextBtn}</span></div>`;
}

function pgBind(){
  if(window.__pgBound) return;
  window.__pgBound=true;
  document.addEventListener("click",e=>{
    const b=e.target&&e.target.closest?e.target.closest("[data-pg]"):null;
    if(!b||b.disabled) return;
    const key=b.dataset.pgk, act=b.dataset.pg;
    if(!key) return;
    let p=Number(_pg[key])||1;
    if(act==="prev") p=Math.max(1,p-1);
    else if(act==="next") p=p+1;
    else if(act.indexOf("go:")===0) p=Number(act.slice(3))||1;
    else return;
    _pg[key]=p;                       // 越界由 pgSlice 在下次渲染时 clamp
    const fn=_pgGo[key];
    if(typeof fn==="function") fn();  // 重新渲染当前视图
  });
}

function authHeader(){ return (cloud.token||"").startsWith("github_pat_") ? "Bearer "+cloud.token : "token "+cloud.token; }

function cloudLoad(){ try{ const r=localStorage.getItem(CLOUD_KEY); let o=r?JSON.parse(r):null; if(!o||(!o.token&&!o.gist)){ const a=localStorage.getItem(CLOUD_KEY_ALT); if(a) o=JSON.parse(a); } if(o){ cloud={token:o.token||"", gist:o.gist||"", auto:o.auto!==false}; } }catch(e){} }

function normTomb(x){ return (x && typeof x==="object") ? {id:String(x.id), ts:x.ts||0} : {id:String(x), ts:0}; }

function parseConfig(txt){
  const out={gist:"", token:""};
  if(!txt) return out;
  String(txt).split(/\r?\n/).forEach(ln=>{
    const m=ln.match(/^\s*(Gist\s*ID|Gist|Token)\s*[:：]\s*(.*)$/i);
    if(!m) return;
    // 关键：值必须 trim 后非空才算数。原用 (.+?)\s*$ 会把「冒号后的空格」本身当成值，
    // 于是 "Token: "（空配置）被解析成 " " —— truthy，绕过「没找到配置」校验，
    // 把空格写进 cloud.token 去请求 API，用户只看到含糊的「云端暂无数据 / 读取失败」。
    const v=(m[2]||"").trim();
    if(!v) return;
    const k=m[1].toLowerCase();
    if(k.indexOf("gist")===0) out.gist=v; else if(k==="token") out.token=v;
  });
  return out;
}

function setCloudPill(state){
  const el=document.getElementById("cloudPill"); if(!el) return;
  const ic='<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>';
  if(state==="syncing"){ el.innerHTML=ic+" 同步中…"; el.className="cloudpill syncing"; }
  else if(state==="ok"){ el.innerHTML=ic+" 已同步"; el.className="cloudpill ok"; }
  else if(state==="err"){ el.innerHTML=ic+" 同步失败"; el.className="cloudpill err"; }
  else { el.innerHTML=ic+" 仅本地"; el.className="cloudpill off"; }
}

/* ---------- HTTP 错误翻译（P2-10） ----------
 * 原先各处直接抛「下载失败：HTTP 404· Not Found」，用户完全不知道该改什么；
 * 而找回弹窗却专门特判了 401 —— 自相矛盾。GitHub API 的状态码含义固定，故在此收口一次。
 * 最常见的是 401（Token 过期/填错）与 404（Gist ID 打错或已删除），两者都是「配置问题」而非「网络问题」，
 * 提示必须指向「改配置」这个具体动作，否则用户只会反复重试。 */
function explainHttp(status, what){
  var w = what || "同步";
  var map = {
    401: "Token 无效或已过期。请在设置里重新复制粘贴 Token（GitHub → Settings → Developer settings → Personal access tokens，需勾选 gist 权限）",
    403: "没有访问权限。可能是 Token 权限不足、被限流，或该 Gist 不属于当前 Token 的账号",
    404: "找不到这个 Gist。请检查 Gist ID 是否输错（只粘 ID、别带 URL），或该 Gist 已被删除",
    422: "GitHub 无法处理这个请求。通常是 Gist ID 格式不对",
    409: "存在冲突。请稍后重试"
  };
  if(map[status]) return w+"失败：HTTP "+status+" —— "+map[status];
  if(status>=500) return w+"失败：HTTP "+status+" —— GitHub 服务器暂时不可用，稍后会自动重试，本机数据未受影响";
  if(status>=400) return w+"失败：HTTP "+status;
  return w+"失败：HTTP "+status;
}

/* P2-11（2026-10-03）：显式 kind（syncing/ok/warn/err/info）取代「靠中文字符串正则猜状态」。
   起因：最有价值的「同步完成 ✓ 合并了 N 项」不匹配任何分支，被渲染成灰色中性卡片，绿色成功态从不出现；
   「同步中」又被归到 warn 显示成黄色警告。第二参 err 保留兼容旧调用点，kind 缺省时才退回正则猜测。 */
function setCloudStatus(msg, err, kind){
  const card=document.getElementById("csStatus"); if(!card) return;
  const iconEl=document.getElementById("csStatusIcon");
  const titleEl=document.getElementById("csStatusTitle");
  const descEl=document.getElementById("csStatusDesc");
  let type=kind, title="", desc=msg||"";
  if(type){
    title = type==="ok"?"成功" : type==="err"?"同步失败" : type==="syncing"?"同步中…" : type==="warn"?"注意":"提示";
  } else if(!msg){ type="info"; title="未配置"; desc="在上方填入 Gist ID 与 Token 即可开始同步"; }
  else if(err){ type="err"; title="同步失败"; }
  else if(/同步中|拉取中|上传中|下载中|正在|已配置/.test(msg)){ type="syncing"; title="同步中…"; }
  else if(/同步完成|已同步|已是最新|上传成功|已复制|已从剪贴板|已覆盖|已取消|成功/.test(msg)){ type="ok"; title="成功"; }
  else if(/失败|错误|无法|不支持|请|没找到|缺少/.test(msg)){ type="warn"; title="注意"; }
  else { type=err?"err":"info"; title="提示"; }
  card.className="cloud-status-card "+type;
  const icons={
    ok:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    err:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    warn:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };
  if(iconEl) iconEl.innerHTML=icons[type]||icons.info;
  if(titleEl) titleEl.textContent=title;
  if(descEl) descEl.textContent=desc;
}

function closeRecoverModal(){ const m=document.getElementById("recoverMask"); if(m) m.classList.remove("show"); }

function debounce(fn, wait){
  let t; return function(){ const a=arguments, c=this; clearTimeout(t); t=setTimeout(()=>fn.apply(c,a), wait||240); };
}

function iconify(t){if(t==null)return t;t=String(t);if(!_emojiRe){var ks=Object.keys(EMOJI_ICON).map(function(k){return k.replace(/[.*+?^${}()|[\]\\]/g,'$&');});_emojiRe=new RegExp('('+ks.join('|')+')','g');}return t.replace(_emojiRe,function(m){return '<svg class="ic-svg" viewBox="0 0 24 24" aria-hidden="true"><use href="#ic-'+EMOJI_ICON[m]+'"/></svg>';});}

function fetchWithTimeout(url, opts, ms){
  opts=opts||{};
  const ctrl=new AbortController();
  const id=setTimeout(function(){ ctrl.abort(); }, ms||CFG_FETCH_TIMEOUT_MS);
  return fetch(url, Object.assign({}, opts, {signal:ctrl.signal})).finally(function(){ clearTimeout(id); });
}

function safeUrl(u){ u=(u||"").trim(); if(!u) return "#"; if(/^(https?:|mailto:|tel:)/i.test(u)) return esc(u); try{ var _p=new URL(u,location.href); if(_p.protocol==="http:"||_p.protocol==="https:") return esc(u); }catch(e){} return "#"; }

/* P0-1（2026-10-03）：第三参ms 是必需的 —— 配额/保存失败这类提示有62 字，1.8s 根本读不完；
   且 toast 固定底部、会盖住弹窗底部按钮，失败提示必须给足时长。省略时按字数自适应。
   hover 暂停：读长文案时能按住不放。 */
function toast(msg, kind, ms, undoFn){
  const t=document.getElementById("toast");
  /* 第四参 undoFn（2026-10-19 审查补回）：渲染「撤销」按钮（对标 Todoist Undo toast）。
     该能力 fdc6c7c 引入、后被重构误删（toastUndo 11 处调用悬空）。按钮不吃容器 pointer-events:none（PITFALLS 533 样式仍在）。 */
  if(typeof undoFn==="function"){
    t.innerHTML='<span class="toast-msg">'+esc(msg)+'</span><button class="toast-undo" type="button">撤销</button>';
    const b=t.querySelector(".toast-undo");
    b.onclick=function(){ t.classList.remove("show"); clearTimeout(t._timer); try{ undoFn(); }catch(e){} };
  }else{
    t.textContent=msg;
  }
  t.className="toast"+(kind?(" "+kind):"");
  t.classList.add("show"); clearTimeout(t._timer);
  var n=String(msg==null?"":msg).length;
  /* 2026-10-23 撤销窗口修正：undo 分支此前硬编码 4800、无视调用方传的 ms，
     明信片「删除 8s / 清空 12s」的撤销窗口因此无法生效。现 ms 优先，缺省仍 4800（两文件既有 toastUndo 调用行为不变）。 */
  var dur = (ms || (typeof undoFn==="function" ? 4800 : (n>60?7000 : n>30?5000 : n>14?3200 : 1800)));
  t._timer=setTimeout(function(){ t.classList.remove("show"); }, dur);
}
/* P0-1：保存失败时的统一可行动文案。此前 save() 的返回值被全链路丢弃，
   配额满/隐私模式导致写盘失败时仍弹「已保存」成功提示 —— 用户以为存上了，实则数据在内存里。 */
var SAVE_FAIL_TXT="保存失败：浏览器存储空间已满或被禁用（无痕模式？）。请先导出备份，再清理浏览器数据腾出空间。改动仍在本页内存中，刷新会丢失。";
/* P0-1：所有「用户可见的写操作 + 成功提示」都走这里，成功才提示，失败必给可行动告警。
   不要在调用点写 `save(); toast("已保存")` —— 那是本次静默丢数据的根因。 */
function saveAndToast(okMsg){
  var ok = save(okMsg);
  /* 两种宿主实现，靠返回值区分：
     · 返回 "__pending__" —— 宿主 save 是节流异步版（任务台），成功文案已被挂起，
       将由 save() 在真正落盘后按 storageSetSafe 的真实结果决定是否弹出，此处不能再弹。
     · 返回 true/false   —— 宿主 save 是同步版（明信片），直接按结果提示。 */
  if(ok==="__pending__") return true;
  if(ok===false){ toast("⚠️ "+SAVE_FAIL_TXT, "danger", CFG_FAIL_TOAST_MS); return false; }
  if(okMsg) toast(okMsg);
  return true;
}

/* ---------- 无障碍增强（D4 B+） ---------- */

/* N4 无障碍播报：写入 <div id="srAnnounce" role="status" aria-live="polite">。
   相同文本去重 —— 整页重渲染很频繁，若不去重会把读屏刷爆。
   注：toast 本身已是 aria-live，故本函数只用于「不该弹视觉提示」的静默反馈
   （如列表条数/页码变化），不要用它重复 toast 的职责。 */
function announce(msg){
  const el=document.getElementById("srAnnounce"); if(!el||!msg) return;
  if(el.__last===msg) return;
  el.__last=msg;
  el.textContent="";
  setTimeout(function(){ el.textContent=msg; }, 30);   // 先清空再写，确保读屏感知到「变化」
}

/* N4 分页列表摘要：播报「共 N 条，当前第 a–b 条（第 p/P 页）」。
   由分页型列表在渲染末尾调用；页码取自本层 _pg，与分页条自动一致。 */
function announceList(key, total){
  const n=Number(total)||0;
  if(n<=0){ announce("没有匹配的记录"); return; }
  if(n<=PAGE_SIZE){ announce("共 "+n+" 条"); return; }
  const pages=Math.max(1,Math.ceil(n/PAGE_SIZE));
  const p=Math.max(1,Math.min(pages,Number(_pg[key])||1));
  announce("共 "+n+" 条，当前第 "+((p-1)*PAGE_SIZE+1)+"–"+Math.min(n,p*PAGE_SIZE)+" 条（第 "+p+"/"+pages+" 页）");
}

/* N3 tablist 键盘导航：←/→ 切页签、Home/End 到首末（自动激活，符合 ARIA tabs 惯例）。
   宿主若已自行处理该 tablist 并 preventDefault（任务台 #seg 自带方向键逻辑），
   本层靠 e.defaultPrevented 自动让位，不会双重切换。 */
function bindTablistKeys(){
  if(window.__tabKeysBound) return;
  window.__tabKeysBound=true;
  document.addEventListener("keydown",function(e){
    if(e.defaultPrevented) return;                       // 宿主已处理 → 让位
    const k=e.key;
    if(k!=="ArrowRight"&&k!=="ArrowLeft"&&k!=="Home"&&k!=="End") return;
    const t=e.target, tl=(t&&t.closest)?t.closest('[role="tablist"]'):null; if(!tl) return;
    const bs=[].slice.call(tl.querySelectorAll('[role="tab"]')).filter(function(b){ return !b.disabled; });
    if(bs.length<2) return;
    const i=bs.indexOf(t); if(i<0) return;
    e.preventDefault();
    const j = k==="Home" ? 0 : k==="End" ? bs.length-1
            : k==="ArrowRight" ? (i+1)%bs.length : (i-1+bs.length)%bs.length;
    try{ bs[j].focus(); }catch(_){}
    try{ bs[j].click(); }catch(_){}
  });
}

/* N1 弹窗补 dialog 语义（审查 中-7 / 低-9 下沉：原两文件各抄一份，现已单一事实源）。
   弹窗缺 role/aria-modal 时，读屏读不出「弹窗已打开」及其边界；用标题作可读名。
   幂等：重复调用安全；annivMask/introMask 等已在 HTML 内联 role，无需补。同时统一接管 N3 tablist 键盘导航。 */
function enhanceDialogA11y(){
  document.querySelectorAll(".mask").forEach(function(m,i){
    if(!m.getAttribute("role")) m.setAttribute("role","dialog");
    if(!m.getAttribute("aria-modal")) m.setAttribute("aria-modal","true");
    if(m.getAttribute("aria-labelledby")||m.getAttribute("aria-label")) return;
    var h=m.querySelector(".modal h2, .modal h3, .w-modal h2, .w-modal h3, h2, h3");
    if(!h) return;
    if(!h.id) h.id="dlgTitle"+(i+1);
    m.setAttribute("aria-labelledby",h.id);   // 用 id 关联，标题文案动态变化也能跟上
  });
  bindTablistKeys();
}

/* ============================================================================
 * 通用弹窗（审查 C1/R1：统一底座，消除「同名分叉」）
 * ----------------------------------------------------------------------------
 * 此前 confirmDialog 在任务台 / 明信片各实现一份且已分叉（明信片确认框曾缺
 * ESC 注册，见 M-14）。现收敛为单一事实源，由 inject_shared.py 注入两文件后统一维护。
 * promptModal / chooseModal 为任务台专用交互；明信片暂无对应 DOM，函数以
 * 「DOM 缺失则兜底」避免阻断流程。
 * 依赖约定：本层引用宿主已定义的 esc（明信片为 IIFE 私有，任务台为全局）；
 *   DOM 容器 #confirmMask / #promptMask / #chooseMask 由宿主 HTML 提供。
 * ==========================================================================*/

function confirmTitle(message, opts){
  if(opts && opts.title) return opts.title;
  var m=message||"";
  if(/删除|移除|清空|彻底|回收站/.test(m)) return "删除确认";
  if(/覆盖/.test(m)) return "覆盖确认";
  if(/退出|放弃|取消订阅/.test(m)) return "操作确认";
  return "确认";
}

function confirmDialog(message, opts){
  opts=opts||{};
  return new Promise(function(resolve){
    const mask=document.getElementById("confirmMask");
    const titleEl=document.getElementById("confirmTitle");
    const msgEl=document.getElementById("confirmMsg");
    if(!mask||!titleEl||!msgEl){ resolve(false); return; }   // 兜底：DOM 缺失时不阻断流程
    titleEl.textContent=confirmTitle(message, opts);
    msgEl.textContent=message||"";
    const okBtn=document.getElementById("confirmOk");
    const cancelBtn=document.getElementById("confirmCancel");
    okBtn.textContent=opts.ok||"确定";
    cancelBtn.textContent=opts.cancel||"取消";
    okBtn.className="btn "+(opts.danger?"btn-danger":"btn-pri");
    let done=false;
    function finish(v){ if(done) return; done=true; mask.classList.remove("show"); mask.onclick=null; document.removeEventListener("keydown", onKey); resolve(v); }
    function onKey(e){ if(e.key==="Escape") finish(false); }
    okBtn.onclick=function(){ finish(true); };
    cancelBtn.onclick=function(){ finish(false); };
    /* M5：可选的第三个按钮（如导入时的「覆盖导入」），返回 opts.extraValue；不需要时隐藏 */
    const extraBtn=document.getElementById("confirmExtra");
    if(extraBtn){
      if(opts.extra){ extraBtn.style.display=""; extraBtn.textContent=opts.extra;
        extraBtn.className="btn "+(opts.extraDanger?"btn-danger":"btn-ghost");
        extraBtn.onclick=function(){ finish(opts.extraValue||"extra"); }; }
      else { extraBtn.style.display="none"; extraBtn.onclick=null; }
    }
    mask.onclick=function(e){ if(e.target.id==="confirmMask") finish(false); };
    document.addEventListener("keydown", onKey); // M-14 修复：必须 add，否则 Esc 无法关闭确认框
    mask.classList.add("show");
  });
}

/* 通用文本输入弹窗：替代原生 prompt()，统一弹窗体验、支持 Esc/遮罩关闭、回车确认。
   返回 trim 后的字符串；取消/关闭返回 null。opts:{title,message,value,placeholder,ok} */
function promptModal(message, opts){
  opts=opts||{};
  return new Promise(function(resolve){
    const mask=document.getElementById("promptMask");
    const inp=document.getElementById("promptInput");
    if(!mask||!inp){ resolve(window.prompt?window.prompt(message||"",opts.value||""):null); return; }
    document.getElementById("promptTitle").textContent=opts.title||"输入";
    document.getElementById("promptMsg").textContent=message||"";
    inp.value=opts.value||"";
    inp.placeholder=opts.placeholder||"";
    const okBtn=document.getElementById("promptOk"), cancelBtn=document.getElementById("promptCancel");
    okBtn.textContent=opts.ok||"确定";
    let done=false;
    function finish(v){ if(done) return; done=true; mask.classList.remove("show"); mask.onclick=null; document.removeEventListener("keydown", onKey); resolve(v); }
    function onKey(e){ if(e.key==="Escape"){ finish(null); return; } if(e.key==="Enter"){ finish(String(inp.value).trim()); } }
    okBtn.onclick=function(){ finish(String(inp.value).trim()); };
    cancelBtn.onclick=function(){ finish(null); };
    mask.onclick=function(e){ if(e.target.id==="promptMask") finish(null); };
    document.addEventListener("keydown", onKey);
    mask.classList.add("show");
    setTimeout(function(){ try{ inp.focus(); inp.select(); }catch(e){} },0);
  });
}

/* 通用选项选择弹窗：替代「用 prompt 手打选项名」的易错交互。
   opts:{title,message,options:[{value,label,desc}|string],value}；返回选中 value，取消返回 null */
function chooseModal(message, opts){
  opts=opts||{};
  return new Promise(function(resolve){
    const mask=document.getElementById("chooseMask"), listEl=document.getElementById("chooseList");
    if(!mask||!listEl){ resolve(window.prompt?window.prompt(message||""):null); return; }
    document.getElementById("chooseTitle").textContent=opts.title||"请选择";
    document.getElementById("chooseMsg").textContent=message||"";
    const arr=(opts.options||[]).map(function(o){ return (typeof o==="string")?{value:o,label:o,desc:""}:o; });
    listEl.innerHTML=arr.map(function(o){
      return '<button type="button" class="choose-item" data-cv="'+esc(String(o.value))+'" aria-current="'+((opts.value===o.value)?"true":"false")+'">'+esc(o.label)+(o.desc?'<span class="hint" style="display:block;font-size:12px;">'+esc(o.desc)+'</span>':'')+'</button>';
    }).join("");
    let done=false;
    function finish(v){ if(done) return; done=true; mask.classList.remove("show"); mask.onclick=null; document.removeEventListener("keydown", onKey); resolve(v); }
    function onKey(e){ if(e.key==="Escape") finish(null); }
    listEl.querySelectorAll(".choose-item").forEach(function(b){ b.onclick=function(){ finish(b.dataset.cv); }; });
    document.getElementById("chooseCancel").onclick=function(){ finish(null); };
    mask.onclick=function(e){ if(e.target.id==="chooseMask") finish(null); };
    document.addEventListener("keydown", onKey);
    mask.classList.add("show");
    const first=listEl.querySelector(".choose-item"); if(first) setTimeout(function(){ try{ first.focus(); }catch(e){} },0);
  });
}

/* 通用空状态（审查 T3：统一空状态文案与样式，避免散落硬编码）。
   返回 .empty 块；icon 为 emoji/SVG，text 为主文案，sub 为次要说明，actionHtml 为可选操作按钮。 */
function emptyState(icon, text, sub, actionHtml){
  return '<div class="empty"><div class="empty-ic">'+esc(icon||"📭")+'</div><div>'+esc(text||"暂无数据")+
    (sub?'<br><small style="color:var(--sub);font-weight:400;display:inline-block;margin-top:6px;">'+esc(sub)+'</small>':'')+
    '</div>'+(actionHtml||'')+'</div>';
}

/* 弹窗无障碍：背景锁滚 + 焦点陷阱（审查 M4/M5，单一事实源）。
   监听 .mask 的 show 增删：打开时锁 body 滚动 + 聚焦首个可聚焦元素（除非打开者已显式聚焦）；
   关闭时归还焦点 + 还原滚动。全局 Tab 仅最上层弹窗响应，边界回环。 */
(function(){
  var SEL='.mask';
  function topModal(){
    var all=Array.prototype.slice.call(document.querySelectorAll(SEL+'.show'));
    return all.length?all[all.length-1]:null;
  }
  function fmap(el){
    // 批 A（2026-10-24）：过滤 display:none 元素（如 confirmMask 内常驻隐藏的 confirmExtra），否则首焦点落到隐藏元素导致 focus() 静默失败。
    var raw=Array.prototype.slice.call(el.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'));
    return raw.filter(function(x){ return x.offsetParent!==null; });
  }
  var obs=new MutationObserver(function(muts){
    muts.forEach(function(m){
      var el=m.target;
      if(!(el instanceof Element)||!el.matches||!el.matches(SEL)||m.attributeName!=='class') return;
      if(el.classList.contains('show')){
        if(!el._a11yStored){ el._a11yStored=document.activeElement; }
        var f=fmap(el);
        if(f.length && !el.contains(document.activeElement)){ try{ f[0].focus(); }catch(e){} }
      }else{
        if(el._a11yStored && el._a11yStored.focus && document.contains(el._a11yStored)){ try{ el._a11yStored.focus(); }catch(e){} }
        el._a11yStored=null;
      }
    });
    document.body.style.overflow = topModal()?'hidden':'';
  });
  obs.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
  document.addEventListener('keydown',function(e){
    if(e.key!=='Tab') return;
    if(e.target && e.target.tagName==='TEXTAREA') return;   /* 多行文本域内应自由用 Tab 缩进，陷阱只在真正到边界时才接管 */
    var root=topModal(); if(!root) return;
    var f=fmap(root); if(!f.length) return;
    var first=f[0], last=f[f.length-1];
    if(e.shiftKey){ if(document.activeElement===first||!root.contains(document.activeElement)){ e.preventDefault(); last.focus(); } }
    else { if(document.activeElement===last||!root.contains(document.activeElement)){ e.preventDefault(); first.focus(); } }
  });
})();

/* ---------- esc（审查 C3：从两文件宿主代码下沉，单一事实源）----------
 * 2026-09-17 P1-1 已把 esc 改为纯 HTML 转义（不再内嵌 iconify）；此处统一维护，
 * 避免两文件双份定义随编辑漂移。
 * 注：原 escIcon（「转义 + 图标化」组合入口）已于 2026-10-24 清理——经 acorn 全量
 *     扫描确认两文件引用数 / 调用数 / HTML 内联 / window[] 引用皆为 0。
 *     需要图标化时请显式写 iconify(esc(x))，勿再引用 escIcon 这个名字。 */
function esc(s){ return (s==null?"":String(s)).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

/* ============================================================================
 * 云同步层（审查 中-9 下沉：markSynced / withBusy / pushTomb 单一事实源）
 * ----------------------------------------------------------------------------
 * 此前两文件各实现一份，已分叉。现收敛为：
 *   · markSynced —— 两文件逐字节一致，直接抽；
 *   · withBusy   —— 函数体两文件一致，取统一版（注释合并，见下方 R4 说明）；
 *   · pushTomb   —— 取任务台版（findIndex 兼容「墓碑条目为旧格式纯字符串」）。
 * 依赖（两文件均有）：window.__lastSyncAt / cloudPill / toast / _cloudBusy /
 *   _pullBusy / _pendingUpload / cloudAutoUpload / deletedIds / TOMB_MAX。
 * ==========================================================================*/

function markSynced(){
  try{
    window.__lastSyncAt=Date.now();
    const el=document.getElementById("cloudPill");
    if(el) el.title="最后同步 "+new Date(window.__lastSyncAt).toLocaleTimeString();
  }catch(_){}
}

/* R4：withBusy 退化为「纯 UI 反馈 + 收尾补传」，**不再自己置 _cloudBusy**。
   原实现它既置锁、又由被它包裹的 cloudPull/cloudUpload 各自置锁（现在锁已下沉到这两个函数内部），
   两者叠加会让手动「立即同步」在进入 fn 的第一行就被自己的锁挡掉 → 点按钮没反应。
   锁的唯一责任现在在 cloudUpload/_cloudPull 内部，withBusy 只管按钮的转圈与恢复。
   ⚠️ 本注释必须放在 async **之前**。若写成「async + 换行注释 + function f(){}」，解析器会把 async 当成标签语句、
      后面的 function 声明为普通函数，于是函数体里的 await 报"await is only valid in async functions"；
      而单文件语法检查（把整块存成 .js 再 check）走的是脚本模式，查不出这个差异 —— 必须用 new Function 整块解析。 */
async function withBusy(btn, fn){
  if(_cloudBusy||_pullBusy){ toast("云同步正在进行中，请稍候","warn"); return; }
  const b=(typeof btn==="string"?document.getElementById(btn):btn);
  if(b){ try{ b.disabled=true; b.classList.add("is-busy"); b.setAttribute("aria-busy","true"); }catch(_){} }
  try{ return await fn(); }
  finally{
    if(b){ try{ b.disabled=false; b.classList.remove("is-busy"); b.removeAttribute("aria-busy"); }catch(_){} }
    /* 补传：这一轮同步期间产生的改动（被自锁挡下、置了 _pendingUpload）此刻补上，
       否则用户改动会永远滞留在本地。手动同步与自动同步两条路径都要覆盖，故放在这里统一收尾。 */
    if(_pendingUpload){ _pendingUpload=false; cloudAutoUpload(); }
  }
}

/* 删除墓碑：让删除能跨设备传播（拉取时按 id 过滤已删条目）。
   取任务台版 —— findIndex 用 d&&(d.id||d)===s 兼容「墓碑条目为旧格式纯字符串 s」，
   明信片版 d.id===s 对旧格式会漏判（旧设备遗留数据可能仍是纯字符串）。
   G15（2026-10-23 复核结论：现有「覆盖为新 ts」是正确语义，不改代码只留分析）：每个调用点都伴随
   该记录当次真实移除，刷新 ts 让「最新删除意图」胜出；若不刷新而保留旧 ts，反而会出现「记录 updatedAt
   晚于旧墓碑 → 合并复活」的反向漏洞。移动墓碑（记录数组间转移）的隐患已由 convertRecord touch 根治。 */
function pushTomb(id){ const s=String(id||""); if(!s) return; const i=deletedIds.findIndex(d=>d&&(d.id||d)===s); const t={id:s, ts:Date.now()}; if(i>=0) deletedIds[i]=t; else deletedIds.push(t); if(deletedIds.length>TOMB_MAX) deletedIds=deletedIds.slice(-TOMB_MAX); }
