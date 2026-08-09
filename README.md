# Dev Switch

A Tauri-based desktop app that detects and displays your local development environment configuration, with per-item install/uninstall guides.

## Features

- 💻 **System Info** – OS version, hostname, CPU cores, total memory
- 🌐 **Language Detection** – 19 programming languages, installed ones listed first
- 🛠️ **Tool Detection** – 50+ development tools, installed ones listed first
- 📡 **Network Info** – network interfaces and local IP
- 🧭 **Install Guides** – platform-specific install / uninstall commands for every item
- 🔍 **Search** – filter languages and tools by name
- 📤 **Export Reports** – export detection results as JSON or CSV
- 📥 **Import Config** – restore settings from a previously exported file
- 🎨 **i18n & Themes** – Simplified Chinese / English UI, light / dark / system theme
- 🚫 **No Console Popups** – no command windows flash on Windows during detection

## Supported Languages

Node.js, Python, Java, Go, Rust, .NET, Ruby, PHP, Perl, Swift, Kotlin, Scala, Elixir, Clojure, Haskell, Julia, Lua, R, MATLAB

## Supported Tools

Git, Docker, npm, yarn, pnpm, VS Code, CMake, Make, Nginx, Apache, MySQL, PostgreSQL, Redis, MongoDB, SQLite, Vim, Neovim, Emacs, Sublime Text, Atom, IntelliJ IDEA, Android Studio, Xcode, Postman, Insomnia, GitHub CLI, Terraform, Ansible, Kubernetes, Helm, AWS CLI, Azure CLI, Google Cloud SDK, Vagrant, VirtualBox, VMware

## UI

Modern design:

- **Top navigation** – clean tab-based navigation
- **Glass cards** – translucent card design with hover lift
- **Responsive layout** – adapts to different screen sizes
- **Status sorting** – installed items first; uninstalled items appear later with a dashed border and reduced opacity
- **Compact mode** – tighter spacing to show more content

## Tech Stack

- **Backend**: Rust + Tauri v1, `sysinfo`, `which`, `rusqlite` (bundled SQLite)
- **Frontend**: React 19 + TypeScript + Tailwind CSS + Vite 5
- **State & i18n**: React hooks for state; `react-i18next` for zh-CN / en-US; detection results cached in SQLite

## Installation & Running

### Prerequisites

- Node.js (v18 or later recommended)
- Rust (latest stable recommended)
- Tauri CLI

### Install dependencies

```bash
npm install                    # install frontend deps
npm install -g @tauri-apps/cli # install Tauri CLI if not already installed
```

### Development mode

```bash
npm run tauri dev
```

### Builds

```bash
npm run build        # frontend typecheck + build (tsc && vite build)
npm run tauri build  # production bundle
```

### Backend checks / tests

```bash
cd src-tauri && cargo check
cd src-tauri && cargo test     # add a name to run one: cargo test <name>
```

## Project Structure

```
dev-switch/
├── src/                 # React frontend
│   ├── components/      # UI components (pages, cards, layout, ui)
│   ├── hooks/           # state management (useAppState, useSettings, useUpdateCheck)
│   ├── i18n/            # react-i18next locales (zh-CN / en-US)
│   ├── utils/           # helpers (format, theme, tauri)
│   └── types/           # TypeScript types mirroring the Rust structs
├── src-tauri/           # Rust backend
│   ├── src/
│   │   ├── main.rs      # Tauri commands + language/tool definitions
│   │   └── db.rs        # SQLite database layer
│   ├── Cargo.toml       # Rust dependencies
│   └── tauri.conf.json  # Tauri configuration
├── index.html
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

## Usage

1. On launch, the app automatically detects your dev environment.
2. Use the top navigation to switch between System / Languages / Tools / Settings.
3. Installed items appear first; uninstalled ones appear later with a dashed border.
4. Click **Refresh** in the header to re-detect (clears the SQLite cache and re-scans).
5. Use the search box under a page title to filter items.
6. Use Settings → Data to export a JSON/CSV report, import a config, or clear the cache.

## Implementation Notes

### 1. No console popups
On Windows, the `CREATE_NO_WINDOW` flag is used when spawning detection commands, so no cmd windows flash while the app runs.

### 2. Full language & tool coverage
- 19 programming languages and 50+ development tools
- Installed items are sorted to the front; uninstalled ones use a dashed border and reduced opacity
- Install/uninstall guides are per-OS (Windows / macOS / Linux)

### 3. Version cleaning
Raw `--version` output (e.g. `curl 8.21.0 (Windows) libcurl/8.21.0 ...`) is cleaned to the version token (e.g. `8.21.0`).

## License

MIT License
