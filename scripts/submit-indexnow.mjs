// Script de soumission automatique à IndexNow (Bing, Yandex, etc.)
// Exécution : node scripts/submit-indexnow.mjs

const INDEXNOW_KEY = '917afbced62346469f16dc92320fc541';
const HOST = 'daloamarket.com';
const KEY_LOCATION = `https://${HOST}/${INDEXNOW_KEY}.txt`;

const URLS_TO_SUBMIT = [
  `https://${HOST}/`,
  `https://${HOST}/how-it-works`,
  `https://${HOST}/about`,
  `https://${HOST}/search`,
  `https://${HOST}/become-pro`,
  `https://${HOST}/faq`,
  `https://${HOST}/terms`,
  `https://${HOST}/privacy`,
  `https://${HOST}/llms.txt`,
  `https://${HOST}/llms-full.txt`,
  `https://${HOST}/sitemap.xml`,
];

async function submitToIndexNow() {
  console.log(`🚀 Envoi de ${URLS_TO_SUBMIT.length} URLs à l'API IndexNow pour ${HOST}...`);

  const payload = {
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation: KEY_LOCATION,
    urlList: URLS_TO_SUBMIT,
  };

  try {
    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    console.log(`Status HTTP: ${response.status} (${response.statusText})`);

    if (response.status === 200 || response.status === 202) {
      console.log('✅ Succès : URLs soumises avec succès à IndexNow (Bing, Yandex, etc.) !');
    } else if (response.status === 400) {
      console.error('❌ Erreur 400 : Format de requête invalide.');
    } else if (response.status === 403) {
      console.error('❌ Erreur 403 : Clé non valide ou fichier de clé introuvable.');
    } else if (response.status === 422) {
      console.error('❌ Erreur 422 : Les URLs ne correspondent pas au domaine hôte.');
    } else {
      const text = await response.text();
      console.log('Réponse API :', text);
    }
  } catch (error) {
    console.error('Erreur lors de la requête IndexNow :', error);
  }
}

submitToIndexNow();
