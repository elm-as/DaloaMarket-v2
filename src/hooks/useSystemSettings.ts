import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

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

  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await (supabase.from as any)('system_settings').select('*');
      if (error) {
        // Table not created yet or 404 - use default fallback settings
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
    loading,
    refreshSettings: fetchSettings,
  };
}
