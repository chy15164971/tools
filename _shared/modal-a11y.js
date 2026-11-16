/* ============================================================
   MODAL-A11Y —— 弹窗无障碍唯一真相源（_shared/modal-a11y.js）
   ------------------------------------------------------------
   由 _shared/inject_shared.py 内联进四页：任务管理台 / 明信片追踪 /
   index.html / 书影音海报墙。门户 home.html 无弹窗，不注入。
   ⚠️ 海报墙不注入整份 shared.js（esc / toast / setCloudStatus 等顶层
      同名声明会冲突白屏），只注入本块；2026-11-15 前这里曾手抄一份
      同源 IIFE，改共享层时容易漏同步 —— 2026-11-16 收敛为单一源。

   行为：.mask.show 打开时锁背景滚动 + 聚焦首个可聚焦元素；关闭时
   归还焦点并还原滚动；Tab / Shift+Tab 只在最上层弹窗内回环。
   配置：A11Y_CHILDLIST —— 海报墙的 confirmWall 是 createElement 带
   class="mask show" 直接插入、关闭时 m.remove()，没有 class 变更事件，
   必须靠 childList 兜底；其余三页保持 false，维持既有行为不变。
   ============================================================ */
(function(){
  var SEL='.mask';
  var OBS_CHILDLIST = /* A11Y_CHILDLIST */ false;
  function topModal(){
    var all=Array.prototype.slice.call(document.querySelectorAll(SEL+'.show'));
    return all.length?all[all.length-1]:null;
  }
  function fmap(el){
    // 批 A（2026-10-24）：过滤 display:none 元素（如 confirmMask 内常驻隐藏的 confirmExtra），否则首焦点落到隐藏元素导致 focus() 静默失败。
    var raw=Array.prototype.slice.call(el.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'));
    return raw.filter(function(x){ return x.offsetParent!==null; });
  }
  function focusInto(el){
    if(!el._a11yStored){ el._a11yStored=document.activeElement; }
    var f=fmap(el);
    if(f.length && !el.contains(document.activeElement)){ try{ f[0].focus(); }catch(e){} }
  }
  function releaseFrom(el){
    if(el._a11yStored && el._a11yStored.focus && document.contains(el._a11yStored)){ try{ el._a11yStored.focus(); }catch(e){} }
    el._a11yStored=null;
  }
  var obs=new MutationObserver(function(muts){
    muts.forEach(function(m){
      if(m.type==='childList'){
        Array.prototype.forEach.call(m.addedNodes,function(n){
          if(n instanceof Element && n.matches && n.matches(SEL+'.show')) focusInto(n);
        });
        Array.prototype.forEach.call(m.removedNodes,function(n){
          if(n instanceof Element && n.matches && n.matches(SEL)) releaseFrom(n);
        });
        return;
      }
      var el=m.target;
      if(!(el instanceof Element)||!el.matches||!el.matches(SEL)||m.attributeName!=='class') return;
      if(el.classList.contains('show')) focusInto(el); else releaseFrom(el);
    });
    document.body.style.overflow = topModal()?'hidden':'';
  });
  obs.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class'],childList:OBS_CHILDLIST});
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
