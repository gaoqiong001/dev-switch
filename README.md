# Dev Switch - 本地开发环境检测工具

一个基于 Tauri 的桌面应用，用于检测和显示本地开发环境的配置信息。

## 功能特性

- 💻 **系统信息检测** - 操作系统版本、主机名、CPU核心数、内存大小
- 🌐 **编程语言检测** - 支持 19 种编程语言，已安装的排在前面
- 🛠️ **开发工具检测** - 支持 50+ 种开发工具，已安装的排在前面
- 🌐 **网络信息检测** - 网络接口、本地IP地址
- 📤 **导出报告** - 将检测结果导出为 JSON 文件
- 🚫 **无弹窗** - Windows 下不会弹出命令行窗口

## 支持的编程语言

Node.js, Python, Java, Go, Rust, .NET, Ruby, PHP, Perl, Swift, Kotlin, Scala, Elixir, Clojure, Haskell, Julia, Lua, R, MATLAB

## 支持的开发工具

Git, Docker, npm, yarn, pnpm, VS Code, CMake, Make, Nginx, Apache, MySQL, PostgreSQL, Redis, MongoDB, SQLite, Vim, Neovim, Emacs, Sublime Text, Atom, IntelliJ IDEA, Android Studio, Xcode, Postman, Insomnia, GitHub CLI, Terraform, Ansible, Kubernetes, Helm, AWS CLI, Azure CLI, Google Cloud SDK, Vagrant, VirtualBox, VMware

## 界面预览

应用采用现代化设计：

- **侧边栏导航** - 清晰的功能分类
- **毛玻璃效果** - 半透明卡片设计
- **响应式布局** - 自适应不同屏幕尺寸
- **状态排序** - 已安装的工具显示在前面，未安装的显示在后面并使用虚线边框

## 技术栈

- **后端**: Rust + Tauri
- **前端**: HTML + CSS + JavaScript
- **样式**: 自定义 CSS（参考 shadcn/ui 风格）

## 安装和运行

### 前置要求

- Node.js (推荐 v18 或更高版本)
- Rust (推荐最新稳定版)
- Tauri CLI

### 安装依赖

```bash
# 安装前端依赖
npm install

# 安装 Tauri CLI (如果尚未安装)
npm install -g @tauri-apps/cli
```

### 开发模式运行

```bash
npm run tauri dev
```

### 构建生产版本

```bash
npm run tauri build
```

## 项目结构

```
dev-switch/
├── src-tauri/           # Rust 后端
│   ├── src/
│   │   └── main.rs     # 主程序入口
│   ├── Cargo.toml      # Rust 依赖配置
│   ├── tauri.conf.json # Tauri 配置
│   └── build.rs        # 构建脚本
├── index.html          # 主页面
├── style.css           # 样式文件
├── script.js           # 前端逻辑
├── package.json        # Node.js 依赖
└── vite.config.js      # Vite 配置
```

## 使用说明

1. 启动应用后，系统会自动检测开发环境信息
2. 点击左侧导航栏切换不同类型的检测信息
3. 已安装的工具会显示在列表前面，未安装的会显示在后面
4. 点击"刷新检测"按钮可以重新检测
5. 点击"导出报告"按钮可以将检测结果保存为 JSON 文件

## 优化说明

### 1. 无弹窗检测
在 Windows 系统上，使用 `CREATE_NO_WINDOW` 标志来隐藏命令行窗口，避免打开应用时弹出多个 cmd 窗口。

### 2. 完整语言和工具列表
- 支持 19 种编程语言
- 支持 50+ 种开发工具
- 已安装的工具显示在列表前面
- 未安装的工具显示在后面并使用虚线边框和降低的透明度

### 3. 网络信息优化
使用 sysinfo 库直接获取网络接口信息，避免使用外部命令，提高稳定性和兼容性。

## 许可证

MIT License
