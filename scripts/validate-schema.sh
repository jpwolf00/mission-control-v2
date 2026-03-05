#!/bin/bash
# Validation script for MC2 Schema V1
# Checks file presence and basic SQL syntax (no DB required)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=== MC2 Schema V1 Validation ==="
echo "Project root: $PROJECT_ROOT"
echo ""

# Track errors
ERRORS=0

# Check required files exist
echo "Checking file presence..."
required_files=(
    "docs/DB_SCHEMA_V1.md"
    "sql/001_init.sql"
    "docs/MIGRATION_RUNBOOK.md"
)

for file in "${required_files[@]}"; do
    filepath="$PROJECT_ROOT/$file"
    if [ -f "$filepath" ]; then
        echo "  ✓ $file exists"
    else
        echo "  ✗ $file MISSING"
        ERRORS=$((ERRORS + 1))
    fi
done
echo ""

# Validate SQL syntax patterns (basic grep checks)
echo "Validating SQL syntax patterns..."
sql_file="$PROJECT_ROOT/sql/001_init.sql"

if [ -f "$sql_file" ]; then
    # Check for CREATE TABLE statements
    table_count=$(grep -c "CREATE TABLE" "$sql_file" || true)
    if [ "$table_count" -ge 5 ]; then
        echo "  ✓ Found $table_count CREATE TABLE statements (expected 5)"
    else
        echo "  ✗ Only found $table_count CREATE TABLE statements (expected 5)"
        ERRORS=$((ERRORS + 1))
    fi
    
    # Check for required tables
    for table in stories story_gates story_events dispatch_locks run_sessions; do
        if grep -q "CREATE TABLE.*$table" "$sql_file"; then
            echo "  ✓ Table '$table' defined"
        else
            echo "  ✗ Table '$table' NOT found"
            ERRORS=$((ERRORS + 1))
        fi
    done
    
    # Check for UUID extension
    if grep -q "uuid-ossp" "$sql_file"; then
        echo "  ✓ UUID extension included"
    else
        echo "  ✗ UUID extension NOT found"
        ERRORS=$((ERRORS + 1))
    fi
    
    # Check for PRIMARY KEY
    if grep -q "PRIMARY KEY" "$sql_file"; then
        echo "  ✓ PRIMARY KEY constraints found"
    else
        echo "  ✗ PRIMARY KEY constraints NOT found"
        ERRORS=$((ERRORS + 1))
    fi
    
    # Check for FOREIGN KEY / REFERENCES
    if grep -q -E "FOREIGN KEY|REFERENCES" "$sql_file"; then
        echo "  ✓ FOREIGN KEY constraints found"
    else
        echo "  ✗ FOREIGN KEY constraints NOT found"
        ERRORS=$((ERRORS + 1))
    fi
    
    # Check for CREATE INDEX
    if grep -q "CREATE INDEX" "$sql_file"; then
        echo "  ✓ Indexes defined"
    else
        echo "  ✗ No indexes found"
        ERRORS=$((ERRORS + 1))
    fi
fi
echo ""

# Validate schema markdown has all tables documented
echo "Validating schema documentation..."
schema_file="$PROJECT_ROOT/docs/DB_SCHEMA_V1.md"
if [ -f "$schema_file" ]; then
    for table in stories story_gates story_events dispatch_locks run_sessions; do
        if grep -q "### $table" "$schema_file"; then
            echo "  ✓ Table '$table' documented"
        else
            echo "  ✗ Table '$table' NOT documented"
            ERRORS=$((ERRORS + 1))
        fi
    done
fi
echo ""

# Validate runbook has required sections
echo "Validating migration runbook..."
runbook_file="$PROJECT_ROOT/docs/MIGRATION_RUNBOOK.md"
if [ -f "$runbook_file" ]; then
    for section in "Apply Migration" "Rollback Migration" "Verification"; do
        if grep -q "$section" "$runbook_file"; then
            echo "  ✓ Section '$section' present"
        else
            echo "  ✗ Section '$section' MISSING"
            ERRORS=$((ERRORS + 1))
        fi
    done
fi
echo ""

# Summary
echo "=== Validation Summary ==="
if [ $ERRORS -eq 0 ]; then
    echo "✓ All validations passed!"
    exit 0
else
    echo "✗ $ERRORS validation(s) failed"
    exit 1
fi
