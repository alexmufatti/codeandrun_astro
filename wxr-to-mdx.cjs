#!/usr/bin/env node
/**
 * wxr-to-mdx.js
 * Converts a WordPress WXR export to Astro MDX files.
 *
 * Usage:
 *   node wxr-to-mdx.js <export.xml> [src/content/posts]
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const WXR_PATH = process.argv[2];
const OUT_DIR  = process.argv[3] || path.join(__dirname, 'src/content/posts');

if (!WXR_PATH) {
  console.error('Usage: node wxr-to-mdx.js <path/to/export.xml> [output/dir]');
  process.exit(1);
}

const xml = fs.readFileSync(WXR_PATH, 'utf8');

// ─── XML helpers ──────────────────────────────────────────────────────────────

function extractCDATA(str) {
  const m = str.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  return m ? m[1] : str.trim();
}

function extractTag(itemXml, tag) {
  // Escape colon for namespace-aware matching (e.g. content:encoded)
  const escaped = tag.replace(':', '\\:');
  const re = new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, 'i');
  const m = itemXml.match(re);
  return m ? extractCDATA(m[1]).trim() : '';
}

function extractAllTags(itemXml, tag) {
  const escaped = tag.replace(':', '\\:');
  const re = new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, 'gi');
  const results = [];
  let m;
  while ((m = re.exec(itemXml)) !== null) results.push(extractCDATA(m[1]).trim());
  return results;
}

// ─── Parse all <item> blocks ──────────────────────────────────────────────────

const items = [];
const itemRe = /<item>([\s\S]*?)<\/item>/g;
let im;
while ((im = itemRe.exec(xml)) !== null) items.push(im[1]);

console.log(`Parsed ${items.length} items from WXR.\n`);

// ─── Build attachment maps ────────────────────────────────────────────────────

function wpUrlToLocal(url) {
  return url.replace(/^https?:\/\/[^/]+\/wp-content\/uploads/, '/uploads');
}

// attachment id → local path
const attachments = {};
// post id → [local image paths] (children attachments)
const postChildren = {};

for (const item of items) {
  if (extractTag(item, 'wp:post_type') !== 'attachment') continue;
  const id       = extractTag(item, 'wp:post_id');
  const parentId = extractTag(item, 'wp:post_parent');
  const url      = extractTag(item, 'wp:attachment_url');
  if (id && url) {
    attachments[id] = wpUrlToLocal(url);
    if (parentId && parentId !== '0') {
      (postChildren[parentId] = postChildren[parentId] || []).push(wpUrlToLocal(url));
    }
  }
}

console.log(`Found ${Object.keys(attachments).length} attachments.\n`);

// ─── Post meta ────────────────────────────────────────────────────────────────

function parsePostMeta(itemXml) {
  const meta = {};
  const re   = /<wp:postmeta>([\s\S]*?)<\/wp:postmeta>/g;
  let m;
  while ((m = re.exec(itemXml)) !== null) {
    const key = extractTag(m[1], 'wp:meta_key');
    const val = extractTag(m[1], 'wp:meta_value');
    meta[key] = val;
  }
  return meta;
}

// ─── Taxonomies ───────────────────────────────────────────────────────────────

function parseTaxonomies(itemXml) {
  const categories = [], tags = [];
  const re = /<category domain="([^"]+)"[^>]*><!\[CDATA\[(.*?)\]\]><\/category>/g;
  let m;
  while ((m = re.exec(itemXml)) !== null) {
    if (m[1] === 'category') categories.push(m[2]);
    else if (m[1] === 'post_tag') tags.push(m[2]);
  }
  return { categories, tags };
}

// ─── Shortcode parser ─────────────────────────────────────────────────────────

function parseShortcodeAttrs(attrStr) {
  const attrs = {};
  const re = /(\w+)="([^"]*)"|(\w+)='([^']*)'|(\w+)/g;
  let m;
  while ((m = re.exec(attrStr)) !== null) {
    if (m[1])      attrs[m[1]] = m[2];
    else if (m[3]) attrs[m[3]] = m[4];
    else if (m[5]) attrs[m[5]] = true;
  }
  return attrs;
}

function shortcodeToMdx(shortcode) {
  shortcode = shortcode.trim();

  // [strava id="..." embed_id="..." image_id="..."]
  const stravaM = shortcode.match(/^\[strava\s+([\s\S]+?)\]$/);
  if (stravaM) {
    const a = parseShortcodeAttrs(stravaM[1]);
    const id       = a.id || '';
    const embedId  = a.embed_id || '';
    const imageId  = a.image_id || '';
    const imageUrl = imageId ? (attachments[imageId] || '') : '';
    let out = `<StravaAccordion id="${id}"`;
    if (embedId)  out += ` embedId="${embedId}"`;
    if (imageUrl) out += ` imageUrl="${imageUrl}"`;
    return out + ' />';
  }

  // [youtube id="VIDEO_ID"] or [youtube VIDEO_ID]
  const youtubeM = shortcode.match(/^\[youtube\s+([\s\S]+?)\]$/);
  if (youtubeM) {
    const inner = youtubeM[1].trim();
    let id = '';
    const withAttr = inner.match(/\bid="([^"]+)"/);
    if (withAttr) id = withAttr[1];
    else id = inner.replace(/['"]/g, '').trim();
    return `<YouTube id="${id}" />`;
  }

  // [vimeo ID]
  const vimeoM = shortcode.match(/^\[vimeo\s+(\d+)\]$/);
  if (vimeoM) return `<Vimeo id="${vimeoM[1]}" />`;

  // [gallery columns="N"]
  const galleryM = shortcode.match(/^\[gallery([\s\S]*?)\]$/);
  if (galleryM) {
    const a    = parseShortcodeAttrs(galleryM[1]);
    const cols = a.columns || '3';
    // Gallery without explicit ids: leave a placeholder
    return `<Gallery images={[]} columns={${cols}} />{/* TODO: fill gallery images */}`;
  }

  // [running_badge style="..."]
  const badgeM = shortcode.match(/^\[running_badge([\s\S]*?)\]$/);
  if (badgeM) {
    const a = parseShortcodeAttrs(badgeM[1]);
    return `<RunningBadge style="${a.style || 'default'}" />`;
  }

  // Unknown — keep as MDX comment
  return `{/* ${shortcode.replace(/\*\//g, '* /').replace(/\{/g, '&#123;')} */}`;
}

// ─── Content conversion ───────────────────────────────────────────────────────

function decodeHtmlEntities(str) {
  return str
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&amp;/g,  '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function rewriteUploadsUrls(content) {
  return content.replace(
    /https?:\/\/(?:www\.)?codeandrun\.it\/wp-content\/uploads\//g,
    '/uploads/'
  );
}

function convertContent(rawContent) {
  let c = rawContent;

  // Remove the intro (before <!--more-->) — it goes to excerpt field
  const moreIdx = c.indexOf('<!--more-->');
  if (moreIdx !== -1) c = c.slice(moreIdx + '<!--more-->'.length);

  // ── wp:embed → YouTube / Vimeo component ──────────────────────────────────
  c = c.replace(
    /<!-- wp:embed ({[^}]*}) -->\s*<figure[^>]*>[\s\S]*?<div[^>]*>\s*(https?:\/\/[^\s<]+)\s*<\/div><\/figure>\s*<!-- \/wp:embed -->/g,
    (_, _json, url) => {
      const cleanUrl = url.trim();
      if (cleanUrl.includes('youtube.com/shorts/')) {
        const id = cleanUrl.split('shorts/')[1].split(/[?&]/)[0];
        return `<YouTube id="${id}" shorts />`;
      }
      if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
        const id = cleanUrl.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)?.[1] || '';
        return id ? `<YouTube id="${id}" />` : `<a href="${cleanUrl}">${cleanUrl}</a>`;
      }
      if (cleanUrl.includes('vimeo.com')) {
        const id = cleanUrl.split('/').pop();
        return `<Vimeo id="${id}" />`;
      }
      return `<a href="${cleanUrl}">${cleanUrl}</a>`;
    }
  );

  // ── wp:code → fenced code block ───────────────────────────────────────────
  c = c.replace(
    /<!-- wp:code(?:\s+\{[^}]*\})? -->\s*<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>\s*<!-- \/wp:code -->/g,
    (_, code) => '```\n' + decodeHtmlEntities(code.trim()) + '\n```'
  );

  // ── Standalone <pre><code> → fenced code (pre-Gutenberg or duplicates) ────
  c = c.replace(
    /<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/g,
    (_, code) => '```\n' + decodeHtmlEntities(code.trim()) + '\n```'
  );

  // ── Remove duplicate adjacent fenced code blocks ──────────────────────────
  c = c.replace(/(```[\s\S]*?```)\s*\n\s*\1/g, '$1');

  // ── wp:shortcode → MDX component ─────────────────────────────────────────
  c = c.replace(
    /<!-- wp:shortcode -->\s*([\s\S]*?)\s*<!-- \/wp:shortcode -->/g,
    (_, sc) => shortcodeToMdx(sc.trim())
  );

  // ── Rewrite wp-content/uploads URLs ───────────────────────────────────────
  c = rewriteUploadsUrls(c);

  // ── Strip all remaining Gutenberg block comments ──────────────────────────
  c = c.replace(/<!--\s*\/?wp:[a-z-]+[\s\S]*?-->/g, '');

  // ── Fix void elements for JSX/MDX compatibility ───────────────────────────
  c = c.replace(/<(img|br|hr|input)(\s[^>]*[^/])?>/g, (_, tag, attrs) => `<${tag}${attrs || ''} />`);

  // ── Clean up whitespace ───────────────────────────────────────────────────
  c = c.replace(/\n{3,}/g, '\n\n').trim();

  return c;
}

// ─── Extract excerpt ──────────────────────────────────────────────────────────

function extractExcerpt(rawContent, manualExcerpt) {
  if (manualExcerpt?.trim()) return manualExcerpt.trim();

  const moreIdx = rawContent.indexOf('<!--more-->');
  if (moreIdx === -1) return '';

  const pre = rawContent.slice(0, moreIdx);
  return pre
    .replace(/<!--[\s\S]*?-->/g, '')   // strip comments
    .replace(/<[^>]+>/g, ' ')           // strip HTML tags
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── YAML helpers ─────────────────────────────────────────────────────────────

function yamlStr(val) {
  const s = String(val);
  // Use block scalar if contains newlines; double-quote if special chars
  if (/[":'\n{}[\]|>&!%@`]/.test(s) || s.startsWith(' ') || s.endsWith(' ')) {
    return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return `"${s}"`;
}

function buildFrontmatter(d) {
  const lines = ['---'];
  lines.push(`title: ${yamlStr(d.title)}`);
  lines.push(`date: ${d.date}`);
  if (d.excerpt)          lines.push(`excerpt: ${yamlStr(d.excerpt)}`);
  lines.push(`categories: [${d.categories.map(yamlStr).join(', ')}]`);
  if (d.tags.length)      lines.push(`tags: [${d.tags.map(yamlStr).join(', ')}]`);
  if (d.featuredImage)    lines.push(`featuredImage: "${d.featuredImage}"`);
  if (d.car_week)         lines.push(`car_week: "${d.car_week}"`);
  if (d.car_km)           lines.push(`car_km: "${d.car_km}"`);
  if (d.car_race)         lines.push(`car_race: true`);
  if (d.training_types)   lines.push(`training_types: ${yamlStr(d.training_types)}`);
  if (d.training_feelings) lines.push(`training_feelings: ${yamlStr(d.training_feelings)}`);
  if (d.places)           lines.push(`places: ${yamlStr(d.places)}`);
  if (d.wpId)             lines.push(`wpId: ${d.wpId}`);
  lines.push('---');
  return lines.join('\n');
}

// ─── Collect MDX imports ──────────────────────────────────────────────────────

function collectImports(content) {
  const base = '../../components/shortcodes';
  const imports = [];
  if (content.includes('<StravaAccordion'))  imports.push(`import StravaAccordion from '${base}/StravaAccordion.astro';`);
  if (content.includes('<YouTube'))          imports.push(`import YouTube from '${base}/YouTube.astro';`);
  if (content.includes('<Vimeo'))            imports.push(`import Vimeo from '${base}/Vimeo.astro';`);
  if (content.includes('<Gallery'))          imports.push(`import Gallery from '${base}/Gallery.astro';`);
  if (content.includes('<RunningBadge'))     imports.push(`import RunningBadge from '${base}/RunningBadge.astro';`);
  return imports.join('\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

fs.mkdirSync(OUT_DIR, { recursive: true });

let written = 0, skipped = 0, errors = 0;

for (const item of items) {
  const postType = extractTag(item, 'wp:post_type');
  const status   = extractTag(item, 'wp:status');

  // Only published posts (skip pages, attachments, drafts)
  if (postType !== 'post' || status !== 'publish') { skipped++; continue; }

  try {
    const title      = extractTag(item, 'title');
    const slug       = extractTag(item, 'wp:post_name');
    const postId     = extractTag(item, 'wp:post_id');
    const pubDate    = extractTag(item, 'wp:post_date');
    const rawContent = extractTag(item, 'content:encoded');
    const rawExcerpt = extractTag(item, 'excerpt:encoded');
    const meta       = parsePostMeta(item);
    const { categories, tags } = parseTaxonomies(item);

    // Date
    const dateObj = new Date(pubDate);
    const dateISO = isNaN(dateObj.getTime()) ? '2020-01-01' : dateObj.toISOString().slice(0, 10);

    // Featured image
    const thumbId      = meta['_thumbnail_id'] || '';
    const featuredImage = thumbId ? (attachments[thumbId] || '') : '';

    // Excerpt (text only, no HTML)
    const excerpt = extractExcerpt(rawContent, rawExcerpt);

    // Content → MDX
    const mdxContent = convertContent(rawContent);

    // Frontmatter
    const fm = buildFrontmatter({
      title,
      date: dateISO,
      excerpt,
      categories,
      tags,
      featuredImage,
      car_week:          meta['car_week']          || '',
      car_km:            meta['car_km']            || '',
      car_race:          meta['car_race'] === '1',
      training_types:    meta['training_types']    || '',
      training_feelings: meta['training_feelings'] || '',
      places:            meta['places']            || '',
      wpId: parseInt(postId) || 0,
    });

    const imports  = collectImports(mdxContent);
    const mdxParts = [fm, imports, mdxContent].filter(Boolean);
    const mdxFile  = mdxParts.join('\n\n');

    // Sanitize: remove non-ASCII chars (emoji, accented chars) from filename
    const safeSlug = (slug || `post-${postId}`)
      .replace(/%[0-9a-fA-F]{2}/g, '') // strip URL-encoded sequences (emoji, special chars)
      .replace(/[^\x00-\x7F]/g, '')    // strip remaining non-ASCII
      .replace(/--+/g, '-')             // collapse multiple dashes
      .replace(/^-|-$/g, '');           // trim leading/trailing dashes
    const filename = `${safeSlug || `post-${postId}`}.mdx`;
    fs.writeFileSync(path.join(OUT_DIR, filename), mdxFile, 'utf8');
    written++;
    process.stdout.write(`✓ ${filename}\n`);
  } catch (err) {
    errors++;
    console.error(`✗ Error on item: ${err.message}`);
  }
}

console.log(`\nDone: ${written} posts written, ${skipped} items skipped, ${errors} errors.`);
