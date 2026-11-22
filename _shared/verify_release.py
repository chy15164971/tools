# -*- coding: utf-8 -*-
"""发布前门禁（2026-11-06 审查 C-13）：把散落在多份报告里的手工断言固化成一条命令。

用法：
    python3 _shared/verify_release.py                 # 检查本仓库
    python3 _shared/verify_release.py --repo DIR      # 检查指定发布仓库（源文件同样取 DIR/_shared）
    python3 _shared/verify_release.py --tokens PATH   # 指定 design_tokens.css（默认 vault 那份）

检查项：
  1. index.html 必须是 任务管理台.html 的逐字节副本（发布契约铁律）
  2. 29 个共享内联块（SHARED×3 + SITE-NAV-HTML×10 + SITE-NAV×10 + MODAL-A11Y×4 + TIMELINE-CORE×2，20261122 博客合并后）与源文件逐字节一致，
     且每页每个块**恰好一份**（重复会让同一 <script> 出现两份顶层 const → 白屏）
  3. 8 页 SITE-NAV-HTML 静态块紧贴 <body> 开头（防止退回 JS 延迟插入导致首屏闪烁）
  4. 8 页 SHARED TOKENS 标记区与 design_tokens.css 规范块一致
  5. sw.js PRECACHE 里列出的本地文件必须真实存在
  6. 导航品牌必须是可点击 <a>（D-16 回归守卫）
  7. 弹窗无障碍唯一源守卫（2026-11-16）：四页各恰好一份 MODAL-A11Y、门户零份、
     shared.js 内不再有第二份副本、海报墙未注入整份 SHARED（防白屏）

退出码：0 = 全通过；1 = 任一失败。只读，不改任何文件。
"""
import hashlib
import io
import os
import re
import sys

from inject_shared import a11y_src  # 唯一源渲染入口，与注入器共用（避免两处口径分叉）

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_TOKENS = "/Users/chenhuiying/Documents/Obsidian Vault/_ops/_workbench/design_tokens.css"

args = sys.argv[1:]
REPO = os.path.dirname(HERE)
if "--repo" in args:
    REPO = os.path.abspath(args[args.index("--repo") + 1])
TOKENS = DEFAULT_TOKENS
if "--tokens" in args:
    TOKENS = os.path.abspath(args[args.index("--tokens") + 1])

BLOCKS = [
    ("SHARED", "shared.js",
     ["任务管理台.html", "明信片追踪.html", "index.html"],
     "/* >>> SHARED:BEGIN —— 由 _shared/shared.js 自动生成，请勿直接编辑本块 */",
     "/* <<< SHARED:END */"),
    ("SITE-NAV-HTML", "site-nav-static.html",
     ["任务管理台.html", "明信片追踪.html", "书影音海报墙.html", "观剧记录.html", "旅行地图.html", "随笔.html", "作品集.html", "时间线.html", "home.html", "index.html"],
     "<!-- >>> SITE-NAV-HTML:BEGIN —— 由 _shared/site-nav-static.html 自动生成，请勿直接编辑本块 -->",
     "<!-- <<< SITE-NAV-HTML:END -->"),
    ("SITE-NAV", "site-nav.js",
     ["任务管理台.html", "明信片追踪.html", "书影音海报墙.html", "观剧记录.html", "旅行地图.html", "随笔.html", "作品集.html", "时间线.html", "home.html", "index.html"],
     "/* >>> SITE-NAV:BEGIN —— 由 _shared/site-nav.js 自动生成，请勿直接编辑本块 */",
     "/* <<< SITE-NAV:END */"),
    ("TIMELINE-CORE", "timeline-core.js",
     ["时间线.html", "home.html"],
     "/* >>> TIMELINE-CORE:BEGIN —— 由 _shared/timeline-core.js 自动生成，请勿直接编辑本块 */",
     "/* <<< TIMELINE-CORE:END */"),
    ("MODAL-A11Y", "modal-a11y.js",
     ["任务管理台.html", "明信片追踪.html", "书影音海报墙.html", "index.html"],
     "/* >>> MODAL-A11Y:BEGIN —— 由 _shared/modal-a11y.js 自动生成，请勿直接编辑本块 */",
     "/* <<< MODAL-A11Y:END */"),
]
A11Y_PAGES = ["任务管理台.html", "明信片追踪.html", "书影音海报墙.html", "index.html"]
ALL_PAGES = ["任务管理台.html", "明信片追踪.html", "书影音海报墙.html", "观剧记录.html", "旅行地图.html", "随笔.html", "作品集.html", "时间线.html", "home.html", "index.html"]
TOKEN_START = "/* === SHARED TOKENS START === */"
TOKEN_END = "/* === SHARED TOKENS END === */"

fails = []


def read(p):
    return io.open(p, encoding="utf-8").read()


def md5(p):
    return hashlib.md5(io.open(p, "rb").read()).hexdigest()


def ok(label, detail=""):
    print("[PASS] %s%s" % (label, ("  " + detail) if detail else ""))


def bad(label, detail=""):
    print("[FAIL] %s%s" % (label, ("  " + detail) if detail else ""))
    fails.append(label)


def main():
    print("发布仓库: %s" % REPO)
    for n in ALL_PAGES:
        if not os.path.exists(os.path.join(REPO, n)):
            bad("页面存在性", n)
            return

    # 1) 副本契约
    a, b = os.path.join(REPO, "index.html"), os.path.join(REPO, "任务管理台.html")
    if md5(a) == md5(b):
        ok("index ≡ 任务管理台（逐字节）", md5(a))
    else:
        bad("index ≡ 任务管理台（逐字节）", "%s != %s" % (md5(a), md5(b)))

    # 2) 25 个共享内联块（MODAL-A11Y 按页面渲染，海报墙 childList=true；TIMELINE-CORE 仅时间线页 + 首页）
    # 2026-11-22 审查修复：源文件路径此前绑在 HERE（脚本自身目录），--repo 只换了产物目录，
    # 于是「用 A 的源比 B 的产物」永远比出假绿（实测 --repo Projects 得 25/25 全过，
    # 而 Projects 自带脚本跑同一目录报 3 项 FAIL）。现改为从 REPO/_shared 取源，
    # 副本缺 _shared 时直接报错，不再回退——宁可红，不要假绿。
    total = 0
    src_dir = os.path.join(REPO, "_shared")
    for name, srcname, targets, begin, end in BLOCKS:
        src_path = os.path.join(src_dir, srcname)
        if not os.path.exists(src_path):
            bad("共享源文件缺失", "%s（%s 下没有 _shared，无法校验内联块）" % (srcname, REPO))
            continue
        base_src = read(src_path).rstrip()
        for t in targets:
            src = a11y_src(t == "书影音海报墙.html") if name == "MODAL-A11Y" else base_src
            p = os.path.join(REPO, t)
            html = read(p)
            # 唯一性优先：重复块会让同一 <script> 出现两份顶层 const → SyntaxError 白屏，
            # 而下面那个非贪婪 re.search 只比第一份，恰好看不见第二份（2026-11-22 实测可全绿发布）。
            nb, ne = html.count(begin), html.count(end)
            if nb != 1 or ne != 1:
                bad("内联块重复", "%s / %s (BEGIN=%d END=%d)" % (name, t, nb, ne))
                continue
            m = re.search(re.escape(begin) + r"\n(.*?)\n" + re.escape(end), html, re.S)
            if not m:
                bad("内联块缺失", "%s / %s" % (name, t))
            elif m.group(1) != src:
                bad("内联块不一致", "%s / %s (%dB vs %dB)" % (name, t, len(m.group(1)), len(src)))
            else:
                total += 1
    if total == 25:
        ok("25 个共享内联块与源文件逐字节一致", "25/25")
    elif total == sum(len(b[2]) for b in BLOCKS):
        # 20261122 博客合并：总数由 25（3+8+8+4+2）扩为 29（SITE-NAV 两块随 10 页 +2×2）。
        # 改为按 BLOCKS 各块 targets 数动态求和，页面清单再扩时不再改这里。
        ok("%d 个共享内联块与源文件逐字节一致" % total, "%d/%d" % (total, total))
    else:
        bad("共享内联块总数", "%d/%d" % (total, sum(len(b[2]) for b in BLOCKS)))

    # 3) 静态导航块紧贴 <body>
    nav_begin = BLOCKS[1][3]
    nav_end = BLOCKS[1][4]
    nav_pages = BLOCKS[1][2]
    good = 0
    for t in nav_pages:
        html = read(os.path.join(REPO, t))
        # <body\b 避免命中块内注释里的 "<body>…" 字样；取块之前的那次真实标签
        body = re.search(r"<body\b[^>]*>", html)
        k = html.find(nav_begin)
        if body and k >= 0 and 0 <= k - body.end() <= 16:
            good += 1
        else:
            bad("静态导航块位置", "%s (body=%s, block=%s)" % (t, body.end() if body else -1, k))
    # 2026-11-22：此前写死 good == 7，而实际是 8 页 → 那句 PASS 永远打不出来
    if good == len(nav_pages):
        ok("%d 页 SITE-NAV-HTML 紧贴 <body> 开头" % len(nav_pages), "%d/%d" % (good, len(nav_pages)))

    # 4) SHARED TOKENS 规范块
    if not os.path.exists(TOKENS):
        bad("design_tokens.css 不存在", TOKENS)
    else:
        raw = read(TOKENS)
        i = raw.find(":root{")
        if i < 0:
            bad("design_tokens.css 缺 :root{")
        else:
            canonical = raw[i:].rstrip()
            injected = "\n".join(("  " + l) if l else l for l in canonical.split("\n"))
            hits = 0
            for t in ALL_PAGES:
                html = read(os.path.join(REPO, t))
                m = re.search(re.escape(TOKEN_START) + r"\n(.*?)\n\s*" + re.escape(TOKEN_END), html, re.S)
                if not m:
                    bad("SHARED TOKENS 标记区缺失", t)
                elif m.group(1) != injected:
                    bad("SHARED TOKENS 不一致", t)
                else:
                    hits += 1
            if hits == 8:
                ok("8 页 SHARED TOKENS 与 design_tokens.css 一致", "8/8")

    # 5) PRECACHE 文件存在性
    sw_path = os.path.join(REPO, "sw.js")
    if os.path.exists(sw_path):
        sw = read(sw_path)
        m = re.search(r"const PRECACHE=\[(.*?)\];", sw, re.S)
        if not m:
            bad("sw.js 未找到 PRECACHE")
        else:
            urls = re.findall(r'"([^"]+)"', m.group(1))
            missing = []
            for u in urls:
                if u == "./" or u.startswith("http"):
                    continue
                rel = u[2:] if u.startswith("./") else u
                if rel and not os.path.exists(os.path.join(REPO, rel)):
                    missing.append(u)
            if missing:
                bad("PRECACHE 指向不存在的文件", ", ".join(missing))
            else:
                ok("PRECACHE 清单本地文件齐备", "%d 项" % len(urls))
            # 批三：反向断言——随站发布的本地资源都必须在 PRECACHE 里（防「新增页面忘记进预缓存，离线 404」）。
            # index.html 由 "./" 覆盖；sw.js 是 SW 脚本自身、README/check.sh 不是站点资源，均不要求。
            if m:
                prec = set(urls)
                ship = []
                for fn in sorted(os.listdir(REPO)):
                    if not fn.endswith(".html"):
                        continue
                    if fn == "index.html":
                        if "./" not in prec: ship.append("./ (index.html)")
                    elif "./" + fn not in prec:
                        ship.append("./" + fn)
                for fn in ("manifest.json", "媒体自定义条目.js"):
                    if os.path.exists(os.path.join(REPO, fn)) and "./" + fn not in prec:
                        ship.append("./" + fn)
                icons_dir = os.path.join(REPO, "icons")
                if os.path.isdir(icons_dir):
                    for fn in sorted(os.listdir(icons_dir)):
                        if fn.startswith("."): continue
                        if "./icons/" + fn not in prec:
                            ship.append("./icons/" + fn)
                if ship:
                    bad("站点资源未进 PRECACHE（离线 404 风险）", ", ".join(ship))
                else:
                    ok("PRECACHE 反向覆盖完整", "页面 / 图标 / 静态资源全部收录")

    # 6) 导航品牌可点
    nav_path = os.path.join(src_dir, "site-nav-static.html")
    if os.path.exists(nav_path):
        nav = read(nav_path)
        if re.search(r'<a\s+class="__wsn_brand"[^>]*href="home\.html"', nav):
            ok("导航品牌为可点击首页链接", "D-16")
        else:
            bad("导航品牌不是可点击首页链接", "D-16")

    # 7) 弹窗无障碍唯一源守卫（2026-11-16 遗留风险修复）
    a11y_ok = True
    for t in A11Y_PAGES:
        html = read(os.path.join(REPO, t))
        if html.count("/* >>> MODAL-A11Y:BEGIN") != 1 or html.count("var OBS_CHILDLIST") != 1:
            bad("弹窗无障碍块重复或缺失", t)
            a11y_ok = False
    home = read(os.path.join(REPO, "home.html"))
    if "/* >>> MODAL-A11Y:BEGIN" in home:
        bad("门户不应注入弹窗无障碍块", "home.html")
        a11y_ok = False
    shared = read(os.path.join(src_dir, "shared.js"))
    if "new MutationObserver" in shared:
        bad("shared.js 仍有第二份无障碍 IIFE", "单一事实源被破坏")
        a11y_ok = False
    wall = read(os.path.join(REPO, "书影音海报墙.html"))
    if "/* >>> SHARED:BEGIN" in wall:
        bad("海报墙被注入整份 SHARED", "会顶层同名冲突白屏")
        a11y_ok = False
    if "/* A11Y_CHILDLIST */ true" not in wall:
        bad("海报墙缺 childList 兜底", "confirmWall 动态插入会失效")
        a11y_ok = False
    if a11y_ok:
        ok("弹窗无障碍唯一源守卫", "四页各一份 / 门户零份 / shared.js 无副本 / 海报墙 childList 开启")

    print("-" * 60)
    if fails:
        print("发布门禁失败：%d 项（%s）" % (len(fails), "; ".join(sorted(set(fails)))))
        sys.exit(1)
    print("发布门禁全通过：0 项失败。可以发布。")


if __name__ == "__main__":
    main()
