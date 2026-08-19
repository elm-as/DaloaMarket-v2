import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { PHASE0_FREE_MODE } from '../lib/featureFlags';

export interface MaintenanceConfig {
  enabled: boolean;
  expected_reopening: string | null;
  message: string;
}

export interface PaymentConfig {
  status: 'normal' | 'degraded' | 'down';
  notice: string;
  disable_online_payments: boolean;
  force_cod_only: boolean;
}

export interface CancellationConfig {
  max_consecutive_cancellations: number;
  enabled: boolean;
  notice: string;
}

export interface PhaseConfig {
  phase: 0 | 1;
  allow_cod_for_all: boolean;
  allow_pickup_for_all: boolean;
  allow_affiliated_deliverers_for_all: boolean;
  max_free_listings: number;
  enable_boost: boolean;
  enable_bump: boolean;
  enable_seller_badge: boolean;
  default_payment_method: 'cod' | 'online';
  /** Override du taux commission vendeur (null = utiliser le défaut de delivery.ts) */
  seller_fee_override: number | null;
}

const DEFAULT_PHASE_CONFIG: PhaseConfig = {
  phase: PHASE0_FREE_MODE ? 0 : 1, // Défaut Phase 0 ou Phase 1
  allow_cod_for_all: true,
  allow_pickup_for_all: true,
  allow_affiliated_deliverers_for_all: true,
  max_free_listings: 999999,
  enable_boost: true,
  enable_bump: true,
  enable_seller_badge: true,
  default_payment_method: 'cod',
  seller_fee_override: PHASE0_FREE_MODE ? 0 : null, // 0% commission en Phase 0
};

export function useSystemSettings() {
  const [maintenance, setMaintenance] = useState<MaintenanceConfig>({
    enabled: false,
    expected_reopening: null,
    message: 'DaloaMarket est actuellement en maintenance.',
  });

  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>({
    status: 'normal',
    notice: '',
    disable_online_payments: false,
    force_cod_only: false,
  });

  const [cancellationSettings, setCancellationSettings] = useState<CancellationConfig>({
    max_consecutive_cancellations: 3,
    enabled: true,
    notice: 'Vous avez atteint la limite de 3 annulations consécutives. Afin de limiter les frais de remboursement, veuillez contacter le support pour toute demande d\'annulation.',
  });

  const [phaseConfig, setPhaseConfig] = useState<PhaseConfig>(DEFAULT_PHASE_CONFIG);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await (supabase.from as any)('system_settings').select('*');
      if (error) {
        return;
      }

      if (data) {
        data.forEach((row: any) => {
          if (row.key === 'maintenance_mode') {
            setMaintenance(row.value as MaintenanceConfig);
          } else if (row.key === 'payment_settings') {
            setPaymentConfig(row.value as PaymentConfig);
          } else if (row.key === 'cancellation_settings') {
            setCancellationSettings(row.value as CancellationConfig);
          } else if (row.key === 'phase_config') {
            setPhaseConfig({
              ...DEFAULT_PHASE_CONFIG,
              ...(row.value as Partial<PhaseConfig>),
            });
          }
        });
      }
    } catch {
      // Table fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();

    // Écouter les changements en temps réel via Supabase Realtime
    const channelId = `sys_settings_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase.channel(channelId);

    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_settings' },
        () => {
          fetchSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSettings]);

  return {
    maintenance,
    paymentConfig,
    cancellationSettings,
    phaseConfig,
    loading,
    refreshSettings: fetchSettings,
  };
}
