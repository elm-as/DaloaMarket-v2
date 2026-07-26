import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Share2, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatShopShareText, shareWithImage } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PHASE0_FREE_MODE } from '../../lib/featureFlags';

export const ProfileShopTab: React.FC<{ userProfile: any }> = ({ userProfile }) => {
  const navigate = useNavigate();
  const isPro = userProfile?.pro_until ? new Date(userProfile.pro_until) > new Date() : false;

  const handleShareShop = async () => {
    if (!userProfile?.id) return;
    const { title, text } = formatShopShareText({
      id: userProfile.id,
      shop_name: userProfile.shop_name,
      full_name: userProfile.full_name
    });
    const imageUrl = userProfile.shop_logo_url || userProfile.shop_banner_url || userProfile.avatar_url || null;
    const res = await shareWithImage(title, text, imageUrl);
    if (res.copied) {
      toast.success('Lien et texte de votre boutique copiés ! (Faites Ctrl+V dans la légende si besoin)', { duration: 5000 });
    }
  };

  return (
    <div className="space-y-4">
      {!isPro && !PHASE0_FREE_MODE ? (
        <Card elevation={2} padding="md" className="rounded-2xl text-center">
          <Store className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-900 mb-1">
            Passez Pro pour personnaliser votre boutique
          </p>
          <p className="text-xs text-gray-500 mb-4">
            Créez votre vitrine personnalisee et attirez plus de clients.
          </p>
          <Button
            color="primary"
            size="sm"
            onClick={() => navigate('/devenir-pro')}
          >
            Devenir Pro
          </Button>
        </Card>
      ) : (
        <>
          <div className="bg-[var(--color-surface)] rounded-2xl shadow-[var(--elevation-2)] overflow-hidden">
            <div className="relative aspect-[3/1] bg-gray-100">
              {userProfile?.shop_banner_url ? (
                <img
                  src={userProfile.shop_banner_url}
                  alt="Bannière boutique"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${userProfile?.shop_theme_color || '#FF7F00'}22, ${userProfile?.shop_theme_color || '#FF7F00'}44)`,
                  }}
                >
                  <Store className="w-10 h-10 text-gray-400" />
                </div>
              )}
            </div>
            <div className="p-4 flex items-start gap-3">
              {userProfile?.shop_logo_url && (
                <img
                  src={userProfile.shop_logo_url}
                  alt="Logo boutique"
                  className="w-14 h-14 rounded-xl object-cover ring-2 ring-white -mt-10 relative z-10 bg-white shadow-sm"
                />
              )}
              <div className={!userProfile?.shop_logo_url ? 'mt-0' : ''}>
                <h3 className="font-bold text-gray-900">
                  {userProfile?.shop_name || userProfile?.full_name || 'Ma boutique'}
                </h3>
                {userProfile?.shop_description && (
                  <p className="text-xs text-gray-500 mt-1">
                    {userProfile.shop_description}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                fullWidth
                onClick={() => navigate('/settings?tab=boutique')}
                icon={<Store className="w-4 h-4" />}
              >
                Personnaliser ma boutique
              </Button>

              {/* Bouton Partager réservé UNIQUEMENT aux vendeurs Pro */}
              {isPro && (
                <Button
                  fullWidth
                  variant="outlined"
                  color="primary"
                  onClick={handleShareShop}
                  icon={<Share2 className="w-4 h-4" />}
                >
                  Partager ma boutique
                </Button>
              )}
            </div>

            {/* Bouton Mes livreurs affiliés */}
            <Button
              fullWidth
              variant="outlined"
              color="secondary"
              onClick={() => navigate('/mes-livreurs')}
              icon={<Truck className="w-4 h-4" />}
            >
              Mes livreurs affiliés & Logistique
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
