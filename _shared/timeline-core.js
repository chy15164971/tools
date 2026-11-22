/* ============================================================
   TIMELINE-CORE（2026-11-22）— 时间线事件解析层
   ------------------------------------------------------------
   唯一真相源：_shared/timeline-core.js，由 inject_shared.py 内联进
   时间线.html 与 home.html（首页只取统计数字，不渲染完整时间轴）。

   为什么抽出来：首页卡片要显示「本年事件数」，时间线页要渲染完整事件流。
   若两处各写一套解析，一旦某页的数据结构微调（比如明信片字段改名），
   就会出现「首页显示 120 件、时间线只有 98 件」的口径分叉。
   项目既有铁律是「唯一真相源 + 注入」，这里沿用同一套机制。

   铁律（与 shared.js 的教训一致）：
   - 整块必须包在 IIFE 里，只向 window 挂一个 __TL_CORE，
     不产生任何顶层声明，避免与宿主页面同名变量冲突导致白屏。
   - 只读 localStorage，不写任何键；不修改任何页面的数据。
   - 读不到 / 解析失败一律静默降级为「0 条」，绝不伪造时间。

   事件模型：
     { ts, precise, kind, src, title, sub, href, variant, lvl }
     ts       毫秒时间戳（日级事件取当日 00:00，月级取当月 1 日）
     precise  是否有真实时刻。false = 只知道日期（明信片/观剧/日记/补打卡）
     kind     task | habit | postcard | media | theatre | map | diary
     src      去重用的稳定标识（同一任务同一天只留一条，精确版优先）
     variant  media 专用：review（感想）| wish（加入心愿单）| done（读完）
     lvl      时间精度：min（显示 M-D HH:MM）| day（M-D）| month（YYYY-MM）| year（YYYY）
   ============================================================ */
(function(){
  if (typeof window === "undefined") return;

  var DAY_MS = 86400000;
  var KINDS = ["task", "habit", "postcard", "media", "theatre", "map", "note", "work", "diary"];
  var LABEL = { task:"任务", habit:"习惯", postcard:"明信片", media:"海报墙", theatre:"观剧", map:"地图", note:"随笔", work:"作品", diary:"日记" };
  var HREF  = {
    task:"任务管理台.html", habit:"任务管理台.html",
    postcard:"明信片追踪.html", media:"书影音海报墙.html",
    theatre:"观剧记录.html", map:"旅行地图.html",
    note:"随笔.html", work:"作品集.html", diary:"旅行地图.html"
  };

  function pad2(n){ return (n < 10 ? "0" : "") + n; }

  function ls(key){
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  /* 只认日期部分，兼容 2026-11-22 / 2026/11/22 / 2026.11.22 / 2026-11-22T10:30 */
  function parseDay(v){
    if (v === null || v === undefined || v === "") return 0;
    var m = String(v).match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (!m) return 0;
    var t = new Date(+m[1], +m[2] - 1, +m[3]).getTime();
    return isFinite(t) ? t : 0;
  }

  /* 任务台的 doneAt 值形如 "2026-11-22T14:30"；也容忍纯数字毫秒与 Date 可解析串 */
  function parseStamp(v){
    if (v === null || v === undefined || v === "") return 0;
    if (typeof v === "number") return isFinite(v) ? v : 0;
    var s = String(v);
    var n = Number(s);
    if (s.length > 10 && isFinite(n)) return n;
    var t = Date.parse(s.indexOf(" ") > 0 ? s.replace(" ", "T") : s);
    if (isFinite(t)) return t;
    return parseDay(s);          /* 只剩日期时退回日级 */
  }

  function hasTime(v){
    return /T\d{1,2}:\d{2}/.test(String(v)) || /^\d{13}$/.test(String(v));
  }

  /* 书影音口径：书本叫想读、音乐/广播剧叫想听、其余（电影/电视剧/真人秀）叫想看 */
  function wantLabel(t){
    return t === "书本" ? "想读" : (t === "音乐" || t === "广播剧") ? "想听" : "想看";
  }

  /* 只认豆瓣导出的粒度：YYYY / YYYY-MM / YYYY-MM-DD。
     月级落当月 1 日、年级落 1 月 1 日——精度不足就老实标出来（lvl），不假装是那一天。 */
  function parseLoose(v){
    var s = String(v || "");
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return { ts: new Date(+m[1], +m[2] - 1, +m[3]).getTime(), lvl: "day" };
    m = s.match(/^(\d{4})-(\d{2})$/);
    if (m) return { ts: new Date(+m[1], +m[2] - 1, 1).getTime(), lvl: "month" };
    m = s.match(/^(\d{4})$/);
    if (m) return { ts: new Date(+m[1], 0, 1).getTime(), lvl: "year" };
    return null;
  }

  function dayKey(ts){
    var d = new Date(ts);
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  function sameDay(a, b){
    return dayKey(a) === dayKey(b);
  }

  /* 日级事件排在当日最后：降序时它落在当天所有精确事件的下方，不会被误读成「凌晨发生」。
     注意不能靠「ts + 86399999」来达成——那会让它跑到当天最上面，正好相反（调试时踩过）。
     用显式比较器：先按日，同日精确在前，同精度再按时刻。 */
  function dayStart(ts){
    var d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  function cmp(a, b){
    var da = dayStart(a.ts), db = dayStart(b.ts);
    if (da !== db) return db - da;                      /* 降序：日期晚的在前 */
    if (a.precise !== b.precise) return a.precise ? -1 : 1;  /* 同日：有时刻的在前 */
    return b.ts - a.ts;
  }
  function sortTs(e){
    return e.precise ? e.ts : e.ts + (DAY_MS - 1);
  }

  function collect(opts){
    opts = opts || {};
    var events = [];
    var seen = Object.create(null);
    var counts = { task:0, habit:0, postcard:0, media:0, theatre:0, map:0, note:0, work:0, diary:0 };

    function push(kind, src, ts, precise, title, sub, extra){
      if (!ts || !isFinite(ts)) return;
      var k = kind + "|" + src + "|" + dayKey(ts);
      var old = seen[k];
      if (old && (old.precise || !precise)) return;   /* 已有更精确的记录，日级不再重复计 */
      if (old) {
        var i = events.indexOf(old);
        if (i >= 0) events.splice(i, 1);
        counts[old.kind]--;   /* P2：精确事件替换日级条目时同步递减计数，否则 counts 虚增（坏 API） */
      }
      var e = {
        ts: +ts, precise: !!precise, kind: kind, src: src,
        title: title, sub: sub || "", href: (extra && extra.href) || HREF[kind],
        variant: (extra && extra.variant) || "",
        lvl: (extra && extra.lvl) || (precise ? "min" : "day")
      };
      seen[k] = e;
      events.push(e);
      counts[kind]++;
    }

    /* ---------- 1. 任务完成 ---------- */
    var tasks = ls("wb_taskhub_v1");
    if (Array.isArray(tasks)) {
      tasks.forEach(function(t){
        if (!t || typeof t !== "object") return;
        var name = String(t.title || "未命名任务");
        var sub = String(t.cat || t.pri || "");
        var id = String(t.id || name);
        var da = t.doneAt;
        if (da && typeof da === "object") {
          Object.keys(da).forEach(function(key){
            var raw = da[key];
            var ts = parseStamp(raw);
            if (!ts) return;
            /* 补记降级：toggleDone 在非今日日期格补完成时给 doneBf[key] 打标（该时刻只是
               补操作时的钟点），时间线只按日期显示，不冒充精准（与习惯 sameDay 启发式同哲学）。 */
            var bf = t.doneBf && t.doneBf[key];
            push("task", id, ts, bf ? false : hasTime(raw), "完成 " + name, sub);
          });
        }
        /* 老数据只有 doneDates（做完才补 doneAt 之前的历史）：仅在该日没有精确记录时兜底 */
        var dd = t.doneDates;
        if (Array.isArray(dd)) {
          dd.forEach(function(d){
            var base = parseDay(d);
            if (!base) return;
            push("task", id, base, false, "完成 " + name, sub);
          });
        }
      });
    }

    /* ---------- 2. 习惯打卡 ---------- */
    var habits = ls("wb_taskhub_habits_v1");
    if (Array.isArray(habits)) {
      habits.forEach(function(h){
        if (!h || typeof h !== "object") return;
        var days = Array.isArray(h.days) ? h.days : [];
        var dts = (h.dayTs && typeof h.dayTs === "object") ? h.dayTs : {};
        var nm = String(h.name || "习惯");
        var hid = String(h.id || nm);
        days.forEach(function(d){
          var base = parseDay(d);
          if (!base) return;
          var t = Number(dts[d]) || 0;
          /* 用户确认的显示时刻（dayTime）：批量补卡弹窗填了时刻 ⇒ 精确显示。
             dayTs 保持真实操作时刻兼任墓碑仲裁，显示层与其解耦。 */
          var hm = (h.dayTime && typeof h.dayTime === "object") ? String(h.dayTime[d] || "") : "";
          if (/^\d{1,2}:\d{2}$/.test(hm)) {
            var hp = hm.split(":");
            push("habit", hid + ":" + dayKey(base), base + (+hp[0]) * 3600000 + (+hp[1]) * 60000, true, "打卡 · " + nm, "");
            return;
          }
          /* 补打卡时 dayTs 记的是「操作那一刻」，与补的日期不同，那就不该冒充打卡时刻 */
          var ok = t > 0 && sameDay(t, base);
          push("habit", hid + ":" + dayKey(base), ok ? t : base, ok, "打卡 · " + nm, "");
        });
      });
    }

    /* ---------- 3. 明信片（寄出 / 抵达 / 收到）---------- */
    var pc = ls("wb_postcards_v1");
    if (pc && typeof pc === "object") {
      var sent = Array.isArray(pc.postcards) ? pc.postcards : [];
      sent.forEach(function(c){
        if (!c || typeof c !== "object") return;
        var who = [c.recipient, c.country, c.city].filter(Boolean).join(" · ");
        var cid = String(c.id || who);
        push("postcard", cid + ":sent", parseDay(c.sent), false, "寄出明信片", who);
        push("postcard", cid + ":arr", parseDay(c.arrived), false, "明信片抵达", who);
      });
      var recv = Array.isArray(pc.received) ? pc.received : [];
      recv.forEach(function(r){
        if (!r || typeof r !== "object") return;
        var who = [r.sender, r.country, r.city].filter(Boolean).join(" · ");
        push("postcard", String(r.id || who) + ":recv", parseDay(r.received), false, "收到明信片", who);
      });
    }

    /* ---------- 4. 海报墙感想 ---------- */
    var rv = ls("wb_mediawall_reviews_v1");
    if (rv && typeof rv === "object") {
      Object.keys(rv).forEach(function(k){
        var v = rv[k];
        if (!v || typeof v !== "object" || v._del || !v.ts) return;
        var parts = String(k).replace(/^rk1\|/, "").split("|");
        var title = parts[0] || "未命名条目";
        var sub = [parts[1], parts[2]].filter(Boolean).join(" · ");
        push("media", "rv:" + k, Number(v.ts) || 0, true, "写了感想《" + title + "》", sub, { variant: "review" });
      });
    }

    /* ---------- 4b. 海报墙心愿单「加入」----------
       wishAt 是 2026-11-22 起才记的毫秒时间戳；更早加进心愿单的条目没有时刻，
       缺就是缺，不拿 date 或今天去冒充。想读/想听/想看按条目类型取名。 */
    var ce = ls("wb_mediawall_custom_v1");
    if (Array.isArray(ce)) {
      ce.forEach(function(it){
        if (!it || typeof it !== "object") return;
        var t = Number(it.wishAt) || 0;
        if (!t) return;
        var nm = String(it.title || "未命名条目");
        push("media", "wish:" + nm, t, true,
             "加入" + wantLabel(it.type) + "《" + nm + "》", String(it.type || ""), { variant: "wish" });
      });
    }

    /* ---------- 4c. 海报墙「读完了」（默认不进时间线）----------
       readlog 由海报墙页单点写入（MEDIA 数组只内联在那页，跨页读不到），只含书本的真实读过日期。
       电影/音乐条目在豆瓣导出里没有观看时间（v28 起它们的上映/发行日期改存在 release 字段），所以这边压根没有它们。 */
    if (opts.withDone) {
      var rl = ls("wb_mediawall_readlog_v1");
      var rlItems = (rl && Array.isArray(rl.items)) ? rl.items : [];
      rlItems.forEach(function(it){
        if (!it || typeof it !== "object") return;
        var p = parseLoose(it.d);
        if (!p || !p.ts) return;
        var nm = String(it.n || "未命名条目");
        push("media", "done:" + nm, p.ts, false,
             "读完了《" + nm + "》", "豆瓣标记", { variant: "done", lvl: p.lvl });
      });
    }

    /* ---------- 5. 观剧记录 ---------- */
    var th = ls("wb_theatre_v1");
    if (th && typeof th === "object") {
      var recs = Array.isArray(th.records) ? th.records : [];
      recs.forEach(function(r){
        if (!r || typeof r !== "object") return;
        var base = parseDay(r.date);
        if (!base) return;
        push("theatre", String(r.id || "th" + base), base, false,
             "看了《" + (r.name || "未命名") + "》", [r.venue, r.type].filter(Boolean).join(" · "));
      });
    }

    /* ---------- 6. 地图点亮（v26 起才有 litAt；更早的点亮没有时刻，无法进时间线）---------- */
    var mp = ls("wb_travel_map_v1");
    var la = mp && mp.litAt;
    if (la && typeof la === "object" && !Array.isArray(la)) {
      Object.keys(la).forEach(function(k){
        var v = la[k];
        var t = (v && typeof v === "object") ? Number(v.t) : Number(v);
        if (!t) return;
        var nm = (v && typeof v === "object" && v.n) ? String(v.n) : String(k).split(":").pop();
        push("map", "lit:" + k, t, true, "点亮了 " + nm, "旅行足迹");
      });
    }

    /* ---------- 6. 随笔 + 作品集（博客合并 20261122）----------
       随笔记 updatedAt（最后编辑时刻，分钟级精确）；作品记 createdAt（日期级）。
       数据键由各自页面拥有，本层只读不写。作品集键是全量快照 {items,del}，内置九件
       首次打开作品集页时种入——没打开过就没有作品事件，口径与页面一致。 */
    var es = ls("wb_notes_v1");
    if (Array.isArray(es)) {
      es.forEach(function(n){
        if (!n || !n.id) return;
        var t = Number(n.updatedAt) || Number(n.createdAt) || 0;
        if (!t) return;
        push("note", "note:" + n.id, t, true, "随笔 · " + (n.title || "无题"),
             (n.tags || []).join(" / "));
      });
    }
    var pf = ls("wb_portfolio_v1");
    if (pf && Array.isArray(pf.items)) {
      var del = Array.isArray(pf.del) ? pf.del : [];
      pf.items.forEach(function(c){
        if (!c || !c.id || del.indexOf(c.id) >= 0) return;
        var d = parseDay(c.createdAt);
        if (!d) return;
        push("work", "work:" + c.id, d, false, "作品 · " + (c.title || "未命名"),
             c.cat ? String(c.cat) : "");
      });
    }

    /* ---------- 6b. 外部补充事件（批三）----------
       diary 存在 IndexedDB，collect 是同步函数读不到。异步消费者（首页摘要）用
       loadDiaryEvents() 拿到日记事件后，经 opts.extra 走同一条 push 去重管线，
       保证与时间线页「含日记」口径一致。 */
    if (Array.isArray(opts.extra)) {
      opts.extra.forEach(function(e){
        if (!e || typeof e !== "object") return;
        var ts = Number(e.ts) || parseDay(e.ts);
        if (!ts) return;
        push(String(e.kind || "diary"), String(e.src || ts), ts, !!e.precise,
             String(e.title || ""), String(e.sub || ""), e);
      });
    }

    events.sort(cmp);
    return { events: events, counts: counts, stats: statsOf(events) };
  }

  function statsOf(events){
    var now = new Date();
    var cy = now.getFullYear(), cm = now.getMonth();
    var days = Object.create(null);
    var thisYear = 0, thisMonth = 0, firstTs = 0, lastTs = 0;
    events.forEach(function(e){
      var d = new Date(e.ts);
      days[dayKey(e.ts)] = 1;
      if (d.getFullYear() === cy) {
        thisYear++;
        if (d.getMonth() === cm) thisMonth++;
      }
      if (!firstTs || e.ts < firstTs) firstTs = e.ts;
      if (e.ts > lastTs) lastTs = e.ts;
    });
    return {
      total: events.length, thisYear: thisYear, thisMonth: thisMonth,
      days: Object.keys(days).length, firstTs: firstTs, lastTs: lastTs
    };
  }

  /* ---------- 日记异步源（批三，只读）----------
     供不需要 NOTE 文案、只要统计数字的消费者（首页摘要）使用。
     与地图页的建库约定一致：先 databases() 探测库存在再 open(1)，
     upgradeneeded 立即 abort，绝不替地图页建出空库。任何失败静默返回空数组。 */
  function loadDiaryEvents(done){
    if (typeof done !== "function") return;
    function empty(){ done([]); }
    if (!window.indexedDB || !indexedDB.databases) { empty(); return; }
    var DB = "wb_travel_diary_db";
    var p;
    try { p = indexedDB.databases(); } catch(e){ empty(); return; }
    p.then(function(list){
      var exists = (list || []).some(function(d){ return d && d.name === DB; });
      if (!exists) { empty(); return; }
      var req;
      try { req = indexedDB.open(DB, 1); } catch(e){ empty(); return; }
      req.onupgradeneeded = function(){ try { req.transaction.abort(); } catch(e){} };
      req.onerror = empty;
      req.onsuccess = function(){
        var db = req.result;
        try {
          if (!db.objectStoreNames.contains("diaries")) { db.close(); empty(); return; }
          var r = db.transaction("diaries", "readonly").objectStore("diaries").getAll();
          r.onsuccess = function(){
            var arr = r.result || [];
            db.close();
            var out = [];
            arr.forEach(function(d){
              var base = parseDay(d && d.date);
              if (!base) return;
              var nm = (d && d.placeName) || "某地";
              var txt = String((d && d.title) || "").trim();
              out.push({
                ts: base, precise: false, kind: "diary",
                src: nm + "|" + txt,
                title: "旅行日记 · " + nm,
                sub: txt.slice(0, 42)
              });
            });
            done(out);
          };
          r.onerror = function(){ try { db.close(); } catch(e){} empty(); };
        } catch(e){ try { db.close(); } catch(_){} empty(); }
      };
    }).catch(empty);
  }

  window.__TL_CORE = {
    collect: collect, statsOf: statsOf, loadDiaryEvents: loadDiaryEvents,
    parseDay: parseDay, parseStamp: parseStamp, parseLoose: parseLoose,
    dayKey: dayKey, cmp: cmp, sortTs: sortTs, wantLabel: wantLabel,
    KINDS: KINDS, LABEL: LABEL, HREF: HREF
  };
})();
