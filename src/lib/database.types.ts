/**
 * Généré depuis le schéma réel (Supabase, projet wjanjnoxzizxxhtbwyqd) le 24/09/2026.
 * Ne pas éditer à la main : régénérer (`supabase gen types typescript`).
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      _deprecated_delivery_offers: {
        Row: {
          created_at: string | null
          driver_id: string
          id: string
          offered_price: number
          request_id: string
          status: string
        }
        Insert: {
          created_at?: string | null
          driver_id: string
          id?: string
          offered_price: number
          request_id: string
          status?: string
        }
        Update: {
          created_at?: string | null
          driver_id?: string
          id?: string
          offered_price?: number
          request_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_offers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "delivery_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_offers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "delivery_persons_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_offers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "_deprecated_delivery_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      _deprecated_delivery_requests: {
        Row: {
          assigned_driver_id: string | null
          client_id: string
          created_at: string | null
          dropoff_location: string
          id: string
          listing_id: string
          pickup_location: string
          proposed_price: number
          seller_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          assigned_driver_id?: string | null
          client_id: string
          created_at?: string | null
          dropoff_location: string
          id?: string
          listing_id: string
          pickup_location: string
          proposed_price?: number
          seller_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          assigned_driver_id?: string | null
          client_id?: string
          created_at?: string | null
          dropoff_location?: string
          id?: string
          listing_id?: string
          pickup_location?: string
          proposed_price?: number
          seller_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_requests_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "delivery_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_requests_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "delivery_persons_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_requests_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      _deprecated_payment_methods: {
        Row: {
          account_name: string
          account_number: string
          created_at: string | null
          id: string
          is_default: boolean | null
          is_verified: boolean | null
          provider: string
          type: string
          user_id: string
        }
        Insert: {
          account_name: string
          account_number: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          is_verified?: boolean | null
          provider: string
          type: string
          user_id: string
        }
        Update: {
          account_name?: string
          account_number?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          is_verified?: boolean | null
          provider?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      _deprecated_reservations: {
        Row: {
          buyer_id: string
          buyer_rating: number | null
          cancel_reason: string | null
          cancelled_by: string | null
          completed_at: string | null
          confirmed_by_seller_at: string | null
          created_at: string | null
          delivery_address: string | null
          delivery_mode: string
          delivery_person_id: string | null
          id: string
          listing_id: string | null
          otp_code: string
          otp_expires_at: string
          proof_photo_url: string | null
          seller_id: string
          seller_rating: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          buyer_id: string
          buyer_rating?: number | null
          cancel_reason?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          confirmed_by_seller_at?: string | null
          created_at?: string | null
          delivery_address?: string | null
          delivery_mode?: string
          delivery_person_id?: string | null
          id?: string
          listing_id?: string | null
          otp_code: string
          otp_expires_at?: string
          proof_photo_url?: string | null
          seller_id: string
          seller_rating?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          buyer_id?: string
          buyer_rating?: number | null
          cancel_reason?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          confirmed_by_seller_at?: string | null
          created_at?: string | null
          delivery_address?: string | null
          delivery_mode?: string
          delivery_person_id?: string | null
          id?: string
          listing_id?: string | null
          otp_code?: string
          otp_expires_at?: string
          proof_photo_url?: string | null
          seller_id?: string
          seller_rating?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      _deprecated_user_reliability: {
        Row: {
          cancelled_by_counterparty: number | null
          cancelled_by_user: number | null
          completed_reservations: number | null
          no_show_count: number | null
          reliability_score: number | null
          response_time_avg_seconds: number | null
          total_reservations: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancelled_by_counterparty?: number | null
          cancelled_by_user?: number | null
          completed_reservations?: number | null
          no_show_count?: number | null
          reliability_score?: number | null
          response_time_avg_seconds?: number | null
          total_reservations?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancelled_by_counterparty?: number | null
          cancelled_by_user?: number | null
          completed_reservations?: number | null
          no_show_count?: number | null
          reliability_score?: number | null
          response_time_avg_seconds?: number | null
          total_reservations?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_reliability_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      account_file_purges: {
        Row: {
          attempts: number
          bucket_id: string
          id: string
          last_error: string | null
          path_prefix: string
          purged_at: string | null
          requested_at: string
        }
        Insert: {
          attempts?: number
          bucket_id: string
          id?: string
          last_error?: string | null
          path_prefix: string
          purged_at?: string | null
          requested_at?: string
        }
        Update: {
          attempts?: number
          bucket_id?: string
          id?: string
          last_error?: string | null
          path_prefix?: string
          purged_at?: string | null
          requested_at?: string
        }
        Relationships: []
      }
      account_rejoin_flags: {
        Row: {
          auto_banned: boolean
          auto_suspect: boolean
          created_at: string
          id: string
          matched_kind: string
          new_user_id: string
          previous_state: string | null
          previous_user_id: string
        }
        Insert: {
          auto_banned?: boolean
          auto_suspect?: boolean
          created_at?: string
          id?: string
          matched_kind: string
          new_user_id: string
          previous_state?: string | null
          previous_user_id: string
        }
        Update: {
          auto_banned?: boolean
          auto_suspect?: boolean
          created_at?: string
          id?: string
          matched_kind?: string
          new_user_id?: string
          previous_state?: string | null
          previous_user_id?: string
        }
        Relationships: []
      }
      admin_financial_audit_logs: {
        Row: {
          action_type: string
          admin_id: string | null
          amount: number | null
          created_at: string
          currency: string
          details: Json
          id: string
          ip_address: string | null
          recipient_name: string | null
          recipient_phone: string | null
          target_id: string | null
          target_type: string | null
          user_agent: string | null
        }
        Insert: {
          action_type: string
          admin_id?: string | null
          amount?: number | null
          created_at?: string
          currency?: string
          details?: Json
          id?: string
          ip_address?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string | null
          amount?: number | null
          created_at?: string
          currency?: string
          details?: Json
          id?: string
          ip_address?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_financial_audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassador_commissions: {
        Row: {
          ambassador_id: string | null
          amount: number
          created_at: string | null
          id: string
          seller_user_id: string | null
          source_type: string | null
          status: string | null
        }
        Insert: {
          ambassador_id?: string | null
          amount?: number
          created_at?: string | null
          id?: string
          seller_user_id?: string | null
          source_type?: string | null
          status?: string | null
        }
        Update: {
          ambassador_id?: string | null
          amount?: number
          created_at?: string | null
          id?: string
          seller_user_id?: string | null
          source_type?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ambassador_commissions_ambassador_id_fkey"
            columns: ["ambassador_id"]
            isOneToOne: false
            referencedRelation: "ambassadors"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassador_payouts: {
        Row: {
          ambassador_id: string | null
          amount: number
          id: string
          network: string
          payment_reference: string | null
          phone_number: string
          processed_at: string | null
          requested_at: string | null
          status: string | null
        }
        Insert: {
          ambassador_id?: string | null
          amount: number
          id?: string
          network: string
          payment_reference?: string | null
          phone_number: string
          processed_at?: string | null
          requested_at?: string | null
          status?: string | null
        }
        Update: {
          ambassador_id?: string | null
          amount?: number
          id?: string
          network?: string
          payment_reference?: string | null
          phone_number?: string
          processed_at?: string | null
          requested_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ambassador_payouts_ambassador_id_fkey"
            columns: ["ambassador_id"]
            isOneToOne: false
            referencedRelation: "ambassadors"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassador_prospects: {
        Row: {
          ambassador_id: string
          converted_user_id: string | null
          created_at: string
          district: string | null
          full_name: string
          id: string
          phone: string
          product_category: string | null
          registered_at: string | null
          shop_name: string
          status: string
        }
        Insert: {
          ambassador_id: string
          converted_user_id?: string | null
          created_at?: string
          district?: string | null
          full_name: string
          id?: string
          phone: string
          product_category?: string | null
          registered_at?: string | null
          shop_name: string
          status?: string
        }
        Update: {
          ambassador_id?: string
          converted_user_id?: string | null
          created_at?: string
          district?: string | null
          full_name?: string
          id?: string
          phone?: string
          product_category?: string | null
          registered_at?: string | null
          shop_name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ambassador_prospects_ambassador_id_fkey"
            columns: ["ambassador_id"]
            isOneToOne: false
            referencedRelation: "ambassadors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassador_prospects_converted_user_id_fkey"
            columns: ["converted_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassador_referral_attempts: {
        Row: {
          ambassador_id: string | null
          created_at: string
          detail: string | null
          id: string
          outcome: string
          referral_code: string
          same_ip: boolean
          seller_user_id: string | null
        }
        Insert: {
          ambassador_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          outcome: string
          referral_code: string
          same_ip?: boolean
          seller_user_id?: string | null
        }
        Update: {
          ambassador_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          outcome?: string
          referral_code?: string
          same_ip?: boolean
          seller_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ambassador_referral_attempts_ambassador_id_fkey"
            columns: ["ambassador_id"]
            isOneToOne: false
            referencedRelation: "ambassadors"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassador_referrals: {
        Row: {
          ambassador_id: string | null
          created_at: string | null
          id: string
          pro_converted_at: string | null
          seller_user_id: string | null
          status: string | null
        }
        Insert: {
          ambassador_id?: string | null
          created_at?: string | null
          id?: string
          pro_converted_at?: string | null
          seller_user_id?: string | null
          status?: string | null
        }
        Update: {
          ambassador_id?: string | null
          created_at?: string | null
          id?: string
          pro_converted_at?: string | null
          seller_user_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ambassador_referrals_ambassador_id_fkey"
            columns: ["ambassador_id"]
            isOneToOne: false
            referencedRelation: "ambassadors"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassadors: {
        Row: {
          balance_available: number | null
          created_at: string | null
          full_name: string
          id: string
          payout_network: string | null
          payout_number: string | null
          phone: string
          referral_code: string
          status: string | null
          total_earnings: number | null
          user_id: string | null
        }
        Insert: {
          balance_available?: number | null
          created_at?: string | null
          full_name: string
          id?: string
          payout_network?: string | null
          payout_number?: string | null
          phone: string
          referral_code: string
          status?: string | null
          total_earnings?: number | null
          user_id?: string | null
        }
        Update: {
          balance_available?: number | null
          created_at?: string | null
          full_name?: string
          id?: string
          payout_network?: string | null
          payout_number?: string | null
          phone?: string
          referral_code?: string
          status?: string | null
          total_earnings?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      app_config: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      banned_ips: {
        Row: {
          banned_by: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          ip_address: string
          reason: string | null
        }
        Insert: {
          banned_by?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          ip_address: string
          reason?: string | null
        }
        Update: {
          banned_by?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banned_ips_banned_by_fkey"
            columns: ["banned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cod_receivables: {
        Row: {
          amount: number
          created_at: string
          debtor_role: string
          debtor_user_id: string
          delivery_commission: number
          delivery_person_id: string | null
          id: string
          notes: string | null
          order_id: string
          seller_commission: number
          settled_at: string | null
          settled_by: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          debtor_role: string
          debtor_user_id: string
          delivery_commission?: number
          delivery_person_id?: string | null
          id?: string
          notes?: string | null
          order_id: string
          seller_commission?: number
          settled_at?: string | null
          settled_by?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          debtor_role?: string
          debtor_user_id?: string
          delivery_commission?: number
          delivery_person_id?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          seller_commission?: number
          settled_at?: string | null
          settled_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cod_receivables_debtor_user_id_fkey"
            columns: ["debtor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cod_receivables_delivery_person_id_fkey"
            columns: ["delivery_person_id"]
            isOneToOne: false
            referencedRelation: "delivery_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cod_receivables_delivery_person_id_fkey"
            columns: ["delivery_person_id"]
            isOneToOne: false
            referencedRelation: "delivery_persons_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cod_receivables_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cod_receivables_settled_by_fkey"
            columns: ["settled_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          subject?: string
        }
        Relationships: []
      }
      daloa_districts: {
        Row: {
          latitude: number
          longitude: number
          name: string
        }
        Insert: {
          latitude: number
          longitude: number
          name: string
        }
        Update: {
          latitude?: number
          longitude?: number
          name?: string
        }
        Relationships: []
      }
      deleted_account_fingerprints: {
        Row: {
          ban_reason: string | null
          created_at: string
          fingerprint: string
          id: string
          kind: string
          previous_user_id: string
          was_banned: boolean
        }
        Insert: {
          ban_reason?: string | null
          created_at?: string
          fingerprint: string
          id?: string
          kind: string
          previous_user_id: string
          was_banned?: boolean
        }
        Update: {
          ban_reason?: string | null
          created_at?: string
          fingerprint?: string
          id?: string
          kind?: string
          previous_user_id?: string
          was_banned?: boolean
        }
        Relationships: []
      }
      delivery_assignments: {
        Row: {
          accepted_at: string | null
          auto_released_at: string | null
          buyer_confirmed_at: string | null
          created_at: string
          delivered_at: string | null
          delivery_gps: Json | null
          delivery_gps_distance_m: number | null
          delivery_otp: string
          delivery_otp_attempts: number
          delivery_person_id: string | null
          delivery_photo_url: string | null
          delivery_price: number
          dispute_reason: string | null
          disputed_at: string | null
          dropoff_address: Json | null
          dropoff_location: string
          id: string
          is_private: boolean | null
          order_id: string
          pickup_address: Json | null
          pickup_confirmed_at: string | null
          pickup_confirmed_by_seller: boolean
          pickup_gps: Json | null
          pickup_gps_distance_m: number | null
          pickup_location: string
          pickup_otp: string
          pickup_otp_attempts: number
          pickup_photo_url: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          seller_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          auto_released_at?: string | null
          buyer_confirmed_at?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_gps?: Json | null
          delivery_gps_distance_m?: number | null
          delivery_otp: string
          delivery_otp_attempts?: number
          delivery_person_id?: string | null
          delivery_photo_url?: string | null
          delivery_price?: number
          dispute_reason?: string | null
          disputed_at?: string | null
          dropoff_address?: Json | null
          dropoff_location?: string
          id?: string
          is_private?: boolean | null
          order_id: string
          pickup_address?: Json | null
          pickup_confirmed_at?: string | null
          pickup_confirmed_by_seller?: boolean
          pickup_gps?: Json | null
          pickup_gps_distance_m?: number | null
          pickup_location?: string
          pickup_otp?: string
          pickup_otp_attempts?: number
          pickup_photo_url?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          seller_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          auto_released_at?: string | null
          buyer_confirmed_at?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_gps?: Json | null
          delivery_gps_distance_m?: number | null
          delivery_otp?: string
          delivery_otp_attempts?: number
          delivery_person_id?: string | null
          delivery_photo_url?: string | null
          delivery_price?: number
          dispute_reason?: string | null
          disputed_at?: string | null
          dropoff_address?: Json | null
          dropoff_location?: string
          id?: string
          is_private?: boolean | null
          order_id?: string
          pickup_address?: Json | null
          pickup_confirmed_at?: string | null
          pickup_confirmed_by_seller?: boolean
          pickup_gps?: Json | null
          pickup_gps_distance_m?: number | null
          pickup_location?: string
          pickup_otp?: string
          pickup_otp_attempts?: number
          pickup_photo_url?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          seller_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_assignments_delivery_person_id_fkey"
            columns: ["delivery_person_id"]
            isOneToOne: false
            referencedRelation: "delivery_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_assignments_delivery_person_id_fkey"
            columns: ["delivery_person_id"]
            isOneToOne: false
            referencedRelation: "delivery_persons_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_assignments_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_assignments_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_person_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          delivery_person_id: string | null
          id: string
          rating: number | null
          reviewer_id: string
          reviewer_name: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          delivery_person_id?: string | null
          id?: string
          rating?: number | null
          reviewer_id: string
          reviewer_name: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          delivery_person_id?: string | null
          id?: string
          rating?: number | null
          reviewer_id?: string
          reviewer_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_person_reviews_delivery_person_id_fkey"
            columns: ["delivery_person_id"]
            isOneToOne: false
            referencedRelation: "delivery_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_person_reviews_delivery_person_id_fkey"
            columns: ["delivery_person_id"]
            isOneToOne: false
            referencedRelation: "delivery_persons_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_person_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_persons: {
        Row: {
          ai_flagged: boolean | null
          ai_verification_results: Json | null
          cni_url: string | null
          coverage_zones: string[] | null
          created_at: string | null
          current_location: string | null
          description: string | null
          email: string | null
          id: string
          is_available: boolean | null
          is_verified: boolean | null
          licence_url: string | null
          name: string
          payout_network: string | null
          payout_number: string | null
          permis_url: string | null
          phone: string
          photo_url: string | null
          portrait_live_url: string | null
          pricing_description: string | null
          rating: number | null
          selfie_cni_url: string | null
          total_reviews: number | null
          updated_at: string | null
          user_id: string
          vehicle_details: string | null
          vehicle_type: string
          verification_rejection_reason: string | null
          verification_status: string | null
        }
        Insert: {
          ai_flagged?: boolean | null
          ai_verification_results?: Json | null
          cni_url?: string | null
          coverage_zones?: string[] | null
          created_at?: string | null
          current_location?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_available?: boolean | null
          is_verified?: boolean | null
          licence_url?: string | null
          name: string
          payout_network?: string | null
          payout_number?: string | null
          permis_url?: string | null
          phone: string
          photo_url?: string | null
          portrait_live_url?: string | null
          pricing_description?: string | null
          rating?: number | null
          selfie_cni_url?: string | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id: string
          vehicle_details?: string | null
          vehicle_type: string
          verification_rejection_reason?: string | null
          verification_status?: string | null
        }
        Update: {
          ai_flagged?: boolean | null
          ai_verification_results?: Json | null
          cni_url?: string | null
          coverage_zones?: string[] | null
          created_at?: string | null
          current_location?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_available?: boolean | null
          is_verified?: boolean | null
          licence_url?: string | null
          name?: string
          payout_network?: string | null
          payout_number?: string | null
          permis_url?: string | null
          phone?: string
          photo_url?: string | null
          portrait_live_url?: string | null
          pricing_description?: string | null
          rating?: number | null
          selfie_cni_url?: string | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id?: string
          vehicle_details?: string | null
          vehicle_type?: string
          verification_rejection_reason?: string | null
          verification_status?: string | null
        }
        Relationships: []
      }
      escrow_transactions: {
        Row: {
          buyer_id: string
          created_at: string | null
          delivery_fee: number | null
          delivery_person_id: string | null
          funded_at: string | null
          id: string
          order_id: string | null
          order_metadata: Json | null
          payment_method: string
          payment_reference: string | null
          platform_fee: number | null
          refunded_at: string | null
          released_at: string | null
          seller_amount: number
          seller_id: string
          status: string
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          buyer_id: string
          created_at?: string | null
          delivery_fee?: number | null
          delivery_person_id?: string | null
          funded_at?: string | null
          id?: string
          order_id?: string | null
          order_metadata?: Json | null
          payment_method: string
          payment_reference?: string | null
          platform_fee?: number | null
          refunded_at?: string | null
          released_at?: string | null
          seller_amount: number
          seller_id: string
          status?: string
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          buyer_id?: string
          created_at?: string | null
          delivery_fee?: number | null
          delivery_person_id?: string | null
          funded_at?: string | null
          id?: string
          order_id?: string | null
          order_metadata?: Json | null
          payment_method?: string
          payment_reference?: string | null
          platform_fee?: number | null
          refunded_at?: string | null
          released_at?: string | null
          seller_amount?: number
          seller_id?: string
          status?: string
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escrow_transactions_delivery_person_id_fkey"
            columns: ["delivery_person_id"]
            isOneToOne: false
            referencedRelation: "delivery_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_transactions_delivery_person_id_fkey"
            columns: ["delivery_person_id"]
            isOneToOne: false
            referencedRelation: "delivery_persons_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          listing_id: string | null
          props: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          listing_id?: string | null
          props?: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          listing_id?: string | null
          props?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_seasons: {
        Row: {
          created_at: string | null
          ended_at: string | null
          id: string
          season_name: string
          season_number: number
          started_at: string | null
          status: string
          winner_feature_id: string | null
        }
        Insert: {
          created_at?: string | null
          ended_at?: string | null
          id?: string
          season_name?: string
          season_number?: number
          started_at?: string | null
          status?: string
          winner_feature_id?: string | null
        }
        Update: {
          created_at?: string | null
          ended_at?: string | null
          id?: string
          season_name?: string
          season_number?: number
          started_at?: string | null
          status?: string
          winner_feature_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_seasons_winner_feature_id_fkey"
            columns: ["winner_feature_id"]
            isOneToOne: false
            referencedRelation: "feature_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_suggestions: {
        Row: {
          admin_notes: string | null
          author_name: string | null
          category: string | null
          completed_at: string | null
          created_at: string | null
          created_by_ip: string | null
          description: string | null
          id: string
          is_hall_of_fame: boolean
          season_id: string | null
          season_name: string | null
          status: string | null
          title: string
          updated_at: string | null
          upvotes_count: number | null
        }
        Insert: {
          admin_notes?: string | null
          author_name?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by_ip?: string | null
          description?: string | null
          id?: string
          is_hall_of_fame?: boolean
          season_id?: string | null
          season_name?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          upvotes_count?: number | null
        }
        Update: {
          admin_notes?: string | null
          author_name?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by_ip?: string | null
          description?: string | null
          id?: string
          is_hall_of_fame?: boolean
          season_id?: string | null
          season_name?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          upvotes_count?: number | null
        }
        Relationships: []
      }
      feature_upvotes: {
        Row: {
          created_at: string | null
          feature_id: string
          id: string
          user_ip: string
        }
        Insert: {
          created_at?: string | null
          feature_id: string
          id?: string
          user_ip: string
        }
        Update: {
          created_at?: string | null
          feature_id?: string
          id?: string
          user_ip?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_upvotes_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "feature_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_views: {
        Row: {
          last_viewed_at: string
          listing_id: string
          viewer_id: string
        }
        Insert: {
          last_viewed_at?: string
          listing_id: string
          viewer_id: string
        }
        Update: {
          last_viewed_at?: string
          listing_id?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_views_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          boosted_until: string | null
          bumped_at: string | null
          category: string
          claim_code: string | null
          claimed_by: string | null
          condition: string
          contact_phone: string | null
          created_at: string
          description: string
          district: string
          fts: unknown
          id: string
          latitude: number | null
          longitude: number | null
          original_price: number | null
          photos: string[]
          price: number
          sort_at: string | null
          status: string
          stock: number
          title: string
          user_id: string
          variants: Json
          view_count: number
        }
        Insert: {
          boosted_until?: string | null
          bumped_at?: string | null
          category: string
          claim_code?: string | null
          claimed_by?: string | null
          condition: string
          contact_phone?: string | null
          created_at?: string
          description: string
          district: string
          fts?: unknown
          id?: string
          latitude?: number | null
          longitude?: number | null
          original_price?: number | null
          photos?: string[]
          price: number
          sort_at?: string | null
          status?: string
          stock?: number
          title: string
          user_id: string
          variants?: Json
          view_count?: number
        }
        Update: {
          boosted_until?: string | null
          bumped_at?: string | null
          category?: string
          claim_code?: string | null
          claimed_by?: string | null
          condition?: string
          contact_phone?: string | null
          created_at?: string
          description?: string
          district?: string
          fts?: unknown
          id?: string
          latitude?: number | null
          longitude?: number | null
          original_price?: number | null
          photos?: string[]
          price?: number
          sort_at?: string | null
          status?: string
          stock?: number
          title?: string
          user_id?: string
          variants?: Json
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "listings_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          listing_id: string | null
          read: boolean | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          listing_id?: string | null
          read?: boolean | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          listing_id?: string | null
          read?: boolean | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      monetization_transactions: {
        Row: {
          amount: number
          claim_screenshot_url: string | null
          claim_text: string | null
          claimed_at: string | null
          confirmed_at: string | null
          created_at: string
          id: string
          listing_id: string | null
          provider_reference: string | null
          provider_token: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          claim_screenshot_url?: string | null
          claim_text?: string | null
          claimed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          provider_reference?: string | null
          provider_token?: string | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          claim_screenshot_url?: string | null
          claim_text?: string | null
          claimed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          provider_reference?: string | null
          provider_token?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monetization_transactions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monetization_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string | null
          id: string
          title: string
          url: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          title: string
          url?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      order_disputes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          order_id: string
          raised_by: string
          reason: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          order_id: string
          raised_by: string
          reason: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string
          raised_by?: string
          reason?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          order_id: string
          product_amount: number
          quantity: number
          unit_price: number
          variant_id: string | null
          variant_label: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          order_id: string
          product_amount?: number
          quantity?: number
          unit_price?: number
          variant_id?: string | null
          variant_label?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          order_id?: string
          product_amount?: number
          quantity?: number
          unit_price?: number
          variant_id?: string | null
          variant_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_order_items_listings"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_id: string
          cancel_reason: string | null
          created_at: string
          delivery_address: string | null
          delivery_fee: number
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_mode: string
          distance_km: number | null
          id: string
          listing_id: string
          payment_method: string | null
          platform_commission: number
          product_amount: number
          quantity: number
          reserve_fee: number
          seller_id: string
          status: string
          total_amount: number
          unit_price: number | null
          updated_at: string
          variant_id: string | null
          variant_label: string | null
        }
        Insert: {
          buyer_id: string
          cancel_reason?: string | null
          created_at?: string
          delivery_address?: string | null
          delivery_fee?: number
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_mode?: string
          distance_km?: number | null
          id?: string
          listing_id: string
          payment_method?: string | null
          platform_commission: number
          product_amount: number
          quantity?: number
          reserve_fee?: number
          seller_id: string
          status?: string
          total_amount: number
          unit_price?: number | null
          updated_at?: string
          variant_id?: string | null
          variant_label?: string | null
        }
        Update: {
          buyer_id?: string
          cancel_reason?: string | null
          created_at?: string
          delivery_address?: string | null
          delivery_fee?: number
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_mode?: string
          distance_km?: number | null
          id?: string
          listing_id?: string
          payment_method?: string | null
          platform_commission?: number
          product_amount?: number
          quantity?: number
          reserve_fee?: number
          seller_id?: string
          status?: string
          total_amount?: number
          unit_price?: number | null
          updated_at?: string
          variant_id?: string | null
          variant_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_orders_listings"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          delivery_assignment_id: string | null
          escrow_id: string
          failure_reason: string | null
          id: string
          idempotency_key: string | null
          provider_reference: string | null
          provider_token: string | null
          recipient_phone: string
          scheduled_for: string | null
          status: string
          type: string
          user_id: string
          withdraw_mode: string | null
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          delivery_assignment_id?: string | null
          escrow_id: string
          failure_reason?: string | null
          id?: string
          idempotency_key?: string | null
          provider_reference?: string | null
          provider_token?: string | null
          recipient_phone: string
          scheduled_for?: string | null
          status?: string
          type: string
          user_id: string
          withdraw_mode?: string | null
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          delivery_assignment_id?: string | null
          escrow_id?: string
          failure_reason?: string | null
          id?: string
          idempotency_key?: string | null
          provider_reference?: string | null
          provider_token?: string | null
          recipient_phone?: string
          scheduled_for?: string | null
          status?: string
          type?: string
          user_id?: string
          withdraw_mode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payouts_delivery_assignment_id_fkey"
            columns: ["delivery_assignment_id"]
            isOneToOne: false
            referencedRelation: "delivery_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          app_type: string | null
          created_at: string
          endpoint: string | null
          expo_push_token: string | null
          id: string
          is_active: boolean | null
          keys_auth: string | null
          keys_p256dh: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          app_type?: string | null
          created_at?: string
          endpoint?: string | null
          expo_push_token?: string | null
          id?: string
          is_active?: boolean | null
          keys_auth?: string | null
          keys_p256dh?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          app_type?: string | null
          created_at?: string
          endpoint?: string | null
          expo_push_token?: string | null
          id?: string
          is_active?: boolean | null
          keys_auth?: string | null
          keys_p256dh?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      refund_reserve: {
        Row: {
          amount: number
          consumed_at: string | null
          created_at: string
          id: string
          order_id: string
          status: string
        }
        Insert: {
          amount: number
          consumed_at?: string | null
          created_at?: string
          id?: string
          order_id: string
          status?: string
        }
        Update: {
          amount?: number
          consumed_at?: string | null
          created_at?: string
          id?: string
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_reserve_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      report_cron_state: {
        Row: {
          last_sent_at: string
          report_key: string
        }
        Insert: {
          last_sent_at?: string
          report_key: string
        }
        Update: {
          last_sent_at?: string
          report_key?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          listing_id: string | null
          reason: string
          reported_user_id: string | null
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id?: string | null
          reason: string
          reported_user_id?: string | null
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string | null
          reason?: string
          reported_user_id?: string | null
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          listing_id: string | null
          rating: number
          reviewed_id: string
          reviewer_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          rating: number
          reviewed_id: string
          reviewer_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          rating?: number
          reviewed_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewed_id_fkey"
            columns: ["reviewed_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_delivery_affiliations: {
        Row: {
          created_at: string | null
          delivery_person_id: string
          id: string
          seller_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          delivery_person_id: string
          id?: string
          seller_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          delivery_person_id?: string
          id?: string
          seller_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_delivery_affiliations_delivery_person_id_fkey"
            columns: ["delivery_person_id"]
            isOneToOne: false
            referencedRelation: "delivery_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_delivery_affiliations_delivery_person_id_fkey"
            columns: ["delivery_person_id"]
            isOneToOne: false
            referencedRelation: "delivery_persons_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_delivery_affiliations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_delivery_settings: {
        Row: {
          cash_on_delivery_enabled: boolean
          created_at: string | null
          home_delivery_enabled: boolean
          seller_id: string
          updated_at: string | null
        }
        Insert: {
          cash_on_delivery_enabled?: boolean
          created_at?: string | null
          home_delivery_enabled?: boolean
          seller_id: string
          updated_at?: string | null
        }
        Update: {
          cash_on_delivery_enabled?: boolean
          created_at?: string | null
          home_delivery_enabled?: boolean
          seller_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_delivery_settings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feedbacks: {
        Row: {
          admin_reply: string | null
          complex_checkout_issue: boolean | null
          created_at: string | null
          dislikes: string | null
          id: string
          payment_security_issue: boolean | null
          prefers_native_app: boolean | null
          pricing_too_high: boolean | null
          recommended_features: string | null
          replied_at: string | null
          replied_by: string | null
          reply_channel: string | null
          search_navigation_issue: boolean | null
          slow_response_issue: boolean | null
          source: string | null
          user_id: string | null
          visibility_issue: boolean | null
        }
        Insert: {
          admin_reply?: string | null
          complex_checkout_issue?: boolean | null
          created_at?: string | null
          dislikes?: string | null
          id?: string
          payment_security_issue?: boolean | null
          prefers_native_app?: boolean | null
          pricing_too_high?: boolean | null
          recommended_features?: string | null
          replied_at?: string | null
          replied_by?: string | null
          reply_channel?: string | null
          search_navigation_issue?: boolean | null
          slow_response_issue?: boolean | null
          source?: string | null
          user_id?: string | null
          visibility_issue?: boolean | null
        }
        Update: {
          admin_reply?: string | null
          complex_checkout_issue?: boolean | null
          created_at?: string | null
          dislikes?: string | null
          id?: string
          payment_security_issue?: boolean | null
          prefers_native_app?: boolean | null
          pricing_too_high?: boolean | null
          recommended_features?: string | null
          replied_at?: string | null
          replied_by?: string | null
          reply_channel?: string | null
          search_navigation_issue?: boolean | null
          slow_response_issue?: boolean | null
          source?: string | null
          user_id?: string | null
          visibility_issue?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "user_feedbacks_replied_by_fkey"
            columns: ["replied_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_feedbacks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          ban_appeal_reason: string | null
          ban_appeal_status: string | null
          ban_appealed_at: string | null
          ban_reason: string | null
          banned: boolean
          cancellation_count: number
          consecutive_cancellations: number
          created_at: string
          deleted_at: string | null
          deletion_requested_at: string | null
          district: string | null
          email: string
          first_listing_at: string | null
          full_name: string | null
          id: string
          last_cancellation_at: string | null
          last_ip: string | null
          listing_credits: number | null
          payout_network: string | null
          payout_number: string | null
          phone: string | null
          pro_free_boost_used: boolean | null
          pro_source: string | null
          pro_until: string | null
          rating: number | null
          referred_by_code: string | null
          registration_ip: string | null
          role: string
          shop_banner_url: string | null
          shop_description: string | null
          shop_latitude: number | null
          shop_logo_url: string | null
          shop_longitude: number | null
          shop_name: string | null
          shop_slug: string | null
          shop_theme_color: string | null
          shop_updated_at: string | null
          shop_whatsapp: string | null
          suspect: boolean
          suspect_at: string | null
          suspect_reason: string | null
        }
        Insert: {
          avatar_url?: string | null
          ban_appeal_reason?: string | null
          ban_appeal_status?: string | null
          ban_appealed_at?: string | null
          ban_reason?: string | null
          banned?: boolean
          cancellation_count?: number
          consecutive_cancellations?: number
          created_at?: string
          deleted_at?: string | null
          deletion_requested_at?: string | null
          district?: string | null
          email: string
          first_listing_at?: string | null
          full_name?: string | null
          id: string
          last_cancellation_at?: string | null
          last_ip?: string | null
          listing_credits?: number | null
          payout_network?: string | null
          payout_number?: string | null
          phone?: string | null
          pro_free_boost_used?: boolean | null
          pro_source?: string | null
          pro_until?: string | null
          rating?: number | null
          referred_by_code?: string | null
          registration_ip?: string | null
          role?: string
          shop_banner_url?: string | null
          shop_description?: string | null
          shop_latitude?: number | null
          shop_logo_url?: string | null
          shop_longitude?: number | null
          shop_name?: string | null
          shop_slug?: string | null
          shop_theme_color?: string | null
          shop_updated_at?: string | null
          shop_whatsapp?: string | null
          suspect?: boolean
          suspect_at?: string | null
          suspect_reason?: string | null
        }
        Update: {
          avatar_url?: string | null
          ban_appeal_reason?: string | null
          ban_appeal_status?: string | null
          ban_appealed_at?: string | null
          ban_reason?: string | null
          banned?: boolean
          cancellation_count?: number
          consecutive_cancellations?: number
          created_at?: string
          deleted_at?: string | null
          deletion_requested_at?: string | null
          district?: string | null
          email?: string
          first_listing_at?: string | null
          full_name?: string | null
          id?: string
          last_cancellation_at?: string | null
          last_ip?: string | null
          listing_credits?: number | null
          payout_network?: string | null
          payout_number?: string | null
          phone?: string | null
          pro_free_boost_used?: boolean | null
          pro_source?: string | null
          pro_until?: string | null
          rating?: number | null
          referred_by_code?: string | null
          registration_ip?: string | null
          role?: string
          shop_banner_url?: string | null
          shop_description?: string | null
          shop_latitude?: number | null
          shop_logo_url?: string | null
          shop_longitude?: number | null
          shop_name?: string | null
          shop_slug?: string | null
          shop_theme_color?: string | null
          shop_updated_at?: string | null
          shop_whatsapp?: string | null
          suspect?: boolean
          suspect_at?: string | null
          suspect_reason?: string | null
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          body: Json | null
          created_at: string
          headers: Json | null
          id: string
          provider: string
          token: string | null
          verified: boolean | null
        }
        Insert: {
          body?: Json | null
          created_at?: string
          headers?: Json | null
          id?: string
          provider: string
          token?: string | null
          verified?: boolean | null
        }
        Update: {
          body?: Json | null
          created_at?: string
          headers?: Json | null
          id?: string
          provider?: string
          token?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      cod_receivables_outstanding: {
        Row: {
          debtor_role: string | null
          debtor_user_id: string | null
          full_name: string | null
          oldest_at: string | null
          orders_count: number | null
          phone: string | null
          total_due: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cod_receivables_debtor_user_id_fkey"
            columns: ["debtor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_persons_directory: {
        Row: {
          coverage_zones: string[] | null
          created_at: string | null
          current_location: string | null
          description: string | null
          id: string | null
          is_available: boolean | null
          is_verified: boolean | null
          name: string | null
          phone: string | null
          photo_url: string | null
          pricing_description: string | null
          rating: number | null
          total_deliveries: number | null
          total_reviews: number | null
          updated_at: string | null
          user_id: string | null
          vehicle_details: string | null
          vehicle_type: string | null
          verification_status: string | null
        }
        Insert: {
          coverage_zones?: string[] | null
          created_at?: string | null
          current_location?: string | null
          description?: string | null
          id?: string | null
          is_available?: boolean | null
          is_verified?: never
          name?: string | null
          phone?: string | null
          photo_url?: string | null
          pricing_description?: string | null
          rating?: number | null
          total_deliveries?: never
          total_reviews?: number | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_details?: string | null
          vehicle_type?: string | null
          verification_status?: never
        }
        Update: {
          coverage_zones?: string[] | null
          created_at?: string | null
          current_location?: string | null
          description?: string | null
          id?: string | null
          is_available?: boolean | null
          is_verified?: never
          name?: string | null
          phone?: string | null
          photo_url?: string | null
          pricing_description?: string | null
          rating?: number | null
          total_deliveries?: never
          total_reviews?: number | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_details?: string | null
          vehicle_type?: string | null
          verification_status?: never
        }
        Relationships: []
      }
    }
    Functions: {
      accept_delivery_assignment: {
        Args: { p_assignment_id: string; p_delivery_person_id: string }
        Returns: Json
      }
      add_listing_credits: {
        Args: { quantity: number; user_uuid: string }
        Returns: undefined
      }
      admin_pending_counts: { Args: never; Returns: Json }
      admin_trigger_driver_payout: {
        Args: { p_assignment_id: string }
        Returns: Json
      }
      ban_ip: {
        Args: { p_duration_days?: number; p_ip: string; p_reason?: string }
        Returns: boolean
      }
      buy_boost_with_credits: {
        Args: { p_duration_days: number; p_listing_id: string }
        Returns: Json
      }
      calculate_delivery_fee: {
        Args: {
          buyer_lat: number
          buyer_lng: number
          seller_lat: number
          seller_lng: number
        }
        Returns: number
      }
      calculate_distance:
        | {
            Args: { lat1: number; lat2: number; lon1: number; lon2: number }
            Returns: number
          }
        | {
            Args: { lat1: number; lat2: number; lon1: number; lon2: number }
            Returns: number
          }
      can_view_listing_via_order: {
        Args: { p_listing_id: string; p_user_id: string }
        Returns: boolean
      }
      cancel_order_buyer: { Args: { p_order_id: string }; Returns: Json }
      cancel_order_unavailable: { Args: { p_order_id: string }; Returns: Json }
      clean_expired_monetization_transactions: { Args: never; Returns: number }
      complete_pickup_order: {
        Args: { p_entered_otp?: string; p_order_id: string }
        Returns: Json
      }
      confirm_boost: { Args: { p_transaction_id: string }; Returns: undefined }
      confirm_bump: { Args: { p_transaction_id: string }; Returns: undefined }
      confirm_order_payment: {
        Args: { p_transaction_id: string }
        Returns: undefined
      }
      confirm_seller_availability: {
        Args: { p_order_id: string }
        Returns: Json
      }
      confirm_seller_badge: {
        Args: { p_transaction_id: string }
        Returns: undefined
      }
      consume_listing_credit: { Args: { user_uuid: string }; Returns: boolean }
      create_cod_order: {
        Args: {
          p_delivery_address: string
          p_delivery_district?: string
          p_delivery_lat?: number
          p_delivery_lng?: number
          p_delivery_mode: string
          p_items: Json
          p_payment_method: string
          p_road_km?: Json
        }
        Returns: Json
      }
      create_delivery_payout: {
        Args: {
          p_delivery_fee: number
          p_delivery_person_id: string
          p_escrow_id: string
          p_order_id: string
        }
        Returns: undefined
      }
      create_seller_payout: {
        Args: {
          p_escrow_id: string
          p_order_id: string
          p_seller_amount: number
          p_seller_id: string
        }
        Returns: undefined
      }
      credit_ambassador_pro_subscription: {
        Args: { p_seller_id: string }
        Returns: Json
      }
      da_caller_is_order_buyer: {
        Args: { p_order_id: string }
        Returns: boolean
      }
      delete_listing_secure: { Args: { p_listing_id: string }; Returns: Json }
      delete_monetization_transaction: {
        Args: { p_transaction_id: string }
        Returns: boolean
      }
      delete_my_account: { Args: never; Returns: undefined }
      dispatch_cod_order: { Args: { p_order_id: string }; Returns: Json }
      earth: { Args: never; Returns: number }
      fn_activity_fields: {
        Args: { p_end: string; p_start: string }
        Returns: Json
      }
      fn_alert_admin: {
        Args: {
          p_color: number
          p_description: string
          p_fields?: Json
          p_title: string
          p_url?: string
        }
        Returns: undefined
      }
      fn_clamp_km: { Args: { p_km: number }; Returns: number }
      fn_daloa_point: {
        Args: { p_district: string; p_lat: number; p_lng: number }
        Returns: {
          latitude: number
          longitude: number
        }[]
      }
      fn_delivery_fee: { Args: { p_km: number }; Returns: number }
      fn_delivery_quote: {
        Args: {
          p_buyer_district: string
          p_buyer_lat: number
          p_buyer_lng: number
          p_is_pickup?: boolean
          p_road_km?: number
          p_seller_id: string
        }
        Returns: {
          delivery_fee: number
          distance_km: number
        }[]
      }
      fn_growth_fields: {
        Args: { p_end: string; p_start: string }
        Returns: Json
      }
      fn_notify_push_webhook: {
        Args: { p_old?: Json; p_record: Json; p_table: string; p_type: string }
        Returns: undefined
      }
      fn_open_order_dispute: {
        Args: { p_order_id: string; p_raised_by: string; p_reason: string }
        Returns: undefined
      }
      fn_process_payouts: { Args: never; Returns: undefined }
      fn_push_expo: {
        Args: {
          p_body: string
          p_channel?: string
          p_data?: Json
          p_sound?: string
          p_title: string
          p_tokens: string[]
        }
        Returns: number
      }
      fn_reconcile_road_km: {
        Args: { p_road_km: number; p_straight: number }
        Returns: number
      }
      fn_report_activity: { Args: never; Returns: undefined }
      fn_report_growth: { Args: never; Returns: undefined }
      fn_report_monthly: { Args: never; Returns: undefined }
      fn_report_period: {
        Args: { p_end: string; p_label: string; p_start: string }
        Returns: undefined
      }
      fn_report_weekly: { Args: never; Returns: undefined }
      fn_restore_listing_stock: {
        Args: { p_listing_id: string; p_quantity: number; p_variant_id: string }
        Returns: undefined
      }
      fn_send_discord_embeds: { Args: { p_embeds: Json }; Returns: undefined }
      fn_signup_role: { Args: { p_requested: string }; Returns: string }
      fn_straight_km: {
        Args: { p_lat1: number; p_lat2: number; p_lng1: number; p_lng2: number }
        Returns: number
      }
      free_boost_listing: { Args: { p_listing_id: string }; Returns: Json }
      generate_shop_slug: { Args: { input_name: string }; Returns: string }
      get_admin_feedbacks:
        | {
            Args: never
            Returns: {
              admin_reply: string
              complex_checkout_issue: boolean
              created_at: string
              dislikes: string
              id: string
              payment_security_issue: boolean
              prefers_native_app: boolean
              pricing_too_high: boolean
              recommended_features: string
              replied_at: string
              reply_channel: string
              search_navigation_issue: boolean
              slow_response_issue: boolean
              source: string
              user_id: string
              users: Json
              visibility_issue: boolean
            }[]
          }
        | { Args: { p_limit?: number }; Returns: Json }
      get_auth_provider_for_email: { Args: { p_email: string }; Returns: Json }
      handle_delivery_no_show_timeout: {
        Args: never
        Returns: {
          assignment_id: string
          delivery_person_id: string
          no_show_count: number
          order_id: string
          reliability_score: number
        }[]
      }
      has_order_delivery_access: {
        Args: { p_order_id: string; p_user_id: string }
        Returns: boolean
      }
      increment_listing_views: {
        Args: { p_listing_id: string; p_viewer_id?: string }
        Returns: undefined
      }
      invite_delivery_driver_by_phone: {
        Args: { p_phone: string }
        Returns: Json
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_or_service_role: { Args: never; Returns: boolean }
      is_ip_banned: { Args: { p_ip: string }; Returns: boolean }
      link_seller_to_ambassador: {
        Args: { p_referral_code: string; p_seller_id: string }
        Returns: boolean
      }
      mark_listing_as_sold: { Args: { p_listing_id: string }; Returns: Json }
      purge_expired_data: {
        Args: never
        Returns: {
          quoi: string
          supprimes: number
        }[]
      }
      record_cod_receivable: { Args: { p_order_id: string }; Returns: string }
      register_ambassador: {
        Args: {
          p_full_name: string
          p_payout_network?: string
          p_payout_number?: string
          p_phone: string
        }
        Returns: Json
      }
      relist_listing: {
        Args: { p_listing_id: string; p_stock: number; p_variants?: Json }
        Returns: Json
      }
      reply_to_feedback: {
        Args: { p_channel?: string; p_feedback_id: string; p_message: string }
        Returns: Json
      }
      report_delivery_dispute: {
        Args: { p_assignment_id: string; p_reason: string }
        Returns: Json
      }
      report_order_dispute: {
        Args: { p_order_id: string; p_reason: string }
        Returns: Json
      }
      request_ambassador_payout: {
        Args: { p_amount: number; p_network: string; p_phone_number: string }
        Returns: Json
      }
      reset_user_cancellations: { Args: { p_user_id: string }; Returns: Json }
      resolve_delivery_dispute: {
        Args: { p_action: string; p_assignment_id: string }
        Returns: Json
      }
      settle_cod_receivable: {
        Args: { p_id: string; p_notes?: string }
        Returns: Json
      }
      submit_ban_appeal: { Args: { p_reason: string }; Returns: boolean }
      toggle_feature_upvote: {
        Args: { p_feature_id: string; p_user_ip: string }
        Returns: Json
      }
      unban_ip: { Args: { p_ip: string }; Returns: boolean }
      update_seller_delivery_settings: {
        Args: { p_cash_on_delivery: boolean; p_home_delivery: boolean }
        Returns: Json
      }
      update_system_setting: {
        Args: { p_key: string; p_value: Json }
        Returns: Json
      }
      verify_delivery: {
        Args: {
          p_assignment_id: string
          p_gps_lat: number
          p_gps_lng: number
          p_otp: string
          p_photo_url: string
        }
        Returns: Json
      }
      verify_delivery_otp: {
        Args: { p_code: string; p_order_id: string }
        Returns: Json
      }
      verify_pickup: {
        Args: {
          p_assignment_id: string
          p_gps_lat?: number
          p_gps_lng?: number
          p_otp: string
          p_photo_url?: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
