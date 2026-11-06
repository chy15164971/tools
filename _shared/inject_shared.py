# -*- coding: utf-8 -*-
"""
把 _shared 下的共享代码内联进五个单文件 HTML（含 index.html——它是任务管理台.html 的逐字节副本）。
改完源文件后运行：  python3 _shared/inject_shared.py
单文件 HTML 仍保持零依赖、可离线、双击即用（内容是内联的，不是 <src> 引用）。

三块，互不影响（2026-11-04 站点统一）：
  1) SHARED  —— shared.js，仅任务管理台 / 明信片追踪 / index.html 三页（云同步公共层）
       ⚠️ 不可注入海报墙与门户页 home.html：shared.js 的 esc/toast/setCloudStatus 等顶层声明
          与海报墙同名，整块注入会 SyntaxError 白屏（已实测 6 处冲突）。
  2) SITE-NAV-HTML —— site-nav-static.html，五页共用，位于 <body> 开头。
       导航条 HTML + CSS 静态渲染，首屏解析即存在，避免 JS 在 DOMContentLoaded 才插入
       造成的「旧版任务台画面闪一下」（实测 FCP 1220ms / DCL 1555ms）。
  3) SITE-NAV —— site-nav.js，五页共用（行为层：当前页高亮 + 站点级 PWA 注册）。
       不再创建/插入导航条本体；与 SITE-NAV-HTML 配对使用。

铁律：凡进这三块的代码必须同时写进对应源文件，否则下次 inject 整块覆盖。
"""
import io, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.dirname(HERE)

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
                    os.path.join(PROJ, "home.html"),
                    os.path.join(PROJ, "index.html")],
        "begin": "/* >>> SITE-NAV:BEGIN —— 由 _shared/site-nav.js 自动生成，请勿直接编辑本块 */",
        "end":   "/* <<< SITE-NAV:END */",
    },
]


def inject(path, src, begin, end):
    s = io.open(path, encoding="utf-8").read()
    block = begin + "\n" + src + "\n" + end
    pat = re.compile(re.escape(begin) + r".*?" + re.escape(end), re.S)
    if not pat.search(s):
        print("  未找到标记块，跳过:", os.path.basename(path))
        return False
    s2 = pat.sub(lambda m: block, s, count=1)
    if s2 != s:
        io.open(path, "w", encoding="utf-8").write(s2)
    return True


def main():
    failed = []
    for b in BLOCKS:
        if not os.path.exists(b["src"]):
            print("缺少源文件:", b["src"]); sys.exit(1)
        src = io.open(b["src"], encoding="utf-8").read().rstrip()
        print("[%s] %s → %d 页" % (b["name"], os.path.basename(b["src"]), len(b["targets"])))
        for p in b["targets"]:
            if not os.path.exists(p):
                print("  跳过（文件不存在）:", os.path.basename(p)); continue
            ok = inject(p, src, b["begin"], b["end"])
            if ok: print("  已同步:", os.path.basename(p))
            else: failed.append((b["name"], os.path.basename(p)))
    # 2026-11-04 审查轮修复：目标文件缺标记块时此前只打印不报错、退出码仍为 0，
    # 会造成「注入看似成功其实整页没更新」的静默失效（QA P2-19）。
    if failed:
        print("注入失败（缺标记块）:", failed)
        sys.exit(1)


if __name__ == "__main__":
    main()
