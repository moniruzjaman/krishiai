#!/bin/bash
set -euo pipefail

# Krishi AI - Docker Image Build & Push Script
# Usage: ./scripts/build-images.sh [--push] [--tag TAG]

PUSH=false
TAG="latest"
REGISTRY="moniruzjaman"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --push) PUSH=true; shift ;;
        --tag) TAG="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "================================================"
echo "  Krishi AI - Docker Image Build"
echo "  Registry: ${REGISTRY}"
echo "  Tag: ${TAG}"
echo "  Push: ${PUSH}"
echo "================================================"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "ERROR: docker is not installed."
    exit 1
fi

# Build backend image
echo ""
echo "[1/2] Building backend image..."
cd "${PROJECT_ROOT}/krishi-ai-backend"
docker build \
    -f Dockerfile.k8s \
    -t "${REGISTRY}/krishi-ai-backend:${TAG}" \
    -t "${REGISTRY}/krishi-ai-backend:latest" \
    .

echo "  Backend image built: ${REGISTRY}/krishi-ai-backend:${TAG}"

# Build web image
echo ""
echo "[2/2] Building web frontend image..."
cd "${PROJECT_ROOT}"
docker build \
    -f Dockerfile.web \
    -t "${REGISTRY}/krishi-ai-web:${TAG}" \
    -t "${REGISTRY}/krishi-ai-web:latest" \
    .

echo "  Web image built: ${REGISTRY}/krishi-ai-web:${TAG}"

# Push images
if [ "${PUSH}" = true ]; then
    echo ""
    echo "Pushing images to registry..."
    docker push "${REGISTRY}/krishi-ai-backend:${TAG}"
    docker push "${REGISTRY}/krishi-ai-backend:latest"
    docker push "${REGISTRY}/krishi-ai-web:${TAG}"
    docker push "${REGISTRY}/krishi-ai-web:latest"
    echo "  All images pushed successfully!"
else
    echo ""
    echo "  Skipping push. Use --push flag to push images."
    echo "  Example: ./scripts/build-images.sh --push"
fi

echo ""
echo "================================================"
echo "  Build Complete!"
echo "================================================"
echo ""
echo "  Images:"
echo "    ${REGISTRY}/krishi-ai-backend:${TAG}"
echo "    ${REGISTRY}/krishi-ai-web:${TAG}"
echo ""
echo "  To push:  docker push ${REGISTRY}/krishi-ai-backend:${TAG}"
echo ""
