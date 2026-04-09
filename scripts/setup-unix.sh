#!/bin/bash

# ============================================
# IMS Local Setup Script for macOS/Linux
# ============================================
# This script automates the setup process for local development on macOS/Linux
# 
# Usage: bash scripts/setup-unix.sh
# 
# Requirements:
# - Bash 4.0+
# - Node.js 18+
# - pnpm
# - MySQL 8.0+

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Functions
print_status() {
    local message=$1
    local type=${2:-"info"}
    
    case $type in
        success)
            echo -e "${GREEN}✓ $message${NC}"
            ;;
        error)
            echo -e "${RED}✗ $message${NC}"
            ;;
        warning)
            echo -e "${YELLOW}⚠ $message${NC}"
            ;;
        *)
            echo -e "${CYAN}ℹ $message${NC}"
            ;;
    esac
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# ============================================
# 1. Check Prerequisites
# ============================================
print_status "=== Checking Prerequisites ===" "info"

if command_exists node; then
    NODE_VERSION=$(node --version)
    print_status "Node.js installed: $NODE_VERSION" "success"
else
    print_status "Node.js not found. Please install from https://nodejs.org" "error"
    exit 1
fi

if command_exists pnpm; then
    PNPM_VERSION=$(pnpm --version)
    print_status "pnpm installed: $PNPM_VERSION" "success"
else
    print_status "pnpm not found. Installing..." "warning"
    npm install -g pnpm
fi

if command_exists mysql; then
    MYSQL_VERSION=$(mysql --version)
    print_status "MySQL installed: $MYSQL_VERSION" "success"
else
    print_status "MySQL not found. Please install from https://dev.mysql.com/downloads/mysql" "error"
    exit 1
fi

# ============================================
# 2. Install Dependencies
# ============================================
print_status "" "info"
print_status "=== Installing Dependencies ===" "info"

if [ -d "node_modules" ]; then
    print_status "Dependencies already installed" "success"
else
    print_status "Installing npm packages..." "info"
    pnpm install
    
    if [ $? -eq 0 ]; then
        print_status "Dependencies installed successfully" "success"
    else
        print_status "Failed to install dependencies" "error"
        exit 1
    fi
fi

# ============================================
# 3. Setup Environment Configuration
# ============================================
print_status "" "info"
print_status "=== Setting Up Environment Configuration ===" "info"

if [ -f ".env.local" ]; then
    print_status ".env.local already exists" "success"
    read -p "Overwrite .env.local? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cp ".env.local.example" ".env.local"
        print_status ".env.local created from template" "success"
    else
        print_status "Skipping .env.local setup" "info"
    fi
else
    cp ".env.local.example" ".env.local"
    print_status ".env.local created from template" "success"
fi

# Prompt for MySQL password
print_status "" "info"
print_status "Enter your MySQL root password:" "info"
read -s MYSQL_PASSWORD

# Update DATABASE_URL in .env.local
sed -i.bak "s/DATABASE_URL=mysql:\/\/root:[^@]*@/DATABASE_URL=mysql:\/\/root:$MYSQL_PASSWORD@/" .env.local
rm -f .env.local.bak

print_status ".env.local configured with MySQL password" "success"

# Prompt for admin email (optional)
print_status "" "info"
read -p "Enter admin email (press Enter for default: mdrwesh@outlook.com): " ADMIN_EMAIL

if [ ! -z "$ADMIN_EMAIL" ]; then
    sed -i.bak "s/ADMIN_EMAIL=.*/ADMIN_EMAIL=$ADMIN_EMAIL/" .env.local
    rm -f .env.local.bak
    print_status "Admin email updated: $ADMIN_EMAIL" "success"
fi

# ============================================
# 4. Setup Database
# ============================================
print_status "" "info"
print_status "=== Setting Up Database ===" "info"

# Create database
print_status "Creating database..." "info"
mysql -u root -p"$MYSQL_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS ims_local CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

if [ $? -eq 0 ]; then
    print_status "Database created successfully" "success"
else
    print_status "Failed to create database" "error"
    exit 1
fi

# Run migrations
print_status "Running database migrations..." "info"
pnpm db:push

if [ $? -eq 0 ]; then
    print_status "Database migrations completed" "success"
else
    print_status "Database migrations failed" "error"
    exit 1
fi

# Seed database
print_status "Seeding database with test data..." "info"
pnpm db:seed

if [ $? -eq 0 ]; then
    print_status "Database seeded successfully" "success"
else
    print_status "Database seeding failed" "error"
    exit 1
fi

# ============================================
# 5. Verify Setup
# ============================================
print_status "" "info"
print_status "=== Verifying Setup ===" "info"

checks=(
    ".env.local:exists"
    "node_modules:exists"
    "drizzle/schema.ts:exists"
)

all_checks=true
for check in "${checks[@]}"; do
    IFS=':' read -r path type <<< "$check"
    
    if [ -e "$path" ]; then
        print_status "$path exists" "success"
    else
        print_status "$path missing" "error"
        all_checks=false
    fi
done

# ============================================
# 6. Summary and Next Steps
# ============================================
print_status "" "info"
print_status "=== Setup Complete ===" "success"

cat << 'EOF'

Next steps:

1. Start the development server:
   pnpm dev

2. Open your browser:
   http://localhost:5173

3. Mock login will appear automatically
   - Use the default admin user from .env.local
   - Or enter any email/password (not validated in dev mode)

4. For more information:
   - Read LOCAL_LAUNCH_README.md
   - Read LOCAL_LAUNCH_IMPLEMENTATION.md
   - Read VITE_LOCALHOST_CONFIG.md

Useful commands:
   pnpm dev          - Start development server
   pnpm build        - Build for production
   pnpm test         - Run tests
   pnpm db:push      - Run database migrations
   pnpm db:seed      - Seed database with test data
   pnpm db:reset     - Reset database (drop and recreate)

EOF

print_status "Happy coding! 🚀" "success"
