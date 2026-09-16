import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSEO } from '../hooks/useSEO';
import { Card } from '../components/ui/Card';
import {
  FEES,
  DELIVERY,
  PRO_PASS,
  VISIBILITY,
  CONTACT,
  PAYMENT_NETWORKS,
  MAX_CONSECUTIVE_CANCELLATIONS,
} from '../content/legalFacts';

const FAQ_ITEMS = [
  {
    question: "Publier une annonce, ça coûte quelque chose ?",
    answer: `Non. Pendant la phase de lancement, la publication est gratuite et sans plafond : vous pouvez mettre en ligne autant d'annonces actives que vous le souhaitez, et DaloaMarket ne prélève aucune commission sur vos ventes.\n\nÀ la fin de cette phase, une commission vendeur de ${FEES.sellerStandardPct} s'appliquera sur le prix des articles vendus (${FEES.sellerProPct} pour les Vendeurs Pro). Vous serez prévenu avant toute mise en application.`,
  },
  {
    question: "Quels frais l'acheteur paie-t-il exactement ?",
    answer: `Au moment de la commande, l'acheteur règle : le prix de l'article, les frais de livraison s'il y a lieu, et des frais de service de ${FEES.buyerPct} du prix de l'article. Ces ${FEES.buyerPct} couvrent la sécurisation du paiement et l'infrastructure de la plateforme.\n\nLe détail complet est affiché ligne par ligne sur la page de paiement avant toute validation : vous voyez le total exact avant de payer, aucun frais n'est ajouté ensuite.`,
  },
  {
    question: "Comment fonctionne le paiement sécurisé ?",
    answer: `Quand vous payez en ligne, l'argent n'est pas versé immédiatement au vendeur. Il est conservé par notre prestataire de paiement jusqu'à ce que vous confirmiez la réception de votre colis en communiquant votre code OTP au livreur.\n\nTant que ce code n'a pas été donné, les fonds ne partent pas. Si l'article est non conforme, endommagé, ou n'arrive jamais, ne donnez pas votre code : signalez le problème au support et vous êtes remboursé.`,
  },
  {
    question: "Quels moyens de paiement sont acceptés ?",
    answer: `Le paiement Mobile Money est accepté via ${PAYMENT_NETWORKS}, à travers notre agrégateur Money Fusion.\n\nLe paiement en espèces à la livraison est également disponible : pendant la phase de lancement, il est ouvert à tous les vendeurs et proposé par défaut. En espèces, le règlement se fait directement entre vous et le livreur ou le vendeur, sans passer par le paiement sécurisé.`,
  },
  {
    question: "Combien coûte la livraison ?",
    answer: `Pour le réseau DaloaDelivery, la course est à ${DELIVERY.basePrice} jusqu'à ${DELIVERY.baseKm} km, puis ${DELIVERY.perKm} par kilomètre supplémentaire. La distance est calculée par GPS entre le point de retrait et l'adresse de livraison, et le montant exact s'affiche avant que vous validiez.\n\nSi vous choisissez le retrait sur place chez le vendeur, il n'y a pas de frais de livraison. Un vendeur qui passe par ses propres livreurs affiliés peut appliquer ses propres modalités.`,
  },
  {
    question: "Combien touche le livreur sur une course ?",
    answer: `Le livreur perçoit ${FEES.driverNetPct} du montant de la course. La plateforme retient ${FEES.driverPlatformPct} au titre de la mise en relation, du suivi GPS et du traitement du paiement.\n\nCette retenue porte uniquement sur les frais de livraison, jamais sur le prix de l'article.`,
  },
  {
    question: "Que se passe-t-il si le colis est abîmé ou ne correspond pas ?",
    answer: `Ne communiquez pas votre code OTP au livreur. C'est ce code, et lui seul, qui débloque le versement au vendeur — tant que vous ne l'avez pas donné, votre argent reste bloqué.\n\nSignalez ensuite le litige depuis le suivi de commande ou auprès du support. Après vérification, vous êtes remboursé. Une fois le code OTP validé, en revanche, la transaction est considérée comme finalisée : passez par le support pour tout problème constaté après coup.`,
  },
  {
    question: "Puis-je annuler une commande ?",
    answer: `Oui, tant que le livreur n'a pas encore récupéré le colis chez le vendeur. Si vous aviez payé en ligne, le montant vous est restitué.\n\nAu-delà de ${MAX_CONSECUTIVE_CANCELLATIONS} annulations consécutives, votre compte ne peut plus annuler seul et vous devez passer par le support : chaque annulation génère des frais de transaction pour la plateforme.`,
  },
  {
    question: "À quoi sert le Pass Vendeur Pro ?",
    answer: `Le Pass Vendeur Pro est à ${PRO_PASS.monthly} par mois, ou ${PRO_PASS.yearly} par an (deux mois offerts). Il donne le badge Pro vérifié sur votre profil et vos annonces, une priorité de classement, et une commission vendeur réduite à ${FEES.sellerProPct} au lieu de ${FEES.sellerStandardPct} lorsque la grille de commission entrera en vigueur.\n\nÀ noter pendant la phase de lancement : les annonces illimitées, le paiement à la livraison, le retrait sur place et les livreurs affiliés sont ouverts à tous les vendeurs, Pro ou non. Ces fonctionnalités redeviendront des avantages Pro à la fin de la phase.`,
  },
  {
    question: "Comment fonctionnent les livreurs affiliés ?",
    answer: `Un vendeur peut inviter ses propres livreurs de confiance depuis l'espace « Mes livreurs affiliés », en renseignant leur numéro de téléphone. Il leur attribue ensuite ses courses et peut les autoriser à encaisser en espèces à la livraison.\n\nEn cas de perte, de casse ou de non-remise par un livreur affilié, l'acheteur est remboursé ou conserve son argent. Le vendeur est responsable des livreurs qu'il a lui-même affiliés et règle le différend directement avec eux.`,
  },
  {
    question: "Comment mettre mon annonce en avant ?",
    answer: `Deux options payantes : le Boost à ${VISIBILITY.boost} place votre annonce en tête de liste avec un badge « Sponsorisé » pendant ${VISIBILITY.boostDays} jours ; le Bump à ${VISIBILITY.bump} la fait simplement remonter en tête, sans badge ni durée.\n\nCes deux options sont indépendantes du Pass Vendeur Pro et s'achètent à l'unité.`,
  },
  {
    question: "Comment créer et personnaliser ma boutique ?",
    answer: "Rendez-vous dans « Paramètres », puis « Boutique ». Vous pouvez y définir le nom de votre enseigne, une description, un logo, une bannière de couverture, votre quartier, un numéro WhatsApp et une couleur de thème.\n\nVotre boutique dispose alors de sa propre adresse partageable, qui regroupe toutes vos annonces en un seul endroit.",
  },
  {
    question: "Comment contacter un vendeur ?",
    answer: "Ouvrez l'annonce et utilisez le bouton « Contacter le vendeur » : la conversation se déroule dans la messagerie intégrée à la plateforme.\n\nNous vous recommandons de garder vos échanges dans cette messagerie. En cas de litige, c'est la seule trace que le support peut consulter pour vous aider.",
  },
  {
    question: "Puis-je modifier ou supprimer une annonce publiée ?",
    answer: "Oui, à tout moment, depuis votre profil dans la section « Mes annonces ». Une annonce supprimée cesse immédiatement d'être visible des autres utilisateurs.",
  },
  {
    question: "Comment installer l'application sur mon téléphone ?",
    answer: "DaloaMarket s'installe directement depuis votre navigateur, sans passer par un magasin d'applications.\n\nSur Android (Chrome) : appuyez sur le bouton « Installer » qui apparaît en bas de l'écran.\n\nSur iPhone (Safari) : appuyez sur l'icône de partage en bas de l'écran, faites défiler jusqu'à « Sur l'écran d'accueil », puis validez avec « Ajouter ». L'application apparaît ensuite comme une application classique.",
  },
  {
    question: "Comment supprimer mon compte ?",
    answer: `Écrivez à ${CONTACT.support} depuis l'adresse e-mail associée à votre compte, en demandant la suppression. Nous traitons la demande sous 30 jours.\n\nLa suppression retire vos annonces, votre boutique et vos favoris. Certaines données liées à vos commandes sont conservées au-delà, lorsque la loi ivoirienne nous impose de le faire pour des raisons comptables et fiscales.`,
  },
];

function FaqItem({ question, answer, isOpen, onToggle }: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-[var(--color-primary-100)] last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full min-h-[44px] flex items-center justify-between py-3 text-left active:scale-[0.99] transition-transform"
      >
        <span className="text-sm font-medium text-[var(--color-on-surface)] pr-4">{question}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={20} className="text-[var(--color-primary)] flex-shrink-0" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="whitespace-pre-line pb-3 text-[13px] sm:text-sm text-[var(--color-on-surface-variant)] leading-7">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQPage() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  useSEO('Foire Aux Questions (FAQ) — Réponses à vos questions', {
    description: 'Toutes les réponses à vos questions sur l\'utilisation de DaloaMarket : frais, paiement sécurisé, livraison, Pass Vendeur Pro et gestion de votre compte.',
    keywords: 'FAQ DaloaMarket, aide Daloa, paiement Mobile Money Daloa, livraison DaloaDelivery',
    canonical: 'https://daloamarket.com/faq',
    jsonLd: faqSchema,
  });
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gray-50/70 px-4 py-5 pb-28 sm:px-6 sm:py-8 lg:px-6">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 to-amber-600 px-5 py-6 text-center text-white shadow-lg shadow-orange-200/50">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-orange-100">Centre d'aide</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Questions fréquentes</h1>
        <p className="mt-2 text-sm text-orange-100">Les réponses utiles, en un seul endroit.</p>
      </div>
      <Card className="mx-auto mt-4 max-w-3xl p-3 sm:p-5 rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/50">
        {FAQ_ITEMS.map((item, index) => (
          <FaqItem
            key={index}
            question={item.question}
            answer={item.answer}
            isOpen={openIndex === index}
            onToggle={() => toggle(index)}
          />
        ))}
      </Card>
    </div>
  );
}
