import React from 'react';
import { Shield, UserCheck, Database, Share2, Lock, FileKey, Cookie, RefreshCw, Globe, Eye, Trash2, Server, Mail, ShieldAlert } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';
import { Card } from '../components/ui/Card';

export default function PrivacyPage() {
  useSEO('Politique de Confidentialité — Protección de Vos Données', {
    description: 'Découvrez comment DaloaMarket protège vos données personnelles et votre vie privée.',
    canonical: 'https://daloamarket.com/privacy'
  });

  return (
    <div className="min-h-screen bg-gray-50/70 px-4 py-5 pb-28 sm:px-6 sm:py-8 lg:px-6">
      <Card className="mx-auto max-w-3xl p-5 sm:p-7 lg:p-10 rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/50">
        {/* Header */}
        <div className="rounded-3xl bg-gradient-to-br from-orange-500 to-amber-600 px-5 py-6 text-center text-white mb-6">
          <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3 bg-white rounded-2xl p-2 shadow-lg">
            <img src="/logo.png" alt="DaloaMarket" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight mb-2">
            Politique de Confidentialité
          </h1>
          <p className="text-xs sm:text-sm text-orange-100 max-w-lg mx-auto">
            Dernière mise à jour : 2 juillet 2026 — DaloaMarket s'engage à protéger vos données personnelles.
          </p>
        </div>

        <div className="space-y-6 sm:space-y-8 text-[var(--color-on-surface)]">
          {/* Section 1 */}
          <section>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-50)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <UserCheck className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold mb-3">1. Introduction et principes généraux</h2>
                <div className="space-y-2 text-sm text-[var(--color-on-surface-variant)] leading-relaxed">
                  <p>La protection de vos données personnelles est une priorité pour DaloaMarket. La présente Politique de Confidentialité explique quelles données nous collectons, comment nous les utilisons, avec qui nous les partageons, et quels sont vos droits.</p>
                  <p>Cette politique s'applique à tous les services fournis par DaloaMarket via notre site web <strong>daloamarket.com</strong> et notre application mobile.</p>
                  <p>Nous traitons vos données conformément à la loi ivoirienne relative à la protection des données à caractère personnel et aux principes de minimisation, transparence et sécurité.</p>
                  <p>En utilisant DaloaMarket, vous acceptez les pratiques décrites dans la présente politique. Si vous n'êtes pas d'accord, veuillez ne pas utiliser nos services.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-50)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Database className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold mb-3">2. données collectées</h2>
                <div className="space-y-2 text-sm text-[var(--color-on-surface-variant)] leading-relaxed">
                  <h4 className="font-semibold text-[var(--color-on-surface)] mt-3">2.1 données fournies par l'utilisateur</h4>
                  <p>Lors de votre inscription et de l'utilisation de la Plateforme, nous collectons :</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong className="text-[var(--color-on-surface)]">Identifiants :</strong> adresse email, mot de passe (chiffré)</li>
                    <li><strong className="text-[var(--color-on-surface)]">Profil :</strong> nom complet, photo de profil (optionnelle), numéro de téléphone, quartier/commune</li>
                    <li><strong className="text-[var(--color-on-surface)]">Annonces :</strong> titres, descriptions, prix, photos, catégorie, état, localisation, stock</li>
                    <li><strong className="text-[var(--color-on-surface)]">Messages :</strong> contenu des échanges entre utilisateurs via notre messagerie intégrée</li>
                    <li><strong className="text-[var(--color-on-surface)]">Avis :</strong> évaluations et commentaires laissés sur les profils vendeurs</li>
                    <li><strong className="text-[var(--color-on-surface)]">Boutique :</strong> nom de boutique, bannière, logo, description, couleur de thème</li>
                    <li><strong className="text-[var(--color-on-surface)]">Commandes et livraison :</strong> adresse de livraison, coordonnées GPS (pendant la durée de la livraison uniquement), photos de livraison</li>
                  </ul>

                  <h4 className="font-semibold text-[var(--color-on-surface)] mt-3">2.2 données collectées automatiquement</h4>
                  <p>Lors de votre navigation, nous collectons automatiquement :</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong className="text-[var(--color-on-surface)]">Données de navigation :</strong> pages visitées, annonces consultées, recherches effectuées</li>
                    <li><strong className="text-[var(--color-on-surface)]">Données techniques :</strong> adresse IP, type de navigateur, système d'exploitation, identifiant de l'appareil</li>
                    <li><strong className="text-[var(--color-on-surface)]">Données de localisation :</strong> position GPS approximative (uniquement lorsque vous utilisez les fonctionnalités de livraison ou de géolocalisation, et avec votre consentement explicite)</li>
                    <li><strong className="text-[var(--color-on-surface)]">Cookies essentiels :</strong> pour maintenir votre session et vos préférences</li>
                  </ul>

                  <h4 className="font-semibold text-[var(--color-on-surface)] mt-3">2.3 données de paiement</h4>
                  <p>Pour les commandes avec paiement sécurisé, les transactions sont traitées via notre partenaire Money Fusion. DaloaMarket ne stocke pas vos coordonnées bancaires ou vos informations de paiement Mobile Money. Nous conservons uniquement l'historique des transactions (montant, date, type de service) pour la gestion de votre compte et la résolution d'éventuels litiges.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-50)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Server className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold mb-3">3. Utilisation des données</h2>
                <div className="space-y-2 text-sm text-[var(--color-on-surface-variant)] leading-relaxed">
                  <p>Nous utilisons vos données pour les finalités suivantes :</p>
                  
                  <h4 className="font-semibold text-[var(--color-on-surface)] mt-3">3.1 Fourniture du service</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Créer et gérer votre compte utilisateur</li>
                    <li>Publier et afficher vos annonces</li>
                    <li>Permettre la messagerie entre acheteurs et vendeurs</li>
                    <li>Afficher les informations pertinentes sur les profils publics</li>
                    <li>Traiter les commandes, le paiement sécurisé (escrow) et le suivi de livraison</li>
                  </ul>

                  <h4 className="font-semibold text-[var(--color-on-surface)] mt-3">3.2 Amélioration du service</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Analyser l'utilisation de la Plateforme pour en améliorer les performances</li>
                    <li>Détecter et prévenir les activités frauduleuses</li>
                    <li>Personnaliser l'affichage des annonces selon vos intérêts</li>
                  </ul>

                  <h4 className="font-semibold text-[var(--color-on-surface)] mt-3">3.3 Communication</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Envoyer des notifications essentielles (confirmation de compte, alerte de sécurité)</li>
                    <li>Répondre à vos demandes d'assistance</li>
                    <li>Vous informer des modifications des CGU ou de la politique de confidentialité</li>
                  </ul>

                  <h4 className="font-semibold text-[var(--color-on-surface)] mt-3">3.4 Base légale du traitement</h4>
                  <p>Le traitement de vos données repose sur :</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong className="text-[var(--color-on-surface)]">L'exécution du contrat :</strong> pour la fourniture des services que vous avez demandés</li>
                    <li><strong className="text-[var(--color-on-surface)]">Votre consentement :</strong> pour les finalités optionnelles (ex : notifications push)</li>
                    <li><strong className="text-[var(--color-on-surface)]">L'intérêt légitime :</strong> pour la sécurité, la prévention de la fraude, et l'amélioration de la Plateforme</li>
                    <li><strong className="text-[var(--color-on-surface)]">L'obligation légale :</strong> pour répondre aux demandes des autorités compétentes</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-50)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Share2 className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold mb-3">4. Partage et divulgation des données</h2>
                <div className="space-y-2 text-sm text-[var(--color-on-surface-variant)] leading-relaxed">
                  <h4 className="font-semibold text-[var(--color-on-surface)] mt-3">4.1 données publiques</h4>
                  <p>Certaines informations de votre profil sont publiques et visibles par les autres utilisateurs : votre nom complet, votre photo de profil, votre quartier, vos évaluations, et le contenu de vos annonces. Ne publiez pas d'informations que vous souhaitez garder privées.</p>
                  
                  <h4 className="font-semibold text-[var(--color-on-surface)] mt-3">4.2 Prestataires de services & Livreurs Affiliés</h4>
                  <p>Nous partageons des données avec les prestataires et partenaires suivants, strictly dans le cadre du fonctionnement de la Plateforme :</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong className="text-[var(--color-on-surface)]">Livreurs Affiliés & DaloaDelivery :</strong> lorsqu'une commande est passée (en paiement sécurisé ou à la livraison), les coordonnées de l'acheteur (nom, téléphone, quartier/adresse) sont partagées avec le livreur désigné (public ou affilié au Vendeur Pro) pour la réalisation de la livraison.</li>
                    <li><strong className="text-[var(--color-on-surface)]">Supabase :</strong> hébergement de la base de données et du stockage des fichiers (photos d'annonces, avatars)</li>
                    <li><strong className="text-[var(--color-on-surface)]">Resend :</strong> envoi des emails transactionnels (confirmation, réinitialisation de mot de passe)</li>
                    <li><strong className="text-[var(--color-on-surface)]">Money Fusion :</strong> traitement des paiements sécurisés (Mobile Money Orange, MTN, Wave, Moov et cartes bancaires)</li>
                    <li><strong className="text-[var(--color-on-surface)]">Railway & Netlify :</strong> hébergement des serveurs de la Plateforme</li>
                  </ul>
                  <p>Ces prestataires sont tenus de protéger vos données et de ne les utiliser que pour les services spécifiés.</p>

                  <h4 className="font-semibold text-[var(--color-on-surface)] mt-3">4.3 Obligations légales</h4>
                  <p>Nous pouvons divulguer vos données si la loi ivoirienne nous y oblige, notamment sûr demande des autorités judiciaires compétentes, dans le cadre d'une procédure légale, ou pour protéger les droits, la propriété ou la sécurité de DaloaMarket, de ses utilisateurs ou du public.</p>

                  <h4 className="font-semibold text-[var(--color-on-surface)] mt-3">4.4 Pas de vente de données</h4>
                  <p><strong className="text-[var(--color-on-surface)]">DaloaMarket ne vend pas vos données personnelles.</strong> Nous ne monnayons pas vos informations auprès d'annonceurs, de courtiers en données, ou de tiers commerciaux.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-50)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Lock className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold mb-3">5. sécurité des données</h2>
                <div className="space-y-2 text-sm text-[var(--color-on-surface-variant)] leading-relaxed">
                  <p>Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles appropriées pour protéger vos données :</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong className="text-[var(--color-on-surface)]">Chiffrement :</strong> toutes les données en transit sont protégées par le protocole TLS (HTTPS). Les mots de passe sont hachés avec des algorithmes modernes (bcrypt).</li>
                    <li><strong className="text-[var(--color-on-surface)]">Contrôle d'accès :</strong> l'accès aux données est strictement limité aux membres de l'équipe qui en ont besoin pour fournir le service.</li>
                    <li><strong className="text-[var(--color-on-surface)]">Row Level Security (RLS) :</strong> notre base de données Supabase est configurée avec des politiques de sécurité au niveau des lignes pour garantir que chaque utilisateur n'accède qu'à ses propres données.</li>
                    <li><strong className="text-[var(--color-on-surface)]">Surveillance :</strong> nous surveillons les accès non autorisés et les comportements suspects.</li>
                  </ul>
                  <p>Cependant, aucun système de sécurité n'est infaillible. En cas de violation de données, nous nous engageons à vous en informer dans les meilleurs délais et à prendre les mesures correctives nécessaires.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-50)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Cookie className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold mb-3">6. Cookies et technologies similaires</h2>
                <div className="space-y-2 text-sm text-[var(--color-on-surface-variant)] leading-relaxed">
                  <p>Nous utilisons des cookies strictement nécessaires au fonctionnement de la Plateforme :</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong className="text-[var(--color-on-surface)]">Cookie de session :</strong> maintient votre connexion active pendant votre navigation. Il expire à la fermeture du navigateur.</li>
                    <li><strong className="text-[var(--color-on-surface)]">Cookie de préférence :</strong> mémorise vos préférences d'affichage (thème, langue).</li>
                  </ul>
                  <p><strong className="text-[var(--color-on-surface)]">Nous n'utilisons pas de cookies publicitaires</strong>, de cookies de tracking tiers, ni de pixels de suivi à des fins de profilage commercial.</p>
                  <p>Vous pouvez configurer votre navigateur pour bloquer les cookies. Cependant, celà pourrait affecter le bon fonctionnement de la Plateforme (notamment la connexion à votre compte).</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 7 */}
          <section>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-50)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <FileKey className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold mb-3">7. Conservation des données</h2>
                <div className="space-y-2 text-sm text-[var(--color-on-surface-variant)] leading-relaxed">
                  <p>Nous conservons vos données personnelles uniquement pendant la durée nécessaire aux finalités pour lesquelles elles ont été collectées :</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong className="text-[var(--color-on-surface)]">données de compte :</strong> pendant toute la durée de vie de votre compte, puis 90 jours après sa suppression (délai de rétention légal).</li>
                    <li><strong className="text-[var(--color-on-surface)]">Annonces :</strong> jusqu'à leur suppression par vous ou leur désactivation automatique. Les annonces supprimées sont définitivement effacées sous 30 jours.</li>
                    <li><strong className="text-[var(--color-on-surface)]">Messages :</strong> conservés pendant la durée de vie de votre compte pour l'historique des échanges.</li>
                    <li><strong className="text-[var(--color-on-surface)]">données de paiement :</strong> conservées 10 ans conformément aux obligations comptables et fiscales ivoiriennes.</li>
                    <li><strong className="text-[var(--color-on-surface)]">Logs techniques :</strong> conservés 12 mois pour la sécurité et le diagnostic.</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Section 8 */}
          <section>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-50)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Eye className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold mb-3">8. Vos droits</h2>
                <div className="space-y-2 text-sm text-[var(--color-on-surface-variant)] leading-relaxed">
                  <p>conformément à la législation ivoirienne sur la protection des données à caractère personnel, vous disposez des droits suivants :</p>
                  
                  <div className="grid gap-3 mt-3">
                    <div className="flex gap-3 p-3 rounded-xl bg-gray-50">
                      <Eye className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm text-[var(--color-on-surface)]">Droit d'accès</p>
                        <p className="text-xs">Vous pouvez demander une copie des données personnelles que nous détenons à votre sujet.</p>
                      </div>
                    </div>
                    <div className="flex gap-3 p-3 rounded-xl bg-gray-50">
                      <RefreshCw className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm text-[var(--color-on-surface)]">Droit de rectification</p>
                        <p className="text-xs">Vous pouvez corriger des données inexactes ou incomplètes à tout moment depuis vos paramètrès de profil.</p>
                      </div>
                    </div>
                    <div className="flex gap-3 p-3 rounded-xl bg-gray-50">
                      <Trash2 className="w-5 h-5 text-[var(--color-error)] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm text-[var(--color-on-surface)]">Droit à l'effacement</p>
                        <p className="text-xs">Vous pouvez demander la suppression de vos données, sous réserve des obligations légales de conservation.</p>
                      </div>
                    </div>
                    <div className="flex gap-3 p-3 rounded-xl bg-gray-50">
                      <Ban className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm text-[var(--color-on-surface)]">Droit d'opposition</p>
                        <p className="text-xs">Vous pouvez vous opposer au traitement de vos données pour des motifs légitimes.</p>
                      </div>
                    </div>
                    <div className="flex gap-3 p-3 rounded-xl bg-gray-50">
                      <Share2 className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm text-[var(--color-on-surface)]">Droit à la portabilité</p>
                        <p className="text-xs">Vous pouvez demander à recevoir vos données dans un format structuré et lisible.</p>
                      </div>
                    </div>
                  </div>

                  <p className="mt-3">Pour exercer ces droits, contactez-nous à <strong>support@daloamarket.com</strong>. Nous répondrons à votre demande dans un délai de 30 jours maximum. Une preuve d'identité pourra vous être demandée.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 9 */}
          <section>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-50)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <ShieldAlert className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold mb-3">9. Mineurs</h2>
                <div className="space-y-2 text-sm text-[var(--color-on-surface-variant)] leading-relaxed">
                  <p>La Plateforme DaloaMarket n'est pas destinée aux personnes de moins de 16 ans. Nous ne collectons pas sciemment des données personnelles auprès de mineurs de moins de 16 ans.</p>
                  <p>Si vous êtes parent ou tuteur et que vous apprenez que votre enfant nous a fourni des données personnelles sans votre consentement, contactez-nous à <strong>support@daloamarket.com</strong>. Nous prendrons les mesures nécessaires pour supprimer ces informations.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 10 */}
          <section>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-50)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <RefreshCw className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold mb-3">10. Modifications de la politique</h2>
                <div className="space-y-2 text-sm text-[var(--color-on-surface-variant)] leading-relaxed">
                  <p>Nous pouvons mettre à jour cette politique de confidentialité pour refléter les évolutions de nos pratiques, de nos services, ou de la réglementation applicable.</p>
                  <p>En cas de modification substantielle, nous vous en informerons par email (à l'adresse associée à votre compte) ou par une notification visible sur la Plateforme au moins 15 jours avant l'entrée en vigueur des modifications.</p>
                  <p>Votre utilisation continuée de la Plateforme après l'entrée en vigueur des modifications vaut acceptation de la nouvelle politique.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 11 */}
          <section>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-50)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Mail className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold mb-3">11. Contact et reclamations</h2>
                <div className="space-y-2 text-sm text-[var(--color-on-surface-variant)] leading-relaxed">
                  <p>Pour toute question, demande d'exercice de vos droits, ou réclamation relative à la protection de vos données :</p>
                  <ul className="space-y-2 mt-2">
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
                        <MapPinIcon className="w-3 h-3 text-[var(--color-primary)]" />
                      </span>
                      <span><strong className="text-[var(--color-on-surface)]">Adresse :</strong> Daloa, Côte d'Ivoire</span>
                    </li>
                  </ul>
                  <p className="mt-3">Si vous estimez que vos droits n'ont pas été respectés, vous avez la possibilité d'introduire une réclamation auprès de l'Autorité de Régulation des Télécommunications/TIC de Côte d'Ivoire (ARTCI), l'autorité compétente en matière de protection des données.</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer note */}
        <div className="mt-10 pt-6 border-t border-gray-100 text-center text-xs text-[var(--color-on-surface-variant)]">
          <p>© {new Date().getFullYear()} DaloaMarket. Tous droits réservés.</p>
        </div>
      </Card>
    </div>
  );
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function Ban({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  );
}
