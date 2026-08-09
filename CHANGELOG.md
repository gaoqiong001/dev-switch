# Changelog

All notable changes to Dev Switch will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Release notes: [English](docs/release-notes/v0.1.0-en.md) | [中文](docs/release-notes/v0.1.0-zh.md)

## [0.1.0] - 2026-08-10

The first release of **Dev Switch** — a Tauri-based desktop app that detects and displays your local development environment in one click. It scans the machine for 19 programming languages and 50+ development tools, reports clean version numbers and install paths, and gives you the exact install/uninstall command for each one on your OS. System and network info are included too, and results are cached in SQLite so subsequent launches are instant until you hit **Refresh**.

**Stats**: 7 commits | 70 files changed | +13,417 insertions | -17 deletions

### Added

- **Detection** — system info (OS, hostname, CPU, memory), 19 programming languages, 50+ development tools, and network info (local IP and interfaces); installed items are sorted first
- **Clean version output** — raw `--version` banners are cleaned to the version token (e.g. `curl 8.21.0 (Windows) …` → `8.21.0`)
- **Per-OS install/uninstall guides** for every language and tool (Windows / macOS / Linux)
- **SQLite cache** — results persist across launches; **Refresh** clears the cache and re-scans on the next load
- **Search** — filter languages and tools by name
- **Compact mode** — tighter spacing to show more content
- **i18n** — Simplified Chinese / English UI
- **Themes** — light, dark or system
- **Export / Import** — detection results as JSON/CSV; settings import
- **Silent auto-update** — built-in updater delivers new versions automatically; toggleable in **Settings → Startup → Auto-download and install updates**; falls back to opening the GitHub Release page when disabled
- **Quiet detection on Windows** — commands spawn with `CREATE_NO_WINDOW`, so no console windows flash
- **CI/Release** — GitHub Actions automated pipeline: `ci.yml` (quality gate on push/PR), `release.yml` (build + publish on `v*` tag)

### Upgrade notes

- **No upgrade path** — this is the first release; there is no previous version to upgrade from, and no database migration (schema is created fresh on first launch).
- Installers are built automatically by GitHub Actions and attached to the [GitHub Release](https://github.com/gaoqiong001/dev-switch/releases) for Windows (NSIS `.exe` / MSI `.msi`).
