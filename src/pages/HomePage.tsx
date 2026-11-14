import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Plus, Search } from 'lucide-react';

import { useSEO } from '../hooks/useSEO';
import { useHomeFeed } from '../hooks/useHomeFeed';
import { CATEGORIES } from '../lib/utils';
import { getCategoryById, getCategoryPath } from '../lib/categoryCatalog';
import { Button } from '../components/ui/Button';
import { ErrorState } from '../components/ui/ErrorState';
import { SectionHeader } from '../components/ui/SectionHeader';
import ListingCard from '../components/listings/ListingCard';
import ListingCardSkeleton from '../components/listings/ListingCardSkeleton';
import { HomeForYouSection } from '../components/home/HomeForYouSection';
import { PromoBannersCarousel } from '../components/home/PromoBannersCarousel';
import { WebFlashDealsSection } from '../components/home/WebFlashDealsSection';
import { CommunityProofStrip } from '../components/home/CommunityProofStrip';
import {
  CATEGORY_STYLE,
  HomeBottomBanners,
  HomeCategoryStrip,
  HomeHeroSection,
} from '../components/home/HomeHeroAndCategories';
import { usePhase } from '../contexts/PhaseContext';

const HomePage: React.FC = () => {
  useSEO('Accueil', {
    description: "Achetez et vendez à Daloa (Côte d'Ivoire) en toute simplicité sur DaloaMarket. Publiez des annonces gratuitement et trouvez des bonnes affaires locales près de chez vous.",
    keywords: "DaloaMarket, acheter Daloa, vendre Daloa, Côte d'Ivoire, petites annonces, marketplace locale, e-commerce Daloa, Côte d'Ivoire marketplace",
    canonical: 'https://daloamarket.com',
  });

  const navigate = useNavigate();
  const { isPhase0 } = usePhase();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const {
    listings,
    loading,
    error,
    showLocationWarning,
    fetchListings,
    forYouRecommendations,
    mapToListingCard,
  } = useHomeFeed(selectedCategory);

  const currentCategoryObj = CATEGORIES.find((cat) => cat.id === selectedCategory);

  const browseAllPath = useCallback(() => {
    if (selectedCategory === 'all') return '/search';
    const target = getCategoryById(selectedCategory);
    return target ? getCategoryPath(target) : `/search?category=${selectedCategory}`;
  }, [selectedCategory]);

  return (
    <div className="min-h-screen bg-gray-50/70">
      <HomeHeroSection
        showLocationWarning={showLocationWarning}
        onConfigureLocation={() => navigate('/settings?tab=boutique')}
      />

      <CommunityProofStrip isPhase0={isPhase0} />

      <HomeCategoryStrip
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {selectedCategory === 'all' && (
        <>
          <PromoBannersCarousel />
          <WebFlashDealsSection />
        </>
      )}

      {selectedCategory === 'all' && forYouRecommendations.length > 0 && !loading && (
        <HomeForYouSection recommendations={forYouRecommendations} />
      )}

      <section className="pb-6 pt-2">
        <div className="px-4 lg:px-8 max-w-5xl mx-auto">
          <SectionHeader
            title={selectedCategory === 'all' ? 'Dernières annonces' : (currentCategoryObj?.label || 'Catégorie')}
            action={{
              label: 'Voir tout',
              to: browseAllPath(),
            }}
          />

          {loading && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 mt-1.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <ListingCardSkeleton key={i} />
              ))}
            </div>
          )}

          {error && !loading && (
            <ErrorState
              message={error}
              onRetry={() => fetchListings(selectedCategory)}
            />
          )}

          {!loading && !error && listings.length === 0 && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/40 p-6 sm:p-8 text-center my-2 max-w-md mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-primary flex items-center justify-center mx-auto mb-3 shadow-inner">
                {currentCategoryObj
                  ? (CATEGORY_STYLE[currentCategoryObj.id]?.icon || <Package className="w-5 h-5" />)
                  : <Search className="w-5 h-5" />}
              </div>
              <h3 className="text-sm font-black text-gray-900 mb-1">
                {selectedCategory === 'all'
                  ? 'Aucune annonce disponible'
                  : `Aucun article en ${currentCategoryObj?.label || selectedCategory}`}
              </h3>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                Soyez le tout premier vendeur à publier dans cette catégorie à Daloa !
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button
                  color="primary"
                  size="sm"
                  onClick={() => navigate('/create-listing')}
                  className="rounded-xl shadow-xs font-black text-xs h-10"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Publier une annonce
                </Button>
                <Button
                  variant="outlined"
                  size="sm"
                  onClick={() => setSelectedCategory('all')}
                  className="rounded-xl font-bold text-xs h-10 border-gray-200 text-gray-700"
                >
                  Toutes les annonces
                </Button>
              </div>
            </div>
          )}

          {!loading && !error && listings.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 mt-1.5">
              {listings.map((listing, index) => (
                <ListingCard
                  key={listing.id}
                  listing={mapToListingCard(listing)}
                  index={index}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <HomeBottomBanners />
    </div>
  );
};

export default HomePage;
