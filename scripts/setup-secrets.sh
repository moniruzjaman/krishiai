#!/bin/bash
set -euo pipefail

# Krishi AI - Kubernetes Secrets Setup Script
# Usage: ./scripts/setup-secrets.sh [namespace]
#
# Required environment variables:
#   GEMINI_API_KEY  - Your Google Gemini API key
#   OPENAI_API_KEY  - Your OpenAI API key (optional)

NAMESPACE="${1:-krishi-ai}"

echo "================================================"
echo "  Krishi AI - Secrets Setup"
echo "  Namespace: ${NAMESPACE}"
echo "================================================"

# Check kubectl
if ! command -v kubectl &> /dev/null; then
    echo "ERROR: kubectl is not installed."
    exit 1
fi

# Generate secure random values
SECRET_KEY=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
DATABASE_PASSWORD=$(openssl rand -base64 24)
POSTGRES_PASSWORD=$(openssl rand -base64 24)

# Check for API keys
if [ -z "${GEMINI_API_KEY:-}" ]; then
    echo ""
    echo "  WARNING: GEMINI_API_KEY is not set."
    echo "  The secret will be created with a placeholder value."
    echo "  Update it later with:"
    echo "    kubectl edit secret krishi-ai-secrets -n ${NAMESPACE}"
    echo ""
    GEMINI_API_VALUE="REPLACE_WITH_YOUR_GEMINI_API_KEY"
else
    GEMINI_API_VALUE="${GEMINI_API_KEY}"
fi

if [ -z "${OPENAI_API_KEY:-}" ]; then
    OPENAI_API_VALUE="REPLACE_WITH_YOUR_OPENAI_API_KEY"
else
    OPENAI_API_VALUE="${OPENAI_API_KEY}"
fi

# Create namespace
echo "[1/3] Ensuring namespace exists..."
kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -

# Delete existing secret (if any)
echo "[2/3] Removing old secrets (if any)..."
kubectl delete secret krishi-ai-secrets -n "${NAMESPACE}" --ignore-not-found

# Create new secret
echo "[3/3] Creating secrets..."
kubectl create secret generic krishi-ai-secrets \
    --namespace="${NAMESPACE}" \
    --from-literal=SECRET_KEY="${SECRET_KEY}" \
    --from-literal=JWT_SECRET="${JWT_SECRET}" \
    --from-literal=DATABASE_PASSWORD="${DATABASE_PASSWORD}" \
    --from-literal=POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" \
    --from-literal=GEMINI_API_KEY="${GEMINI_API_VALUE}" \
    --from-literal=OPENAI_API_KEY="${OPENAI_API_VALUE}"

echo ""
echo "================================================"
echo "  Secrets Created Successfully!"
echo "================================================"
echo ""
echo "  Generated secrets:"
echo "    SECRET_KEY:         ${SECRET_KEY:0:16}..."
echo "    JWT_SECRET:         ${JWT_SECRET:0:16}..."
echo "    DATABASE_PASSWORD:  ${DATABASE_PASSWORD:0:16}..."
echo "    POSTGRES_PASSWORD:  ${POSTGRES_PASSWORD:0:16}..."
echo "    GEMINI_API_KEY:     ${GEMINI_API_VALUE:0:16}..."
echo "    OPENAI_API_KEY:     ${OPENAI_API_VALUE:0:16}..."
echo ""
echo "  To update API keys later:"
echo "    export GEMINI_API_KEY='your-key'"
echo "    export OPENAI_API_KEY='your-key'"
echo "    ./scripts/setup-secrets.sh"
echo ""
echo "  To view secrets (base64 decoded):"
echo "    kubectl get secret krishi-ai-secrets -n ${NAMESPACE} -o jsonpath='{.data}' | jq"
echo ""
