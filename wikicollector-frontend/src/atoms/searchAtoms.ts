import { atom } from 'jotai';
import type { Article } from '../types/index';

/**
 * 検索インデックスの状態
 */
interface SearchIndexState {
  /** content含む記事一覧 */
  articles: Article[];
  /** ロード済みフラグ */
  isLoaded: boolean;
  /** ロード中フラグ */
  isLoading: boolean;
  /** エラーメッセージ */
  error: string | null;
}

/** 検索インデックスAtom */
export const searchIndexAtom = atom<SearchIndexState>({
  articles: [],
  isLoaded: false,
  isLoading: false,
  error: null,
});

/** ロード中フラグを設定 */
export const setSearchIndexLoadingAtom = atom(null, (get, set, isLoading: boolean) => {
  const current = get(searchIndexAtom);
  set(searchIndexAtom, { ...current, isLoading, error: null });
});

/** 検索インデックスを設定 */
export const setSearchIndexAtom = atom(null, (_get, set, articles: Article[]) => {
  set(searchIndexAtom, {
    articles,
    isLoaded: true,
    isLoading: false,
    error: null,
  });
});

/** エラーを設定 */
export const setSearchIndexErrorAtom = atom(null, (get, set, error: string) => {
  const current = get(searchIndexAtom);
  set(searchIndexAtom, {
    ...current,
    isLoading: false,
    error,
  });
});

/** 検索インデックスをリセット（記事更新時に使用） */
export const resetSearchIndexAtom = atom(null, (_get, set) => {
  set(searchIndexAtom, {
    articles: [],
    isLoaded: false,
    isLoading: false,
    error: null,
  });
});
