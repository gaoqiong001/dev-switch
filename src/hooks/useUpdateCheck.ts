import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

export type UpdateCheckResult =
  | { status: 'available'; info: { version: string; download_url: string; notes?: string } }
  | { status: 'up-to-date' }
  | { status: 'error'; message: string };

interface RawUpdateResult {
  available: boolean;
  version?: string;
  current_version?: string;
  download_url?: string;
  notes?: string;
  message?: string;
}

/** tauri://update-download-progress 事件负载；downloaded 为累计下载字节数，非增量 */
export interface UpdateDownloadProgress {
  downloaded: number;
  total: number | null;
}

/**
 * 订阅下载进度事件，返回退订函数。
 * downloaded 已是累计值，直接用于计算百分比。
 */
export function onDownloadProgress(
  handler: (p: UpdateDownloadProgress) => void
): Promise<UnlistenFn> {
  return listen<UpdateDownloadProgress>('tauri://update-download-progress', (e) =>
    handler(e.payload)
  );
}

/** 触发静默下载并安装（Windows 上安装时会接管并关闭当前应用进程） */
export async function installUpdate(): Promise<void> {
  await invoke('install_update_and_restart');
}

/**
 * 检查更新。后端在 HTTP 失败时以 Ok 返回 { available:false, message:'无法检查更新' }，
 * 因此必须用 message 字段区分“已是最新版本”和“检查失败”，不能只凭 available。
 */
export async function checkUpdates(): Promise<UpdateCheckResult> {
  try {
    const r = await invoke<RawUpdateResult>('check_for_updates');
    if (r.message) {
      return { status: 'error', message: r.message };
    }
    if (r.available && r.version) {
      return {
        status: 'available',
        info: { version: r.version, download_url: r.download_url || '', notes: r.notes },
      };
    }
    return { status: 'up-to-date' };
  } catch (error) {
    return { status: 'error', message: String(error) };
  }
}
