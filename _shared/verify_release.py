# -*- coding: utf-8 -*-
"""发布前门禁（2026-11-06 审查 C-13）：把散落在多份报告里的手工断言固化成一条命令。

用法：
    python3 _shared/verify_release.py                 # 检查本仓库
    python3 _shared/verify_release.py --repo DIR      # 检查指定发布仓库
    python3 _shared/verify_release.py --tokens PATH   # 指定 design_tokens.css（默认 vault 那份）

检查项：
  1. index.html 必须是 任务管理台.html 的逐字节副本（发布契约铁律）
  2. 13 个共享内联块（SHARED×3 + SITE-NAV-HTML×5 + SITE-NAV×5）与源文件逐字节一致
  3. 5 页 SITE-NAV-HTML 静态块紧贴 <body> 开头（防止退回 JS 延迟插入导致首屏闪烁）
  4. 5 页 SHARED TOKENS 标记区与 design_tokens.css 规范块一致
  5. sw.js PRECACHE 里列出的本地文件必须真实存在
  6. 导航品牌必须是可点击 <a>（D-16 回归守卫）

退出码：0 = 全通过；1 = 任一失败。只读，不改任何文件。
"""
import hashlib
import io
import os
import re
import sys

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
     ["任务管理台.html", "明信片追踪.html", "书影音海报墙.html", "home.html", "index.html"],
     "<!-- >>> SITE-NAV-HTML:BEGIN —— 由 _shared/site-nav-static.html 自动生成，请勿直接编辑本块 -->",
     "<!-- <<< SITE-NAV-HTML:END -->"),
    ("SITE-NAV", "site-nav.js",
     ["任务管理台.html", "明信片追踪.html", "书影音海报墙.html", "home.html", "index.html"],
     "/* >>> SITE-NAV:BEGIN —— 由 _shared/site-nav.js 自动生成，请勿直接编辑本块 */",
     "/* <<< SITE-NAV:END */"),
]
ALL_PAGES = ["任务管理台.html", "明信片追踪.html", "书影音海报墙.html", "home.html", "index.html"]
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

    # 2) 13 个共享内联块
    total = 0
    for name, srcname, targets, begin, end in BLOCKS:
        src_path = os.path.join(HERE, srcname)
        if not os.path.exists(src_path):
            bad("共享源文件", srcname)
            continue
        src = read(src_path).rstrip()
        for t in targets:
            p = os.path.join(REPO, t)
            html = read(p)
            m = re.search(re.escape(begin) + r"\n(.*?)\n" + re.escape(end), html, re.S)
            if not m:
                bad("内联块缺失", "%s / %s" % (name, t))
            elif m.group(1) != src:
                bad("内联块不一致", "%s / %s (%dB vs %dB)" % (name, t, len(m.group(1)), len(src)))
            else:
                total += 1
    if total == 13:
        ok("13 个共享内联块与源文件逐字节一致", "13/13")
    else:
        bad("共享内联块总数", "%d/13" % total)

    # 3) 静态导航块紧贴 <body>
    nav_begin = BLOCKS[1][3]
    nav_end = BLOCKS[1][4]
    good = 0
    for t in BLOCKS[1][2]:
        html = read(os.path.join(REPO, t))
        body = re.search(r"<body[^>]*>", html)
        k = html.find(nav_begin)
        if body and k >= 0 and 0 <= k - body.end() <= 16:
            good += 1
        else:
            bad("静态导航块位置", "%s (body=%s, block=%s)" % (t, body.end() if body else -1, k))
    if good == 5:
        ok("5 页 SITE-NAV-HTML 紧贴 <body> 开头", "5/5")

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
            if hits == 5:
                ok("5 页 SHARED TOKENS 与 design_tokens.css 一致", "5/5")

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

    # 6) 导航品牌可点
    nav_path = os.path.join(HERE, "site-nav-static.html")
    if os.path.exists(nav_path):
        nav = read(nav_path)
        if re.search(r'<a\s+class="__wsn_brand"[^>]*href="home\.html"', nav):
            ok("导航品牌为可点击首页链接", "D-16")
        else:
            bad("导航品牌不是可点击首页链接", "D-16")

    print("-" * 60)
    if fails:
        print("发布门禁失败：%d 项（%s）" % (len(fails), "; ".join(sorted(set(fails)))))
        sys.exit(1)
    print("发布门禁全通过：0 项失败。可以发布。")


if __name__ == "__main__":
    main()
