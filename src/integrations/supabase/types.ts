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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      badges: {
        Row: {
          criteria: string
          description: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          criteria: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          criteria?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      collections: {
        Row: {
          banner_url: string | null
          category: string | null
          created_at: string | null
          creator_address: string
          description: string | null
          floor_price: number | null
          id: string
          name: string
          total_items: number | null
          total_volume: number | null
          updated_at: string | null
        }
        Insert: {
          banner_url?: string | null
          category?: string | null
          created_at?: string | null
          creator_address: string
          description?: string | null
          floor_price?: number | null
          id?: string
          name: string
          total_items?: number | null
          total_volume?: number | null
          updated_at?: string | null
        }
        Update: {
          banner_url?: string | null
          category?: string | null
          created_at?: string | null
          creator_address?: string
          description?: string | null
          floor_price?: number | null
          id?: string
          name?: string
          total_items?: number | null
          total_volume?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      listings: {
        Row: {
          active: boolean | null
          created_at: string
          id: string
          listing_id: number
          nft_id: string | null
          price: string
          seller_address: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          id?: string
          listing_id: number
          nft_id?: string | null
          price: string
          seller_address: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          id?: string
          listing_id?: number
          nft_id?: string | null
          price?: string
          seller_address?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_nft_id_fkey"
            columns: ["nft_id"]
            isOneToOne: false
            referencedRelation: "nfts"
            referencedColumns: ["id"]
          },
        ]
      }
      nfts: {
        Row: {
          collection_id: string | null
          contract_address: string
          created_at: string
          creator_address: string
          description: string | null
          id: string
          image_url: string
          metadata_uri: string | null
          name: string
          owner_address: string
          rarity_score: number | null
          token_id: number
          updated_at: string
        }
        Insert: {
          collection_id?: string | null
          contract_address: string
          created_at?: string
          creator_address: string
          description?: string | null
          id?: string
          image_url: string
          metadata_uri?: string | null
          name: string
          owner_address: string
          rarity_score?: number | null
          token_id: number
          updated_at?: string
        }
        Update: {
          collection_id?: string | null
          contract_address?: string
          created_at?: string
          creator_address?: string
          description?: string | null
          id?: string
          image_url?: string
          metadata_uri?: string | null
          name?: string
          owner_address?: string
          rarity_score?: number | null
          token_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nfts_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          message: string
          metadata: Json | null
          profile_id: string | null
          read: boolean | null
          related_nft_id: string | null
          title: string
          type: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          profile_id?: string | null
          read?: boolean | null
          related_nft_id?: string | null
          title: string
          type: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          profile_id?: string | null
          read?: boolean | null
          related_nft_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_nft_id_fkey"
            columns: ["related_nft_id"]
            isOneToOne: false
            referencedRelation: "nfts"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          created_at: string
          id: string
          nft_id: string | null
          offerer_address: string
          price: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nft_id?: string | null
          offerer_address: string
          price: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nft_id?: string | null
          offerer_address?: string
          price?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_nft_id_fkey"
            columns: ["nft_id"]
            isOneToOne: false
            referencedRelation: "nfts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          discord_url: string | null
          id: string
          twitter_url: string | null
          updated_at: string
          username: string | null
          wallet_address: string
          website_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          discord_url?: string | null
          id?: string
          twitter_url?: string | null
          updated_at?: string
          username?: string | null
          wallet_address: string
          website_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          discord_url?: string | null
          id?: string
          twitter_url?: string | null
          updated_at?: string
          username?: string | null
          wallet_address?: string
          website_url?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          rating: number | null
          reviewed_address: string
          reviewer_address: string
          transaction_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number | null
          reviewed_address: string
          reviewer_address: string
          transaction_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number | null
          reviewed_address?: string
          reviewer_address?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          created_at: string
          from_address: string
          id: string
          nft_id: string | null
          price: string | null
          to_address: string
          tx_hash: string | null
          type: string
        }
        Insert: {
          created_at?: string
          from_address: string
          id?: string
          nft_id?: string | null
          price?: string | null
          to_address: string
          tx_hash?: string | null
          type: string
        }
        Update: {
          created_at?: string
          from_address?: string
          id?: string
          nft_id?: string | null
          price?: string | null
          to_address?: string
          tx_hash?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_nft_id_fkey"
            columns: ["nft_id"]
            isOneToOne: false
            referencedRelation: "nfts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string | null
          earned_at: string
          id: string
          profile_id: string | null
        }
        Insert: {
          badge_id?: string | null
          earned_at?: string
          id?: string
          profile_id?: string | null
        }
        Update: {
          badge_id?: string | null
          earned_at?: string
          id?: string
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_reputation: {
        Row: {
          created_at: string | null
          id: string
          is_trusted: boolean | null
          rating: number | null
          successful_trades: number | null
          total_purchases: number | null
          total_sales: number | null
          total_volume: number | null
          updated_at: string | null
          wallet_address: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_trusted?: boolean | null
          rating?: number | null
          successful_trades?: number | null
          total_purchases?: number | null
          total_sales?: number | null
          total_volume?: number | null
          updated_at?: string | null
          wallet_address: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_trusted?: boolean | null
          rating?: number | null
          successful_trades?: number | null
          total_purchases?: number | null
          total_sales?: number | null
          total_volume?: number | null
          updated_at?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          created_at: string
          id: string
          nft_id: string | null
          price_alert: string | null
          profile_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          nft_id?: string | null
          price_alert?: string | null
          profile_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          nft_id?: string | null
          price_alert?: string | null
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_nft_id_fkey"
            columns: ["nft_id"]
            isOneToOne: false
            referencedRelation: "nfts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watchlist_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
