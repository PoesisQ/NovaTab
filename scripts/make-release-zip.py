#!/usr/bin/env python3
"""把 .output/chrome-mv3 打包成含 NovaTab/ 文件夹的 zip（先运行 npm run build）"""
import json
import os
import sys
import zipfile

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
version = json.load(open(os.path.join(root, 'package.json'), encoding='utf-8'))['version']
src = os.path.join(root, '.output', 'chrome-mv3')
out = os.path.join(root, '.output', f'NovaTab-v{version}.zip')

if not os.path.isfile(os.path.join(src, 'manifest.json')):
    print('未找到构建产物，请先运行 npm run build', file=sys.stderr)
    sys.exit(1)

with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for dirpath, _dirs, files in os.walk(src):
        for f in files:
            full = os.path.join(dirpath, f)
            rel = os.path.relpath(full, src)
            z.write(full, f'NovaTab/{rel}')

print(f'已生成：{out}')
