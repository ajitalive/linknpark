const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const yaml = require('js-yaml');

const homeDir = __dirname;
const articlesDir = path.join(homeDir, 'articles');
const baseUrl = 'https://linknpark.in';

// The HTML template with advanced SEO
const template = (title, description, content, slug) => {
  const canonicalUrl = `${baseUrl}/articles/${slug}`;
  // Fallback placeholder image for Open Graph if none exists
  const ogImage = `${baseUrl}/logo.png`; 

  // JSON-LD Article Schema
  const schemaMarkup = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": title,
    "description": description,
    "image": ogImage,
    "author": {
      "@type": "Organization",
      "name": "LinkNPark"
    },
    "publisher": {
      "@type": "Organization",
      "name": "LinkNPark",
      "logo": {
        "@type": "ImageObject",
        "url": ogImage
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": canonicalUrl
    }
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title} — LinkNPark Blog</title>
  <meta name="description" content="${description}"/>
  
  <!-- Canonical Tag -->
  <link rel="canonical" href="${canonicalUrl}" />

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:title" content="${title} — LinkNPark Blog" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${ogImage}" />

  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image" />
  <meta property="twitter:url" content="${canonicalUrl}" />
  <meta property="twitter:title" content="${title} — LinkNPark Blog" />
  <meta property="twitter:description" content="${description}" />
  <meta property="twitter:image" content="${ogImage}" />

  <!-- Schema.org JSON-LD -->
  <script type="application/ld+json">
    ${JSON.stringify(schemaMarkup, null, 2)}
  </script>

  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    :root {
      --primary: #2CFF05;
      --primary-dim: rgba(44,255,5,0.12);
      --primary-glow: rgba(44,255,5,0.35);
      --bg: #000000;
      --surface: #0A0A0A;
      --card: #111111;
      --border: rgba(255,255,255,0.07);
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; }
    html, body {
      background: var(--bg);
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      overflow-x: hidden;
      width: 100%;
    }
    body::before {
      content: '';
      position: fixed; inset: 0; z-index: 0; pointer-events: none;
      background-image: radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px);
      background-size: 36px 36px;
    }
    .markdown-body { color: #e5e7eb; font-size: 1.125rem; line-height: 1.75; }
    .markdown-body h1, .markdown-body h2, .markdown-body h3 { color: #fff; font-weight: 800; margin-top: 2.5rem; margin-bottom: 1rem; line-height: 1.2; }
    .markdown-body h1 { font-size: 2.5rem; }
    .markdown-body h2 { font-size: 1.875rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
    .markdown-body p { margin-bottom: 1.5rem; }
    .markdown-body a { color: var(--primary); text-decoration: none; }
    .markdown-body a:hover { text-decoration: underline; }
    .markdown-body ul, .markdown-body ol { margin-bottom: 1.5rem; padding-left: 1.5rem; }
    .markdown-body ul { list-style-type: disc; }
    .markdown-body blockquote { border-left: 4px solid var(--primary); background: var(--primary-dim); padding: 1rem 1.5rem; margin-bottom: 1.5rem; border-radius: 0 0.5rem 0.5rem 0; }
    .markdown-body img { max-width: 100%; border-radius: 1rem; margin: 2rem 0; border: 1px solid var(--border); }
    .markdown-body hr { border-color: var(--border); margin: 3rem 0; }
  </style>
</head>
<body class="min-h-screen flex flex-col relative">
  <nav class="fixed top-0 left-0 right-0 z-50 bg-[#000000]/80 backdrop-blur-xl border-b border-white/5">
    <div class="max-w-6xl mx-auto px-4 sm:px-5 h-16 flex items-center justify-between">
      <a href="/" class="flex items-center gap-2 sm:gap-2.5">
        <img src="../logo.png" class="w-8 h-8 rounded-lg" alt="LinkNPark Logo" />
        <span class="font-black text-white tracking-tight text-base">LinkNPark</span>
      </a>
      <div class="flex items-center gap-6 font-medium">
        <a href="/" class="text-sm text-gray-400 hover:text-white transition-colors">Home</a>
        <a href="/blog.html" class="text-sm text-[var(--primary)] font-bold transition-colors">Blog</a>
      </div>
    </div>
  </nav>

  <main class="flex-1 relative z-10 pt-32 pb-20 px-4 sm:px-6">
    <div class="max-w-3xl mx-auto">
      <div id="content" class="markdown-body">
        ${content}
      </div>
    </div>
  </main>
<!-- Zoho SalesIQ live chat -->
<script>
	window.$zoho = window.$zoho || {};
	$zoho.salesiq = $zoho.salesiq || {
		ready: function(){}
	}
</script>
<script id = "zsiqscript" src = "https://salesiq.zoho.in/widget?wc=siqa3f6b4367e337befdd2dcdf316542f4309179b7e47e48b9a7775f5eccd923ff9" defer >
</script>
</body>
</html>`;
};

function build() {
  const files = fs.readdirSync(articlesDir);
  const sitemapUrls = [];

  // Core pages for sitemap
  sitemapUrls.push(`${baseUrl}/`);
  sitemapUrls.push(`${baseUrl}/blog.html`);

  files.forEach(file => {
    if (path.extname(file) !== '.md') return;

    const filePath = path.join(articlesDir, file);
    let markdown = fs.readFileSync(filePath, 'utf8');

    // Parse Frontmatter
    const frontmatterMatch = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!frontmatterMatch) {
      console.warn(`Skipping ${file} - no YAML frontmatter found.`);
      return;
    }

    const frontmatter = yaml.load(frontmatterMatch[1]);
    markdown = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');

    // Remove GitHub alerts (NOTE, WARNING, etc.)
    markdown = markdown.replace(/> \[\!(NOTE|WARNING|IMPORTANT|CAUTION|TIP)\]\n(> .*\n?)+/g, (match) => {
      return match.replace(/> \[\!(NOTE|WARNING|IMPORTANT|CAUTION|TIP)\]\n/, '').replace(/> /g, '');
    });

    // Render HTML
    let htmlContent = marked.parse(markdown);

    // Auto-inject UTM parameters
    htmlContent = htmlContent.replace(/\*\*\[(.*?)\]\*\*/g, '<strong><a href="https://linknpark.in">$1</a></strong>');
    const slug = file.replace('.md', '');

    htmlContent = htmlContent.replace(/href="(https:\/\/linknpark\.in|\/|https:\/\/scan\.linknpark\.in)([^"]*)"/g, (match, domain, path) => {
      const urlBase = domain === '/' ? 'https://linknpark.in/' : domain;
      const utmString = `utm_source=seo_blog&utm_medium=organic&utm_campaign=${slug}`;
      const separator = path.includes('?') ? '&' : '?';
      if (path.includes('utm_source')) return match;
      return `href="${urlBase}${path}${separator}${utmString}"`;
    });

    const finalHtml = template(frontmatter.title, frontmatter.description, htmlContent, slug);

    // Write to HTML file
    const outputFilename = `${slug}.html`;
    fs.writeFileSync(path.join(articlesDir, outputFilename), finalHtml);
    console.log(`Built ${outputFilename}`);

    // Add to sitemap (clean URL without .html)
    sitemapUrls.push(`${baseUrl}/articles/${slug}`);
  });

  // Generate XML Sitemap
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${sitemapUrls.map(url => `
  <url>
    <loc>${url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('')}
</urlset>`;
  
  fs.writeFileSync(path.join(homeDir, 'sitemap.xml'), sitemapXml);
  console.log('Built sitemap.xml');

  // Generate robots.txt
  const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`;
  fs.writeFileSync(path.join(homeDir, 'robots.txt'), robotsTxt);
  console.log('Built robots.txt');
}

build();
