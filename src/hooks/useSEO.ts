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
    updateMetaTag('og:title', ogTitle || title, true);
    updateMetaTag('og:description', ogDescription || description, true);
    updateMetaTag('og:image', ogImage, true);
    updateMetaTag('og:url', ogUrl || window.location.href, true);

    // 4. Update Twitter Card Tags
    updateMetaTag('twitter:card', ogImage ? 'summary_large_image' : 'summary');
    updateMetaTag('twitter:title', ogTitle || title);
    updateMetaTag('twitter:description', ogDescription || description);
    updateMetaTag('twitter:image', ogImage);

    // 5. Update Canonical Link
    updateCanonical(canonical);

    // 6. Inject Schema.org JSON-LD
    let jsonLdScript: HTMLScriptElement | null = null;
    if (jsonLd) {
      jsonLdScript = document.createElement('script');
      jsonLdScript.type = 'application/ld+json';
      jsonLdScript.setAttribute('data-seo-jsonld', 'true');
      jsonLdScript.text = JSON.stringify(jsonLd);
      document.head.appendChild(jsonLdScript);
    }

    return () => {
      document.title = prevTitle;
      if (jsonLdScript && document.head.contains(jsonLdScript)) {
        document.head.removeChild(jsonLdScript);
      }
    };
  }, [title, description, keywords, ogTitle, ogDescription, ogImage, ogUrl, canonical, jsonLd]);
}

