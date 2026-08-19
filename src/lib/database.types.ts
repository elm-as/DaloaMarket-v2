export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          phone: string | null
          full_name: string | null
          district: string | null
          avatar_url: string | null
          created_at: string
          rating: number | null
          first_listing_at: string | null
          banned: boolean
          role: string
          ban_reason: string | null
          ban_appeal_reason: string | null
          ban_appeal_status: string | null
          ban_appealed_at: string | null
          pro_until: string | null
          latitude: number | null
          longitude: number | null
          payout_network: string | null
          payout_number: string | null
          shop_name: string | null
          shop_slug: string | null
          shop_description: string | null
          shop_theme_color: string | null
          shop_banner_url: string | null
          shop_logo_url: string | null
          shop_latitude: number | null
          shop_longitude: number | null
          listing_credits: number
          pro_free_boost_used: boolean
          cancellation_count: number
          consecutive_cancellations: number
          last_cancellation_at: string | null
        }
        Insert: {
          id: string
          email: string
          phone?: string | null
          full_name?: string | null
          district?: string | null
          avatar_url?: string | null
          created_at?: string
          rating?: number | null
          first_listing_at?: string | null
          banned?: boolean
          role?: string
          ban_reason?: string | null
          ban_appeal_reason?: string | null
          ban_appeal_status?: string | null
          ban_appealed_at?: string | null
          pro_until?: string | null
          latitude?: number | null
          longitude?: number | null
          payout_network?: string | null
          payout_number?: string | null
          shop_name?: string | null
          shop_slug?: string | null
          shop_description?: string | null
          shop_theme_color?: string | null
          shop_banner_url?: string | null
          shop_logo_url?: string | null
          shop_latitude?: number | null
          shop_longitude?: number | null
          listing_credits?: number
          pro_free_boost_used?: boolean
          cancellation_count?: number
          consecutive_cancellations?: number
          last_cancellation_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          phone?: string | null
          full_name?: string | null
          district?: string | null
          avatar_url?: string | null
          rating?: number | null
          banned?: boolean
          role?: string
          ban_reason?: string | null
          ban_appeal_reason?: string | null
          ban_appeal_status?: string | null
          ban_appealed_at?: string | null
          pro_until?: string | null
          latitude?: number | null
          longitude?: number | null
          payout_network?: string | null
          payout_number?: string | null
          shop_name?: string | null
          shop_slug?: string | null
          shop_description?: string | null
          shop_theme_color?: string | null
          shop_banner_url?: string | null
          shop_logo_url?: string | null
          shop_latitude?: number | null
          shop_longitude?: number | null
          listing_credits?: number
          pro_free_boost_used?: boolean
          cancellation_count?: number
          consecutive_cancellations?: number
          last_cancellation_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      listings: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string
          price: number
          category: string
          condition: string
          district: string
          photos: string[]
          boosted_until: string | null
          created_at: string
          status: string
          contact_phone: string | null
          claim_code: string | null
          claimed_by: string | null
          view_count: number
          stock: number
          original_price: number | null
          variants: any
          latitude: number | null
          longitude: number | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description: string
          price: number
          category: string
          condition: string
          district: string
          photos: string[]
          boosted_until?: string | null
          created_at?: string
          status?: string
          contact_phone?: string | null
          claim_code?: string | null
          claimed_by?: string | null
          view_count?: number
          stock?: number
          original_price?: number | null
          variants?: any
          latitude?: number | null
          longitude?: number | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string
          price?: number
          category?: string
          condition?: string
          district?: string
          photos?: string[]
          boosted_until?: string | null
          created_at?: string
          status?: string
          contact_phone?: string | null
          claim_code?: string | null
          claimed_by?: string | null
          view_count?: number
          stock?: number
          original_price?: number | null
          variants?: any
          latitude?: number | null
          longitude?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      messages: {
        Row: {
          id: string
          listing_id: string
          sender_id: string
          receiver_id: string
          content: string
          created_at: string
          read: boolean
        }
        Insert: {
          id?: string
          listing_id: string
          sender_id: string
          receiver_id: string
          content: string
          created_at?: string
          read?: boolean
        }
        Update: {
          id?: string
          listing_id?: string
          sender_id?: string
          receiver_id?: string
          content?: string
          created_at?: string
          read?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "messages_listing_id_fkey"
            columns: ["listing_id"]
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      reviews: {
        Row: {
          id: string
          reviewer_id: string
          reviewed_id: string
          listing_id: string
          rating: number
          comment: string
          created_at: string
        }
        Insert: {
          id?: string
          reviewer_id: string
          reviewed_id: string
          listing_id: string
          rating: number
          comment: string
          created_at?: string
        }
        Update: {
          id?: string
          reviewer_id?: string
          reviewed_id?: string
          listing_id?: string
          rating?: number
          comment?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewed_id_fkey"
            columns: ["reviewed_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_listing_id_fkey"
            columns: ["listing_id"]
            referencedRelation: "listings"
            referencedColumns: ["id"]
          }
        ]
      }
      favorites: {
        Row: {
          id: string
          user_id: string
          listing_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          listing_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          listing_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            referencedRelation: "listings"
            referencedColumns: ["id"]
          }
        ]
      }
      events: {
        Row: {
          id: string
          user_id: string | null
          event_name: string
          listing_id: string | null
          props: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          event_name: string
          listing_id?: string | null
          props?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          event_name?: string
          listing_id?: string | null
          props?: Json
          created_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          keys_p256dh: string
          keys_auth: string
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          keys_p256dh: string
          keys_auth: string
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          keys_p256dh?: string
          keys_auth?: string
          user_agent?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      reports: {
        Row: {
          id: string
          listing_id: string | null
          reporter_id: string
          reported_user_id: string | null
          reason: string
          status: string
          created_at: string
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          id?: string
          listing_id?: string | null
          reporter_id: string
          reported_user_id?: string | null
          reason: string
          status?: string
          created_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          id?: string
          listing_id?: string | null
          reporter_id?: string
          reported_user_id?: string | null
          reason?: string
          status?: string
          created_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_listing_id_fkey"
            columns: ["listing_id"]
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      monetization_transactions: {
        Row: {
          id: string
          user_id: string
          listing_id: string | null
          type: 'boost' | 'bump' | 'seller_badge' | 'listing_pack_10' | 'credits_pack_5' | 'credits_pack_12' | 'credits_pack_30'
          amount: number
          status: 'pending' | 'confirmed' | 'failed'
          created_at: string
          confirmed_at: string | null
          claim_text: string | null
          claim_screenshot_url: string | null
          claimed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          listing_id?: string | null
          type: 'boost' | 'bump' | 'seller_badge' | 'listing_pack_10' | 'credits_pack_5' | 'credits_pack_12' | 'credits_pack_30'
          amount: number
          status?: 'pending' | 'confirmed' | 'failed'
          created_at?: string
          confirmed_at?: string | null
          claim_text?: string | null
          claim_screenshot_url?: string | null
          claimed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          listing_id?: string | null
          type?: 'boost' | 'bump' | 'seller_badge' | 'listing_pack_10' | 'credits_pack_5' | 'credits_pack_12' | 'credits_pack_30'
          amount?: number
          status?: 'pending' | 'confirmed' | 'failed'
          created_at?: string
          confirmed_at?: string | null
          claim_text?: string | null
          claim_screenshot_url?: string | null
          claimed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monetization_transactions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monetization_transactions_listing_id_fkey"
            columns: ["listing_id"]
            referencedRelation: "listings"
            referencedColumns: ["id"]
          }
        ]
      }
      orders: {
        Row: {
          id: string
          buyer_id: string
          seller_id: string
          listing_id: string
          total_amount: number
          product_amount: number
          delivery_fee: number
          status: string
          delivery_mode: string
          delivery_address: string | null
          created_at: string
          seller_lat: number | null
          seller_lng: number | null
          delivery_lat: number | null
          delivery_lng: number | null
          variant_id: string | null
          variant_label: string | null
          unit_price: number | null
          quantity: number
        }
        Insert: {
          id?: string
          buyer_id: string
          seller_id: string
          listing_id: string
          total_amount: number
          product_amount: number
          delivery_fee: number
          status?: string
          delivery_mode: string
          delivery_address?: string | null
          created_at?: string
          seller_lat?: number | null
          seller_lng?: number | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          variant_id?: string | null
          variant_label?: string | null
          unit_price?: number | null
          quantity?: number
        }
        Update: {
          id?: string
          buyer_id?: string
          seller_id?: string
          listing_id?: string
          total_amount?: number
          product_amount?: number
          delivery_fee?: number
          status?: string
          delivery_mode?: string
          delivery_address?: string | null
          seller_lat?: number | null
          seller_lng?: number | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          variant_id?: string | null
          variant_label?: string | null
          unit_price?: number | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_listing_id_fkey"
            columns: ["listing_id"]
            referencedRelation: "listings"
            referencedColumns: ["id"]
          }
        ]
      }
      delivery_assignments: {
        Row: {
          id: string
          order_id: string
          delivery_person_id: string | null
          status: string
          pickup_confirmed_by_seller: boolean
          pickup_confirmed_at: string | null
          pickup_otp: string
          delivery_otp: string
          pickup_otp_attempts: number
          delivery_otp_attempts: number
          delivered_at: string | null
          buyer_confirmed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          delivery_person_id?: string | null
          status?: string
          pickup_confirmed_by_seller?: boolean
          pickup_confirmed_at?: string | null
          pickup_otp?: string
          delivery_otp?: string
          pickup_otp_attempts?: number
          delivery_otp_attempts?: number
          delivered_at?: string | null
          buyer_confirmed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          delivery_person_id?: string | null
          status?: string
          pickup_confirmed_by_seller?: boolean
          pickup_confirmed_at?: string | null
          pickup_otp?: string
          delivery_otp?: string
          pickup_otp_attempts?: number
          delivery_otp_attempts?: number
          delivered_at?: string | null
          buyer_confirmed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_assignments_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          }
        ]
      }
      delivery_persons: {
        Row: {
          id: string
          user_id: string
          name: string
          phone: string
          available: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          phone: string
          available?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          phone?: string
          available?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "delivery_persons_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          title: string
          body: string
          url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          body: string
          url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          body?: string
          url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      delivery_persons_directory: {
        Row: {
          id: string
          user_id: string
          name: string
          phone: string
          photo_url: string | null
          is_available: boolean
          rating: number
          total_reviews: number
          vehicle_type: string
          vehicle_details: string
          coverage_zones: string[]
          pricing_description: string
          description: string
          current_location: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          phone: string
          photo_url?: string | null
          is_available?: boolean
          rating?: number
          total_reviews?: number
          vehicle_type: string
          vehicle_details: string
          coverage_zones: string[]
          pricing_description: string
          description: string
          current_location?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          phone?: string
          photo_url?: string | null
          is_available?: boolean
          rating?: number
          total_reviews?: number
          vehicle_type?: string
          vehicle_details?: string
          coverage_zones?: string[]
          pricing_description?: string
          description?: string
          current_location?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_persons_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_claimable_listings: {
        Args: { p_phone: string }
        Returns: { id: string; title: string }[]
      }
      decrement_user_credit: {
        Args: { user_id_input: string }
        Returns: boolean
      }
      increment_listing_views: {
        Args: { p_listing_id: string; p_viewer_id: string }
        Returns: undefined
      }
      claim_listing_by_code: {
        Args: { p_claim_code: string; p_user_id: string }
        Returns: { id: string }[]
      }
      confirm_boost: {
        Args: { p_transaction_id: string }
        Returns: undefined
      }
      confirm_bump: {
        Args: { p_transaction_id: string }
        Returns: undefined
      }
      confirm_seller_badge: {
        Args: { p_transaction_id: string }
        Returns: undefined
      }
      cancel_order_unavailable: {
        Args: { p_order_id: string }
        Returns: Json
      }
      confirm_seller_availability: {
        Args: { p_order_id: string }
        Returns: Json
      }
      report_delivery_dispute: {
        Args: {
          p_assignment_id: string
          p_reason: string
        }
        Returns: Json
      }
      verify_delivery_otp: {
        Args: { p_order_id: string; p_code: string }
        Returns: Json
      }
      mark_listing_as_sold: {
        Args: { p_listing_id: string }
        Returns: Json
      }
      delete_listing_secure: {
        Args: { p_listing_id: string }
        Returns: Json
      }
      submit_ban_appeal: {
        Args: { p_reason: string }
        Returns: boolean
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

// Ajout du modèle TypeScript pour un avis utilisateur
export interface Review {
  id: string;
  reviewed_id: string;
  reviewer_id: string;
  listing_id?: string;
  rating: number;
  comment?: string;
  created_at: string;
}