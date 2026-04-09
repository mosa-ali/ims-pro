#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");
const deployDir = path.join(projectRoot, "deploy");

console.log("🚀 Starting production deployment build...\n");

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const file of fs.readdirSync(src)) {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function ensureExists(targetPath, label) {
  if (!fs.existsSync(targetPath)) {
    console.error(`✗ Missing required ${label}: ${targetPath}`);
    process.exit(1);
  }
}

console.log("📦 Step 1: Cleaning previous deploy folder...");
if (fs.existsSync(deployDir)) {
  fs.rmSync(deployDir, { recursive: true, force: true });
  console.log("✓ Removed existing deploy directory");
}

console.log("\n🔨 Step 2: Building frontend with Vite...");
try {
  execSync("node --max-old-space-size=4096 ./node_modules/vite/bin/vite.js build", {
    cwd: projectRoot,
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "production" },
  });
  console.log("✓ Frontend build completed");
} catch (error) {
  console.error("✗ Frontend build failed:", error.message);
  process.exit(1);
}

console.log("\n🔨 Step 3: Building server bundle with esbuild...");
try {
  execSync("node scripts/build-esbuild.mjs", {
    cwd: projectRoot,
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "production" },
  });
  console.log("✓ Server bundle completed");
} catch (error) {
  console.error("✗ Server bundle failed:", error.message);
  process.exit(1);
}

console.log("\n🔍 Step 4: Validating root build output...");
ensureExists(path.join(projectRoot, "dist"), "dist folder");
ensureExists(path.join(projectRoot, "dist", "index.js"), "server bundle dist/index.js");
ensureExists(path.join(projectRoot, "dist", "public"), "frontend build dist/public");
console.log("✓ Root build output validated");

console.log("\n📁 Step 5: Creating deploy package...");
fs.mkdirSync(deployDir, { recursive: true });

copyDir(path.join(projectRoot, "dist"), path.join(deployDir, "dist"));
console.log("✓ Copied dist");

const filesToCopy = [
  "package.json",
  "pnpm-lock.yaml",
  ".npmrc",
  "web.config",
];

for (const file of filesToCopy) {
  const src = path.join(projectRoot, file);
  const dest = path.join(deployDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`✓ Copied ${file}`);
  }
}

const dirsToCopy = [
  "patches",
  "uploads",
  "templates",
  "scripts",
  "public",
  "static",
];

for (const dir of dirsToCopy) {
  const src = path.join(projectRoot, dir);
  const dest = path.join(deployDir, dir);
  if (fs.existsSync(src)) {
    copyDir(src, dest);
    console.log(`✓ Copied ${dir}/`);
  }
}

console.log("\n🔍 Step 6: Validating deploy package...");
ensureExists(path.join(deployDir, "package.json"), "deploy/package.json");
ensureExists(path.join(deployDir, "dist"), "deploy/dist");
ensureExists(path.join(deployDir, "dist", "index.js"), "deploy/dist/index.js");
console.log("✓ Deploy package validated");

console.log("\n✅ Production deployment artifact created successfully");
console.log(`Deploy directory: ${deployDir}`);
