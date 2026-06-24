#!/bin/bash

# Exit immediately if any command fails
set -e

# Check if a version tag was provided
if [ -z "$1" ]; then
    echo "❌ Error: No version tag provided."
    echo "Usage: ./release.sh <version_tag>"
    echo "Example: ./release.sh v3.0.3"
    exit 1
fi

VERSION=$1
PROD_BRANCH="master"  # Change to "main" if your repo uses main

echo "🚀 Starting release process for $VERSION..."

echo ""
echo "📦 [1/3] Updating staging and creating tag..."
git checkout staging
git pull origin staging
git tag -a "$VERSION" -m "ModelSEED.org Version $VERSION"
git push origin "$VERSION"

echo ""
echo "🚢 [2/3] Merging tag into production branch ($PROD_BRANCH)..."
git checkout "$PROD_BRANCH"
git pull origin "$PROD_BRANCH"
git merge "$VERSION"
git push origin "$PROD_BRANCH"

echo ""
echo "✅ [3/3] Release $VERSION pushed to remote successfully!"
echo ""
echo "================================================================="
echo "🖥️  NEXT STEPS ON THE PRODUCTION SERVER"
echo "================================================================="
echo "Log into your production environment (e.g., poplar:/vol/model-prod)"
echo "and run these two commands to cleanly switch to the new release:"
echo ""
echo "  git fetch origin --tags"
echo "  git checkout $VERSION"
echo "================================================================="
