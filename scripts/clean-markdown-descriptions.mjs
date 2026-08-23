// Script pour nettoyer les étoiles Markdown "**" dans les descriptions des annonces
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erreur: VITE_SUPABASE_URL ou clé manquante dans .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanDescriptions() {
  console.log('🔄 Récupération des annonces contenant "**"...');

  const { data: listings, error: fetchErr } = await supabase
    .from('listings')
    .select('id, description')
    .like('description', '%**%');

  if (fetchErr) {
    console.error('❌ Erreur lors de la récupération :', fetchErr.message);
    return;
  }

  if (!listings || listings.length === 0) {
    console.log('✅ Aucune annonce contenant "**" trouvée. Tout est propre !');
    return;
  }

  console.log(`📦 ${listings.length} annonce(s) à nettoyer trouvée(s). Début du nettoyage...`);

  let updatedCount = 0;
  for (const listing of listings) {
    if (!listing.description) continue;

    const cleanedDescription = listing.description.replace(/\*\*/g, '').trim();

    const { error: updateErr } = await supabase
      .from('listings')
      .update({ description: cleanedDescription })
      .eq('id', listing.id);

    if (updateErr) {
      console.error(`❌ Échec mise à jour annonce ${listing.id}:`, updateErr.message);
    } else {
      updatedCount++;
    }
  }

  console.log(`🎉 Nettoyage terminé avec succès ! ${updatedCount}/${listings.length} annonces mises à jour.`);
}

cleanDescriptions();
