import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { WikiService } from './wikiService';
import type { Article } from '../types';

const BATCH_SIZE = 5; // 同時リクエスト数

export class ExportService {
  /**
   * タイトルからMarkdownファイルパスを生成
   * 例: "001.技術/02.クラウド/AWS" → "001.技術/02.クラウド/AWS.md"
   */
  private static titleToFilePath(title: string): string {
    // ファイル名として不正な文字を置換
    const sanitized = title
      .replace(/[<>:"|?*]/g, '_')  // Windows禁止文字
      .replace(/\\/g, '/');         // バックスラッシュを統一
    return `${sanitized}.md`;
  }

  /**
   * タイトルとコンテンツからMarkdownファイルの内容を生成
   * ファイル先頭にタイトル（フルパス）を記載
   */
  private static generateMarkdownContent(title: string, content: string): string {
    return `${title}\n\n${content}`;
  }

  /**
   * 並列数を制限して記事を取得
   */
  private static async fetchArticlesInBatches(
    articleList: Article[],
    onProgress?: (current: number, total: number) => void
  ): Promise<Article[]> {
    const results: Article[] = [];
    const total = articleList.length;

    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = articleList.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(article => WikiService.getArticle(article.articleId))
      );

      results.push(
        ...batchResults.filter((a): a is Article => a !== null)
      );

      if (onProgress) {
        onProgress(Math.min(i + BATCH_SIZE, total), total);
      }
    }

    return results;
  }

  /**
   * 全記事をZIPファイルとしてエクスポート
   */
  static async exportAllArticles(
    onProgress?: (current: number, total: number) => void
  ): Promise<void> {
    // 1. 記事一覧を取得
    const articleList = await WikiService.listArticles();

    if (articleList.length === 0) {
      throw new Error('エクスポートする記事がありません');
    }

    // 2. 各記事の本文を取得（並列制限付き）
    const articles = await this.fetchArticlesInBatches(
      articleList,
      onProgress
    );

    // 3. ZIPファイルを生成
    const zip = new JSZip();

    for (const article of articles) {
      if (article.content) {
        const filePath = this.titleToFilePath(article.title);
        const fileContent = this.generateMarkdownContent(article.title, article.content);
        zip.file(filePath, fileContent);
      }
    }

    // 4. ZIPを生成してダウンロード
    const blob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    const timestamp = new Date().toISOString().slice(0, 10);
    saveAs(blob, `wiki-export-${timestamp}.zip`);
  }
}
