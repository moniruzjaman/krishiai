#!/bin/bash
set -euo pipefail

# Krishi AI - Kubernetes Deployment Script
# Usage: ./scripts/deploy.sh [namespace]

NAMESPACE="${1:-krishi-ai}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
K8S_DIR="$(dirname "$SCRIPT_DIR")/kubernetes"

echo "================================================"
echo "  Krishi AI - Kubernetes Deployment"
echo "  Namespace: ${NAMESPACE}"
echo "================================================"

# Check kubectl
if ! command -v kubectl &> /dev/null; then
    echo "ERROR: kubectl is not installed."
    echo "Install it from: https://kubernetes.io/docs/tasks/tools/"
    exit 1
fi

# Verify cluster connectivity
echo "[1/7] Verifying Kubernetes cluster connection..."
if ! kubectl cluster-info &> /dev/null; then
    echo "ERROR: Cannot connect to Kubernetes cluster."
    echo "Make sure your kubeconfig is set up correctly."
    exit 1
fi
echo "  Connected to cluster: $(kubectl config current-context)"

# Create namespace
echo "[2/7] Creating namespace: ${NAMESPACE}..."
kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -

# Apply ConfigMap
echo "[3/7] Applying ConfigMaps..."
kubectl apply -f "${K8S_DIR}/configmap.yaml" -n "${NAMESPACE}"

# Apply secrets (skip if already exist to avoid overwriting)
echo "[4/7] Checking secrets..."
if kubectl get secret krishi-ai-secrets -n "${NAMESPACE}" &> /dev/null; then
    echo "  Secrets already exist. Skipping (use setup-secrets.sh to update)."
else
    echo "  WARNING: No secrets found. Run ./scripts/setup-secrets.sh first!"
    echo "  Applying placeholder secrets..."
    kubectl apply -f "${K8S_DIR}/secrets.yaml" -n "${NAMESPACE}"
fi

# Apply PersistentVolumeClaims
echo "[5/7] Applying PersistentVolumeClaims..."
kubectl apply -f "${K8S_DIR}/persistent-volume.yaml" -n "${NAMESPACE}"

# Apply Stateful services (PostgreSQL, Redis)
echo "[6/7] Deploying database and cache..."
kubectl apply -f "${K8S_DIR}/postgres-deployment.yaml" -n "${NAMESPACE}"
kubectl apply -f "${K8S_DIR}/redis-deployment.yaml" -n "${NAMESPACE}"

# Wait for PostgreSQL to be ready
echo "  Waiting for PostgreSQL to be ready..."
kubectl rollout status deployment/krishi-ai-postgres -n "${NAMESPACE}" --timeout=120s

# Wait for Redis to be ready
echo "  Waiting for Redis to be ready..."
kubectl rollout status deployment/krishi-ai-redis -n "${NAMESPACE}" --timeout=60s

# Apply backend and web
echo "[7/7] Deploying backend and web applications..."
kubectl apply -f "${K8S_DIR}/backend-deployment.yaml" -n "${NAMESPACE}"
kubectl apply -f "${K8S_DIR}/backend-service.yaml" -n "${NAMESPACE}"
kubectl apply -f "${K8S_DIR}/web-deployment.yaml" -n "${NAMESPACE}"

# Wait for backend to be ready
echo "  Waiting for backend to be ready..."
kubectl rollout status deployment/krishi-ai-backend -n "${NAMESPACE}" --timeout=180s

# Wait for web to be ready
echo "  Waiting for web frontend to be ready..."
kubectl rollout status deployment/krishi-ai-web -n "${NAMESPACE}" --timeout=120s

# Apply Ingress and HPA (after services are up)
echo "Applying Ingress and HPA..."
kubectl apply -f "${K8S_DIR}/ingress.yaml" -n "${NAMESPACE}"
kubectl apply -f "${K8S_DIR}/hpa.yaml" -n "${NAMESPACE}"

# Apply ServiceMonitor (if Prometheus is installed)
if kubectl get crd servicemonitors.monitoring.coreos.com &> /dev/null; then
    echo "Applying ServiceMonitor..."
    kubectl apply -f "${K8S_DIR}/servicemonitor.yaml" -n "${NAMESPACE}"
else
    echo "  Prometheus Operator not found. Skipping ServiceMonitor."
fi

echo ""
echo "================================================"
echo "  Deployment Complete!"
echo "================================================"
echo ""
echo "  All resources in namespace: ${NAMESPACE}"
kubectl get all -n "${NAMESPACE}"
echo ""
echo "  Next steps:"
echo "  1. Configure secrets: ./scripts/setup-secrets.sh"
echo "  2. Check ingress:  kubectl get ingress -n ${NAMESPACE}"
echo "  3. View logs:       kubectl logs -f deployment/krishi-ai-backend -n ${NAMESPACE}"
echo "  4. Access services:"
echo "     kubectl port-forward -n ${NAMESPACE} svc/krishi-ai-backend-service 8000:8000"
echo "     kubectl port-forward -n ${NAMESPACE} svc/krishi-ai-web-service 3000:80"
echo ""
