import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const SITE = 'https://www.codeandrun.it';
const FEED_URL = `${SITE}/feed/`;

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const GET: APIRoute = async () => {
  const posts = await getCollection('posts');

  const sorted = posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  const recent = sorted.slice(0, 20);

  const lastBuildDate = recent[0]?.data.date.toUTCString() ?? new Date().toUTCString();

  const items = recent.map((post) => {
    const url = `${SITE}/${post.id}/`;
    const title = escapeXml(post.data.title);
    const excerpt = post.data.excerpt ? escapeXml(post.data.excerpt) : '';
    const pubDate = post.data.date.toUTCString();
    const categories = post.data.categories
      .map((c) => `<category><![CDATA[${c}]]></category>`)
      .join('\n\t\t');

    return `\t<item>
\t\t<title>${title}</title>
\t\t<link>${url}</link>
\t\t<guid isPermaLink="true">${url}</guid>
\t\t<pubDate>${pubDate}</pubDate>
\t\t<dc:creator><![CDATA[Alex]]></dc:creator>
\t\t${categories}
\t\t${excerpt ? `<description><![CDATA[${post.data.excerpt}]]></description>` : ''}
\t</item>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
\txmlns:content="http://purl.org/rss/1.0/modules/content/"
\txmlns:dc="http://purl.org/dc/elements/1.1/"
\txmlns:atom="http://www.w3.org/2005/Atom"
\txmlns:sy="http://purl.org/rss/1.0/modules/syndication/"
>
<channel>
\t<title>Code And Run</title>
\t<atom:link href="${FEED_URL}" rel="self" type="application/rss+xml" />
\t<link>${SITE}/</link>
\t<description>Blog of a running developer</description>
\t<lastBuildDate>${lastBuildDate}</lastBuildDate>
\t<language>it-IT</language>
\t<sy:updatePeriod>weekly</sy:updatePeriod>
\t<sy:updateFrequency>1</sy:updateFrequency>
${items.join('\n')}
</channel>
</rss>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
};
