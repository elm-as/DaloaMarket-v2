import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  Layers, 
  CheckCircle2, 
  XCircle, 
  Tag, 
  ArrowLeft, 
  ArrowRight,
  PlusCircle, 
  ShieldCheck,
  ChevronDown,
  Sparkles,
  Award,
  Check,
  Lightbulb,
  Search,
  MessageSquare
} from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

interface WizardStep {
  id: number;
  badge: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  description: string;
  doList: string[];
  dontList: string[];
  proTip: string;
  metric: string;
}

const STEPS: WizardStep[] = [
  {
    id: 1,
    badge: "Règle 01 / 04",
    title: "Gestion unifiée des stocks",
    subtitle: "Une seule fiche claire par modèle de produit",
    icon: Layers,
    description: "Sur DaloaMarket, chaque produit unique est publié sous une seule fiche d'annonce. Indiquez la quantité exacte en stock au lieu d'ouvrir plusieurs annonces similaires.",
    doList: [
      "Indiquer le stock réel disponible dans le champ dédié.",
      "Mettre à jour la quantité après chaque vente réalisée en boutique."
    ],
    dontList: [
      "Créer plusieurs annonces identiques pour un même article.",
      "Publier la même annonce plusieurs fois dans la journée."
    ],
    proTip: "Une fiche produit unique avec un stock à jour obtient un meilleur classement dans les recherches à Daloa.",
    metric: "Visibilité optimisée"
  },
  {
    id: 2,
    badge: "Règle 02 / 04",
    title: "Photos réelles et nettes",
    subtitle: "Mettez en valeur l'authenticité de vos articles",
    icon: Camera,
    description: "Les acheteurs privilégient les visuels réels pris sous un éclairage naturel. Des photos de qualité rassurent l'acheteur et accélèrent la prise de contact.",
    doList: [
      "Prendre 2 à 4 photos sous une bonne lumière naturelle.",
      "Présenter l'article sous plusieurs angles et montrer les détails."
    ],
    dontList: [
      "Télécharger des images de démonstration sur Internet.",
      "Utiliser des photos sombres, floues ou déformées."
    ],
    proTip: "Une photo nette montrant le produit réel augmente fortement les demandes d'achat directes.",
    metric: "Confiance acheteur +80%"
  },
  {
    id: 3,
    badge: "Règle 03 / 04",
    title: "Prix transparent & Quartier exact",
    subtitle: "Facilitez le traitement et l'expédition DaloaDelivery",
    icon: Tag,
    description: "Fixez un prix ferme en FCFA et indiquez précisément votre quartier de retrait à Daloa (Abattoir, Orly, Lobia, Kennedy, Tazibouo...). Cela permet d'organiser rapidement la livraison.",
    doList: [
      "Afficher le prix réel en FCFA net de frais.",
      "Indiquer le quartier exact de retrait à Daloa."
    ],
    dontList: [
      "Mettre des prix fictifs (ex: 1 FCFA) pour attirer l'attention.",
      "Masquer la localisation exacte de l'article."
    ],
    proTip: "Indiquer votre quartier exact permet aux livreurs de récupérer le colis sans perte de temps.",
    metric: "Prise en charge rapide"
  },
  {
    id: 4,
    badge: "Règle 04 / 04",
    title: "Réactivité sur le Chat",
    subtitle: "Répondez rapidement aux demandes des clients",
    icon: MessageSquare,
    description: "Les acheteurs qui posent des questions souhaitent souvent finaliser leur achat immédiatement. Une réponse rapide garantit de ne pas rater de vente.",
    doList: [
      "Consulter vos notifications et répondre dès que possible.",
      "Conserver un échange courtois et professionnel."
    ],
    dontList: [
      "Laisser des messages d'acheteurs sans réponse pendant plusieurs jours."
    ],
    proTip: "La réactivité sur la messagerie est le facteur clé pour fidéliser vos clients locaux à Daloa.",
    metric: "Ventes conclues +90%"
  }
];

export default function SellerGuidePage() {
  usePageTitle('Guide Officiel Vendeur — DaloaMarket');
  const navigate = useNavigate();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const currentStep = STEPS[currentStepIndex];
  const progressPercent = ((currentStepIndex + 1) / STEPS.length) * 100;

  const faqs = [
    {
      q: "Combien d'annonces puis-je publier gratuitement ?",
      a: "Chaque vendeur Standard peut publier jusqu'à 10 annonces actives simultanément. Pour publier sans limite, souscrivez au Pass Vendeur Pro (2 500 FCFA / mois)."
    },
    {
      q: "Comment fonctionnent les Livreurs Affiliés pour les Vendeurs Pro ?",
      a: "Depuis votre espace 'Mes livreurs affiliés', vous pouvez inviter vos propres livreurs de confiance par leur numéro de téléphone pour leur attribuer des commandes privées ou activer le paiement à la livraison (COD)."
    },
    {
      q: "Quelle est ma responsabilité avec un livreur affilié ?",
      a: "Le Vendeur Pro est responsable de ses livreurs affiliés. En cas de vol, perte ou problème lors de la livraison, l'acheteur est intégralement remboursé ou garde son argent, et le vendeur règle le litige directement avec son livreur."
    },
    {
      q: "Pourquoi préciser mon quartier exact à Daloa ?",
      a: "La géolocalisation exacte permet aux livreurs DaloaDelivery de calculer les frais de trajet et d'assurer une collecte rapide à votre boutique."
    },
    {
      q: "Comment fonctionne le règlement des ventes sur DaloaMarket ?",
      a: "Les paiements électroniques sont sécurisés en séquestre (Escrow) par MoneyFusion jusqu'à la livraison effective confirmée par code OTP."
    }
  ];

  const filteredFaqs = faqs.filter(
    (f) => f.q.toLowerCase().includes(searchQuery.toLowerCase()) || f.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[var(--color-background)] pb-24 pt-6">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">

        {/* Header Bar */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200/60">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-700 hover:text-[var(--color-primary)] transition-colors py-2 px-3.5 rounded-2xl bg-white border border-gray-200 shadow-xs active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour</span>
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-white p-1 border border-gray-200 shadow-xs flex items-center justify-center">
              <img src="/logo.png" alt="DaloaMarket" className="w-full h-full object-contain" />
            </div>
            <div className="text-left">
              <span className="text-xs font-extrabold text-gray-900 block leading-none">
                DaloaMarket
              </span>
              <span className="text-[10px] text-gray-500 font-semibold">Guide Vendeur</span>
            </div>
          </div>
        </div>

        {/* Wizard Control Header */}
        <Card className="p-6 sm:p-7 rounded-3xl border border-gray-100 shadow-elevation-1 mb-6 bg-white">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <span className="text-xs font-mono font-extrabold text-[var(--color-primary)] bg-[var(--color-primary-50)] px-3 py-1 rounded-xl border border-[var(--color-primary-200)]">
                {currentStep.badge}
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 mt-2 tracking-tight">
                {currentStep.title}
              </h1>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)] text-white flex items-center justify-center shadow-md shrink-0">
              <currentStep.icon className="w-6 h-6" />
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-5">
            <motion.div
              className="bg-[var(--color-primary)] h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>

          {/* Step Pill Indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {STEPS.map((step, idx) => {
              const isDone = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`p-2.5 rounded-2xl border text-center transition-all text-xs font-bold flex items-center justify-center gap-2 ${
                    isCurrent
                      ? 'bg-[var(--color-primary-50)] border-[var(--color-primary)] text-[var(--color-primary-700)] shadow-xs'
                      : isDone
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {isDone ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-current opacity-20 flex items-center justify-center text-[11px] shrink-0 font-mono">
                      {step.id}
                    </span>
                  )}
                  <span className="truncate">Étape 0{step.id}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Wizard Step Main Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-elevation-2 bg-white mb-6">
              
              {/* Step Subtitle & Description */}
              <div className="mb-6">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {currentStep.subtitle}
                  </span>
                  <span className="text-xs font-extrabold text-[var(--color-primary)] bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-100">
                    {currentStep.metric}
                  </span>
                </div>
                <p className="text-sm text-gray-800 leading-relaxed font-medium">
                  {currentStep.description}
                </p>
              </div>

              {/* Do & Don't Clean Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {/* Do List */}
                <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-800 uppercase tracking-wider mb-3">
                    <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                    <span>Pratiques recommandées</span>
                  </div>
                  <ul className="space-y-2.5">
                    {currentStep.doList.map((item, idx) => (
                      <li key={idx} className="text-xs sm:text-sm text-gray-900 flex items-start gap-2.5 leading-relaxed font-semibold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Don't List */}
                <div className="p-5 rounded-2xl bg-rose-50/70 border border-rose-200">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-rose-800 uppercase tracking-wider mb-3">
                    <XCircle className="w-4.5 h-4.5 text-rose-600 shrink-0" />
                    <span>À éviter</span>
                  </div>
                  <ul className="space-y-2.5">
                    {currentStep.dontList.map((item, idx) => (
                      <li key={idx} className="text-xs sm:text-sm text-gray-900 flex items-start gap-2.5 leading-relaxed font-semibold">
                        <span className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Pro Tip */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/90 flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-amber-950 leading-relaxed font-medium">
                  <strong className="font-extrabold">Conseil DaloaMarket :</strong> {currentStep.proTip}
                </p>
              </div>

            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Wizard Footer Navigation */}
        <div className="flex items-center justify-between gap-4 mb-10">
          <Button
            variant="outlined"
            size="md"
            onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentStepIndex === 0}
            className="border-gray-300 text-gray-700 hover:bg-gray-100 font-extrabold rounded-2xl px-5"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Précédent
          </Button>

          {currentStepIndex < STEPS.length - 1 ? (
            <Button
              size="md"
              onClick={() => setCurrentStepIndex((prev) => Math.min(STEPS.length - 1, prev + 1))}
              className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-600)] text-white font-extrabold rounded-2xl px-6 shadow-elevation-1"
            >
              Étape suivante
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              size="md"
              onClick={() => navigate('/create-listing')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl px-6 shadow-elevation-2"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Publier une annonce
            </Button>
          )}
        </div>

        {/* Clean FAQ Section */}
        <Card className="p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-elevation-1 bg-white mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
            <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--color-primary)]" />
              Questions fréquentes des vendeurs
            </h3>

            {/* Filter Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher dans la FAQ..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 focus:ring-2 focus:ring-[var(--color-primary)] focus:outline-none bg-gray-50"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={idx} className="border border-gray-100 rounded-2xl overflow-hidden transition-all bg-gray-50/60">
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full p-4 text-left flex items-center justify-between font-bold text-xs sm:text-sm text-gray-900 hover:text-[var(--color-primary)] transition-colors"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[var(--color-primary)]' : 'text-gray-400'}`} />
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-4 pb-4 text-xs sm:text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3 font-medium"
                        >
                          {faq.a}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-gray-500 text-center py-4">Aucune question trouvée pour "{searchQuery}".</p>
            )}
          </div>
        </Card>

      </div>
    </div>
  );
}
