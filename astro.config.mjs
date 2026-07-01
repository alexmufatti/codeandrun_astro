// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const CDN = 'https://cdn.codeandrun.it';

/** Rewrites /uploads/ → CDN in all HTML and XML files after build */
function uploadsCdnIntegration() {
  return {
    name: 'uploads-cdn',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        const distPath = dir.pathname;
        let count = 0;

        async function processDir(dirPath) {
          const entries = await readdir(dirPath, { withFileTypes: true });
          await Promise.all(entries.map(async (entry) => {
            const fullPath = join(dirPath, entry.name);
            if (entry.isDirectory()) {
              await processDir(fullPath);
            } else if (entry.name.endsWith('.html') || entry.name.endsWith('.xml')) {
              const original = await readFile(fullPath, 'utf-8');
              const rewritten = original.replaceAll('="/uploads/', `="${CDN}/uploads/`);
              if (rewritten !== original) {
                await writeFile(fullPath, rewritten, 'utf-8');
                count++;
              }
            }
          }));
        }

        await processDir(distPath);
        console.log(`[uploads-cdn] Rewrote /uploads/ → CDN in ${count} files`);
      },
    },
  };
}

export default defineConfig({
  site: 'https://www.codeandrun.it',
  integrations: [mdx(), uploadsCdnIntegration()],
  vite: {
    server: {
      proxy: {
        '/uploads': {
          target: CDN,
          changeOrigin: true,
        },
      },
    },
  },
});
