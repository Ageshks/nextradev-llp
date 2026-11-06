import { useEffect } from 'react';
import { SITE_URL, SITE_NAME, DEFAULT_DESCRIPTION, DEFAULT_IMAGE, normalizePath } from '../lib/seo';

interface SeoOptions {
  title: string;
  description?: string;
  path?: string;
  keywords?: string[];
  image?: string;
  type?: 'website' | 'article';
  noindex?: boolean;
  jsonLd?: Record<string, any> | Record<string, any>[];
}

function upsertMeta(name: string, content: string, attr: 'name' | 'property' = 'name') {
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export default function useSEO(options: SeoOptions) {
  const {
    title,
    description = DEFAULT_DESCRIPTION,
    path,
    keywords,
    image = DEFAULT_IMAGE,
    type = 'website',
    noindex = false,
    jsonLd,
  } = options;

  useEffect(() => {
    const url = `${SITE_URL}${normalizePath(path ?? window.location.pathname)}`;
    document.title = title;

    upsertMeta('description', description);
    if (keywords?.length) upsertMeta('keywords', keywords.join(', '));
    upsertMeta('robots', noindex ? 'noindex, nofollow' : 'index, follow');

    upsertLink('canonical', url);

    // Open Graph
    upsertMeta('og:site_name', SITE_NAME, 'property');
    upsertMeta('og:title', title, 'property');
    upsertMeta('og:description', description, 'property');
    upsertMeta('og:type', type, 'property');
    upsertMeta('og:url', url, 'property');
    upsertMeta('og:image', image, 'property');
    upsertMeta('og:locale', 'en_US', 'property');

    // Twitter
    upsertMeta('twitter:card', 'summary_large_image');
    upsertMeta('twitter:title', title);
    upsertMeta('twitter:description', description);
    upsertMeta('twitter:image', image);

    // JSON-LD
    const existing = document.getElementById('seo-jsonld');
    if (existing) existing.remove();
    if (jsonLd) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = 'seo-jsonld';
      script.text = JSON.stringify(Array.isArray(jsonLd) ? jsonLd : jsonLd);
      document.head.appendChild(script);
    }

    return () => {
      const s = document.getElementById('seo-jsonld');
      if (s) s.remove();
    };
  }, [title, description, path, keywords, image, type, noindex, jsonLd]);
}

export { SITE_URL };
