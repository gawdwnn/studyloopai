#!/bin/bash

# Apply RLS Policies to Local Supabase
# Usage: ./scripts/apply-local-policies.sh [--force] [policy-file.sql]
#
# Options:
#   --force    Drop existing policies before reapplying (forces recreation)
#
# Examples:
#   ./scripts/apply-local-policies.sh                           # Apply all policies (skip existing)
#   ./scripts/apply-local-policies.sh --force                   # Reapply all policies
#   ./scripts/apply-local-policies.sh users_rls.sql             # Apply specific policy
#   ./scripts/apply-local-policies.sh --force users_rls.sql     # Reapply specific policy

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

# Parse command line arguments
FORCE_REAPPLY=false
POLICY_FILE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --force|-f)
            FORCE_REAPPLY=true
            shift
            ;;
        *)
            POLICY_FILE="$1"
            shift
            ;;
    esac
done

# Check if local Supabase is running
if ! psql "$LOCAL_DB" -c "SELECT 1" &> /dev/null; then
    echo -e "${RED}✗ Error: Cannot connect to local Supabase${NC}"
    echo -e "${YELLOW}Make sure Supabase is running: supabase start${NC}"
    exit 1
fi

echo -e "${BLUE}Local Supabase Policy Manager${NC}"
if [ "$FORCE_REAPPLY" = true ]; then
    echo -e "${YELLOW}Force mode enabled - policies will be dropped and recreated${NC}"
fi
echo ""

# Function to generate DROP statements for policies in a file
generate_drop_statements() {
    local file=$1
    local temp_file=$(mktemp)

    # Extract policy names and table names from multi-line CREATE POLICY statements
    # Read file and combine CREATE POLICY with ON lines
    perl -ne '
        if (/CREATE POLICY "([^"]+)"/) {
            $policy = $1;
            $_ = <>;
            if (/ON "([^"]+)"/) {
                print "DROP POLICY IF EXISTS \"$policy\" ON \"$1\";\n";
            }
        }
    ' "$file" > "$temp_file"

    echo "$temp_file"
}

# Function to apply a single policy file
apply_policy() {
    local file=$1
    local filename=$(basename "$file")

    echo -e "${BLUE}Applying: ${filename}${NC}"

    if [ "$FORCE_REAPPLY" = true ]; then
        # Generate DROP statements
        local drop_file=$(generate_drop_statements "$file")

        # Apply DROP statements first
        if [ -s "$drop_file" ]; then
            echo -e "${YELLOW}  Dropping existing policies...${NC}"
            local drop_output
            drop_output=$(psql "$LOCAL_DB" -f "$drop_file" 2>&1)
            if [ $? -ne 0 ] && ! echo "$drop_output" | grep -q "does not exist"; then
                echo -e "${YELLOW}  Warning: Some DROP statements failed${NC}"
            fi
        fi
        rm -f "$drop_file"

        # Apply the policy file
        local apply_output
        apply_output=$(psql "$LOCAL_DB" -f "$file" 2>&1)
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Successfully applied: ${filename}${NC}"
        else
            echo -e "${RED}✗ Failed to apply: ${filename}${NC}"
            echo -e "${RED}Error: ${apply_output}${NC}"
            return 1
        fi
    else
        # Non-force mode - skip if exists, single psql execution
        local apply_output
        apply_output=$(psql "$LOCAL_DB" -f "$file" 2>&1)
        local exit_code=$?

        if echo "$apply_output" | grep -q "already exists"; then
            echo -e "${YELLOW}⚠ Policy already exists - skipping${NC}"
            ((skip_count++))
            return 0
        elif [ $exit_code -eq 0 ]; then
            echo -e "${GREEN}✓ Successfully applied: ${filename}${NC}"
        else
            echo -e "${RED}✗ Failed to apply: ${filename}${NC}"
            echo -e "${RED}Error: ${apply_output}${NC}"
            return 1
        fi
    fi
}

# If a specific file is provided
if [ -n "$POLICY_FILE" ]; then
    if [ -f "$POLICIES_DIR/$POLICY_FILE" ]; then
        apply_policy "$POLICIES_DIR/$POLICY_FILE"
    elif [ -f "$POLICY_FILE" ]; then
        apply_policy "$POLICY_FILE"
    else
        echo -e "${RED}✗ Policy file not found: $POLICY_FILE${NC}"
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
