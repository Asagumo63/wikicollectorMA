import type { Article } from '../types';
import type { ParsedQuery } from './searchQueryParser';

/**
 * 記事が検索条件に一致するかを判定
 *
 * @param article 記事オブジェクト
 * @param parsed 解析済み検索クエリ
 * @returns 一致する場合はtrue
 */
export function matchesQuery(article: Article, parsed: ParsedQuery): boolean {
  const title = article.title.toLowerCase();
  const content = (article.content || '').toLowerCase();
  const searchText = `${title} ${content}`;

  // 1. 除外チェック (1つでも含まれていたらfalse)
  for (const term of parsed.excludeTerms) {
    if (searchText.includes(term.toLowerCase())) {
      return false;
    }
  }

  // 2. フレーズ検索 (全て含まれている必要がある)
  for (const phrase of parsed.phrases) {
    if (!searchText.includes(phrase.toLowerCase())) {
      return false;
    }
  }

  // 3. AND条件 (全て含まれている必要がある)
  for (const term of parsed.andTerms) {
    if (!searchText.includes(term.toLowerCase())) {
      return false;
    }
  }

  // 4. OR条件 (各グループで少なくとも1つ含まれている必要がある)
  for (const group of parsed.orGroups) {
    const hasMatch = group.some((term) => searchText.includes(term.toLowerCase()));
    if (!hasMatch) {
      return false;
    }
  }

  // 何も条件がない場合（空のクエリ）はfalse
  if (
    parsed.andTerms.length === 0 &&
    parsed.orGroups.length === 0 &&
    parsed.phrases.length === 0
  ) {
    return false;
  }

  return true;
}

/**
 * 記事リストをフィルタリング
 *
 * @param articles 記事リスト
 * @param parsed 解析済み検索クエリ
 * @returns フィルタリングされた記事リスト
 */
export function filterArticles(articles: Article[], parsed: ParsedQuery): Article[] {
  return articles.filter((article) => matchesQuery(article, parsed));
}
