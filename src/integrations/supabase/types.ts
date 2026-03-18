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
      organizations: {
        Row: {
          created_at: string
          ein: string | null
          id: string
          is_nonprofit: boolean
          logo_url: string | null
          name: string
          nonprofit_name: string | null
          nonprofit_verified: boolean
          plan: string
          primary_color: string | null
          secondary_color: string | null
          stripe_account_id: string | null
          subdomain: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          ein?: string | null
          id?: string
          is_nonprofit?: boolean
          logo_url?: string | null
          name: string
          nonprofit_name?: string | null
          nonprofit_verified?: boolean
          plan?: string
          primary_color?: string | null
          secondary_color?: string | null
          stripe_account_id?: string | null
          subdomain?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          ein?: string | null
          id?: string
          is_nonprofit?: boolean
          logo_url?: string | null
          name?: string
          nonprofit_name?: string | null
          nonprofit_verified?: boolean
          plan?: string
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
          tournament_id?: string
        }
        Relationships: [
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
      tournaments: {
        Row: {
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
          foursome_registration: boolean
          hole_pars: Json | null
          id: string
          image_url: string | null
          leaderboard_sponsor_interval_ms: number
          leaderboard_sponsor_style: string
          location: string | null
          max_players: number | null
          organization_id: string
          pass_fees_to_registrants: boolean
          printable_font: string
          printable_layout: string
          registration_fee_cents: number | null
          registration_open: boolean | null
          registration_url: string | null
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
        }
        Insert: {
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
          foursome_registration?: boolean
          hole_pars?: Json | null
          id?: string
          image_url?: string | null
          leaderboard_sponsor_interval_ms?: number
          leaderboard_sponsor_style?: string
          location?: string | null
          max_players?: number | null
          organization_id: string
          pass_fees_to_registrants?: boolean
          printable_font?: string
          printable_layout?: string
          registration_fee_cents?: number | null
          registration_open?: boolean | null
          registration_url?: string | null
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
        }
        Update: {
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
          foursome_registration?: boolean
          hole_pars?: Json | null
          id?: string
          image_url?: string | null
          leaderboard_sponsor_interval_ms?: number
          leaderboard_sponsor_style?: string
          location?: string | null
          max_players?: number | null
          organization_id?: string
          pass_fees_to_registrants?: boolean
          printable_font?: string
          printable_layout?: string
          registration_fee_cents?: number | null
          registration_open?: boolean | null
          registration_url?: string | null
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
