# -*- coding: utf-8 -*-
"""
把 _shared 下的共享代码内联进七个单文件 HTML（含 index.html——它是任务管理台.html 的逐字节副本）。
改完源文件后运行：  python3 _shared/inject_shared.py
单文件 HTML 仍保持零依赖、可离线、双击即用（内容是内联的，不是 <src> 引用）。

四块，互不影响（2026-11-04 站点统一；2026-11-16 新增第 4 块）：
  1) SHARED  —— shared.js，仅任务管理台 / 明信片追踪 / index.html 三页（云同步公共层）
       ⚠️ 不可注入海报墙与门户页 home.html：shared.js 的 esc/toast/setCloudStatus 等顶层声明
          与海报墙同名，整块注入会 SyntaxError 白屏（已实测 6 处冲突）。
  2) SITE-NAV-HTML —— site-nav-static.html，六页共用，位于 <body> 开头。
       导航条 HTML + CSS 静态渲染，首屏解析即存在，避免 JS 在 DOMContentLoaded 才插入
       造成的「旧版任务台画面闪一下」（实测 FCP 1220ms / DCL 1555ms）。
  3) SITE-NAV —— site-nav.js，六页共用（行为层：当前页高亮 + 站点级 PWA 注册）。
       不再创建/插入导航条本体；与 SITE-NAV-HTML 配对使用。
  4) MODAL-A11Y —— modal-a11y.js，四页共用（任务台 / 明信片 / index / 海报墙）。
       2026-11-16 遗留风险修复：弹窗无障碍 IIFE 曾同时存在于 shared.js 与海报墙
       （手抄的第二份），改共享层极易漏同步。现收敛为唯一源文件，四页都由本注入器
       生成，verify_release.py 逐字节比对，漂移会直接让发布门禁失败。
       海报墙因 confirmWall 动态插入/移除需要 childList 兜底，用 a11y_src(True)
       把配置位翻成 true；其余三页保持 false，行为与 11-15 版一致。

铁律：凡进这四块的代码必须同时写进对应源文件，否则下次 inject 整块覆盖。
"""
import io, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.dirname(HERE)

A11Y_FILE = os.path.join(HERE, "modal-a11y.js")
A11Y_TOKEN = "/* A11Y_CHILDLIST */ false"


def a11y_src(childlist=False):
    """唯一真相源的渲染入口：inject_shared.py 与 verify_release.py 共用，避免两处口径分叉。"""
    s = io.open(A11Y_FILE, encoding="utf-8").read().rstrip()
    if s.count(A11Y_TOKEN) != 1:
        raise RuntimeError("modal-a11y.js 的 A11Y_CHILDLIST 配置位缺失或重复")
    if not childlist:
        return s
    return s.replace(A11Y_TOKEN, "/* A11Y_CHILDLIST */ true", 1)


BLOCKS = [
    {
        "name": "SHARED",
        "src": os.path.join(HERE, "shared.js"),
        "targets": [os.path.join(PROJ, "任务管理台.html"),
                    os.path.join(PROJ, "明信片追踪.html"),
                    os.path.join(PROJ, "index.html")],
        "begin": "/* >>> SHARED:BEGIN —— 由 _shared/shared.js 自动生成，请勿直接编辑本块 */",
        "end":   "/* <<< SHARED:END */",
    },
    {
        "name": "SITE-NAV-HTML",
        "src": os.path.join(HERE, "site-nav-static.html"),
        "targets": [os.path.join(PROJ, "任务管理台.html"),
                    os.path.join(PROJ, "明信片追踪.html"),
                    os.path.join(PROJ, "书影音海报墙.html"),
                    os.path.join(PROJ, "观剧记录.html"),
                    os.path.join(PROJ, "旅行地图.html"),
                    os.path.join(PROJ, "随笔.html"),
                    os.path.join(PROJ, "作品集.html"),
                    os.path.join(PROJ, "时间线.html"),
                    os.path.join(PROJ, "home.html"),
                    os.path.join(PROJ, "index.html")],
        "begin": "<!-- >>> SITE-NAV-HTML:BEGIN —— 由 _shared/site-nav-static.html 自动生成，请勿直接编辑本块 -->",
        "end":   "<!-- <<< SITE-NAV-HTML:END -->",
    },
    {
        "name": "SITE-NAV",
        "src": os.path.join(HERE, "site-nav.js"),
        "targets": [os.path.join(PROJ, "任务管理台.html"),
                    os.path.join(PROJ, "明信片追踪.html"),
                    os.path.join(PROJ, "书影音海报墙.html"),
                    os.path.join(PROJ, "观剧记录.html"),
                    os.path.join(PROJ, "旅行地图.html"),
                    os.path.join(PROJ, "随笔.html"),
                    os.path.join(PROJ, "作品集.html"),
                    os.path.join(PROJ, "时间线.html"),
                    os.path.join(PROJ, "home.html"),
                    os.path.join(PROJ, "index.html")],
        "begin": "/* >>> SITE-NAV:BEGIN —— 由 _shared/site-nav.js 自动生成，请勿直接编辑本块 */",
        "end":   "/* <<< SITE-NAV:END */",
    },
    {
        "name": "TIMELINE-CORE",
        "src": os.path.join(HERE, "timeline-core.js"),
        "targets": [os.path.join(PROJ, "时间线.html"),
                    os.path.join(PROJ, "home.html")],
        "begin": "/* >>> TIMELINE-CORE:BEGIN —— 由 _shared/timeline-core.js 自动生成，请勿直接编辑本块 */",
        "end":   "/* <<< TIMELINE-CORE:END */",
    },
    {
        "name": "MODAL-A11Y",
        "src": A11Y_FILE,
        "targets": [os.path.join(PROJ, "任务管理台.html"),
                    os.path.join(PROJ, "明信片追踪.html"),
                    os.path.join(PROJ, "书影音海报墙.html"),
                    os.path.join(PROJ, "index.html")],
        "begin": "/* >>> MODAL-A11Y:BEGIN —— 由 _shared/modal-a11y.js 自动生成，请勿直接编辑本块 */",
        "end":   "/* <<< MODAL-A11Y:END */",
        "render": lambda p: a11y_src(os.path.basename(p) == "书影音海报墙.html"),
    },
]


def inject(path, src, begin, end):
    """返回 True=内容有变化 / False=已是最新。标记块缺失或重复一律抛错（不再静默跳过）。"""
    s = io.open(path, encoding="utf-8").read()
    # 2026-11-22 审查：count=1 只替换第一份，重复块会残留成第二份顶层 const
    # → 同一 <script> 内 SyntaxError，整页白屏。此处先断言唯一性。
    nb, ne = s.count(begin), s.count(end)
    if nb != 1 or ne != 1:
        raise RuntimeError("标记块数量异常（BEGIN=%d / END=%d）: %s" % (nb, ne, os.path.basename(path)))
    block = begin + "\n" + src + "\n" + end
    pat = re.compile(re.escape(begin) + r".*?" + re.escape(end), re.S)
    s2 = pat.sub(lambda m: block, s, count=1)
    if s2 == s:
        return False
    # 原子写：842KB 文件被中断时不会留下半截（此前先 truncate 再写）
    tmp = path + ".inject.tmp"
    with io.open(tmp, "w", encoding="utf-8", newline="") as f:
        f.write(s2)
    os.replace(tmp, path)
    return True


def precheck():
    """写盘前一次性校验所有目标的标记块唯一，避免「前几块已落盘、后面才报错」的半成品状态。"""
    problems, cache = [], {}
    for b in BLOCKS:
        for p in b["targets"]:
            if not os.path.exists(p):
                continue
            if p not in cache:
                cache[p] = io.open(p, encoding="utf-8").read()
            s = cache[p]
            nb, ne = s.count(b["begin"]), s.count(b["end"])
            if nb != 1 or ne != 1:
                problems.append("%s / %s (BEGIN=%d END=%d)" % (b["name"], os.path.basename(p), nb, ne))
    if problems:
        print("预检失败：以下页面的共享块标记缺失或重复，未写入任何文件")
        for x in problems:
            print("   ", x)
        print("处理：把多余那份标记块删掉（或从干净版本恢复该页）再重跑。")
        sys.exit(1)


def main():
    precheck()
    changed, failed = [], []
    for b in BLOCKS:
        if not os.path.exists(b["src"]):
            print("缺少源文件:", b["src"]); sys.exit(1)
        base_src = io.open(b["src"], encoding="utf-8").read().rstrip()
        print("[%s] %s → %d 页" % (b["name"], os.path.basename(b["src"]), len(b["targets"])))
        for p in b["targets"]:
            if not os.path.exists(p):
                print("  跳过（文件不存在）:", os.path.basename(p)); continue
            src = b["render"](p) if b.get("render") else base_src
            try:
                if inject(p, src, b["begin"], b["end"]):
                    print("  已同步:", os.path.basename(p)); changed.append(os.path.basename(p))
                else:
                    print("  无变化:", os.path.basename(p))
            except RuntimeError as e:
                failed.append((b["name"], os.path.basename(p), str(e)))
    # 2026-11-04 审查轮修复：目标文件缺标记块时此前只打印不报错、退出码仍为 0，
    # 会造成「注入看似成功其实整页没更新」的静默失效（QA P2-19）。
    if failed:
        print("注入失败（标记块异常）:", failed)
        sys.exit(1)
    print("完成：%d 个页面文件有改动" % len(set(changed)))


if __name__ == "__main__":
    main()
