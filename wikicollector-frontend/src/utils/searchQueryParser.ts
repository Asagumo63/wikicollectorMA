/**
 * 検索クエリの解析結果
 */
export interface ParsedQuery {
  /** AND条件のキーワード (通常のスペース区切り) */
  andTerms: string[];
  /** OR条件のキーワードグループ (各グループ内はOR、グループ間はAND) */
  orGroups: string[][];
  /** フレーズ検索 (完全一致) */
  phrases: string[];
  /** 除外キーワード */
  excludeTerms: string[];
  /** ハイライト用の全キーワード (除外以外) */
  highlightTerms: string[];
}

/**
 * 括弧内のORグループを解析する
 * @param content 括弧内の文字列（括弧なし）
 * @returns ORグループの配列、またはANDキーワードの配列
 */
function parseParenthesisContent(content: string): { orGroup: string[] | null; andTerms: string[] } {
  const tokens = content.split(/\s+/).filter((t) => t);
  const terms: string[] = [];
  let hasOr = false;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.toUpperCase() === 'OR') {
      hasOr = true;
      continue;
    }
    terms.push(token);
  }

  if (hasOr && terms.length > 1) {
    return { orGroup: terms, andTerms: [] };
  }
  return { orGroup: null, andTerms: terms };
}

/**
 * 検索クエリを解析する
 *
 * サポートする構文:
 * - スペース区切り: AND検索 (例: "React TypeScript")
 * - "フレーズ": フレーズ完全一致 (例: "React Hooks")
 * - OR: OR検索 (例: "React OR Vue")
 * - -キーワード: 除外検索 (例: "-class")
 * - (A OR B): 括弧によるORグループ化 (例: "(React OR Vue)")
 * - 複数グループ: (A OR B) (C OR D) → 両方のグループで少なくとも1つマッチ
 *
 * @param query 検索クエリ文字列
 * @returns 解析結果
 */
export function parseSearchQuery(query: string): ParsedQuery {
  const phrases: string[] = [];
  const excludeTerms: string[] = [];
  const orGroups: string[][] = [];
  const andTerms: string[] = [];

  // 空クエリの場合は早期リターン
  if (!query.trim()) {
    return { andTerms: [], orGroups: [], phrases: [], excludeTerms: [], highlightTerms: [] };
  }

  let remaining = query;

  // 1. フレーズ検索を抽出 ("..."を取り出す)
  const phraseRegex = /"([^"]+)"/g;
  let match;
  while ((match = phraseRegex.exec(query)) !== null) {
    phrases.push(match[1]);
    remaining = remaining.replace(match[0], ' ');
  }

  // 2. 括弧グループを抽出 ((...) を取り出す)
  const parenRegex = /\(([^)]+)\)/g;
  while ((match = parenRegex.exec(remaining)) !== null) {
    const content = match[1].trim();
    const parsed = parseParenthesisContent(content);

    if (parsed.orGroup) {
      orGroups.push(parsed.orGroup);
    } else {
      andTerms.push(...parsed.andTerms);
    }
  }
  remaining = remaining.replace(parenRegex, ' ');

  // 3. トークンに分割
  const tokens = remaining.split(/\s+/).filter((t) => t);

  // 4. 除外キーワードを抽出し、残りのトークンを処理
  const nonExcludeTokens: string[] = [];
  for (const token of tokens) {
    if (token.startsWith('-') && token.length > 1) {
      excludeTerms.push(token.slice(1));
    } else {
      nonExcludeTokens.push(token);
    }
  }

  // 5. OR演算子でグループ分け（括弧なしのOR）
  // "A OR B" → orGroups: [["A", "B"]]
  // "A B" → andTerms: ["A", "B"]
  // "A OR B C" → orGroups: [["A", "B"]], andTerms: ["C"]
  let currentGroup: string[] = [];
  let inOrGroup = false;

  for (let i = 0; i < nonExcludeTokens.length; i++) {
    const token = nonExcludeTokens[i];
    const nextToken = nonExcludeTokens[i + 1];

    // "OR"自体はスキップ
    if (token.toUpperCase() === 'OR') {
      continue;
    }

    // 次のトークンが"OR"の場合、ORグループを開始または継続
    if (nextToken?.toUpperCase() === 'OR') {
      currentGroup.push(token);
      inOrGroup = true;
    } else if (inOrGroup) {
      // ORグループの最後のトークン
      currentGroup.push(token);
      orGroups.push([...currentGroup]);
      currentGroup = [];
      inOrGroup = false;
    } else {
      // 通常のAND条件
      andTerms.push(token);
    }
  }

  // 残ったグループがあれば処理（エッジケース: "A OR" で終わる場合）
  if (currentGroup.length > 0) {
    if (currentGroup.length === 1) {
      andTerms.push(currentGroup[0]);
    } else {
      orGroups.push(currentGroup);
    }
  }

  // 6. ハイライト用キーワードを集約（除外以外）
  const highlightTerms = [...andTerms, ...phrases, ...orGroups.flat()];

  return { andTerms, orGroups, phrases, excludeTerms, highlightTerms };
}
