/* ============================================================
   SITE-NAV v1（2026-11-04）— 三页共用的站点导航条
   ------------------------------------------------------------
   唯一真相源：_shared/site-nav.js，由 inject_shared.py 内联进三页。
   零外部依赖、幂等、DOM 未就绪时等 DOMContentLoaded。
   - 非吸顶：不与三页各自 sticky 顶栏抢 top:0，避免遮挡
   - 颜色全部取页面自身 CSS 变量，跟随三页的亮/暗主题自动切换
   - 同标签跳转（无 target="_blank"），当前页高亮
   ============================================================ */
(function(){
  if (typeof document === "undefined" || document.getElementById("__wsn_bar")) return;

  var PAGES = [
    { id:"home",      label:"首页",     href:"home.html" },
    { id:"tasks",     label:"任务台",   href:"任务管理台.html" },
    { id:"postcards", label:"明信片",   href:"明信片追踪.html" },
    { id:"media",     label:"海报墙",   href:"书影音海报墙.html" }
  ];

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

  function init(){
    if (document.getElementById("__wsn_bar")) return;
    var css = [
      ".__wsn_bar{display:flex;align-items:center;gap:14px;padding:7px 16px;box-sizing:border-box;",
        "width:100%;background:var(--card,#fff);color:var(--ink,#1f2430);",
        "border-bottom:1px solid var(--line,#e7ebf2);font-size:13px;line-height:1.5;",
        "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;",
        "position:relative;z-index:1}",
      ".__wsn_brand{font-weight:600;letter-spacing:.02em;white-space:nowrap;color:var(--ink,#1f2430)}",
      ".__wsn_links{display:flex;align-items:center;gap:4px;flex:1;min-width:0;overflow-x:auto;scrollbar-width:none}",
      ".__wsn_links::-webkit-scrollbar{display:none}",
      ".__wsn_links a{display:inline-block;padding:3px 11px;border-radius:999px;text-decoration:none;",
        "white-space:nowrap;color:var(--sub,#6b7280);border:1px solid transparent;transition:background .15s ease,color .15s ease}",
      ".__wsn_links a:hover{background:var(--hover,var(--pri-soft,#eaf0ff));color:var(--ink,#1f2430)}",
      ".__wsn_links a.__wsn_on{color:#fff;background:var(--pri-deep,#3D68F0);border-color:var(--pri-deep,#3D68F0)}",
      ".__wsn_hint{font-size:12px;color:var(--sub,#9aa3b2);white-space:nowrap}",
      ".__wsn_bar a:focus-visible{outline:2px solid var(--pri,#4F7CFF);outline-offset:2px}",
      "@media(max-width:680px){.__wsn_bar{gap:9px;padding:6px 10px}.__wsn_hint{display:none}",
        ".__wsn_links a{padding:3px 9px;font-size:12px}}",
      "@media(prefers-reduced-motion:reduce){.__wsn_links a{transition:none}}"
    ].join("\n");
    var st = document.createElement("style");
    st.id = "__wsn_style";
    st.textContent = css;
    (document.head || document.documentElement).appendChild(st);

    var nav = document.createElement("nav");
    nav.id = "__wsn_bar";
    nav.className = "__wsn_bar";
    nav.setAttribute("aria-label", "站点导航");
    var cur = currentPage();
    var links = PAGES.map(function(p){
      return '<a href="' + p.href + '"' + (p.id === cur ? ' class="__wsn_on" aria-current="page"' : "") + '>' + p.label + '</a>';
    }).join("");
    nav.innerHTML = '<span class="__wsn_brand">工作台</span><div class="__wsn_links">' + links + '</div>' +
                    '<span class="__wsn_hint">同一工作台 · 数据保存在本机</span>';
    document.body.insertBefore(nav, document.body.firstChild);
    registerSW();
  }

  /* 站点级 PWA：三页 + 门户共用同一个 sw.js，重复 register 天然幂等；file:// 双击时静默跳过 */
  function registerSW(){
    try{
      if(!("serviceWorker" in navigator)) return;
      if(location.protocol!=="https:" && location.protocol!=="http:") return;
      navigator.serviceWorker.register("sw.js").catch(function(){});
    }catch(e){}
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
