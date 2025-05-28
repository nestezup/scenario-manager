import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: {
      middlewareMode: true,
      hmr: { server },
    },
  });

  // Apply Vite middleware
  app.use(vite.middlewares);

  // Handle static asset requests
  app.use(express.static(path.resolve(__dirname, "..", "client")));

  // Handle all routes for SPA - serve index.html for any path
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    // Skip API routes
    if (url.startsWith("/api")) {
      return next();
    }

    try {
      const template = fs.readFileSync(
        path.resolve(__dirname, "..", "client", "index.html"),
        "utf-8"
      );
      const html = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "..", "dist", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html for all non-API routes (SPA client-side routing)
  app.use("*", (req, res, next) => {
    const url = req.originalUrl;
    if (url.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
