# codeandrun_astro

Sito Astro di [codeandrun.it](https://www.codeandrun.it) — blog italiano che unisce sviluppo software e running, migrato da WordPress/Eleventy.

## Struttura del progetto

```text
/
├── public/                  # asset statici (favicon, css/js legacy dai post migrati)
├── src/
│   ├── components/
│   │   ├── layout/          # Header, Footer, BaseHead, Pagination
│   │   ├── post/            # PostCard, CategoryBadge, TrainingLog
│   │   └── shortcodes/      # Gallery, RunningBadge, StravaAccordion, Vimeo, YouTube
│   ├── content/
│   │   └── posts/           # articoli in MDX (frontmatter: title, date, categories, tags, featuredImage, ...)
│   ├── content.config.ts    # schema della collection "posts"
│   ├── layouts/
│   ├── pages/                # routing (index, [slug], running, about, uses, feed RSS, sitemap)
│   └── styles/
├── astro.config.mjs
├── Dockerfile / docker-compose*.yml / nginx.conf   # build e serve statico via nginx
└── wxr-to-mdx.cjs            # script di migrazione dall'export WXR di WordPress a MDX
```

Le immagini dei post sono servite da S3/CDN (`cdn.codeandrun.it`), referenziate come `/uploads/...` nel frontmatter e nel corpo dei post.

## Comandi

Tutti i comandi vanno eseguiti dalla root del progetto:

| Comando           | Azione                                            |
| :----------------- | :------------------------------------------------ |
| `npm install`       | Installa le dipendenze                            |
| `npm run dev`       | Avvia il dev server su `localhost:4321`           |
| `npm run build`     | Builda il sito statico in `./dist/`               |
| `npm run preview`   | Preview della build in locale                     |
| `npm run astro ...` | Comandi CLI Astro (es. `astro check`)             |

## Deploy

Il sito viene buildato in un'immagine Docker (nginx serve `./dist/`) e distribuito su `www.codeandrun.it` dietro Traefik. Vedi `Dockerfile`, `docker-compose.yml` e `docker-compose.server.yml`.

## Migrazione contenuti

`wxr-to-mdx.cjs` converte l'export WXR di WordPress in file MDX dentro `src/content/posts/`, riscrivendo gli URL `wp-content/uploads` in `/uploads`.
