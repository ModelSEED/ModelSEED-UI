#!/usr/bin/env bash
set -euo pipefail

TARGET_MODE="${1:-${NEXT_PUBLIC_DEPLOYMENT_MODE:-}}"
AUTO_YES="${AUTO_YES:-false}"
EXEC_METHOD="${EXEC_METHOD:-}"

if [[ "${TARGET_MODE}" == "--yes" ]]; then
    TARGET_MODE=""
    AUTO_YES="true"
fi
if [[ "${2:-}" == "--yes" ]]; then
    AUTO_YES="true"
fi

if [ -f "VERSION.md" ]; then
    export NEXT_PUBLIC_GIT_VERSION
    NEXT_PUBLIC_GIT_VERSION=$(xargs < VERSION.md)
else
    echo "Warning: VERSION.md not found. Defaulting to 'unknown'."
    export NEXT_PUBLIC_GIT_VERSION="unknown"
fi

export NEXT_PUBLIC_GIT_COMMIT
NEXT_PUBLIC_GIT_COMMIT=$(git rev-parse HEAD 2>/dev/null | cut -c 1-6 || echo "unknown")

export NEXT_PUBLIC_GIT_BRANCH
NEXT_PUBLIC_GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

if [ -z "${TARGET_MODE}" ]; then
    case "${NEXT_PUBLIC_GIT_BRANCH}" in
        main|master|production)
            TARGET_MODE="production"
            ;;
        *)
            TARGET_MODE="staging"
            ;;
    esac
fi

if [ -t 0 ] && [ "${AUTO_YES}" != "true" ]; then
    echo "Select deployment environment:"
    echo "  1) Staging    (host port 3000 / dev)"
    echo "  2) Production (host port 3001 / build)"
    read -r -p "Enter choice [1 or 2, default based on branch: ${TARGET_MODE}]: " env_choice
    case "${env_choice}" in
        1) TARGET_MODE="staging" ;;
        2) TARGET_MODE="production" ;;
        "") ;;
        *)
            echo "Invalid choice. Exiting."
            exit 1
            ;;
    esac

    echo ""
    echo "Select execution method:"
    echo "  1) Docker (default)"
    echo "  2) Local (npm)"
    read -r -p "Enter choice [1 or 2]: " exec_choice
    case "${exec_choice}" in
        2) EXEC_METHOD="local" ;;
        *) EXEC_METHOD="docker" ;;
    esac
fi

# Set default execution method if still not set (e.g., non-interactive or automated)
EXEC_METHOD="${EXEC_METHOD:-docker}"

if [[ "${TARGET_MODE}" != "staging" && "${TARGET_MODE}" != "production" ]]; then
    echo "Invalid deployment mode: ${TARGET_MODE}. Use staging or production."
    exit 1
fi

ENV_DISPLAY_NAME=$(printf '%s' "${TARGET_MODE}" | tr '[:lower:]' '[:upper:]')

export NEXT_PUBLIC_DEPLOYMENT_MODE="${TARGET_MODE}"
export NEXT_PUBLIC_DEPLOY_DATE
NEXT_PUBLIC_DEPLOY_DATE=$(date +"%B %-d, %Y")

echo "========================================"
echo "Ready to build ModelSEED UI for ${ENV_DISPLAY_NAME}:"
echo " Version:   $NEXT_PUBLIC_GIT_VERSION"
echo " Commit:    $NEXT_PUBLIC_GIT_COMMIT"
echo " Branch:    $NEXT_PUBLIC_GIT_BRANCH"
echo " Mode:      $NEXT_PUBLIC_DEPLOYMENT_MODE"
echo " Date:      $NEXT_PUBLIC_DEPLOY_DATE"
if [[ "${EXEC_METHOD}" == "docker" ]]; then
echo " Execution: Docker (Profile: $TARGET_MODE)"
else
echo " Execution: Local (npm)"
fi
echo "========================================"
echo ""

if [ -t 0 ] && [ "${AUTO_YES}" != "true" ]; then
    read -r -p "Trigger Build? [y/N]: " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        echo "Build aborted. No changes were made."
        exit 0
    fi
fi

if [[ "${EXEC_METHOD}" == "docker" ]]; then
    echo "Starting process for ${ENV_DISPLAY_NAME} via Docker..."
    docker compose --profile "${TARGET_MODE}" up -d --build
else
    echo "Starting local execution for ${ENV_DISPLAY_NAME} via npm..."
    echo "Installing dependencies..."
    npm install
    
    if [[ "${TARGET_MODE}" == "production" ]]; then
        echo "Building for production..."
        npm run build
        echo "Starting production server..."
        npm run start
    else
        echo "Starting development server..."
        npm run dev
    fi
fi