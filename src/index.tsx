import fs from "fs/promises";
import path from "path";
import { renderToString } from "react-dom/server"

async function getFilesWithSpecificName(startDir: string, fileName: string) {
  let results: any[] = [];
  const list = await fs.readdir(startDir, { withFileTypes: true });

  for (const dirent of list) {
      if (dirent.isDirectory()) {
          const subdir = path.join(startDir, dirent.name);
          const subdirResults = await getFilesWithSpecificName(subdir, fileName);
          results = results.concat(subdirResults);
      } else if (dirent.name === fileName) {
          results.push(path.join(startDir, dirent.name));
      }
  }

  return results;
}

Bun.serve({
  async fetch(req) {
    const { pathname } = new URL(req.url);

    const allPageTsxPaths = await getFilesWithSpecificName('./src/app', 'page.tsx');
    
    let pageFilePath = "";
    for (const fullPagePath of allPageTsxPaths) {
      const pathSlug = fullPagePath.replace("src/app", "").replace("/page.tsx", "");

      if (pathname === "/" && pathSlug === "") {
        pageFilePath = fullPagePath.replace("src/", "./");
      }
    }

    if (pageFilePath) {
      const Component = require(pageFilePath).default;
    
      return new Response(renderToString(<Component />), {
        headers: {
          "Content-Type": "text/html"
        }
      });
    }

    const allRoutePaths = await getFilesWithSpecificName('./src/app', 'route.ts');
    for (const fullRoutePath of allRoutePaths) {
      const pathSlug = fullRoutePath.replace("src/app", "").replace("/route.ts", "");

      if (pathname === pathSlug) {
        const routeFilePath = fullRoutePath.replace("src/", "./");
        return require(routeFilePath).GET();
      }
    }

    return new Response("", {
      status: 404
    });
  },
  port: process.env.PORT || 8080
})