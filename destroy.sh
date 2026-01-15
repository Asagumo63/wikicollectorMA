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

# 2. Pythonスクリプトでバケットを強力に削除
echo "Running robust bucket cleanup..."
# スタックからの自動検出に加え、明示的に取得したバケット名も渡す
python3 cleanup_buckets.py --buckets "${MEDIA_BUCKET}" "${WEB_BUCKET}" "${LOG_BUCKET}"
python3 cleanup_buckets.py ${BACKEND_STACK_NAME} ${FRONTEND_STACK_NAME}

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
