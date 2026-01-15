import json
import os
import logging
import boto3

# ロガーの設定
# LOG_LEVEL環境変数からログレベルを取得し、デフォルトはINFOとする
logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

# ==============================================================================
# ヘルパー関数群
# ==============================================================================

def get_s3_client():
    """
    S3クライアントを取得する

    Returns:
        botocore.client.S3: S3クライアント
    """
    return boto3.client('s3')

def get_index_bucket():
    """
    インデックスが格納されているS3バケット名を取得する

    Returns:
        str: S3バケット名
    """
    return os.environ['OBJECT_BUCKET_NAME']

def get_index_key(user_id):
    """
    検索用インデックスのファイルキー(パス)を取得する
    """
    return f'users/{user_id}/search_index.json'

def load_search_index(user_id):
    """
    S3から検索用インデックスファイルを読み込む
    """
    s3 = get_s3_client()
    bucket = get_index_bucket()
    key = get_index_key(user_id)

    try:
        response = s3.get_object(Bucket=bucket, Key=key)
        return json.loads(response['Body'].read().decode('utf-8'))
    except s3.exceptions.NoSuchKey:
        logger.warning(f"Search index not found for user {user_id}: {key}")
        return []
    except Exception as e:
        logger.error(f"Error loading search index for user {user_id}: {str(e)}")
        return []

# ==============================================================================
# Lambdaハンドラー
# ==============================================================================

def lambda_handler(event, context):
    """
    全文検索Lambdaのエントリポイント
    """
    logger.info(f"Event: {json.dumps(event)}")

    # AppSyncの認可情報からユーザーID (sub) を取得
    identity = event.get('identity', {})
    user_id = identity.get('sub')

    if not user_id:
        logger.error("User identity (sub) not found in event.")
        raise ValueError("Unauthorized")

    # AppSync等からの引数を取得
    arguments = event.get('arguments', {})
    query = arguments.get('query', '').lower()

    try:
        # ユーザー個別の検索用インデックスの読み込み
        articles = load_search_index(user_id)

        # クエリが空の場合は全記事を返す
        if not query:
            return {
                'items': articles,
                'count': len(articles)
            }

        # クエリによるフィルタリング
        results = []
        for article in articles:
            # タイトルまたは本文にクエリが含まれているかチェック
            title = article.get('title', '').lower()
            content = article.get('content', '').lower()

            if query in title or query in content:
                results.append(article)

        logger.info(f"Search completed for user {user_id}. Found {len(results)} matches for query: '{query}'")

        return {
            'items': results,
            'count': len(results)
        }
    except Exception as e:
        logger.error(f"Error during fulltext search for user {user_id}: {str(e)}")
        raise e
