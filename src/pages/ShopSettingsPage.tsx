import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * ShopSettingsPage est maintenant fusionné dans SettingsPage (onglet Boutique).
 * Cette page redirige automatiquement vers /settings?tab=boutique pour
 * maintenir la compatibilité avec les anciens liens.
 */
export default function ShopSettingsPage() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/settings?tab=boutique', { replace: true });
  }, [navigate]);
  return null;
}