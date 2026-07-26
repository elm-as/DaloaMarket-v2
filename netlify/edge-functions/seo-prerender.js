const BOT_USER_AGENTS = [
  'googlebot',
  'bingbot',
  'yandexbot',
  'duckduckbot',
  'slurp',
  'baiduspider',
  'facebookexternalhit',
  'twitterbot',
  'whatsapp',
  'slackbot',
  'linkedinbot',
  'telegrambot',
  'discordbot',
  'applebot',
  'perplexitybot',
  'gptbot',
  'claudebot',
  'anthropic-ai',
];

const BACKEND_URL = 'https://daloapay.onrender.com';

export default async (request, context) => {
  const userAgent = (request.headers.get('user-agent') || '').toLowerCase();
  const url = new URL(request.url);
  const path = url.pathname;

  const isBot = BOT_USER_AGENTS.some((bot) => userAgent.includes(bot));

  const isSeoRoute =
    path.startsWith('/c/') ||
    path.startsWith('/categorie/') ||
    path.startsWith('/livreur/') ||
    ['/electronique', '/vehicules', '/mode', '/maison-deco', '/sports-loisirs', '/livres', '/alimentaire'].includes(path.toLowerCase()) ||
    url.searchParams.has('category');

  if (isBot && isSeoRoute) {
    const targetUrl = `${BACKEND_URL}${path}${url.search}`;
    try {
      const response = await fetch(targetUrl, {
        headers: {
          'user-agent': request.headers.get('user-agent') || 'Googlebot',
          'accept': request.headers.get('accept') || 'text/html',
        },
      });
      return response;
    } catch (err) {
      console.error('[Netlify Edge Proxy Error]:', err);
    }
  }

  return context.next();
};
