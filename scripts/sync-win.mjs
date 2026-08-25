// 把构建产物同步到 Windows 可见目录（WSL 环境），供 Chrome/Edge 加载
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const src = join(root, '.output', 'chrome-mv3');

if (!existsSync(join(src, 'manifest.json'))) {
  console.error('未找到构建产物，请先运行 npm run build');
  process.exit(1);
}

let winUser = process.env.WINDOWS_USERNAME || '';
if (!winUser) {
  try {
    winUser = execFileSync('/mnt/c/windows/system32/cmd.exe', ['/C', 'echo %USERNAME%'], {
      encoding: 'utf8'
    }).trim();
  } catch {
    /* ignore */
  }
}

const dest = process.env.NOVATAB_WIN_DIR
  ? process.env.NOVATAB_WIN_DIR.replace(/\\/g, '/')
  : `/mnt/c/Users/${winUser || 'Public'}/NovaTab`;

if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
console.log(`已同步到 Windows：${dest}`);
