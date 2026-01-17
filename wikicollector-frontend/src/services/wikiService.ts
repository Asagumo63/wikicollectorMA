import { generateClient } from 'aws-amplify/api';
import { downloadData, getUrl } from 'aws-amplify/storage';
import { AuthService } from './authService';
import type { Article } from '../types';

let client: any = null;

const getClient = () => {
  if (!client) {
    client = generateClient();
  }
  return client;
};

export const listArticlesQuery = /* GraphQL */ `
  query ListArticles {
    listArticles {
      items {
        articleId
        title
        createdAt
        updatedAt
      }
      count
    }
  }
`;

export const getArticleQuery = /* GraphQL */ `
  query GetArticle($articleId: ID!) {
    getArticle(articleId: $articleId) {
      articleId
      title
      content
      backupContent
      createdAt
      updatedAt
    }
  }
`;

export const createArticleMutation = /* GraphQL */ `
  mutation CreateArticle($input: CreateArticleInput!) {
    createArticle(input: $input) {
      articleId
      title
      content
      backupContent
      createdAt
      updatedAt
    }
  }
`;

export const updateArticleMutation = /* GraphQL */ `
  mutation UpdateArticle($articleId: ID!, $input: UpdateArticleInput!) {
    updateArticle(articleId: $articleId, input: $input) {
      articleId
      title
      content
      backupContent
      createdAt
      updatedAt
    }
  }
`;

export const deleteArticleMutation = /* GraphQL */ `
  mutation DeleteArticle($articleId: ID!) {
    deleteArticle(articleId: $articleId)
  }
`;

export const getImageUploadUrlMutation = /* GraphQL */ `
  mutation GetImageUploadUrl($fileName: String!, $fileType: String!) {
    getImageUploadUrl(fileName: $fileName, fileType: $fileType) {
      uploadUrl
      objectKey
    }
  }
`;

export const searchArticlesQuery = /* GraphQL */ `
  query SearchArticles($query: String) {
    searchArticles(query: $query) {
      items {
        articleId
        title
        content
        createdAt
        updatedAt
      }
      count
    }
  }
`;

export class WikiService {
  static async listArticles(): Promise<Article[]> {
    try {
      const user = await AuthService.getCurrentUser();
      const userId = user?.userId; // Cognito sub (UUID)

      if (userId) {
        // 1. Amplify Storage を使用してユーザー個別の S3 インデックスを取得試行
        try {
          const result = await downloadData({
            path: `users/${userId}/tree_index.json`,
          }).result;
          const text = await result.body.text();
          return JSON.parse(text);
        } catch (e) {
          console.warn('Failed to fetch tree_index.json via Amplify Storage, falling back to AppSync:', e);
        }
      }

      // 2. 失敗した場合は AppSync + Lambda 経由で取得 (Lambda側でも厳格に userId が使われる)
      const response = await getClient().graphql({
        query: listArticlesQuery,
      }) as any;
      return response.data.listArticles.items;
    } catch (error) {
      console.error('Error listing articles:', error);
      throw error;
    }
  }

  static async searchArticles(query: string): Promise<Article[]> {
    try {
      const response = await getClient().graphql({
        query: searchArticlesQuery,
        variables: { query },
      }) as any;
      return response.data.searchArticles.items;
    } catch (error) {
      console.error('Error searching articles:', error);
      throw error;
    }
  }

  static async getArticle(articleId: string): Promise<Article | null> {
    try {
      const response = await getClient().graphql({
        query: getArticleQuery,
        variables: { articleId },
      }) as any;
      return response.data.getArticle;
    } catch (error) {
      console.error('Error getting article:', error);
      throw error;
    }
  }

  static async createArticle(title: string, content: string): Promise<Article> {
    try {
      const response = await getClient().graphql({
        query: createArticleMutation,
        variables: {
          input: { title, content },
        },
      }) as any;
      return response.data.createArticle;
    } catch (error) {
      console.error('Error creating article:', error);
      throw error;
    }
  }

  static async updateArticle(articleId: string, title?: string, content?: string): Promise<Article> {
    try {
      const response = await getClient().graphql({
        query: updateArticleMutation,
        variables: {
          articleId,
          input: { title, content },
        },
      }) as any;
      return response.data.updateArticle;
    } catch (error) {
      console.error('Error updating article:', error);
      throw error;
    }
  }

  static async deleteArticle(articleId: string): Promise<boolean> {
    try {
      const response = await getClient().graphql({
        query: deleteArticleMutation,
        variables: { articleId },
      }) as any;
      return response.data.deleteArticle;
    } catch (error) {
      console.error('Error deleting article:', error);
      throw error;
    }
  }

  static async getImageUploadUrl(fileName: string, fileType: string): Promise<{ uploadUrl: string; objectKey: string }> {
    try {
      const response = await getClient().graphql({
        query: getImageUploadUrlMutation,
        variables: { fileName, fileType },
      }) as any;
      return response.data.getImageUploadUrl;
    } catch (error) {
      console.error('Error getting image upload URL:', error);
      throw error;
    }
  }

  static async uploadImage(file: File): Promise<string> {
    try {
      // 1. AppSyncからアップロード用の署名付きURLを取得
      const { uploadUrl, objectKey } = await this.getImageUploadUrl(file.name, file.type);

      // 2. S3に直接PUT
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status}`);
      }

      // 3. 表示用のパスを返す (S3上のキー)
      // /users/{userId}/images/ から始まるパスをMarkdownに埋め込む
      return `/${objectKey}`;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }

  /**
   * 画像の一時的な署名付きURLを取得する (Amplify Storage v6)
   * @param path Markdown内の画像パス (例: /users/{userId}/images/xxx.png)
   */
  static async getPictureUrl(path: string): Promise<string> {
    try {
      // 先頭の / を取り除く
      const key = path.startsWith('/') ? path.slice(1) : path;

      const result = await getUrl({
        path: key,
        options: {
          bucket: 'images', // amplify.ts で設定した画像バケットのエイリアス
          expiresIn: 3600, // 1時間有効
        }
      });
      return result.url.toString();
    } catch (error) {
      console.error('Error getting picture URL:', error);
      return '';
    }
  }

  /**
   * 検索用インデックス(content含む)を取得する
   * フロントエンドでの高度な検索のために使用
   * @returns content含む記事一覧
   */
  static async loadSearchIndex(): Promise<Article[]> {
    try {
      const user = await AuthService.getCurrentUser();
      const userId = user?.userId; // Cognito sub (UUID)

      if (userId) {
        // 1. S3から users/{userId}/search_index.json を取得試行
        try {
          const result = await downloadData({
            path: `users/${userId}/search_index.json`,
          }).result;
          const text = await result.body.text();
          return JSON.parse(text);
        } catch (e) {
          console.warn(
            'Failed to fetch search_index.json via Amplify Storage, falling back to GraphQL:',
            e
          );
        }
      }

      // 2. フォールバック: GraphQL経由で空クエリで全記事取得
      const response = (await getClient().graphql({
        query: searchArticlesQuery,
        variables: { query: '' },
      })) as any;
      return response.data.searchArticles.items;
    } catch (error) {
      console.error('Error loading search index:', error);
      throw error;
    }
  }
}
