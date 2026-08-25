import { settings } from './storage';
import { recordSearch, searchHistory } from './searchHistory';
import type { SearchEngineId } from '../types/settings';

export interface EngineDef {
  id: SearchEngineId;
  label: string;
  buildUrl: (query: string) => string;
  suggestUrl?: string;
}

export const ENGINES: EngineDef[] = [
  {
    id: 'google',
    label: 'Google',
    buildUrl: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
    suggestUrl: 'https://suggestqueries.google.com/complete/search?client=firefox&q='
  },
  {
    id: 'bing',
    label: 'Bing',
    buildUrl: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
    suggestUrl: 'https://api.bing.com/osjson.aspx?query='
  },
  {
    id: 'baidu',
    label: '百度',
    buildUrl: (q) => `https://www.baidu.com/s?wd=${encodeURIComponent(q)}`,
    suggestUrl: 'https://suggestion.baidu.com/su?wd='
  },
  {
    id: 'duckduckgo',
    label: 'DuckDuckGo',
    buildUrl: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
    suggestUrl: 'https://duckduckgo.com/ac/?q='
  },
  {
    id: 'custom',
    label: '自定义',
    buildUrl: (q) => settings.search.customTemplate.replaceAll('%s', encodeURIComponent(q))
  }
];

export function currentEngine(): EngineDef {
  return ENGINES.find((e) => e.id === settings.search.engine) ?? ENGINES[0];
}

export function buildSearchUrl(query: string): string {
  return currentEngine().buildUrl(query);
}

export async function fetchSuggestions(query: string, signal?: AbortSignal): Promise<string[]> {
  const e = currentEngine();
  if (!e.suggestUrl) return [];
  try {
    const res = await fetch(e.suggestUrl + encodeURIComponent(query), { signal });
    const text = await res.text();
    if (e.id === 'google') return (JSON.parse(text) as [string, string[]])[1];
    if (e.id === 'bing') return (JSON.parse(text) as [string, string[]])[1];
    if (e.id === 'duckduckgo') return (JSON.parse(text) as Array<{ phrase: string }>).map((i) => i.phrase);
    if (e.id === 'baidu') {
      // 百度返回 JSONP 文本：window.baidu.sug({q:"...",p:false,s:[...]})
      const m = text.match(/"s":(\[[^]*?\])\s*\}/);
      return m ? (JSON.parse(m[1]) as string[]) : [];
    }
    return [];
  } catch {
    return [];
  }
}

export async function openSearch(query: string) {
  recordSearch(query);
  await searchHistory.save(); // 立即落盘，避免“当前页跳转”时丢失
  const url = buildSearchUrl(query);
  const mode = settings.search.openIn;
  if (mode === 'newtab') {
    await chrome.tabs.create({ url });
  } else if (mode === 'background') {
    await chrome.tabs.create({ url, active: false });
  } else {
    chrome.tabs.getCurrent((tab) => {
      if (tab?.id != null) {
        void chrome.tabs.update(tab.id, { url });
      } else {
        window.location.href = url;
      }
    });
  }
}
