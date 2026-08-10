import { useReducer, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AppState, TabType, Settings } from '../types';

type Action =
  | { type: 'SET_TAB'; payload: TabType }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_DATA'; payload: Partial<AppState> };

const initialState: AppState = {
  activeTab: 'system',
  systemData: null,
  languageData: [],
  toolData: [],
  networkData: null,
  isLoading: true,
  error: null,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_TAB':
      return { ...state, activeTab: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_DATA':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

/** cacheExpiry 为 0（永不过期）时发送 null → Rust Option::None */
function cacheExpiryHours(expiry: number): number | null {
  return expiry > 0 ? expiry : null;
}

export function useAppState() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadAllInfo = useCallback(async (settings?: Settings) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_DATA', payload: { error: null } });
    const s = settings ?? {
      detectLanguages: true,
      detectTools: true,
      detectNetwork: true,
      cacheExpiry: 24,
    };
    try {
      const calls: Promise<unknown>[] = [invoke('get_system_info')];
      if (s.detectLanguages) {
        calls.push(invoke('get_language_info', { cacheExpiryHours: cacheExpiryHours(s.cacheExpiry) }));
      }
      if (s.detectTools) {
        calls.push(invoke('get_tool_info', { cacheExpiryHours: cacheExpiryHours(s.cacheExpiry) }));
      }
      if (s.detectNetwork) {
        calls.push(invoke('get_network_info'));
      }
      const [system, languages, tools, network] = await Promise.all(calls);
      dispatch({
        type: 'SET_DATA',
        payload: {
          systemData: system as AppState['systemData'],
          languageData: s.detectLanguages ? (languages as AppState['languageData']) : [],
          toolData: s.detectTools ? (tools as AppState['toolData']) : [],
          networkData: s.detectNetwork ? (network as AppState['networkData']) : null,
          isLoading: false,
        },
      });
    } catch (error) {
      console.error('加载信息时出错:', error);
      dispatch({
        type: 'SET_DATA',
        payload: { isLoading: false, error: String(error) },
      });
    }
  }, []);

  /** 清空缓存后重新检测并加载 */
  const refreshDetection = useCallback(async (settings?: Settings) => {
    try {
      await invoke('refresh_detection');
      await loadAllInfo(settings);
    } catch (error) {
      console.error('刷新检测失败:', error);
      dispatch({ type: 'SET_DATA', payload: { error: String(error) } });
    }
  }, [loadAllInfo]);

  const switchTab = useCallback((tab: TabType) => {
    dispatch({ type: 'SET_TAB', payload: tab });
  }, []);

  return { state, loadAllInfo, refreshDetection, switchTab };
}
