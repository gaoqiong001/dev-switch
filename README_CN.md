# Dev Switch - 本地开发环境检测工具

一个基于 Tauri 的桌面应用，用于检测和显示本地开发环境的配置信息，并为每个语言/工具提供对应的安装、卸载指引。

## 功能特性

- 💻 **系统信息检测** - 操作系统版本、主机名、CPU 核心数、内存大小
- 🌐 **编程语言检测** - 支持 19 种编程语言，已安装的排在前面
- 🛠️ **开发工具检测** - 支持 50+ 种开发工具，已安装的排在前面
- 📡 **网络信息检测** - 网络接口、本地 IP 地址
- 🧭 **安装指引** - 每个语言/工具按操作系统给出安装/卸载命令
- 🔍 **搜索** - 按名称筛选语言和工具
- 📤 **导出报告** - 将检测结果导出为 JSON 或 CSV 文件
- 📥 **导入配置** - 从之前导出的配置文件恢复设置
- 🎨 **多语言与主题** - 简体中文 / English 界面，浅色 / 深色 / 跟随系统主题
- 🚫 **无弹窗** - Windows 下检测时不会弹出命令行窗口

## 支持的编程语言

Node.js, Python, Java, Go, Rust, .NET, Ruby, PHP, Perl, Swift, Kotlin, Scala, Elixir, Clojure, Haskell, Julia, Lua, R, MATLAB

## 支持的开发工具

Git, Docker, npm, yarn, pnpm, VS Code, CMake, Make, Nginx, Apache, MySQL, PostgreSQL, Redis, MongoDB, SQLite, Vim, Neovim, Emacs, Sublime Text, Atom, IntelliJ IDEA, Android Studio, Xcode, Postman, Insomnia, GitHub CLI, Terraform, Ansible, Kubernetes, Helm, AWS CLI, Azure CLI, Google Cloud SDK, Vagrant, VirtualBox, VMware

## 界面预览

应用采用现代化设计：

- **顶部导航** - 清晰的功能分类
- **毛玻璃卡片** - 半透明卡片设计，悬停有浮动效果
- **响应式布局** - 自适应不同屏幕尺寸
- **状态排序** - 已安装的工具显示在前面，未安装的显示在后面并使用虚线边框和降低的透明度
- **紧凑模式** - 减小间距，显示更多内容

## 技术栈

- **后端**: Rust + Tauri v1，`sysinfo`、`which`、`rusqlite`（内置 SQLite）
- **前端**: React 19 + TypeScript + Tailwind CSS + Vite 5
- **状态与多语言**: React hooks 管理状态；`react-i18next` 提供中英文；检测结果缓存在 SQLite 中

## 安装和运行

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

### 后端检查 / 测试

```bash
cd src-tauri && cargo check
cd src-tauri && cargo test     # 指定测试可加名称：cargo test <name>
```

## 项目结构

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

## 使用说明

1. 启动应用后，系统会自动检测开发环境信息
2. 点击顶部导航栏切换「系统信息 / 编程语言 / 开发工具 / 设置」
3. 已安装的工具显示在列表前面，未安装的显示在后面并使用虚线边框
4. 点击顶栏「刷新」按钮可重新检测（会清除 SQLite 缓存并重新扫描）
5. 使用页面标题下方的搜索框按名称筛选
6. 在「设置 → 数据」中可以导出 JSON/CSV 报告、导入配置或清除缓存

## 实现说明

### 1. 无弹窗检测
在 Windows 系统上，使用 `CREATE_NO_WINDOW` 标志来隐藏命令行窗口，避免运行应用时弹出多个 cmd 窗口。

### 2. 完整的语言和工具列表
- 支持 19 种编程语言和 50+ 种开发工具
- 已安装的工具显示在列表前面，未安装的显示在后面并使用虚线边框和降低的透明度
- 安装/卸载指引按操作系统区分（Windows / macOS / Linux）

### 3. 版本号清洗
`--version` 的原始输出（例如 `curl 8.21.0 (Windows) libcurl/8.21.0 ...`）会被清洗为版本号本体（例如 `8.21.0`）。

## 许可证

MIT License
