#!/bin/bash

# Configuration validation script for TechniZlecenia deployment
# Usage: ./check-config.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}=== TechniZlecenia Deployment Configuration Check ===${NC}"
echo ""

# Check project structure
echo -e "${BLUE}Checking project structure...${NC}"
check_file_exists() {
    local file="$1"
    local description="$2"
    
    if [[ -f "$file" ]]; then
        echo -e "  ${GREEN}✓${NC} $description"
    else
        echo -e "  ${RED}✗${NC} $description (missing: $file)"
        return 1
    fi
}

check_dir_exists() {
    local dir="$1"
    local description="$2"
    
    if [[ -d "$dir" ]]; then
        echo -e "  ${GREEN}✓${NC} $description"
    else
        echo -e "  ${RED}✗${NC} $description (missing: $dir)"
        return 1
    fi
}

# Project structure checks
structure_ok=true
check_file_exists "$PROJECT_ROOT/api/Cargo.toml" "API Cargo.toml" || structure_ok=false
check_dir_exists "$PROJECT_ROOT/api/src" "API source directory" || structure_ok=false
check_dir_exists "$PROJECT_ROOT/api/migrations" "Database migrations" || structure_ok=false
check_file_exists "$PROJECT_ROOT/web/package.json" "Web package.json" || structure_ok=false
check_dir_exists "$PROJECT_ROOT/web/src" "Web source directory" || structure_ok=false
check_file_exists "$PROJECT_ROOT/docker-compose.yml" "Docker Compose configuration" || structure_ok=false

echo ""

# Check required tools
echo -e "${BLUE}Checking required tools...${NC}"
tools_ok=true

check_tool() {
    local tool="$1"
    local description="$2"
    local required="$3"
    
    if command -v "$tool" >/dev/null 2>&1; then
        local version_info=""
        case "$tool" in
            "cargo")
                version_info=" ($(cargo --version | cut -d' ' -f2))"
                ;;
            "node")
                version_info=" ($(node --version))"
                ;;
            "docker")
                version_info=" ($(docker --version | cut -d' ' -f3 | tr -d ','))"
                ;;
            "ssh")
                version_info=" ($(ssh -V 2>&1 | head -n1 | cut -d' ' -f1))"
                ;;
        esac
        echo -e "  ${GREEN}✓${NC} $description$version_info"
    else
        if [[ "$required" == "true" ]]; then
            echo -e "  ${RED}✗${NC} $description (required)"
            tools_ok=false
        else
            echo -e "  ${YELLOW}⚠${NC} $description (optional)"
        fi
    fi
}

# Required tools
check_tool "ssh" "SSH client" "true"
check_tool "scp" "SCP client" "true"
check_tool "cargo" "Rust/Cargo" "true"
check_tool "node" "Node.js" "true"
check_tool "npm" "NPM" "true"

# Optional but recommended tools
check_tool "docker" "Docker" "false"
check_tool "curl" "cURL" "false"
check_tool "nc" "Netcat" "false"
check_tool "psql" "PostgreSQL client" "false"
check_tool "sqlx" "SQLx CLI" "false"

echo ""

# Check SSH connectivity
echo -e "${BLUE}Checking SSH connectivity...${NC}"
ssh_ok=true

VPS_HOST="root@206.189.52.131"
if ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -o BatchMode=yes "$VPS_HOST" "echo 'SSH connection successful'" >/dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} SSH connection to VPS successful"
else
    echo -e "  ${RED}✗${NC} Cannot connect to VPS ($VPS_HOST)"
    echo "    Please check:"
    echo "    - SSH keys are set up correctly"
    echo "    - VPS is accessible"
    echo "    - Network connectivity"
    ssh_ok=false
fi

echo ""

# Check environment files
echo -e "${BLUE}Checking environment configuration...${NC}"
env_ok=true

# Check if config directory exists
if [[ -d "$SCRIPT_DIR/config" ]]; then
    echo -e "  ${GREEN}✓${NC} Config directory exists"
    
    # Check for generated environment files
    for env_file in "current-api.env" "current-web.env" "current-db.env"; do
        if [[ -f "$SCRIPT_DIR/config/$env_file" ]]; then
            echo -e "  ${GREEN}✓${NC} $env_file exists"
        else
            echo -e "  ${YELLOW}⚠${NC} $env_file missing (will be generated on first run)"
        fi
    done
else
    echo -e "  ${YELLOW}⚠${NC} Config directory missing (will be created on first run)"
fi

echo ""

# Summary
echo -e "${CYAN}=== Configuration Check Summary ===${NC}"
echo ""

if [[ "$structure_ok" == "true" ]]; then
    echo -e "${GREEN}✓ Project Structure: OK${NC}"
else
    echo -e "${RED}✗ Project Structure: Issues found${NC}"
fi

if [[ "$tools_ok" == "true" ]]; then
    echo -e "${GREEN}✓ Required Tools: All available${NC}"
else
    echo -e "${RED}✗ Required Tools: Some missing${NC}"
fi

if [[ "$ssh_ok" == "true" ]]; then
    echo -e "${GREEN}✓ SSH Connectivity: OK${NC}"
else
    echo -e "${RED}✗ SSH Connectivity: Failed${NC}"
fi

echo ""

if [[ "$structure_ok" == "true" && "$tools_ok" == "true" && "$ssh_ok" == "true" ]]; then
    echo -e "${GREEN}🎉 Configuration check passed! Ready for deployment.${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Run: ./deploy.sh status"
    echo "  2. Start components: ./deploy.sh start all"
    exit 0
else
    echo -e "${RED}❌ Configuration issues found. Please fix the issues above before deploying.${NC}"
    exit 1
fi
