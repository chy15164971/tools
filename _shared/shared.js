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

const PAGE_SIZE=100;
const _pg={}, _pgSig={}, _pgGo={};

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
  return `<div class="pager"><span class="pg-info">第 ${from}–${to} 条 / 共 ${n} 条</span><span class="pg-nums">${btn("prev","‹",p<=1,false)}${nums}${btn("next","›",p>=pages,false)}</span></div>`;
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

function setCloudStatus(msg, err){
  const card=document.getElementById("csStatus"); if(!card) return;
  const iconEl=document.getElementById("csStatusIcon");
  const titleEl=document.getElementById("csStatusTitle");
  const descEl=document.getElementById("csStatusDesc");
  let type=err?"err":"info", title="提示", desc=msg||"";
  if(!msg){ type="info"; title="未配置"; desc="在上方填入 Gist ID 与 Token 即可开始同步"; }
  else if(/同步中|拉取中|上传中|下载中|正在/.test(msg)){ type="warn"; title="同步中…"; desc=msg; }
  else if(/已同步|已是最新|已复制|已从剪贴板|已覆盖|成功/.test(msg)){ type="ok"; title="成功"; desc=msg; }
  else if(/失败|错误|无法|不支持|请|没找到|缺少/.test(msg)){ type=err?"err":"warn"; title=err?"同步失败":"注意"; desc=msg; }
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
  const id=setTimeout(function(){ ctrl.abort(); }, ms||15000);
  return fetch(url, Object.assign({}, opts, {signal:ctrl.signal})).finally(function(){ clearTimeout(id); });
}

function safeUrl(u){ u=(u||"").trim(); if(!u) return "#"; if(/^(https?:|mailto:|tel:)/i.test(u)) return esc(u); try{ var _p=new URL(u,location.href); if(_p.protocol==="http:"||_p.protocol==="https:") return esc(u); }catch(e){} return "#"; }

function toast(msg, kind){
  const t=document.getElementById("toast");
  t.textContent=msg;
  t.className="toast"+(kind?(" "+kind):"");
  t.classList.add("show"); clearTimeout(t._timer); t._timer=setTimeout(()=>t.classList.remove("show"),1800);
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
    return Array.prototype.slice.call(el.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'));
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
    var root=topModal(); if(!root) return;
    var f=fmap(root); if(!f.length) return;
    var first=f[0], last=f[f.length-1];
    if(e.shiftKey){ if(document.activeElement===first||!root.contains(document.activeElement)){ e.preventDefault(); last.focus(); } }
    else { if(document.activeElement===last||!root.contains(document.activeElement)){ e.preventDefault(); first.focus(); } }
  });
})();
