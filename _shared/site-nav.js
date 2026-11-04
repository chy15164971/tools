/* ============================================================
   SITE-NAV v2（2026-11-04）— 站点导航条的「行为层」
   ------------------------------------------------------------
   唯一真相源：_shared/site-nav.js，由 inject_shared.py 内联进五页。
   导航条本体（HTML + CSS）已改为静态块 _shared/site-nav-static.html，
   放在 <body> 开头随文档解析立即呈现，消除 v1 的首屏闪烁：
   v1 在 DOMContentLoaded 才 createElement 插入，任务台 FCP 1220ms /
   DCL 1555ms，中间约 335ms 显示的是没有导航条的旧版布局。
   本文件只负责：当前页高亮 + 站点级 PWA 注册。幂等、零外部依赖。
   - 非吸顶：不与各页 sticky 顶栏抢 top:0
   - 颜色全部取页面自身 CSS 变量，跟随亮/暗主题
   - 同标签跳转（静态链接无 target="_blank"）
   ============================================================ */
(function(){
  if (typeof document === "undefined") return;

  function currentPage(){
    var f = "";
    try { f = decodeURIComponent((location.pathname.split("/").pop() || "index.html")).toLowerCase(); } catch(e){ f = "index.html"; }
    if (!f || f === "index.html") return "tasks";        /* 根入口仍是任务台副本 */
    if (f.indexOf("home") >= 0) return "home";
    if (f.indexOf("任务管理台") >= 0 || f.indexOf("taskhub") >= 0) return "tasks";
    if (f.indexOf("明信片") >= 0 || f.indexOf("postcard") >= 0) return "postcards";
    if (f.indexOf("书影音海报墙") >= 0 || f.indexOf("media") >= 0) return "media";
    return "";
  }

  /* 站点级 PWA：五页共用同一个 sw.js，重复 register 天然幂等；file:// 双击时静默跳过 */
  function registerSW(){
    try{
      if(!("serviceWorker" in navigator)) return;
      if(location.protocol!=="https:" && location.protocol!=="http:") return;
      navigator.serviceWorker.register("sw.js").catch(function(){});
    }catch(e){}
  }

  function init(){
    var bar = document.getElementById("__wsn_bar");
    if (!bar || bar.getAttribute("data-wsn-ready") === "1") return;
    var cur = currentPage();
    var a = cur ? bar.querySelector('.__wsn_links a[data-page="' + cur + '"]') : null;
    if (a){ a.className = "__wsn_on"; a.setAttribute("aria-current", "page"); }
    bar.setAttribute("data-wsn-ready", "1");
    registerSW();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
