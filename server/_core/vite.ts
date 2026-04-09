import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
// Vite is only imported dynamically in setupVite to keep it out of production bundle
// import { createServer as createViteServer } from "vite";
// import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server) {
  // Dynamic import of Vite and config - only loaded in development
  const { createServer: createViteServer } = await import("vite");
  const viteConfig = (await import("../../vite.config")).default;
  
  // Dynamically import jsxLocPlugin - dev-only, not bundled in production
  const { jsxLocPlugin } = await import("@builder.io/vite-plugin-jsx-loc");
  
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  // Add jsxLocPlugin to the plugins array for development mode
  const configWithPlugins = {
    ...viteConfig,
    plugins: [...(viteConfig.plugins || []), jsxLocPlugin()],
  };

  const vite = await createViteServer({
    ...configWithPlugins,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  }) as any;

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../\..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      (vite as any).ssrFixStacktrace(e as Error);
      next(e);
    }
  })
}

// Note: serveStatic is now in ./static.ts to keep production bundle clean
// viteConfig is only imported dynamically in setupVite() to ensure
// the production bundle does not include vite or vite.config imports
