import { useEffect } from 'react';

export interface SEOOptions {
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  canonical?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

export function useSEO(title: string, options: SEOOptions = {}) {
  const {
    description,
    keywords,
    ogTitle,
    ogDescription,
    ogImage,
    ogUrl,
    canonical,
    jsonLd,
  } = options;

  useEffect(() => {
    // 1. Update Title
    const prevTitle = document.title;
    document.title = title ? `${title} | DaloaMarket` : 'DaloaMarket — Achetez et vendez à Daloa';

    // Helper to update or create meta tags
    const updateMetaTag = (nameOrProperty: string, content: string | undefined, isProperty = false) => {
      if (content === undefined) return;
      const selector = isProperty ? `meta[property="${nameOrProperty}"]` : `meta[name="${nameOrProperty}"]`;
      let tag = document.querySelector(selector) as HTMLMetaElement;
      if (!tag) {
        tag = document.createElement('meta');
        if (isProperty) {
          tag.setAttribute('property', nameOrProperty);
        } else {
          tag.setAttribute('name', nameOrProperty);
        }
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    // Helper to update canonical link
    const updateCanonical = (href: string | undefined) => {
      if (href === undefined) return;
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      if (href === null || href === '') {
        link.remove();
      } else {
        link.setAttribute('href', href);
      }
    };

    // 2. Update Description & Keywords
    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords);

    // 3. Update Open Graph Meta Tags
    const currentPath = window.location.pathname;
    const defaultCanonical = `https://daloamarket.com${currentPath === '/' ? '' : currentPath}`;

    updateMetaTag('og:title', ogTitle || title, true);
    updateMetaTag('og:description', ogDescription || description, true);
    updateMetaTag('og:image', ogImage || 'https://daloamarket.com/og-image.png', true);
    updateMetaTag('og:url', ogUrl || defaultCanonical, true);
    updateMetaTag('og:site_name', 'DaloaMarket', true);
    updateMetaTag('og:locale', 'fr_CI', true);

    // 4. Update Twitter Card Tags
    updateMetaTag('twitter:card', ogImage ? 'summary_large_image' : 'summary');
    updateMetaTag('twitter:title', ogTitle || title);
    updateMetaTag('twitter:description', ogDescription || description);
    updateMetaTag('twitter:image', ogImage || 'https://daloamarket.com/og-image.png');

    // 5. Update Canonical Link
    updateCanonical(canonical || defaultCanonical);

    // 6. Inject Schema.org JSON-LD
    let jsonLdScripts: HTMLScriptElement[] = [];
    if (jsonLd) {
      const ldItems = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      ldItems.forEach((item) => {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-seo-jsonld', 'true');
        script.text = JSON.stringify(item);
        document.head.appendChild(script);
        jsonLdScripts.push(script);
      });
    }

    return () => {
      document.title = prevTitle;
      jsonLdScripts.forEach((script) => {
        if (document.head.contains(script)) {
          document.head.removeChild(script);
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, keywords, ogTitle, ogDescription, ogImage, ogUrl, canonical, JSON.stringify(jsonLd)]);
}

