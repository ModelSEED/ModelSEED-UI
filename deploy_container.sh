#!/usr/bin/env bash

# 1. Select Environment
echo "Select deployment environment:"
echo "  1) Staging    (Port 3000)"
echo "  2) Production (Port 3001)"
read -p "Enter choice [1 or 2]: " env_choice

if [ "$env_choice" == "1" ]; then
    TARGET_PROFILE="staging"
    ENV_DISPLAY_NAME="STAGING"
elif [ "$env_choice" == "2" ]; then
    TARGET_PROFILE="production"
    ENV_DISPLAY_NAME="PRODUCTION"
else
    echo "Invalid choice. Exiting."
    exit 1
fi

echo ""

# 2. Grab the manually set version from VERSION.md
if [ -f "VERSION.md" ]; then
    export NEXT_PUBLIC_GIT_VERSION=$(cat VERSION.md | xargs)
else
    echo "Warning: VERSION.md not found. Defaulting to 'unknown'."
    export NEXT_PUBLIC_GIT_VERSION="unknown"
fi

# 3. Get strictly the first 6 characters of the current commit hash
export NEXT_PUBLIC_GIT_COMMIT=$(git rev-parse HEAD 2>/dev/null | cut -c 1-6 || echo "unknown")

# 4. Get the current Git branch
export NEXT_PUBLIC_GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

# 5. Set human-readable date
export NEXT_PUBLIC_DEPLOY_DATE=$(date +"%B %-d, %Y")

# Display the gathered metadata
echo "========================================"
echo "Ready to build ModelSEED UI for $ENV_DISPLAY_NAME:"
echo " Version: $NEXT_PUBLIC_GIT_VERSION"
echo " Commit:  $NEXT_PUBLIC_GIT_COMMIT"
echo " Branch:  $NEXT_PUBLIC_GIT_BRANCH"
echo " Date:    $NEXT_PUBLIC_DEPLOY_DATE"
echo " Profile: $TARGET_PROFILE"
echo "========================================"
echo ""

# Ask for confirmation
read -p "Trigger Build? [y/N]: " confirm

# Check the user's input
if [[ "$confirm" =~ ^[Yy]$ ]]; then
    echo "Starting build process for $ENV_DISPLAY_NAME..."
    # The --profile flag ensures only the selected environment spins up
    docker compose --profile "$TARGET_PROFILE" up -d --build
else
    echo "Build aborted. No changes were made."
    exit 0
fi
