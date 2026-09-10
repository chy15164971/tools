# -*- coding: utf-8 -*-
"""
把 _shared/shared.js 内联进两个单文件 HTML 的 SHARED 块。
改完 shared.js 后运行：  python3 _shared/inject_shared.py
单文件 HTML 仍保持零依赖、可离线、双击即用（内容是内联的，不是 <src> 引用）。
"""
import io, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.dirname(HERE)
SHARED_JS = os.path.join(HERE, "shared.js")
TARGETS = [os.path.join(PROJ, "任务管理台.html"),
           os.path.join(PROJ, "明信片追踪.html")]
BEGIN = "/* >>> SHARED:BEGIN —— 由 _shared/shared.js 自动生成，请勿直接编辑本块 */"
END = "/* <<< SHARED:END */"

def main():
    if not os.path.exists(SHARED_JS):
        print("缺少 shared.js"); sys.exit(1)
    src = io.open(SHARED_JS, encoding="utf-8").read().rstrip()
    block = BEGIN + "\n" + src + "\n" + END
    for p in TARGETS:
        if not os.path.exists(p):
            print("跳过（不存在）:", p); continue
        s = io.open(p, encoding="utf-8").read()
        pat = re.compile(re.escape(BEGIN) + r".*?" + re.escape(END), re.S)
        if not pat.search(s):
            print("未找到 SHARED 块，跳过:", os.path.basename(p)); continue
        s2 = pat.sub(lambda m: block, s, count=1)
        io.open(p, "w", encoding="utf-8").write(s2)
        print("已同步:", os.path.basename(p))

if __name__ == "__main__":
    main()
