import { invoke } from '@tauri-apps/api/tauri';

export async function openUrl(url: string): Promise<void> {
  await invoke('open_url', { url });
}
