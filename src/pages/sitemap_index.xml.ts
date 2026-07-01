import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const SITE = 'https://www.codeandrun.it';

const staticPages = [
  { url: `${SITE}/`, priority: '1.0', changefreq: 'daily' },
  { url: `${SITE}/running/`, priority: '0.8', changefreq: 'monthly' },
  { url: `${SITE}/uses/`, priority: '0.6', changefreq: 'monthly' },
  { url: `${SITE}/about/`, priority: '0.6', changefreq: 'yearly' },
];

export const GET: APIRoute = async () => {
  const posts = await getCollection('posts');

  const postEntries = posts
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
    .map((post) => ({
      url: `${SITE}/${post.id}/`,
      lastmod: post.data.date.toISOString().split('T')[0],
      priority: '0.7',
      changefreq: 'yearly',
    }));

  const allEntries = [...staticPages.map(p => ({ ...p, lastmod: undefined })), ...postEntries];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allEntries
  .map(
    ({ url, lastmod, priority, changefreq }) => `  <url>
    <loc>${url}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
