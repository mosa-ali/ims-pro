# ============================================
# IMS Local Setup Script for Windows
# ============================================
# This script automates the setup process for local development on Windows
# 
# Usage: .\scripts\setup-windows.ps1
# 
# Requirements:
# - PowerShell 5.0+
# - Node.js 18+
# - pnpm
# - MySQL 8.0+
#
# IMPORTANT: Run as Administrator for some operations

param(
    [switch]$SkipNodeCheck = $false,
    [switch]$SkipMySQLCheck = $false,
    [switch]$SkipDependencies = $false,
    [switch]$SkipDatabase = $false,
    [switch]$SkipEnv = $false,
    [switch]$Full = $false
)

# Colors for output
$colors = @{
    Success = 'Green'
    Error = 'Red'
    Warning = 'Yellow'
    Info = 'Cyan'
}

function Write-Status {
    param([string]$Message, [string]$Type = 'Info')
    $color = $colors[$Type]
    Write-Host $Message -ForegroundColor $color
}

function Check-Command {
    param([string]$Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

# ============================================
# 1. Check Prerequisites
# ============================================
Write-Status "=== Checking Prerequisites ===" "Info"

if (-not $SkipNodeCheck) {
    if (Check-Command node) {
        $nodeVersion = node --version
        Write-Status "✓ Node.js installed: $nodeVersion" "Success"
    } else {
        Write-Status "✗ Node.js not found. Please install from https://nodejs.org" "Error"
        exit 1
    }
}

if (-not $SkipNodeCheck) {
    if (Check-Command pnpm) {
        $pnpmVersion = pnpm --version
        Write-Status "✓ pnpm installed: $pnpmVersion" "Success"
    } else {
        Write-Status "✗ pnpm not found. Installing..." "Warning"
        npm install -g pnpm
    }
}

if (-not $SkipMySQLCheck) {
    if (Check-Command mysql) {
        $mysqlVersion = mysql --version
        Write-Status "✓ MySQL installed: $mysqlVersion" "Success"
    } else {
        Write-Status "✗ MySQL not found. Please install from https://dev.mysql.com/downloads/mysql" "Error"
        exit 1
    }
}

# ============================================
# 2. Install Dependencies
# ============================================
if (-not $SkipDependencies) {
    Write-Status "`n=== Installing Dependencies ===" "Info"
    
    if (Test-Path "node_modules") {
        Write-Status "✓ Dependencies already installed" "Success"
    } else {
        Write-Status "Installing npm packages..." "Info"
        pnpm install
        
        if ($LASTEXITCODE -eq 0) {
            Write-Status "✓ Dependencies installed successfully" "Success"
        } else {
            Write-Status "✗ Failed to install dependencies" "Error"
            exit 1
        }
    }
}

# ============================================
# 3. Setup Environment Configuration
# ============================================
if (-not $SkipEnv) {
    Write-Status "`n=== Setting Up Environment Configuration ===" "Info"
    
    if (Test-Path ".env.local") {
        Write-Status "✓ .env.local already exists" "Success"
        $overwrite = Read-Host "Overwrite .env.local? (y/n)"
        if ($overwrite -ne 'y') {
            Write-Status "Skipping .env.local setup" "Info"
        } else {
            Copy-Item ".env.local.example" ".env.local" -Force
            Write-Status "✓ .env.local created from template" "Success"
        }
    } else {
        Copy-Item ".env.local.example" ".env.local"
        Write-Status "✓ .env.local created from template" "Success"
    }
    
    # Prompt for MySQL password
    Write-Status "`nEnter your MySQL root password:" "Info"
    $mysqlPassword = Read-Host -AsSecureString
    $mysqlPasswordPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($mysqlPassword))
    
    # Update DATABASE_URL in .env.local
    $envContent = Get-Content ".env.local"
    $envContent = $envContent -replace 'DATABASE_URL=mysql://root:[^@]+@', "DATABASE_URL=mysql://root:$mysqlPasswordPlain@"
    Set-Content ".env.local" $envContent
    
    Write-Status "✓ .env.local configured with MySQL password" "Success"
    
    # Prompt for admin email (optional)
    $adminEmail = Read-Host "Enter admin email (press Enter for default: mdrwesh@outlook.com)"
    if ($adminEmail) {
        $envContent = Get-Content ".env.local"
        $envContent = $envContent -replace 'ADMIN_EMAIL=.*', "ADMIN_EMAIL=$adminEmail"
        Set-Content ".env.local" $envContent
        Write-Status "✓ Admin email updated: $adminEmail" "Success"
    }
}

# ============================================
# 4. Setup Database
# ============================================
if (-not $SkipDatabase) {
    Write-Status "`n=== Setting Up Database ===" "Info"
    
    # Create database
    Write-Status "Creating database..." "Info"
    $createDbQuery = "CREATE DATABASE IF NOT EXISTS ims_local CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    
    try {
        mysql -u root -p"$mysqlPasswordPlain" -e $createDbQuery
        Write-Status "✓ Database created successfully" "Success"
    }
    catch {
        Write-Status "✗ Failed to create database: $_" "Error"
        exit 1
    }
    
    # Run migrations
    Write-Status "Running database migrations..." "Info"
    pnpm db:push
    
    if ($LASTEXITCODE -eq 0) {
        Write-Status "✓ Database migrations completed" "Success"
    } else {
        Write-Status "✗ Database migrations failed" "Error"
        exit 1
    }
    
    # Seed database
    Write-Status "Seeding database with test data..." "Info"
    pnpm db:seed
    
    if ($LASTEXITCODE -eq 0) {
        Write-Status "✓ Database seeded successfully" "Success"
    } else {
        Write-Status "✗ Database seeding failed" "Error"
        exit 1
    }
}

# ============================================
# 5. Verify Setup
# ============================================
Write-Status "`n=== Verifying Setup ===" "Info"

$checks = @(
    @{ Name = ".env.local exists"; Path = ".env.local" },
    @{ Name = "node_modules exists"; Path = "node_modules" },
    @{ Name = "drizzle schema exists"; Path = "drizzle/schema.ts" }
)

$allChecks = $true
foreach ($check in $checks) {
    if (Test-Path $check.Path) {
        Write-Status "✓ $($check.Name)" "Success"
    } else {
        Write-Status "✗ $($check.Name)" "Error"
        $allChecks = $false
    }
}

# ============================================
# 6. Summary and Next Steps
# ============================================
Write-Status "`n=== Setup Complete ===" "Success"

Write-Host @"
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

"@

Write-Status "Happy coding! 🚀" "Success"
