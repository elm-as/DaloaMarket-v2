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
    const channelName = `sys_settings_${Date.now()}`;
    const channel = supabase.channel(channelName);

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
    loading,
    refreshSettings: fetchSettings,
  };
}
