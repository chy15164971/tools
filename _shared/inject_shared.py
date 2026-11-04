# -*- coding: utf-8 -*-
"""
把 _shared 下的共享代码内联进三个单文件 HTML。
改完源文件后运行：  python3 _shared/inject_shared.py
单文件 HTML 仍保持零依赖、可离线、双击即用（内容是内联的，不是 <src> 引用）。

两块，互不影响（2026-11-04 站点统一）：
  1) SHARED  —— shared.js，仅任务管理台 / 明信片追踪 两页（云同步公共层）
       ⚠️ 不可注入海报墙：shared.js 的 esc/toast/setCloudStatus 等顶层声明与海报墙同名，
          整块注入会 SyntaxError 白屏（已实测 6 处冲突）。
  2) SITE-NAV —— site-nav.js，三页共用（站点导航条，零依赖，无命名冲突）

铁律：凡进这两块的代码必须同时写进对应源文件，否则下次 inject 整块覆盖。
"""
import io, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.dirname(HERE)

BLOCKS = [
    {
        "name": "SHARED",
        "src": os.path.join(HERE, "shared.js"),
        "targets": [os.path.join(PROJ, "任务管理台.html"),
                    os.path.join(PROJ, "明信片追踪.html")],
        "begin": "/* >>> SHARED:BEGIN —— 由 _shared/shared.js 自动生成，请勿直接编辑本块 */",
        "end":   "/* <<< SHARED:END */",
    },
    {
        "name": "SITE-NAV",
        "src": os.path.join(HERE, "site-nav.js"),
        "targets": [os.path.join(PROJ, "任务管理台.html"),
                    os.path.join(PROJ, "明信片追踪.html"),
                    os.path.join(PROJ, "书影音海报墙.html")],
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


if __name__ == "__main__":
    main()
