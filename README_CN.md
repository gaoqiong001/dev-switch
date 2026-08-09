<div align="center">

<img src="app-icon.png" width="96" alt="Dev Switch" />

# Dev Switch

### 一个桌面应用，检测并查看你的本地开发环境

[![平台](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue.svg)](https://github.com/gaoqiong001/dev-switch/releases)
[![基于 Tauri](https://img.shields.io/badge/built%20with-Tauri%201-orange.svg)](https://tauri.app/)
[![前端](https://img.shields.io/badge/frontend-React%2019%20%7C%20TypeScript%20%7C%20Tailwind-61dafb.svg)]()
[![界面语言](https://img.shields.io/badge/language-zh%20%7C%20en-brightgreen.svg)]()
[![License](https://img.shields.io/github/license/gaoqiong001/dev-switch.svg)](LICENSE)

中文 | [English](README.md)

</div>

---

## 为什么选择 Dev Switch？

新装一台机器、排查运行环境或帮同事看配置时，通常要对十几个语言和工具逐个执行 `--version`，再手动去找安装路径和安装命令。**Dev Switch** 一键完成全部盘点：扫描 19 种编程语言和 50+ 种开发工具，展示各自的版本号与安装路径，并针对当前系统给出每个条目的安装/卸载命令。

- **一键全面盘点** - 一次扫描检测 19 种语言和 50+ 种工具，已安装的排在前面
- **干净整洁的版本号** - 原始 `--version` 输出会被清洗为版本号本体（例如 `curl 8.21.0 (Windows) …` → `8.21.0`）
- **按系统给出的指引** - 每个条目都附带 Windows / macOS / Linux 的安装、卸载命令
- **系统与网络信息** - 操作系统、主机名、CPU、内存，以及本地 IP 和网络接口
- **无弹窗** - Windows 下检测使用 `CREATE_NO_WINDOW` 标志，不会闪出命令行窗口
- **快速且离线友好** - 结果缓存在 SQLite 中；点击「刷新」清除缓存并按需重新扫描
- **多语言与主题** - 简体中文 / English 界面；浅色、深色或跟随系统主题

## 功能特性

### 检测

- **系统信息** - 操作系统版本、主机名、CPU 核心数、内存大小
- **编程语言** - 19 种编程语言（已安装的排在前面）
- **开发工具** - 50+ 种开发工具与编辑器（已安装的排在前面）
- **网络信息** - 本地 IP 和网络接口

### 详情与指引

- 每个条目的**版本号 / 安装路径 / 状态**，版本号经过清洗
- 按操作系统（Windows / macOS / Linux）区分的**安装与卸载指引**

### 交互体验

- **搜索** - 按名称筛选语言和工具
- **状态排序** - 已安装的排在前面；未安装的用虚线边框并降低透明度
- **紧凑模式** - 减小间距，显示更多内容

### 数据与设置

- **SQLite 缓存** - 检测结果跨启动保留；「刷新」清除缓存并重新扫描
- **导出 / 导入** - 将检测结果导出为 JSON 或 CSV；导入设置恢复配置
- **检查更新** - 查询 GitHub Releases API 是否有新版本

[完整更新日志](CHANGELOG.md) | [发布说明](docs/release-notes/v0.1.0-zh.md)

## 支持的编程语言

Node.js, Python, Java, Go, Rust, .NET, Ruby, PHP, Perl, Swift, Kotlin, Scala, Elixir, Clojure, Haskell, Julia, Lua, R, MATLAB

## 支持的开发工具

Git, Docker, npm, yarn, pnpm, VS Code, CMake, Make, Nginx, Apache, MySQL, PostgreSQL, Redis, MongoDB, SQLite, Vim, Neovim, Emacs, Sublime Text, Atom, IntelliJ IDEA, Android Studio, Xcode, Postman, Insomnia, GitHub CLI, Terraform, Ansible, Kubernetes, Helm, AWS CLI, Azure CLI, Google Cloud SDK, Vagrant, VirtualBox, VMware

## 常见问题

<details>
<summary><strong>数据存在哪里？</strong></summary>

检测结果缓存在 SQLite 数据库中：`dirs::data_local_dir()/dev-switch/dev-switch.db`

- **Windows**: `%LOCALAPPDATA%\dev-switch\dev-switch.db`
- **macOS**: `~/Library/Application Support/dev-switch/dev-switch.db`
- **Linux**: `~/.local/share/dev-switch/dev-switch.db`

界面设置（主题、语言、检测范围等）保存在 `localStorage` 的 `dev-switch-settings` 键下。

</details>

<details>
<summary><strong>我明明装了某工具，却显示「未安装」？</strong></summary>

只有 `--version` 命令真正执行成功，工具才会被标记为已安装。仅仅在磁盘上找到了可执行文件（`which` 命中）**不算**已安装。如果可执行文件存在但无法输出版本号（例如被沙箱拦截或需要不同的调用方式），仍会显示「未安装」。

</details>

<details>
<summary><strong>版本号显示是旧的或不对？</strong></summary>

检测结果缓存在 SQLite 中，在点击顶栏「刷新」（会清除缓存并在下次加载时重新检测）之前不会重新扫描。

</details>

<details>
<summary><strong>Windows 下检测时会弹出命令行窗口吗？</strong></summary>

不会。检测命令以 `CREATE_NO_WINDOW` 标志启动，运行期间不会闪出任何命令行窗口。

</details>

## 快速上手

1. **启动** - 应用启动后自动扫描开发环境
2. **导航** - 用顶部导航在「系统信息 / 编程语言 / 开发工具 / 设置」间切换
3. **查看** - 已安装的排在前面；打开任意条目查看版本号、路径和安装/卸载指引
4. **搜索** - 在页面标题下方的搜索框输入关键字筛选
5. **刷新** - 点击顶栏「刷新」清除缓存并重新扫描
6. **导出 / 导入** - 在「设置 → 数据」中导出 JSON/CSV 报告、导入配置或清除缓存

## 下载与安装

> 预编译安装包尚未发布。发布后，Windows（以及 macOS/Linux）的安装包会更新在 [Releases](https://github.com/gaoqiong001/dev-switch/releases) 页面。

从源码运行：

### 前置要求

- Node.js（推荐 v18 或更高版本）
- Rust（推荐最新稳定版）
- Tauri CLI

### 安装依赖

```bash
npm install                    # 安装前端依赖
npm install -g @tauri-apps/cli # 安装 Tauri CLI（如果尚未安装）
```

### 开发模式运行

```bash
npm run tauri dev
```

### 构建

```bash
npm run build        # 前端类型检查 + 构建（tsc && vite build）
npm run tauri build  # 生产版本打包
```

## 开发指南

<details>
<summary><strong>架构概览</strong></summary>

```
┌───────────────────────────────────────────────────────┐
│             前端（React 19 + TypeScript）               │
│  组件 ─── Hooks（状态）─── i18n（react-i18next）        │
└──────────────────────────┬────────────────────────────┘
                           │ Tauri IPC（invoke）
┌──────────────────────────▼────────────────────────────┐
│                后端（Tauri + Rust）                     │
│   main.rs（命令 + 检测）─── db.rs（SQLite）             │
└───────────────────────────────────────────────────────┘
```

**核心设计模式**

- **SQLite 缓存作为单一数据源** - 检测结果缓存在 `languages` / `tools` 表中；表为空时才触发重新检测
- **刷新 = 清空 + 重扫** - `refresh_detection` 只删除两张表；下次加载时重新检测
- **版本号清洗** - 原始 `--version` 输出被清洗为版本号本体（例如 `curl 8.21.0 (Windows) …` → `8.21.0`）
- **Windows 下保持安静** - 检测命令以 `CREATE_NO_WINDOW` 启动，不会闪出命令行窗口

**关键组件**

- `main.rs` - 全部 Tauri 命令以及语言/工具定义表
- `db.rs` - SQLite 层，用 `Mutex<Connection>` 包装；通过 `ON CONFLICT(name) DO UPDATE` 做 upsert

</details>

<details>
<summary><strong>开发命令</strong></summary>

```bash
# 安装依赖
npm install

# 开发模式（热更新 + Tauri 窗口）
npm run tauri dev

# 前端类型检查 + 构建
npm run build

# 生产版本打包
npm run tauri build

# 后端检查 / 测试
cd src-tauri && cargo check
cd src-tauri && cargo test       # 指定测试可加名称：cargo test <name>
```

**技术栈** - 前端：React 19 · TypeScript · Tailwind CSS 3.4 · Vite 5 · react-i18next · sonner。后端：Tauri 1 · Rust · sysinfo 0.30 · which · rusqlite（内置 SQLite）。

</details>

<details>
<summary><strong>项目结构</strong></summary>

```
dev-switch/
├── src/                 # React 前端
│   ├── components/      # UI 组件（页面、卡片、布局、通用组件）
│   ├── hooks/           # 状态管理（useAppState、useSettings、useUpdateCheck）
│   ├── i18n/            # react-i18next 多语言（zh-CN / en-US）
│   ├── utils/           # 工具函数（格式化、主题、tauri 封装）
│   └── types/           # TypeScript 类型（与 Rust 结构体对应）
├── src-tauri/           # Rust 后端
│   ├── src/
│   │   ├── main.rs      # Tauri 命令 + 语言/工具定义表
│   │   └── db.rs        # SQLite 数据库层
│   ├── Cargo.toml       # Rust 依赖配置
│   └── tauri.conf.json  # Tauri 配置
├── index.html
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

</details>

## 参与贡献

欢迎提交 Issue、建议和 PR！提交 PR 前请确保前端类型检查通过、后端测试通过：

```bash
npm run build
cd src-tauri && cargo test
```

## 许可证

MIT © 高琼
