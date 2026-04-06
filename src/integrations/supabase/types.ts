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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_demo_events: {
        Row: {
          created_at: string
          id: string
          label: string
          organization_id: string
          tournament_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string
          organization_id: string
          tournament_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          organization_id?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_demo_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_demo_events_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      approved_emails: {
        Row: {
          created_at: string
          email: string
          event_id: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          event_id: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          event_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approved_emails_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      college_tournament_invitations: {
        Row: {
          coach_email: string
          coach_name: string
          created_at: string
          id: string
          notes: string | null
          rsvp_date: string | null
          rsvp_response: string | null
          school_name: string
          status: string
          token: string | null
          tournament_id: string
        }
        Insert: {
          coach_email: string
          coach_name: string
          created_at?: string
          id?: string
          notes?: string | null
          rsvp_date?: string | null
          rsvp_response?: string | null
          school_name: string
          status?: string
          token?: string | null
          tournament_id: string
        }
        Update: {
          coach_email?: string
          coach_name?: string
          created_at?: string
          id?: string
          notes?: string | null
          rsvp_date?: string | null
          rsvp_response?: string | null
          school_name?: string
          status?: string
          token?: string | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_tournament_invitations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "college_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      college_tournament_players: {
        Row: {
          created_at: string
          first_name: string
          id: string
          last_name: string
          position: string | null
          registration_id: string
          year: string | null
        }
        Insert: {
          created_at?: string
          first_name: string
          id?: string
          last_name: string
          position?: string | null
          registration_id: string
          year?: string | null
        }
        Update: {
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          position?: string | null
          registration_id?: string
          year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "college_tournament_players_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "college_tournament_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      college_tournament_registrations: {
        Row: {
          coach_email: string
          coach_name: string
          created_at: string
          id: string
          invitation_id: string | null
          notes: string | null
          payment_status: string | null
          school_name: string
          tournament_id: string
        }
        Insert: {
          coach_email: string
          coach_name: string
          created_at?: string
          id?: string
          invitation_id?: string | null
          notes?: string | null
          payment_status?: string | null
          school_name: string
          tournament_id: string
        }
        Update: {
          coach_email?: string
          coach_name?: string
          created_at?: string
          id?: string
          invitation_id?: string | null
          notes?: string | null
          payment_status?: string | null
          school_name?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_tournament_registrations_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "college_tournament_invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_tournament_registrations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "college_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      college_tournament_tabs: {
        Row: {
          content: string | null
          content_type: string
          created_at: string
          file_url: string | null
          id: string
          is_visible: boolean | null
          sort_order: number | null
          title: string
          tournament_id: string
        }
        Insert: {
          content?: string | null
          content_type?: string
          created_at?: string
          file_url?: string | null
          id?: string
          is_visible?: boolean | null
          sort_order?: number | null
          title: string
          tournament_id: string
        }
        Update: {
          content?: string | null
          content_type?: string
          created_at?: string
          file_url?: string | null
          id?: string
          is_visible?: boolean | null
          sort_order?: number | null
          title?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_tournament_tabs_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "college_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      college_tournaments: {
        Row: {
          contact_email: string | null
          course_name: string | null
          created_at: string
          description: string | null
          end_date: string | null
          flyer_url: string | null
          hero_image_url: string | null
          hero_overlay_opacity: number | null
          id: string
          location: string | null
          registration_fields: Json | null
          registration_open: boolean | null
          slug: string | null
          start_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          course_name?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          flyer_url?: string | null
          hero_image_url?: string | null
          hero_overlay_opacity?: number | null
          id?: string
          location?: string | null
          registration_fields?: Json | null
          registration_open?: boolean | null
          slug?: string | null
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          course_name?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          flyer_url?: string | null
          hero_image_url?: string | null
          hero_overlay_opacity?: number | null
          id?: string
          location?: string | null
          registration_fields?: Json | null
          registration_open?: boolean | null
          slug?: string | null
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_access_requests: {
        Row: {
          created_at: string
          email: string
          event_id: string
          id: string
          name: string
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          event_id: string
          id?: string
          name: string
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          event_id?: string
          id?: string
          name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_access_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_resources: {
        Row: {
          created_at: string
          description: string | null
          event_id: string
          icon: string | null
          id: string
          link: string | null
          sort_order: number | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_id: string
          icon?: string | null
          id?: string
          link?: string | null
          sort_order?: number | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_id?: string
          icon?: string | null
          id?: string
          link?: string | null
          sort_order?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_resources_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          date: string | null
          description: string | null
          end_date: string | null
          gallery_url: string | null
          id: string
          image_url: string | null
          link: string | null
          location: string | null
          results_url: string | null
          sort_order: number | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date?: string | null
          description?: string | null
          end_date?: string | null
          gallery_url?: string | null
          id?: string
          image_url?: string | null
          link?: string | null
          location?: string | null
          results_url?: string | null
          sort_order?: number | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string | null
          description?: string | null
          end_date?: string | null
          gallery_url?: string | null
          id?: string
          image_url?: string | null
          link?: string | null
          location?: string | null
          results_url?: string | null
          sort_order?: number | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      hold_releases: {
        Row: {
          amount_cents: number
          created_at: string | null
          id: string
          organization_id: string
          released_at: string | null
          transaction_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string | null
          id?: string
          organization_id: string
          released_at?: string | null
          transaction_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string | null
          id?: string
          organization_id?: string
          released_at?: string | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hold_releases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hold_releases_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "platform_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          notify_auction_bid: boolean
          notify_donation: boolean
          notify_registration: boolean
          notify_store_purchase: boolean
          organization_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          notify_auction_bid?: boolean
          notify_donation?: boolean
          notify_registration?: boolean
          notify_store_purchase?: boolean
          organization_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          notify_auction_bid?: boolean
          notify_donation?: boolean
          notify_registration?: boolean
          notify_store_purchase?: boolean
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_emails_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          permissions: Database["public"]["Enums"]["org_permission"][]
          role: string
          status: string
          token: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          organization_id: string
          permissions?: Database["public"]["Enums"]["org_permission"][]
          role?: string
          status?: string
          token?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          permissions?: Database["public"]["Enums"]["org_permission"][]
          role?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          permissions: Database["public"]["Enums"]["org_permission"][]
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          permissions?: Database["public"]["Enums"]["org_permission"][]
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          permissions?: Database["public"]["Enums"]["org_permission"][]
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_payout_methods: {
        Row: {
          account_last_four: string | null
          bank_name: string | null
          change_request_status: string | null
          change_requested_at: string | null
          created_at: string
          id: string
          is_verified: boolean
          method_type: string
          organization_id: string
          paypal_email: string | null
          pending_change_email: string | null
          preferred_method: string | null
          routing_last_four: string | null
          stripe_account_brand: string | null
          stripe_account_id: string | null
          stripe_account_last4: string | null
          stripe_account_status: string | null
          stripe_bank_account_token: string | null
          stripe_onboarding_complete: boolean | null
          updated_at: string
          verification_notes: string | null
        }
        Insert: {
          account_last_four?: string | null
          bank_name?: string | null
          change_request_status?: string | null
          change_requested_at?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean
          method_type?: string
          organization_id: string
          paypal_email?: string | null
          pending_change_email?: string | null
          preferred_method?: string | null
          routing_last_four?: string | null
          stripe_account_brand?: string | null
          stripe_account_id?: string | null
          stripe_account_last4?: string | null
          stripe_account_status?: string | null
          stripe_bank_account_token?: string | null
          stripe_onboarding_complete?: boolean | null
          updated_at?: string
          verification_notes?: string | null
        }
        Update: {
          account_last_four?: string | null
          bank_name?: string | null
          change_request_status?: string | null
          change_requested_at?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean
          method_type?: string
          organization_id?: string
          paypal_email?: string | null
          pending_change_email?: string | null
          preferred_method?: string | null
          routing_last_four?: string | null
          stripe_account_brand?: string | null
          stripe_account_id?: string | null
          stripe_account_last4?: string | null
          stripe_account_status?: string | null
          stripe_bank_account_token?: string | null
          stripe_onboarding_complete?: boolean | null
          updated_at?: string
          verification_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_payout_methods_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_payouts: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          period_end: string
          period_start: string
          platform_fees_cents: number
          status: string
          stripe_transfer_id: string | null
          transaction_count: number
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          period_end: string
          period_start: string
          platform_fees_cents?: number
          status?: string
          stripe_transfer_id?: string | null
          transaction_count?: number
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          period_end?: string
          period_start?: string
          platform_fees_cents?: number
          status?: string
          stripe_transfer_id?: string | null
          transaction_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "organization_payouts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          dashboard_name: string | null
          ein: string | null
          feature_overrides: Json | null
          fee_override: number | null
          id: string
          is_nonprofit: boolean
          logo_url: string | null
          name: string
          nonprofit_name: string | null
          nonprofit_verified: boolean
          plan: string
          platform_fee_rate: number | null
          primary_color: string | null
          secondary_color: string | null
          stripe_account_id: string | null
          subdomain: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          dashboard_name?: string | null
          ein?: string | null
          feature_overrides?: Json | null
          fee_override?: number | null
          id?: string
          is_nonprofit?: boolean
          logo_url?: string | null
          name: string
          nonprofit_name?: string | null
          nonprofit_verified?: boolean
          plan?: string
          platform_fee_rate?: number | null
          primary_color?: string | null
          secondary_color?: string | null
          stripe_account_id?: string | null
          subdomain?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          dashboard_name?: string | null
          ein?: string | null
          feature_overrides?: Json | null
          fee_override?: number | null
          id?: string
          is_nonprofit?: boolean
          logo_url?: string | null
          name?: string
          nonprofit_name?: string | null
          nonprofit_verified?: boolean
          plan?: string
          platform_fee_rate?: number | null
          primary_color?: string | null
          secondary_color?: string | null
          stripe_account_id?: string | null
          subdomain?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      outreach_templates: {
        Row: {
          body: string
          category: string
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number | null
          subject: string
        }
        Insert: {
          body: string
          category: string
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number | null
          subject: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number | null
          subject?: string
        }
        Relationships: []
      }
      payout_audit_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          organization_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          organization_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          organization_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_change_requests: {
        Row: {
          change_type: string
          created_at: string | null
          id: string
          new_value: string | null
          old_value: string | null
          organization_id: string
          requested_by: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          change_type: string
          created_at?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          organization_id: string
          requested_by: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          change_type?: string
          created_at?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          organization_id?: string
          requested_by?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payout_change_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      paypal_payouts: {
        Row: {
          amount_cents: number
          batch_id: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          notes: string | null
          organization_id: string
          paypal_email: string
          status: string | null
        }
        Insert: {
          amount_cents: number
          batch_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          paypal_email: string
          status?: string | null
        }
        Update: {
          amount_cents?: number
          batch_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          paypal_email?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paypal_payouts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_store_products: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          sort_order: number | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price?: number
          sort_order?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          sort_order?: number | null
        }
        Relationships: []
      }
      platform_transactions: {
        Row: {
          amount_cents: number
          created_at: string
          description: string | null
          hold_amount_cents: number | null
          hold_release_date: string | null
          hold_status: string | null
          id: string
          metadata: Json | null
          net_amount_cents: number
          organization_id: string
          payout_id: string | null
          platform_fee_cents: number
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          tournament_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          description?: string | null
          hold_amount_cents?: number | null
          hold_release_date?: string | null
          hold_status?: string | null
          id?: string
          metadata?: Json | null
          net_amount_cents?: number
          organization_id: string
          payout_id?: string | null
          platform_fee_cents?: number
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          tournament_id?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          description?: string | null
          hold_amount_cents?: number | null
          hold_release_date?: string | null
          hold_status?: string | null
          id?: string
          metadata?: Json | null
          net_amount_cents?: number
          organization_id?: string
          payout_id?: string | null
          platform_fee_cents?: number
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          tournament_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_transactions_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      product_templates: {
        Row: {
          category: string
          created_at: string
          default_price: number
          description: string | null
          id: string
          image_url: string | null
          name: string
          organization_id: string
          vendor_name: string | null
          vendor_notes: string | null
          vendor_url: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          default_price?: number
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          organization_id: string
          vendor_name?: string | null
          vendor_notes?: string | null
          vendor_url?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          default_price?: number
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          organization_id?: string
          vendor_name?: string | null
          vendor_notes?: string | null
          vendor_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          applicable_plans: string[] | null
          code: string
          created_at: string
          current_uses: number
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
        }
        Insert: {
          applicable_plans?: string[] | null
          code: string
          created_at?: string
          current_uses?: number
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
        }
        Update: {
          applicable_plans?: string[] | null
          code?: string
          created_at?: string
          current_uses?: number
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
        }
        Relationships: []
      }
      prospect_activities: {
        Row: {
          created_at: string
          description: string
          id: string
          prospect_id: string
          type: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          prospect_id: string
          type?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          prospect_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_activities_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          email_response_status: string | null
          event_date: string | null
          follow_up_count: number | null
          id: string
          last_contacted_at: string | null
          last_email_sent_at: string | null
          last_email_template: string | null
          location: string | null
          next_follow_up: string | null
          notes: string | null
          organization_id: string | null
          organizer_name: string | null
          source: string | null
          source_url: string | null
          status: string
          tournament_name: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          email_response_status?: string | null
          event_date?: string | null
          follow_up_count?: number | null
          id?: string
          last_contacted_at?: string | null
          last_email_sent_at?: string | null
          last_email_template?: string | null
          location?: string | null
          next_follow_up?: string | null
          notes?: string | null
          organization_id?: string | null
          organizer_name?: string | null
          source?: string | null
          source_url?: string | null
          status?: string
          tournament_name: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          email_response_status?: string | null
          event_date?: string | null
          follow_up_count?: number | null
          id?: string
          last_contacted_at?: string | null
          last_email_sent_at?: string | null
          last_email_template?: string | null
          location?: string | null
          next_follow_up?: string | null
          notes?: string | null
          organization_id?: string | null
          organizer_name?: string | null
          source?: string | null
          source_url?: string | null
          status?: string
          tournament_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          author: string
          created_at: string
          id: string
          organization: string | null
          sort_order: number | null
          text: string
        }
        Insert: {
          author: string
          created_at?: string
          id?: string
          organization?: string | null
          sort_order?: number | null
          text: string
        }
        Update: {
          author?: string
          created_at?: string
          id?: string
          organization?: string | null
          sort_order?: number | null
          text?: string
        }
        Relationships: []
      }
      site_visits: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          id: string
          ip_address: string | null
          page_url: string
          referrer: string | null
          user_agent: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          page_url: string
          referrer?: string | null
          user_agent?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          page_url?: string
          referrer?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      sponsor_assets: {
        Row: {
          asset_type: string
          asset_url: string
          created_at: string
          delivered_at: string | null
          file_name: string | null
          id: string
          notes: string | null
          sponsor_id: string
          status: string
          tournament_id: string
        }
        Insert: {
          asset_type?: string
          asset_url: string
          created_at?: string
          delivered_at?: string | null
          file_name?: string | null
          id?: string
          notes?: string | null
          sponsor_id: string
          status?: string
          tournament_id: string
        }
        Update: {
          asset_type?: string
          asset_url?: string
          created_at?: string
          delivered_at?: string | null
          file_name?: string | null
          id?: string
          notes?: string | null
          sponsor_id?: string
          status?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_assets_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "tournament_sponsors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_assets_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_onboarding_logs: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          organization_id: string
          stripe_account_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          organization_id: string
          stripe_account_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          organization_id?: string
          stripe_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stripe_onboarding_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_auction_bids: {
        Row: {
          amount: number
          bidder_email: string
          bidder_name: string
          bidder_phone: string | null
          created_at: string | null
          id: string
          item_id: string
        }
        Insert: {
          amount: number
          bidder_email: string
          bidder_name: string
          bidder_phone?: string | null
          created_at?: string | null
          id?: string
          item_id: string
        }
        Update: {
          amount?: number
          bidder_email?: string
          bidder_name?: string
          bidder_phone?: string | null
          created_at?: string | null
          id?: string
          item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_auction_bids_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "tournament_auction_items"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_auction_items: {
        Row: {
          buy_now_price: number | null
          created_at: string | null
          current_bid: number | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          raffle_ticket_price: number | null
          sort_order: number | null
          starting_bid: number | null
          title: string
          tournament_id: string
          type: string
          winner_email: string | null
          winner_name: string | null
        }
        Insert: {
          buy_now_price?: number | null
          created_at?: string | null
          current_bid?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          raffle_ticket_price?: number | null
          sort_order?: number | null
          starting_bid?: number | null
          title: string
          tournament_id: string
          type?: string
          winner_email?: string | null
          winner_name?: string | null
        }
        Update: {
          buy_now_price?: number | null
          created_at?: string | null
          current_bid?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          raffle_ticket_price?: number | null
          sort_order?: number | null
          starting_bid?: number | null
          title?: string
          tournament_id?: string
          type?: string
          winner_email?: string | null
          winner_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_auction_items_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_budget_items: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string
          id: string
          is_paid: boolean | null
          notes: string | null
          sort_order: number | null
          tournament_id: string
          type: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          description: string
          id?: string
          is_paid?: boolean | null
          notes?: string | null
          sort_order?: number | null
          tournament_id: string
          type?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          id?: string
          is_paid?: boolean | null
          notes?: string | null
          sort_order?: number | null
          tournament_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_budget_items_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_checklist_items: {
        Row: {
          category: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          is_completed: boolean | null
          sort_order: number | null
          title: string
          tournament_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          sort_order?: number | null
          title: string
          tournament_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          sort_order?: number | null
          title?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_checklist_items_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_clicks: {
        Row: {
          browser: string | null
          clicked_at: string
          device_type: string | null
          id: string
          ip_address: string | null
          os: string | null
          referrer: string | null
          source: string
          tournament_id: string
          user_agent: string | null
        }
        Insert: {
          browser?: string | null
          clicked_at?: string
          device_type?: string | null
          id?: string
          ip_address?: string | null
          os?: string | null
          referrer?: string | null
          source?: string
          tournament_id: string
          user_agent?: string | null
        }
        Update: {
          browser?: string | null
          clicked_at?: string
          device_type?: string | null
          id?: string
          ip_address?: string | null
          os?: string | null
          referrer?: string | null
          source?: string
          tournament_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_clicks_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_donations: {
        Row: {
          amount_cents: number
          created_at: string
          donor_email: string | null
          id: string
          status: string
          stripe_session_id: string | null
          tournament_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          donor_email?: string | null
          id?: string
          status?: string
          stripe_session_id?: string | null
          tournament_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          donor_email?: string | null
          id?: string
          status?: string
          stripe_session_id?: string | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_donations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          recipient_count: number
          scheduled_for: string | null
          sent_at: string
          status: string
          subject: string
          tournament_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          recipient_count?: number
          scheduled_for?: string | null
          sent_at?: string
          status?: string
          subject?: string
          tournament_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          recipient_count?: number
          scheduled_for?: string | null
          sent_at?: string
          status?: string
          subject?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_messages_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_photos: {
        Row: {
          caption: string | null
          created_at: string | null
          id: string
          image_url: string
          sort_order: number | null
          tournament_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          id?: string
          image_url: string
          sort_order?: number | null
          tournament_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          id?: string
          image_url?: string
          sort_order?: number | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_photos_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_promo_codes: {
        Row: {
          code: string
          created_at: string
          current_uses: number
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          tournament_id: string
        }
        Insert: {
          code: string
          created_at?: string
          current_uses?: number
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          tournament_id: string
        }
        Update: {
          code?: string
          created_at?: string
          current_uses?: number
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_promo_codes_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_refund_requests: {
        Row: {
          admin_notes: string | null
          amount_cents: number
          created_at: string
          id: string
          reason: string
          registration_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          stripe_refund_id: string | null
          tournament_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount_cents: number
          created_at?: string
          id?: string
          reason: string
          registration_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          stripe_refund_id?: string | null
          tournament_id: string
        }
        Update: {
          admin_notes?: string | null
          amount_cents?: number
          created_at?: string
          id?: string
          reason?: string
          registration_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          stripe_refund_id?: string | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_refund_requests_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "tournament_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_refund_requests_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_registration_addons: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price_cents: number
          sort_order: number | null
          tournament_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price_cents?: number
          sort_order?: number | null
          tournament_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price_cents?: number
          sort_order?: number | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_registration_addons_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_registration_fields: {
        Row: {
          created_at: string
          field_type: string
          id: string
          is_default: boolean
          is_enabled: boolean
          is_required: boolean
          label: string
          options: Json | null
          sort_order: number | null
          tournament_id: string
        }
        Insert: {
          created_at?: string
          field_type?: string
          id?: string
          is_default?: boolean
          is_enabled?: boolean
          is_required?: boolean
          label: string
          options?: Json | null
          sort_order?: number | null
          tournament_id: string
        }
        Update: {
          created_at?: string
          field_type?: string
          id?: string
          is_default?: boolean
          is_enabled?: boolean
          is_required?: boolean
          label?: string
          options?: Json | null
          sort_order?: number | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_registration_fields_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_registration_tiers: {
        Row: {
          created_at: string
          description: string | null
          eligibility_description: string | null
          id: string
          is_active: boolean
          max_registrants: number | null
          name: string
          price_cents: number
          sort_order: number | null
          tournament_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          eligibility_description?: string | null
          id?: string
          is_active?: boolean
          max_registrants?: number | null
          name: string
          price_cents?: number
          sort_order?: number | null
          tournament_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          eligibility_description?: string | null
          id?: string
          is_active?: boolean
          max_registrants?: number | null
          name?: string
          price_cents?: number
          sort_order?: number | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_registration_tiers_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_registrations: {
        Row: {
          check_in_time: string | null
          checked_in: boolean | null
          created_at: string
          dietary_restrictions: string | null
          email: string
          first_name: string
          group_number: number | null
          group_position: number | null
          handicap: number | null
          id: string
          last_name: string
          notes: string | null
          payment_status: string
          phone: string | null
          scoring_code: string | null
          shirt_size: string | null
          tier_id: string | null
          tournament_id: string
        }
        Insert: {
          check_in_time?: string | null
          checked_in?: boolean | null
          created_at?: string
          dietary_restrictions?: string | null
          email: string
          first_name: string
          group_number?: number | null
          group_position?: number | null
          handicap?: number | null
          id?: string
          last_name: string
          notes?: string | null
          payment_status?: string
          phone?: string | null
          scoring_code?: string | null
          shirt_size?: string | null
          tier_id?: string | null
          tournament_id: string
        }
        Update: {
          check_in_time?: string | null
          checked_in?: boolean | null
          created_at?: string
          dietary_restrictions?: string | null
          email?: string
          first_name?: string
          group_number?: number | null
          group_position?: number | null
          handicap?: number | null
          id?: string
          last_name?: string
          notes?: string | null
          payment_status?: string
          phone?: string | null
          scoring_code?: string | null
          shirt_size?: string | null
          tier_id?: string | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_registrations_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "tournament_registration_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registrations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_scores: {
        Row: {
          created_at: string | null
          hole_number: number
          id: string
          registration_id: string
          strokes: number
          tournament_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          hole_number: number
          id?: string
          registration_id: string
          strokes: number
          tournament_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          hole_number?: number
          id?: string
          registration_id?: string
          strokes?: number
          tournament_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_scores_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "tournament_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_scores_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_sponsors: {
        Row: {
          amount: number | null
          created_at: string
          description: string | null
          id: string
          is_paid: boolean | null
          logo_url: string | null
          name: string
          show_on_leaderboard: boolean
          sort_order: number | null
          tier: string
          tournament_id: string
          website_url: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_paid?: boolean | null
          logo_url?: string | null
          name: string
          show_on_leaderboard?: boolean
          sort_order?: number | null
          tier?: string
          tournament_id: string
          website_url?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_paid?: boolean | null
          logo_url?: string | null
          name?: string
          show_on_leaderboard?: boolean
          sort_order?: number | null
          tier?: string
          tournament_id?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_sponsors_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_store_products: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          price: number
          purchase_url: string | null
          sort_order: number | null
          template_id: string | null
          tournament_id: string
          vendor_name: string | null
          vendor_url: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          price?: number
          purchase_url?: string | null
          sort_order?: number | null
          template_id?: string | null
          tournament_id: string
          vendor_name?: string | null
          vendor_url?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          price?: number
          purchase_url?: string | null
          sort_order?: number | null
          template_id?: string | null
          tournament_id?: string
          vendor_name?: string | null
          vendor_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_store_products_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "product_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_store_products_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_survey_questions: {
        Row: {
          created_at: string | null
          id: string
          options: Json | null
          question: string
          sort_order: number | null
          survey_id: string
          type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          options?: Json | null
          question: string
          sort_order?: number | null
          survey_id: string
          type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          options?: Json | null
          question?: string
          sort_order?: number | null
          survey_id?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "tournament_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_survey_responses: {
        Row: {
          answer: string
          created_at: string | null
          id: string
          question_id: string
          respondent_email: string
          survey_id: string
        }
        Insert: {
          answer: string
          created_at?: string | null
          id?: string
          question_id: string
          respondent_email: string
          survey_id: string
        }
        Update: {
          answer?: string
          created_at?: string | null
          id?: string
          question_id?: string
          respondent_email?: string
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_survey_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "tournament_survey_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "tournament_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_surveys: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          title: string
          tournament_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          title?: string
          tournament_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          title?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_surveys_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_volunteer_roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          max_volunteers: number | null
          sort_order: number | null
          time_slot: string | null
          title: string
          tournament_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          max_volunteers?: number | null
          sort_order?: number | null
          time_slot?: string | null
          title: string
          tournament_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          max_volunteers?: number | null
          sort_order?: number | null
          time_slot?: string | null
          title?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_volunteer_roles_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_volunteers: {
        Row: {
          checked_in: boolean | null
          checked_in_at: string | null
          created_at: string | null
          email: string
          id: string
          name: string
          phone: string | null
          role_id: string
          status: string | null
          tournament_id: string
        }
        Insert: {
          checked_in?: boolean | null
          checked_in_at?: string | null
          created_at?: string | null
          email: string
          id?: string
          name: string
          phone?: string | null
          role_id: string
          status?: string | null
          tournament_id: string
        }
        Update: {
          checked_in?: boolean | null
          checked_in_at?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          role_id?: string
          status?: string | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_volunteers_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "tournament_volunteer_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_volunteers_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_waitlist: {
        Row: {
          created_at: string
          deposit_amount: number | null
          deposit_paid: boolean
          group_size: number
          id: string
          notes: string | null
          offer_expires_at: string | null
          phone: string | null
          position: number
          status: string
          tournament_id: string
          user_email: string
          user_name: string
        }
        Insert: {
          created_at?: string
          deposit_amount?: number | null
          deposit_paid?: boolean
          group_size?: number
          id?: string
          notes?: string | null
          offer_expires_at?: string | null
          phone?: string | null
          position?: number
          status?: string
          tournament_id: string
          user_email: string
          user_name: string
        }
        Update: {
          created_at?: string
          deposit_amount?: number | null
          deposit_paid?: boolean
          group_size?: number
          id?: string
          notes?: string | null
          offer_expires_at?: string | null
          phone?: string | null
          position?: number
          status?: string
          tournament_id?: string
          user_email?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_waitlist_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          confirmation_email_config: Json | null
          contact_email: string | null
          contact_phone: string | null
          countdown_style: string
          course_name: string | null
          course_par: number | null
          created_at: string
          custom_domain: string | null
          date: string | null
          description: string | null
          donation_goal_cents: number | null
          end_date: string | null
          foursome_registration: boolean
          hole_pars: Json | null
          id: string
          image_url: string | null
          leaderboard_sponsor_interval_ms: number
          leaderboard_sponsor_style: string
          location: string | null
          max_group_size: number
          max_players: number | null
          organization_id: string
          pass_fees_to_participants: boolean
          pass_fees_to_registrants: boolean
          printable_font: string
          printable_layout: string
          rain_date_policy: string | null
          rain_date_policy_type: string | null
          refund_deadline_days: number | null
          refund_partial_percent: number | null
          refund_policy: string | null
          refund_policy_text: string | null
          refund_policy_type: string
          registration_fee_cents: number | null
          registration_open: boolean | null
          registration_url: string | null
          reserve_percentage: number | null
          schedule_info: string | null
          scoring_format: string
          site_hero_image_url: string | null
          site_hero_subtitle: string | null
          site_hero_title: string | null
          site_logo_url: string | null
          site_primary_color: string | null
          site_published: boolean | null
          site_secondary_color: string | null
          slug: string | null
          status: string
          template: string | null
          title: string
          updated_at: string
          waitlist_deposit_cents: number | null
          waitlist_enabled: boolean
        }
        Insert: {
          confirmation_email_config?: Json | null
          contact_email?: string | null
          contact_phone?: string | null
          countdown_style?: string
          course_name?: string | null
          course_par?: number | null
          created_at?: string
          custom_domain?: string | null
          date?: string | null
          description?: string | null
          donation_goal_cents?: number | null
          end_date?: string | null
          foursome_registration?: boolean
          hole_pars?: Json | null
          id?: string
          image_url?: string | null
          leaderboard_sponsor_interval_ms?: number
          leaderboard_sponsor_style?: string
          location?: string | null
          max_group_size?: number
          max_players?: number | null
          organization_id: string
          pass_fees_to_participants?: boolean
          pass_fees_to_registrants?: boolean
          printable_font?: string
          printable_layout?: string
          rain_date_policy?: string | null
          rain_date_policy_type?: string | null
          refund_deadline_days?: number | null
          refund_partial_percent?: number | null
          refund_policy?: string | null
          refund_policy_text?: string | null
          refund_policy_type?: string
          registration_fee_cents?: number | null
          registration_open?: boolean | null
          registration_url?: string | null
          reserve_percentage?: number | null
          schedule_info?: string | null
          scoring_format?: string
          site_hero_image_url?: string | null
          site_hero_subtitle?: string | null
          site_hero_title?: string | null
          site_logo_url?: string | null
          site_primary_color?: string | null
          site_published?: boolean | null
          site_secondary_color?: string | null
          slug?: string | null
          status?: string
          template?: string | null
          title: string
          updated_at?: string
          waitlist_deposit_cents?: number | null
          waitlist_enabled?: boolean
        }
        Update: {
          confirmation_email_config?: Json | null
          contact_email?: string | null
          contact_phone?: string | null
          countdown_style?: string
          course_name?: string | null
          course_par?: number | null
          created_at?: string
          custom_domain?: string | null
          date?: string | null
          description?: string | null
          donation_goal_cents?: number | null
          end_date?: string | null
          foursome_registration?: boolean
          hole_pars?: Json | null
          id?: string
          image_url?: string | null
          leaderboard_sponsor_interval_ms?: number
          leaderboard_sponsor_style?: string
          location?: string | null
          max_group_size?: number
          max_players?: number | null
          organization_id?: string
          pass_fees_to_participants?: boolean
          pass_fees_to_registrants?: boolean
          printable_font?: string
          printable_layout?: string
          rain_date_policy?: string | null
          rain_date_policy_type?: string | null
          refund_deadline_days?: number | null
          refund_partial_percent?: number | null
          refund_policy?: string | null
          refund_policy_text?: string | null
          refund_policy_type?: string
          registration_fee_cents?: number | null
          registration_open?: boolean | null
          registration_url?: string | null
          reserve_percentage?: number | null
          schedule_info?: string | null
          scoring_format?: string
          site_hero_image_url?: string | null
          site_hero_subtitle?: string | null
          site_hero_title?: string | null
          site_logo_url?: string | null
          site_primary_color?: string | null
          site_published?: boolean | null
          site_secondary_color?: string | null
          slug?: string | null
          status?: string
          template?: string | null
          title?: string
          updated_at?: string
          waitlist_deposit_cents?: number | null
          waitlist_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_owner: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      org_permission:
        | "manage_players"
        | "manage_registration"
        | "manage_budget"
        | "manage_sponsors"
        | "manage_messages"
        | "manage_leaderboard"
        | "manage_store"
        | "manage_auction"
        | "manage_gallery"
        | "manage_volunteers"
        | "manage_surveys"
        | "manage_donations"
        | "manage_check_in"
        | "manage_settings"
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
    Enums: {
      app_role: ["admin", "user"],
      org_permission: [
        "manage_players",
        "manage_registration",
        "manage_budget",
        "manage_sponsors",
        "manage_messages",
        "manage_leaderboard",
        "manage_store",
        "manage_auction",
        "manage_gallery",
        "manage_volunteers",
        "manage_surveys",
        "manage_donations",
        "manage_check_in",
        "manage_settings",
      ],
    },
  },
} as const
