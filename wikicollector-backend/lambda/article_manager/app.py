import json
import uuid
import os
import logging
import boto3
from datetime import datetime

# ロガーの設定
# LOG_LEVEL環境変数からログレベルを取得し、デフォルトはINFOとする
logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

# ==============================================================================
# ヘルパー関数群 (DynamoDB/S3 操作)
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
        return []
    except Exception as e:
        logger.error(f"Error loading search index for user {user_id}: {str(e)}")
        return []

def save_index(index_data, key):
    """
    データをJSON形式でS3に保存する
    """
    s3 = get_s3_client()
    bucket = get_index_bucket()

    try:
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
    検索用インデックスを保存する
    """
    save_index(index_data, get_index_key(user_id))

def save_tree_index(user_id, index_data):
    """
    ツリー表示用インデックスを保存する
    """
    tree_data = []
    for item in index_data:
        tree_item = item.copy()
        tree_item.pop('content', None)
        tree_item.pop('backupContent', None)
        tree_data.append(tree_item)
    save_index(tree_data, get_tree_index_key(user_id))

# ==============================================================================
# Lambdaハンドラー (エントリポイント)
# ==============================================================================

def lambda_handler(event, context):
    """
    記事管理(CRUD)Lambdaのエントリポイント
    """
    logger.info(f"Event: {json.dumps(event)}")

    info = event.get('info', {})
    field_name = info.get('fieldName')
    arguments = event.get('arguments', {})

    # AppSyncの認可情報からユーザーID (sub) を取得
    identity = event.get('identity', {})
    user_id = identity.get('sub')

    if not user_id:
        logger.error("User identity (sub) not found in event.")
        raise ValueError("Unauthorized")

    try:
        if field_name == 'getArticle':
            return get_article(user_id, arguments.get('articleId'))
        elif field_name == 'listArticles':
            return list_articles(user_id)
        elif field_name == 'createArticle':
            return create_article(user_id, arguments.get('input'))
        elif field_name == 'updateArticle':
            return update_article(user_id, arguments.get('articleId'), arguments.get('input'))
        elif field_name == 'deleteArticle':
            return delete_article(user_id, arguments.get('articleId'))
        else:
            raise ValueError(f"Unknown field name: {field_name}")
    except Exception as e:
        logger.error(f"Error in article_manager for user {user_id}: {str(e)}")
        raise e

# ==============================================================================
# 記事操作関数群
# ==============================================================================

def get_article(user_id, article_id):
    """
    DynamoDBから特定の記事を取得する
    """
    table = get_wiki_table()
    response = table.get_item(Key={'userId': user_id, 'articleId': article_id})
    return response.get('Item')

def list_articles(user_id):
    """
    S3インデックスを使用して記事一覧を取得する
    """
    items = load_search_index(user_id)
    for item in items:
        item.pop('content', None)
    return {
        'items': items,
        'count': len(items)
    }

def create_article(user_id, article_input):
    """
    新規記事を作成し、DynamoDBとS3インデックスを更新する
    """
    table = get_wiki_table()
    article_id = str(uuid.uuid4())
    now = datetime.now().isoformat()

    item = {
        'userId': user_id,
        'articleId': article_id,
        'title': article_input['title'],
        'content': article_input['content'],
        'createdAt': now,
        'updatedAt': now
    }

    # DynamoDBへの保存
    table.put_item(Item=item)

    # S3上の検索用インデックスを即時更新
    update_s3_index(user_id, item)

    return item

def update_article(user_id, article_id, article_input):
    """
    既存記事を更新し、DynamoDBとS3インデックスを更新する
    """
    table = get_wiki_table()
    now = datetime.now().isoformat()

    update_expression = "set updatedAt = :u"
    expression_attribute_values = {':u': now}

    if 'title' in article_input:
        update_expression += ", title = :t"
        expression_attribute_values[':t'] = article_input['title']
    if 'content' in article_input:
        # 現在の本文をバックアップに移動し、新しい本文をセット
        update_expression += ", backupContent = content, content = :c"
        expression_attribute_values[':c'] = article_input['content']

    response = table.update_item(
        Key={'userId': user_id, 'articleId': article_id},
        UpdateExpression=update_expression,
        ExpressionAttributeValues=expression_attribute_values,
        ReturnValues="ALL_NEW"
    )

    updated_item = response.get('Attributes')
    # S3インデックスを更新
    update_s3_index(user_id, updated_item)

    return updated_item

def delete_article(user_id, article_id):
    """
    記事を削除し、DynamoDBとS3インデックスから取り除く
    """
    table = get_wiki_table()
    table.delete_item(Key={'userId': user_id, 'articleId': article_id})

    # S3インデックスから削除
    remove_from_s3_index(user_id, article_id)

    return True

# ==============================================================================
# S3インデックス更新補助関数
# ==============================================================================

def update_s3_index(user_id, item):
    """
    S3上の検索用・ツリー用インデックスに記事情報を追加または更新する
    """
    index_data = load_search_index(user_id)

    # 検索用インデックスにはバックアップを含めない
    item_for_index = item.copy()
    item_for_index.pop('backupContent', None)

    # 既存の同一IDデータを削除してから追加（更新対応）
    index_data = [i for i in index_data if i['articleId'] != item_for_index['articleId']]
    index_data.append(item_for_index)

    save_search_index(user_id, index_data)
    save_tree_index(user_id, index_data)

def remove_from_s3_index(user_id, article_id):
    """
    S3上のインデックスから特定記事の情報を削除する
    """
    index_data = load_search_index(user_id)
    index_data = [i for i in index_data if i['articleId'] != article_id]

    save_search_index(user_id, index_data)
    save_tree_index(user_id, index_data)
