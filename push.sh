#!/bin/bash

# Exit immediately if any command fails
set -e

# Color definitions for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Error message function
error_exit() {
    echo -e "${RED}Error: $1${NC}" >&2
    
    # Switch to dev branch if error occurs
    git checkout dev 2>/dev/null || true
    
    exit 1
}

# Info message function
info() {
    echo -e "${YELLOW}$1${NC}"
}

# Success message function
success() {
    echo -e "${GREEN}$1${NC}"
}

info "Switching to main branch..."
git checkout main || error_exit "Failed to switch to main branch"

info "Fetching updates from dev branch..."
git fetch origin dev || error_exit "Failed to fetch updates from dev branch"

info "Merging dev branch into main..."
git merge dev || error_exit "Failed to merge branches"

info "Pushing changes to remote repository..."
git push origin main || error_exit "Failed to push changes"

info "Publishing to NPM..."
npm publish || error_exit "Failed to publish to NPM"

info "Switching back to dev branch..."
git checkout dev || error_exit "Failed to switch to dev branch"

success "All operations completed successfully! 🚀"