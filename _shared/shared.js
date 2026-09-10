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
 *   EMOJI_ICON / _emojiRe 等，函数体延迟求值，故本块置于脚本最前仍安全。
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
    const m=ln.match(/^\s*(Gist\s*ID|Gist|Token)\s*[:：]\s*(.+?)\s*$/i);
    if(m){ const k=m[1].toLowerCase(); const v=m[2]; if(k.indexOf("gist")===0) out.gist=v; else if(k==="token") out.token=v; }
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
