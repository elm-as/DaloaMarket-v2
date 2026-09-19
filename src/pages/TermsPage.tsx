import React from 'react';
import { Shield, Globe, Users, ShoppingBag, MapPin, Star, AlertTriangle, Package, Ban, Mail, CreditCard, Scale, RefreshCw, Zap } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';
import { Card } from '../components/ui/Card';
import {
  FEES,
  PRO_PASS,
  VISIBILITY,
  CONTACT,
  PAYMENT_NETWORKS,
  MAX_CONSECUTIVE_CANCELLATIONS,
  LEGAL_LAST_UPDATED,
} from '../content/legalFacts';

export default function TermsPage() {
  useSEO("Conditions Générales d'Utilisation : DaloaMarket", {
    description: "Conditions Générales d'Utilisation de la plateforme DaloaMarket.",
    canonical: 'https://daloamarket.com/terms'
  });

  return (
    <div className="min-h-screen bg-gray-50/70 px-4 py-5 pb-28 sm:px-6 sm:py-8 lg:px-6">
      <Card className="mx-auto max-w-3xl p-5 sm:p-7 lg:p-10 rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/50">
        <div className="rounded-3xl bg-gradient-to-br from-orange-500 to-amber-600 px-5 py-6 text-center text-white mb-6">
          <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3 bg-white rounded-2xl p-2 shadow-lg">
            <img src="/logo.png" alt="DaloaMarket" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight mb-2">
            Conditions Générales d'Utilisation
          </h1>
          <p className="text-xs sm:text-sm text-orange-100 max-w-lg mx-auto">
            Dernière mise à jour : {LEGAL_LAST_UPDATED}. Veuillez lire attentivement ces conditions avant d'utiliser DaloaMarket.
          </p>
        </div>

        <div className="space-y-6 sm:space-y-8 text-[var(--color-on-surface)]">

          {/* 1. Acceptation */}
          <section>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-50)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Shield className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold mb-3">1. Acceptation des conditions</h2>
                <div className="space-y-2 text-sm text-[var(--color-on-surface-variant)] leading-relaxed">
                  <p>En accédant, en naviguant ou en utilisant la plateforme DaloaMarket (ci-après la « Plateforme »), vous reconnaissez avoir lu, compris et accepté d'être lié par les présentes Conditions Générales d'Utilisation (ci-après les « CGU »).</p>
                  <p>Si vous n'acceptez pas l'intégralité de ces conditions, vous ne devez pas utiliser la Plateforme. L'utilisation de la Plateforme est conditionnée à votre acceptation pleine et entière des CGU.</p>
                  <p>Ces CGU constituent un contrat légalement contraignant entre vous (ci-après l'« Utilisateur ») et DaloaMarket, édité par ELMAS. En cochant la case « J'accepte les conditions générales d'utilisation » lors de votre inscription, vous confirmez votre accord.</p>
                  <p>DaloaMarket se réserve le droit de modifier ces CGU à tout moment. Les modifications seront notifiées par email ou via une notification sur la Plateforme. Votre utilisation continuée de la Plateforme après modification vaut acceptation des nouvelles CGU.</p>
                </div>
              </div>
            </div>
          </section>

          {/* 2. Description du service */}
          <section>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-50)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Globe className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold mb-3">2. Description du service</h2>
                <div className="space-y-2 text-sm text-[var(--color-on-surface-variant)] leading-relaxed">
                  <p>DaloaMarket est une plateforme de petites annonces en ligne qui met en relation des vendeurs et des acheteurs dans la ville de Daloa et ses environs, en République de Côte d'Ivoire.</p>
                  <p>La Plateforme permet aux utilisateurs de :</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Publier des annonces de vente de biens et services autorisés</li>
                    <li>Rechercher et consulter des annonces par catégorie, prix et quartier</li>
                    <li>Contacter des vendeurs via la messagerie intégrée</li>
                    <li>Commander des articles et suivre leur livraison avec géolocalisation (GPS) et code de vérification (OTP)</li>
                    <li>Créer une boutique personnalisée pour présenter vos produits</li>
                  </ul>
                  <p className="font-semibold text-[var(--color-on-surface)]">Le contrat de vente est conclu exclusivement entre l'acheteur et le vendeur.</p>
                  <p>DaloaMarket n'est ni acheteur, ni vendeur, ni propriétaire des biens. La Plateforme est un espace de mise en relation. Dans le cadre du paiement sécurisé (escrow), DaloaMarket agit uniquement en qualité de prestataire technique et de mandataire à l'encaissement pour le compte du vendeur, via notre partenaire financier (Money Fusion). Toute transaction effectuée hors du paiement sécurisé se fait aux risques et périls exclusifs des utilisateurs.</p>
                </div>
              </div>
            </div>
          </section>

          {/* 3. Compte utilisateur */}
          <section>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-50)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Users className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold mb-3">3. Compte utilisateur</h2>
                <div className="space-y-2 text-sm text-[var(--color-on-surface-variant)] leading-relaxed">
                  <h4 className="font-semibold text-[var(--color-on-surface)] mt-3">3.1 Création de compte</h4>
                  <p>Pour utiliser les fonctionnalités complètes de la Plateforme, vous devez créer un compte. Lors de l'inscription, vous vous engagez à fournir des informations exactes, complètes et à jour. Toute fausse déclaration peut entraîner la suspension ou la suppression de votre compte.</p>
                  <p>La Plateforme est réservée aux personnes âgées d'au moins 16 ans. Un utilisateur mineur agit sous la responsabilité de son représentant légal, qui doit avoir donné son accord.</p>
                  <h4 className="font-semibold text-[var(--color-on-surface)] mt-3">3.2 Sécurité du compte</h4>
                  <p>Vous êtes entièrement responsable de la confidentialité de vos identifiants de connexion (email et mot de passe). Toute activité effectuée depuis votre compte est présumée être de votre fait. Vous devez immédiatement nous signaler toute utilisation non autorisée de votre compte à support@daloamarket.com.</p>
                  <h4 className="font-semibold text-[var(--color-on-surface)] mt-3">3.3 Suppression du compte</h4>
                  <p>Vous pouvez demander la suppression de votre compte à tout moment. Depuis l'application mobile DaloaMarket, la suppression s'effectue directement dans « Paramètres », rubrique « Supprimer mon compte ». Depuis le site, adressez votre demande à {CONTACT.support} en écrivant depuis l'adresse e-mail associée à votre compte.</p>
                  <p>La suppression retire vos annonces, votre boutique et vos favoris. Certaines données rattachées à vos commandes sont conservées au-delà lorsque la loi ivoirienne nous impose de le faire, notamment pour des raisons comptables et fiscales ; le détail figure dans notre Politique de Confidentialité.</p>
                  <p>DaloaMarket se réserve également le droit de suspendre ou supprimer un compte en cas de violation des présentes CGU, de comportement frauduleux, ou de tout autre motif légitime, sans préavis ni indemnité.</p>
                </div>
              </div>
            </div>
          </section>

          {/* 4. Règles de publication */}
          <section>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-50)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <ShoppingBag className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold mb-3">4. Règles de publication des annonces</h2>
                <div className="space-y-2 text-sm text-[var(--color-on-surface-variant)] leading-relaxed">
                  <h4 className="font-semibold text-[var(--color-on-surface)] mt-3">4.1 Contenu autorisé</h4>
                  <p>Les annonces doivent porter sur des biens ou services licites en Côte d'Ivoire. L'Utilisateur garantit être le propriétaire légitime du bien proposé ou disposer de l'autorisation nécessaire pour le vendre.</p>
                  <h4 className="font-semibold text-[var(--color-on-surface)] mt-3">4.2 Contenus strictement interdits</h4>
                  <p>Sont formellement interdits et entraîneront la suppression immédiate de l'annonce et potentiellement du compte :</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Les produits contrefaits, volés ou de provenance illicite</li>
                    <li>Les armes, munitions et explosifs</li>
                    <li>Les drogues, stupéfiants et substances illicites</li>
                    <li>Les médicaments soumis à prescription</li>
                    <li>Les animaux protégés ou issus de trafic</li>
                    <li>Le contenu à caractère pornographique ou sexuellement explicite</li>
                    <li>Les biens culturels et objets d'art sans autorisation</li>
                    <li>Les services de prostitution ou d'escorte</li>
                    <li>Les offres d'emploi discriminatoires</li>
                    <li>Les contenus haineux, racistes, xénophobes ou incitant à la violence</li>
                    <li>Les données personnelles de tiers (numéros de téléphone, adresses) sans leur consentement</li>
                  </ul>
                  <h4 className="font-semibold text-[var(--color-on-surface)] mt-3">4.3 Qualité des annonces</h4>
                  <p>Chaque annonce doit :</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Comporter un titre descriptif et précis</li>
                    <li>Afficher un prix clairement défini en FCFA</li>
                    <li>Inclure des photos réelles et récentes du produit (pas d'images génériques ou volées)</li>
                    <li>Décrire honnêtement l'état du bien (neuf, comme neuf, bon état, état correct, à rénover)</li>
                    <li>Être publiée dans la catégorie appropriée</li>
                    <li>Ne pas être dupliquée (un seul exemplaire par annonce)</li>
                    <li>Indiquer le stock disponible si l'article est vendu en plusieurs exemplaires</li>
                  </ul>
                  <h4 className="font-semibold text-[var(--color-on-surface)] mt-3">4.4 Limites de publication</h4>
                  <p><strong>Pendant la phase de lancement, la publication d'annonces est gratuite et sans plafond</strong>, pour tous les comptes. Aucune limite d'annonces actives simultanées n'est appliquée.</p>
                  <p>À l'issue de cette phase, un plafond d'annonces actives pourra être rétabli pour les comptes Vendeurs Standards, la publication illimitée devenant un avantage du Pass Vendeur Pro. Tout rétablissement de ce plafond sera annoncé aux utilisateurs avant son entrée en vigueur.</p>
                </div>
              </div>
            </div>
          </section>

          {/* 5. Transactions, livraison et paiement */}
          <section>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-50)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <CreditCard className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold mb-3">5. Transactions, livraison et paiement</h2>
                <div className="space-y-2 text-sm text-[var(--color-on-surface-variant)] leading-relaxed">
                  <h4 className="font-semibold text-[var(--color-on-surface)] mt-3">5.1 Indépendance des transactions</h4>
                  <p>DaloaMarket ne participe pas directement aux transactions financières entre acheteurs et vendeurs, sauf via le service optionnel de paiement sécurisé (escrow). Les modalités de paiement, de livraison et de remise du bien sont à convenir directement entre les parties. Nous recommandons les transactions en personne (main à main) dans un lieu public sécurisé.</p>

                  <h4 className="font-semibold text-[var(--color-on-surface)] mt-3">5.2 Service de paiement sécurisé (Escrow)</h4>
                  <p>DaloaMarket propose un service de paiement sécurisé via notre partenaire Money Fusion (supportant {PAYMENT_NETWORKS}). Ce service fonctionne selon le principe du tiers de confiance (escrow) : l'acheteur règle le montant total, composé du prix de l'article, des frais de livraison le cas échéant, et de <strong>frais de service acheteur de {FEES.buyerPct} du prix de l'article</strong>. Les fonds ne sont pas versés au vendeur immédiatement : ils sont conservés par notre prestataire de paiement jusqu'à confirmation de la livraison par code OTP.</p>
                  <p>Pour être parfaitement clair sur ce point : DaloaMarket n'est pas un établissement de paiement et ne détient pas de compte de cantonnement bancaire. Les sommes sont détenues par Money Fusion, prestataire agréé, jusqu'au déblocage. Le terme « séquestre » décrit ce mécanisme de blocage technique, et non un compte séparé ouvert par DaloaMarket.</p>
                  <p>Le détail de ces montants est affiché à l'acheteur, ligne par ligne, avant toute validation de commande. Aucun frais n'est ajouté après cet affichage.</p>
                  <p>Une fois la livraison validée, <strong>les fonds sont reversés sur le numéro Mobile Money ({PAYMENT_NETWORKS}) associé au compte du vendeur</strong>. Le vendeur doit donc s'assurer que le numéro enregistré sur la plateforme correspond à un compte Mobile Money valide et actif. Le versement est déclenché après validation de la livraison ; un délai de traitement peut s'écouler avant sa réception effective, celle-ci dépendant également des délais propres à l'opérateur Mobile Money.</p>
                  <p><strong>Commission de vente.</strong> Pendant la phase de lancement, <strong>aucune commission n'est prélevée sur les ventes</strong> : le vendeur reçoit l'intégralité du prix de son article. À l'issue de cette phase, une commission de {FEES.sellerStandardPct} s'appliquera pour les Vendeurs Standards et de {FEES.sellerProPct} pour les Vendeurs Pro, déduite du montant versé au vendeur. Ce changement sera annoncé aux utilisateurs avant son entrée en vigueur.</p>
                  <p>Les frais de livraison sont calculés selon la distance et reversés au livreur, déduction faite d'une retenue de {FEES.driverPlatformPct} conservée par la plateforme au titre de la mise en relation, du suivi GPS et du traitement du paiement.</p>

                  <h4 className="font-semibold text-[var(--color-on-surface)] mt-3">5.3 Livraison avec géolocalisation (GPS) et code de vérification (OTP)</h4>
                  <p>Pour les commandes avec livraison, DaloaMarket peut proposer un système de suivi incluant :</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong className="text-[var(--color-on-surface)]">Géolocalisation GPS :</strong> la position du livreur peut être partagée avec l'acheteur et le vendeur pendant la livraison.</li>
                    <li><strong className="text-[var(--color-on-surface)]">Code OTP :</strong> un code de vérification unique est généré pour chaque livraison. L'acheteur doit communiquer ce code au livreur pour confirmer la réception. La transaction n'est finalisée qu'après validation du code.</li>
                    <li><strong className="text-[var(--color-on-surface)]">Photo de livraison :</strong> une photo peut être prise comme preuve de dépôt par le livreur.</li>
                  </ul>
                  <p>En utilisant ces services, vous consentez au partage de votre position géographique avec les parties concernées par la transaction pendant la durée de la livraison uniquement.</p>

                  <h4 className="font-semibold text-[var(--color-on-surface)] mt-3">5.4 Annulation, Litiges et Protection contre le Vol/Casse</h4>
                  <p>Afin de protéger acheteurs et vendeurs, le système de paiement Escrow garantit la sécurité des fonds :</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong className="text-[var(--color-on-surface)]">Annulation par le vendeur :</strong> Si le vendeur annule la commande ou ne la confirme pas, l'acheteur est intégralement remboursé.</li>
                    <li><strong className="text-[var(--color-on-surface)]">Refus à la livraison :</strong> Si le colis est non conforme ou endommagé à l'arrivée, l'acheteur refuse de donner le code OTP et signale le litige. Les fonds restent bloqués et l'acheteur est remboursé après vérification.</li>
                    <li><strong className="text-[var(--color-on-surface)]">Vol, casse ou dégradation par le livreur :</strong> Si l'article est volé, perdu ou cassé par le livreur avant la remise du code OTP, l'argent bloqué en Escrow n'est JAMAIS versé au livreur. L'acheteur est totalement remboursé, et le livreur est financièrement et légalement poursuivi par la plateforme.</li>
                    <li><strong className="text-[var(--color-on-surface)]">Validation définitive :</strong> Une fois le code OTP remis et validé, la transaction est considérée comme finale. En cas de problème ultérieur, le support DaloaMarket reste joignable.</li>
                  </ul>
                  <p><strong>Limite d'annulations consécutives.</strong> Chaque annulation génère des frais de transaction supportés par la plateforme. En conséquence, un compte ayant procédé à <strong>{MAX_CONSECUTIVE_CANCELLATIONS} annulations consécutives</strong> ne peut plus annuler de commande par lui-même : toute demande d'annulation supplémentaire doit être adressée au support, qui l'examine au cas par cas. Le compteur est remis à zéro dès qu'une commande est menée à son terme.</p>

                  <h4 className="font-semibold text-[var(--color-on-surface)] mt-3">5.5 Commandes multi-articles</h4>
                  <p>Lorsqu'un acheteur commande plusieurs articles provenant de vendeurs différents, chaque commande est traitée comme une transaction distincte avec sa propre livraison et son propre paiement. Les frais de livraison sont calculés séparément pour chaque vendeur.</p>

                  <h4 className="font-semibold text-[var(--color-on-surface)] mt-3">5.6 Pass Vendeur Pro et Services payants</h4>
                  <p>DaloaMarket propose des abonnements et options pour développer les ventes des commerçants :</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Abonnement Vendeur Pro Mensuel ({PRO_PASS.monthly} / mois) : badge Vendeur Pro vérifié, priorité de classement, et commission de vente réduite à {FEES.sellerProPct} au lieu de {FEES.sellerStandardPct} lorsque la grille de commission entrera en vigueur.</li>
                    <li>Abonnement Vendeur Pro Annuel ({PRO_PASS.yearly} / an) : l'intégralité des avantages Pro pendant 365 jours, avec deux mois offerts.</li>
                    <li>Boost d'annonce ({VISIBILITY.boost}) : mise en avant prioritaire avec badge « Sponsorisé » pendant {VISIBILITY.boostDays} jours.</li>
                    <li>Bump ({VISIBILITY.bump}) : remontée de l'annonce en tête de liste, sans badge ni durée.</li>
                  </ul>
                  <p><strong>Précision sur la phase de lancement.</strong> La publication illimitée d'annonces, le paiement à la livraison, le retrait sur place et l'affiliation de livreurs sont actuellement <strong>ouverts à tous les vendeurs</strong>, qu'ils soient titulaires du Pass Vendeur Pro ou non. Ces fonctionnalités redeviendront des avantages réservés au Pass Vendeur Pro à l'issue de la phase de lancement, après information préalable des utilisateurs.</p>

                  <h4 className="font-semibold text-[var(--color-on-surface)] mt-3">5.7 Livreurs Affiliés et Responsabilité du Vendeur</h4>
                  <p>Les vendeurs ont la possibilité d'affilier leurs propres livreurs de confiance pour assurer l'expédition de leurs commandes ou l'encaissement du paiement à la livraison. Cette possibilité est ouverte à tous les vendeurs pendant la phase de lancement, et sera réservée aux Vendeurs Pro à l'issue de celle-ci.</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong className="text-[var(--color-on-surface)]">Responsabilité du Vendeur :</strong> Le Vendeur Pro assume la responsabilité exclusive des actes, retards, négligences, pertes ou vols commis par ses livreurs affiliés.</li>
                    <li><strong className="text-[var(--color-on-surface)]">Protection de l'Acheteur :</strong> En cas de litige, vol, perte ou non-livraison d'une commande par un livreur affilié, <strong>l'acheteur est intégralement remboursé ou conserve l'intégralité de son argent</strong>. DaloaMarket n'accorde aucun dédommagement au vendeur pour la faute ou le vol commis par son propre livreur affilié.</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* 6. Vendeurs Pro */}
          <section>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-50)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Star className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold mb-3">6. Boutiques et statut Vendeur Pro</h2>
                <div className="space-y-2 text-sm text-[var(--color-on-surface-variant)] leading-relaxed">
                  <p>La boutique personnalisée est accessible à tout vendeur : nom d'enseigne, description, logo, bannière, quartier, numéro WhatsApp et couleur de thème, regroupés sur une adresse partageable.</p>
                  <p>Le statut « Vendeur Pro » est un service payant sous forme d'abonnement (mensuel à {PRO_PASS.monthly} ou annuel à {PRO_PASS.yearly}) qui donne le badge Pro vérifié, une priorité de classement et une commission de vente préférentielle. Pendant la phase de lancement, les autres avantages historiquement associés au statut Pro (publication illimitée, paiement à la livraison, retrait sur place et livreurs affiliés) sont ouverts à l'ensemble des vendeurs.</p>
                  <p>DaloaMarket se réserve le droit de retirer le statut Pro à tout vendeur dont le comportement ne respecte pas les règles de la plateforme ou les droits des consommateurs.</p>
                </div>
              </div>
            </div>
          </section>

          {/* 7. Limitation de responsabilité */}
          <section>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-50)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold mb-3">7. Limitation de responsabilité</h2>
                <div className="space-y-2 text-sm text-[var(--color-on-surface-variant)] leading-relaxed">
                  <h4 className="font-semibold text-[var(--color-on-surface)] mt-3">7.1 Contenu des annonces</h4>
                  <p>DaloaMarket n'exerce aucun contrôle éditorial a priori sur les annonces publiées. Nous ne garantissons pas l'exactitude, la qualité, la sécurité ou la légalité des articles proposés. Les annonces reflètent uniquement la volonté et la responsabilité de leurs auteurs.</p>
                  <h4 className="font-semibold text-[var(--color-on-surface)] mt-3">7.2 Relations entre utilisateurs</h4>
                  <p>DaloaMarket décline toute responsabilité concernant les litiges entre acheteurs et vendeurs, les défauts de livraison, les vices cachés, les défauts de paiement, ou tout autre différend né de l'utilisation de la Plateforme.</p>
                  <h4 className="font-semibold text-[var(--color-on-surface)] mt-3">7.3 Disponibilité du service</h4>
                  <p>Nous nous efforçons de maintenir la Plateforme accessible 24h/24 et 7j/7, mais ne pouvons garantir une disponibilité ininterrompue. Des interruptions peuvent survenir pour maintenance, mise à jour, ou cas de force majeure. DaloaMarket ne pourra être tenu responsable des préjudices résultant d'une indisponibilité temporaire.</p>
                  <h4 className="font-semibold text-[var(--color-on-surface)] mt-3">7.4 Plafond de responsabilité</h4>
                  <p>Dans toute la mesure permise par la loi ivoirienne, la responsabilité de DaloaMarket est limitée au montant des frais de service éventuellement perçus auprès de l'Utilisateur au cours des 12 mois précédant le fait générateur.</p>
                </div>
              </div>
            </div>
          </section>

          {/* 8. Propriété intellectuelle */}
          <section>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-50)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Package className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold mb-3">8. Propriété intellectuelle</h2>
                <div className="space-y-2 text-sm text-[var(--color-on-surface-variant)] leading-relaxed">
                  <p>La Plateforme DaloaMarket, son nom, son logo, son design, son code source et l'ensemble de ses contenus éditoriaux sont la propriété exclusive de DaloaMarket / ELMAS et sont protégés par les lois ivoiriennes et internationales relatives à la propriété intellectuelle.</p>
                  <p>En publiant du contenu (textes, photos) sur la Plateforme, vous conservez vos droits de propriété intellectuelle mais concédez à DaloaMarket une licence non-exclusive, gratuite, mondiale et révocable d'utiliser, reproduire, afficher et distribuer ce contenu dans le cadre du fonctionnement de la Plateforme. Cette licence prend fin à la suppression du contenu ou de votre compte.</p>
                  <p>Toute reproduction, modification, diffusion ou exploitation commerciale de la Plateforme ou de son contenu sans autorisation écrite préalable est strictement interdite.</p>
                </div>
              </div>
            </div>
          </section>

          {/* 9. Suspension et résiliation */}
          <section>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-50)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Ban className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold mb-3">9. Suspension et résiliation</h2>
                <div className="space-y-2 text-sm text-[var(--color-on-surface-variant)] leading-relaxed">
                  <p>DaloaMarket se réserve le droit de suspendre ou résilier le compte de tout Utilisateur, sans préavis ni indemnité, dans les cas suivants :</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Violation des présentes CGU</li>
                    <li>Comportement frauduleux, trompeur ou malveillant</li>
                    <li>Plaintes répétées et fondées d'autres utilisateurs</li>
                    <li>Utilisation de la Plateforme à des fins illicites</li>
                    <li>Non-respect des règles de publication</li>
                    <li>Tentative de contournement des systèmes de sécurité</li>
                  </ul>
                  <p>En cas de résiliation, l'Utilisateur perd l'accès à son compte et à l'ensemble des données associées. Les annonces publiées sont retirées de la Plateforme.</p>
                </div>
              </div>
            </div>
          </section>

          {/* 10. Droit applicable */}
          <section>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-50)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Scale className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold mb-3">10. Droit applicable et juridiction</h2>
                <div className="space-y-2 text-sm text-[var(--color-on-surface-variant)] leading-relaxed">
                  <p>Les présentes CGU sont régies et interprétées conformément au droit ivoirien. Tout litige relatif à l'interprétation, l'exécution ou la validité des présentes CGU sera soumis aux tribunaux compétents de Daloa, République de Côte d'Ivoire.</p>
                  <p>Préalablement à toute action judiciaire, les parties s'engagent à tenter de résoudre leur différend à l'amiable. Une tentative de médiation ou de conciliation pourra être engagée avant toute saisine des juridictions compétentes.</p>
                </div>
              </div>
            </div>
          </section>

          {/* 11. Modification des conditions */}
          <section>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-50)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <RefreshCw className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold mb-3">11. Modification des conditions</h2>
                <div className="space-y-2 text-sm text-[var(--color-on-surface-variant)] leading-relaxed">
                  <p>DaloaMarket se réserve le droit de modifier les présentes CGU à tout moment pour les adapter aux évolutions législatives, techniques ou commerciales.</p>
                  <p>Les modifications entrent en vigueur dès leur publication sur la Plateforme. Nous nous efforcerons d'informer les Utilisateurs des modifications substantielles par email ou notification sur la Plateforme.</p>
                  <p>Votre utilisation continuée de la Plateforme après l'entrée en vigueur des modifications constitue votre acceptation des nouvelles CGU. Si vous n'acceptez pas les modifications, vous devez cesser d'utiliser la Plateforme et supprimer votre compte.</p>
                </div>
              </div>
            </div>
          </section>

          {/* 12. Signalement et modération */}
          <section>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-50)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Zap className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold mb-3">12. Signalement et modération</h2>
                <div className="space-y-2 text-sm text-[var(--color-on-surface-variant)] leading-relaxed">
                  <p>Chaque annonce dispose d'un bouton de signalement permettant aux Utilisateurs de nous alerter sur un contenu problématique. Nous examinons chaque signalement dans les meilleurs délais.</p>
                  <p>DaloaMarket dispose d'une équipe de modération qui peut :</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Masquer ou supprimer une annonce non conforme</li>
                    <li>Envoyer un avertissement à l'Utilisateur concerné</li>
                    <li>Suspendre temporairement ou définitivement un compte</li>
                  </ul>
                  <p>Les décisions de modération sont souveraines et sans recours, sous réserve des droits légaux de l'Utilisateur.</p>
                </div>
              </div>
            </div>
          </section>

          {/* 13. Contact */}
          <section>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-50)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Mail className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold mb-3">13. Contact</h2>
                <div className="space-y-2 text-sm text-[var(--color-on-surface-variant)] leading-relaxed">
                  <p>Pour toute question relative aux présentes CGU, vous pouvez nous contacter :</p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-[var(--color-primary-50)] flex items-center justify-center flex-shrink-0">
                        <Mail className="w-3 h-3 text-[var(--color-primary)]" />
                      </span>
                      <span><strong className="text-[var(--color-on-surface)]">Email :</strong> support@daloamarket.com</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-[var(--color-primary-50)] flex items-center justify-center flex-shrink-0">
                        <Globe className="w-3 h-3 text-[var(--color-primary)]" />
                      </span>
                      <span><strong className="text-[var(--color-on-surface)]">Site :</strong> daloamarket.com</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-[var(--color-primary-50)] flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-3 h-3 text-[var(--color-primary)]" />
                      </span>
                      <span><strong className="text-[var(--color-on-surface)]">Adresse :</strong> Daloa, Côte d'Ivoire</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-100 text-center text-xs text-[var(--color-on-surface-variant)]">
          <p>© {new Date().getFullYear()} DaloaMarket, ELMAS. Tous droits réservés.</p>
        </div>
      </Card>
    </div>
  );
}
