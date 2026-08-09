import { invoke } from '@tauri-apps/api/tauri';

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
