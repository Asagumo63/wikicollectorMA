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

def get_wiki_table():
    """
    DynamoDBのWiki記事テーブルオブジェクトを取得する

    Returns:
        boto3.resources.factory.dynamodb.Table: DynamoDBテーブルリソース
    """
    dynamodb = boto3.resource('dynamodb')
    return dynamodb.Table(os.environ['WIKI_ARTICLES_TABLE_NAME'])

def get_s3_client():
    """
    S3クライアントを取得する

    Returns:
        botocore.client.S3: S3クライアント
    """
    return boto3.client('s3')

def get_index_bucket():
    """
    インデックスを保存するS3バケット名を取得する

    Returns:
        str: S3バケット名
    """
    return os.environ['OBJECT_BUCKET_NAME']

def get_index_key(user_id):
    """
    検索用インデックスのファイルキー(パス)を取得する
    """
    return f'users/{user_id}/search_index.json'

def get_tree_index_key(user_id):
    """
    ツリー表示用インデックスのファイルキー(パス)を取得する
    """
    return f'users/{user_id}/tree_index.json'

def save_index(index_data, key):
    """
    データをJSON形式でS3に保存する
    """
    s3 = get_s3_client()
    bucket = get_index_bucket()

    try:
        # JSON化してS3にアップロード (UTF-8エンコーディングを維持)
        s3.put_object(
            Bucket=bucket,
            Key=key,
            Body=json.dumps(index_data, ensure_ascii=False),
            ContentType='application/json'
        )
    except Exception as e:
        logger.error(f"Error saving index {key}: {str(e)}")
        raise e

def save_search_index(user_id, index_data):
    """
    検索用インデックスを生成して保存する
    """
    search_data = []
    for item in index_data:
        search_item = item.copy()
        search_item.pop('backupContent', None)
        search_data.append(search_item)

    save_index(search_data, get_index_key(user_id))

def save_tree_index(user_id, index_data):
    """
    ツリー表示用インデックスを生成して保存する
    """
    tree_data = []
    for item in index_data:
        tree_item = item.copy()
        tree_item.pop('content', None)
        tree_item.pop('backupContent', None)
        tree_data.append(tree_item)

    save_index(tree_data, get_tree_index_key(user_id))

# ==============================================================================
# Lambdaハンドラー
# ==============================================================================

def lambda_handler(event, context):
    """
    整合性チェックLambdaのエントリポイント
    """
    logger.info("Starting consistency check (Sync DynamoDB to S3)...")

    try:
        table = get_wiki_table()

        # DynamoDBから全データを取得 (ページネーション対応)
        all_items = []
        response = table.scan()
        all_items.extend(response.get('Items', []))

        while 'LastEvaluatedKey' in response:
            response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            all_items.extend(response.get('Items', []))

        logger.info(f"Found {len(all_items)} articles in DynamoDB.")

        # ユーザーIDごとにデータをグルーピング
        user_data_map = {}
        for item in all_items:
            u_id = item.get('userId')
            if not u_id:
                continue
            if u_id not in user_data_map:
                user_data_map[u_id] = []
            user_data_map[u_id].append(item)

        # ユーザーごとにインデックスを保存
        for u_id, items in user_data_map.items():
            logger.info(f"Updating S3 indices for user: {u_id}")
            save_search_index(u_id, items)
            save_tree_index(u_id, items)

        logger.info("Consistency check completed successfully.")
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Sync successful', 'userCount': len(user_data_map), 'articleCount': len(all_items)})
        }
    except Exception as e:
        logger.error(f"Error during consistency check: {str(e)}")
        raise e
