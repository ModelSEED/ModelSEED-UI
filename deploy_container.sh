#!/usr/bin/env bash

# 1. Grab the manually set version from VERSION.md
# (Checks if the file exists, reads it, and strips any accidental whitespace/newlines)
if [ -f "VERSION.md" ]; then
    export NEXT_PUBLIC_GIT_VERSION=$(cat VERSION.md | xargs)
else
    echo "Warning: VERSION.md not found. Defaulting to 'unknown'."
    export NEXT_PUBLIC_GIT_VERSION="unknown"
fi

# 2. Get strictly the first 6 characters of the current commit hash
export NEXT_PUBLIC_GIT_COMMIT=$(git rev-parse HEAD 2>/dev/null | cut -c 1-6 || echo "unknown")

# 3. Get the current Git branch
export NEXT_PUBLIC_GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

# 3.1 Resolve deployment mode unless caller explicitly sets it
if [ -z "${NEXT_PUBLIC_DEPLOYMENT_MODE}" ]; then
    case "${NEXT_PUBLIC_GIT_BRANCH}" in
        main|master|production)
            export NEXT_PUBLIC_DEPLOYMENT_MODE="production"
            ;;
        *)
            export NEXT_PUBLIC_DEPLOYMENT_MODE="staging"
            ;;
    esac
fi

# 4. Set human-readable date (e.g., "May 1, 2026")
export NEXT_PUBLIC_DEPLOY_DATE=$(date +"%B %-d, %Y")

# Display the gathered metadata
echo "========================================"
echo "Ready to build ModelSEED UI:"
echo " Version: $NEXT_PUBLIC_GIT_VERSION"
echo " Commit:  $NEXT_PUBLIC_GIT_COMMIT"
echo " Branch:  $NEXT_PUBLIC_GIT_BRANCH"
echo " Mode:    $NEXT_PUBLIC_DEPLOYMENT_MODE"
echo " Date:    $NEXT_PUBLIC_DEPLOY_DATE"
echo "========================================"
echo ""

# Ask for confirmation
read -p "Trigger Build? [y/N]: " confirm

# Check the user's input
if [[ "$confirm" =~ ^[Yy]$ ]]; then
    echo "Starting build process..."
    docker compose up -d --build
else
    echo "Build aborted. No changes were made."
    exit 0
fi
