#!/bin/bash

# Job Scraping System Setup & Verification Script

set -e

echo "=================================="
echo "DevOps Jobs Scraping Setup"
echo "=================================="

# 1. Verify directory structure
echo ""
echo "✓ Checking directory structure..."
if [ -d "api/jobs" ]; then
  echo "  ✓ api/jobs/ directory exists"
else
  echo "  ✗ api/jobs/ directory missing - creating..."
  mkdir -p api/jobs
fi

# 2. Check for required files
echo ""
echo "✓ Checking for required modules..."

required_files=(
  "api/jobs/index.js"
  "api/jobs/linkedin.js"
  "api/jobs/glassdoor.js"
  "api/jobs/india-boards.js"
  "api/jobs/cache.js"
)

for file in "${required_files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✓ $file exists"
  else
    echo "  ✗ $file missing"
  fi
done

# 3. Check environment configuration
echo ""
echo "✓ Checking environment configuration..."

if [ -f ".env" ]; then
  if grep -q "RAPIDAPI_KEY" .env; then
    echo "  ✓ RAPIDAPI_KEY configured"
  else
    echo "  ⚠ RAPIDAPI_KEY not set (optional, system will use fallbacks)"
  fi
  
  if grep -q "SUPABASE_SERVICE_ROLE_KEY" .env; then
    echo "  ✓ Supabase configured"
  else
    echo "  ✗ Supabase not configured (required)"
  fi
else
  echo "  ⚠ .env file not found - create one for production"
fi

# 4. Check Node.js version
echo ""
echo "✓ Checking Node.js version..."
node_version=$(node -v)
echo "  Node.js version: $node_version"

# 5. Verify server imports
echo ""
echo "✓ Verifying server imports..."
if grep -q "import { getJobs }" server/index.js; then
  echo "  ✓ getJobs import found in server/index.js"
else
  echo "  ✗ getJobs import missing - please check server/index.js"
fi

# 6. Check for job endpoint
if grep -q "/api/jobs" server/index.js; then
  echo "  ✓ /api/jobs endpoint configured"
else
  echo "  ✗ /api/jobs endpoint missing"
fi

# 7. Summary
echo ""
echo "=================================="
echo "Setup Verification Complete!"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Configure .env file with RAPIDAPI_KEY (optional but recommended)"
echo "2. Run: npm run backend"
echo "3. Test endpoint: curl -X POST http://localhost:3001/api/jobs -H 'Content-Type: application/json' -d '{\"query\":\"DevOps Engineer\",\"keywords\":[\"kubernetes\"]}'"
echo ""
echo "For more info, see: JOBS_IMPLEMENTATION.md"
