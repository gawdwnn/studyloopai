#!/bin/bash

# Apply RLS Policies to Local Supabase
# Usage: ./scripts/apply-local-policies.sh [policy-file.sql]

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Local Supabase connection string
LOCAL_DB="postgresql://postgres:postgres@localhost:54322/postgres"
POLICIES_DIR="drizzle/policies"

# Check if local Supabase is running
if ! psql "$LOCAL_DB" -c "SELECT 1" &> /dev/null; then
    echo -e "${RED}✗ Error: Cannot connect to local Supabase${NC}"
    echo -e "${YELLOW}Make sure Supabase is running: supabase start${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Local Supabase Policy Manager${NC}\n"

# Function to apply a single policy file
apply_policy() {
    local file=$1
    local filename=$(basename "$file")

    echo -e "${BLUE}Applying: ${filename}${NC}"

    if psql "$LOCAL_DB" -f "$file" 2>&1 | grep -q "already exists"; then
        echo -e "${YELLOW}⚠ Policy already exists - skipping${NC}"
    elif psql "$LOCAL_DB" -f "$file" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Successfully applied: ${filename}${NC}"
    else
        echo -e "${RED}✗ Failed to apply: ${filename}${NC}"
        return 1
    fi
}

# If a specific file is provided
if [ $# -eq 1 ]; then
    if [ -f "$POLICIES_DIR/$1" ]; then
        apply_policy "$POLICIES_DIR/$1"
    elif [ -f "$1" ]; then
        apply_policy "$1"
    else
        echo -e "${RED}✗ Policy file not found: $1${NC}"
        exit 1
    fi
    exit 0
fi

# Apply all policies
echo -e "Applying all policies from ${BLUE}${POLICIES_DIR}${NC}\n"

success_count=0
skip_count=0
fail_count=0

for file in "$POLICIES_DIR"/*.sql; do
    if [ -f "$file" ]; then
        if apply_policy "$file"; then
            ((success_count++))
        else
            ((fail_count++))
        fi
    fi
done

# Summary
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Success: ${success_count}${NC}"
echo -e "${YELLOW}⚠ Skipped: ${skip_count}${NC}"
echo -e "${RED}✗ Failed: ${fail_count}${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ $fail_count -gt 0 ]; then
    exit 1
fi
