#!/usr/bin/env node
import esbuild from "esbuild";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");
const distDir = path.join(projectRoot, "dist");
const outFile = path.join(distDir, "index.js");

// Ensure dist exists
fs.mkdirSync(distDir, { recursive: true });

console.log("🔨 Building server bundle with esbuild...");

try {
  await esbuild.build({
    entryPoints: [path.join(projectRoot, "server/_core/prod.ts")],
    outfile: outFile,
    platform: "node",
    packages: "external",
    bundle: true,
    format: "esm",
    minify: true,
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    external: [
      "vite",
      "@builder.io/vite-plugin-jsx-loc",
      "./vite",
      "./vite.ts",
    ],
  });

  if (!fs.existsSync(outFile)) {
    console.error(`✗ Expected output file not created: ${outFile}`);
    process.exit(1);
  }

  console.log(`✓ Server bundle created successfully: ${outFile}`);
} catch (error) {
  console.error("✗ Build failed:", error);
  process.exit(1);
}
