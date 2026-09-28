import { Link } from 'react-router-dom';
import { Trash2, Smartphone, Mail, CheckCircle2, Archive } from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';
import { Card } from '../components/ui/Card';
import { CONTACT } from '../content/legalFacts';

/**
 * Suppression du compte DaloaMarket.
 *
 * Page exigée par Google Play (Sécurité des données) : elle doit citer l'appli,
 * montrer clairement la marche à suivre, et dire quelles données sont
 * supprimées ou conservées, et combien de temps. Le contenu décrit ce que fait
 * réellement `delete_my_account()` et reprend les durées de la politique de
 * confidentialité (/privacy).
 */
export default function DeleteAccountPage() {
  usePageTitle('Supprimer mon compte : DaloaMarket');

  return (
    <div className="min-h-screen bg-gray-50/70 px-4 py-5 pb-28 sm:px-6 sm:py-8">
      <Card className="mx-auto max-w-2xl rounded-3xl border border-gray-100 p-5 shadow-lg shadow-gray-200/50 sm:p-8">
        <div className="mb-6 rounded-3xl bg-gradient-to-br from-orange-500 to-amber-600 px-5 py-6 text-center text-white">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <Trash2 className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">Supprimer mon compte DaloaMarket</h1>
          <p className="mx-auto mt-2 max-w-md text-xs text-orange-100 sm:text-sm">
            Valable pour l'application DaloaMarket, l'application DaloaDelivery et le site daloamarket.com (un seul compte).
          </p>
        </div>

        <div className="space-y-7 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 className="mb-3 text-base font-bold text-gray-900">Comment supprimer votre compte</h2>
            <div className="space-y-3">
              <div className="flex gap-3 rounded-2xl bg-orange-50 p-4">
                <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />
                <div>
                  <p className="font-semibold text-gray-900">Depuis l'application (immédiat)</p>
                  <ol className="mt-1 list-decimal space-y-0.5 pl-4">
                    <li>Ouvrez l'application DaloaMarket et connectez-vous.</li>
                    <li>Allez dans <strong>Profil</strong>, puis <strong>Paramètres</strong>.</li>
                    <li>Touchez <strong>Supprimer mon compte</strong> et confirmez.</li>
                  </ol>
                </div>
              </div>
              <div className="flex gap-3 rounded-2xl bg-gray-50 p-4">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-gray-500" />
                <div>
                  <p className="font-semibold text-gray-900">Sans l'application (sous 7 jours)</p>
                  <p className="mt-1">
                    Écrivez à{' '}
                    <a className="font-semibold text-orange-600 underline" href={`mailto:${CONTACT.support}?subject=Suppression%20de%20mon%20compte`}>
                      {CONTACT.support}
                    </a>{' '}
                    ou sur WhatsApp au{' '}
                    <a className="font-semibold text-orange-600 underline" href={CONTACT.whatsappHref}>
                      {CONTACT.whatsappDisplay}
                    </a>
                    , depuis l'adresse e-mail ou le numéro liés à votre compte, avec l'objet « Suppression de mon compte ».
                    Nous confirmons la suppression par retour.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-gray-900">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Données supprimées immédiatement
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Nom, adresse e-mail, numéro de téléphone et photo de profil</li>
              <li>Boutique : nom, description, logo, bannière, WhatsApp et position GPS</li>
              <li>Numéro Mobile Money de versement</li>
              <li>Toutes vos annonces (retirées de la vente)</li>
              <li>Favoris et jetons de notification</li>
              <li>Pour les livreurs : pièce d'identité, photo, position et coordonnées</li>
              <li>Vos accès : mot de passe, connexion Google et sessions ouvertes</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-gray-900">
              <Archive className="h-5 w-5 text-gray-500" /> Données conservées, puis effacées
            </h2>
            <p className="mb-2">
              Certaines données sont conservées sous une forme rattachée à un « Utilisateur supprimé », sans votre nom ni vos
              coordonnées :
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>Commandes et transactions</strong> : jusqu'à 10 ans (obligations comptables et fiscales ivoiriennes)</li>
              <li><strong>Messages échangés</strong> : 24 mois au maximum, pour le traitement d'éventuels litiges</li>
              <li><strong>Empreinte chiffrée</strong> de l'adresse e-mail (irréversible) : 3 ans, contre la fraude à la réinscription</li>
              <li><strong>Journaux techniques</strong> : 12 mois au plus</li>
            </ul>
          </section>

          <section id="donnees">
            <h2 className="mb-3 text-base font-bold text-gray-900">
              Supprimer une partie de vos données, sans supprimer le compte
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>Annonces</strong> : Profil → Mes annonces → Supprimer (retrait immédiat).</li>
              <li><strong>Photo de profil, nom, quartier</strong> : Profil → Paramètres → Informations personnelles.</li>
              <li><strong>Boutique</strong> (nom, description, logo, bannière, position) : Profil → Paramètres → Paramètres de ma boutique.</li>
              <li><strong>Numéro de versement Mobile Money</strong> : Profil → Paramètres → Compte de retrait Mobile Money.</li>
              <li><strong>Favoris</strong> : retirez-les depuis l'onglet Favoris.</li>
              <li>
                <strong>Autres données</strong> (messages, historique) : écrivez à{' '}
                <a className="font-semibold text-orange-600 underline" href={`mailto:${CONTACT.support}?subject=Suppression%20de%20donn%C3%A9es`}>
                  {CONTACT.support}
                </a>{' '}
                en précisant les données concernées ; nous répondons sous 7 jours, dans la limite des obligations légales de
                conservation indiquées ci-dessus.
              </li>
            </ul>
          </section>

          <p className="text-xs text-gray-500">
            Détails complets dans notre{' '}
            <Link to="/privacy" className="font-semibold text-orange-600 underline">
              politique de confidentialité
            </Link>
            .
          </p>
        </div>
      </Card>
    </div>
  );
}
