# 本轮实现后验收计划（QA · test-plan）

**适用对象**：`web-delivery-developer` 完成后的**稳定快照**（不是实现前基线 `87d8ba6`）。
**编写依据**：`brief.md` / `acceptance.md`（A–E）、`qa/findings.md`（实现前已确认问题）。
**默认只读**：本计划所有命令都不改应用源码；浏览器注入的合成数据只写入**独立会话** `final`，不动用户真实 localStorage。
**工作目录**：`/tmp/toolsrepo2`（下称 `$P`）；证据目录：`$P/deliverables/site-ui-review-1104/qa/evidence/round2/`。
**环境**：node v22.22.2 / python3 / `agent-browser 0.27.0`（Chromium）；页面均以 `file://` 双击方式打开，无构建、无服务器。

---

## 0 前置与冻结（开始前必做）

1. 等主理人确认「开发完成、应用写入已暂停」，记录输入版本：
   ```bash
   cd /tmp/toolsrepo2
   git rev-parse --short HEAD; git status --short
   mkdir -p deliverables/site-ui-review-1104/qa/evidence/round2
   ```
2. 核对本轮改动文件清单，确认只落在授权范围：`home.html`、`书影音海报墙.html`（容器/视觉 CSS）、`_shared/site-nav.js`、`_shared/inject_shared.py`，以及主理人同步的 vault 副本 / `index.html` 重建。
3. 确认 `qa/findings.md` 末节「需主理人决策」已有结论（尤其 D-1 口径是否授权修复），再决定 §2.2 采用哪组期望值。
4. **不要在 QA 期间运行 `python3 _shared/inject_shared.py` 或 `sync_tokens.js`（非 `--check`）**——这两个会写源码。
5. **版本变化提示**：`qa/findings.md` 的证据采集于 19:28–19:46 的 `87d8ba6` 基线；19:50 起开发者已开始写入 `home.html` 与 `_shared/inject_shared.py`（`git status` 出现 `M`）。本计划**必须在主理人宣布「开发完成、写入暂停」之后的最终快照上执行**，不得在半成品上判定。开工时先跑 §1.1/§1.3/§1.5/§1.6，确认基线状态与 findings 中的「19:50 抽查」一致或已更新。

---

## 1 静态工程回归（对应 D1–D4）

### 1.1 五个 HTML 分 script 块 `node --check`（D1）
```bash
cd /tmp/toolsrepo2
set -o pipefail   # 让 tee 管道保留 python 的失败退出码
python3 - <<'PY' | tee deliverables/site-ui-review-1104/qa/evidence/round2/node-check.txt
import io,re,subprocess,tempfile,os,sys
files=["home.html","index.html","任务管理台.html","明信片追踪.html","书影音海报墙.html"]
total=bad=0
for f in files:
    s=io.open(f,encoding="utf-8").read()
    bs=[m.group(1) for m in re.finditer(r"<script(?:\s[^>]*)?>([\s\S]*?)</script>",s)]
    ne=[b for b in bs if b.strip()]
    st=[]
    for i,b in enumerate(ne):
        total+=1
        fd,p=tempfile.mkstemp(suffix=".js",prefix="qa_chk_",dir="/tmp")
        os.write(fd,b.encode("utf-8")); os.close(fd)
        r=subprocess.run(["node","--check",p],capture_output=True,text=True)
        if r.returncode: bad+=1; st.append("block%d FAIL %s"%(i+1,r.stderr.strip()[:200]))
        os.unlink(p)
    print("%-20s scripts=%d nonempty=%d %s"%(f,len(bs),len(ne),"ALL PASS" if not st else "; ".join(st)))
print("TOTAL=%d FAIL=%d"%(total,bad))
sys.exit(1 if bad else 0)
PY
# 期望：5 行 ALL PASS；TOTAL=11（或实现后新增块数）FAIL=0
```
> 说明：`node --check` 只校验语法，不执行；内联块较多的大文件必须按块拆，不能整份 HTML 丢给 node。

### 1.2 `sw.js` 与两个 manifest JSON（D1）
```bash
cd /tmp/toolsrepo2
node --check sw.js && echo "sw.js OK"
node -e 'for(const f of ["manifest.json","manifest-postcard.json"]){const j=JSON.parse(require("fs").readFileSync(f,"utf8"));console.log(f,"JSON OK",Object.keys(j).join(","))}'
# 断言：manifest.json start_url=="./home.html"、shortcuts 有 3 条且 url 分别指向三页
node -e 'const m=require("/tmp/toolsrepo2/manifest.json");const need=["./任务管理台.html","./明信片追踪.html","./书影音海报墙.html"];console.log("start_url",m.start_url,"shortcuts",m.shortcuts.map(s=>s.url).join("|"));if(m.start_url!=="./home.html"||m.shortcuts.length!==3||need.some((u,i)=>m.shortcuts[i].url!==u))process.exit(1)'
# 期望：三条命令退出码均为 0；manifest-postcard.json 仍存在（兼容保留）
```

### 1.3 注入一致性断言：内联块 == 源文件逐字节（D2，含新增的 home.html）
```bash
cd /tmp/toolsrepo2
python3 - <<'PY' | tee deliverables/site-ui-review-1104/qa/evidence/round2/inject-consistency.txt
import io,os,re,sys
P="/tmp/toolsrepo2"; S=os.path.join(P,"_shared")
srcs={"SITE-NAV":io.open(os.path.join(S,"site-nav.js"),encoding="utf-8").read().rstrip(),
      "SHARED":io.open(os.path.join(S,"shared.js"),encoding="utf-8").read().rstrip()}
marks={"SITE-NAV":("/* >>> SITE-NAV:BEGIN —— 由 _shared/site-nav.js 自动生成，请勿直接编辑本块 */","/* <<< SITE-NAV:END */"),
       "SHARED":("/* >>> SHARED:BEGIN —— 由 _shared/shared.js 自动生成，请勿直接编辑本块 */","/* <<< SHARED:END */")}
# 实现后期望：SITE-NAV 覆盖 4 页（含 home.html）；SHARED 仍只覆盖任务台/明信片 + 其副本 index.html
expect={"SITE-NAV":{"任务管理台.html":1,"index.html":1,"明信片追踪.html":1,"书影音海报墙.html":1,"home.html":1},
        "SHARED":{"任务管理台.html":1,"index.html":1,"明信片追踪.html":1,"书影音海报墙.html":0,"home.html":0}}
bad=0
for f in ["任务管理台.html","index.html","明信片追踪.html","书影音海报墙.html","home.html"]:
    s=io.open(os.path.join(P,f),encoding="utf-8").read()
    for n,(b,e) in marks.items():
        m=re.search(re.escape(b)+r"\n([\s\S]*?)\n"+re.escape(e),s)
        present=1 if m else 0
        ok = present==expect[n][f] and (not m or m.group(1)==srcs[n])
        if not ok: bad+=1
        print("%-20s %-9s present=%d expected=%d %s"%(f,n,present,expect[n][f],"OK" if ok else "FAIL"))
print("RESULT:", "PASS" if bad==0 else "FAIL(%d)"%bad)
sys.exit(1 if bad else 0)
PY
# 期望：RESULT: PASS；home.html SITE-NAV present=1 且与 _shared/site-nav.js 逐字节一致
```
> 若开发把 `index.html` 也加入 `inject_shared.py` targets（见 findings P1-7），`index.html` 两块应同时 MATCH；若采用「注入后 copyfile」方案，见 1.5。

**⚠ 静默失效兜底（ui-designer 提醒 / findings P2-19）**：`inject_shared.py:41-51` 的 `inject()` 在页面找不到标记块时只打印「未找到标记块，跳过」并 `return False`，`main()` 不检查返回值、退出码仍为 0。因此**不能把「注入命令没报错」当作成功**：
```bash
cd /tmp/toolsrepo2
# 期望输出中每一页都是「已同步: xxx.html」，不得出现「未找到标记块，跳过」
python3 _shared/inject_shared.py 2>&1 | tee deliverables/site-ui-review-1104/qa/evidence/round2/inject-output.txt
grep -q '未找到标记块' deliverables/site-ui-review-1104/qa/evidence/round2/inject-output.txt && echo "FAIL: 有页面缺标记块" || echo "PASS: 全部命中标记块"
# 并且必须再跑 §1.3 断言 + §2.1 的真实 DOM 断言（__wsn_bar 是否真的出现在 home.html）
```
> 注意：上条命令会写源码，**只由开发者在其实现阶段执行**；QA 复核时直接读 `inject-output.txt` 并跑断言即可。

### 1.4 `shared.js` 不得注入海报墙 / 门户（铁律 1）
```bash
cd /tmp/toolsrepo2
for f in 书影音海报墙.html home.html; do
  printf "%-20s " "$f"
  grep -q 'SHARED:BEGIN' "$f" && echo "FAIL: shared.js 注入了本页" || echo "OK: 无 SHARED 块"
done
# 另跑一次 node --check（1.1）确认无同名顶层声明冲突导致的 SyntaxError
```

### 1.5 `index.html` 与 `任务管理台.html` 逐字节一致（D2 / 铁律 3）
```bash
cd /tmp/toolsrepo2
cmp -s index.html 任务管理台.html && echo "IDENTICAL (PASS)" || { echo "DIFFERENT (FAIL)"; cmp -l index.html 任务管理台.html | head; }
# 必须在任何 inject_shared.py 运行之后执行；不一致即判 D2 失败
```

### 1.6 克隆与 vault 副本一致性 + `sync_tokens.js --check`（D3 / B3）
```bash
cd /tmp/toolsrepo2
for f in home.html 任务管理台.html 明信片追踪.html 书影音海报墙.html; do
  printf "%-20s " "$f"
  cmp -s "$f" "/Users/chenhuiying/Documents/Obsidian Vault/Projects/$f" && echo IDENTICAL || echo "DIFFERENT (需主理人同步 vault)"
done
node "/Users/chenhuiying/Documents/Obsidian Vault/_ops/_workbench/sync_tokens.js" --check
# 期望：退出码 0；B3 达成时应出现 4 行 IN_SYNC（含 home.html），否则说明门户未纳入 TARGETS
# 注意：该脚本检查的是 VAULT 副本，不是 /tmp/toolsrepo2 克隆，故必须配合上面的 cmp
# 克隆侧 token 标记断言（门户纳入体系后 home.html 应有标记区）：
python3 - <<'PY'
import io
for f in ["home.html","任务管理台.html","明信片追踪.html","书影音海报墙.html"]:
    s=io.open("/tmp/toolsrepo2/"+f,encoding="utf-8").read()
    print("%-20s SHARED TOKENS markers=%d  --radius=%s"%(f,s.count("SHARED TOKENS START"),"12px" if "--radius:12px" in s else ("16px" if "--radius:16px" in s else "?")))
PY
# 期望：四页 markers>=1；--radius 均 12px（或主理人明确批准的对齐值），不得残留 16px 漂移
```

### 1.7 回归桩（D4 / C2）
```bash
cd /tmp/toolsrepo2
node /tmp/harness.js        | tee deliverables/site-ui-review-1104/qa/evidence/round2/harness.txt
node /tmp/verify_partial.js | tee deliverables/site-ui-review-1104/qa/evidence/round2/verify-partial.txt
# 期望：52 通过 / 0 失败；未动组零重建；C2 要求海报墙功能与 52 项不回退
```
> **覆盖面警告（ui-designer 复核，我已确认）**：`grep -c 'check(' /tmp/harness.js` = 53，其中 1 处是第 71 行的 `function check(...)` 定义，实际断言 **52 项**，与「52 通过」一致。`harness.js` 与 `verify_partial.js` 全部是 DOM 桩 + `innerHTML/textContent` 内容判断，**没有 `max-width` / `getBoundingClientRect` / `offsetWidth` / `border-radius` / 1240 / 1360 等 CSS 或几何断言**。结论：**纯 CSS 改宽度不会触发 52 项失败，也不能据此判定 C1/C2/D5 通过**，§2.7 的浏览器几何断言必须实跑。

### 1.8 数据体与业务键未改（铁律 5）
```bash
cd /tmp/toolsrepo2
printf "MEDIA 基线条目数: "; grep -o '{"title":' 书影音海报墙.html | wc -l   # 期望 1731
printf "海报墙 localStorage 键: "; grep -o 'wb_[A-Za-z0-9_]*' 书影音海报墙.html | sort -u | tr '\n' ' '; echo
# 与实现前对比：不得新增/改名 wb_taskhub_v1 / wb_postcards_v1 / wb_mediawall_custom_v1 / wb_mediawall_stats_v1
```

---

## 2 浏览器验收（对应 D5 / B1–B8 / C1–C2）

统一用独立会话，避免污染默认会话：
```bash
cd /tmp/toolsrepo2
S=final
agent-browser --session $S set viewport 1440 900
```
每步末尾用 `agent-browser --session $S errors` 收集 JS 报错（B8 / D5，期望为空），最后 `agent-browser --session $S close`。

### 2.1 站点导航条 / 当前页高亮 / 同标签跳转（B1、D5）
```bash
cd /tmp/toolsrepo2; S=final
for f in home.html index.html 任务管理台.html 明信片追踪.html 书影音海报墙.html; do
  agent-browser --session $S open "file:///tmp/toolsrepo2/$f" >/dev/null 2>&1
  printf "%-20s " "$f"
  agent-browser --session $S eval "JSON.stringify({nav:!!document.getElementById('__wsn_bar'),on:[...document.querySelectorAll('#__wsn_bar a.__wsn_on')].map(a=>a.textContent),cur:[...document.querySelectorAll('#__wsn_bar a[aria-current]')].map(a=>a.textContent),blank:[...document.querySelectorAll('#__wsn_bar a')].filter(a=>a.target==='_blank').length,hrefs:[...document.querySelectorAll('#__wsn_bar a')].map(a=>a.getAttribute('href'))})"
done
```
**期望**：
- 5 页 `nav:true`；`home.html` 高亮 `["首页"]`（B1），`index.html` 与 `任务管理台.html` 高亮 `["任务台"]`，`明信片追踪.html` `["明信片"]`，`书影音海报墙.html` `["海报墙"]`；`cur` 与 `on` 一致。
- `blank:0`；`hrefs` = `["home.html","任务管理台.html","明信片追踪.html","书影音海报墙.html"]`。
- 导航条在亮/暗主题下 `position:relative` 且不遮挡各页 sticky 顶栏（B1）。
- **必须验真实 DOM，不能只看 inject 输出**（findings P2-19）：`home.html` 上 `nav:true` 即证明导航条真的渲染；若 `inject_shared.py` 因缺标记块静默跳过，此处会立刻暴露。

**导航条几何 / 全宽 / 768 hint（ui-designer 提醒）**：
```bash
cd /tmp/toolsrepo2; S=final
for w in 1440 1024 768 390; do
  agent-browser --session $S set viewport $w 900 >/dev/null 2>&1
  agent-browser --session $S open "file:///tmp/toolsrepo2/home.html" >/dev/null 2>&1
  printf "w=%-5s " "$w"
  agent-browser --session $S eval "JSON.stringify({navLeft:Math.round(document.getElementById('__wsn_bar').getBoundingClientRect().left),navRight:Math.round(document.getElementById('__wsn_bar').getBoundingClientRect().right),innerW:innerWidth,bodyPadLeft:getComputedStyle(document.body).paddingLeft,linksScroll:document.querySelector('#__wsn_bar .__wsn_links').scrollWidth,linksClient:document.querySelector('#__wsn_bar .__wsn_links').clientWidth,hintVisible:getComputedStyle(document.querySelector('.__wsn_hint')).display!=='none',barOverflow:document.getElementById('__wsn_bar').scrollWidth>document.getElementById('__wsn_bar').clientWidth})"
done
```
**期望**：`navLeft=0`、`navRight=innerWidth`（全宽，无 20px/28px 内缩 → 基线 `home.html:26` 的 `body{padding:28px 20px}` 必须已归零并下移到 `.wrap`）；`bodyPadLeft` 为 `0px`。768px 下 `.__wsn_hint` 仍显示（`site-nav.js` 隐藏断点为 ≤680），需确认 4 链接 + brand + hint 不溢出（`barOverflow:false`；`.__wsn_links` 有 `overflow-x:auto;min-width:0` 兜底，允许 `linksScroll>linksClient` 但不得撑破页面）。

**同标签跳转**：
```bash
agent-browser --session $S open "file:///tmp/toolsrepo2/明信片追踪.html" >/dev/null 2>&1
agent-browser --session $S eval "document.querySelector('#__wsn_bar a[href=\"home.html\"]').click();'ok'" >/dev/null 2>&1
agent-browser --session $S wait 400 >/dev/null 2>&1
agent-browser --session $S eval "location.href"          # 期望 file:///tmp/toolsrepo2/home.html
agent-browser --session $S tab list                       # 期望仍为 1 个标签
```

### 2.2 门户摘要：正常输入 / 重要边界 / 错误反馈（B4、B5、D5）
先准备一份**合成数据**（写入独立会话，不改用户数据）：
```bash
cd /tmp/toolsrepo2; S=final
agent-browser --session $S open "file:///tmp/toolsrepo2/home.html" >/dev/null 2>&1
EVAL=$(cat <<'EOF'
(() => {
 const P=n=>String(n).padStart(2,"0"),d=new Date(),td=d.getFullYear()+"-"+P(d.getMonth()+1)+"-"+P(d.getDate());
 const tasks=[{id:"a",title:"2020完成老任务",status:"done",doneAt:{self:"2020-01-02T10:00:00"},doneDates:[],recurrence:{freq:"none"}},
 {id:"b",title:"今天完成",status:"done",doneAt:{self:new Date().toISOString()},doneDates:[],recurrence:{freq:"none"}},
 {id:"c",title:"待办",status:"todo",doneDates:[],recurrence:{freq:"none"}},
 {id:"d",title:"每日重复-今天打卡",status:"todo",doneDates:[td],recurrence:{freq:"daily"}},
 {id:"e",title:"每日重复-历史打卡",status:"todo",doneDates:["2020-01-01"],recurrence:{freq:"daily"}}];
 const pc={postcards:[{id:"p1",status:"transit"},{id:"p2",status:"arrived"},{id:"p3",status:"returned"}],received:[{id:"r1",status:"received"},{id:"r2",status:"transit"}],proxies:[{id:"x1"}],activities:[{id:"a1"}]};
 localStorage.setItem("wb_taskhub_v1",JSON.stringify(tasks));localStorage.setItem("wb_postcards_v1",JSON.stringify(pc));
 localStorage.setItem("wb_mediawall_stats_v1",JSON.stringify({total:1731,ts:Date.now()}));
 localStorage.setItem("wb_mediawall_custom_v1",JSON.stringify([{title:"心愿条目",status:"wish",type:"影视"},{title:"自定义已完成",type:"书本",date:td}]));
 localStorage.removeItem("wb_workbench_media_count_v1");localStorage.removeItem("wb_workbench_theme");localStorage.removeItem("wb_theme_v1");
 return td;
})()
EOF
)
agent-browser --session $S eval -b "$(printf '%s' "$EVAL" | base64)"
agent-browser --session $S reload >/dev/null 2>&1
agent-browser --session $S eval "JSON.stringify(Object.fromEntries(['mTaskOpen','mTaskDone','mTaskAll','mPcTransit','mPcArrived','mPcAll','mMediaAll','mMediaCustom'].map(k=>[k,document.getElementById(k).textContent])))"
```

| 指标 | 输入 | 若**已授权修口径**（findings D-1 结论 A） | 若**保留现算法**（结论 B，仅改标签） |
|---|---|---|---|
| 进行中任务 `mTaskOpen` | 5 条任务 | **按主理人给定定义**（重复任务是否计入「进行中」需明确，1 或 2 均可，但须写进口径说明） | 1 |
| 今日完成 `mTaskDone` | 同上 | **2**（仅今日完成 + 今日打卡的重复任务） | 3（含 2020 年完成）→ 标签须为「已完成」 |
| 全部记录 `mTaskAll` | 同上 | 5 | 5 |
| 在途 `mPcTransit` | 3 寄出 + 2 收到 | **2**（寄出 transit + 收到 transit）或 1（仅寄出） | 1 → 标签须标明范围 |
| 已到达 `mPcArrived` | 同上 | **2**（寄出 arrived + 收到 received）或 1（仅寄出） | 3（含在途收到件）→ 标签须改为「寄出已到 + 全部收到」 |
| 全部记录 `mPcAll` | 同上 | 7 | 7 |
| 已记录 `mMediaAll` | stats total=1731 | 1731（若口径改为排除心愿，按 D-4 结论） | 1731 |
| 自定义条目 `mMediaCustom` | 2 条自定义 | 2 | 2 |

> 判定：实际值必须等于**主理人采纳的那一列**；若采用结论 B，还须核对标签文案已改，并在交付说明中记为「已知限制」。不得出现「数字按旧算法、标签仍叫今日完成/已到达」。

**边界与错误反馈**（逐条 reload 后读同一组 DOM）：
```bash
# 边界 1：键缺失 → 三项降级「—」，且 .dim 样式生效
agent-browser --session $S eval "['wb_taskhub_v1','wb_postcards_v1','wb_mediawall_stats_v1','wb_mediawall_custom_v1','wb_workbench_media_count_v1'].forEach(k=>localStorage.removeItem(k));'cleared'" >/dev/null 2>&1
agent-browser --session $S reload >/dev/null 2>&1
agent-browser --session $S eval "JSON.stringify({vals:Object.fromEntries(['mTaskOpen','mTaskDone','mTaskAll','mPcTransit','mPcArrived','mPcAll','mMediaAll','mMediaCustom'].map(k=>[k,document.getElementById(k).textContent])),dim:document.querySelectorAll('.n.dim').length})"
# 期望：8 项均为「—」；dim>=6；foot 文案仍完整可读；不写任何业务键

# 边界 2：结构猜错 / 损坏数据 → 不抛错、显示「—」
agent-browser --session $S eval "localStorage.setItem('wb_taskhub_v1','{\"tasks\":[]}');localStorage.setItem('wb_postcards_v1','[1,2]');localStorage.setItem('wb_mediawall_stats_v1','{\"total\":\"abc\"}');localStorage.setItem('wb_mediawall_custom_v1','{\"a\":1}');'bad'" >/dev/null 2>&1
agent-browser --session $S reload >/dev/null 2>&1
agent-browser --session $S eval "JSON.stringify(Object.fromEntries(['mTaskOpen','mTaskDone','mPcTransit','mPcArrived','mMediaAll','mMediaCustom'].map(k=>[k,document.getElementById(k).textContent])))"
# 期望：全为「—」；agent-browser --session $S errors 为空（损坏 JSON 不得白屏）

# 边界 3：刷新摘要按钮 → 重新读取，数值不丢、不写入业务键
agent-browser --session $S eval "localStorage.setItem('wb_taskhub_v1','[{\"status\":\"todo\",\"doneDates\":[]},{\"status\":\"done\",\"doneAt\":{\"self\":\"2020-01-01\"},\"doneDates\":[]}]');'set'" >/dev/null 2>&1
agent-browser --session $S reload >/dev/null 2>&1
agent-browser --session $S click "#btnRefresh" >/dev/null 2>&1
agent-browser --session $S eval "JSON.stringify({all:document.getElementById('mTaskAll').textContent,open:document.getElementById('mTaskOpen').textContent,keys:Object.keys(localStorage).filter(k=>k.indexOf('wb_')===0)})"
# 期望：all=2；keys 中不出现新增业务数据键（只允许 wb_workbench_theme / wb_theme_v1 / wb_workbench_media_count_v1）
```

### 2.3 降级文案准确性（findings P2-8）
```bash
agent-browser --session $S eval "localStorage.removeItem('wb_postcards_v1');localStorage.removeItem('wb_taskhub_v1');'cleared'" >/dev/null 2>&1
agent-browser --session $S open "file:///tmp/toolsrepo2/明信片追踪.html" >/dev/null 2>&1
agent-browser --session $S eval "String(localStorage.getItem('wb_postcards_v1'))"   # 实现前为 null
agent-browser --session $S open "file:///tmp/toolsrepo2/home.html" >/dev/null 2>&1
agent-browser --session $S eval "document.getElementById('foot').textContent.replace(/\s+/g,' ').trim()"
```
**期望**：文案不再承诺「打开对应页面后会自动出现」（或已改为「产生/保存记录后」）；否则按 findings P2-8 记为未修。

### 2.4 主题：亮/暗、跨页一致、对比度、reduced-motion（B1/B3/B4/B7）
```bash
cd /tmp/toolsrepo2; S=final
agent-browser --session $S set viewport 1440 900 >/dev/null 2>&1
agent-browser --session $S set media light >/dev/null 2>&1
agent-browser --session $S open "file:///tmp/toolsrepo2/home.html" >/dev/null 2>&1
agent-browser --session $S click "#btnTheme" >/dev/null 2>&1     # 切到 dark
CONTRAST=$(cat <<'EOF'
(() => { const lum=c=>{const m=String(c).match(/[\d.]+/g)||[0,0,0];const [r,g,b]=m.slice(0,3).map(Number).map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)});return 0.2126*r+0.7152*g+0.0722*b};
const ratio=(f,b)=>{const a=lum(f),c=lum(b);return +((Math.max(a,c)+0.05)/(Math.min(a,c)+0.05)).toFixed(2)};
const bg=e=>{let p=e;while(p){const c=getComputedStyle(p).backgroundColor;if(c&&c!=="rgba(0, 0, 0, 0)")return c;p=p.parentElement}return "rgb(255,255,255)"};
const sel={"go":".card .go","desc":".card .desc","h2":".card h2","btn":".btn","navlink":".navlinks a","nav_on":"#__wsn_bar a.__wsn_on","nav_link":"#__wsn_bar a"};
const out={};for(const [k,s] of Object.entries(sel)){const e=document.querySelector(s);if(!e){out[k]="NO_EL";continue}const c=getComputedStyle(e);out[k]=ratio(c.color,bg(e))}
return JSON.stringify({theme:document.documentElement.dataset.theme,ratios:out}); })()
EOF
)
agent-browser --session $S eval -b "$(printf '%s' "$CONTRAST" | base64)"
```
**期望**：`theme:"dark"`；所有常规文字 `>=4.5`（尤其 `go` 必须 ≥4.5，实现前为 3.59，见 findings P1-3）；`nav_on`/`nav_link` 可读。切回亮色再测一次，同样 ≥4.5。

**跨页主题一致性（findings P2-16，已实测复现，D-7 待定）**：
```bash
cd /tmp/toolsrepo2; S=final
# 基线复现步骤：门户切主题 -> 子页切主题 -> 四页对比
agent-browser --session $S open "file:///tmp/toolsrepo2/home.html" >/dev/null 2>&1
agent-browser --session $S click "#btnTheme" >/dev/null 2>&1
agent-browser --session $S eval "JSON.stringify({workbench:localStorage.getItem('wb_workbench_theme'),shared:localStorage.getItem('wb_theme_v1'),portal:document.documentElement.dataset.theme})"
agent-browser --session $S open "file:///tmp/toolsrepo2/明信片追踪.html" >/dev/null 2>&1
agent-browser --session $S click "#btnTheme" >/dev/null 2>&1
for f in home.html 任务管理台.html 明信片追踪.html 书影音海报墙.html; do
  agent-browser --session $S open "file:///tmp/toolsrepo2/$f" >/dev/null 2>&1
  printf "%-20s " "$f"; agent-browser --session $S eval "document.documentElement.dataset.theme"
done
```
**期望**：若 D-7 要求全站一致，四页必须**相同**（实现前基线为门户 `dark` / 三页 `light`，见 `evidence/supplement-checks.txt [S2]`）；若主理人决定保留门户独立覆盖，则此差异记为**已知限制**并在交付说明写明，不能标「通过」。另须验反方向：门户切换后三页跟随（基线已同步，因为门户会写 `wb_theme_v1`）。

**私有 token 静默失效（ui-designer 提醒 / findings P2-18）**：`design_tokens.css` 不含 `--shadow-hover` 与 `--ink-soft`，二者由页面**分别私有保留**（不是两页各含这两个变量）——基线 `home.html:16,21` 只私有保留 `--shadow-hover`、无 `--ink-soft`（home 全程用 `--sub`，`:13,19`）；`--ink-soft` 只在 `书影音海报墙.html:17`（亮）/`:419`（暗）。若接入 SHARED TOKENS 时私有定义被删或写进标记区被覆盖，home `.card:hover` 阴影与海报墙 `.chip/.vtab/.s-m` 文字色会退化且无 JS 报错。下方断言按「分别」映射验：home 只测 `--shadow-hover`，海报墙只测 `--ink-soft`。
```bash
cd /tmp/toolsrepo2; S=final
for theme in light dark; do
  agent-browser --session $S set media $theme >/dev/null 2>&1
  agent-browser --session $S open "file:///tmp/toolsrepo2/home.html" >/dev/null 2>&1
  agent-browser --session $S hover ".card" >/dev/null 2>&1
  printf "home %-6s " "$theme"
  agent-browser --session $S eval "JSON.stringify({hoverShadow:getComputedStyle(document.querySelector('.card')).boxShadow,shadowHoverVar:getComputedStyle(document.documentElement).getPropertyValue('--shadow-hover').trim()})"
  agent-browser --session $S open "file:///tmp/toolsrepo2/书影音海报墙.html" >/dev/null 2>&1
  printf "wall %-6s " "$theme"
  agent-browser --session $S eval "JSON.stringify({inkSoft:getComputedStyle(document.documentElement).getPropertyValue('--ink-soft').trim(),rootCount:[...document.styleSheets].length,bodyBg:getComputedStyle(document.body).backgroundColor,chipColor:document.querySelector('.chip')?getComputedStyle(document.querySelector('.chip')).color:'NO_EL'})"
done
```
**期望**：亮/暗下 `hoverShadow` 均非 `none` 且不同值、`shadowHoverVar` 非空；`inkSoft` 非空、`chipColor` 在暗色下可读（对比度 ≥4.5）；`bodyBg` 为 `#f5f7fb`（亮）/ `#0f1320`（暗），证明标记区覆盖了私有 `:root` 且未误删私有变量。

**reduced-motion（B7）**：
```bash
agent-browser --session $S set media dark reduced-motion >/dev/null 2>&1
agent-browser --session $S open "file:///tmp/toolsrepo2/home.html" >/dev/null 2>&1
agent-browser --session $S eval "JSON.stringify({reduce:matchMedia('(prefers-reduced-motion: reduce)').matches,cardTransition:getComputedStyle(document.querySelector('.card')).transitionDuration})"
# 期望：reduce=true，卡片 transition 0s
```

### 2.5 键盘可达（B7、交互流程）
```bash
cd /tmp/toolsrepo2; S=final
agent-browser --session $S set media light >/dev/null 2>&1
agent-browser --session $S open "file:///tmp/toolsrepo2/home.html" >/dev/null 2>&1
agent-browser --session $S press Tab >/dev/null 2>&1
agent-browser --session $S eval "JSON.stringify({tag:document.activeElement.tagName,id:document.activeElement.id,fv:document.activeElement.matches(':focus-visible'),outline:getComputedStyle(document.activeElement).outlineWidth})"
# 期望：可聚焦元素；fv=true；outline 可见（>=2px 或 UA 默认可见描边）；连按 Tab 能依次到达 3 张卡与 2 个按钮

agent-browser --session $S open "file:///tmp/toolsrepo2/书影音海报墙.html" >/dev/null 2>&1
agent-browser --session $S eval "document.querySelector('.pcard').focus();'ok'" >/dev/null 2>&1
agent-browser --session $S press Enter   >/dev/null 2>&1
agent-browser --session $S eval "String(document.getElementById('mask').classList.contains('show'))"   # true
agent-browser --session $S press ArrowRight >/dev/null 2>&1
agent-browser --session $S eval "document.getElementById('modal').querySelector('h2').textContent"       # 应变为下一条
agent-browser --session $S press Escape >/dev/null 2>&1
agent-browser --session $S eval "String(!document.getElementById('mask').classList.contains('show'))"  # true
# ↑↓ / Enter 搜索下拉：
agent-browser --session $S eval "const b=document.getElementById('searchBox');b.value='白夜行';b.dispatchEvent(new Event('input',{bubbles:true}));'typed'" >/dev/null 2>&1
agent-browser --session $S wait 300 >/dev/null 2>&1
agent-browser --session $S press ArrowDown >/dev/null 2>&1
agent-browser --session $S press Enter >/dev/null 2>&1
agent-browser --session $S eval "String(document.getElementById('mask').classList.contains('show'))"   # true
# 感想脏检查（Esc 不静默丢失）：harness「M-2」已覆盖，人工确认弹确认框即可
```
**期望**：Enter/Space 打开卡片、←/→ 弹窗内前后切换、↑↓/Enter 搜索下拉选择、Esc 关闭且脏编辑先确认；无 JS 报错。

### 2.6 海报墙墙视图 / 分析页（C2、业务逻辑）
```bash
cd /tmp/toolsrepo2; S=final
agent-browser --session $S open "file:///tmp/toolsrepo2/书影音海报墙.html" >/dev/null 2>&1
# 墙视图：卡片渲染、统计卡、chips、排序记忆
agent-browser --session $S eval "JSON.stringify({cards:document.querySelectorAll('#viewWall .pcard').length,chips:document.querySelectorAll('#chips .chip').length,stats:document.getElementById('stats').textContent.replace(/\s+/g,' ').trim().slice(0,80),sort:document.getElementById('sortSel').value})"
agent-browser --session $S eval "document.getElementById('sortSel').value='rating';document.getElementById('sortSel').dispatchEvent(new Event('change',{bubbles:true}));JSON.stringify({stored:localStorage.getItem('wb_mediawall_sort_v1')})"
# 期望：卡片>0、chips>0、排序写入 wb_mediawall_sort_v1=rating，墙仍渲染

# 筛选/搜索/分页联动 + hash 保态与回放
agent-browser --session $S eval "location.hash='#v=stats';'set'" >/dev/null 2>&1
agent-browser --session $S wait 400 >/dev/null 2>&1
agent-browser --session $S eval "JSON.stringify({curView:curView,statsVisible:getComputedStyle(document.getElementById('viewStats')).display,hasProf:document.getElementById('viewStats').textContent.indexOf('兴趣画像')>=0,hasAvg:document.getElementById('viewStats').textContent.indexOf('平均评分')>=0})"
# 期望：curView=stats、display:block、含兴趣画像与平均评分

# 分析页平均分归一一致性（findings P1-6，若已授权修复则必须一致）
NORM=$(cat <<'EOF'
(() => { MEDIA=[{title:"十分制条目",type:"书本",rating:9,date:"2026-11-01",genre:"小说"},{title:"五分制条目",type:"书本",rating:4,date:"2026-11-02",genre:"小说"}];renderStatsView();
 const cards=[...document.querySelectorAll("#viewStats .ana-card")].map(c=>c.textContent.replace(/\s+/g," ").trim());
 const dist=[...document.querySelectorAll("#viewStats .ana-sec")].find(s=>s.textContent.indexOf("我的评分分布")>=0).textContent.replace(/\s+/g," ").trim();
 return JSON.stringify({avgCard:cards.find(c=>c.indexOf("条有评分")>=0),dist:dist.slice(0,70)}); })()
EOF
)
agent-browser --session $S eval -b "$(printf '%s' "$NORM" | base64)"
# 期望（已修）：平均评分 8.5，且 4 分条目落在「8-9 分」桶；两者一致
# 期望（未授权修，按 D-1 结论 B）：6.5 且记为已知限制，不得标「通过」

# 心愿单排除口径（findings P2-11）
WISH=$(cat <<'EOF'
(() => { MEDIA=[{title:"已完成A",type:"书本",genre:"科幻",date:"2026-01",rating:8},{title:"心愿B",type:"书本",genre:"测试题材",status:"wish"}];renderStatsView();
 const s=[...document.querySelectorAll("#viewStats .ana-sec")].find(x=>x.textContent.indexOf("题材偏好")>=0).textContent; return JSON.stringify({wishGenreListed:s.indexOf("测试题材")>=0}); })()
EOF
)
agent-browser --session $S eval -b "$(printf '%s' "$WISH" | base64)"
# 期望（已修）：false；未修则记为已知限制

# 密度切换、心愿标记完成（含完成日期，findings P2-10）
agent-browser --session $S open "file:///tmp/toolsrepo2/书影音海报墙.html" >/dev/null 2>&1
agent-browser --session $S eval "document.getElementById('densBtn').click();JSON.stringify({dense:document.body.classList.contains('dense'),stored:localStorage.getItem('wb_mediawall_dense_v1')})"
# 期望：dense=true、stored="1"
```
> `harness.js` 52 项与 `verify_partial.js` 覆盖排序/搜索/分页/心愿/弹窗导航/感想脏检查，§1.7 已跑；本节的浏览器断言补的是真实渲染与跨页一致性。

### 2.7 响应式 1440 / 1024 / 768 / 390 + 暗色（B6、C1、D5）
```bash
cd /tmp/toolsrepo2; S=final; P=/tmp/toolsrepo2
for w in 1440 1024 768 390; do
  agent-browser --session $S set viewport $w 900 >/dev/null 2>&1
  for f in home.html 任务管理台.html 明信片追踪.html 书影音海报墙.html; do
    agent-browser --session $S open "file:///tmp/toolsrepo2/$f" >/dev/null 2>&1
    printf "w=%-5s %-20s " "$w" "$f"
    agent-browser --session $S eval "JSON.stringify({innerW:innerWidth,docW:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>innerWidth,cols:document.querySelector('.grid')?getComputedStyle(document.querySelector('.grid')).gridTemplateColumns.split(' ').length:'NA',nav:!!document.getElementById('__wsn_bar')})"
  done
done
# 期望：门户 4 个宽度均无 overflow；390px 门户单列（cols=1）；导航条在 390px 仍完整可见
# C1：若设计改了海报墙容器，核对 1440 下 .wrap max-width 与三页对齐且卡片/统计卡不错位
# 已知实现前缺陷：海报墙 390px docW=471>390（findings P2-13）；按 D-5 结论判定是否修复
agent-browser --session $S set media dark >/dev/null 2>&1
agent-browser --session $S set viewport 390 844 >/dev/null 2>&1
for f in home.html 书影音海报墙.html; do
  agent-browser --session $S open "file:///tmp/toolsrepo2/$f" >/dev/null 2>&1
  agent-browser --session $S screenshot "$P/deliverables/site-ui-review-1104/qa/evidence/round2/${f%.html}-390-dark.png" >/dev/null 2>&1
done
# 期望：暗色 390px 无横向溢出、无重叠、文字可读；截图入证据目录
```

**几何断言（C1 / C2，harness 不覆盖，必须实跑；ui-designer §3.1 量化值）**：
```bash
cd /tmp/toolsrepo2; S=final
agent-browser --session $S set viewport 1440 900 >/dev/null 2>&1
agent-browser --session $S set media light >/dev/null 2>&1
for f in home.html 任务管理台.html 明信片追踪.html 书影音海报墙.html; do
  agent-browser --session $S open "file:///tmp/toolsrepo2/$f" >/dev/null 2>&1
  printf "%-20s " "$f"
  agent-browser --session $S eval "JSON.stringify({wrapMax:document.querySelector('.wrap')?getComputedStyle(document.querySelector('.wrap')).maxWidth:'NA',bodyFont:getComputedStyle(document.body).fontSize,radius:getComputedStyle(document.documentElement).getPropertyValue('--radius').trim(),pcardW:document.querySelector('.pcard')?Math.round(document.querySelector('.pcard').getBoundingClientRect().width):'NA',statW:document.querySelector('.stats .stat-card, .stats>div')?Math.round(document.querySelector('.stats>div').getBoundingClientRect().width):'NA'})"
done
# 期望：B3 达成后四页 bodyFont / --radius 一致（15px / 12px）；三页 .wrap max-width 对齐
# 若主理人采纳「海报墙 .wrap 改 1360」，额外核对以下量化值（design/spec.md §3.1）：
#   pcard 139 -> 154px；封面 208.5 -> 231px；卡高 ~293 -> ~315px；.stats 单卡 386.7 -> 426.7px；
#   .ana-grid 5 列 -> 6 列；body.dense 10 列卡 108.4 -> 120.4px；.subtype 断点按视口不受影响；
#   标题 line-clamp:2 + ellipsis 不溢出。designer 建议本轮不改 .wrap（宽度仅占视觉差异约 7%）。
GEOM=$(cat <<'EOF'
(() => { const w=document.querySelector('.wrap'),p=document.querySelector('.pcard'),a=document.querySelector('.ana-grid');
 return JSON.stringify({wrapMax:w?getComputedStyle(w).maxWidth:'NA',contentW:w?Math.round(w.getBoundingClientRect().width):'NA',pcardW:p?Math.round(p.getBoundingClientRect().width):'NA',anaCols:a?getComputedStyle(a).gridTemplateColumns.split(' ').length:'NA',dense:document.body.classList.contains('dense')}); })()
EOF
)
agent-browser --session $S open "file:///tmp/toolsrepo2/书影音海报墙.html" >/dev/null 2>&1
echo "normal:"; agent-browser --session $S eval -b "$(printf '%s' "$GEOM" | base64)"
agent-browser --session $S eval "document.getElementById('densBtn').click();'on'" >/dev/null 2>&1
echo "dense :"; agent-browser --session $S eval -b "$(printf '%s' "$GEOM" | base64)"
# 期望：normal/dense 两态卡片与统计卡均不错位、无重叠；dense 下 .subtype 列数按视口断点正常
```
> B6 断点（design/spec.md §4.7）：门户 1440→3 列(371px)、1024→2 列(480px)、768→1 列(720px)、390→1 列(358px)；上面 `cols` 字段逐宽度断言。

### 2.8 无 JS 报错 / 无外部依赖（B8、D5）
```bash
cd /tmp/toolsrepo2; S=final
for f in home.html index.html 任务管理台.html 明信片追踪.html 书影音海报墙.html; do
  agent-browser --session $S errors --clear >/dev/null 2>&1
  agent-browser --session $S open "file:///tmp/toolsrepo2/$f" >/dev/null 2>&1
  printf "%-20s errors=" "$f"; agent-browser --session $S errors | head -3 | tr '\n' ' '; echo
done
# 期望：五行 errors 均为空
grep -o 'https\?://[^"'"'"' )]*' home.html | grep -v 'www.w3.org' | head   # 期望无新增外链依赖
agent-browser --session $S close
```

### 2.9 PWA 静态断言（D1、findings P2-14/P2-15）
```bash
cd /tmp/toolsrepo2
for f in home.html index.html 任务管理台.html 明信片追踪.html 书影音海报墙.html; do
  printf "%-20s manifest-links=" "$f"; grep -c 'rel="manifest"' "$f"
done
# 期望：若 D-6 决定清理，五页均为 1（指向 manifest.json）；未清理则任务台/index.html 为 2，记为已知限制
node -e 'const s=require("fs").readFileSync("sw.js","utf8");const m=s.match(/const PRECACHE=\[(.*?)\]/s)[1];console.log("PRECACHE:",m);'
# 期望：含 ./、./home.html、三页、icon-192；若 D-6/P2-15 决定补，还应含 manifest.json、icon-512、icon-180
```

---

## 3 判定矩阵（逐项给「通过 / 失败 / 未验证」）

| 验收项 | 判定依据 | 通过条件 |
|---|---|---|
| A1–A5 审查交付 | `qa/findings.md` + 设计报告 | 五维覆盖、优先级排序、量化结论、已审范围与未验证项齐全 |
| B1 门户导航 / 高亮 / 同标签 / 亮暗可读 | §2.1 + §2.4 | 5 页 `nav:true`（真实 DOM，非 inject 输出）、首页高亮、blank=0、导航条 `left=0 / right=innerWidth` 全宽、768 hint 不撑破、暗色对比度 ≥4.5 |
| B2 首屏层次与品牌 | 截图 `home-1440.png`（round2 重拍） | 主理人/设计确认，无「上半屏内容 + 下半屏空白」 |
| B3 共享 token | §1.6 | `sync_tokens --check` 含 home.html 且全 IN_SYNC；`--radius` 无 16px 漂移；暗色 `.go` 达标 |
| B4 功能保留 | §2.2 + §2.4 + §2.5 | 三卡/摘要/刷新/切换主题/暗色均工作，数值与采纳口径一致；`.card:hover` 阴影在亮/暗均非 none（私有 token 未静默丢失，P2-18/P2-19） |
| B5 数据与降级 | §2.2 边界 1–3 | 缺键/损坏数据均降级「—」，不写业务键，不抛错 |
| B6 响应式 | §2.7 | 门户 1440/1024/768/390 无溢出、390 单列、暗色 390 可读 |
| B7 键盘 / reduced-motion | §2.5 + §2.4 | Tab/Enter/Space/←→/↑↓/Esc 全部可达；reduce 时过渡为 0 |
| B8 无 JS 报错 / 无外部依赖 | §2.8 | 五页 errors 空；无新增外链 |
| C1/C2 视觉协调与功能不回退 | §1.7 + §2.6 + §2.7 | harness 52/52、verify_partial 通过；**另须**实跑 §2.7 几何断言（harness 无 CSS/几何断言，不能替代）、海报墙 normal/dense 两态与分析页正常 |
| D1 | §1.1 + §1.2 | 全 PASS、退出码 0 |
| D2 | §1.3 + §1.4 + §1.5 | 内联块逐字节一致、shared.js 未注入两页、index 副本一致；inject 输出无「未找到标记块，跳过」 |
| D3 | §1.6 | IN_SYNC（含门户，若 B3 达成） |
| D4 | §1.7 | 52/52、verify_partial 通过 |
| D5 | §2.1 + §2.2 + §2.4 + §2.6–2.8 | 浏览器冒烟全通过、无 JS 报错 |
| E1/E2 | 主理人交付说明 | 结论先行、路径/已验证/未验证/启动方式齐全；明确「未推送上线」 |

**回传格式**：状态（完成/部分完成/阻塞）、采用的输入版本、两个产物绝对路径 + `qa/evidence/round2/` 证据清单、逐项通过/失败/未验证、假设与未验证项、需主理人决定的事项。

---

## 4 本计划也覆盖不到的未验证项（须如实标注，不得写「全部通过」）

1. **https 部署下的 PWA 安装 / SW 注册生效 / 离线兜底**：本环境只有 `file://`，SW 在 origin `null` 下被跳过；`sw.js` 的 fetch 策略与 manifest/icons 离线可用性只能静态推断（findings P2-15）。
2. **自动翻页哨兵实际续页**：实现前基线中，独立对照 `IntersectionObserver` 在本无头 Chromium 也不派发回调，属环境限制；需真实可见浏览器/真机复验，本轮标「未验证」。
3. **GitHub Gist 云同步与多端合并**、**跨浏览器（Safari/Firefox）**、**真机触控 390px**：不在本轮工具范围。
4. **真实用户全量数据下的每一个数字组合**：用合成数据覆盖主要边界；真实数据只做只读抽查。
5. 若主理人对 findings D-1 选择「保留现算法、仅改标签」，则 P1-4/5/6、P2-10/11 的**数字偏差应记为已知限制**，在判定矩阵中不得标「通过」，也不得标「失败」（属已决策豁免）。
6. **D-7 跨页主题**：若主理人决定保留门户私有主题键优先级，§2.4 的四页不一致必须记为**已知限制**；不得标「通过」。**D-8 双 `:root`**：若未整理，P2-18 记为维护隐患（当前无故障），但 §2.4 的 hover 阴影 / `--ink-soft` 文字色断言仍必须实跑。
7. **任务台 `#btnTheme` 绑定路径**：补充核查时点击任务台按钮未触发主题变化，改用明信片页显式 `onclick` 复现了跨页不同步；任务台按钮为何未响应未在本次细查，若实现后主题按钮仍不工作需单独立项。
