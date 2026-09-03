import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Share2, Truck, Sparkles, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatShopShareText, shareWithImage, getSellerPath } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { usePhase } from '../../contexts/PhaseContext';

export const ProfileShopTab: React.FC<{ userProfile: any }> = ({ userProfile }) => {
  const navigate = useNavigate();
  const { isPhase0 } = usePhase();
  const isPro = userProfile?.pro_until ? new Date(userProfile.pro_until) > new Date() : false;
  const [listingCount, setListingCount] = useState(0);

  // Compter les annonces actives pour le texte de partage
  useEffect(() => {
    if (!userProfile?.id) return;
    supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userProfile.id)
      .eq('status', 'active')
      .then(({ count }) => {
        setListingCount(count || 0);
      });
  }, [userProfile?.id]);

  const handleShareShop = async () => {
    if (!userProfile?.id) return;
    const { title, text } = formatShopShareText({
      id: userProfile.id,
      shop_name: userProfile.shop_name,
      full_name: userProfile.full_name,
      shop_slug: userProfile.shop_slug || null,
      district: userProfile.district || null,
      listing_count: listingCount,
    });
    const imageUrl = userProfile.shop_logo_url || userProfile.shop_banner_url || userProfile.avatar_url || null;
    const res = await shareWithImage(title, text, imageUrl);
    if (res.copied) {
      toast.success('Lien et texte de votre boutique copiés !', { duration: 4000 });
    }
  };

  const shopUrl = userProfile?.id
    ? `daloamarket.com${getSellerPath(userProfile.id, userProfile.shop_slug || null)}`
    : '';

  return (
    <div className="space-y-4">
      {!isPro && !isPhase0 ? (
        <Card elevation={2} padding="md" className="rounded-3xl text-center border border-gray-100 shadow-lg shadow-gray-200/50 p-6">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto mb-3">
            <Store className="w-7 h-7" />
          </div>
          <h3 className="text-base font-extrabold text-gray-900 mb-1">
            Passez Pro pour personnaliser votre boutique
          </h3>
          <p className="text-xs text-gray-500 mb-4 max-w-sm mx-auto">
            Créez votre vitrine personnalisée, avec bannière, logo et lien dédié pour booster vos ventes.
          </p>
          <button
            type="button"
            onClick={() => navigate('/devenir-pro')}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 text-white font-extrabold text-xs shadow-md shadow-orange-500/25 active:scale-95 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Devenir Vendeur Pro</span>
          </button>
        </Card>
      ) : (
        <>
          {/* Shop preview card */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/50 overflow-hidden">
            <div className="relative aspect-[3/1] bg-gray-100">
              {userProfile?.shop_banner_url ? (
                <img
                  src={userProfile.shop_banner_url}
                  alt="Bannière boutique"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${userProfile?.shop_theme_color || '#FF7F00'}22, ${userProfile?.shop_theme_color || '#FF7F00'}44)`,
                  }}
                >
                  <Store className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>

            <div className="p-4 flex items-start gap-3.5">
              {userProfile?.shop_logo_url ? (
                <img
                  src={userProfile.shop_logo_url}
                  alt="Logo boutique"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  className="w-14 h-14 rounded-2xl object-cover ring-4 ring-white -mt-9 relative z-10 bg-white shadow-md flex-shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 ring-4 ring-white -mt-9 relative z-10 shadow-md flex items-center justify-center flex-shrink-0">
                  <Store className="w-6 h-6" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h3 className="font-black tracking-tight text-gray-900 truncate">
                  {userProfile?.shop_name || userProfile?.full_name || 'Ma boutique'}
                </h3>
                {userProfile?.shop_description ? (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                    {userProfile.shop_description}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 mt-0.5 italic">Aucune description configurée</p>
                )}
                {/* Afficher l'URL de la boutique */}
                {shopUrl && (
                  <p className="text-[10px] font-bold text-orange-500 mt-1 truncate">
                    🔗 {shopUrl}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Action Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/settings?tab=boutique')}
              className="flex items-center justify-center gap-2 h-11 rounded-2xl bg-white border border-gray-200 text-gray-800 hover:border-orange-300 hover:text-orange-600 text-xs font-bold shadow-2xs active:scale-95 transition-all"
            >
              <Settings className="w-4 h-4 text-orange-500" />
              <span>Personnaliser ma vitrine</span>
            </button>

            <button
              type="button"
              onClick={handleShareShop}
              className="flex items-center justify-center gap-2 h-11 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 text-white text-xs font-extrabold shadow-md shadow-orange-500/20 active:scale-95 transition-all"
            >
              <Share2 className="w-4 h-4" />
              <span>Partager ma boutique</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

