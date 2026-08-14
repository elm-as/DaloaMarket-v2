import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSEO } from '../hooks/useSEO';
import { Card } from '../components/ui/Card';

const FAQ_ITEMS = [
  {
    question: "Comment installer l'application sur mon téléphone (iPhone & Android) ?",
    answer: "Sur Android (Chrome) : Cliquez sur le bouton 'Installer' qui apparaît en bas de l'écran.\n\nSur iPhone (Safari) : Appuyez sur l'icône de Partage 📤 (en bas de votre écran Safari), défilez vers le bas, appuyez sur « Sur l'écran d'accueil » ➕, puis validez avec « Ajouter » en haut à droite. L'application apparaîtra comme une vraie application native !",
  },
  {
    question: 'Comment publier une annonce ?',
    answer: "Cliquez sur \"Vendre\" dans la barre de navigation, remplissez le formulaire avec les détails de votre article, ajoutez des photos et publiez. C'est simple et rapide !",
  },
  {
    question: 'Comment contacter un vendeur ?',
    answer: "Ouvrez l'annonce qui vous intéresse et cliquez sur le bouton \"Contacter le vendeur\". Vous pourrez alors échanger par message directement sur la plateforme.",
  },
  {
    question: 'Est-ce gratuit ?',
    answer: 'La publication est gratuite jusqu\'à 10 annonces actives simultanément pour les comptes Vendeurs Standards. Pour publier des annonces en illimité, gérer vos propres livreurs affiliés et activer le paiement à la livraison (COD), souscrivez au Pass Vendeur Pro (2 500 FCFA / mois).',
  },
  {
    question: 'Comment fonctionnent le Pass Vendeur Pro et ses tarifs ?',
    answer: "Le Pass Vendeur Pro coûte 2 500 FCFA / mois (ou 25 000 FCFA / an avec 2 mois offerts). Il débloque le stock illimité, le badge Pro vérifié, l'espace Livreurs Affiliés, le paiement à la livraison (COD), le retrait en boutique et réduit la commission de vente à 2,5%.",
  },
  {
    question: 'Comment fonctionnent les Livreurs Affiliés ?',
    answer: "Chaque Vendeur Pro dispose d'un espace 'Mes livreurs affiliés' pour inviter ses propres livreurs de confiance via leur numéro de téléphone. Le vendeur peut leur attribuer ses courses privées et autoriser l'encaissement du paiement en espèces à la livraison.",
  },
  {
    question: 'Que se passe-t-il en cas de problème ou vol avec un livreur affilié ?',
    answer: "En cas de litige, perte, casse ou non-remise du colis par un livreur affilié, l'acheteur est intégralement remboursé ou conserve son argent. Le Vendeur Pro est responsable des agissements de ses livreurs affiliés et gère le règlement du problème directement avec son livreur.",
  },
  {
    question: 'Comment fonctionne le paiement sécurisé (Escrow) ?',
    answer: "DaloaMarket propose un service de paiement sécurisé via Money Fusion (Orange Money, Wave, MTN MoMo, Moov). L'acheteur paie en ligne, les fonds restent bloqués jusqu'à confirmation de livraison par code OTP, puis sont versés automatiquement sur le Mobile Money du vendeur.",
  },
  {
    question: 'Quels sont les frais de livraison ?',
    answer: "Pour le réseau public DaloaDelivery, les frais sont calculés selon la distance (base de 500 FCFA, puis 85 FCFA par km au-delà de 1,5 km). Pour le retrait en boutique ou la livraison par un livreur affilié au vendeur, des modalités spécifiques ou la gratuité peuvent s'appliquer.",
  },
  {
    question: 'Comment fonctionnent les annulations et remboursements ?',
    answer: "Si le vendeur annule ou si l'acheteur refuse le colis à la livraison avant la remise du code OTP, l'acheteur est intégralement remboursé. Une fois le code OTP validé, la transaction est définitive.",
  },
  {
    question: 'Comment créer ma boutique ?',
    answer: "Allez dans \"Paramètres\" puis \"Boutique\" pour personnaliser votre boutique avec nom, description, bannière, logo et couleur de thème.",
  },
  {
    question: 'Quels sont les services payants disponibles ?',
    answer: "Pass Vendeur Pro (2 500 FCFA/mois ou 25 000 FCFA/an), Boost d'annonce (500 FCFA/7j), et Bumps de visibilité (200 FCFA).",
  },
  {
    question: 'Puis-je modifier ou supprimer mon annonce ?',
    answer: "Oui, vous pouvez modifier ou supprimer votre annonce à tout moment depuis votre profil dans la section \"Mes annonces\".",
  },
  {
    question: 'Comment supprimer mon compte ?',
    answer: "Contactez le support à l'adresse support@daloamarket.com avec votre demande. Nous traiterons votre requête sous 48 heures.",
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
            <p className="pb-3 text-[13px] sm:text-sm text-[var(--color-on-surface-variant)] leading-7">
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
    description: 'Toutes les réponses à vos questions sur l\'utilisation de DaloaMarket : installation PWA, publication d\'annonces, statut Pro, sécurité et paiements.',
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
