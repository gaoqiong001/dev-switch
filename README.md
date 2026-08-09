<div align="center">

<img src="app-icon.png" width="96" alt="Dev Switch" />

# Dev Switch

### Detect & inspect your local development environment in one native app

[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue.svg)](https://github.com/gaoqiong001/dev-switch/releases)
[![Built with Tauri](https://img.shields.io/badge/built%20with-Tauri%201-orange.svg)](https://tauri.app/)
[![Frontend](https://img.shields.io/badge/frontend-React%2019%20%7C%20TypeScript%20%7C%20Tailwind-61dafb.svg)]()
[![UI Language](https://img.shields.io/badge/language-zh%20%7C%20en-brightgreen.svg)]()
[![License](https://img.shields.io/github/license/gaoqiong001/dev-switch.svg)](LICENSE)

English | [中文](README_CN.md)

</div>

---

## Why Dev Switch?

Setting up a new machine, auditing a runtime, or helping a colleague usually means running `--version` on a dozen languages and tools one by one, then hunting for install paths and install commands. **Dev Switch** does the whole inventory in one click: it scans 19 programming languages and 50+ development tools, reports their versions and install paths, and gives you the exact install / uninstall command for each one on your OS.

- **One-Click Full Inventory** — Detects 19 languages and 50+ tools in a single scan; installed items are sorted to the front
- **Clean Version Output** — Raw `--version` banners are cleaned to the version token (e.g. `curl 8.21.0 (Windows) …` → `8.21.0`)
- **Per-OS Guides** — Every item carries install/uninstall commands for Windows, macOS and Linux
- **System & Network Info** — OS, hostname, CPU, memory, plus local IP and network interfaces
- **No Console Popups** — Detection runs with `CREATE_NO_WINDOW` on Windows, so no cmd windows flash
- **Fast & Offline-Friendly** — Results are cached in SQLite; hit **Refresh** to clear the cache and re-scan on demand
- **i18n & Themes** — Simplified Chinese / English UI; light, dark or system theme

## Features

### Detection

- **System** — OS version, hostname, CPU cores, total memory
- **Languages** — 19 programming languages (installed first)
- **Tools** — 50+ development tools & editors (installed first)
- **Network** — local IP and network interfaces

### Details & Guides

- **Version / Path / Status** per item, with cleaned version tokens
- **Install & uninstall guides** per operating system (Windows / macOS / Linux)

### UX

- **Search** — filter languages and tools by name
- **Status sorting** — installed items first; uninstalled items use a dashed border with reduced opacity
- **Compact mode** — tighter spacing to show more content

### Data & Settings

- **SQLite cache** — results persist across launches; **Refresh** clears the cache and re-scans
- **Export / Import** — export detection results as JSON or CSV; import settings back
- **Update check** — checks the GitHub Releases API for new versions

## Supported Languages

Node.js, Python, Java, Go, Rust, .NET, Ruby, PHP, Perl, Swift, Kotlin, Scala, Elixir, Clojure, Haskell, Julia, Lua, R, MATLAB

## Supported Tools

Git, Docker, npm, yarn, pnpm, VS Code, CMake, Make, Nginx, Apache, MySQL, PostgreSQL, Redis, MongoDB, SQLite, Vim, Neovim, Emacs, Sublime Text, Atom, IntelliJ IDEA, Android Studio, Xcode, Postman, Insomnia, GitHub CLI, Terraform, Ansible, Kubernetes, Helm, AWS CLI, Azure CLI, Google Cloud SDK, Vagrant, VirtualBox, VMware

## FAQ

<details>
<summary><strong>Where is my data stored?</strong></summary>

Detection results are cached in a SQLite database at `dirs::data_local_dir()/dev-switch/dev-switch.db`:

- **Windows**: `%LOCALAPPDATA%\dev-switch\dev-switch.db`
- **macOS**: `~/Library/Application Support/dev-switch/dev-switch.db`
- **Linux**: `~/.local/share/dev-switch/dev-switch.db`

UI settings (theme, language, detection scope, …) live in `localStorage` under the `dev-switch-settings` key.

</details>

<details>
<summary><strong>A tool I installed shows as "Not installed" — why?</strong></summary>

A tool is only marked as installed when a `--version` command actually runs successfully. Merely finding its executable on disk (`which`) is **not** enough. If the executable exists but fails to report a version (e.g. it is blocked by a sandbox or needs a different invocation), it stays "Not installed".

</details>

<details>
<summary><strong>Versions look stale or wrong?</strong></summary>

Detection results are cached in SQLite and are not re-scanned until you hit **Refresh** in the header, which clears the cache and re-detects on the next load.

</details>

<details>
<summary><strong>Will console windows pop up during detection on Windows?</strong></summary>

No. Detection commands are spawned with the `CREATE_NO_WINDOW` flag, so no command windows flash while the app runs.

</details>

## Quick Start

1. **Launch** — on startup the app automatically scans your development environment
2. **Navigate** — use the top navigation to switch between System / Languages / Tools / Settings
3. **Inspect** — installed items come first; open any item for its version, path and install/uninstall guide
4. **Search** — type in the search box under a page title to filter items
5. **Refresh** — click **Refresh** in the header to clear the cache and re-scan
6. **Export / Import** — use Settings → Data to export a JSON/CSV report, import a config, or clear the cache

## Download & Installation

> Pre-built installers are not published yet. Once a release is available, binaries for Windows (and macOS/Linux builds) will be published on the [Releases](https://github.com/gaoqiong001/dev-switch/releases) page.

To run from source:

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

## Development

<details>
<summary><strong>Architecture Overview</strong></summary>

```
┌───────────────────────────────────────────────────────┐
│              Frontend (React 19 + TypeScript)          │
│  Components ─── Hooks (state) ─── i18n (react-i18next) │
└──────────────────────────┬────────────────────────────┘
                           │ Tauri IPC (invoke)
┌──────────────────────────▼────────────────────────────┐
│                Backend (Tauri + Rust)                  │
│   main.rs (commands + detection) ── db.rs (SQLite)    │
└───────────────────────────────────────────────────────┘
```

**Core design patterns**

- **SQLite cache as SSOT** — detection results are cached in the `languages` / `tools` tables; an empty table triggers a re-scan
- **Refresh = clear + re-scan** — `refresh_detection` only deletes both tables; the next load re-detects
- **Version cleaning** — raw `--version` output is cleaned to a version token (e.g. `curl 8.21.0 (Windows) …` → `8.21.0`)
- **Quiet on Windows** — detection commands spawn with `CREATE_NO_WINDOW`, so no console windows flash

**Key components**

- `main.rs` — all Tauri commands plus the language/tool definition tables
- `db.rs` — SQLite layer wrapping a `Mutex<Connection>`; upserts via `ON CONFLICT(name) DO UPDATE`

</details>

<details>
<summary><strong>Development Guide</strong></summary>

```bash
# Install dependencies
npm install

# Dev mode (hot reload + Tauri window)
npm run tauri dev

# Frontend typecheck + build
npm run build

# Production bundle
npm run tauri build

# Backend checks / tests
cd src-tauri && cargo check
cd src-tauri && cargo test       # add a name to run one: cargo test <name>
```

**Tech Stack** — Frontend: React 19 · TypeScript · Tailwind CSS 3.4 · Vite 5 · react-i18next · sonner. Backend: Tauri 1 · Rust · sysinfo 0.30 · which · rusqlite (bundled SQLite).

</details>

<details>
<summary><strong>Project Structure</strong></summary>

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

</details>

## Contributing

Issues, suggestions and PRs are welcome! Before submitting a PR, make sure the frontend type-checks and the backend tests pass:

```bash
npm run build
cd src-tauri && cargo test
```

## License

MIT © Gao Qiong
