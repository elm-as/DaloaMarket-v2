import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePageTitle } from '../hooks/usePageTitle';
import { Card } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';

const FAQ_ITEMS = [
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
    answer: "Contactez le support à l'adresse support@daloamarket.shop avec votre demande. Nous traiterons votre requête sous 48 heures.",
  },
];

function FaqItem({ question, answer, isOpen, onToggle }: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-[var(--color-outline)] last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-4 text-left active:scale-[0.99] transition-transform"
      >
        <span className="font-medium text-[var(--color-on-surface)] pr-4">{question}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={20} className="text-[var(--color-on-surface-variant)] flex-shrink-0" />
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
            <p className="pb-4 text-sm text-[var(--color-on-surface-variant)] leading-relaxed">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQPage() {
  usePageTitle('FAQ');
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="max-w-2xl lg:max-w-none mx-auto px-4 py-8 pb-20 lg:px-6">
      <SectionHeader title="Questions fréquentes" className="mb-6" />
      <Card className="p-5 rounded-2xl shadow-elevation-1">
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