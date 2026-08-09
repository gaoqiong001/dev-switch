use rusqlite::{params, Connection, Result};
use std::sync::Mutex;

use crate::{LanguageInfo, ToolInfo};

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    pub fn new(path: &str) -> Result<Self> {
        let conn = Connection::open(path)?;
        let db = Database {
            conn: Mutex::new(conn),
        };
        db.init_tables()?;
        Ok(db)
    }

    fn init_tables(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        // 创建语言表
        conn.execute(
            "CREATE TABLE IF NOT EXISTS languages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                version TEXT,
                path TEXT,
                installed BOOLEAN NOT NULL DEFAULT 0,
                install_guide TEXT,
                uninstall_guide TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;

        // 创建工具表
        conn.execute(
            "CREATE TABLE IF NOT EXISTS tools (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                version TEXT,
                path TEXT,
                installed BOOLEAN NOT NULL DEFAULT 0,
                install_guide TEXT,
                uninstall_guide TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;

        // 创建设置表
        conn.execute(
            "CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;

        Ok(())
    }

    // 语言相关操作
    pub fn get_languages(&self) -> Result<Vec<LanguageInfo>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT name, version, path, installed, install_guide, uninstall_guide FROM languages ORDER BY installed DESC"
        )?;

        let languages = stmt.query_map([], |row| {
            let name: String = row.get(0)?;
            let version: Option<String> = row.get(1)?;
            let path: Option<String> = row.get(2)?;
            let installed: bool = row.get(3)?;
            let install_guide_json: Option<String> = row.get(4)?;
            let uninstall_guide: Option<String> = row.get(5)?;

            let install_guide =
                install_guide_json.and_then(|json| serde_json::from_str(&json).ok());

            Ok(LanguageInfo {
                name,
                version,
                path,
                installed,
                install_guide,
                uninstall_guide,
            })
        })?;

        languages.collect::<Result<Vec<_>>>()
    }

    pub fn upsert_language(&self, lang: &LanguageInfo) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let install_guide_json = lang
            .install_guide
            .as_ref()
            .and_then(|g| serde_json::to_string(g).ok());

        conn.execute(
            "INSERT INTO languages (name, version, path, installed, install_guide, uninstall_guide, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, CURRENT_TIMESTAMP)
             ON CONFLICT(name) DO UPDATE SET
                version = excluded.version,
                path = excluded.path,
                installed = excluded.installed,
                install_guide = excluded.install_guide,
                uninstall_guide = excluded.uninstall_guide,
                updated_at = CURRENT_TIMESTAMP",
            params![
                lang.name,
                lang.version,
                lang.path,
                lang.installed,
                install_guide_json,
                lang.uninstall_guide,
            ],
        )?;

        Ok(())
    }

    // 工具相关操作
    pub fn get_tools(&self) -> Result<Vec<ToolInfo>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT name, version, path, installed, install_guide, uninstall_guide FROM tools ORDER BY installed DESC"
        )?;

        let tools = stmt.query_map([], |row| {
            let name: String = row.get(0)?;
            let version: Option<String> = row.get(1)?;
            let path: Option<String> = row.get(2)?;
            let installed: bool = row.get(3)?;
            let install_guide_json: Option<String> = row.get(4)?;
            let uninstall_guide: Option<String> = row.get(5)?;

            let install_guide =
                install_guide_json.and_then(|json| serde_json::from_str(&json).ok());

            Ok(ToolInfo {
                name,
                version,
                path,
                installed,
                install_guide,
                uninstall_guide,
            })
        })?;

        tools.collect::<Result<Vec<_>>>()
    }

    pub fn upsert_tool(&self, tool: &ToolInfo) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let install_guide_json = tool
            .install_guide
            .as_ref()
            .and_then(|g| serde_json::to_string(g).ok());

        conn.execute(
            "INSERT INTO tools (name, version, path, installed, install_guide, uninstall_guide, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, CURRENT_TIMESTAMP)
             ON CONFLICT(name) DO UPDATE SET
                version = excluded.version,
                path = excluded.path,
                installed = excluded.installed,
                install_guide = excluded.install_guide,
                uninstall_guide = excluded.uninstall_guide,
                updated_at = CURRENT_TIMESTAMP",
            params![
                tool.name,
                tool.version,
                tool.path,
                tool.installed,
                install_guide_json,
                tool.uninstall_guide,
            ],
        )?;

        Ok(())
    }

    // 缓存有效性检查（TTL）
    /// 返回语言缓存是否仍然有效：空表视为无效（需重新检测）；
    /// `cache_expiry_hours == None` 表示永不过期。
    pub fn is_languages_cache_valid(&self, cache_expiry_hours: Option<u64>) -> Result<bool> {
        self.is_cache_valid("languages", cache_expiry_hours)
    }

    /// 返回工具缓存是否仍然有效，语义同语言缓存。
    pub fn is_tools_cache_valid(&self, cache_expiry_hours: Option<u64>) -> Result<bool> {
        self.is_cache_valid("tools", cache_expiry_hours)
    }

    fn is_cache_valid(&self, table: &str, cache_expiry_hours: Option<u64>) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let sql = format!("SELECT COUNT(*) FROM {}", table);
        let count: i64 = conn.query_row(&sql, [], |row| row.get(0))?;
        if count == 0 {
            return Ok(false);
        }
        match cache_expiry_hours {
            None => Ok(true),
            Some(hours) => {
                let stale_sql = format!(
                    "SELECT COUNT(*) FROM {} WHERE (strftime('%s','now') - strftime('%s', updated_at)) > ?1",
                    table
                );
                let stale: i64 =
                    conn.query_row(&stale_sql, params![hours as i64], |row| row.get(0))?;
                Ok(stale == 0)
            }
        }
    }

    // 设置相关操作
    #[allow(dead_code)]
    pub fn get_setting(&self, key: &str) -> Result<Option<String>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = ?1")?;

        let mut rows = stmt.query_map(params![key], |row| row.get(0))?;

        match rows.next() {
            Some(row) => Ok(Some(row?)),
            None => Ok(None),
        }
    }

    #[allow(dead_code)]
    pub fn set_setting(&self, key: &str, value: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute(
            "INSERT INTO settings (key, value, updated_at)
             VALUES (?1, ?2, CURRENT_TIMESTAMP)
             ON CONFLICT(key) DO UPDATE SET
                value = excluded.value,
                updated_at = CURRENT_TIMESTAMP",
            params![key, value],
        )?;

        Ok(())
    }

    // 清除缓存
    pub fn clear_languages_cache(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM languages", [])?;
        Ok(())
    }

    pub fn clear_tools_cache(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM tools", [])?;
        Ok(())
    }
}
