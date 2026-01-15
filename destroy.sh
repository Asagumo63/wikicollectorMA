#!/bin/bash
# Multi-Account Wiki Cleanup Script

# 1. 設定
COMPONENT_NAME=${1:-"wikicollector"}
ENV_NAME=${2:-"dev"}
BACKEND_STACK_NAME="${COMPONENT_NAME}-backend-${ENV_NAME}"
FRONTEND_STACK_NAME="${COMPONENT_NAME}-frontend-${ENV_NAME}"

echo "--------------------------------------------------"
echo "Starting Resource Destruction"
echo "Component: ${COMPONENT_NAME}"
echo "Environment: ${ENV_NAME}"
echo "--------------------------------------------------"

# 2. バケット名の取得 (削除前に必要)
echo "Retrieving bucket names for cleanup..."
BACKEND_OUTPUTS=$(aws cloudformation describe-stacks --stack-name ${BACKEND_STACK_NAME} --query "Stacks[0].Outputs" 2>/dev/null)
FRONTEND_OUTPUTS=$(aws cloudformation describe-stacks --stack-name ${FRONTEND_STACK_NAME} --query "Stacks[0].Outputs" 2>/dev/null)

MEDIA_BUCKET=$(echo ${BACKEND_OUTPUTS} | jq -r '.[] | select(.OutputKey=="WikiImageBucketName") | .OutputValue' 2>/dev/null)
WEB_BUCKET=$(echo ${FRONTEND_OUTPUTS} | jq -r '.[] | select(.OutputKey=="ContentsBucket") | .OutputValue' 2>/dev/null)
LOG_BUCKET=$(aws cloudformation describe-stack-resource --stack-name ${FRONTEND_STACK_NAME} --logical-resource-id LogBucket --query "StackResourceDetail.PhysicalResourceId" --output text 2>/dev/null)

# 3. S3バケットの中身を空にする (CloudFormation削除でエラーにならないように)
if [ ! -z "$MEDIA_BUCKET" ] && [ "$MEDIA_BUCKET" != "null" ]; then
    echo "Force deleting Media Bucket: ${MEDIA_BUCKET}..."
    aws s3 rb s3://${MEDIA_BUCKET} --force
fi

if [ ! -z "$WEB_BUCKET" ] && [ "$WEB_BUCKET" != "null" ]; then
    echo "Force deleting Web Bucket: ${WEB_BUCKET}..."
    aws s3 rb s3://${WEB_BUCKET} --force
fi

if [ ! -z "$LOG_BUCKET" ] && [ "$LOG_BUCKET" != "null" ]; then
    echo "Force deleting Log Bucket: ${LOG_BUCKET}..."
    aws s3 rb s3://${LOG_BUCKET} --force
fi

# 4. スタックの削除
echo "Deleting Frontend Stack: ${FRONTEND_STACK_NAME}..."
aws cloudformation delete-stack --stack-name ${FRONTEND_STACK_NAME}

echo "Deleting Backend Stack: ${BACKEND_STACK_NAME}..."
aws cloudformation delete-stack --stack-name ${BACKEND_STACK_NAME}

echo "Waiting for stack deletion to complete..."
aws cloudformation wait stack-delete-complete --stack-name ${FRONTEND_STACK_NAME}
aws cloudformation wait stack-delete-complete --stack-name ${BACKEND_STACK_NAME}

echo "--------------------------------------------------"
echo "Cleanup Complete!"
echo "--------------------------------------------------"
