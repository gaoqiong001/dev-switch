#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;

use serde::{Deserialize, Serialize};
use sysinfo::System;
use std::process::Command;
use tauri::State;

use db::Database;

#[derive(Debug, Serialize, Deserialize)]
struct SystemInfo {
    os_name: String,
    os_version: String,
    hostname: String,
    kernel_version: String,
    cpu_cores: usize,
    total_memory: u64,
}

#[derive(Debug, Serialize, Deserialize)]
struct InstallGuide {
    url: Option<String>,
    windows_cmd: Option<String>,
    macos_cmd: Option<String>,
    linux_cmd: Option<String>,
    notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct LanguageInfo {
    name: String,
    version: Option<String>,
    path: Option<String>,
    installed: bool,
    install_guide: Option<InstallGuide>,
    uninstall_guide: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ToolInfo {
    name: String,
    version: Option<String>,
    path: Option<String>,
    installed: bool,
    install_guide: Option<InstallGuide>,
    uninstall_guide: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct NetworkInfo {
    interfaces: Vec<String>,
    local_ip: Option<String>,
}

// 在 Windows 上隐藏命令行窗口
#[cfg(target_os = "windows")]
fn create_command(program: &str) -> Command {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;
    let mut cmd = Command::new(program);
    cmd.creation_flags(CREATE_NO_WINDOW);
    cmd
}

#[cfg(not(target_os = "windows"))]
fn create_command(program: &str) -> Command {
    Command::new(program)
}

// 检测工具/语言是否安装并获取版本
fn detect_version(executables: &[&str], version_args: &[&str]) -> (bool, Option<String>, Option<String>) {
    let mut installed = false;
    let mut version = None;
    let mut path = None;

    // 尝试执行命令获取版本
    for exe in executables {
        if let Ok(output) = create_command(exe).args(&version_args[1..]).output() {
            if output.status.success() {
                installed = true;
                // 优先读 stdout，为空时回退到 stderr（java、nginx、httpd、mongod 等输出到 stderr）
                let output_str = output_to_string(&output);
                if !output_str.is_empty() {
                    version = Some(clean_version(&output_str));
                }
                path = which::which(exe).ok().map(|p| p.to_string_lossy().to_string());
                break;
            }
        }
    }

    // 如果命令执行失败，尝试通过 which 查找路径（但不设置为已安装）
    if !installed {
        let mut fallback_path = None;
        for exe in executables {
            if let Some(p) = which::which(exe).ok() {
                let p_str = p.to_string_lossy().to_string();
                fallback_path = Some(p_str.clone());
                // 尝试再次执行命令，这次使用完整路径；失败则继续尝试下一个候选可执行文件
                if let Ok(output) = create_command(&p_str).args(&version_args[1..]).output() {
                    if output.status.success() {
                        installed = true;
                        let output_str = output_to_string(&output);
                        if !output_str.is_empty() {
                            version = Some(clean_version(&output_str));
                        }
                        path = Some(p_str);
                        break;
                    }
                }
            }
        }
        // 所有候选都未能成功执行时，仍报告 which 找到的路径（但不算已安装）
        if !installed {
            path = fallback_path;
        }
    }

    (installed, version, path)
}

// 合并命令输出：优先 stdout，为空时使用 stderr
fn output_to_string(output: &std::process::Output) -> String {
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    if !stdout.is_empty() { stdout } else { stderr }
}

/// 取第一个非空行（去掉首尾空白）
fn first_non_empty_line(raw: &str) -> Option<&str> {
    raw.lines().map(str::trim).find(|l| !l.is_empty())
}

/// 手动扫描第一个 `[v]数字(.数字)+` 版本号 token（2~4 段），避免引入 regex 依赖。
/// 例："curl 8.21.0 (Windows)" → "8.21.0"；"v22.12.0" → "22.12.0"；"git version 2.45.1" → "2.45.1"
fn extract_version(s: &str) -> Option<String> {
    let b = s.as_bytes();
    let mut i = 0;
    while i < b.len() {
        let has_v = matches!(b[i], b'v' | b'V');
        let j = if has_v { i + 1 } else { i };
        if j < b.len() && b[j].is_ascii_digit() {
            let mut segs = 0;
            let mut k = j;
            loop {
                while k < b.len() && b[k].is_ascii_digit() { k += 1; }
                segs += 1;
                if k < b.len() && b[k] == b'.' && segs < 4 { k += 1; continue; }
                break;
            }
            if segs >= 2 { return Some(s[j..k].to_string()); }
        }
        i += 1;
    }
    None
}

/// 清理版本：取第一个非空行 → 尝试提取版本号本体 → 识别不到则回退整行。
/// 解决 VS Code/curl 等把多行输出（git hash、arch、Features 列表）拼进版本字段的问题。
fn clean_version(raw: &str) -> String {
    match first_non_empty_line(raw) {
        Some(line) => extract_version(line).unwrap_or_else(|| line.to_string()),
        None => String::new(),
    }
}

#[cfg(test)]
mod version_tests {
    use super::*;

    #[test]
    fn extract_version_multiline_noise() {
        // VS Code: 多行输出（版本 / git hash / arch）
        assert_eq!(clean_version("1.132.0\ndf53daabb18cd157bdb08c7f01c34df936cf12f4\nx64"), "1.132.0");
        // curl: 整段 banner
        assert_eq!(
            clean_version("curl 8.21.0 (Windows) libcurl/8.21.0 Schannel zlib/1.3.2\nProtocols: dict file ftp...\nFeatures: alt-svc..."),
            "8.21.0"
        );
    }

    #[test]
    fn extract_version_single_line() {
        assert_eq!(clean_version("git version 2.45.1"), "2.45.1");
        assert_eq!(clean_version("go version go1.22.0 windows/amd64"), "1.22.0");
        assert_eq!(clean_version("Docker version 27.0.3, build 3713ee1"), "27.0.3");
        assert_eq!(clean_version("v22.12.0"), "22.12.0");
        assert_eq!(clean_version("openjdk version \"17.0.9\" 2023-10-17"), "17.0.9");
    }

    #[test]
    fn extract_version_fallback() {
        // 无版本号 token 时回退第一行
        assert_eq!(clean_version("SomeTool"), "SomeTool");
        // 纯数字无点号 → 回退
        assert_eq!(clean_version("Build 5 (2024)"), "Build 5 (2024)");
    }
}

#[tauri::command]
fn get_system_info() -> SystemInfo {
    let mut sys = System::new_all();
    sys.refresh_all();

    SystemInfo {
        os_name: System::name().unwrap_or_else(|| "Unknown".to_string()),
        os_version: System::os_version().unwrap_or_else(|| "Unknown".to_string()),
        hostname: System::host_name().unwrap_or_else(|| "Unknown".to_string()),
        kernel_version: System::kernel_version().unwrap_or_else(|| "Unknown".to_string()),
        cpu_cores: sys.cpus().len(),
        total_memory: sys.total_memory(),
    }
}

#[tauri::command]
fn get_language_info(db: State<'_, Database>, cache_expiry_hours: Option<u64>) -> Result<Vec<LanguageInfo>, String> {
    // 缓存有效则直接返回（cache_expiry_hours 为 None 表示永不过期）
    if let Ok(true) = db.is_languages_cache_valid(cache_expiry_hours) {
        if let Ok(languages) = db.get_languages() {
            return Ok(languages);
        }
    }

    // 数据库为空或已过期，进行检测
    let mut languages = Vec::new();

    // 编程语言：运行时/编译器
    let language_definitions = vec![
        ("JavaScript/Node.js", vec!["node", "--version"], vec!["node"],
         Some(InstallGuide {
             url: Some("https://nodejs.org/".to_string()),
             windows_cmd: Some("winget install OpenJS.NodeJS".to_string()),
             macos_cmd: Some("brew install node".to_string()),
             linux_cmd: Some("sudo apt-get install nodejs".to_string()),
             notes: Some("推荐使用 LTS 版本".to_string()),
         }),
         Some("卸载 Node.js：\n- Windows: winget uninstall OpenJS.NodeJS\n- macOS: brew uninstall node\n- Linux: sudo apt-get remove nodejs".to_string())),
        ("Python", vec!["python", "--version"], vec!["python", "python3"],
         Some(InstallGuide {
             url: Some("https://www.python.org/".to_string()),
             windows_cmd: Some("winget install Python.Python.3".to_string()),
             macos_cmd: Some("brew install python".to_string()),
             linux_cmd: Some("sudo apt-get install python3".to_string()),
             notes: Some("安装时请勾选 'Add Python to PATH'".to_string()),
         }),
         Some("卸载 Python：\n- Windows: winget uninstall Python.Python.3\n- macOS: brew uninstall python\n- Linux: sudo apt-get remove python3".to_string())),
        ("Java", vec!["java", "-version"], vec!["java"],
         Some(InstallGuide {
             url: Some("https://adoptium.net/".to_string()),
             windows_cmd: Some("winget install EclipseAdoptium.Temurin.21.JDK".to_string()),
             macos_cmd: Some("brew install openjdk".to_string()),
             linux_cmd: Some("sudo apt-get install openjdk-21-jdk".to_string()),
             notes: Some("推荐使用 Eclipse Temurin (OpenJDK)".to_string()),
         }),
         Some("卸载 Java：\n- Windows: winget uninstall EclipseAdoptium.Temurin.21.JDK\n- macOS: brew uninstall openjdk\n- Linux: sudo apt-get remove openjdk-21-jdk".to_string())),
        ("Go", vec!["go", "version"], vec!["go"],
         Some(InstallGuide {
             url: Some("https://go.dev/dl/".to_string()),
             windows_cmd: Some("winget install GoLang.Go".to_string()),
             macos_cmd: Some("brew install go".to_string()),
             linux_cmd: Some("sudo apt-get install golang".to_string()),
             notes: None,
         }),
         Some("卸载 Go：\n- Windows: winget uninstall GoLang.Go\n- macOS: brew uninstall go\n- Linux: sudo apt-get remove golang".to_string())),
        ("Rust", vec!["rustc", "--version"], vec!["rustc"],
         Some(InstallGuide {
             url: Some("https://www.rust-lang.org/tools/install".to_string()),
             windows_cmd: Some("winget install Rustlang.Rustup".to_string()),
             macos_cmd: Some("curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh".to_string()),
             linux_cmd: Some("curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh".to_string()),
             notes: Some("推荐使用 rustup 安装".to_string()),
         }),
         Some("卸载 Rust：\n- 使用 rustup self uninstall".to_string())),
        ("C#/.NET", vec!["dotnet", "--version"], vec!["dotnet"],
         Some(InstallGuide {
             url: Some("https://dotnet.microsoft.com/download".to_string()),
             windows_cmd: Some("winget install Microsoft.DotNet.SDK.8".to_string()),
             macos_cmd: Some("brew install dotnet-sdk".to_string()),
             linux_cmd: Some("sudo apt-get install dotnet-sdk-8.0".to_string()),
             notes: None,
         }),
         Some("卸载 .NET：\n- Windows: winget uninstall Microsoft.DotNet.SDK.8\n- macOS: brew uninstall dotnet-sdk\n- Linux: sudo apt-get remove dotnet-sdk-8.0".to_string())),
        ("Ruby", vec!["ruby", "--version"], vec!["ruby"],
         Some(InstallGuide {
             url: Some("https://www.ruby-lang.org/en/downloads/".to_string()),
             windows_cmd: Some("winget install RubyInstallerTeam.Ruby".to_string()),
             macos_cmd: Some("brew install ruby".to_string()),
             linux_cmd: Some("sudo apt-get install ruby".to_string()),
             notes: Some("Windows 推荐使用 RubyInstaller".to_string()),
         }),
         Some("卸载 Ruby：\n- Windows: winget uninstall RubyInstallerTeam.Ruby\n- macOS: brew uninstall ruby\n- Linux: sudo apt-get remove ruby".to_string())),
        ("PHP", vec!["php", "--version"], vec!["php"],
         Some(InstallGuide {
             url: Some("https://www.php.net/downloads".to_string()),
             windows_cmd: Some("winget install PHP.PHP".to_string()),
             macos_cmd: Some("brew install php".to_string()),
             linux_cmd: Some("sudo apt-get install php".to_string()),
             notes: None,
         }),
         Some("卸载 PHP：\n- Windows: winget uninstall PHP.PHP\n- macOS: brew uninstall php\n- Linux: sudo apt-get remove php".to_string())),
        ("Perl", vec!["perl", "--version"], vec!["perl"],
         Some(InstallGuide {
             url: Some("https://www.perl.org/get.html".to_string()),
             windows_cmd: Some("winget install StrawberryPerl.StrawberryPerl".to_string()),
             macos_cmd: Some("brew install perl".to_string()),
             linux_cmd: Some("sudo apt-get install perl".to_string()),
             notes: Some("Windows 推荐使用 Strawberry Perl".to_string()),
         }),
         Some("卸载 Perl：\n- Windows: winget uninstall StrawberryPerl.StrawberryPerl\n- macOS: brew uninstall perl\n- Linux: sudo apt-get remove perl".to_string())),
        ("Swift", vec!["swift", "--version"], vec!["swift"],
         Some(InstallGuide {
             url: Some("https://www.swift.org/download/".to_string()),
             windows_cmd: None,
             macos_cmd: Some("xcode-select --install".to_string()),
             linux_cmd: Some("参考 https://www.swift.org/install-linux/".to_string()),
             notes: Some("Windows 暂不支持 Swift".to_string()),
         }),
         Some("卸载 Swift：\n- macOS: 通过 Xcode 卸载\n- Linux: 删除安装目录".to_string())),
        ("Kotlin", vec!["kotlin", "-version"], vec!["kotlin"],
         Some(InstallGuide {
             url: Some("https://kotlinlang.org/docs/command-line.html".to_string()),
             windows_cmd: Some("winget install JetBrains.Kotlin.Compiler".to_string()),
             macos_cmd: Some("brew install kotlin".to_string()),
             linux_cmd: Some("sudo snap install kotlin --classic".to_string()),
             notes: Some("推荐通过 SDKMAN 安装".to_string()),
         }),
         Some("卸载 Kotlin：\n- Windows: winget uninstall JetBrains.Kotlin.Compiler\n- macOS: brew uninstall kotlin\n- Linux: sudo snap remove kotlin".to_string())),
        ("Scala", vec!["scala", "-version"], vec!["scala"],
         Some(InstallGuide {
             url: Some("https://www.scala-lang.org/download/".to_string()),
             windows_cmd: Some("winget install ScalaLang.Scala".to_string()),
             macos_cmd: Some("brew install scala".to_string()),
             linux_cmd: Some("sudo apt-get install scala".to_string()),
             notes: Some("推荐使用 sbt 构建工具".to_string()),
         }),
         Some("卸载 Scala：\n- Windows: winget uninstall ScalaLang.Scala\n- macOS: brew uninstall scala\n- Linux: sudo apt-get remove scala".to_string())),
        ("Elixir", vec!["elixir", "--version"], vec!["elixir"],
         Some(InstallGuide {
             url: Some("https://elixir-lang.org/install.html".to_string()),
             windows_cmd: Some("winget install Elixir.Elixir".to_string()),
             macos_cmd: Some("brew install elixir".to_string()),
             linux_cmd: Some("sudo apt-get install elixir".to_string()),
             notes: Some("需要先安装 Erlang".to_string()),
         }),
         Some("卸载 Elixir：\n- Windows: winget uninstall Elixir.Elixir\n- macOS: brew uninstall elixir\n- Linux: sudo apt-get remove elixir".to_string())),
        ("Clojure", vec!["clojure", "--version"], vec!["clojure"],
         Some(InstallGuide {
             url: Some("https://clojure.org/guides/install_clojure".to_string()),
             windows_cmd: Some("winget install Clojure.Clojure".to_string()),
             macos_cmd: Some("brew install clojure".to_string()),
             linux_cmd: Some("参考官方安装指南".to_string()),
             notes: Some("需要先安装 Java".to_string()),
         }),
         Some("卸载 Clojure：\n- Windows: winget uninstall Clojure.Clojure\n- macOS: brew uninstall clojure\n- Linux: 删除安装脚本".to_string())),
        ("Haskell", vec!["ghc", "--version"], vec!["ghc"],
         Some(InstallGuide {
             url: Some("https://www.haskell.org/ghcup/".to_string()),
             windows_cmd: Some("winget install Haskell.GHC".to_string()),
             macos_cmd: Some("brew install ghc cabal-install".to_string()),
             linux_cmd: Some("curl --proto '=https' --tlsv1.2 -sSf https://get-ghcup.haskell.org | sh".to_string()),
             notes: Some("推荐使用 GHCup 安装".to_string()),
         }),
         Some("卸载 Haskell：\n- 使用 ghcup uninstall".to_string())),
        ("Julia", vec!["julia", "--version"], vec!["julia"],
         Some(InstallGuide {
             url: Some("https://julialang.org/downloads/".to_string()),
             windows_cmd: Some("winget install JuliaLang.Julia".to_string()),
             macos_cmd: Some("brew install julia".to_string()),
             linux_cmd: Some("sudo apt-get install julia".to_string()),
             notes: None,
         }),
         Some("卸载 Julia：\n- Windows: winget uninstall JuliaLang.Julia\n- macOS: brew uninstall julia\n- Linux: sudo apt-get remove julia".to_string())),
        ("Lua", vec!["lua", "-v"], vec!["lua"],
         Some(InstallGuide {
             url: Some("https://www.lua.org/download.html".to_string()),
             windows_cmd: Some("winget install Lua.Lua".to_string()),
             macos_cmd: Some("brew install lua".to_string()),
             linux_cmd: Some("sudo apt-get install lua5.4".to_string()),
             notes: None,
         }),
         Some("卸载 Lua：\n- Windows: winget uninstall Lua.Lua\n- macOS: brew uninstall lua\n- Linux: sudo apt-get remove lua5.4".to_string())),
        ("R", vec!["R", "--version"], vec!["R"],
         Some(InstallGuide {
             url: Some("https://cran.r-project.org/bin/windows/base/".to_string()),
             windows_cmd: Some("winget install RProject.R".to_string()),
             macos_cmd: Some("brew install r".to_string()),
             linux_cmd: Some("sudo apt-get install r-base".to_string()),
             notes: Some("Windows 推荐使用 RStudio".to_string()),
         }),
         Some("卸载 R：\n- Windows: winget uninstall RProject.R\n- macOS: brew uninstall r\n- Linux: sudo apt-get remove r-base".to_string())),
        ("TypeScript", vec!["tsc", "--version"], vec!["tsc"],
         Some(InstallGuide {
             url: Some("https://www.typescriptlang.org/download".to_string()),
             windows_cmd: Some("npm install -g typescript".to_string()),
             macos_cmd: Some("npm install -g typescript".to_string()),
             linux_cmd: Some("npm install -g typescript".to_string()),
             notes: Some("需要先安装 Node.js".to_string()),
         }),
         Some("卸载 TypeScript：\n- npm uninstall -g typescript".to_string())),
    ];

    for (name, version_args, executables, install_guide, uninstall_guide) in language_definitions {
        let (installed, version, path) = detect_version(&executables, &version_args);
        let lang = LanguageInfo {
            name: name.to_string(),
            version,
            path,
            installed,
            install_guide,
            uninstall_guide,
        };

        // 保存到数据库
        let _ = db.upsert_language(&lang);

        languages.push(lang);
    }

    languages.sort_by(|a, b| b.installed.cmp(&a.installed));
    Ok(languages)
}

#[tauri::command]
fn get_tool_info(db: State<'_, Database>, cache_expiry_hours: Option<u64>) -> Result<Vec<ToolInfo>, String> {
    // 缓存有效则直接返回（cache_expiry_hours 为 None 表示永不过期）
    if let Ok(true) = db.is_tools_cache_valid(cache_expiry_hours) {
        if let Ok(tools) = db.get_tools() {
            return Ok(tools);
        }
    }

    // 数据库为空或已过期，进行检测
    let mut tools = Vec::new();

    // 开发工具：编辑器、构建工具、包管理器、数据库等（不含编程语言）
    let tool_definitions = vec![
        // 版本控制
        ("Git", vec!["git", "--version"], vec!["git"],
         Some(InstallGuide {
             url: Some("https://git-scm.com/downloads".to_string()),
             windows_cmd: Some("winget install Git.Git".to_string()),
             macos_cmd: Some("brew install git".to_string()),
             linux_cmd: Some("sudo apt-get install git".to_string()),
             notes: None,
         }),
         Some("卸载 Git：\n- Windows: winget uninstall Git.Git\n- macOS: brew uninstall git\n- Linux: sudo apt-get remove git".to_string())),
        ("GitHub CLI", vec!["gh", "--version"], vec!["gh"],
         Some(InstallGuide {
             url: Some("https://cli.github.com/".to_string()),
             windows_cmd: Some("winget install GitHub.cli".to_string()),
             macos_cmd: Some("brew install gh".to_string()),
             linux_cmd: Some("sudo apt-get install gh".to_string()),
             notes: None,
         }),
         Some("卸载 GitHub CLI：\n- Windows: winget uninstall GitHub.cli\n- macOS: brew uninstall gh\n- Linux: sudo apt-get remove gh".to_string())),
        // 容器化
        ("Docker", vec!["docker", "--version"], vec!["docker"],
         Some(InstallGuide {
             url: Some("https://www.docker.com/products/docker-desktop/".to_string()),
             windows_cmd: Some("winget install Docker.DockerDesktop".to_string()),
             macos_cmd: Some("brew install --cask docker".to_string()),
             linux_cmd: Some("sudo apt-get install docker.io".to_string()),
             notes: Some("Windows 和 macOS 推荐使用 Docker Desktop".to_string()),
         }),
         Some("卸载 Docker：\n- Windows: winget uninstall Docker.DockerDesktop\n- macOS: brew uninstall --cask docker\n- Linux: sudo apt-get remove docker.io".to_string())),
        ("Docker Compose", vec!["docker-compose", "--version"], vec!["docker-compose"],
         Some(InstallGuide {
             url: Some("https://docs.docker.com/compose/install/".to_string()),
             windows_cmd: Some("已包含在 Docker Desktop 中".to_string()),
             macos_cmd: Some("已包含在 Docker Desktop 中".to_string()),
             linux_cmd: Some("sudo apt-get install docker-compose".to_string()),
             notes: Some("Docker Desktop 已内置 Docker Compose".to_string()),
         }),
         Some("Docker Compose 随 Docker 一起卸载".to_string())),
        // 包管理器
        ("npm", vec!["npm", "--version"], vec!["npm"],
         Some(InstallGuide {
             url: Some("https://nodejs.org/".to_string()),
             windows_cmd: Some("已包含在 Node.js 中".to_string()),
             macos_cmd: Some("已包含在 Node.js 中".to_string()),
             linux_cmd: Some("已包含在 Node.js 中".to_string()),
             notes: Some("npm 随 Node.js 一起安装".to_string()),
         }),
         Some("npm 随 Node.js 一起卸载".to_string())),
        ("yarn", vec!["yarn", "--version"], vec!["yarn"],
         Some(InstallGuide {
             url: Some("https://yarnpkg.com/getting-started/install".to_string()),
             windows_cmd: Some("npm install -g yarn".to_string()),
             macos_cmd: Some("brew install yarn".to_string()),
             linux_cmd: Some("npm install -g yarn".to_string()),
             notes: Some("需要先安装 Node.js".to_string()),
         }),
         Some("卸载 yarn：\n- npm uninstall -g yarn\n- 或 brew uninstall yarn".to_string())),
        ("pnpm", vec!["pnpm", "--version"], vec!["pnpm"],
         Some(InstallGuide {
             url: Some("https://pnpm.io/installation".to_string()),
             windows_cmd: Some("npm install -g pnpm".to_string()),
             macos_cmd: Some("brew install pnpm".to_string()),
             linux_cmd: Some("npm install -g pnpm".to_string()),
             notes: Some("需要先安装 Node.js".to_string()),
         }),
         Some("卸载 pnpm：\n- npm uninstall -g pnpm\n- 或 brew uninstall pnpm".to_string())),
        ("pip", vec!["pip", "--version"], vec!["pip", "pip3"],
         Some(InstallGuide {
             url: Some("https://pip.pypa.io/en/stable/installation/".to_string()),
             windows_cmd: Some("已包含在 Python 中".to_string()),
             macos_cmd: Some("已包含在 Python 中".to_string()),
             linux_cmd: Some("sudo apt-get install python3-pip".to_string()),
             notes: Some("pip 随 Python 一起安装".to_string()),
         }),
         Some("pip 随 Python 一起卸载".to_string())),
        ("cargo", vec!["cargo", "--version"], vec!["cargo"],
         Some(InstallGuide {
             url: Some("https://www.rust-lang.org/tools/install".to_string()),
             windows_cmd: Some("已包含在 Rust 中".to_string()),
             macos_cmd: Some("已包含在 Rust 中".to_string()),
             linux_cmd: Some("已包含在 Rust 中".to_string()),
             notes: Some("cargo 随 Rust 一起安装".to_string()),
         }),
         Some("cargo 随 Rust 一起卸载".to_string())),
        // 编辑器/IDE
        ("VS Code", vec!["code", "--version"], vec!["code"],
         Some(InstallGuide {
             url: Some("https://code.visualstudio.com/download".to_string()),
             windows_cmd: Some("winget install Microsoft.VisualStudioCode".to_string()),
             macos_cmd: Some("brew install --cask visual-studio-code".to_string()),
             linux_cmd: Some("sudo snap install code --classic".to_string()),
             notes: None,
         }),
         Some("卸载 VS Code：\n- Windows: winget uninstall Microsoft.VisualStudioCode\n- macOS: brew uninstall --cask visual-studio-code\n- Linux: sudo snap remove code".to_string())),
        ("Vim", vec!["vim", "--version"], vec!["vim"],
         Some(InstallGuide {
             url: Some("https://www.vim.org/download.php".to_string()),
             windows_cmd: Some("winget install Vim.Vim".to_string()),
             macos_cmd: Some("brew install vim".to_string()),
             linux_cmd: Some("sudo apt-get install vim".to_string()),
             notes: None,
         }),
         Some("卸载 Vim：\n- Windows: winget uninstall Vim.Vim\n- macOS: brew uninstall vim\n- Linux: sudo apt-get remove vim".to_string())),
        ("Neovim", vec!["nvim", "--version"], vec!["nvim"],
         Some(InstallGuide {
             url: Some("https://neovim.io/download/".to_string()),
             windows_cmd: Some("winget install Neovim.Neovim".to_string()),
             macos_cmd: Some("brew install neovim".to_string()),
             linux_cmd: Some("sudo apt-get install neovim".to_string()),
             notes: None,
         }),
         Some("卸载 Neovim：\n- Windows: winget uninstall Neovim.Neovim\n- macOS: brew uninstall neovim\n- Linux: sudo apt-get remove neovim".to_string())),
        ("Emacs", vec!["emacs", "--version"], vec!["emacs"],
         Some(InstallGuide {
             url: Some("https://www.gnu.org/software/emacs/download.html".to_string()),
             windows_cmd: Some("winget install GNU.Emacs".to_string()),
             macos_cmd: Some("brew install emacs".to_string()),
             linux_cmd: Some("sudo apt-get install emacs".to_string()),
             notes: None,
         }),
         Some("卸载 Emacs：\n- Windows: winget uninstall GNU.Emacs\n- macOS: brew uninstall emacs\n- Linux: sudo apt-get remove emacs".to_string())),
        ("Sublime Text", vec!["subl", "--version"], vec!["subl"],
         Some(InstallGuide {
             url: Some("https://www.sublimetext.com/download".to_string()),
             windows_cmd: Some("winget install SublimeHQ.SublimeText.4".to_string()),
             macos_cmd: Some("brew install --cask sublime-text".to_string()),
             linux_cmd: Some("sudo snap install sublime-text".to_string()),
             notes: None,
         }),
         Some("卸载 Sublime Text：\n- Windows: winget uninstall SublimeHQ.SublimeText.4\n- macOS: brew uninstall --cask sublime-text\n- Linux: sudo snap remove sublime-text".to_string())),
        ("IntelliJ IDEA", vec!["idea", "--version"], vec!["idea"],
         Some(InstallGuide {
             url: Some("https://www.jetbrains.com/idea/download/".to_string()),
             windows_cmd: Some("winget install JetBrains.IntelliJIDEA.Community".to_string()),
             macos_cmd: Some("brew install --cask intellij-idea-ce".to_string()),
             linux_cmd: Some("sudo snap install intellij-idea-community --classic".to_string()),
             notes: Some("有 Community（免费）和 Ultimate（付费）版本".to_string()),
         }),
         Some("卸载 IntelliJ IDEA：\n- Windows: winget uninstall JetBrains.IntelliJIDEA.Community\n- macOS: brew uninstall --cask intellij-idea-ce\n- Linux: sudo snap remove intellij-idea-community".to_string())),
        ("Android Studio", vec!["studio", "--version"], vec!["studio"],
         Some(InstallGuide {
             url: Some("https://developer.android.com/studio".to_string()),
             windows_cmd: Some("winget install Google.AndroidStudio".to_string()),
             macos_cmd: Some("brew install --cask android-studio".to_string()),
             linux_cmd: Some("sudo snap install android-studio --classic".to_string()),
             notes: None,
         }),
         Some("卸载 Android Studio：\n- Windows: winget uninstall Google.AndroidStudio\n- macOS: brew uninstall --cask android-studio\n- Linux: sudo snap remove android-studio".to_string())),
        // 构建工具
        ("CMake", vec!["cmake", "--version"], vec!["cmake"],
         Some(InstallGuide {
             url: Some("https://cmake.org/download/".to_string()),
             windows_cmd: Some("winget install Kitware.CMake".to_string()),
             macos_cmd: Some("brew install cmake".to_string()),
             linux_cmd: Some("sudo apt-get install cmake".to_string()),
             notes: None,
         }),
         Some("卸载 CMake：\n- Windows: winget uninstall Kitware.CMake\n- macOS: brew uninstall cmake\n- Linux: sudo apt-get remove cmake".to_string())),
        ("Make", vec!["make", "--version"], vec!["make"],
         Some(InstallGuide {
             url: Some("https://www.gnu.org/software/make/".to_string()),
             windows_cmd: Some("winget install GnuWin32.Make".to_string()),
             macos_cmd: Some("xcode-select --install".to_string()),
             linux_cmd: Some("sudo apt-get install make".to_string()),
             notes: Some("macOS 通过 Xcode Command Line Tools 安装".to_string()),
         }),
         Some("卸载 Make：\n- Windows: winget uninstall GnuWin32.Make\n- Linux: sudo apt-get remove make".to_string())),
        ("Gradle", vec!["gradle", "--version"], vec!["gradle"],
         Some(InstallGuide {
             url: Some("https://gradle.org/install/".to_string()),
             windows_cmd: Some("winget install Gradle.Gradle".to_string()),
             macos_cmd: Some("brew install gradle".to_string()),
             linux_cmd: Some("sudo apt-get install gradle".to_string()),
             notes: Some("推荐使用 SDKMAN 安装".to_string()),
         }),
         Some("卸载 Gradle：\n- Windows: winget uninstall Gradle.Gradle\n- macOS: brew uninstall gradle\n- Linux: sudo apt-get remove gradle".to_string())),
        ("Maven", vec!["mvn", "--version"], vec!["mvn"],
         Some(InstallGuide {
             url: Some("https://maven.apache.org/download.cgi".to_string()),
             windows_cmd: Some("winget install Apache.Maven".to_string()),
             macos_cmd: Some("brew install maven".to_string()),
             linux_cmd: Some("sudo apt-get install maven".to_string()),
             notes: None,
         }),
         Some("卸载 Maven：\n- Windows: winget uninstall Apache.Maven\n- macOS: brew uninstall maven\n- Linux: sudo apt-get remove maven".to_string())),
        // 服务器
        ("Nginx", vec!["nginx", "-v"], vec!["nginx"],
         Some(InstallGuide {
             url: Some("https://nginx.org/en/download.html".to_string()),
             windows_cmd: Some("winget install Nginx.Nginx".to_string()),
             macos_cmd: Some("brew install nginx".to_string()),
             linux_cmd: Some("sudo apt-get install nginx".to_string()),
             notes: None,
         }),
         Some("卸载 Nginx：\n- Windows: winget uninstall Nginx.Nginx\n- macOS: brew uninstall nginx\n- Linux: sudo apt-get remove nginx".to_string())),
        ("Apache", vec!["httpd", "-v"], vec!["httpd", "apache2"],
         Some(InstallGuide {
             url: Some("https://httpd.apache.org/download.cgi".to_string()),
             windows_cmd: Some("winget install Apache.Httpd".to_string()),
             macos_cmd: Some("brew install httpd".to_string()),
             linux_cmd: Some("sudo apt-get install apache2".to_string()),
             notes: None,
         }),
         Some("卸载 Apache：\n- Windows: winget uninstall Apache.Httpd\n- macOS: brew uninstall httpd\n- Linux: sudo apt-get remove apache2".to_string())),
        // 数据库
        ("MySQL", vec!["mysql", "--version"], vec!["mysql"],
         Some(InstallGuide {
             url: Some("https://dev.mysql.com/downloads/mysql/".to_string()),
             windows_cmd: Some("winget install Oracle.MySQL".to_string()),
             macos_cmd: Some("brew install mysql".to_string()),
             linux_cmd: Some("sudo apt-get install mysql-server".to_string()),
             notes: None,
         }),
         Some("卸载 MySQL：\n- Windows: winget uninstall Oracle.MySQL\n- macOS: brew uninstall mysql\n- Linux: sudo apt-get remove mysql-server".to_string())),
        ("PostgreSQL", vec!["psql", "--version"], vec!["psql"],
         Some(InstallGuide {
             url: Some("https://www.postgresql.org/download/".to_string()),
             windows_cmd: Some("winget install PostgreSQL.PostgreSQL".to_string()),
             macos_cmd: Some("brew install postgresql".to_string()),
             linux_cmd: Some("sudo apt-get install postgresql".to_string()),
             notes: None,
         }),
         Some("卸载 PostgreSQL：\n- Windows: winget uninstall PostgreSQL.PostgreSQL\n- macOS: brew uninstall postgresql\n- Linux: sudo apt-get remove postgresql".to_string())),
        ("Redis", vec!["redis-cli", "--version"], vec!["redis-cli"],
         Some(InstallGuide {
             url: Some("https://redis.io/download".to_string()),
             windows_cmd: Some("winget install Redis.Redis".to_string()),
             macos_cmd: Some("brew install redis".to_string()),
             linux_cmd: Some("sudo apt-get install redis-server".to_string()),
             notes: None,
         }),
         Some("卸载 Redis：\n- Windows: winget uninstall Redis.Redis\n- macOS: brew uninstall redis\n- Linux: sudo apt-get remove redis-server".to_string())),
        ("MongoDB", vec!["mongod", "--version"], vec!["mongod"],
         Some(InstallGuide {
             url: Some("https://www.mongodb.com/try/download/community".to_string()),
             windows_cmd: Some("winget install MongoDB.Server".to_string()),
             macos_cmd: Some("brew tap mongodb/brew && brew install mongodb-community".to_string()),
             linux_cmd: Some("sudo apt-get install mongosh".to_string()),
             notes: None,
         }),
         Some("卸载 MongoDB：\n- Windows: winget uninstall MongoDB.Server\n- macOS: brew uninstall mongodb-community\n- Linux: sudo apt-get remove mongosh".to_string())),
        ("SQLite", vec!["sqlite3", "--version"], vec!["sqlite3"],
         Some(InstallGuide {
             url: Some("https://www.sqlite.org/download.html".to_string()),
             windows_cmd: Some("winget install SQLite.SQLite".to_string()),
             macos_cmd: Some("已包含在 macOS 中".to_string()),
             linux_cmd: Some("sudo apt-get install sqlite3".to_string()),
             notes: Some("macOS 通常已预装 SQLite".to_string()),
         }),
         Some("卸载 SQLite：\n- Windows: winget uninstall SQLite.SQLite\n- Linux: sudo apt-get remove sqlite3".to_string())),
        // API 工具
        ("Postman", vec!["postman", "--version"], vec!["postman"],
         Some(InstallGuide {
             url: Some("https://www.postman.com/downloads/".to_string()),
             windows_cmd: Some("winget install Postman.Postman".to_string()),
             macos_cmd: Some("brew install --cask postman".to_string()),
             linux_cmd: Some("sudo snap install postman".to_string()),
             notes: None,
         }),
         Some("卸载 Postman：\n- Windows: winget uninstall Postman.Postman\n- macOS: brew uninstall --cask postman\n- Linux: sudo snap remove postman".to_string())),
        ("curl", vec!["curl", "--version"], vec!["curl"],
         Some(InstallGuide {
             url: Some("https://curl.se/download.html".to_string()),
             windows_cmd: Some("已包含在 Windows 中".to_string()),
             macos_cmd: Some("已包含在 macOS 中".to_string()),
             linux_cmd: Some("sudo apt-get install curl".to_string()),
             notes: Some("Windows 10+ 和 macOS 通常已预装 curl".to_string()),
         }),
         Some("curl 通常随系统一起卸载".to_string())),
        ("wget", vec!["wget", "--version"], vec!["wget"],
         Some(InstallGuide {
             url: Some("https://www.gnu.org/software/wget/".to_string()),
             windows_cmd: Some("winget install GnuWin32.Wget".to_string()),
             macos_cmd: Some("brew install wget".to_string()),
             linux_cmd: Some("sudo apt-get install wget".to_string()),
             notes: None,
         }),
         Some("卸载 wget：\n- Windows: winget uninstall GnuWin32.Wget\n- macOS: brew uninstall wget\n- Linux: sudo apt-get remove wget".to_string())),
        // 云/DevOps 工具
        ("Terraform", vec!["terraform", "--version"], vec!["terraform"],
         Some(InstallGuide {
             url: Some("https://www.terraform.io/downloads".to_string()),
             windows_cmd: Some("winget install HashiCorp.Terraform".to_string()),
             macos_cmd: Some("brew install terraform".to_string()),
             linux_cmd: Some("sudo apt-get install terraform".to_string()),
             notes: None,
         }),
         Some("卸载 Terraform：\n- Windows: winget uninstall HashiCorp.Terraform\n- macOS: brew uninstall terraform\n- Linux: sudo apt-get remove terraform".to_string())),
        ("Ansible", vec!["ansible", "--version"], vec!["ansible"],
         Some(InstallGuide {
             url: Some("https://docs.ansible.com/ansible/latest/installation_guide/installation_distros.html".to_string()),
             windows_cmd: Some("pip install ansible".to_string()),
             macos_cmd: Some("brew install ansible".to_string()),
             linux_cmd: Some("sudo apt-get install ansible".to_string()),
             notes: None,
         }),
         Some("卸载 Ansible：\n- Windows: pip uninstall ansible\n- macOS: brew uninstall ansible\n- Linux: sudo apt-get remove ansible".to_string())),
        ("Kubernetes", vec!["kubectl", "version"], vec!["kubectl"],
         Some(InstallGuide {
             url: Some("https://kubernetes.io/docs/tasks/tools/install-kubectl/".to_string()),
             windows_cmd: Some("winget install Kubernetes.kubectl".to_string()),
             macos_cmd: Some("brew install kubectl".to_string()),
             linux_cmd: Some("sudo apt-get install kubectl".to_string()),
             notes: None,
         }),
         Some("卸载 kubectl：\n- Windows: winget uninstall Kubernetes.kubectl\n- macOS: brew uninstall kubectl\n- Linux: sudo apt-get remove kubectl".to_string())),
        ("Helm", vec!["helm", "version"], vec!["helm"],
         Some(InstallGuide {
             url: Some("https://helm.sh/docs/intro/install/".to_string()),
             windows_cmd: Some("winget install Helm.Helm".to_string()),
             macos_cmd: Some("brew install helm".to_string()),
             linux_cmd: Some("curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash".to_string()),
             notes: None,
         }),
         Some("卸载 Helm：\n- Windows: winget uninstall Helm.Helm\n- macOS: brew uninstall helm\n- Linux: 删除 /usr/local/bin/helm".to_string())),
        ("AWS CLI", vec!["aws", "--version"], vec!["aws"],
         Some(InstallGuide {
             url: Some("https://aws.amazon.com/cli/".to_string()),
             windows_cmd: Some("winget install Amazon.AWSCLI".to_string()),
             macos_cmd: Some("brew install awscli".to_string()),
             linux_cmd: Some("sudo apt-get install awscli".to_string()),
             notes: None,
         }),
         Some("卸载 AWS CLI：\n- Windows: winget uninstall Amazon.AWSCLI\n- macOS: brew uninstall awscli\n- Linux: sudo apt-get remove awscli".to_string())),
        ("Azure CLI", vec!["az", "--version"], vec!["az"],
         Some(InstallGuide {
             url: Some("https://docs.microsoft.com/en-us/cli/azure/install-azure-cli".to_string()),
             windows_cmd: Some("winget install Microsoft.AzureCLI".to_string()),
             macos_cmd: Some("brew install azure-cli".to_string()),
             linux_cmd: Some("sudo apt-get install azure-cli".to_string()),
             notes: None,
         }),
         Some("卸载 Azure CLI：\n- Windows: winget uninstall Microsoft.AzureCLI\n- macOS: brew uninstall azure-cli\n- Linux: sudo apt-get remove azure-cli".to_string())),
        ("Google Cloud SDK", vec!["gcloud", "--version"], vec!["gcloud"],
         Some(InstallGuide {
             url: Some("https://cloud.google.com/sdk/docs/install".to_string()),
             windows_cmd: Some("winget install Google.CloudSDK".to_string()),
             macos_cmd: Some("brew install --cask google-cloud-sdk".to_string()),
             linux_cmd: Some("参考官方安装指南".to_string()),
             notes: None,
         }),
         Some("卸载 Google Cloud SDK：\n- Windows: winget uninstall Google.CloudSDK\n- macOS: brew uninstall --cask google-cloud-sdk\n- Linux: 删除安装目录".to_string())),
        // 虚拟化
        ("Vagrant", vec!["vagrant", "--version"], vec!["vagrant"],
         Some(InstallGuide {
             url: Some("https://www.vagrantup.com/downloads".to_string()),
             windows_cmd: Some("winget install HashiCorp.Vagrant".to_string()),
             macos_cmd: Some("brew install --cask vagrant".to_string()),
             linux_cmd: Some("sudo apt-get install vagrant".to_string()),
             notes: None,
         }),
         Some("卸载 Vagrant：\n- Windows: winget uninstall HashiCorp.Vagrant\n- macOS: brew uninstall --cask vagrant\n- Linux: sudo apt-get remove vagrant".to_string())),
        ("VirtualBox", vec!["VBoxManage", "--version"], vec!["VBoxManage"],
         Some(InstallGuide {
             url: Some("https://www.virtualbox.org/wiki/Downloads".to_string()),
             windows_cmd: Some("winget install Oracle.VirtualBox".to_string()),
             macos_cmd: Some("brew install --cask virtualbox".to_string()),
             linux_cmd: Some("sudo apt-get install virtualbox".to_string()),
             notes: None,
         }),
         Some("卸载 VirtualBox：\n- Windows: winget uninstall Oracle.VirtualBox\n- macOS: brew uninstall --cask virtualbox\n- Linux: sudo apt-get remove virtualbox".to_string())),
    ];

    for (name, version_args, executables, install_guide, uninstall_guide) in tool_definitions {
        let (installed, version, path) = detect_version(&executables, &version_args);
        let tool = ToolInfo {
            name: name.to_string(),
            version,
            path,
            installed,
            install_guide,
            uninstall_guide,
        };

        // 保存到数据库
        let _ = db.upsert_tool(&tool);

        tools.push(tool);
    }

    tools.sort_by(|a, b| b.installed.cmp(&a.installed));
    Ok(tools)
}

#[tauri::command]
fn get_network_info() -> NetworkInfo {
    let mut interfaces = Vec::new();
    let mut local_ip = None;

    #[cfg(target_os = "windows")]
    {
        // 虚拟网卡 / 非物理接口关键字（其 IP 不作为本机地址展示）
        const VIRTUAL_KEYWORDS: &[&str] = &[
            "VirtualBox", "VMware", "vEthernet", "Docker", "WSL", "Hyper-V",
            "Hamachi", "TAP", "TUN", "Loopback", "Bluetooth", "Tailscale", "ZeroTier",
        ];

        if let Ok(output) = create_command("ipconfig").output() {
            let output_str = String::from_utf8_lossy(&output.stdout);
            let mut current_adapter: Option<String> = None;
            for line in output_str.lines() {
                let is_adapter_line = line.contains("适配器") || line.contains("Adapter");
                let is_virtual = current_adapter.as_ref().map_or(false, |name| {
                    VIRTUAL_KEYWORDS.iter().any(|k| name.contains(k))
                });
                if is_adapter_line {
                    current_adapter = line.split(':').next().map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
                    let is_virtual = current_adapter.as_ref().map_or(false, |name| {
                        VIRTUAL_KEYWORDS.iter().any(|k| name.contains(k))
                    });
                    if !is_virtual {
                        if let Some(name) = &current_adapter {
                            interfaces.push(name.clone());
                        }
                    }
                }
                if line.contains("IPv4") && !is_virtual {
                    if let Some(ip) = line.split(':').nth(1) {
                        let ip = ip.trim().to_string();
                        // 取第一个非虚拟、非环回、非链路本地（169.254.*）的 IPv4
                        if !ip.is_empty() && !ip.starts_with("127.") && !ip.starts_with("169.254.") {
                            if local_ip.is_none() {
                                local_ip = Some(ip);
                            }
                        }
                    }
                }
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        if let Ok(output) = create_command("ip").arg("addr").arg("show").output() {
            let output_str = String::from_utf8_lossy(&output.stdout);
            for line in output_str.lines() {
                if line.starts_with("inet ") && !line.contains("127.0.0.1") {
                    if let Some(ip) = line.split_whitespace().nth(1) {
                        if let Some(ip) = ip.split('/').next() {
                            local_ip = Some(ip.to_string());
                        }
                    }
                }
            }
        }

        if let Ok(output) = create_command("ifconfig").output() {
            let output_str = String::from_utf8_lossy(&output.stdout);
            let mut current_interface = String::new();
            for line in output_str.lines() {
                if !line.starts_with(' ') && !line.is_empty() {
                    current_interface = line.split(':').next().unwrap_or("").to_string();
                    if !current_interface.is_empty() && !current_interface.contains("lo") {
                        interfaces.push(current_interface.clone());
                    }
                }
            }
        }
    }

    NetworkInfo {
        interfaces,
        local_ip,
    }
}

#[tauri::command]
fn refresh_detection(db: State<'_, Database>) -> Result<(), String> {
    // 清除缓存
    db.clear_languages_cache().map_err(|e| e.to_string())?;
    db.clear_tools_cache().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
fn get_db_path() -> String {
    dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("dev-switch")
        .join("dev-switch.db")
        .to_string_lossy()
        .to_string()
}

#[tauri::command]
fn get_db_size() -> Result<u64, String> {
    let path = dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("dev-switch")
        .join("dev-switch.db");
    std::fs::metadata(&path)
        .map(|m| m.len())
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn check_for_updates() -> Result<serde_json::Value, String> {
    // 检查 GitHub releases
    let client = reqwest::Client::new();
    let response = client
        .get("https://api.github.com/repos/gaoqiong001/dev-switch/releases/latest")
        .header("User-Agent", "dev-switch")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Ok(serde_json::json!({
            "available": false,
            "message": "无法检查更新"
        }));
    }

    let release: serde_json::Value = response
        .json()
        .await
        .map_err(|e| e.to_string())?;

    let latest_version = release["tag_name"]
        .as_str()
        .unwrap_or("")
        .trim_start_matches('v')
        .to_string();

    let current_version = env!("CARGO_PKG_VERSION");

    let download_url = release["html_url"]
        .as_str()
        .unwrap_or("https://github.com/gaoqiong001/dev-switch/releases")
        .to_string();

    let notes = release["body"]
        .as_str()
        .unwrap_or("")
        .to_string();

    Ok(serde_json::json!({
        "available": latest_version != current_version,
        "version": latest_version,
        "current_version": current_version,
        "download_url": download_url,
        "notes": notes
    }))
}

#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    open::that(&url).map_err(|e| e.to_string())
}

fn main() {
    // 初始化数据库
    let db_path = dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("dev-switch")
        .join("dev-switch.db");

    // 确保目录存在
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent).ok();
    }

    let database = Database::new(db_path.to_str().unwrap_or("dev-switch.db"))
        .expect("Failed to initialize database");

    tauri::Builder::default()
        .manage(database)
        .invoke_handler(tauri::generate_handler![
            get_system_info,
            get_language_info,
            get_tool_info,
            get_network_info,
            refresh_detection,
            get_app_version,
            get_db_path,
            get_db_size,
            check_for_updates,
            open_url
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
