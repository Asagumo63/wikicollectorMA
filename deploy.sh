#!/bin/bash
# Multi-Account Wiki Integrated Deployment Script
set -e

# 1. 設定
COMPONENT_NAME=${1:-"wikicollector"}
ENV_NAME=${2:-"dev"}
BACKEND_STACK_NAME="${COMPONENT_NAME}-backend-${ENV_NAME}"
FRONTEND_STACK_NAME="${COMPONENT_NAME}-frontend-${ENV_NAME}"
REGION=$(aws configure get region)
REGION=${REGION:-"ap-northeast-1"}

# jq check
if ! command -v jq &> /dev/null; then
    echo "Error: jq is required but not installed."
    exit 1
fi

echo "--------------------------------------------------"
echo "Starting Integrated Deployment"
echo "Component: ${COMPONENT_NAME}"
echo "Environment: ${ENV_NAME}"
echo "Region: ${REGION}"
echo "--------------------------------------------------"

# 2. バックエンド (SAM) のビルドとデプロイ
echo "[1/5] Deploying Backend (AWS SAM)..."
cd wikicollector-backend
sam build -t app-sam.yaml
sam deploy --stack-name ${BACKEND_STACK_NAME} \
           --resolve-s3 \
           --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
           --parameter-overrides ComponentName=${COMPONENT_NAME} EnvironmentName=${ENV_NAME} SystemMail=admin@example.com Loglevel=INFO \
           --no-confirm-changeset \
           --no-fail-on-empty-changeset
cd ..

# 3. バックエンドの出力取得
echo "[2/5] Retrieving Backend Outputs..."
BACKEND_OUTPUTS=$(aws cloudformation describe-stacks --stack-name ${BACKEND_STACK_NAME} --query "Stacks[0].Outputs")

if [ -z "$BACKEND_OUTPUTS" ] || [ "$BACKEND_OUTPUTS" == "null" ]; then
    echo "Error: Failed to retrieve backend stack outputs."
    exit 1
fi

API_URL=$(echo ${BACKEND_OUTPUTS} | jq -r '.[] | select(.OutputKey=="GraphQLApiUrl") | .OutputValue')
USER_POOL_ID=$(echo ${BACKEND_OUTPUTS} | jq -r '.[] | select(.OutputKey=="UserPoolId") | .OutputValue')
USER_POOL_CLIENT_ID=$(echo ${BACKEND_OUTPUTS} | jq -r '.[] | select(.OutputKey=="UserPoolWebClientId") | .OutputValue')
IDENTITY_POOL_ID=$(echo ${BACKEND_OUTPUTS} | jq -r '.[] | select(.OutputKey=="IdentityPoolId") | .OutputValue')
MEDIA_BUCKET_NAME=$(echo ${BACKEND_OUTPUTS} | jq -r '.[] | select(.OutputKey=="WikiImageBucketName") | .OutputValue')
OBJECT_BUCKET_NAME=$(echo ${BACKEND_OUTPUTS} | jq -r '.[] | select(.OutputKey=="ObjectBucketName") | .OutputValue')

# 4. フロントエンド インフラのデプロイ (CloudFront + S3)
echo "[3/5] Deploying Frontend Infrastructure (CloudFormation)..."

TEMPLATE_FILE="wikicollector-web/website.yaml"
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo "Error: Template file not found: $TEMPLATE_FILE"
    echo "Please ensure 'wikicollector-web/website.yaml' exists and is uploaded."
    exit 1
fi

aws cloudformation deploy \
    --template-file $TEMPLATE_FILE \
    --stack-name ${FRONTEND_STACK_NAME} \
    --parameter-overrides ComponentName=${COMPONENT_NAME} EnvironmentName=${ENV_NAME} \
    --capabilities CAPABILITY_IAM \
    --no-fail-on-empty-changeset

FRONTEND_OUTPUTS=$(aws cloudformation describe-stacks --stack-name ${FRONTEND_STACK_NAME} --query "Stacks[0].Outputs")

if [ -z "$FRONTEND_OUTPUTS" ] || [ "$FRONTEND_OUTPUTS" == "null" ]; then
    echo "Error: Failed to retrieve frontend stack outputs."
    exit 1
fi

WEB_BUCKET_NAME=$(echo ${FRONTEND_OUTPUTS} | jq -r '.[] | select(.OutputKey=="ContentsBucket") | .OutputValue')
DISTRIBUTION_ID=$(echo ${FRONTEND_OUTPUTS} | jq -r '.[] | select(.OutputKey=="CloudFrontDistributionId") | .OutputValue')
SITE_URL=$(echo ${FRONTEND_OUTPUTS} | jq -r '.[] | select(.OutputKey=="Site") | .OutputValue')

if [ -z "$WEB_BUCKET_NAME" ] || [ -z "$DISTRIBUTION_ID" ]; then
    echo "Error: Failed to extract frontend parameters. Bucket: $WEB_BUCKET_NAME, DistID: $DISTRIBUTION_ID"
    exit 1
fi

# 5. フロントエンドのビルド
echo "[4/5] Building Frontend (React)..."

# 古いビルド成果物とキャッシュを削除して確実にクリーンビルド
rm -f wikicollector-frontend/.env
rm -rf wikicollector-frontend/dist
rm -rf wikicollector-frontend/node_modules/.vite

cat <<EOF > wikicollector-frontend/.env
VITE_AWSREGION=${REGION}
VITE_GRAPHQLENDPOINT=${API_URL}
VITE_USERPOOLID=${USER_POOL_ID}
VITE_USERPOOLWEBCLIENTID=${USER_POOL_CLIENT_ID}
VITE_IDENTITYPOOLID=${IDENTITY_POOL_ID}
VITE_WIKI_IMAGE_BUCKET_NAME=${MEDIA_BUCKET_NAME}
VITE_OBJECT_BUCKET_NAME=${OBJECT_BUCKET_NAME}
EOF

echo "Generated .env:"
cat wikicollector-frontend/.env

cd wikicollector-frontend
yarn install
yarn build
cd ..


# 6. フロントエンドファイルのアップロードとキャッシュ無効化
echo "[5/5] Uploading assets to S3 and invalidating CloudFront..."
aws s3 sync wikicollector-frontend/dist/ s3://${WEB_BUCKET_NAME}/ --delete
aws cloudfront create-invalidation --distribution-id ${DISTRIBUTION_ID} --paths "/*"

echo "--------------------------------------------------"
echo "Deployment Complete!"
echo "Site URL: ${SITE_URL}"
echo "--------------------------------------------------"
