# Changelog

All notable changes to Dev Switch will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Release notes: [English](docs/release-notes/v0.1.0-en.md) | [中文](docs/release-notes/v0.1.0-zh.md)

## [0.1.0] - 2026-08-10

The first release of **Dev Switch** — a Tauri-based desktop app that detects and displays your local development environment in one click. It scans the machine for 19 programming languages and 50+ development tools, reports clean version numbers and install paths, and gives you the exact install/uninstall command for each one on your OS. System and network info are included too, and results are cached in SQLite so subsequent launches are instant until you hit **Refresh**.

**Stats**: 7 commits | 70 files changed | +13,417 / -17 lines

### Added

- **One-click environment detection** — a single scan detects 19 programming languages and 50+ development tools; system info (OS, hostname, CPU, memory) and network details (local IP, interfaces) are included; installed items are sorted first
- **Clean version output** — raw `--version` output is cleaned to the version token only; multi-line banners (VS Code), banner text (curl), and version prefixes (v22.12.0) are all handled
- **Per-OS install/uninstall guides** — every item includes platform-specific install and uninstall commands (Windows: winget/choco; macOS: brew; Linux: apt-get)
- **SQLite cache** — detection results are cached in a bundled SQLite database; **Refresh** clears the cache and re-scans; cache expiry is configurable
- **Search** — filter languages and tools by name
- **Compact mode** — tighter spacing to show more content
- **i18n** — Simplified Chinese / English UI
- **Themes** — light, dark, or system-following
- **Export / Import** — export detection results as JSON or CSV; import settings from a previous export
- **Silent auto-update** — built-in updater checks for new versions on startup and downloads and installs them silently; toggleable in **Settings → Startup → Auto-download and install updates**; falls back to opening the GitHub Release page when disabled
- **Quiet detection on Windows** — commands spawn with `CREATE_NO_WINDOW`, so no console windows flash during detection

### Upgrade notes

- **No upgrade path** — this is the first release; there is no previous version to upgrade from, and no database migration (schema is created fresh on first launch).
- Installers are built automatically by GitHub Actions and attached to the [GitHub Release](https://github.com/gaoqiong001/dev-switch/releases) for Windows (NSIS `.exe` / MSI `.msi`).
