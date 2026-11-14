import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Bike,
  BookOpen,
  Car,
  ChevronRight,
  Dumbbell,
  Home,
  MapPin,
  Monitor,
  Plus,
  Search,
  Shield,
  Shirt,
  Sparkles,
  Tag,
  UtensilsCrossed,
  Zap,
} from 'lucide-react';
import { CATEGORIES, cn } from '../../lib/utils';
import { Button } from '../ui/Button';

export const CATEGORY_STYLE: Record<string, { icon: React.ReactNode; bg: string; border: string }> = {
  fashion: { icon: <Shirt className="h-4 w-4" />, bg: 'bg-pink-50 text-pink-600', border: 'border-pink-200' },
  electronics: { icon: <Monitor className="h-4 w-4" />, bg: 'bg-blue-50 text-blue-600', border: 'border-blue-200' },
  home: { icon: <Home className="h-4 w-4" />, bg: 'bg-amber-50 text-amber-600', border: 'border-amber-200' },
  vehicles: { icon: <Car className="h-4 w-4" />, bg: 'bg-red-50 text-red-600', border: 'border-red-200' },
  beauty: { icon: <Sparkles className="h-4 w-4" />, bg: 'bg-fuchsia-50 text-fuchsia-600', border: 'border-fuchsia-200' },
  sports: { icon: <Dumbbell className="h-4 w-4" />, bg: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-200' },
  books: { icon: <BookOpen className="h-4 w-4" />, bg: 'bg-cyan-50 text-cyan-600', border: 'border-cyan-200' },
  food: { icon: <UtensilsCrossed className="h-4 w-4" />, bg: 'bg-orange-50 text-orange-600', border: 'border-orange-200' },
};

interface HomeHeroSectionProps {
  showLocationWarning: boolean;
  onConfigureLocation: () => void;
}

export const HomeHeroSection: React.FC<HomeHeroSectionProps> = ({
  showLocationWarning,
  onConfigureLocation,
}) => (
  <>
    {showLocationWarning && (
      <div className="mx-4 mt-4 flex items-center justify-between gap-3 rounded-2xl border border-orange-100 bg-white px-4 py-3 shadow-sm shadow-orange-100/60">
        <div className="flex min-w-0 items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-500" />
          <div className="min-w-0">
            <h4 className="text-left text-sm font-bold text-gray-900">Emplacement boutique manquant</h4>
            <p className="mt-0.5 text-left text-xs text-gray-600">
              Configurez votre localisation pour calculer les distances et les frais de livraison.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          color="primary"
          variant="filled"
          onClick={onConfigureLocation}
          className="flex-shrink-0 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-xs font-extrabold"
        >
          Configurer
        </Button>
      </div>
    )}

    <section className="relative overflow-hidden bg-gradient-to-br from-primary via-orange-600 to-amber-700 px-4 pt-5 pb-7 rounded-b-[32px] shadow-md shadow-orange-500/15 sm:px-6 md:py-8 lg:px-12">
      <div className="pointer-events-none absolute -top-12 -right-10 w-48 h-48 rounded-full bg-white/15 blur-2xl" />

      <div className="relative z-10 mx-auto max-w-2xl lg:max-w-5xl">
        <div className="lg:flex lg:items-center lg:justify-between lg:gap-10">
          <div className="flex-1 text-left">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-md px-3 py-0.5 text-[11px] font-black text-white border border-white/20">
              <Sparkles className="w-3 h-3 text-amber-200 fill-amber-200" />
              <span>Marketplace & Livraison · Daloa</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-[1.15]">
              Tout Daloa,{' '}
              <span className="bg-gradient-to-r from-amber-200 via-amber-100 to-yellow-200 bg-clip-text text-transparent">
                au même endroit.
              </span>
            </h1>

            <p className="mt-1.5 max-w-md text-xs sm:text-sm font-medium text-orange-100/90 leading-relaxed">
              Achetez et vendez en toute confiance. Paiement garanti et livraison géolocalisée.
            </p>

            <div className="mt-3.5 max-w-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Link
                to="/search"
                className="flex h-11 flex-1 items-center gap-2.5 rounded-2xl bg-white px-3.5 text-left shadow-lg shadow-orange-950/15 transition-all active:scale-[0.99] border border-orange-100/60 group"
                aria-label="Rechercher une annonce"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-orange-50 text-orange-600 flex-shrink-0">
                  <Search className="h-4 w-4" />
                </div>
                <span className="flex-1 truncate text-xs sm:text-sm font-semibold text-gray-400">
                  Rechercher un produit, un quartier...
                </span>
                <ArrowRight className="h-4 w-4 text-orange-600 shrink-0" />
              </Link>

              <Link
                to="/create-listing"
                className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-gray-900/25 backdrop-blur-md border border-white/30 px-4 text-xs font-black text-white hover:bg-gray-900/35 active:scale-95 transition-all"
              >
                <Plus className="h-4 w-4 stroke-[3]" />
                <span>Publier une annonce</span>
              </Link>
            </div>
          </div>

          <div className="hidden w-60 grid-cols-1 gap-2.5 lg:grid">
            <div className="rounded-2xl border border-white/25 bg-white/15 backdrop-blur-md p-3.5 text-white">
              <div className="flex items-center gap-2 mb-0.5">
                <Shield className="h-4 w-4 text-amber-200" />
                <span className="text-xs font-black">Paiement Garanti</span>
              </div>
              <p className="text-[11px] text-orange-100 font-medium">Séquestre sécurisé ou paiement à la livraison</p>
            </div>

            <div className="rounded-2xl border border-white/25 bg-white/15 backdrop-blur-md p-3.5 text-white">
              <div className="flex items-center gap-2 mb-0.5">
                <MapPin className="h-4 w-4 text-amber-200" />
                <span className="text-xs font-black">100% Daloa</span>
              </div>
              <p className="text-[11px] text-orange-100 font-medium">Commerçants & coursiers de proximité</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </>
);

interface HomeCategoryStripProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export const HomeCategoryStrip: React.FC<HomeCategoryStripProps> = ({
  selectedCategory,
  onSelectCategory,
}) => (
  <section className="pt-3 pb-1">
    <div className="px-4 lg:px-8 max-w-5xl mx-auto">
      <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 -mx-4 px-4 sm:mx-0 sm:px-0">
        <button
          type="button"
          onClick={() => onSelectCategory('all')}
          aria-pressed={selectedCategory === 'all'}
          className={cn(
            'flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-all active:scale-95 whitespace-nowrap shadow-2xs',
            selectedCategory === 'all'
              ? 'bg-gradient-to-r from-orange-500 via-primary to-amber-600 text-white shadow-xs font-black'
              : 'border border-gray-200/80 bg-white text-gray-700 hover:border-orange-300 hover:text-primary'
          )}
        >
          <Search className={cn('h-3.5 w-3.5', selectedCategory === 'all' ? 'text-white' : 'text-primary')} />
          <span>Toutes</span>
        </button>

        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const style = CATEGORY_STYLE[cat.id] || {
            icon: <Tag className="h-3.5 w-3.5" />,
            bg: 'text-primary',
            border: 'border-orange-100',
          };

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              aria-pressed={isSelected}
              className={cn(
                'flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-all active:scale-95 whitespace-nowrap shadow-2xs',
                isSelected
                  ? 'bg-gradient-to-r from-orange-500 via-primary to-amber-600 text-white shadow-xs font-black'
                  : 'border border-gray-200/80 bg-white text-gray-700 hover:border-orange-300 hover:text-primary'
              )}
            >
              <span className={cn('flex items-center justify-center', isSelected ? 'text-white' : style.bg)}>
                {style.icon}
              </span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  </section>
);

export const HomeBottomBanners: React.FC = () => (
  <>
    <section className="px-4 pb-6">
      <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <Link
          to="/express"
          className="flex items-center justify-between gap-2.5 px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-2xl shadow-xs no-underline active:scale-[0.99] hover:opacity-95 transition-all group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <p className="text-xs font-extrabold text-white truncate">
              Coursier Express · <span className="text-amber-100 font-semibold">Colis & Plis dès 500 F</span>
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-white flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </Link>

        <a
          href="https://delivery.daloamarket.com/annuaire"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-2.5 px-4 py-3 bg-white rounded-2xl shadow-xs border border-orange-100/80 no-underline active:scale-[0.99] hover:bg-orange-50/50 transition-all group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-primary flex items-center justify-center flex-shrink-0">
              <Bike className="w-4 h-4" />
            </div>
            <p className="text-xs font-medium text-gray-700 truncate">
              Annuaire des coursiers · <span className="text-primary font-black">DaloaDelivery</span>
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-primary flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </a>
      </div>
    </section>

    <section className="px-4 pb-12">
      <div className="max-w-5xl mx-auto">
        <div className="rounded-3xl bg-gradient-to-br from-primary via-orange-600 to-amber-600 p-6 sm:p-8 text-center text-white shadow-xl shadow-orange-500/20">
          <h2 className="text-lg sm:text-2xl font-black mb-2 tracking-tight">
            Vous avez un article à vendre ?
          </h2>
          <p className="text-xs sm:text-sm text-orange-100 max-w-md mx-auto mb-5 font-medium leading-relaxed">
            Publiez gratuitement en moins de 2 minutes et trouvez des acheteurs dans toute la ville de Daloa.
          </p>
          <Link
            to="/create-listing"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-6 text-xs font-black text-primary shadow-lg hover:bg-orange-50 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>Déposer une annonce gratuite</span>
          </Link>
        </div>
      </div>
    </section>
  </>
);
