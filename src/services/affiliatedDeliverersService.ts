import { supabase } from '../lib/supabase';

export interface SellerDeliverySettings {
  seller_id: string;
  home_delivery_enabled: boolean;
  cash_on_delivery_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AffiliatedDeliverer {
  id: string; // affiliation id
  seller_id: string;
  delivery_person_id: string;
  status: 'pending' | 'active' | 'rejected';
  created_at: string;
  delivery_person: {
    id: string;
    name: string;
    phone: string;
    photo_url: string | null;
    is_available: boolean;
    vehicle_type: string;
    rating: number;
  };
}

export const affiliatedDeliverersService = {
  /**
   * Récupère les paramètres de livraison d'un vendeur.
   */
  async getSellerDeliverySettings(sellerId: string): Promise<SellerDeliverySettings> {
    try {
      const { data, error } = await (supabase as any)
        .from('seller_delivery_settings')
        .select('*')
        .eq('seller_id', sellerId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching seller delivery settings:', error);
      }

      return {
        seller_id: sellerId,
        home_delivery_enabled: data?.home_delivery_enabled ?? true,
        cash_on_delivery_enabled: data?.cash_on_delivery_enabled ?? false,
      };
    } catch (err) {
      console.error('getSellerDeliverySettings error:', err);
      return {
        seller_id: sellerId,
        home_delivery_enabled: true,
        cash_on_delivery_enabled: false,
      };
    }
  },

  /**
   * Met à jour les paramètres de livraison du vendeur connecté.
   */
  async updateSellerDeliverySettings(
    homeDelivery: boolean,
    cashOnDelivery: boolean
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) return { success: false, message: 'Non connecté' };

      // 1. Enregistrement direct via table Supabase (fonctionne pour tous les vendeurs en Phase 0)
      const { error: upsertErr } = await (supabase as any)
        .from('seller_delivery_settings')
        .upsert({
          seller_id: userRes.user.id,
          home_delivery_enabled: homeDelivery,
          cash_on_delivery_enabled: cashOnDelivery,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'seller_id' });

      if (!upsertErr) {
        return { success: true, message: 'Paramètres enregistrés' };
      }

      // 2. Fallback via RPC Supabase
      const { data, error } = await (supabase as any).rpc('update_seller_delivery_settings', {
        p_home_delivery: homeDelivery,
        p_cash_on_delivery: cashOnDelivery,
      });

      if (!error && (data as any)?.success !== false) {
        return (data as any) || { success: true };
      }

      throw upsertErr || error || new Error((data as any)?.message || 'Erreur lors de la mise à jour');
    } catch (err: any) {
      console.error('updateSellerDeliverySettings error:', err);
      return { success: false, message: err.message || 'Erreur lors de la mise à jour' };
    }
  },

  /**
   * Récupère la liste des livreurs affiliés (actifs et en attente) pour le vendeur connecté.
   */
  async getAffiliatedDeliverers(): Promise<AffiliatedDeliverer[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('seller_delivery_affiliations')
        .select(`
          id,
          seller_id,
          delivery_person_id,
          status,
          created_at,
          delivery_person:delivery_persons (
            id,
            name,
            phone,
            photo_url,
            is_available,
            vehicle_type,
            rating
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((item: any) => ({
        id: item.id,
        seller_id: item.seller_id,
        delivery_person_id: item.delivery_person_id,
        status: item.status,
        created_at: item.created_at,
        delivery_person: Array.isArray(item.delivery_person)
          ? item.delivery_person[0]
          : item.delivery_person,
      }));
    } catch (err) {
      console.error('getAffiliatedDeliverers error:', err);
      return [];
    }
  },

  /**
   * Invite un livreur par son numéro de téléphone.
   */
  async inviteDelivererByPhone(phone: string): Promise<{ success: boolean; message?: string }> {
    try {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) return { success: false, message: 'Non connecté' };

      const cleanPhone = phone.replace(/\D/g, '');

      // 1. Recherche du coursier dans delivery_persons
      const { data: drivers } = await (supabase as any)
        .from('delivery_persons')
        .select('id, name, phone')
        .or(`phone.eq.${phone},phone.ilike.%${cleanPhone.slice(-8)}%`)
        .limit(1);

      if (drivers && drivers.length > 0) {
        const driver = drivers[0];
        const { error: affErr } = await (supabase as any)
          .from('seller_delivery_affiliations')
          .upsert({
            seller_id: userRes.user.id,
            delivery_person_id: driver.id,
            status: 'active',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'seller_id,delivery_person_id' });

        if (!affErr) {
          return { success: true, message: `Livreur ${driver.name} ajouté avec succès !` };
        }
      }

      // 2. Fallback via RPC Supabase
      const { data, error } = await (supabase as any).rpc('invite_delivery_driver_by_phone', {
        p_phone: phone,
      });

      if (!error && (data as any)?.success !== false) {
        return (data as any) || { success: true };
      }

      return {
        success: false,
        message: (data as any)?.message || 'Aucun compte livreur DaloaDelivery trouvé avec ce numéro.',
      };
    } catch (err: any) {
      console.error('inviteDelivererByPhone error:', err);
      return { success: false, message: err.message || 'Erreur lors de l\'invitation' };
    }
  },

  /**
   * Supprime ou annule une affiliation.
   */
  async removeAffiliation(affiliationId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const { error } = await (supabase as any)
        .from('seller_delivery_affiliations')
        .delete()
        .eq('id', affiliationId);

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error('removeAffiliation error:', err);
      return { success: false, message: err.message || 'Erreur lors de la suppression' };
    }
  },
};
