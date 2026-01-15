import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// 文字サイズのデフォルト値
export const DEFAULT_FONT_SIZE = 16;

export type ThemeMode = 'light' | 'dark';

interface Settings {
  fontSize: number;
  themeMode: ThemeMode;
}

// localStorageに保存される設定Atom
export const settingsAtom = atomWithStorage<Settings>('wiki-settings', {
  fontSize: DEFAULT_FONT_SIZE,
  themeMode: 'light',
});

// 読み取り専用の文字サイズAtom
export const fontSizeAtom = atom((get) => get(settingsAtom).fontSize);

// テーマモードAtom
export const themeModeAtom = atom((get) => get(settingsAtom).themeMode);
