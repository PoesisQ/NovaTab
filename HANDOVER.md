# NovaTab 项目交接文档

> 统一、可定制、纯本地的新建标签页浏览器扩展（Chrome / Edge）
> 当前版本：v0.6.5 ｜ 最后更新：2026-08-28
> GitHub 仓库：https://github.com/PoesisQ/NovaTab （分支 `main`）

---

## 0. 给 AI Agent / 接班者的三分钟速读

1. 入口：`src/entrypoints/newtab/`（App.vue 组装一切，style.css 集中全部样式）
2. 设置类型与默认值：`src/types/settings.ts`（改设置先动这里，`normalizeSettings` 自动兼容旧数据）
3. 功能清单与权限：`src/core/featureRegistry.ts`（设置面板的开关列表据此自动生成）
4. 图标：`src/components/Icon.vue`（12 个白描 SVG，新增图标改 `IconName` 联合类型）
5. 改完必做三步：`npm run compile`（零错误）→ `npm run build` → `npm run sync:win`，并同步改 `package.json` 的 version

---

## 1. 项目概览

NovaTab 是一个替换浏览器"新建标签页"的 MV3 扩展，一套代码同时支持 Chrome 与 Edge（未来可扩展 Firefox）。所有功能均可开关、可调参；数据默认全部保存在本机浏览器内，无遥测、无广告、无账户。

**页面布局**

- 左上角：图标坞（收藏夹 / 历史 / 下载）——白描图标裸放，悬停展开面板，点击直达浏览器对应页面
- 右上角：6 个浏览器入口白描图标（设置 / 历史 / 下载 / 扩展 / 书签 / 密码）
- 中部：白色极简搜索框 → 常用网址行（黑圆底图标 + 可编辑名称）→ 待办宽条（位置 / 深浅主题可选）
- 左下角：行楷字体自定义问候语；右下角：白描齿轮设置按钮

**核心特性**

| 类别 | 内容 |
|---|---|
| 壁纸 | 本地图片 / 预设渐变 / 自定义取色；4 种适配模式；缩放、位移、模糊、亮度、对比度、饱和度、暗角、噪点、变暗遮罩 |
| 搜索 | 多引擎（Google/Bing/百度/DuckDuckGo/自定义 `%s` 模板）；建议词、搜索历史、最常搜索各自可开关 |
| 收藏夹 | 左上角图标悬停展开；可选起始根文件夹；只显示文件夹或直接铺开内容；可删除 |
| 常用网址 | 搜索栏与待办之间的一排图标（黑圆底 + 网站图标）；排序、改名、隐藏与恢复在设置面板管理 |
| 待办 | 宽条列表（居中/左 1/3/右 1/3 可选；深/浅色主题）；最多显示 5 条、悬停滚轮滚动；可设日期时间；管理面板（增/删/排序/备注）；可选浏览器账号云同步 |
| 历史 / 下载 | 左上角图标悬停查看；点击直达浏览器对应页面 |
| 其他 | 全套白描 SVG 图标；苹果风深色美学；丝滑动效；配置导出/导入 |

---

## 2. 技术栈与依赖结构（库结构）

```
wxt（构建框架，负责多浏览器清单/打包）
 └─ @wxt-dev/module-vue（WXT 的 Vue 插件，让 Vite 编译 .vue）
     └─ vite（由 wxt 内部引入）
 ├─ vue 3（唯一运行时依赖，页面框架）
 └─ typescript + vue-tsc + @types/chrome（类型检查与 Chrome API 类型）
```

**package.json 依赖一览**

| 包 | 版本 | 作用 | 运行时/开发 |
|---|---|---|---|
| `vue` | ^3.4 | 页面 UI 框架 | 运行时（打包进产物） |
| `wxt` | ^0.19 | 构建框架：入口扫描、manifest 生成、多目标打包 | 开发 |
| `@wxt-dev/module-vue` | ^1.0 | 让 WXT 支持 .vue 单文件组件 | 开发 |
| `typescript` | ^5.5 | 类型系统 | 开发 |
| `vue-tsc` | ^2.0 | Vue + TS 类型检查 | 开发 |
| `@types/chrome` | ^0.0.268 | chrome.* API 类型声明 | 开发 |

**npm scripts**

| 命令 | 作用 |
|---|---|
| `npm run dev` | 开发模式（热更新，浏览器里加载 `.output/chrome-mv3`） |
| `npm run build` | 生产构建 → `.output/chrome-mv3/` |
| `npm run sync:win` | 把构建产物复制到 Windows 可见目录 `C:\Users\<用户>\NovaTab` |
| `npm run zip` | 打 zip 包 |
| `npm run compile` | vue-tsc 类型检查（以零错误为准） |

---

## 3. 项目文件结构（逐文件职责，共约 2957 行）

```
novatab/
├── package.json              # 依赖与脚本
├── package-lock.json         # 依赖锁定
├── tsconfig.json             # 继承 .wxt/tsconfig.json 的 TS 配置
├── wxt.config.ts             # WXT 配置：srcDir、manifest 权限清单
├── README.md                 # GitHub 项目主页（面向用户）
├── HANDOVER.md               # 本交接文档
├── .gitignore
├── scripts/
│   └── sync-win.mjs          # 把 .output/chrome-mv3 复制到 Windows 目录（自动探测用户名）
└── src/                      # 源代码根目录（srcDir: 'src'）
    ├── entrypoints/          # WXT 入口目录（只有它会被打进 manifest）
    │   └── newtab/           # 新标签页入口（目录名即入口名 → chrome_url_overrides.newtab）
    │       ├── index.html    # 页面骨架（#app + main.ts）
    │       ├── main.ts       # 启动：载入存储 → 挂载 App
    │       ├── App.vue       # 根组件：壁纸层/搜索/常用网址/待办/四角组件/设置面板的组装
    │       └── style.css     # 全部样式（667 行，苹果深色美学 + 动效）
    ├── types/
    │   └── settings.ts       # 全部设置的 TypeScript 类型 + 默认值 + normalizeSettings
    ├── core/                 # 无 UI 的核心逻辑层
    │   ├── storage.ts        # 响应式设置 store（自动防抖写入 chrome.storage.local）+ createStore 工厂
    │   ├── featureRegistry.ts# 功能注册表：9 个功能的 id/名称/描述/所需权限（设置面板据此渲染）
    │   ├── browser.ts        # 浏览器探测（chrome/edge/firefox）+ 浏览器内置页深链 + 容错跳转
    │   ├── permissions.ts    # 权限申请封装（功能权限 + 搜索建议 host 权限 + onAdded 监听）
    │   ├── search.ts         # 搜索引擎定义、URL 构造、建议词抓取、执行搜索
    │   ├── searchHistory.ts  # 搜索历史存储（最多 500 条）与统计
    │   ├── todos.ts          # 待办存储 + 云同步（storage.sync）读写
    │   ├── bookmarkRoots.ts  # 收藏夹根文件夹列表（供设置面板下拉选择）
    │   ├── images.ts         # 壁纸的 IndexedDB 存取（save/get/delete/clear）
    │   ├── toast.ts          # 全局轻提示
    │   └── utils.ts          # favicon URL（_favicon 接口）、时间/大小/日期格式化
    └── components/           # UI 组件层
        ├── Icon.vue          # 白描 SVG 图标组件（12 个：star/clock/download/settings/grid/key/list/plus/folder/file/folder-open/search）
        ├── WallpaperLayer.vue# 壁纸渲染层：渐变/图片、缩放位移、暗角/噪点等效果
        ├── SearchBar.vue     # 搜索框：引擎切换、建议词、历史、最常搜索、键盘导航
        ├── QuickLinksBar.vue # 常用网址行：黑圆底图标+名称、改名/移除/添加、动画
        ├── TodoBar.vue       # 待办宽条 + 管理面板（增删排序、日期时间、备注）
        ├── DockPanel.vue     # 左上角图标坞：悬停展开收藏夹/历史/下载面板
        ├── BookmarksCard.vue # 收藏夹列表（根目录选择、逐层下钻、搜索、删除）
        ├── HistoryCard.vue   # 历史记录列表
        ├── DownloadsCard.vue # 下载记录列表（打开文件/所在文件夹）
        ├── TopBar.vue        # 右上角 6 个浏览器入口白描图标
        ├── CornerGreeting.vue# 左下角行楷问候语
        └── SettingsPanel.vue # 设置面板：功能开关（内嵌细节）、历史与下载、数据、关于
```

**构建产物结构（`.output/chrome-mv3/`）**

```
.output/chrome-mv3/
├── manifest.json            # MV3 清单：chrome_url_overrides.newtab、权限
├── newtab.html              # 新标签页 HTML（引用下方的 JS/CSS）
├── assets/newtab-*.css      # 全部样式（文件名带内容哈希）
└── chunks/newtab-*.js       # 全部逻辑（Vue 运行时 + 业务代码，约 129KB）
```

---

## 4. 数据存储结构

| 位置 | Key / 库 | 内容 |
|---|---|---|
| `chrome.storage.local` | `settings` | 全部设置（功能开关、壁纸参数、搜索参数等，防抖 200ms 自动保存） |
| `chrome.storage.local` | `todos` | 待办列表 + 备注 |
| `chrome.storage.local` | `searchHistory` | 搜索历史（词、次数、时间，上限 500） |
| `chrome.storage.sync` | `todosSync` | 待办云同步副本（仅开启"跨设备同步"时写入；Chrome/Edge 各自独立账号云） |
| IndexedDB | `novatab-images` / store `images` | 壁纸图片 Blob（大文件不走 storage 配额） |

配置导出 = `settings` 的 JSON 下载；导入 = 读 JSON 后经 `normalizeSettings()` 合并默认值。

---

## 5. Windows 如何找到项目地址（重要）

**开发环境是 WSL**：项目真实目录是 Linux 路径
`/home/poesis/tryout_DSHarness/novatab`，Windows 资源管理器**看不到**它。

Windows 能直接访问的是构建产物副本（每次 `npm run sync:win` 自动生成/覆盖）：

| 视角 | 路径 |
|---|---|
| Windows 资源管理器 / 浏览器加载 | `C:\Users\y_mai\NovaTab` |
| WSL 内部等价路径 | `/mnt/c/Users/y_mai/NovaTab` |
| WSL 项目源码（仅 Linux 可见） | `/home/poesis/tryout_DSHarness/novatab` |

**浏览器加载地址（告诉 Chrome/Edge 用哪个文件夹）**

1. Chrome：`chrome://extensions` → 开启「开发者模式」→「加载已解压的扩展程序」→ 选择 **`C:\Users\y_mai\NovaTab`**
2. Edge：`edge://extensions` → 开启「开发人员模式」→「加载解压缩的扩展」→ 选择同一文件夹

⚠️ 该文件夹被浏览器持续引用，**不要删除/移动**；更新时由 `sync:win` 原地替换。

**同步脚本逻辑（`scripts/sync-win.mjs`）**
- 检查 `.output/chrome-mv3/manifest.json` 存在（否则提示先 build）
- 通过 `cmd.exe /C echo %USERNAME%` 自动探测 Windows 用户名
- 目标目录默认 `C:\Users\<用户名>\NovaTab`，可用环境变量 `NOVATAB_WIN_DIR` 覆盖（如 `NOVATAB_WIN_DIR='C:\MyDir'`）

---

## 6. 构建 / 发布 / 更新 / Git 流程

```bash
cd /home/poesis/tryout_DSHarness/novatab
npm run compile     # 类型检查（必须零错误）
npm run build       # 构建 → .output/chrome-mv3
npm run sync:win    # 复制到 C:\Users\y_mai\NovaTab
```

浏览器端更新（每次改代码后必做）：
1. `chrome://extensions` / `edge://extensions` → 点 NovaTab 卡片上的 **⟳ 刷新**
2. **关闭所有已打开的新标签页**，再新开一个
3. 确认版本：右下角 ⚙️ → 「关于与隐私」→ 当前版本（改代码时同步改 `package.json` 的 version）

**Git / GitHub（仓库：https://github.com/PoesisQ/NovaTab）**

```bash
git add -A
git commit -m "描述：改了什么"     # 改动代码必须同步更新 README.md / HANDOVER.md
git push origin main
```

- 推送需要凭据：本机 WSL 无 GCM/SSH，需临时 token（classic + `repo` 权限）或安装 `gh` CLI（`gh auth login`）
- 提交者身份已在本仓库配置：`PoesisQ <PoesisQ@users.noreply.github.com>`
- 不要提交：`node_modules/`、`.output/`、`.wxt/`、`.npm-cache/`（已在 .gitignore）

**发布 Release**

1. `npm run build && npm run release:zip` → 生成 `.output/NovaTab-v<版本>.zip`（内含 `NovaTab/` 文件夹，解压即可加载）
2. 打 tag 并推送：`git tag v<版本> && git push origin v<版本>`
3. GitHub Releases 页面基于该 tag 创建 Release，上传 zip（需 Contents 写权限的 token）

---

## 7. 版本演进

| 版本 | 主要变化 |
|---|---|
| 0.1.0 | 初版：网格卡片布局（壁纸/搜索/收藏夹/待办/历史/下载/浏览器入口） |
| 0.2.x | 布局重排：删时间问候、左上图标坞 + 右上入口 + 待办宽条；权限重试；白搜索框；图标去毛玻璃并放大 |
| 0.3.x | 常用网址独立成行（Chrome 风格）；`_favicon` 接口修复站点图标；待办深浅主题；弹层/待办动效；设置面板折叠分组 |
| 0.4.x | 待办/设置字体演进（等线 Light → 微软雅黑 UI）；常用网址黑圆底图标 |
| 0.5.x | 仿宋 + 行楷艺术字体；设置面板重构（功能开关内嵌细节、去 emoji、苹果美学配色）；引擎下拉字号；全局禁选光标；壁纸选择修复 |
| 0.6.0 | 全部 emoji 替换为统一白描 SVG 图标（新增 Icon.vue 组件） |
| 0.6.1 | ESC 全局退出；待办单条编辑、点击/按住划过连续完成、悬停微放大、离场缩放动画 |
| 0.6.2 | 常用网址手动排序（悬停 ◀ ▶，非固定项自动转固定） |
| 0.6.3 | 常用网址管理全部移入设置（排序/改名/隐藏/恢复）；页面上 ✕ 改为真移除 |
| 0.6.4 | 常用网址改为完全手动列表：首次自动并入最常访问，之后所有项均可在设置中排序管理 |
| 0.6.5 | 常用网址拖拽排序（页面磁贴 + 设置列表拖动把手），拖拽高亮与位移动画 |

---

## 8. 功能与代码位置对照（改哪里）

| 想改什么 | 文件 |
|---|---|
| 加/删一个可开关的功能 | `core/featureRegistry.ts`（注册）+ `types/settings.ts`（FeatureId）+ 组件 + `App.vue`/`DockPanel.vue` 挂载 |
| 新增权限 | `wxt.config.ts` 的 `permissions`/`optional_permissions` + `featureRegistry.ts` 的功能声明 |
| 设置项 | `types/settings.ts`（类型+默认值）+ `SettingsPanel.vue`（对应功能的 feature-body） |
| 样式/配色/动效 | `entrypoints/newtab/style.css`（CSS 变量集中在 `:root`） |
| 图标 | `components/Icon.vue`（IconName 联合类型 + SVG 模板） |
| 引擎/建议词 | `core/search.ts`（ENGINES 数组） |
| 浏览器深链 | `core/browser.ts`（browserPageUrl 映射） |

---

## 9. 已知问题与注意事项

1. **Chrome 底部"扩展署名栏"**（显示扩展名 + 自定义 Chrome 按钮）：Chrome 官方 UI，扩展无法移除；个人版无开关（企业策略 `NTPFooterExtensionAttributionEnabled` 可关）；Edge 无此栏。
2. **浏览器内置页深链**（chrome://settings 等）：部分版本会被拦，`openBrowserPage()` 已做容错（复制链接 + 提示）。
3. **Firefox 未适配**：代码路径预留（`browser.ts` 有 firefox 分支），但 `wxt build -b firefox` 还需补 manifest 差异与 API 兼容测试。
4. **站点图标**依赖 `favicon` 权限 + `_favicon` 接口；无图标的网站回落为首字母。
5. **storage.sync 配额**（单项 8KB/总量 100KB）：壁纸绝不能放 sync，待办量大时云同步会失败（静默）。
6. 设置面板折叠动画用了新版 Chromium 的 `::details-content` 特性，老浏览器自动降级为无动画。
7. 移除扩展 = 清空本地全部数据（壁纸/待办/搜索历史/设置）；重装后需重新授权并导入配置。
8. 文档与代码必须同步更新（README.md / HANDOVER.md），避免仓库信息落后。

---

## 10. 后续开发指引

- **加新功能卡片类组件**：在 `featureRegistry` 注册 → `DockPanel.vue` 的 `items`/`components` 加图标与组件（或放进 `App.vue` 内容流）→ 设置面板自动出现开关。
- **新设置项**：`types/settings.ts` 加类型和默认值（`normalizeSettings` 会自动兼容旧数据）→ 面板对应 feature-body 加控件。
- **新图标**：`Icon.vue` 的 `IconName` 加名字 + `<template v-else-if>` 加 SVG。
- **跨浏览器**：保持使用 `chrome.*` API + 本项目封装（`core/` 层），避免直接依赖 Chromium 独有行为；上 Firefox 时用 WXT 的 `-b firefox` 目标。
- **上线商店**：Chrome Web Store 对 NTP 类扩展有专门政策（默认体验必须完整可用、需用途说明），上架前需按政策自查。
