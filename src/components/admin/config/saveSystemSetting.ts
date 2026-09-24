import { supabase } from '../../../lib/supabase';

export type SystemSettingKey =
  | 'phase_config'
  | 'maintenance_mode'
  | 'payment_settings'
  | 'cancellation_settings';

/**
 * Enregistre un réglage système via la RPC `update_system_setting`, réservée à
 * l'administration. Lève une erreur lisible si la base refuse.
 */
export async function saveSystemSetting(key: SystemSettingKey, value: unknown): Promise<void> {
  const { data, error } = await (supabase.rpc as any)('update_system_setting', {
    p_key: key,
    p_value: value,
  });
  if (error) throw error;
  const res = data as { success?: boolean; reason?: string } | null;
  if (res && res.success === false) {
    throw new Error(res.reason || 'Modification refusée par le serveur.');
  }
}
