import json
import os
import uuid
import boto3
import logging
from datetime import datetime

# ロガーの設定
# LOG_LEVEL環境変数からログレベルを取得し、デフォルトはINFOとする
logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

def get_s3_client():
    """
    S3クライアントを取得する

    Returns:
        botocore.client.S3: S3クライアント
    """
    return boto3.client('s3')

def lambda_handler(event, context):
    """
    画像アップロード用署名付きURL発行Lambda

    【処理概要】
    1. クライアントから送信されたファイル名とファイル形式を受け取る
    2. S3上での保存キー（パス）をUUIDを用いて生成し、重複を避ける
    3. 生成したキーに対して、クライアントが直接PUTできる署名付きURLを発行する

    【注意】
    - このURLの有効期限は5分(300秒)に設定されている
    - AppSyncのMutation経由で呼び出されることを想定

    Args:
        event (dict): 'arguments' 配下に 'fileName' と 'fileType' を含む
        context (object): Lambdaコンテキスト

    Returns:
        dict: 'uploadUrl' (署名付きURL) と 'objectKey' (S3上のキー)
    """
    logger.info(f"Event: {json.dumps(event)}")

    # AppSyncからの引数を取得
    arguments = event.get('arguments', {})
    file_name = arguments.get('fileName')
    file_type = arguments.get('fileType')

    if not file_name or not file_type:
        logger.error("Missing fileName or fileType in arguments")
        raise ValueError("fileName and fileType are required")

    # 環境変数からバケット名を取得
    bucket_name = os.environ['WIKI_IMAGE_BUCKET_NAME']

    # ファイル名の重複を避けるため、UUIDを付与してキーを生成
    # 例: users/{userId}/images/550e8400-e29b-41d4-a716-446655440000.png
    identity = event.get('identity', {})
    user_id = identity.get('sub')
    if not user_id:
        logger.error("User identity (sub) not found in event.")
        raise ValueError("Unauthorized")

    file_extension = os.path.splitext(file_name)[1]
    object_key = f"users/{user_id}/images/{uuid.uuid4()}{file_extension}"

    s3 = get_s3_client()

    try:
        # PUT用の署名付きURLを発行
        # これにより、クライアントはAWS認証情報なしで直接S3にファイルをアップロード可能になる
        upload_url = s3.generate_presigned_url(
            ClientMethod='put_object',
            Params={
                'Bucket': bucket_name,
                'Key': object_key,
                'ContentType': file_type
            },
            ExpiresIn=300 # 有効期限: 300秒
        )

        logger.info(f"Generated presigned URL for key: {object_key}")

        return {
            'uploadUrl': upload_url,
            'objectKey': object_key
        }
    except Exception as e:
        logger.error(f"Error generating presigned URL: {str(e)}")
        # AppSync側でエラーをハンドリングさせるため例外をスロー
        raise e
