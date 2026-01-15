import { atom } from 'jotai';
import type { Article, WikiNode } from '../types/index';

export const articlesAtom = atom<Article[]>([]);

export const wikiTreeAtom = atom<WikiNode[]>((get) => {
  const articles = get(articlesAtom);
  const root: WikiNode[] = [];

  articles.forEach((article) => {
    const parts = article.title.split('/');
    let currentLevel = root;

    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;
      const path = parts.slice(0, index + 1).join('/');

      let node = currentLevel.find((n) => n.name === part);

      if (!node) {
        node = {
          id: isLast ? article.articleId : `folder-${path}`,
          name: part,
          path: path,
          type: isLast ? 'file' : 'folder',
          articleId: isLast ? article.articleId : undefined,
          children: [],
        };
        currentLevel.push(node);
      }

      currentLevel = node.children;
    });
  });

  // フォルダを先に、ファイルを後にソート
  const sortNodes = (nodes: WikiNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });
    nodes.forEach((node) => sortNodes(node.children));
  };

  sortNodes(root);
  return root;
});

export const selectedArticleIdAtom = atom<string | null>(null);

export const searchQueryAtom = atom<string>('');


export const expandedItemIdsAtom = atom<string[]>((get) => {
  const selectedId = get(selectedArticleIdAtom);
  const articles = get(articlesAtom);
  if (!selectedId) return [];

  const article = articles.find((a) => a.articleId === selectedId);
  if (!article) return [];

  const parts = article.title.split('/');
  const expanded: string[] = [];

  // 最後の要素以外（親フォルダ）をすべて展開対象にする
  for (let i = 1; i < parts.length; i++) {
    const path = parts.slice(0, i).join('/');
    expanded.push(`folder-${path}`);
  }

  return expanded;
});

// キャッシュ設定
const MAX_CACHE_SIZE = 20;

// キャッシュ用のAtom (Mapを使用して高速にアクセス)
// NOTE: 順序を保持するためにIDの配列も同時に管理する
interface CacheState {
  map: Map<string, Article>;
  order: string[]; // 最近使った順 (先頭が最新)
}

const internalCacheAtom = atom<CacheState>({
  map: new Map(),
  order: [],
});

// 読み取り専用Atom
export const cachedArticlesAtom = atom((get) => get(internalCacheAtom).map);

// キャッシュ更新用Atom (書き込み専用)
export const updateCacheAtom = atom(
  null,
  (get, set, article: Article) => {
    const cache = get(internalCacheAtom);
    const newMap = new Map(cache.map);
    let newOrder = [...cache.order];

    // 既に存在する場合は一旦削除して順序を更新
    if (newMap.has(article.articleId)) {
      newOrder = newOrder.filter((id) => id !== article.articleId);
    }

    // 最新として追加
    newMap.set(article.articleId, article);
    newOrder.unshift(article.articleId);

    // キャッシュサイズ制限 (LRU)
    if (newOrder.length > MAX_CACHE_SIZE) {
      const removedId = newOrder.pop();
      if (removedId) {
        newMap.delete(removedId);
      }
    }

    set(internalCacheAtom, { map: newMap, order: newOrder });
  }
);
