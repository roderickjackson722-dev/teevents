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
      accommodation_custom_fields: {
        Row: {
          accommodation_id: string
          created_at: string
          display_order: number
          field_name: string
          field_value: string | null
          id: string
        }
        Insert: {
          accommodation_id: string
          created_at?: string
          display_order?: number
          field_name: string
          field_value?: string | null
          id?: string
        }
        Update: {
          accommodation_id?: string
          created_at?: string
          display_order?: number
          field_name?: string
          field_value?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_custom_fields_accommodation_id_fkey"
            columns: ["accommodation_id"]
            isOneToOne: false
            referencedRelation: "tournament_accommodations"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_room_types: {
        Row: {
          accommodation_id: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          max_occupancy: number | null
          rate_cents: number | null
          rate_note: string | null
          room_type: string
        }
        Insert: {
          accommodation_id: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          max_occupancy?: number | null
          rate_cents?: number | null
          rate_note?: string | null
          room_type: string
        }
        Update: {
          accommodation_id?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          max_occupancy?: number | null
          rate_cents?: number | null
          rate_note?: string | null
          room_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_room_types_accommodation_id_fkey"
            columns: ["accommodation_id"]
            isOneToOne: false
            referencedRelation: "tournament_accommodations"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          action_type: string
          created_at: string
          description: string | null
          email: string | null
          id: string
          metadata: Json | null
          organization_id: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          changes: Json | null
          created_at: string
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id: string
          changes?: Json | null
          created_at?: string
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          changes?: Json | null
          created_at?: string
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      admin_competitors: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          talking_points: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          talking_points?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          talking_points?: Json
          updated_at?: string
        }
        Relationships: []
      }
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
      admin_invoices: {
        Row: {
          created_at: string
          created_by: string
          currency: string
          customer_address: string | null
          customer_company: string | null
          customer_email: string | null
          customer_name: string
          discount_cents: number
          due_date: string | null
          edit_history: Json
          id: string
          invoice_number: string
          issue_date: string
          last_edited_by: string | null
          line_items: Json
          notes: string | null
          status: string
          tax_rate: number
          total_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          currency?: string
          customer_address?: string | null
          customer_company?: string | null
          customer_email?: string | null
          customer_name?: string
          discount_cents?: number
          due_date?: string | null
          edit_history?: Json
          id?: string
          invoice_number: string
          issue_date?: string
          last_edited_by?: string | null
          line_items?: Json
          notes?: string | null
          status?: string
          tax_rate?: number
          total_cents?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          currency?: string
          customer_address?: string | null
          customer_company?: string | null
          customer_email?: string | null
          customer_name?: string
          discount_cents?: number
          due_date?: string | null
          edit_history?: Json
          id?: string
          invoice_number?: string
          issue_date?: string
          last_edited_by?: string | null
          line_items?: Json
          notes?: string | null
          status?: string
          tax_rate?: number
          total_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          organization_id: string | null
          title: string | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          organization_id?: string | null
          title?: string | null
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          organization_id?: string | null
          title?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_password_resets: {
        Row: {
          admin_id: string | null
          created_at: string
          emailed: boolean
          expires_at: string
          id: string
          reset_token: string
          target_email: string
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          emailed?: boolean
          expires_at?: string
          id?: string
          reset_token: string
          target_email: string
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          emailed?: boolean
          expires_at?: string
          id?: string
          reset_token?: string
          target_email?: string
          used_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_payout_overrides: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          mailing_address: string | null
          new_method: string
          old_method: string | null
          organization_id: string
          paypal_email: string | null
          reason: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          mailing_address?: string | null
          new_method: string
          old_method?: string | null
          organization_id: string
          paypal_email?: string | null
          reason: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          mailing_address?: string | null
          new_method?: string
          old_method?: string | null
          organization_id?: string
          paypal_email?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_payout_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_user_notes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      auction_bids: {
        Row: {
          auction_id: string
          bid_amount_cents: number
          bidder_email: string
          bidder_name: string
          bidder_phone: string | null
          created_at: string
          id: string
          verified: boolean
          verified_at: string | null
          verify_token: string
        }
        Insert: {
          auction_id: string
          bid_amount_cents: number
          bidder_email: string
          bidder_name: string
          bidder_phone?: string | null
          created_at?: string
          id?: string
          verified?: boolean
          verified_at?: string | null
          verify_token?: string
        }
        Update: {
          auction_id?: string
          bid_amount_cents?: number
          bidder_email?: string
          bidder_name?: string
          bidder_phone?: string | null
          created_at?: string
          id?: string
          verified?: boolean
          verified_at?: string | null
          verify_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "auction_bids_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
        ]
      }
      auctions: {
        Row: {
          auto_extend_minutes: number
          buy_now_cents: number | null
          created_at: string
          current_bid_cents: number | null
          description: string | null
          end_time: string | null
          id: string
          images: string[]
          item_name: string
          minimum_increment_cents: number
          start_time: string | null
          starting_bid_cents: number
          status: string
          tournament_id: string
          updated_at: string
          winner_notified_at: string | null
          winning_bid_amount_cents: number | null
          winning_bidder_email: string | null
          winning_bidder_name: string | null
        }
        Insert: {
          auto_extend_minutes?: number
          buy_now_cents?: number | null
          created_at?: string
          current_bid_cents?: number | null
          description?: string | null
          end_time?: string | null
          id?: string
          images?: string[]
          item_name: string
          minimum_increment_cents?: number
          start_time?: string | null
          starting_bid_cents?: number
          status?: string
          tournament_id: string
          updated_at?: string
          winner_notified_at?: string | null
          winning_bid_amount_cents?: number | null
          winning_bidder_email?: string | null
          winning_bidder_name?: string | null
        }
        Update: {
          auto_extend_minutes?: number
          buy_now_cents?: number | null
          created_at?: string
          current_bid_cents?: number | null
          description?: string | null
          end_time?: string | null
          id?: string
          images?: string[]
          item_name?: string
          minimum_increment_cents?: number
          start_time?: string | null
          starting_bid_cents?: number
          status?: string
          tournament_id?: string
          updated_at?: string
          winner_notified_at?: string | null
          winning_bid_amount_cents?: number | null
          winning_bidder_email?: string | null
          winning_bidder_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auctions_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_rate_limits: {
        Row: {
          action: string
          attempts: number
          created_at: string
          id: string
          ip_address: string
          updated_at: string
          window_start: string
        }
        Insert: {
          action: string
          attempts?: number
          created_at?: string
          id?: string
          ip_address: string
          updated_at?: string
          window_start?: string
        }
        Update: {
          action?: string
          attempts?: number
          created_at?: string
          id?: string
          ip_address?: string
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      booking_categories: {
        Row: {
          color: string | null
          context: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          context?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          context?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      booking_notification_settings: {
        Row: {
          additional_email: string | null
          admin_email: string
          context: string
          created_at: string
          id: string
          send_on_booking: boolean
          send_on_cancellation: boolean
          updated_at: string
        }
        Insert: {
          additional_email?: string | null
          admin_email?: string
          context?: string
          created_at?: string
          id?: string
          send_on_booking?: boolean
          send_on_cancellation?: boolean
          updated_at?: string
        }
        Update: {
          additional_email?: string | null
          admin_email?: string
          context?: string
          created_at?: string
          id?: string
          send_on_booking?: boolean
          send_on_cancellation?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      booking_reservations: {
        Row: {
          booking_reference: string | null
          coach_email: string
          coach_name: string
          coach_phone: string | null
          created_at: string
          id: string
          notes: string | null
          slot_id: string
          status: string
          team_name: string | null
          updated_at: string
        }
        Insert: {
          booking_reference?: string | null
          coach_email: string
          coach_name: string
          coach_phone?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          slot_id: string
          status?: string
          team_name?: string | null
          updated_at?: string
        }
        Update: {
          booking_reference?: string | null
          coach_email?: string
          coach_name?: string
          coach_phone?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          slot_id?: string
          status?: string
          team_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_reservations_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "booking_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_slots: {
        Row: {
          category_id: string | null
          context: string | null
          created_at: string
          created_by: string | null
          current_bookings: number
          description: string | null
          end_time: string
          id: string
          is_active: boolean
          location: string | null
          max_bookings: number
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          context?: string | null
          created_at?: string
          created_by?: string | null
          current_bookings?: number
          description?: string | null
          end_time: string
          id?: string
          is_active?: boolean
          location?: string | null
          max_bookings?: number
          start_time: string
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          context?: string | null
          created_at?: string
          created_by?: string | null
          current_bookings?: number
          description?: string | null
          end_time?: string
          id?: string
          is_active?: boolean
          location?: string | null
          max_bookings?: number
          start_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_slots_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "booking_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_estimates: {
        Row: {
          budget_id: string
          created_at: string
          estimated_amount: number
          id: string
          item_name: string
          notes: string
          sort_order: number
          sponsorable: boolean
          type: string
          vendor_a_name: string
          vendor_a_price: number
          vendor_b_name: string
          vendor_b_price: number
          vendor_c_name: string
          vendor_c_price: number
          vendor_contact: string
        }
        Insert: {
          budget_id: string
          created_at?: string
          estimated_amount?: number
          id?: string
          item_name?: string
          notes?: string
          sort_order?: number
          sponsorable?: boolean
          type?: string
          vendor_a_name?: string
          vendor_a_price?: number
          vendor_b_name?: string
          vendor_b_price?: number
          vendor_c_name?: string
          vendor_c_price?: number
          vendor_contact?: string
        }
        Update: {
          budget_id?: string
          created_at?: string
          estimated_amount?: number
          id?: string
          item_name?: string
          notes?: string
          sort_order?: number
          sponsorable?: boolean
          type?: string
          vendor_a_name?: string
          vendor_a_price?: number
          vendor_b_name?: string
          vendor_b_price?: number
          vendor_c_name?: string
          vendor_c_price?: number
          vendor_contact?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_estimates_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "tournament_budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_expenses: {
        Row: {
          actual_cost: number
          budget_id: string
          category: string
          created_at: string
          estimated_cost: number
          id: string
          is_paid: boolean
          item_name: string
          notes: string
          payment_due_date: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          actual_cost?: number
          budget_id: string
          category?: string
          created_at?: string
          estimated_cost?: number
          id?: string
          is_paid?: boolean
          item_name?: string
          notes?: string
          payment_due_date?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          actual_cost?: number
          budget_id?: string
          category?: string
          created_at?: string
          estimated_cost?: number
          id?: string
          is_paid?: boolean
          item_name?: string
          notes?: string
          payment_due_date?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_expenses_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "tournament_budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_income: {
        Row: {
          actual_amount: number
          budget_id: string
          category: string
          created_at: string
          date_received: string | null
          id: string
          is_received: boolean
          item_name: string
          notes: string
          payer_source: string
          projected_amount: number
          quantity_actual: number
          quantity_estimated: number
          sort_order: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          actual_amount?: number
          budget_id: string
          category?: string
          created_at?: string
          date_received?: string | null
          id?: string
          is_received?: boolean
          item_name?: string
          notes?: string
          payer_source?: string
          projected_amount?: number
          quantity_actual?: number
          quantity_estimated?: number
          sort_order?: number
          unit_price?: number
          updated_at?: string
        }
        Update: {
          actual_amount?: number
          budget_id?: string
          category?: string
          created_at?: string
          date_received?: string | null
          id?: string
          is_received?: boolean
          item_name?: string
          notes?: string
          payer_source?: string
          projected_amount?: number
          quantity_actual?: number
          quantity_estimated?: number
          sort_order?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_income_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "tournament_budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_templates: {
        Row: {
          created_at: string
          expense_items: Json
          id: string
          income_items: Json
          template_name: string
          tournament_format: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expense_items?: Json
          id?: string
          income_items?: Json
          template_name: string
          tournament_format?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expense_items?: Json
          id?: string
          income_items?: Json
          template_name?: string
          tournament_format?: string | null
          user_id?: string
        }
        Relationships: []
      }
      college_survey_questions: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_required: boolean
          options: Json | null
          question_text: string
          question_type: string
          survey_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_required?: boolean
          options?: Json | null
          question_text: string
          question_type?: string
          survey_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_required?: boolean
          options?: Json | null
          question_text?: string
          question_type?: string
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "college_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      college_survey_responses: {
        Row: {
          id: string
          respondent_career_goals: string | null
          respondent_email: string | null
          respondent_major: string | null
          respondent_name: string | null
          respondent_school: string | null
          respondent_year: string | null
          response_data: Json
          submitted_at: string
          survey_id: string
        }
        Insert: {
          id?: string
          respondent_career_goals?: string | null
          respondent_email?: string | null
          respondent_major?: string | null
          respondent_name?: string | null
          respondent_school?: string | null
          respondent_year?: string | null
          response_data?: Json
          submitted_at?: string
          survey_id: string
        }
        Update: {
          id?: string
          respondent_career_goals?: string | null
          respondent_email?: string | null
          respondent_major?: string | null
          respondent_name?: string | null
          respondent_school?: string | null
          respondent_year?: string | null
          response_data?: Json
          submitted_at?: string
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "college_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      college_surveys: {
        Row: {
          created_at: string
          cta_description: string | null
          cta_label: string | null
          description: string | null
          hero_image_url: string | null
          id: string
          is_active: boolean
          notify_respondent: boolean
          slug: string
          title: string
          tournament_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_description?: string | null
          cta_label?: string | null
          description?: string | null
          hero_image_url?: string | null
          id?: string
          is_active?: boolean
          notify_respondent?: boolean
          slug: string
          title: string
          tournament_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_description?: string | null
          cta_label?: string | null
          description?: string | null
          hero_image_url?: string | null
          id?: string
          is_active?: boolean
          notify_respondent?: boolean
          slug?: string
          title?: string
          tournament_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_surveys_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "college_tournaments"
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
          archived_at: string | null
          contact_email: string | null
          course_name: string | null
          created_at: string
          description: string | null
          end_date: string | null
          flyer_url: string | null
          hero_image_url: string | null
          hero_overlay_opacity: number | null
          hero_tagline: string | null
          id: string
          location: string | null
          overview_visible: boolean
          registration_fields: Json | null
          registration_open: boolean | null
          slug: string | null
          start_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          contact_email?: string | null
          course_name?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          flyer_url?: string | null
          hero_image_url?: string | null
          hero_overlay_opacity?: number | null
          hero_tagline?: string | null
          id?: string
          location?: string | null
          overview_visible?: boolean
          registration_fields?: Json | null
          registration_open?: boolean | null
          slug?: string | null
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          contact_email?: string | null
          course_name?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          flyer_url?: string | null
          hero_image_url?: string | null
          hero_overlay_opacity?: number | null
          hero_tagline?: string | null
          id?: string
          location?: string | null
          overview_visible?: boolean
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
      course_database: {
        Row: {
          city: string | null
          course_name: string
          course_rating: number | null
          created_at: string
          created_by: string | null
          hole_distances: Json | null
          hole_pars: Json | null
          hole_stroke_indexes: Json | null
          id: string
          is_public: boolean
          is_verified: boolean
          par_total: number | null
          slope_rating: number | null
          state: string | null
          tee_name: string | null
          updated_at: string
          use_count: number
        }
        Insert: {
          city?: string | null
          course_name: string
          course_rating?: number | null
          created_at?: string
          created_by?: string | null
          hole_distances?: Json | null
          hole_pars?: Json | null
          hole_stroke_indexes?: Json | null
          id?: string
          is_public?: boolean
          is_verified?: boolean
          par_total?: number | null
          slope_rating?: number | null
          state?: string | null
          tee_name?: string | null
          updated_at?: string
          use_count?: number
        }
        Update: {
          city?: string | null
          course_name?: string
          course_rating?: number | null
          created_at?: string
          created_by?: string | null
          hole_distances?: Json | null
          hole_pars?: Json | null
          hole_stroke_indexes?: Json | null
          id?: string
          is_public?: boolean
          is_verified?: boolean
          par_total?: number | null
          slope_rating?: number | null
          state?: string | null
          tee_name?: string | null
          updated_at?: string
          use_count?: number
        }
        Relationships: []
      }
      course_tee_sets: {
        Row: {
          course_rating: number
          created_at: string
          hole_distances: Json | null
          hole_pars: Json
          hole_stroke_indexes: Json
          id: string
          is_default: boolean | null
          par_total: number
          slope_rating: number
          tee_name: string
          tournament_id: string
          updated_at: string
        }
        Insert: {
          course_rating?: number
          created_at?: string
          hole_distances?: Json | null
          hole_pars?: Json
          hole_stroke_indexes?: Json
          id?: string
          is_default?: boolean | null
          par_total?: number
          slope_rating?: number
          tee_name: string
          tournament_id: string
          updated_at?: string
        }
        Update: {
          course_rating?: number
          created_at?: string
          hole_distances?: Json | null
          hole_pars?: Json
          hole_stroke_indexes?: Json
          id?: string
          is_default?: boolean | null
          par_total?: number
          slope_rating?: number
          tee_name?: string
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_tee_sets_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_audit_log: {
        Row: {
          changed_at: string
          changed_by: string | null
          contact_id: string
          field_name: string | null
          id: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          contact_id: string
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          contact_id?: string
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_audit_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_communications: {
        Row: {
          communication_type: string
          contact_id: string
          created_at: string
          created_by: string | null
          direction: string
          id: string
          message: string | null
          sent_at: string | null
          subject: string | null
        }
        Insert: {
          communication_type?: string
          contact_id: string
          created_at?: string
          created_by?: string | null
          direction?: string
          id?: string
          message?: string | null
          sent_at?: string | null
          subject?: string | null
        }
        Update: {
          communication_type?: string
          contact_id?: string
          created_at?: string
          created_by?: string | null
          direction?: string
          id?: string
          message?: string | null
          sent_at?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_communications_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          company: string | null
          contact_type: string
          created_at: string
          created_by: string | null
          email: string | null
          first_name: string
          id: string
          invited: boolean
          invited_at: string | null
          last_name: string
          notes: string | null
          organization_id: string
          phone: string | null
          responded_at: string | null
          response_status: string
          title: string | null
          tournament_id: string
          updated_at: string
        }
        Insert: {
          company?: string | null
          contact_type?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_name: string
          id?: string
          invited?: boolean
          invited_at?: string | null
          last_name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          responded_at?: string | null
          response_status?: string
          title?: string | null
          tournament_id: string
          updated_at?: string
        }
        Update: {
          company?: string | null
          contact_type?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_name?: string
          id?: string
          invited?: boolean
          invited_at?: string | null
          last_name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          responded_at?: string | null
          response_status?: string
          title?: string | null
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          notes: string | null
          status: string
          task_type: string
          title: string | null
          tournament_id: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          status?: string
          task_type?: string
          title?: string | null
          tournament_id: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          status?: string
          task_type?: string
          title?: string | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_audit_log: {
        Row: {
          action: string
          changed_fields: Json | null
          id: string
          new_values: Json | null
          occurred_at: string
          old_values: Json | null
          organization_id: string | null
          row_id: string | null
          table_name: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changed_fields?: Json | null
          id?: string
          new_values?: Json | null
          occurred_at?: string
          old_values?: Json | null
          organization_id?: string | null
          row_id?: string | null
          table_name: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changed_fields?: Json | null
          id?: string
          new_values?: Json | null
          occurred_at?: string
          old_values?: Json | null
          organization_id?: string | null
          row_id?: string | null
          table_name?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      day_of_emails: {
        Row: {
          id: string
          message: string | null
          recipient_count: number
          sent_at: string
          sent_by: string | null
          subject: string | null
          tournament_id: string
        }
        Insert: {
          id?: string
          message?: string | null
          recipient_count?: number
          sent_at?: string
          sent_by?: string | null
          subject?: string | null
          tournament_id: string
        }
        Update: {
          id?: string
          message?: string | null
          recipient_count?: number
          sent_at?: string
          sent_by?: string | null
          subject?: string | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "day_of_emails_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_access: {
        Row: {
          access_count: number
          access_token: string
          created_at: string
          demo_tournament_id: string | null
          expires_at: string
          id: string
          last_accessed_at: string | null
          prospect_email: string
          prospect_name: string | null
          revoked_at: string | null
          tournament_id: string | null
        }
        Insert: {
          access_count?: number
          access_token: string
          created_at?: string
          demo_tournament_id?: string | null
          expires_at?: string
          id?: string
          last_accessed_at?: string | null
          prospect_email: string
          prospect_name?: string | null
          revoked_at?: string | null
          tournament_id?: string | null
        }
        Update: {
          access_count?: number
          access_token?: string
          created_at?: string
          demo_tournament_id?: string | null
          expires_at?: string
          id?: string
          last_accessed_at?: string | null
          prospect_email?: string
          prospect_name?: string | null
          revoked_at?: string | null
          tournament_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demo_access_demo_tournament_id_fkey"
            columns: ["demo_tournament_id"]
            isOneToOne: false
            referencedRelation: "demo_tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_access_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_agenda: {
        Row: {
          content: string
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      demo_conversion_discounts: {
        Row: {
          conversion_token: string
          created_at: string
          discount_type: string
          discount_value: number | null
          id: string
          tournament_id: string
          used: boolean
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          conversion_token: string
          created_at?: string
          discount_type: string
          discount_value?: number | null
          id?: string
          tournament_id: string
          used?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          conversion_token?: string
          created_at?: string
          discount_type?: string
          discount_value?: number | null
          id?: string
          tournament_id?: string
          used?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demo_conversion_discounts_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_conversion_log: {
        Row: {
          converted_at: string
          converted_by: string | null
          converted_to_live: boolean
          id: string
          is_test: boolean
          notes: string | null
          organization_id: string | null
          prospect_email: string | null
          prospect_name: string | null
          tournament_id: string | null
          tournament_name: string | null
        }
        Insert: {
          converted_at?: string
          converted_by?: string | null
          converted_to_live?: boolean
          id?: string
          is_test?: boolean
          notes?: string | null
          organization_id?: string | null
          prospect_email?: string | null
          prospect_name?: string | null
          tournament_id?: string | null
          tournament_name?: string | null
        }
        Update: {
          converted_at?: string
          converted_by?: string | null
          converted_to_live?: boolean
          id?: string
          is_test?: boolean
          notes?: string | null
          organization_id?: string | null
          prospect_email?: string | null
          prospect_name?: string | null
          tournament_id?: string | null
          tournament_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demo_conversion_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_conversion_log_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          lead_id: string | null
          metadata: Json | null
          step_index: number | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          step_index?: number | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          step_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "demo_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "demo_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_leads: {
        Row: {
          created_at: string
          demo_completed: boolean
          demo_completed_at: string | null
          demo_exited_at: string | null
          demo_started_at: string
          email: string
          feedback_reasons: string[] | null
          feedback_score: number | null
          feedback_submitted_at: string | null
          feedback_text: string | null
          followup_24h_sent_at: string | null
          followup_7d_sent_at: string | null
          id: string
          last_step_index: number | null
          role: string | null
          signed_up_at: string | null
          updated_at: string
          user_agent: string | null
          welcome_email_sent_at: string | null
        }
        Insert: {
          created_at?: string
          demo_completed?: boolean
          demo_completed_at?: string | null
          demo_exited_at?: string | null
          demo_started_at?: string
          email: string
          feedback_reasons?: string[] | null
          feedback_score?: number | null
          feedback_submitted_at?: string | null
          feedback_text?: string | null
          followup_24h_sent_at?: string | null
          followup_7d_sent_at?: string | null
          id?: string
          last_step_index?: number | null
          role?: string | null
          signed_up_at?: string | null
          updated_at?: string
          user_agent?: string | null
          welcome_email_sent_at?: string | null
        }
        Update: {
          created_at?: string
          demo_completed?: boolean
          demo_completed_at?: string | null
          demo_exited_at?: string | null
          demo_started_at?: string
          email?: string
          feedback_reasons?: string[] | null
          feedback_score?: number | null
          feedback_submitted_at?: string | null
          feedback_text?: string | null
          followup_24h_sent_at?: string | null
          followup_7d_sent_at?: string | null
          id?: string
          last_step_index?: number | null
          role?: string | null
          signed_up_at?: string | null
          updated_at?: string
          user_agent?: string | null
          welcome_email_sent_at?: string | null
        }
        Relationships: []
      }
      demo_players: {
        Row: {
          created_at: string
          demo_tournament_id: string
          email: string | null
          group_name: string | null
          handicap: number | null
          id: string
          name: string
          shirt_size: string | null
          tee_time: string | null
        }
        Insert: {
          created_at?: string
          demo_tournament_id: string
          email?: string | null
          group_name?: string | null
          handicap?: number | null
          id?: string
          name: string
          shirt_size?: string | null
          tee_time?: string | null
        }
        Update: {
          created_at?: string
          demo_tournament_id?: string
          email?: string | null
          group_name?: string | null
          handicap?: number | null
          id?: string
          name?: string
          shirt_size?: string | null
          tee_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demo_players_demo_tournament_id_fkey"
            columns: ["demo_tournament_id"]
            isOneToOne: false
            referencedRelation: "demo_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_requests: {
        Row: {
          contacted_at: string | null
          created_at: string
          email: string
          expected_players: number | null
          heard_from: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          planning_status: string | null
          role: string | null
          status: string
          tournament_name: string | null
          updated_at: string
        }
        Insert: {
          contacted_at?: string | null
          created_at?: string
          email: string
          expected_players?: number | null
          heard_from?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          planning_status?: string | null
          role?: string | null
          status?: string
          tournament_name?: string | null
          updated_at?: string
        }
        Update: {
          contacted_at?: string | null
          created_at?: string
          email?: string
          expected_players?: number | null
          heard_from?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          planning_status?: string | null
          role?: string | null
          status?: string
          tournament_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      demo_scores: {
        Row: {
          created_at: string
          demo_tournament_id: string
          gross_score: number | null
          hole_number: number | null
          id: string
          player_name: string | null
        }
        Insert: {
          created_at?: string
          demo_tournament_id: string
          gross_score?: number | null
          hole_number?: number | null
          id?: string
          player_name?: string | null
        }
        Update: {
          created_at?: string
          demo_tournament_id?: string
          gross_score?: number | null
          hole_number?: number | null
          id?: string
          player_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demo_scores_demo_tournament_id_fkey"
            columns: ["demo_tournament_id"]
            isOneToOne: false
            referencedRelation: "demo_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_sponsors: {
        Row: {
          created_at: string
          demo_tournament_id: string
          id: string
          level: string | null
          logo_url: string | null
          name: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          demo_tournament_id: string
          id?: string
          level?: string | null
          logo_url?: string | null
          name: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          demo_tournament_id?: string
          id?: string
          level?: string | null
          logo_url?: string | null
          name?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demo_sponsors_demo_tournament_id_fkey"
            columns: ["demo_tournament_id"]
            isOneToOne: false
            referencedRelation: "demo_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_tournaments: {
        Row: {
          admin_id: string | null
          conversion_token: string | null
          converted_at: string | null
          course_name: string | null
          created_at: string
          event_date: string | null
          id: string
          live_tournament_id: string | null
          location: string | null
          prospect_email: string | null
          prospect_name: string | null
          public_token: string
          registration_fee_cents: number
          scoring_format: string
          status: string
          tournament_name: string
          updated_at: string
          view_only: boolean
        }
        Insert: {
          admin_id?: string | null
          conversion_token?: string | null
          converted_at?: string | null
          course_name?: string | null
          created_at?: string
          event_date?: string | null
          id?: string
          live_tournament_id?: string | null
          location?: string | null
          prospect_email?: string | null
          prospect_name?: string | null
          public_token?: string
          registration_fee_cents?: number
          scoring_format?: string
          status?: string
          tournament_name: string
          updated_at?: string
          view_only?: boolean
        }
        Update: {
          admin_id?: string | null
          conversion_token?: string | null
          converted_at?: string | null
          course_name?: string | null
          created_at?: string
          event_date?: string | null
          id?: string
          live_tournament_id?: string | null
          location?: string | null
          prospect_email?: string | null
          prospect_name?: string | null
          public_token?: string
          registration_fee_cents?: number
          scoring_format?: string
          status?: string
          tournament_name?: string
          updated_at?: string
          view_only?: boolean
        }
        Relationships: []
      }
      director_shop_orders: {
        Row: {
          amount_cents: number
          contact_email: string
          contact_name: string
          contact_phone: string
          created_at: string
          id: string
          logo_url: string | null
          order_notes: string | null
          payment_status: string
          product_id: string | null
          product_name: string
          stripe_session_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents?: number
          contact_email: string
          contact_name: string
          contact_phone: string
          created_at?: string
          id?: string
          logo_url?: string | null
          order_notes?: string | null
          payment_status?: string
          product_id?: string | null
          product_name: string
          stripe_session_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          contact_email?: string
          contact_name?: string
          contact_phone?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          order_notes?: string | null
          payment_status?: string
          product_id?: string | null
          product_name?: string
          stripe_session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "director_shop_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "platform_store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      early_signups: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
          source: string | null
          tournament_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name?: string | null
          source?: string | null
          tournament_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          source?: string | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "early_signups_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string
          metadata: Json | null
          organization_id: string | null
          recipient_email: string
          resend_id: string | null
          source: string | null
          status: string
          subject: string | null
          template_name: string
          tournament_id: string | null
          triggered_by: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id: string
          metadata?: Json | null
          organization_id?: string | null
          recipient_email: string
          resend_id?: string | null
          source?: string | null
          status: string
          subject?: string | null
          template_name: string
          tournament_id?: string | null
          triggered_by?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string
          metadata?: Json | null
          organization_id?: string | null
          recipient_email?: string
          resend_id?: string | null
          source?: string | null
          status?: string
          subject?: string | null
          template_name?: string
          tournament_id?: string | null
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_send_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          event_id: string
          id?: string
          name: string
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          event_id?: string
          id?: string
          name?: string
          status?: string
          user_id?: string | null
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
      event_day_sales_items: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          item_name: string
          max_quantity: number | null
          price_cents: number
          show_on_public: boolean
          show_qr_code: boolean
          sold_quantity: number
          sort_order: number
          tournament_id: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          item_name: string
          max_quantity?: number | null
          price_cents?: number
          show_on_public?: boolean
          show_qr_code?: boolean
          sold_quantity?: number
          sort_order?: number
          tournament_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          item_name?: string
          max_quantity?: number | null
          price_cents?: number
          show_on_public?: boolean
          show_qr_code?: boolean
          sold_quantity?: number
          sort_order?: number
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_day_sales_items_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      event_day_sales_purchases: {
        Row: {
          amount_cents: number
          buyer_email: string | null
          buyer_name: string | null
          created_at: string
          id: string
          item_id: string
          payment_status: string
          quantity: number
          stripe_session_id: string | null
          tournament_id: string
        }
        Insert: {
          amount_cents?: number
          buyer_email?: string | null
          buyer_name?: string | null
          created_at?: string
          id?: string
          item_id: string
          payment_status?: string
          quantity?: number
          stripe_session_id?: string | null
          tournament_id: string
        }
        Update: {
          amount_cents?: number
          buyer_email?: string | null
          buyer_name?: string | null
          created_at?: string
          id?: string
          item_id?: string
          payment_status?: string
          quantity?: number
          stripe_session_id?: string | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_day_sales_purchases_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "event_day_sales_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_day_sales_purchases_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
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
      event_ticket_purchases: {
        Row: {
          buyer_answers: Json
          buyer_email: string | null
          buyer_name: string | null
          created_at: string
          event_id: string
          id: string
          payment_status: string
          quantity: number
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          tier_id: string
          total_cents: number
          updated_at: string
        }
        Insert: {
          buyer_answers?: Json
          buyer_email?: string | null
          buyer_name?: string | null
          created_at?: string
          event_id: string
          id?: string
          payment_status?: string
          quantity?: number
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          tier_id: string
          total_cents?: number
          updated_at?: string
        }
        Update: {
          buyer_answers?: Json
          buyer_email?: string | null
          buyer_name?: string | null
          created_at?: string
          event_id?: string
          id?: string
          payment_status?: string
          quantity?: number
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          tier_id?: string
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_ticket_purchases_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "public_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_ticket_purchases_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "event_ticket_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      event_ticket_tiers: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          event_id: string
          id: string
          max_quantity: number | null
          price_cents: number
          sold_quantity: number
          tier_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          event_id: string
          id?: string
          max_quantity?: number | null
          price_cents: number
          sold_quantity?: number
          tier_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          event_id?: string
          id?: string
          max_quantity?: number | null
          price_cents?: number
          sold_quantity?: number
          tier_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_ticket_tiers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "public_events"
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
      flight_payouts: {
        Row: {
          created_at: string
          display_order: number
          first_place_cents: number
          flight_name: string
          id: string
          league_event_id: string | null
          league_id: string | null
          player_count: number
          second_place_cents: number
          third_place_cents: number
          total_purse_cents: number
          tournament_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          first_place_cents?: number
          flight_name: string
          id?: string
          league_event_id?: string | null
          league_id?: string | null
          player_count?: number
          second_place_cents?: number
          third_place_cents?: number
          total_purse_cents?: number
          tournament_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          first_place_cents?: number
          flight_name?: string
          id?: string
          league_event_id?: string | null
          league_id?: string | null
          player_count?: number
          second_place_cents?: number
          third_place_cents?: number
          total_purse_cents?: number
          tournament_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flight_payouts_league_event_id_fkey"
            columns: ["league_event_id"]
            isOneToOne: false
            referencedRelation: "league_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_payouts_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "golf_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_payouts_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      flyer_templates: {
        Row: {
          canva_template_id: string | null
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          is_premium: boolean | null
          name: string
          preview_url: string | null
          size: string | null
          sort_order: number | null
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          canva_template_id?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_premium?: boolean | null
          name: string
          preview_url?: string | null
          size?: string | null
          sort_order?: number | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          canva_template_id?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_premium?: boolean | null
          name?: string
          preview_url?: string | null
          size?: string | null
          sort_order?: number | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      golf_courses: {
        Row: {
          course_address: string | null
          course_map_url: string | null
          course_rating: number
          course_website: string | null
          created_at: string
          hole_distances: Json | null
          hole_pars: Json | null
          id: string
          name: string
          par: number
          slope_rating: number
          stroke_indexes: number[] | null
          tee_name: string | null
          tournament_id: string
          updated_at: string
        }
        Insert: {
          course_address?: string | null
          course_map_url?: string | null
          course_rating?: number
          course_website?: string | null
          created_at?: string
          hole_distances?: Json | null
          hole_pars?: Json | null
          id?: string
          name: string
          par?: number
          slope_rating?: number
          stroke_indexes?: number[] | null
          tee_name?: string | null
          tournament_id: string
          updated_at?: string
        }
        Update: {
          course_address?: string | null
          course_map_url?: string | null
          course_rating?: number
          course_website?: string | null
          created_at?: string
          hole_distances?: Json | null
          hole_pars?: Json | null
          id?: string
          name?: string
          par?: number
          slope_rating?: number
          stroke_indexes?: number[] | null
          tee_name?: string | null
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "golf_courses_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      golf_leagues: {
        Row: {
          accent_color: string | null
          access_amount_cents: number | null
          access_paid_at: string | null
          access_status: string
          allow_search: boolean
          banner_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          event_confirmation_email_config: Json | null
          flight_based_on: string
          flight_method: string
          flights_enabled: boolean
          font_color: string | null
          id: string
          is_active: boolean
          is_public: boolean
          leaderboard_show_gross: boolean
          leaderboard_show_net: boolean
          league_name: string
          league_slug: string
          logo_url: string | null
          organization_id: string
          pass_platform_fee_to_members: boolean
          primary_color: string | null
          publish_status: string
          season_year: number | null
          show_register: boolean
          show_results: boolean
          show_schedule: boolean
          show_standings: boolean
          start_date: string | null
          tagline: string | null
          updated_at: string
          welcome_message: string | null
        }
        Insert: {
          accent_color?: string | null
          access_amount_cents?: number | null
          access_paid_at?: string | null
          access_status?: string
          allow_search?: boolean
          banner_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_confirmation_email_config?: Json | null
          flight_based_on?: string
          flight_method?: string
          flights_enabled?: boolean
          font_color?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          leaderboard_show_gross?: boolean
          leaderboard_show_net?: boolean
          league_name: string
          league_slug: string
          logo_url?: string | null
          organization_id: string
          pass_platform_fee_to_members?: boolean
          primary_color?: string | null
          publish_status?: string
          season_year?: number | null
          show_register?: boolean
          show_results?: boolean
          show_schedule?: boolean
          show_standings?: boolean
          start_date?: string | null
          tagline?: string | null
          updated_at?: string
          welcome_message?: string | null
        }
        Update: {
          accent_color?: string | null
          access_amount_cents?: number | null
          access_paid_at?: string | null
          access_status?: string
          allow_search?: boolean
          banner_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_confirmation_email_config?: Json | null
          flight_based_on?: string
          flight_method?: string
          flights_enabled?: boolean
          font_color?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          leaderboard_show_gross?: boolean
          leaderboard_show_net?: boolean
          league_name?: string
          league_slug?: string
          logo_url?: string | null
          organization_id?: string
          pass_platform_fee_to_members?: boolean
          primary_color?: string | null
          publish_status?: string
          season_year?: number | null
          show_register?: boolean
          show_results?: boolean
          show_schedule?: boolean
          show_standings?: boolean
          start_date?: string | null
          tagline?: string | null
          updated_at?: string
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "golf_leagues_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      golf_trips: {
        Row: {
          created_at: string
          description: string | null
          destination: string | null
          end_date: string
          id: string
          is_published: boolean
          organizer_id: string
          share_token: string | null
          start_date: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          destination?: string | null
          end_date: string
          id?: string
          is_published?: boolean
          organizer_id: string
          share_token?: string | null
          start_date: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          destination?: string | null
          end_date?: string
          id?: string
          is_published?: boolean
          organizer_id?: string
          share_token?: string | null
          start_date?: string
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
      leaderboard_gallery: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          is_hero: boolean
          sort_order: number
          tournament_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          is_hero?: boolean
          sort_order?: number
          tournament_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          is_hero?: boolean
          sort_order?: number
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_gallery_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_snapshots: {
        Row: {
          created_at: string
          id: string
          reset_by: string | null
          retrieved_at: string | null
          retrieved_by: string | null
          score_count: number
          snapshot_data: Json
          tournament_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          reset_by?: string | null
          retrieved_at?: string | null
          retrieved_by?: string | null
          score_count?: number
          snapshot_data?: Json
          tournament_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          reset_by?: string | null
          retrieved_at?: string | null
          retrieved_by?: string | null
          score_count?: number
          snapshot_data?: Json
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_snapshots_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      league_access_promo_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          notes: string | null
          times_used: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          notes?: string | null
          times_used?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          notes?: string | null
          times_used?: number
          updated_at?: string
        }
        Relationships: []
      }
      league_access_purchases: {
        Row: {
          amount_cents: number
          created_at: string
          created_by_admin: string | null
          discount_cents: number
          id: string
          invoice_notes: string | null
          invoice_paid_at: string | null
          invoice_status: string | null
          invoiced_at: string | null
          league_id: string | null
          organization_id: string
          payment_method: string
          promo_code: string | null
          purchased_by: string | null
          status: string
          stripe_payment_intent: string | null
          stripe_session_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          created_by_admin?: string | null
          discount_cents?: number
          id?: string
          invoice_notes?: string | null
          invoice_paid_at?: string | null
          invoice_status?: string | null
          invoiced_at?: string | null
          league_id?: string | null
          organization_id: string
          payment_method?: string
          promo_code?: string | null
          purchased_by?: string | null
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          created_by_admin?: string | null
          discount_cents?: number
          id?: string
          invoice_notes?: string | null
          invoice_paid_at?: string | null
          invoice_status?: string | null
          invoiced_at?: string | null
          league_id?: string | null
          organization_id?: string
          payment_method?: string
          promo_code?: string | null
          purchased_by?: string | null
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_access_purchases_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "golf_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_access_purchases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      league_courses: {
        Row: {
          course_name: string
          course_rating: number
          created_at: string
          hole_distances: Json | null
          hole_pars: Json | null
          hole_stroke_indexes: Json | null
          id: string
          league_id: string
          par_total: number
          slope_rating: number
          tee_name: string
          updated_at: string
        }
        Insert: {
          course_name: string
          course_rating?: number
          created_at?: string
          hole_distances?: Json | null
          hole_pars?: Json | null
          hole_stroke_indexes?: Json | null
          id?: string
          league_id: string
          par_total?: number
          slope_rating?: number
          tee_name?: string
          updated_at?: string
        }
        Update: {
          course_name?: string
          course_rating?: number
          created_at?: string
          hole_distances?: Json | null
          hole_pars?: Json | null
          hole_stroke_indexes?: Json | null
          id?: string
          league_id?: string
          par_total?: number
          slope_rating?: number
          tee_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_courses_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "golf_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      league_event_registrations: {
        Row: {
          added_by: string | null
          confirmation_email_sent_at: string | null
          created_at: string
          entry_type: string | null
          event_id: string
          fee_paid: boolean | null
          fee_tier_amount_cents: number | null
          fee_tier_id: string | null
          fee_tier_label: string | null
          id: string
          is_manual_entry: boolean | null
          manual_notes: string | null
          member_id: string
          paid_at: string | null
          pairing_group: number | null
          pairing_position: number | null
          registration_fee_paid: boolean
          status: string
          team_name: string | null
          tee_time: string | null
          waitlist_position: number | null
        }
        Insert: {
          added_by?: string | null
          confirmation_email_sent_at?: string | null
          created_at?: string
          entry_type?: string | null
          event_id: string
          fee_paid?: boolean | null
          fee_tier_amount_cents?: number | null
          fee_tier_id?: string | null
          fee_tier_label?: string | null
          id?: string
          is_manual_entry?: boolean | null
          manual_notes?: string | null
          member_id: string
          paid_at?: string | null
          pairing_group?: number | null
          pairing_position?: number | null
          registration_fee_paid?: boolean
          status?: string
          team_name?: string | null
          tee_time?: string | null
          waitlist_position?: number | null
        }
        Update: {
          added_by?: string | null
          confirmation_email_sent_at?: string | null
          created_at?: string
          entry_type?: string | null
          event_id?: string
          fee_paid?: boolean | null
          fee_tier_amount_cents?: number | null
          fee_tier_id?: string | null
          fee_tier_label?: string | null
          id?: string
          is_manual_entry?: boolean | null
          manual_notes?: string | null
          member_id?: string
          paid_at?: string | null
          pairing_group?: number | null
          pairing_position?: number | null
          registration_fee_paid?: boolean
          status?: string
          team_name?: string | null
          tee_time?: string | null
          waitlist_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "league_event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "league_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_event_registrations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "league_members"
            referencedColumns: ["id"]
          },
        ]
      }
      league_event_scores: {
        Row: {
          entered_at: string
          entered_by: string | null
          event_id: string
          gross_score: number | null
          hole_number: number
          id: string
          member_id: string
          net_score: number | null
          points_earned: number
        }
        Insert: {
          entered_at?: string
          entered_by?: string | null
          event_id: string
          gross_score?: number | null
          hole_number: number
          id?: string
          member_id: string
          net_score?: number | null
          points_earned?: number
        }
        Update: {
          entered_at?: string
          entered_by?: string | null
          event_id?: string
          gross_score?: number | null
          hole_number?: number
          id?: string
          member_id?: string
          net_score?: number | null
          points_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "league_event_scores_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "league_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_event_scores_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "league_members"
            referencedColumns: ["id"]
          },
        ]
      }
      league_events: {
        Row: {
          completed_at: string | null
          course_id: string | null
          course_name: string | null
          created_at: string
          end_date: string | null
          event_date: string
          event_name: string
          fee_tiers: Json
          flight_based_on: string
          flight_method: string
          flights_enabled: boolean
          format_type: string
          holes: number
          id: string
          is_completed: boolean
          league_course_id: string | null
          league_id: string
          max_players: number | null
          pass_platform_fee_to_player: boolean
          recurrence_rule: Json | null
          registration_deadline: string | null
          registration_fee_cents: number
          round_status: string
          season_id: string | null
          skins_carryover: boolean
          skins_enabled: boolean
          skins_mode: string
          skins_value_cents: number
          start_format: string
          start_time: string | null
          tee_interval_minutes: number
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          course_id?: string | null
          course_name?: string | null
          created_at?: string
          end_date?: string | null
          event_date: string
          event_name: string
          fee_tiers?: Json
          flight_based_on?: string
          flight_method?: string
          flights_enabled?: boolean
          format_type?: string
          holes?: number
          id?: string
          is_completed?: boolean
          league_course_id?: string | null
          league_id: string
          max_players?: number | null
          pass_platform_fee_to_player?: boolean
          recurrence_rule?: Json | null
          registration_deadline?: string | null
          registration_fee_cents?: number
          round_status?: string
          season_id?: string | null
          skins_carryover?: boolean
          skins_enabled?: boolean
          skins_mode?: string
          skins_value_cents?: number
          start_format?: string
          start_time?: string | null
          tee_interval_minutes?: number
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string | null
          course_name?: string | null
          created_at?: string
          end_date?: string | null
          event_date?: string
          event_name?: string
          fee_tiers?: Json
          flight_based_on?: string
          flight_method?: string
          flights_enabled?: boolean
          format_type?: string
          holes?: number
          id?: string
          is_completed?: boolean
          league_course_id?: string | null
          league_id?: string
          max_players?: number | null
          pass_platform_fee_to_player?: boolean
          recurrence_rule?: Json | null
          registration_deadline?: string | null
          registration_fee_cents?: number
          round_status?: string
          season_id?: string | null
          skins_carryover?: boolean
          skins_enabled?: boolean
          skins_mode?: string
          skins_value_cents?: number
          start_format?: string
          start_time?: string | null
          tee_interval_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "golf_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_events_league_course_id_fkey"
            columns: ["league_course_id"]
            isOneToOne: false
            referencedRelation: "league_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_events_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "golf_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_events_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "league_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      league_members: {
        Row: {
          avg_18_score: number | null
          avg_9_score: number | null
          course_handicap: number | null
          created_at: string
          email: string
          handicap_index: number | null
          handicap_updated_at: string | null
          id: string
          is_active: boolean
          join_date: string
          league_id: string
          member_name: string
          membership_fee_cents: number | null
          membership_fee_paid: boolean
          membership_status: string
          notes: string | null
          phone: string | null
          playing_handicap: number | null
          profile_image_url: string | null
          scoring_code: string | null
          shirt_size: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avg_18_score?: number | null
          avg_9_score?: number | null
          course_handicap?: number | null
          created_at?: string
          email: string
          handicap_index?: number | null
          handicap_updated_at?: string | null
          id?: string
          is_active?: boolean
          join_date?: string
          league_id: string
          member_name: string
          membership_fee_cents?: number | null
          membership_fee_paid?: boolean
          membership_status?: string
          notes?: string | null
          phone?: string | null
          playing_handicap?: number | null
          profile_image_url?: string | null
          scoring_code?: string | null
          shirt_size?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avg_18_score?: number | null
          avg_9_score?: number | null
          course_handicap?: number | null
          created_at?: string
          email?: string
          handicap_index?: number | null
          handicap_updated_at?: string | null
          id?: string
          is_active?: boolean
          join_date?: string
          league_id?: string
          member_name?: string
          membership_fee_cents?: number | null
          membership_fee_paid?: boolean
          membership_status?: string
          notes?: string | null
          phone?: string | null
          playing_handicap?: number | null
          profile_image_url?: string | null
          scoring_code?: string | null
          shirt_size?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "league_members_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "golf_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      league_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          league_id: string
          recipient_count: number | null
          sent_at: string
          sent_by: string | null
          subject: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          league_id: string
          recipient_count?: number | null
          sent_at?: string
          sent_by?: string | null
          subject: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          league_id?: string
          recipient_count?: number | null
          sent_at?: string
          sent_by?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_messages_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "golf_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      league_payments: {
        Row: {
          amount_cents: number
          created_at: string
          entry_source: string
          event_id: string | null
          gross_amount_cents: number | null
          id: string
          kind: string
          league_id: string
          member_id: string | null
          payer_email: string | null
          platform_fee_cents: number
          registration_id: string | null
          status: string
          stripe_account_id: string | null
          stripe_fee_cents: number
          stripe_payment_intent: string | null
          stripe_session_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          entry_source?: string
          event_id?: string | null
          gross_amount_cents?: number | null
          id?: string
          kind: string
          league_id: string
          member_id?: string | null
          payer_email?: string | null
          platform_fee_cents?: number
          registration_id?: string | null
          status?: string
          stripe_account_id?: string | null
          stripe_fee_cents?: number
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          entry_source?: string
          event_id?: string | null
          gross_amount_cents?: number | null
          id?: string
          kind?: string
          league_id?: string
          member_id?: string | null
          payer_email?: string | null
          platform_fee_cents?: number
          registration_id?: string | null
          status?: string
          stripe_account_id?: string | null
          stripe_fee_cents?: number
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "league_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_payments_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "golf_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_payments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "league_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_payments_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "league_event_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      league_point_systems: {
        Row: {
          created_at: string
          id: string
          league_id: string
          loss_points: number
          participation_points: number
          position_points: Json
          standings_mode: string
          tie_points: number
          updated_at: string
          win_points: number
        }
        Insert: {
          created_at?: string
          id?: string
          league_id: string
          loss_points?: number
          participation_points?: number
          position_points?: Json
          standings_mode?: string
          tie_points?: number
          updated_at?: string
          win_points?: number
        }
        Update: {
          created_at?: string
          id?: string
          league_id?: string
          loss_points?: number
          participation_points?: number
          position_points?: Json
          standings_mode?: string
          tie_points?: number
          updated_at?: string
          win_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "league_point_systems_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: true
            referencedRelation: "golf_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      league_registration_forms: {
        Row: {
          created_at: string
          custom_fields: Json
          id: string
          intro_text: string | null
          is_free: boolean
          is_open: boolean
          league_fee_cents: number
          league_id: string
          pass_platform_fee_to_player: boolean
          promo_code_enabled: boolean
          terms_text: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_fields?: Json
          id?: string
          intro_text?: string | null
          is_free?: boolean
          is_open?: boolean
          league_fee_cents?: number
          league_id: string
          pass_platform_fee_to_player?: boolean
          promo_code_enabled?: boolean
          terms_text?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_fields?: Json
          id?: string
          intro_text?: string | null
          is_free?: boolean
          is_open?: boolean
          league_fee_cents?: number
          league_id?: string
          pass_platform_fee_to_player?: boolean
          promo_code_enabled?: boolean
          terms_text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_registration_forms_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: true
            referencedRelation: "golf_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      league_registration_promo_codes: {
        Row: {
          code: string
          created_at: string
          discount_cents: number | null
          discount_percent: number | null
          id: string
          is_active: boolean
          league_id: string
          max_uses: number | null
          times_used: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          discount_cents?: number | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean
          league_id: string
          max_uses?: number | null
          times_used?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          discount_cents?: number | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean
          league_id?: string
          max_uses?: number | null
          times_used?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_registration_promo_codes_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "golf_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      league_registration_responses: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          league_id: string
          member_id: string | null
          paid_at: string | null
          payment_status: string
          promo_code: string | null
          response_data: Json
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          id?: string
          league_id: string
          member_id?: string | null
          paid_at?: string | null
          payment_status?: string
          promo_code?: string | null
          response_data?: Json
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          league_id?: string
          member_id?: string | null
          paid_at?: string | null
          payment_status?: string
          promo_code?: string | null
          response_data?: Json
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "league_registration_responses_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "golf_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_registration_responses_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "league_members"
            referencedColumns: ["id"]
          },
        ]
      }
      league_seasons: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          is_current: boolean
          league_id: string
          season_name: string
          start_date: string | null
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_current?: boolean
          league_id: string
          season_name: string
          start_date?: string | null
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_current?: boolean
          league_id?: string
          season_name?: string
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "league_seasons_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "golf_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      league_skins: {
        Row: {
          created_at: string
          event_id: string
          hole_number: number
          id: string
          is_gross: boolean
          skin_amount_cents: number | null
          winner_member_id: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          hole_number: number
          id?: string
          is_gross?: boolean
          skin_amount_cents?: number | null
          winner_member_id?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          hole_number?: number
          id?: string
          is_gross?: boolean
          skin_amount_cents?: number | null
          winner_member_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "league_skins_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "league_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_skins_winner_member_id_fkey"
            columns: ["winner_member_id"]
            isOneToOne: false
            referencedRelation: "league_members"
            referencedColumns: ["id"]
          },
        ]
      }
      league_standings: {
        Row: {
          handicap_differential: number | null
          id: string
          league_id: string
          losses: number
          matches_played: number
          member_id: string
          points: number
          prize_money_cents: number
          season_id: string | null
          ties: number
          total_gross: number
          total_net: number
          updated_at: string
          wins: number
          wins_override: number | null
        }
        Insert: {
          handicap_differential?: number | null
          id?: string
          league_id: string
          losses?: number
          matches_played?: number
          member_id: string
          points?: number
          prize_money_cents?: number
          season_id?: string | null
          ties?: number
          total_gross?: number
          total_net?: number
          updated_at?: string
          wins?: number
          wins_override?: number | null
        }
        Update: {
          handicap_differential?: number | null
          id?: string
          league_id?: string
          losses?: number
          matches_played?: number
          member_id?: string
          points?: number
          prize_money_cents?: number
          season_id?: string | null
          ties?: number
          total_gross?: number
          total_net?: number
          updated_at?: string
          wins?: number
          wins_override?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "league_standings_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "golf_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_standings_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "league_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_standings_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "league_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      league_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          created_by: string | null
          current_golfers: number
          current_period_end: string | null
          current_period_start: string | null
          flat_fee_price_cents: number
          id: string
          max_golfers: number
          organization_id: string
          per_golfer_price_cents: number
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          subscription_type: string
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          created_by?: string | null
          current_golfers?: number
          current_period_end?: string | null
          current_period_start?: string | null
          flat_fee_price_cents?: number
          id?: string
          max_golfers?: number
          organization_id: string
          per_golfer_price_cents?: number
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          subscription_type: string
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          created_by?: string | null
          current_golfers?: number
          current_period_end?: string | null
          current_period_start?: string | null
          flat_fee_price_cents?: number
          id?: string
          max_golfers?: number
          organization_id?: string
          per_golfer_price_cents?: number
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          subscription_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      league_team_pairings: {
        Row: {
          created_at: string
          event_id: string
          holes: number
          id: string
          league_id: string
          player1_id: string | null
          player2_id: string | null
          scoring_code: string
          team_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          holes?: number
          id?: string
          league_id: string
          player1_id?: string | null
          player2_id?: string | null
          scoring_code: string
          team_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          holes?: number
          id?: string
          league_id?: string
          player1_id?: string | null
          player2_id?: string | null
          scoring_code?: string
          team_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_team_pairings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "league_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_team_pairings_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "golf_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_team_pairings_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "league_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_team_pairings_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "league_members"
            referencedColumns: ["id"]
          },
        ]
      }
      league_team_scores: {
        Row: {
          created_at: string
          event_id: string
          gross_score: number | null
          hole_number: number
          id: string
          net_score: number | null
          pairing_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          gross_score?: number | null
          hole_number: number
          id?: string
          net_score?: number | null
          pairing_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          gross_score?: number | null
          hole_number?: number
          id?: string
          net_score?: number | null
          pairing_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_team_scores_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "league_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_team_scores_pairing_id_fkey"
            columns: ["pairing_id"]
            isOneToOne: false
            referencedRelation: "league_team_pairings"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_entry_fees: {
        Row: {
          amount_cents: number
          created_at: string
          created_by: string | null
          entity_id: string | null
          entity_type: string
          fee_cents: number
          fee_payment_method: string
          id: string
          paid: boolean
          paid_at: string | null
          platform_transaction_id: string | null
          stripe_charge_id: string | null
          tournament_id: string
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          created_by?: string | null
          entity_id?: string | null
          entity_type: string
          fee_cents?: number
          fee_payment_method?: string
          id?: string
          paid?: boolean
          paid_at?: string | null
          platform_transaction_id?: string | null
          stripe_charge_id?: string | null
          tournament_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          created_by?: string | null
          entity_id?: string | null
          entity_type?: string
          fee_cents?: number
          fee_payment_method?: string
          id?: string
          paid?: boolean
          paid_at?: string | null
          platform_transaction_id?: string | null
          stripe_charge_id?: string | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_entry_fees_platform_transaction_id_fkey"
            columns: ["platform_transaction_id"]
            isOneToOne: false
            referencedRelation: "platform_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_entry_fees_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_entry_grants: {
        Row: {
          additional_entries: number
          created_at: string
          granted_by: string | null
          id: string
          reason: string | null
          tournament_id: string
        }
        Insert: {
          additional_entries: number
          created_at?: string
          granted_by?: string | null
          id?: string
          reason?: string | null
          tournament_id: string
        }
        Update: {
          additional_entries?: number
          created_at?: string
          granted_by?: string | null
          id?: string
          reason?: string | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_entry_grants_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_payouts: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          mailing_address: string | null
          method: string
          notes: string | null
          organization_id: string
          paypal_email: string | null
          processed_at: string | null
          requested_at: string
          status: string
          tournament_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          mailing_address?: string | null
          method: string
          notes?: string | null
          organization_id: string
          paypal_email?: string | null
          processed_at?: string | null
          requested_at?: string
          status?: string
          tournament_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          mailing_address?: string | null
          method?: string
          notes?: string | null
          organization_id?: string
          paypal_email?: string | null
          processed_at?: string | null
          requested_at?: string
          status?: string
          tournament_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manual_payouts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_payouts_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      media_clips: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          is_published: boolean
          thumbnail_url: string | null
          title: string
          tournament_id: string
          updated_at: string
          video_url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_published?: boolean
          thumbnail_url?: string | null
          title: string
          tournament_id: string
          updated_at?: string
          video_url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_published?: boolean
          thumbnail_url?: string | null
          title?: string
          tournament_id?: string
          updated_at?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_clips_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
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
          notify_auction_win: boolean
          notify_donation: boolean
          notify_refund_request: boolean
          notify_registration: boolean
          notify_sponsorship: boolean
          notify_store_purchase: boolean
          notify_vendor_registration: boolean
          organization_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          notify_auction_bid?: boolean
          notify_auction_win?: boolean
          notify_donation?: boolean
          notify_refund_request?: boolean
          notify_registration?: boolean
          notify_sponsorship?: boolean
          notify_store_purchase?: boolean
          notify_vendor_registration?: boolean
          organization_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          notify_auction_bid?: boolean
          notify_auction_win?: boolean
          notify_donation?: boolean
          notify_refund_request?: boolean
          notify_registration?: boolean
          notify_sponsorship?: boolean
          notify_store_purchase?: boolean
          notify_vendor_registration?: boolean
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
          name: string | null
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
          name?: string | null
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
          name?: string | null
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
      org_login_events: {
        Row: {
          id: string
          occurred_at: string
          organization_id: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          occurred_at?: string
          organization_id: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          occurred_at?: string
          organization_id?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      org_members: {
        Row: {
          created_at: string
          id: string
          name: string | null
          organization_id: string
          permissions: Database["public"]["Enums"]["org_permission"][]
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          organization_id: string
          permissions?: Database["public"]["Enums"]["org_permission"][]
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
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
          bank_change_confirmed_at: string | null
          bank_change_expires_at: string | null
          bank_change_requested_at: string | null
          bank_change_status: string
          bank_change_token: string | null
          bank_name: string | null
          change_request_status: string | null
          change_requested_at: string | null
          connection_notified_at: string | null
          created_at: string
          id: string
          is_verified: boolean
          method_type: string
          organization_id: string
          paypal_email: string | null
          pending_bank_brand: string | null
          pending_bank_last4: string | null
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
          bank_change_confirmed_at?: string | null
          bank_change_expires_at?: string | null
          bank_change_requested_at?: string | null
          bank_change_status?: string
          bank_change_token?: string | null
          bank_name?: string | null
          change_request_status?: string | null
          change_requested_at?: string | null
          connection_notified_at?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean
          method_type?: string
          organization_id: string
          paypal_email?: string | null
          pending_bank_brand?: string | null
          pending_bank_last4?: string | null
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
          bank_change_confirmed_at?: string | null
          bank_change_expires_at?: string | null
          bank_change_requested_at?: string | null
          bank_change_status?: string
          bank_change_token?: string | null
          bank_name?: string | null
          change_request_status?: string | null
          change_requested_at?: string | null
          connection_notified_at?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean
          method_type?: string
          organization_id?: string
          paypal_email?: string | null
          pending_bank_brand?: string | null
          pending_bank_last4?: string | null
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
          league_subscription_active: boolean | null
          league_subscription_ends_at: string | null
          league_subscription_started_at: string | null
          league_subscription_status: string | null
          league_subscription_stripe_id: string | null
          logo_url: string | null
          mailing_address: string | null
          name: string
          nonprofit_name: string | null
          nonprofit_verified: boolean
          payout_method: string | null
          plan: string
          platform_fee_rate: number | null
          primary_color: string | null
          secondary_color: string | null
          status: string
          stripe_account_id: string | null
          subdomain: string | null
          updated_at: string
          workspace_type: string
        }
        Insert: {
          created_at?: string
          dashboard_name?: string | null
          ein?: string | null
          feature_overrides?: Json | null
          fee_override?: number | null
          id?: string
          is_nonprofit?: boolean
          league_subscription_active?: boolean | null
          league_subscription_ends_at?: string | null
          league_subscription_started_at?: string | null
          league_subscription_status?: string | null
          league_subscription_stripe_id?: string | null
          logo_url?: string | null
          mailing_address?: string | null
          name: string
          nonprofit_name?: string | null
          nonprofit_verified?: boolean
          payout_method?: string | null
          plan?: string
          platform_fee_rate?: number | null
          primary_color?: string | null
          secondary_color?: string | null
          status?: string
          stripe_account_id?: string | null
          subdomain?: string | null
          updated_at?: string
          workspace_type?: string
        }
        Update: {
          created_at?: string
          dashboard_name?: string | null
          ein?: string | null
          feature_overrides?: Json | null
          fee_override?: number | null
          id?: string
          is_nonprofit?: boolean
          league_subscription_active?: boolean | null
          league_subscription_ends_at?: string | null
          league_subscription_started_at?: string | null
          league_subscription_status?: string | null
          league_subscription_stripe_id?: string | null
          logo_url?: string | null
          mailing_address?: string | null
          name?: string
          nonprofit_name?: string | null
          nonprofit_verified?: boolean
          payout_method?: string | null
          plan?: string
          platform_fee_rate?: number | null
          primary_color?: string | null
          secondary_color?: string | null
          status?: string
          stripe_account_id?: string | null
          subdomain?: string | null
          updated_at?: string
          workspace_type?: string
        }
        Relationships: []
      }
      organizer_messages: {
        Row: {
          created_at: string
          direction: string
          id: string
          message: string
          organization_id: string
          parent_message_id: string | null
          read_at: string | null
          sender_user_id: string | null
          status: string
          subject: string
        }
        Insert: {
          created_at?: string
          direction?: string
          id?: string
          message: string
          organization_id: string
          parent_message_id?: string | null
          read_at?: string | null
          sender_user_id?: string | null
          status?: string
          subject: string
        }
        Update: {
          created_at?: string
          direction?: string
          id?: string
          message?: string
          organization_id?: string
          parent_message_id?: string | null
          read_at?: string | null
          sender_user_id?: string | null
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizer_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizer_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "organizer_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      organizer_notes: {
        Row: {
          category: string
          content: string | null
          created_at: string
          due_date: string | null
          id: string
          is_completed: boolean
          priority: string
          reminder_enabled: boolean
          reminder_sent: boolean
          title: string
          tournament_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          content?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          is_completed?: boolean
          priority?: string
          reminder_enabled?: boolean
          reminder_sent?: boolean
          title: string
          tournament_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          is_completed?: boolean
          priority?: string
          reminder_enabled?: boolean
          reminder_sent?: boolean
          title?: string
          tournament_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizer_notes_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      organizer_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          metadata: Json
          organization_id: string
          severity: string
          title: string
          tournament_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          metadata?: Json
          organization_id: string
          severity?: string
          title: string
          tournament_id?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          metadata?: Json
          organization_id?: string
          severity?: string
          title?: string
          tournament_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizer_notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_campaigns: {
        Row: {
          created_at: string
          delay_days: number
          email1_body: string | null
          email1_subject: string | null
          email2_body: string | null
          email2_subject: string | null
          email3_body: string | null
          email3_subject: string | null
          id: string
          is_default: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delay_days?: number
          email1_body?: string | null
          email1_subject?: string | null
          email2_body?: string | null
          email2_subject?: string | null
          email3_body?: string | null
          email3_subject?: string | null
          id?: string
          is_default?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delay_days?: number
          email1_body?: string | null
          email1_subject?: string | null
          email2_body?: string | null
          email2_subject?: string | null
          email3_body?: string | null
          email3_subject?: string | null
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      outreach_leads: {
        Row: {
          converted_at: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          notes: string | null
          source: string | null
          status: string
          tournament_name: string | null
          unsubscribed_at: string | null
          updated_at: string
        }
        Insert: {
          converted_at?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          notes?: string | null
          source?: string | null
          status?: string
          tournament_name?: string | null
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Update: {
          converted_at?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          notes?: string | null
          source?: string | null
          status?: string
          tournament_name?: string | null
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      outreach_logs: {
        Row: {
          email_type: string
          id: string
          prospect_email: string
          prospect_name: string | null
          sample_id: string | null
          sent_at: string
          sent_by: string | null
          subject: string | null
          template_key: string | null
        }
        Insert: {
          email_type: string
          id?: string
          prospect_email: string
          prospect_name?: string | null
          sample_id?: string | null
          sent_at?: string
          sent_by?: string | null
          subject?: string | null
          template_key?: string | null
        }
        Update: {
          email_type?: string
          id?: string
          prospect_email?: string
          prospect_name?: string | null
          sample_id?: string | null
          sent_at?: string
          sent_by?: string | null
          subject?: string | null
          template_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_logs_sample_id_fkey"
            columns: ["sample_id"]
            isOneToOne: false
            referencedRelation: "sample_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_queue: {
        Row: {
          campaign_id: string
          click_url: string | null
          clicked_at: string | null
          created_at: string
          email_number: number
          error: string | null
          id: string
          lead_id: string
          opened_at: string | null
          scheduled_for: string
          sent_at: string | null
        }
        Insert: {
          campaign_id: string
          click_url?: string | null
          clicked_at?: string | null
          created_at?: string
          email_number: number
          error?: string | null
          id?: string
          lead_id: string
          opened_at?: string | null
          scheduled_for?: string
          sent_at?: string | null
        }
        Update: {
          campaign_id?: string
          click_url?: string | null
          clicked_at?: string | null
          created_at?: string
          email_number?: number
          error?: string | null
          id?: string
          lead_id?: string
          opened_at?: string | null
          scheduled_for?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "outreach_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_queue_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "outreach_leads"
            referencedColumns: ["id"]
          },
        ]
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
      pairings_templates: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          slots: Json
          start_type: string
          template_name: string
          tournament_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          slots?: Json
          start_type?: string
          template_name: string
          tournament_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          slots?: Json
          start_type?: string
          template_name?: string
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pairings_templates_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_routing_logs: {
        Row: {
          application_fee_cents: number
          buyer_email: string | null
          context: string
          created_at: string
          gross_cents: number
          id: string
          notes: string | null
          organization_id: string | null
          organizer_charges_ready: boolean
          organizer_stripe_account_id: string | null
          pass_fees_to_participants: boolean | null
          payment_method_override: string
          platform_fee_cents: number
          routing_decision: string
          stripe_fee_cents: number
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          tournament_id: string | null
        }
        Insert: {
          application_fee_cents?: number
          buyer_email?: string | null
          context: string
          created_at?: string
          gross_cents?: number
          id?: string
          notes?: string | null
          organization_id?: string | null
          organizer_charges_ready?: boolean
          organizer_stripe_account_id?: string | null
          pass_fees_to_participants?: boolean | null
          payment_method_override?: string
          platform_fee_cents?: number
          routing_decision: string
          stripe_fee_cents?: number
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          tournament_id?: string | null
        }
        Update: {
          application_fee_cents?: number
          buyer_email?: string | null
          context?: string
          created_at?: string
          gross_cents?: number
          id?: string
          notes?: string | null
          organization_id?: string | null
          organizer_charges_ready?: boolean
          organizer_stripe_account_id?: string | null
          pass_fees_to_participants?: boolean | null
          payment_method_override?: string
          platform_fee_cents?: number
          routing_decision?: string
          stripe_fee_cents?: number
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          tournament_id?: string | null
        }
        Relationships: []
      }
      payment_routing_verification_findings: {
        Row: {
          actual_application_fee_cents: number | null
          actual_destination: string | null
          amount_cents: number | null
          context: string | null
          created_at: string
          detail: string | null
          expected_application_fee_cents: number | null
          expected_destination: string | null
          id: string
          organization_id: string | null
          status: string
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          tournament_id: string | null
          verification_id: string
        }
        Insert: {
          actual_application_fee_cents?: number | null
          actual_destination?: string | null
          amount_cents?: number | null
          context?: string | null
          created_at?: string
          detail?: string | null
          expected_application_fee_cents?: number | null
          expected_destination?: string | null
          id?: string
          organization_id?: string | null
          status: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          tournament_id?: string | null
          verification_id: string
        }
        Update: {
          actual_application_fee_cents?: number | null
          actual_destination?: string | null
          amount_cents?: number | null
          context?: string | null
          created_at?: string
          detail?: string | null
          expected_application_fee_cents?: number | null
          expected_destination?: string | null
          id?: string
          organization_id?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          tournament_id?: string | null
          verification_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_routing_verification_findings_verification_id_fkey"
            columns: ["verification_id"]
            isOneToOne: false
            referencedRelation: "payment_routing_verifications"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_routing_verifications: {
        Row: {
          completed_at: string | null
          error: string | null
          error_count: number
          fee_mismatch_count: number
          id: string
          misrouted_count: number
          ok_count: number
          started_at: string
          status: string
          total_payments: number
          window_end: string
          window_start: string
        }
        Insert: {
          completed_at?: string | null
          error?: string | null
          error_count?: number
          fee_mismatch_count?: number
          id?: string
          misrouted_count?: number
          ok_count?: number
          started_at?: string
          status?: string
          total_payments?: number
          window_end: string
          window_start: string
        }
        Update: {
          completed_at?: string | null
          error?: string | null
          error_count?: number
          fee_mismatch_count?: number
          id?: string
          misrouted_count?: number
          ok_count?: number
          started_at?: string
          status?: string
          total_payments?: number
          window_end?: string
          window_start?: string
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
          account_holder_name: string | null
          admin_toggle_granted: boolean | null
          change_type: string
          confirmed_at: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          mailing_address: string | null
          new_account_last4: string | null
          new_routing_last4: string | null
          new_value: string | null
          old_value: string | null
          organization_id: string
          paypal_email: string | null
          requested_by: string
          requested_method: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          token: string | null
        }
        Insert: {
          account_holder_name?: string | null
          admin_toggle_granted?: boolean | null
          change_type: string
          confirmed_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          mailing_address?: string | null
          new_account_last4?: string | null
          new_routing_last4?: string | null
          new_value?: string | null
          old_value?: string | null
          organization_id: string
          paypal_email?: string | null
          requested_by: string
          requested_method?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          token?: string | null
        }
        Update: {
          account_holder_name?: string | null
          admin_toggle_granted?: boolean | null
          change_type?: string
          confirmed_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          mailing_address?: string | null
          new_account_last4?: string | null
          new_routing_last4?: string | null
          new_value?: string | null
          old_value?: string | null
          organization_id?: string
          paypal_email?: string | null
          requested_by?: string
          requested_method?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          token?: string | null
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
      payout_notes: {
        Row: {
          created_at: string
          created_by: string
          id: string
          note: string
          source: string
          transaction_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          note: string
          source?: string
          transaction_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          note?: string
          source?: string
          transaction_id?: string
        }
        Relationships: []
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
      pin_placements: {
        Row: {
          created_at: string
          depth_position: string | null
          distance_from_front: number | null
          distance_from_left: number | null
          hole_number: number
          id: string
          notes: string | null
          side_position: string | null
          tournament_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          depth_position?: string | null
          distance_from_front?: number | null
          distance_from_left?: number | null
          hole_number: number
          id?: string
          notes?: string | null
          side_position?: string | null
          tournament_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          depth_position?: string | null
          distance_from_front?: number | null
          distance_from_left?: number | null
          hole_number?: number
          id?: string
          notes?: string | null
          side_position?: string | null
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pin_placements_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          description: string | null
          is_public: boolean
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          is_public?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          description?: string | null
          is_public?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
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
      platform_transactions: {
        Row: {
          amount_cents: number
          created_at: string
          description: string | null
          failure_reason: string | null
          golfer_email: string | null
          golfer_name: string | null
          id: string
          manual_entry_fee_amount_cents: number | null
          manual_entry_fee_liability: boolean
          manual_entry_fee_settled: boolean
          manual_entry_fee_settled_at: string | null
          metadata: Json | null
          net_amount_cents: number
          organization_id: string
          payout_id: string | null
          payout_method: string | null
          platform_fee_cents: number
          registration_id: string | null
          status: string
          stripe_fee_cents: number
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
          failure_reason?: string | null
          golfer_email?: string | null
          golfer_name?: string | null
          id?: string
          manual_entry_fee_amount_cents?: number | null
          manual_entry_fee_liability?: boolean
          manual_entry_fee_settled?: boolean
          manual_entry_fee_settled_at?: string | null
          metadata?: Json | null
          net_amount_cents?: number
          organization_id: string
          payout_id?: string | null
          payout_method?: string | null
          platform_fee_cents?: number
          registration_id?: string | null
          status?: string
          stripe_fee_cents?: number
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
          failure_reason?: string | null
          golfer_email?: string | null
          golfer_name?: string | null
          id?: string
          manual_entry_fee_amount_cents?: number | null
          manual_entry_fee_liability?: boolean
          manual_entry_fee_settled?: boolean
          manual_entry_fee_settled_at?: string | null
          metadata?: Json | null
          net_amount_cents?: number
          organization_id?: string
          payout_id?: string | null
          payout_method?: string | null
          platform_fee_cents?: number
          registration_id?: string | null
          status?: string
          stripe_fee_cents?: number
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
      promoter_incentives: {
        Row: {
          awarded_at: string | null
          awarded_to: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          reward_type: string | null
          reward_value: string | null
          threshold_rank: number | null
          threshold_registrations: number | null
          threshold_revenue_cents: number | null
          tournament_id: string
          updated_at: string
        }
        Insert: {
          awarded_at?: string | null
          awarded_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          reward_type?: string | null
          reward_value?: string | null
          threshold_rank?: number | null
          threshold_registrations?: number | null
          threshold_revenue_cents?: number | null
          tournament_id: string
          updated_at?: string
        }
        Update: {
          awarded_at?: string | null
          awarded_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          reward_type?: string | null
          reward_value?: string | null
          threshold_rank?: number | null
          threshold_registrations?: number | null
          threshold_revenue_cents?: number | null
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promoter_incentives_awarded_to_fkey"
            columns: ["awarded_to"]
            isOneToOne: false
            referencedRelation: "team_promoters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promoter_incentives_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
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
      public_events: {
        Row: {
          address: string | null
          confirmation_email_body: string | null
          confirmation_email_subject: string | null
          created_at: string
          created_by: string | null
          description_html: string | null
          event_date: string
          event_slug: string
          event_time: string | null
          event_title: string
          featured: boolean
          hero_image_url: string | null
          id: string
          location: string | null
          photos: Json
          purchase_questions: Json
          schedule_html: string | null
          sponsors: Json
          status: string
          tournament_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          confirmation_email_body?: string | null
          confirmation_email_subject?: string | null
          created_at?: string
          created_by?: string | null
          description_html?: string | null
          event_date: string
          event_slug: string
          event_time?: string | null
          event_title: string
          featured?: boolean
          hero_image_url?: string | null
          id?: string
          location?: string | null
          photos?: Json
          purchase_questions?: Json
          schedule_html?: string | null
          sponsors?: Json
          status?: string
          tournament_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          confirmation_email_body?: string | null
          confirmation_email_subject?: string | null
          created_at?: string
          created_by?: string | null
          description_html?: string | null
          event_date?: string
          event_slug?: string
          event_time?: string | null
          event_title?: string
          featured?: boolean
          hero_image_url?: string | null
          id?: string
          location?: string | null
          photos?: Json
          purchase_questions?: Json
          schedule_html?: string | null
          sponsors?: Json
          status?: string
          tournament_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_events_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      raffle_tickets: {
        Row: {
          buyer_email: string
          buyer_name: string
          buyer_phone: string | null
          created_at: string
          id: string
          raffle_id: string
          stripe_session_id: string | null
          ticket_number: number
        }
        Insert: {
          buyer_email: string
          buyer_name: string
          buyer_phone?: string | null
          created_at?: string
          id?: string
          raffle_id: string
          stripe_session_id?: string | null
          ticket_number: number
        }
        Update: {
          buyer_email?: string
          buyer_name?: string
          buyer_phone?: string | null
          created_at?: string
          id?: string
          raffle_id?: string
          stripe_session_id?: string | null
          ticket_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "raffle_tickets_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      raffles: {
        Row: {
          created_at: string
          description: string | null
          draw_time: string | null
          id: string
          images: string[]
          item_name: string
          max_tickets: number | null
          status: string
          ticket_price_cents: number
          tickets_sold: number
          tournament_id: string
          updated_at: string
          winner_email: string | null
          winner_name: string | null
          winner_notified_at: string | null
          winner_ticket_number: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          draw_time?: string | null
          id?: string
          images?: string[]
          item_name: string
          max_tickets?: number | null
          status?: string
          ticket_price_cents: number
          tickets_sold?: number
          tournament_id: string
          updated_at?: string
          winner_email?: string | null
          winner_name?: string | null
          winner_notified_at?: string | null
          winner_ticket_number?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          draw_time?: string | null
          id?: string
          images?: string[]
          item_name?: string
          max_tickets?: number | null
          status?: string
          ticket_price_cents?: number
          tickets_sold?: number
          tournament_id?: string
          updated_at?: string
          winner_email?: string | null
          winner_name?: string | null
          winner_notified_at?: string | null
          winner_ticket_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "raffles_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_clicks: {
        Row: {
          clicked_at: string
          id: string
          ip_address: string | null
          promoter_id: string
          user_agent: string | null
        }
        Insert: {
          clicked_at?: string
          id?: string
          ip_address?: string | null
          promoter_id: string
          user_agent?: string | null
        }
        Update: {
          clicked_at?: string
          id?: string
          ip_address?: string | null
          promoter_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_clicks_promoter_id_fkey"
            columns: ["promoter_id"]
            isOneToOne: false
            referencedRelation: "team_promoters"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_groups: {
        Row: {
          cart_sign_names: Json | null
          created_at: string
          group_name: string | null
          group_number: number | null
          id: string
          team_name: string | null
          tee_time: string | null
          tee_times: Json
          tournament_id: string
          updated_at: string
        }
        Insert: {
          cart_sign_names?: Json | null
          created_at?: string
          group_name?: string | null
          group_number?: number | null
          id?: string
          team_name?: string | null
          tee_time?: string | null
          tee_times?: Json
          tournament_id: string
          updated_at?: string
        }
        Update: {
          cart_sign_names?: Json | null
          created_at?: string
          group_name?: string | null
          group_number?: number | null
          id?: string
          team_name?: string | null
          tee_time?: string | null
          tee_times?: Json
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registration_groups_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
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
      sales_leads: {
        Row: {
          calendly_link: string | null
          contact_email: string | null
          contact_social_handle: string | null
          created_at: string
          created_by: string | null
          demo_booked_at: string | null
          detected_setup: string | null
          event_date: string | null
          extracted_data: Json | null
          flyer_image_url: string | null
          generated_message: string | null
          id: string
          location: string | null
          message_sent_at: string | null
          notes: string | null
          organizer_name: string | null
          payment_keywords: string[] | null
          replied_at: string | null
          reply_text: string | null
          source: string
          source_type: string | null
          source_url: string | null
          status: string
          tournament_name: string | null
          updated_at: string
        }
        Insert: {
          calendly_link?: string | null
          contact_email?: string | null
          contact_social_handle?: string | null
          created_at?: string
          created_by?: string | null
          demo_booked_at?: string | null
          detected_setup?: string | null
          event_date?: string | null
          extracted_data?: Json | null
          flyer_image_url?: string | null
          generated_message?: string | null
          id?: string
          location?: string | null
          message_sent_at?: string | null
          notes?: string | null
          organizer_name?: string | null
          payment_keywords?: string[] | null
          replied_at?: string | null
          reply_text?: string | null
          source?: string
          source_type?: string | null
          source_url?: string | null
          status?: string
          tournament_name?: string | null
          updated_at?: string
        }
        Update: {
          calendly_link?: string | null
          contact_email?: string | null
          contact_social_handle?: string | null
          created_at?: string
          created_by?: string | null
          demo_booked_at?: string | null
          detected_setup?: string | null
          event_date?: string | null
          extracted_data?: Json | null
          flyer_image_url?: string | null
          generated_message?: string | null
          id?: string
          location?: string | null
          message_sent_at?: string | null
          notes?: string | null
          organizer_name?: string | null
          payment_keywords?: string[] | null
          replied_at?: string | null
          reply_text?: string | null
          source?: string
          source_type?: string | null
          source_url?: string | null
          status?: string
          tournament_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sample_leaderboard: {
        Row: {
          created_at: string
          gross_score: number | null
          id: string
          net_score: number | null
          player_name: string
          position: number | null
          sample_tournament_id: string
          thru: number | null
        }
        Insert: {
          created_at?: string
          gross_score?: number | null
          id?: string
          net_score?: number | null
          player_name: string
          position?: number | null
          sample_tournament_id: string
          thru?: number | null
        }
        Update: {
          created_at?: string
          gross_score?: number | null
          id?: string
          net_score?: number | null
          player_name?: string
          position?: number | null
          sample_tournament_id?: string
          thru?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sample_leaderboard_sample_tournament_id_fkey"
            columns: ["sample_tournament_id"]
            isOneToOne: false
            referencedRelation: "sample_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      sample_outreach_log: {
        Row: {
          action: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          sample_tournament_id: string
        }
        Insert: {
          action: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          sample_tournament_id: string
        }
        Update: {
          action?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          sample_tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sample_outreach_log_sample_tournament_id_fkey"
            columns: ["sample_tournament_id"]
            isOneToOne: false
            referencedRelation: "sample_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      sample_participants: {
        Row: {
          created_at: string
          email: string | null
          handicap: number | null
          id: string
          name: string
          sample_tournament_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          handicap?: number | null
          id?: string
          name: string
          sample_tournament_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          handicap?: number | null
          id?: string
          name?: string
          sample_tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sample_participants_sample_tournament_id_fkey"
            columns: ["sample_tournament_id"]
            isOneToOne: false
            referencedRelation: "sample_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      sample_sponsors: {
        Row: {
          created_at: string
          id: string
          level: string | null
          logo_color: string | null
          logo_url: string | null
          name: string
          sample_tournament_id: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          level?: string | null
          logo_color?: string | null
          logo_url?: string | null
          name: string
          sample_tournament_id: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          level?: string | null
          logo_color?: string | null
          logo_url?: string | null
          name?: string
          sample_tournament_id?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sample_sponsors_sample_tournament_id_fkey"
            columns: ["sample_tournament_id"]
            isOneToOne: false
            referencedRelation: "sample_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      sample_tournaments: {
        Row: {
          admin_id: string | null
          created_at: string
          crm_notes: string | null
          crm_status: string | null
          description: string | null
          event_date: string | null
          hero_image_url: string | null
          id: string
          last_accessed_at: string | null
          last_contacted_at: string | null
          location: string | null
          logo_url: string | null
          prospect_company: string | null
          prospect_email: string | null
          prospect_name: string | null
          prospect_source: string | null
          registration_fee_cents: number | null
          scoring_format: string | null
          team_fee_cents: number | null
          tournament_name: string
          unique_slug: string
          updated_at: string
          view_count: number
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          crm_notes?: string | null
          crm_status?: string | null
          description?: string | null
          event_date?: string | null
          hero_image_url?: string | null
          id?: string
          last_accessed_at?: string | null
          last_contacted_at?: string | null
          location?: string | null
          logo_url?: string | null
          prospect_company?: string | null
          prospect_email?: string | null
          prospect_name?: string | null
          prospect_source?: string | null
          registration_fee_cents?: number | null
          scoring_format?: string | null
          team_fee_cents?: number | null
          tournament_name: string
          unique_slug: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          crm_notes?: string | null
          crm_status?: string | null
          description?: string | null
          event_date?: string | null
          hero_image_url?: string | null
          id?: string
          last_accessed_at?: string | null
          last_contacted_at?: string | null
          location?: string | null
          logo_url?: string | null
          prospect_company?: string | null
          prospect_email?: string | null
          prospect_name?: string | null
          prospect_source?: string | null
          registration_fee_cents?: number | null
          scoring_format?: string | null
          team_fee_cents?: number | null
          tournament_name?: string
          unique_slug?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      score_edits: {
        Row: {
          created_at: string
          edited_by: string | null
          editor_type: string
          hole_number: number
          id: string
          new_score: number | null
          notes: string | null
          old_score: number | null
          registration_id: string
          tournament_id: string
        }
        Insert: {
          created_at?: string
          edited_by?: string | null
          editor_type?: string
          hole_number: number
          id?: string
          new_score?: number | null
          notes?: string | null
          old_score?: number | null
          registration_id: string
          tournament_id: string
        }
        Update: {
          created_at?: string
          edited_by?: string | null
          editor_type?: string
          hole_number?: number
          id?: string
          new_score?: number | null
          notes?: string | null
          old_score?: number | null
          registration_id?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_edits_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "tournament_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_edits_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      security_activity_log: {
        Row: {
          action_details: Json | null
          action_type: string
          created_at: string
          id: string
          ip_address: string | null
          location_city: string | null
          location_country: string | null
          location_lat: number | null
          location_lng: number | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          created_at?: string
          id?: string
          ip_address?: string | null
          location_city?: string | null
          location_country?: string | null
          location_lat?: number | null
          location_lng?: number | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          location_city?: string | null
          location_country?: string | null
          location_lat?: number | null
          location_lng?: number | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_alert_log: {
        Row: {
          created_at: string
          error_message: string | null
          flag_id: string | null
          id: string
          recipients: string | null
          sent: boolean
          severity: string | null
          subject: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          flag_id?: string | null
          id?: string
          recipients?: string | null
          sent?: boolean
          severity?: string | null
          subject?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          flag_id?: string | null
          id?: string
          recipients?: string | null
          sent?: boolean
          severity?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_alert_log_flag_id_fkey"
            columns: ["flag_id"]
            isOneToOne: false
            referencedRelation: "security_flags"
            referencedColumns: ["id"]
          },
        ]
      }
      security_alert_settings: {
        Row: {
          alert_high: boolean
          alert_low: boolean
          alert_medium: boolean
          created_at: string
          enabled: boolean
          id: string
          recipients: string
          updated_at: string
        }
        Insert: {
          alert_high?: boolean
          alert_low?: boolean
          alert_medium?: boolean
          created_at?: string
          enabled?: boolean
          id?: string
          recipients?: string
          updated_at?: string
        }
        Update: {
          alert_high?: boolean
          alert_low?: boolean
          alert_medium?: boolean
          created_at?: string
          enabled?: boolean
          id?: string
          recipients?: string
          updated_at?: string
        }
        Relationships: []
      }
      security_flags: {
        Row: {
          created_at: string
          description: string | null
          flag_type: string
          id: string
          ip_address: string | null
          is_resolved: boolean
          location_city: string | null
          location_country: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          flag_type: string
          id?: string
          ip_address?: string | null
          is_resolved?: boolean
          location_city?: string | null
          location_country?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          flag_type?: string
          id?: string
          ip_address?: string | null
          is_resolved?: boolean
          location_city?: string | null
          location_country?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_ip_blacklist: {
        Row: {
          added_by: string | null
          added_by_email: string | null
          created_at: string
          id: string
          ip_address: string
          reason: string | null
        }
        Insert: {
          added_by?: string | null
          added_by_email?: string | null
          created_at?: string
          id?: string
          ip_address: string
          reason?: string | null
        }
        Update: {
          added_by?: string | null
          added_by_email?: string | null
          created_at?: string
          id?: string
          ip_address?: string
          reason?: string | null
        }
        Relationships: []
      }
      security_suspensions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          reason: string | null
          suspended_at: string
          suspended_by: string | null
          updated_at: string
          user_email: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          reason?: string | null
          suspended_at?: string
          suspended_by?: string | null
          updated_at?: string
          user_email?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          reason?: string | null
          suspended_at?: string
          suspended_by?: string | null
          updated_at?: string
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      setup_checklist_tasks: {
        Row: {
          auto_complete: boolean
          created_at: string
          description: string | null
          display_order: number
          id: string
          link: string | null
          phase: string
          required: boolean
          task_key: string
          task_name: string
        }
        Insert: {
          auto_complete?: boolean
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          link?: string | null
          phase: string
          required?: boolean
          task_key: string
          task_name: string
        }
        Update: {
          auto_complete?: boolean
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          link?: string | null
          phase?: string
          required?: boolean
          task_key?: string
          task_name?: string
        }
        Relationships: []
      }
      side_event_tickets: {
        Row: {
          amount_cents: number
          attendee_email: string
          attendee_name: string
          attendee_phone: string | null
          checked_in_at: string | null
          created_at: string
          custom_answers: Json | null
          id: string
          paid_at: string | null
          payment_status: string
          quantity: number
          side_event_id: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          ticket_code: string | null
          tournament_id: string
        }
        Insert: {
          amount_cents?: number
          attendee_email: string
          attendee_name: string
          attendee_phone?: string | null
          checked_in_at?: string | null
          created_at?: string
          custom_answers?: Json | null
          id?: string
          paid_at?: string | null
          payment_status?: string
          quantity?: number
          side_event_id: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          ticket_code?: string | null
          tournament_id: string
        }
        Update: {
          amount_cents?: number
          attendee_email?: string
          attendee_name?: string
          attendee_phone?: string | null
          checked_in_at?: string | null
          created_at?: string
          custom_answers?: Json | null
          id?: string
          paid_at?: string | null
          payment_status?: string
          quantity?: number
          side_event_id?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          ticket_code?: string | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "side_event_tickets_side_event_id_fkey"
            columns: ["side_event_id"]
            isOneToOne: false
            referencedRelation: "side_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "side_event_tickets_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      side_events: {
        Row: {
          created_at: string
          custom_questions: Json
          description: string | null
          display_order: number
          event_date: string | null
          hide_ticket_count: boolean
          id: string
          is_active: boolean
          location: string | null
          max_tickets: number | null
          name: string
          price_cents: number
          show_on_public: boolean
          tickets_sold: number
          tournament_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_questions?: Json
          description?: string | null
          display_order?: number
          event_date?: string | null
          hide_ticket_count?: boolean
          id?: string
          is_active?: boolean
          location?: string | null
          max_tickets?: number | null
          name: string
          price_cents?: number
          show_on_public?: boolean
          tickets_sold?: number
          tournament_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_questions?: Json
          description?: string | null
          display_order?: number
          event_date?: string | null
          hide_ticket_count?: boolean
          id?: string
          is_active?: boolean
          location?: string | null
          max_tickets?: number | null
          name?: string
          price_cents?: number
          show_on_public?: boolean
          tickets_sold?: number
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "side_events_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_vetting: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          heard_from: string | null
          heard_from_other: string | null
          id: string
          interest_area: string | null
          organization_name: string | null
          phone: string | null
          planning_status: string | null
          primary_goal: string | null
          role_other: string | null
          roles: string[] | null
          user_id: string
          vetting_status: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          heard_from?: string | null
          heard_from_other?: string | null
          id?: string
          interest_area?: string | null
          organization_name?: string | null
          phone?: string | null
          planning_status?: string | null
          primary_goal?: string | null
          role_other?: string | null
          roles?: string[] | null
          user_id: string
          vetting_status?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          heard_from?: string | null
          heard_from_other?: string | null
          id?: string
          interest_area?: string | null
          organization_name?: string | null
          phone?: string | null
          planning_status?: string | null
          primary_goal?: string | null
          role_other?: string | null
          roles?: string[] | null
          user_id?: string
          vetting_status?: string
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
      sponsor_registrations: {
        Row: {
          additional_notes: string | null
          address: string | null
          amount_cents: number
          checkin_time: string | null
          company_name: string
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string
          description: string | null
          hole_number: string | null
          id: string
          is_title_sponsor: boolean
          logo_url: string | null
          manually_approved: boolean
          paid_at: string | null
          payment_status: string
          receipt_number: string | null
          receipt_sent: boolean
          receipt_sent_at: string | null
          show_on_leaderboard: boolean
          show_on_public: boolean
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          tier_id: string | null
          tournament_id: string
          website_url: string | null
        }
        Insert: {
          additional_notes?: string | null
          address?: string | null
          amount_cents: number
          checkin_time?: string | null
          company_name: string
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          hole_number?: string | null
          id?: string
          is_title_sponsor?: boolean
          logo_url?: string | null
          manually_approved?: boolean
          paid_at?: string | null
          payment_status?: string
          receipt_number?: string | null
          receipt_sent?: boolean
          receipt_sent_at?: string | null
          show_on_leaderboard?: boolean
          show_on_public?: boolean
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          tier_id?: string | null
          tournament_id: string
          website_url?: string | null
        }
        Update: {
          additional_notes?: string | null
          address?: string | null
          amount_cents?: number
          checkin_time?: string | null
          company_name?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          hole_number?: string | null
          id?: string
          is_title_sponsor?: boolean
          logo_url?: string | null
          manually_approved?: boolean
          paid_at?: string | null
          payment_status?: string
          receipt_number?: string | null
          receipt_sent?: boolean
          receipt_sent_at?: string | null
          show_on_leaderboard?: boolean
          show_on_public?: boolean
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          tier_id?: string | null
          tournament_id?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_registrations_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "sponsorship_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_registrations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsorship_pages: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          cta_register_label: string | null
          custom_html: string | null
          hero_description: string | null
          hero_title: string | null
          id: string
          pdf_url: string | null
          published: boolean
          tiers_content: Json | null
          tournament_id: string
          updated_at: string
          use_imported_tiers: boolean
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          cta_register_label?: string | null
          custom_html?: string | null
          hero_description?: string | null
          hero_title?: string | null
          id?: string
          pdf_url?: string | null
          published?: boolean
          tiers_content?: Json | null
          tournament_id: string
          updated_at?: string
          use_imported_tiers?: boolean
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          cta_register_label?: string | null
          custom_html?: string | null
          hero_description?: string | null
          hero_title?: string | null
          id?: string
          pdf_url?: string | null
          published?: boolean
          tiers_content?: Json | null
          tournament_id?: string
          updated_at?: string
          use_imported_tiers?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "sponsorship_pages_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: true
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsorship_tiers: {
        Row: {
          allow_additional_notes: boolean
          benefits: string | null
          created_at: string
          custom_package_label: string | null
          description: string | null
          display_order: number | null
          hide_price_when_sold_out: boolean
          id: string
          is_active: boolean | null
          name: string
          package_type: string | null
          price_cents: number
          published_to_public: boolean
          require_logo: boolean
          show_logo_upload: boolean
          show_remaining: boolean
          spots_used: number
          total_spots: number | null
          tournament_id: string
        }
        Insert: {
          allow_additional_notes?: boolean
          benefits?: string | null
          created_at?: string
          custom_package_label?: string | null
          description?: string | null
          display_order?: number | null
          hide_price_when_sold_out?: boolean
          id?: string
          is_active?: boolean | null
          name: string
          package_type?: string | null
          price_cents: number
          published_to_public?: boolean
          require_logo?: boolean
          show_logo_upload?: boolean
          show_remaining?: boolean
          spots_used?: number
          total_spots?: number | null
          tournament_id: string
        }
        Update: {
          allow_additional_notes?: boolean
          benefits?: string | null
          created_at?: string
          custom_package_label?: string | null
          description?: string | null
          display_order?: number | null
          hide_price_when_sold_out?: boolean
          id?: string
          is_active?: boolean | null
          name?: string
          package_type?: string | null
          price_cents?: number
          published_to_public?: boolean
          require_logo?: boolean
          show_logo_upload?: boolean
          show_remaining?: boolean
          spots_used?: number
          total_spots?: number | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsorship_tiers_tournament_id_fkey"
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
      team_promoters: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          role: string | null
          tournament_id: string
          unique_ref_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          name: string
          role?: string | null
          tournament_id: string
          unique_ref_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          role?: string | null
          tournament_id?: string
          unique_ref_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_promoters_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      test_participants: {
        Row: {
          course_handicap: number | null
          created_at: string
          handicap_index: number | null
          id: string
          name: string
          playing_handicap: number | null
          tournament_id: string
        }
        Insert: {
          course_handicap?: number | null
          created_at?: string
          handicap_index?: number | null
          id?: string
          name: string
          playing_handicap?: number | null
          tournament_id: string
        }
        Update: {
          course_handicap?: number | null
          created_at?: string
          handicap_index?: number | null
          id?: string
          name?: string
          playing_handicap?: number | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_participants_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      test_scores: {
        Row: {
          gross_score: number | null
          hole_number: number
          id: string
          net_score: number | null
          test_participant_id: string
          tournament_id: string
          updated_at: string
        }
        Insert: {
          gross_score?: number | null
          hole_number: number
          id?: string
          net_score?: number | null
          test_participant_id: string
          tournament_id: string
          updated_at?: string
        }
        Update: {
          gross_score?: number | null
          hole_number?: number
          id?: string
          net_score?: number | null
          test_participant_id?: string
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_scores_test_participant_id_fkey"
            columns: ["test_participant_id"]
            isOneToOne: false
            referencedRelation: "test_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_scores_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_accommodations: {
        Row: {
          address: string | null
          booking_deadline: string | null
          created_at: string
          display_order: number
          group_code: string | null
          hotel_name: string
          id: string
          is_active: boolean
          notes: string | null
          phone: string | null
          tournament_id: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          address?: string | null
          booking_deadline?: string | null
          created_at?: string
          display_order?: number
          group_code?: string | null
          hotel_name: string
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          tournament_id: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          address?: string | null
          booking_deadline?: string | null
          created_at?: string
          display_order?: number
          group_code?: string | null
          hotel_name?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          tournament_id?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_accommodations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_addon_orders: {
        Row: {
          buyer_email: string
          buyer_name: string | null
          created_at: string
          fees_cents: number
          id: string
          items: Json
          payment_status: string
          stripe_session_id: string | null
          subtotal_cents: number
          total_cents: number
          tournament_id: string
          updated_at: string
        }
        Insert: {
          buyer_email: string
          buyer_name?: string | null
          created_at?: string
          fees_cents?: number
          id?: string
          items?: Json
          payment_status?: string
          stripe_session_id?: string | null
          subtotal_cents?: number
          total_cents?: number
          tournament_id: string
          updated_at?: string
        }
        Update: {
          buyer_email?: string
          buyer_name?: string | null
          created_at?: string
          fees_cents?: number
          id?: string
          items?: Json
          payment_status?: string
          stripe_session_id?: string | null
          subtotal_cents?: number
          total_cents?: number
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_addon_orders_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
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
      tournament_budgets: {
        Row: {
          actual_golfers: number
          created_at: string
          estimate_section_title: string
          estimated_golfers: number
          expense_section_titles: Json
          id: string
          income_section_titles: Json
          pnl_section_title: string
          tournament_id: string
          updated_at: string
        }
        Insert: {
          actual_golfers?: number
          created_at?: string
          estimate_section_title?: string
          estimated_golfers?: number
          expense_section_titles?: Json
          id?: string
          income_section_titles?: Json
          pnl_section_title?: string
          tournament_id: string
          updated_at?: string
        }
        Update: {
          actual_golfers?: number
          created_at?: string
          estimate_section_title?: string
          estimated_golfers?: number
          expense_section_titles?: Json
          id?: string
          income_section_titles?: Json
          pnl_section_title?: string
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_budgets_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: true
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
          offset_days: number | null
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
          offset_days?: number | null
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
          offset_days?: number | null
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
      tournament_contests: {
        Row: {
          created_at: string | null
          description: string | null
          fee_cents: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          published_to_public: boolean
          sort_order: number | null
          tournament_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          fee_cents?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          published_to_public?: boolean
          sort_order?: number | null
          tournament_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          fee_cents?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          published_to_public?: boolean
          sort_order?: number | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_contests_tournament_id_fkey"
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
      tournament_invoice_line_items: {
        Row: {
          category: string | null
          created_at: string
          description: string
          display_order: number
          id: string
          invoice_id: string
          quantity: number
          total_cents: number | null
          unit_price_cents: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          description: string
          display_order?: number
          id?: string
          invoice_id: string
          quantity?: number
          total_cents?: number | null
          unit_price_cents?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          invoice_id?: string
          quantity?: number
          total_cents?: number | null
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "tournament_invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "tournament_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_invoice_payment_allocations: {
        Row: {
          created_at: string
          display_order: number
          id: string
          invoice_id: string
          payee_amount_cents: number
          payee_name: string
          payment_details: string | null
          payment_method: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          invoice_id: string
          payee_amount_cents?: number
          payee_name: string
          payment_details?: string | null
          payment_method?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          invoice_id?: string
          payee_amount_cents?: number
          payee_name?: string
          payment_details?: string | null
          payment_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_invoice_payment_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "tournament_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_invoice_service_breakdowns: {
        Row: {
          category: string
          created_at: string
          description: string
          display_order: number
          id: string
          invoice_id: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          display_order?: number
          id?: string
          invoice_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          invoice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_invoice_service_breakdowns_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "tournament_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_invoices: {
        Row: {
          client_email: string | null
          client_name: string
          client_org: string | null
          client_phone: string | null
          created_at: string
          created_by: string | null
          due_date: string | null
          event_name: string
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          payment_terms: string | null
          service_period_end: string | null
          service_period_start: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_email?: string | null
          client_name: string
          client_org?: string | null
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          event_name: string
          id?: string
          invoice_date?: string
          invoice_number: string
          notes?: string | null
          payment_terms?: string | null
          service_period_end?: string | null
          service_period_start?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_email?: string | null
          client_name?: string
          client_org?: string | null
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          event_name?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          payment_terms?: string | null
          service_period_end?: string | null
          service_period_start?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
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
      tournament_offline_donations: {
        Row: {
          amount_cents: number
          created_at: string
          donor_name: string | null
          id: string
          notes: string | null
          received_date: string
          tournament_id: string
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          donor_name?: string | null
          id?: string
          notes?: string | null
          received_date?: string
          tournament_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          donor_name?: string | null
          id?: string
          notes?: string | null
          received_date?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_offline_donations_tournament_id_fkey"
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
          alert_enabled: boolean
          alert_html: string | null
          applies_to: string
          applies_to_custom: string | null
          auto_apply: boolean
          code: string
          created_at: string
          current_uses: number
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          show_alert_at_checkout: boolean
          show_alert_on_top: boolean
          tournament_id: string
        }
        Insert: {
          alert_enabled?: boolean
          alert_html?: string | null
          applies_to?: string
          applies_to_custom?: string | null
          auto_apply?: boolean
          code: string
          created_at?: string
          current_uses?: number
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          show_alert_at_checkout?: boolean
          show_alert_on_top?: boolean
          tournament_id: string
        }
        Update: {
          alert_enabled?: boolean
          alert_html?: string | null
          applies_to?: string
          applies_to_custom?: string | null
          auto_apply?: boolean
          code?: string
          created_at?: string
          current_uses?: number
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          show_alert_at_checkout?: boolean
          show_alert_on_top?: boolean
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
          claim_token: string
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
          claim_token?: string
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
          claim_token?: string
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
      tournament_registration_addon_purchases: {
        Row: {
          addon_id: string
          addon_name: string
          created_at: string
          id: string
          quantity: number
          registration_id: string
          unit_price_cents: number
        }
        Insert: {
          addon_id: string
          addon_name: string
          created_at?: string
          id?: string
          quantity?: number
          registration_id: string
          unit_price_cents: number
        }
        Update: {
          addon_id?: string
          addon_name?: string
          created_at?: string
          id?: string
          quantity?: number
          registration_id?: string
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "tournament_registration_addon_purchases_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "tournament_registration_addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registration_addon_purchases_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "tournament_registrations"
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
          max_per_golfer: number
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
          max_per_golfer?: number
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
          max_per_golfer?: number
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
          age_update_token: string | null
          cash_payment_received: boolean
          check_in_time: string | null
          checked_in: boolean | null
          course_handicap: number | null
          covered_fees: boolean
          created_at: string
          custom_answers: Json
          dietary_restrictions: string | null
          donation_amount_cents: number
          drives_used: number
          email: string
          first_name: string
          flight_id: string | null
          group_id: string | null
          group_label: string | null
          group_leader: boolean
          group_number: number | null
          group_position: number | null
          group_score: number | null
          group_scoring_code: string | null
          handicap: number | null
          handicap_index: number | null
          id: string
          is_captain: boolean
          last_name: string
          notes: string | null
          payment_method: string
          payment_status: string
          phone: string | null
          playing_handicap: number | null
          promoter_id: string | null
          qr_token: string | null
          qr_token_expires_at: string | null
          referral_code_used: string | null
          scoring_code: string | null
          shirt_size: string | null
          strokes_per_hole: Json | null
          survey_completed_at: string | null
          survey_response_token: string | null
          team_handicap: number | null
          team_handicap_percentage: number | null
          tee_time: string | null
          tier_id: string | null
          tournament_id: string
        }
        Insert: {
          age_update_token?: string | null
          cash_payment_received?: boolean
          check_in_time?: string | null
          checked_in?: boolean | null
          course_handicap?: number | null
          covered_fees?: boolean
          created_at?: string
          custom_answers?: Json
          dietary_restrictions?: string | null
          donation_amount_cents?: number
          drives_used?: number
          email: string
          first_name: string
          flight_id?: string | null
          group_id?: string | null
          group_label?: string | null
          group_leader?: boolean
          group_number?: number | null
          group_position?: number | null
          group_score?: number | null
          group_scoring_code?: string | null
          handicap?: number | null
          handicap_index?: number | null
          id?: string
          is_captain?: boolean
          last_name: string
          notes?: string | null
          payment_method?: string
          payment_status?: string
          phone?: string | null
          playing_handicap?: number | null
          promoter_id?: string | null
          qr_token?: string | null
          qr_token_expires_at?: string | null
          referral_code_used?: string | null
          scoring_code?: string | null
          shirt_size?: string | null
          strokes_per_hole?: Json | null
          survey_completed_at?: string | null
          survey_response_token?: string | null
          team_handicap?: number | null
          team_handicap_percentage?: number | null
          tee_time?: string | null
          tier_id?: string | null
          tournament_id: string
        }
        Update: {
          age_update_token?: string | null
          cash_payment_received?: boolean
          check_in_time?: string | null
          checked_in?: boolean | null
          course_handicap?: number | null
          covered_fees?: boolean
          created_at?: string
          custom_answers?: Json
          dietary_restrictions?: string | null
          donation_amount_cents?: number
          drives_used?: number
          email?: string
          first_name?: string
          flight_id?: string | null
          group_id?: string | null
          group_label?: string | null
          group_leader?: boolean
          group_number?: number | null
          group_position?: number | null
          group_score?: number | null
          group_scoring_code?: string | null
          handicap?: number | null
          handicap_index?: number | null
          id?: string
          is_captain?: boolean
          last_name?: string
          notes?: string | null
          payment_method?: string
          payment_status?: string
          phone?: string | null
          playing_handicap?: number | null
          promoter_id?: string | null
          qr_token?: string | null
          qr_token_expires_at?: string | null
          referral_code_used?: string | null
          scoring_code?: string | null
          shirt_size?: string | null
          strokes_per_hole?: Json | null
          survey_completed_at?: string | null
          survey_response_token?: string | null
          team_handicap?: number | null
          team_handicap_percentage?: number | null
          tee_time?: string | null
          tier_id?: string | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_registrations_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "tournament_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registrations_promoter_id_fkey"
            columns: ["promoter_id"]
            isOneToOne: false
            referencedRelation: "team_promoters"
            referencedColumns: ["id"]
          },
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
      tournament_setup_progress: {
        Row: {
          completed_at: string | null
          id: string
          status: string
          task_id: string
          tournament_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          status?: string
          task_id: string
          tournament_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          status?: string
          task_id?: string
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_setup_progress_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "setup_checklist_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_setup_progress_tournament_id_fkey"
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
          display_order: number
          id: string
          is_paid: boolean | null
          leaderboard_placement: string
          logo_url: string | null
          name: string
          show_on_leaderboard: boolean
          show_on_scoring_page: boolean
          sort_order: number | null
          tier: string
          tournament_id: string
          website_url: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_paid?: boolean | null
          leaderboard_placement?: string
          logo_url?: string | null
          name: string
          show_on_leaderboard?: boolean
          show_on_scoring_page?: boolean
          sort_order?: number | null
          tier?: string
          tournament_id: string
          website_url?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_paid?: boolean | null
          leaderboard_placement?: string
          logo_url?: string | null
          name?: string
          show_on_leaderboard?: boolean
          show_on_scoring_page?: boolean
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
      tournament_tiers: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          tier_description: string | null
          tier_name: string
          tournament_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          tier_description?: string | null
          tier_name: string
          tournament_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          tier_description?: string | null
          tier_name?: string
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_tiers_tournament_id_fkey"
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
          about_us: string | null
          add_on_display_location: string
          admin_invitation_sent_at: string | null
          admin_notes: string | null
          age_request_email_config: Json | null
          allow_cash_registration: boolean
          allow_cover_fees: boolean
          allowed_group_sizes: number[] | null
          auction_tab_title: string | null
          branding_footer_admin_override: boolean
          branding_footer_admin_show: boolean
          branding_footer_custom_text: string | null
          captain_label: string | null
          confirmation_email_config: Json | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          countdown_style: string
          course_name: string | null
          course_par: number | null
          created_at: string
          created_by_admin_id: string | null
          custom_domain: string | null
          custom_org_sections: Json
          custom_slug: string | null
          date: string | null
          day_before_approved: boolean
          day_before_email_config: Json | null
          day_before_send_at: string | null
          day_before_sent_at: string | null
          day_of_accent_color: string | null
          day_of_announcements: string | null
          day_of_announcements_list: Json
          day_of_bg_color: string | null
          day_of_course_map_url: string | null
          day_of_director_email: string | null
          day_of_director_name: string | null
          day_of_director_phone: string | null
          day_of_emergency_contact: string | null
          day_of_font_color: string | null
          day_of_header_image_url: string | null
          day_of_page_enabled: boolean
          day_of_page_mode: string
          day_of_pairings_url: string | null
          day_of_pin_sheet_pdf_url: string | null
          day_of_placeholder_fallback: string
          day_of_rules_url: string | null
          day_of_send_link_in_confirmation: boolean
          day_of_show_announcements_card: boolean
          day_of_show_coursemap_card: boolean
          day_of_show_leaderboard: boolean
          day_of_show_leaderboard_card: boolean
          day_of_show_pin_sheets: boolean
          day_of_show_scores_card: boolean
          day_of_show_sponsors: boolean
          day_of_show_welcome: boolean
          day_of_sponsor_layout: string
          day_of_sponsor_thanks: string | null
          day_of_sponsor_title: string | null
          day_of_weather_enabled: boolean
          day_of_weather_location: string | null
          day_of_welcome_message: string | null
          day_of_welcome_title: string | null
          demo_admin_id: string | null
          demo_checklist: Json
          demo_conversion_claimed_at: string | null
          demo_conversion_claimed_by: string | null
          demo_conversion_discount_type: string | null
          demo_conversion_discount_value: number | null
          demo_conversion_is_test: boolean
          demo_conversion_sent_at: string | null
          demo_conversion_token: string | null
          demo_conversion_token_expires_at: string | null
          demo_conversion_used_at: string | null
          demo_converted_at: string | null
          demo_flyer_url: string | null
          demo_notes: string | null
          demo_prepared: boolean
          demo_prospect_email: string | null
          demo_prospect_name: string | null
          demo_prospect_other: string | null
          demo_prospect_platform: string | null
          demo_share_token: string | null
          demo_test_converted_at: string | null
          description: string | null
          description_html: string | null
          display_order: number
          donation_allow_custom: boolean
          donation_custom_label: string | null
          donation_goal_cents: number | null
          donation_preset_amounts: number[]
          donation_prompt_description: string | null
          donation_prompt_enabled: boolean
          donation_prompt_title: string | null
          donations_footer_text: string | null
          donations_header_text: string | null
          early_registration_enabled: boolean
          early_registration_expires_at: string | null
          early_registration_price_2_cents: number | null
          early_registration_price_4_cents: number | null
          early_registration_price_cents: number | null
          early_signup_enabled: boolean
          early_signup_label: string | null
          end_date: string | null
          external_link: string | null
          flight_based_on: string
          flight_method: string
          flights_enabled: boolean
          foursome_registration: boolean
          fundraising_goal_custom: boolean
          gallery_position: string
          gallery_url: string | null
          golf_course_id: string | null
          golfers_register_first: boolean
          group_field_rules: Json | null
          handicap_allowance: number | null
          handicap_enabled: boolean | null
          history: string | null
          hole_pars: Json | null
          id: string
          image_url: string | null
          is_converted_from_sample: boolean
          is_demo: boolean
          is_pro: boolean
          is_sample: boolean
          leaderboard_design: Json
          leaderboard_frozen_at: string | null
          leaderboard_frozen_by: string | null
          leaderboard_last_reset_at: string | null
          leaderboard_last_reset_by: string | null
          leaderboard_reset_count: number
          leaderboard_rotating_logos: Json
          leaderboard_show_sponsor: boolean
          leaderboard_sponsor_banner_enabled: boolean
          leaderboard_sponsor_banner_position: string
          leaderboard_sponsor_interval_ms: number
          leaderboard_sponsor_label: string
          leaderboard_sponsor_logo_url: string | null
          leaderboard_sponsor_name: string | null
          leaderboard_sponsor_rotation_order: string
          leaderboard_sponsor_scroll_seconds: number
          leaderboard_sponsor_style: string
          leaderboard_title: string | null
          live_allow_edit_past_holes: boolean
          live_default_view: string
          live_display_enabled: boolean
          live_display_refresh_seconds: number
          live_leaderboard_enabled: boolean
          live_require_confirm_save: boolean
          live_scoring_require_code: boolean
          live_show_gross: boolean
          live_show_net: boolean
          live_show_sponsors: boolean
          live_sponsor_placement: string
          location: string | null
          managed_by_teevents: boolean
          manual_entries_admin_override: number
          manual_entries_free_limit: number
          manual_entries_used: number
          max_group_size: number
          max_handicap: number | null
          max_players: number | null
          max_waitlist_slots: number | null
          media_position: string
          media_tab_title: string | null
          min_drives_per_player: number
          mission_statement: string | null
          org_address: string | null
          org_contact_email: string | null
          org_contact_phone: string | null
          organization_id: string
          paid_features: Json
          pairings_locked: boolean
          pairings_locked_at: string | null
          pairings_update_email_config: Json | null
          pass_fees_to_participants: boolean
          pass_fees_to_registrants: boolean
          payment_method_override: string
          payout_method: string | null
          pin_sheets_enabled: boolean
          pin_sheets_notes: string | null
          post_event_email_config: Json | null
          post_event_email_opt_out: boolean
          post_event_email_sent: boolean
          post_event_email_sent_at: string | null
          post_event_survey_delay_days: number
          post_event_survey_enabled: boolean
          post_event_survey_message: string | null
          post_event_survey_sent_at: string | null
          printable_font: string
          printable_layout: string
          printable_logo_url: string | null
          printable_options: Json
          pro_paid_at: string | null
          pro_payment_intent_id: string | null
          public_tabs: Json | null
          public_tabs_order: string[] | null
          raffle_tab_title: string | null
          rain_date_policy: string | null
          rain_date_policy_type: string | null
          refund_deadline_days: number | null
          refund_partial_percent: number | null
          refund_policy: string | null
          refund_policy_text: string | null
          refund_policy_type: string
          registration_fee_cents: number | null
          registration_intro_html: string | null
          registration_open: boolean | null
          registration_promo_html: string | null
          registration_url: string | null
          reserve_percentage: number | null
          results_url: string | null
          sample_converted_at: string | null
          sample_converted_to: string | null
          sample_created_by: string | null
          sample_last_viewed: string | null
          sample_token: string | null
          sample_view_count: number
          saved_course_id: string | null
          schedule_info: string | null
          schedule_info_html: string | null
          scoring_format: string
          setup_checklist_dismissed: boolean
          shootout_rounds: Json | null
          show_branding_badge: boolean
          show_branding_footer: boolean
          show_countdown: boolean
          show_in_public_search: boolean
          show_org_tab: boolean
          show_promo_code_input: boolean
          show_registration_count: boolean
          show_sponsorships: boolean
          side_events_section_title: string | null
          site_background_color: string | null
          site_body_font_size: number | null
          site_button_font_size: number | null
          site_button_hover_effect: string | null
          site_button_position: string | null
          site_button_radius: number | null
          site_font_family: string | null
          site_heading_font_size: number | null
          site_hero_image_url: string | null
          site_hero_opacity: number
          site_hero_subtitle: string | null
          site_hero_title: string | null
          site_logo_color_mode: string
          site_logo_color_value: string | null
          site_logo_offset_x: number
          site_logo_offset_y: number
          site_logo_position: string | null
          site_logo_url: string | null
          site_primary_color: string | null
          site_published: boolean | null
          site_secondary_color: string | null
          site_show_logo: boolean | null
          site_text_color: string | null
          site_title_position: string | null
          skins_enabled: boolean
          skins_entry_fee_cents: number
          skins_mode: string
          slug: string | null
          sponsor_custom_notes: string | null
          sponsor_day_of_email_config: Json | null
          sponsor_email_config: Json | null
          sponsor_form_config: Json
          sponsor_logo_display_size: string
          sponsor_parking_info: string | null
          sponsorship_day_of_email_config: Json | null
          state: string | null
          status: string
          store_section_title: string | null
          team_hq_settings: Json
          template: string | null
          test_mode_enabled: boolean | null
          title: string
          updated_at: string
          url_edit_count: number
          url_edited_at: string | null
          vendor_booth_fee_cents: number | null
          vendor_email_config: Json | null
          vision_statement: string | null
          waitlist_deposit_cents: number | null
          waitlist_enabled: boolean
        }
        Insert: {
          about_us?: string | null
          add_on_display_location?: string
          admin_invitation_sent_at?: string | null
          admin_notes?: string | null
          age_request_email_config?: Json | null
          allow_cash_registration?: boolean
          allow_cover_fees?: boolean
          allowed_group_sizes?: number[] | null
          auction_tab_title?: string | null
          branding_footer_admin_override?: boolean
          branding_footer_admin_show?: boolean
          branding_footer_custom_text?: string | null
          captain_label?: string | null
          confirmation_email_config?: Json | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          countdown_style?: string
          course_name?: string | null
          course_par?: number | null
          created_at?: string
          created_by_admin_id?: string | null
          custom_domain?: string | null
          custom_org_sections?: Json
          custom_slug?: string | null
          date?: string | null
          day_before_approved?: boolean
          day_before_email_config?: Json | null
          day_before_send_at?: string | null
          day_before_sent_at?: string | null
          day_of_accent_color?: string | null
          day_of_announcements?: string | null
          day_of_announcements_list?: Json
          day_of_bg_color?: string | null
          day_of_course_map_url?: string | null
          day_of_director_email?: string | null
          day_of_director_name?: string | null
          day_of_director_phone?: string | null
          day_of_emergency_contact?: string | null
          day_of_font_color?: string | null
          day_of_header_image_url?: string | null
          day_of_page_enabled?: boolean
          day_of_page_mode?: string
          day_of_pairings_url?: string | null
          day_of_pin_sheet_pdf_url?: string | null
          day_of_placeholder_fallback?: string
          day_of_rules_url?: string | null
          day_of_send_link_in_confirmation?: boolean
          day_of_show_announcements_card?: boolean
          day_of_show_coursemap_card?: boolean
          day_of_show_leaderboard?: boolean
          day_of_show_leaderboard_card?: boolean
          day_of_show_pin_sheets?: boolean
          day_of_show_scores_card?: boolean
          day_of_show_sponsors?: boolean
          day_of_show_welcome?: boolean
          day_of_sponsor_layout?: string
          day_of_sponsor_thanks?: string | null
          day_of_sponsor_title?: string | null
          day_of_weather_enabled?: boolean
          day_of_weather_location?: string | null
          day_of_welcome_message?: string | null
          day_of_welcome_title?: string | null
          demo_admin_id?: string | null
          demo_checklist?: Json
          demo_conversion_claimed_at?: string | null
          demo_conversion_claimed_by?: string | null
          demo_conversion_discount_type?: string | null
          demo_conversion_discount_value?: number | null
          demo_conversion_is_test?: boolean
          demo_conversion_sent_at?: string | null
          demo_conversion_token?: string | null
          demo_conversion_token_expires_at?: string | null
          demo_conversion_used_at?: string | null
          demo_converted_at?: string | null
          demo_flyer_url?: string | null
          demo_notes?: string | null
          demo_prepared?: boolean
          demo_prospect_email?: string | null
          demo_prospect_name?: string | null
          demo_prospect_other?: string | null
          demo_prospect_platform?: string | null
          demo_share_token?: string | null
          demo_test_converted_at?: string | null
          description?: string | null
          description_html?: string | null
          display_order?: number
          donation_allow_custom?: boolean
          donation_custom_label?: string | null
          donation_goal_cents?: number | null
          donation_preset_amounts?: number[]
          donation_prompt_description?: string | null
          donation_prompt_enabled?: boolean
          donation_prompt_title?: string | null
          donations_footer_text?: string | null
          donations_header_text?: string | null
          early_registration_enabled?: boolean
          early_registration_expires_at?: string | null
          early_registration_price_2_cents?: number | null
          early_registration_price_4_cents?: number | null
          early_registration_price_cents?: number | null
          early_signup_enabled?: boolean
          early_signup_label?: string | null
          end_date?: string | null
          external_link?: string | null
          flight_based_on?: string
          flight_method?: string
          flights_enabled?: boolean
          foursome_registration?: boolean
          fundraising_goal_custom?: boolean
          gallery_position?: string
          gallery_url?: string | null
          golf_course_id?: string | null
          golfers_register_first?: boolean
          group_field_rules?: Json | null
          handicap_allowance?: number | null
          handicap_enabled?: boolean | null
          history?: string | null
          hole_pars?: Json | null
          id?: string
          image_url?: string | null
          is_converted_from_sample?: boolean
          is_demo?: boolean
          is_pro?: boolean
          is_sample?: boolean
          leaderboard_design?: Json
          leaderboard_frozen_at?: string | null
          leaderboard_frozen_by?: string | null
          leaderboard_last_reset_at?: string | null
          leaderboard_last_reset_by?: string | null
          leaderboard_reset_count?: number
          leaderboard_rotating_logos?: Json
          leaderboard_show_sponsor?: boolean
          leaderboard_sponsor_banner_enabled?: boolean
          leaderboard_sponsor_banner_position?: string
          leaderboard_sponsor_interval_ms?: number
          leaderboard_sponsor_label?: string
          leaderboard_sponsor_logo_url?: string | null
          leaderboard_sponsor_name?: string | null
          leaderboard_sponsor_rotation_order?: string
          leaderboard_sponsor_scroll_seconds?: number
          leaderboard_sponsor_style?: string
          leaderboard_title?: string | null
          live_allow_edit_past_holes?: boolean
          live_default_view?: string
          live_display_enabled?: boolean
          live_display_refresh_seconds?: number
          live_leaderboard_enabled?: boolean
          live_require_confirm_save?: boolean
          live_scoring_require_code?: boolean
          live_show_gross?: boolean
          live_show_net?: boolean
          live_show_sponsors?: boolean
          live_sponsor_placement?: string
          location?: string | null
          managed_by_teevents?: boolean
          manual_entries_admin_override?: number
          manual_entries_free_limit?: number
          manual_entries_used?: number
          max_group_size?: number
          max_handicap?: number | null
          max_players?: number | null
          max_waitlist_slots?: number | null
          media_position?: string
          media_tab_title?: string | null
          min_drives_per_player?: number
          mission_statement?: string | null
          org_address?: string | null
          org_contact_email?: string | null
          org_contact_phone?: string | null
          organization_id: string
          paid_features?: Json
          pairings_locked?: boolean
          pairings_locked_at?: string | null
          pairings_update_email_config?: Json | null
          pass_fees_to_participants?: boolean
          pass_fees_to_registrants?: boolean
          payment_method_override?: string
          payout_method?: string | null
          pin_sheets_enabled?: boolean
          pin_sheets_notes?: string | null
          post_event_email_config?: Json | null
          post_event_email_opt_out?: boolean
          post_event_email_sent?: boolean
          post_event_email_sent_at?: string | null
          post_event_survey_delay_days?: number
          post_event_survey_enabled?: boolean
          post_event_survey_message?: string | null
          post_event_survey_sent_at?: string | null
          printable_font?: string
          printable_layout?: string
          printable_logo_url?: string | null
          printable_options?: Json
          pro_paid_at?: string | null
          pro_payment_intent_id?: string | null
          public_tabs?: Json | null
          public_tabs_order?: string[] | null
          raffle_tab_title?: string | null
          rain_date_policy?: string | null
          rain_date_policy_type?: string | null
          refund_deadline_days?: number | null
          refund_partial_percent?: number | null
          refund_policy?: string | null
          refund_policy_text?: string | null
          refund_policy_type?: string
          registration_fee_cents?: number | null
          registration_intro_html?: string | null
          registration_open?: boolean | null
          registration_promo_html?: string | null
          registration_url?: string | null
          reserve_percentage?: number | null
          results_url?: string | null
          sample_converted_at?: string | null
          sample_converted_to?: string | null
          sample_created_by?: string | null
          sample_last_viewed?: string | null
          sample_token?: string | null
          sample_view_count?: number
          saved_course_id?: string | null
          schedule_info?: string | null
          schedule_info_html?: string | null
          scoring_format?: string
          setup_checklist_dismissed?: boolean
          shootout_rounds?: Json | null
          show_branding_badge?: boolean
          show_branding_footer?: boolean
          show_countdown?: boolean
          show_in_public_search?: boolean
          show_org_tab?: boolean
          show_promo_code_input?: boolean
          show_registration_count?: boolean
          show_sponsorships?: boolean
          side_events_section_title?: string | null
          site_background_color?: string | null
          site_body_font_size?: number | null
          site_button_font_size?: number | null
          site_button_hover_effect?: string | null
          site_button_position?: string | null
          site_button_radius?: number | null
          site_font_family?: string | null
          site_heading_font_size?: number | null
          site_hero_image_url?: string | null
          site_hero_opacity?: number
          site_hero_subtitle?: string | null
          site_hero_title?: string | null
          site_logo_color_mode?: string
          site_logo_color_value?: string | null
          site_logo_offset_x?: number
          site_logo_offset_y?: number
          site_logo_position?: string | null
          site_logo_url?: string | null
          site_primary_color?: string | null
          site_published?: boolean | null
          site_secondary_color?: string | null
          site_show_logo?: boolean | null
          site_text_color?: string | null
          site_title_position?: string | null
          skins_enabled?: boolean
          skins_entry_fee_cents?: number
          skins_mode?: string
          slug?: string | null
          sponsor_custom_notes?: string | null
          sponsor_day_of_email_config?: Json | null
          sponsor_email_config?: Json | null
          sponsor_form_config?: Json
          sponsor_logo_display_size?: string
          sponsor_parking_info?: string | null
          sponsorship_day_of_email_config?: Json | null
          state?: string | null
          status?: string
          store_section_title?: string | null
          team_hq_settings?: Json
          template?: string | null
          test_mode_enabled?: boolean | null
          title: string
          updated_at?: string
          url_edit_count?: number
          url_edited_at?: string | null
          vendor_booth_fee_cents?: number | null
          vendor_email_config?: Json | null
          vision_statement?: string | null
          waitlist_deposit_cents?: number | null
          waitlist_enabled?: boolean
        }
        Update: {
          about_us?: string | null
          add_on_display_location?: string
          admin_invitation_sent_at?: string | null
          admin_notes?: string | null
          age_request_email_config?: Json | null
          allow_cash_registration?: boolean
          allow_cover_fees?: boolean
          allowed_group_sizes?: number[] | null
          auction_tab_title?: string | null
          branding_footer_admin_override?: boolean
          branding_footer_admin_show?: boolean
          branding_footer_custom_text?: string | null
          captain_label?: string | null
          confirmation_email_config?: Json | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          countdown_style?: string
          course_name?: string | null
          course_par?: number | null
          created_at?: string
          created_by_admin_id?: string | null
          custom_domain?: string | null
          custom_org_sections?: Json
          custom_slug?: string | null
          date?: string | null
          day_before_approved?: boolean
          day_before_email_config?: Json | null
          day_before_send_at?: string | null
          day_before_sent_at?: string | null
          day_of_accent_color?: string | null
          day_of_announcements?: string | null
          day_of_announcements_list?: Json
          day_of_bg_color?: string | null
          day_of_course_map_url?: string | null
          day_of_director_email?: string | null
          day_of_director_name?: string | null
          day_of_director_phone?: string | null
          day_of_emergency_contact?: string | null
          day_of_font_color?: string | null
          day_of_header_image_url?: string | null
          day_of_page_enabled?: boolean
          day_of_page_mode?: string
          day_of_pairings_url?: string | null
          day_of_pin_sheet_pdf_url?: string | null
          day_of_placeholder_fallback?: string
          day_of_rules_url?: string | null
          day_of_send_link_in_confirmation?: boolean
          day_of_show_announcements_card?: boolean
          day_of_show_coursemap_card?: boolean
          day_of_show_leaderboard?: boolean
          day_of_show_leaderboard_card?: boolean
          day_of_show_pin_sheets?: boolean
          day_of_show_scores_card?: boolean
          day_of_show_sponsors?: boolean
          day_of_show_welcome?: boolean
          day_of_sponsor_layout?: string
          day_of_sponsor_thanks?: string | null
          day_of_sponsor_title?: string | null
          day_of_weather_enabled?: boolean
          day_of_weather_location?: string | null
          day_of_welcome_message?: string | null
          day_of_welcome_title?: string | null
          demo_admin_id?: string | null
          demo_checklist?: Json
          demo_conversion_claimed_at?: string | null
          demo_conversion_claimed_by?: string | null
          demo_conversion_discount_type?: string | null
          demo_conversion_discount_value?: number | null
          demo_conversion_is_test?: boolean
          demo_conversion_sent_at?: string | null
          demo_conversion_token?: string | null
          demo_conversion_token_expires_at?: string | null
          demo_conversion_used_at?: string | null
          demo_converted_at?: string | null
          demo_flyer_url?: string | null
          demo_notes?: string | null
          demo_prepared?: boolean
          demo_prospect_email?: string | null
          demo_prospect_name?: string | null
          demo_prospect_other?: string | null
          demo_prospect_platform?: string | null
          demo_share_token?: string | null
          demo_test_converted_at?: string | null
          description?: string | null
          description_html?: string | null
          display_order?: number
          donation_allow_custom?: boolean
          donation_custom_label?: string | null
          donation_goal_cents?: number | null
          donation_preset_amounts?: number[]
          donation_prompt_description?: string | null
          donation_prompt_enabled?: boolean
          donation_prompt_title?: string | null
          donations_footer_text?: string | null
          donations_header_text?: string | null
          early_registration_enabled?: boolean
          early_registration_expires_at?: string | null
          early_registration_price_2_cents?: number | null
          early_registration_price_4_cents?: number | null
          early_registration_price_cents?: number | null
          early_signup_enabled?: boolean
          early_signup_label?: string | null
          end_date?: string | null
          external_link?: string | null
          flight_based_on?: string
          flight_method?: string
          flights_enabled?: boolean
          foursome_registration?: boolean
          fundraising_goal_custom?: boolean
          gallery_position?: string
          gallery_url?: string | null
          golf_course_id?: string | null
          golfers_register_first?: boolean
          group_field_rules?: Json | null
          handicap_allowance?: number | null
          handicap_enabled?: boolean | null
          history?: string | null
          hole_pars?: Json | null
          id?: string
          image_url?: string | null
          is_converted_from_sample?: boolean
          is_demo?: boolean
          is_pro?: boolean
          is_sample?: boolean
          leaderboard_design?: Json
          leaderboard_frozen_at?: string | null
          leaderboard_frozen_by?: string | null
          leaderboard_last_reset_at?: string | null
          leaderboard_last_reset_by?: string | null
          leaderboard_reset_count?: number
          leaderboard_rotating_logos?: Json
          leaderboard_show_sponsor?: boolean
          leaderboard_sponsor_banner_enabled?: boolean
          leaderboard_sponsor_banner_position?: string
          leaderboard_sponsor_interval_ms?: number
          leaderboard_sponsor_label?: string
          leaderboard_sponsor_logo_url?: string | null
          leaderboard_sponsor_name?: string | null
          leaderboard_sponsor_rotation_order?: string
          leaderboard_sponsor_scroll_seconds?: number
          leaderboard_sponsor_style?: string
          leaderboard_title?: string | null
          live_allow_edit_past_holes?: boolean
          live_default_view?: string
          live_display_enabled?: boolean
          live_display_refresh_seconds?: number
          live_leaderboard_enabled?: boolean
          live_require_confirm_save?: boolean
          live_scoring_require_code?: boolean
          live_show_gross?: boolean
          live_show_net?: boolean
          live_show_sponsors?: boolean
          live_sponsor_placement?: string
          location?: string | null
          managed_by_teevents?: boolean
          manual_entries_admin_override?: number
          manual_entries_free_limit?: number
          manual_entries_used?: number
          max_group_size?: number
          max_handicap?: number | null
          max_players?: number | null
          max_waitlist_slots?: number | null
          media_position?: string
          media_tab_title?: string | null
          min_drives_per_player?: number
          mission_statement?: string | null
          org_address?: string | null
          org_contact_email?: string | null
          org_contact_phone?: string | null
          organization_id?: string
          paid_features?: Json
          pairings_locked?: boolean
          pairings_locked_at?: string | null
          pairings_update_email_config?: Json | null
          pass_fees_to_participants?: boolean
          pass_fees_to_registrants?: boolean
          payment_method_override?: string
          payout_method?: string | null
          pin_sheets_enabled?: boolean
          pin_sheets_notes?: string | null
          post_event_email_config?: Json | null
          post_event_email_opt_out?: boolean
          post_event_email_sent?: boolean
          post_event_email_sent_at?: string | null
          post_event_survey_delay_days?: number
          post_event_survey_enabled?: boolean
          post_event_survey_message?: string | null
          post_event_survey_sent_at?: string | null
          printable_font?: string
          printable_layout?: string
          printable_logo_url?: string | null
          printable_options?: Json
          pro_paid_at?: string | null
          pro_payment_intent_id?: string | null
          public_tabs?: Json | null
          public_tabs_order?: string[] | null
          raffle_tab_title?: string | null
          rain_date_policy?: string | null
          rain_date_policy_type?: string | null
          refund_deadline_days?: number | null
          refund_partial_percent?: number | null
          refund_policy?: string | null
          refund_policy_text?: string | null
          refund_policy_type?: string
          registration_fee_cents?: number | null
          registration_intro_html?: string | null
          registration_open?: boolean | null
          registration_promo_html?: string | null
          registration_url?: string | null
          reserve_percentage?: number | null
          results_url?: string | null
          sample_converted_at?: string | null
          sample_converted_to?: string | null
          sample_created_by?: string | null
          sample_last_viewed?: string | null
          sample_token?: string | null
          sample_view_count?: number
          saved_course_id?: string | null
          schedule_info?: string | null
          schedule_info_html?: string | null
          scoring_format?: string
          setup_checklist_dismissed?: boolean
          shootout_rounds?: Json | null
          show_branding_badge?: boolean
          show_branding_footer?: boolean
          show_countdown?: boolean
          show_in_public_search?: boolean
          show_org_tab?: boolean
          show_promo_code_input?: boolean
          show_registration_count?: boolean
          show_sponsorships?: boolean
          side_events_section_title?: string | null
          site_background_color?: string | null
          site_body_font_size?: number | null
          site_button_font_size?: number | null
          site_button_hover_effect?: string | null
          site_button_position?: string | null
          site_button_radius?: number | null
          site_font_family?: string | null
          site_heading_font_size?: number | null
          site_hero_image_url?: string | null
          site_hero_opacity?: number
          site_hero_subtitle?: string | null
          site_hero_title?: string | null
          site_logo_color_mode?: string
          site_logo_color_value?: string | null
          site_logo_offset_x?: number
          site_logo_offset_y?: number
          site_logo_position?: string | null
          site_logo_url?: string | null
          site_primary_color?: string | null
          site_published?: boolean | null
          site_secondary_color?: string | null
          site_show_logo?: boolean | null
          site_text_color?: string | null
          site_title_position?: string | null
          skins_enabled?: boolean
          skins_entry_fee_cents?: number
          skins_mode?: string
          slug?: string | null
          sponsor_custom_notes?: string | null
          sponsor_day_of_email_config?: Json | null
          sponsor_email_config?: Json | null
          sponsor_form_config?: Json
          sponsor_logo_display_size?: string
          sponsor_parking_info?: string | null
          sponsorship_day_of_email_config?: Json | null
          state?: string | null
          status?: string
          store_section_title?: string | null
          team_hq_settings?: Json
          template?: string | null
          test_mode_enabled?: boolean | null
          title?: string
          updated_at?: string
          url_edit_count?: number
          url_edited_at?: string | null
          vendor_booth_fee_cents?: number | null
          vendor_email_config?: Json | null
          vision_statement?: string | null
          waitlist_deposit_cents?: number | null
          waitlist_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_golf_course_id_fkey"
            columns: ["golf_course_id"]
            isOneToOne: false
            referencedRelation: "golf_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_saved_course_id_fkey"
            columns: ["saved_course_id"]
            isOneToOne: false
            referencedRelation: "course_database"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_agenda: {
        Row: {
          activity: string
          created_at: string
          day: string
          id: string
          location: string | null
          notes: string | null
          sort_order: number
          time: string | null
          trip_id: string
        }
        Insert: {
          activity: string
          created_at?: string
          day: string
          id?: string
          location?: string | null
          notes?: string | null
          sort_order?: number
          time?: string | null
          trip_id: string
        }
        Update: {
          activity?: string
          created_at?: string
          day?: string
          id?: string
          location?: string | null
          notes?: string | null
          sort_order?: number
          time?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_agenda_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "golf_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_games: {
        Row: {
          created_at: string
          details: Json
          game_type: string
          id: string
          name: string | null
          trip_id: string
        }
        Insert: {
          created_at?: string
          details?: Json
          game_type: string
          id?: string
          name?: string | null
          trip_id: string
        }
        Update: {
          created_at?: string
          details?: Json
          game_type?: string
          id?: string
          name?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_games_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "golf_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_participants: {
        Row: {
          created_at: string
          dietary_restrictions: string | null
          email: string | null
          handicap_index: number | null
          id: string
          is_organizer: boolean
          name: string
          phone: string | null
          rooming_info: string | null
          shirt_size: string | null
          trip_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          dietary_restrictions?: string | null
          email?: string | null
          handicap_index?: number | null
          id?: string
          is_organizer?: boolean
          name: string
          phone?: string | null
          rooming_info?: string | null
          shirt_size?: string | null
          trip_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          dietary_restrictions?: string | null
          email?: string | null
          handicap_index?: number | null
          id?: string
          is_organizer?: boolean
          name?: string
          phone?: string | null
          rooming_info?: string | null
          shirt_size?: string | null
          trip_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_participants_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "golf_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_payments: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          paid_at: string | null
          participant_id: string | null
          payment_type: string | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          trip_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          paid_at?: string | null
          participant_id?: string | null
          payment_type?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          trip_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          paid_at?: string | null
          participant_id?: string | null
          payment_type?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_payments_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "trip_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_payments_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "golf_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_rooms: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          occupants: Json
          room_number: string | null
          room_type: string | null
          trip_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          occupants?: Json
          room_number?: string | null
          room_type?: string | null
          trip_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          occupants?: Json
          room_number?: string | null
          room_type?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_rooms_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "golf_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_skins: {
        Row: {
          amount_cents: number
          created_at: string
          day: string | null
          hole_number: number | null
          id: string
          status: string
          trip_id: string
          winning_participant_id: string | null
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          day?: string | null
          hole_number?: number | null
          id?: string
          status?: string
          trip_id: string
          winning_participant_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          day?: string | null
          hole_number?: number | null
          id?: string
          status?: string
          trip_id?: string
          winning_participant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_skins_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "golf_trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_skins_winning_participant_id_fkey"
            columns: ["winning_participant_id"]
            isOneToOne: false
            referencedRelation: "trip_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_tee_times: {
        Row: {
          course_name: string | null
          created_at: string
          day: string
          group_name: string | null
          id: string
          players: Json
          tee_time: string
          trip_id: string
        }
        Insert: {
          course_name?: string | null
          created_at?: string
          day: string
          group_name?: string | null
          id?: string
          players?: Json
          tee_time: string
          trip_id: string
        }
        Update: {
          course_name?: string | null
          created_at?: string
          day?: string
          group_name?: string | null
          id?: string
          players?: Json
          tee_time?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_tee_times_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "golf_trips"
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
      vendor_booth_locations: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string | null
          id: string
          is_available: boolean
          location_name: string
          tournament_id: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_available?: boolean
          location_name: string
          tournament_id: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_available?: boolean
          location_name?: string
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_booth_locations_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "vendor_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_booth_locations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_forms: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          questions: Json
          tournament_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          questions?: Json
          tournament_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          questions?: Json
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_forms_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: true
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_registrations: {
        Row: {
          amount_cents: number
          answers: Json | null
          booth_fee_cents: number | null
          booth_location: string | null
          business_type: string | null
          check_in_code: string | null
          checked_in: boolean
          checked_in_at: string | null
          company_name: string | null
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          manually_approved: boolean
          notes: string | null
          paid_at: string | null
          payment_status: string
          reminder_day_sent_at: string | null
          reminder_week_sent_at: string | null
          show_on_public: boolean
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          tier_id: string | null
          tournament_id: string
          updated_at: string
          vendor_name: string
          website_url: string | null
        }
        Insert: {
          amount_cents?: number
          answers?: Json | null
          booth_fee_cents?: number | null
          booth_location?: string | null
          business_type?: string | null
          check_in_code?: string | null
          checked_in?: boolean
          checked_in_at?: string | null
          company_name?: string | null
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          manually_approved?: boolean
          notes?: string | null
          paid_at?: string | null
          payment_status?: string
          reminder_day_sent_at?: string | null
          reminder_week_sent_at?: string | null
          show_on_public?: boolean
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          tier_id?: string | null
          tournament_id: string
          updated_at?: string
          vendor_name: string
          website_url?: string | null
        }
        Update: {
          amount_cents?: number
          answers?: Json | null
          booth_fee_cents?: number | null
          booth_location?: string | null
          business_type?: string | null
          check_in_code?: string | null
          checked_in?: boolean
          checked_in_at?: string | null
          company_name?: string | null
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          manually_approved?: boolean
          notes?: string | null
          paid_at?: string | null
          payment_status?: string
          reminder_day_sent_at?: string | null
          reminder_week_sent_at?: string | null
          show_on_public?: boolean
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          tier_id?: string | null
          tournament_id?: string
          updated_at?: string
          vendor_name?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_registrations_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "vendor_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_registrations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_tiers: {
        Row: {
          benefits: string | null
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          price_cents: number
          published_to_public: boolean
          spots_used: number
          total_spots: number | null
          tournament_id: string
          updated_at: string
        }
        Insert: {
          benefits?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          price_cents?: number
          published_to_public?: boolean
          spots_used?: number
          total_spots?: number | null
          tournament_id: string
          updated_at?: string
        }
        Update: {
          benefits?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          price_cents?: number
          published_to_public?: boolean
          spots_used?: number
          total_spots?: number | null
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_tiers_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _storage_first_folder_uuid: { Args: { _name: string }; Returns: string }
      admin_get_sample_tournament: {
        Args: { _id: string }
        Returns: {
          admin_id: string | null
          created_at: string
          crm_notes: string | null
          crm_status: string | null
          description: string | null
          event_date: string | null
          hero_image_url: string | null
          id: string
          last_accessed_at: string | null
          last_contacted_at: string | null
          location: string | null
          logo_url: string | null
          prospect_company: string | null
          prospect_email: string | null
          prospect_name: string | null
          prospect_source: string | null
          registration_fee_cents: number | null
          scoring_format: string | null
          team_fee_cents: number | null
          tournament_name: string
          unique_slug: string
          updated_at: string
          view_count: number
        }[]
        SetofOptions: {
          from: "*"
          to: "sample_tournaments"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_grant_manual_entries: {
        Args: { _additional: number; _reason: string; _tournament_id: string }
        Returns: undefined
      }
      admin_list_sample_tournaments: {
        Args: never
        Returns: {
          admin_id: string | null
          created_at: string
          crm_notes: string | null
          crm_status: string | null
          description: string | null
          event_date: string | null
          hero_image_url: string | null
          id: string
          last_accessed_at: string | null
          last_contacted_at: string | null
          location: string | null
          logo_url: string | null
          prospect_company: string | null
          prospect_email: string | null
          prospect_name: string | null
          prospect_source: string | null
          registration_fee_cents: number | null
          scoring_format: string | null
          team_fee_cents: number | null
          tournament_name: string
          unique_slug: string
          updated_at: string
          view_count: number
        }[]
        SetofOptions: {
          from: "*"
          to: "sample_tournaments"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      attach_sample_viewer: {
        Args: { _org_id: string; _viewer_id: string }
        Returns: boolean
      }
      bump_sample_view: { Args: { _token: string }; Returns: string }
      check_auth_rate_limit: {
        Args: {
          _action: string
          _ip: string
          _max: number
          _window_seconds: number
        }
        Returns: Json
      }
      college_tournament_accepts_registration: {
        Args: { _tournament_id: string }
        Returns: boolean
      }
      delete_old_demo_tournaments: { Args: never; Returns: number }
      find_leagues: {
        Args: { _query: string }
        Returns: {
          is_active: boolean
          is_member: boolean
          league_name: string
          league_slug: string
          season_year: number
        }[]
      }
      generate_league_team_scoring_code: { Args: never; Returns: string }
      get_age_update_target: {
        Args: { _token: string }
        Returns: {
          current_age: string
          player_name: string
          registration_id: string
          tournament_name: string
          tournament_slug: string
        }[]
      }
      get_auction_items_for_manager: {
        Args: { _tournament_id: string }
        Returns: {
          buy_now_price: number
          created_at: string
          current_bid: number
          description: string
          id: string
          image_url: string
          is_active: boolean
          raffle_ticket_price: number
          sort_order: number
          starting_bid: number
          title: string
          tournament_id: string
          type: string
          winner_email: string
          winner_name: string
        }[]
      }
      get_college_invitation_by_token: {
        Args: { _token: string; _tournament_id: string }
        Returns: {
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
        }[]
        SetofOptions: {
          from: "*"
          to: "college_tournament_invitations"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_day_of_player: {
        Args: { _code: string; _tournament_id: string }
        Returns: Json
      }
      get_demo_claim_by_token: {
        Args: { _token: string }
        Returns: {
          demo_conversion_discount_type: string
          demo_conversion_discount_value: number
          demo_conversion_is_test: boolean
          demo_conversion_token_expires_at: string
          demo_conversion_used_at: string
          demo_converted_at: string
          demo_prospect_email: string
          demo_prospect_name: string
          id: string
          title: string
        }[]
      }
      get_demo_conversion_discount: { Args: { _token: string }; Returns: Json }
      get_demo_prep_share: { Args: { _token: string }; Returns: Json }
      get_group_scoring_roster: {
        Args: { _code: string; _tournament_id: string }
        Returns: {
          course_handicap: number
          first_name: string
          group_position: number
          handicap: number
          id: string
          last_name: string
          playing_handicap: number
        }[]
      }
      get_league_event_leaderboard: {
        Args: { _event_id: string }
        Returns: Json
      }
      get_league_season_standings: {
        Args: { _league_slug: string }
        Returns: {
          losses: number
          matches_played: number
          member_id: string
          member_name: string
          points: number
          prize_money_cents: number
          ties: number
          total_gross: number
          total_net: number
          wins: number
        }[]
      }
      get_live_scoring_group: {
        Args: { _group_number: number; _tournament_id: string }
        Returns: Json
      }
      get_member_event_registration: {
        Args: { _code: string; _event_id: string; _league_slug: string }
        Returns: {
          created_at: string
          event_id: string
          fee_paid: boolean
          fee_tier_amount_cents: number
          fee_tier_id: string
          fee_tier_label: string
          id: string
          member_id: string
          paid_at: string
          pairing_group: number
          registration_fee_paid: boolean
          status: string
          team_name: string
          tee_time: string
        }[]
      }
      get_player_hub_by_token: {
        Args: { _token: string }
        Returns: {
          course_name: string
          first_name: string
          group_number: number
          group_position: number
          last_name: string
          organization_id: string
          registration_id: string
          scoring_code: string
          tournament_date: string
          tournament_id: string
          tournament_slug: string
          tournament_title: string
        }[]
      }
      get_public_auctions: {
        Args: { _tournament_id: string }
        Returns: {
          auto_extend_minutes: number
          buy_now_cents: number
          created_at: string
          current_bid_cents: number
          description: string
          end_time: string
          id: string
          images: string[]
          item_name: string
          minimum_increment_cents: number
          start_time: string
          starting_bid_cents: number
          status: string
          tournament_id: string
          updated_at: string
          winning_bid_amount_cents: number
          winning_bidder_name: string
        }[]
      }
      get_public_donation_total: {
        Args: { _tournament_id: string }
        Returns: number
      }
      get_public_leaderboard_scores: {
        Args: { _tournament_id: string }
        Returns: {
          first_name: string
          group_number: number
          hole_number: number
          last_name: string
          registration_id: string
          strokes: number
          team_name: string
        }[]
      }
      get_public_league_member_names: {
        Args: { _league_id: string }
        Returns: {
          handicap_index: number
          id: string
          member_name: string
        }[]
      }
      get_public_raffles: {
        Args: { _tournament_id: string }
        Returns: {
          created_at: string
          description: string
          draw_time: string
          id: string
          images: string[]
          item_name: string
          max_tickets: number
          status: string
          ticket_price_cents: number
          tickets_sold: number
          tournament_id: string
          updated_at: string
          winner_name: string
          winner_ticket_number: number
        }[]
      }
      get_public_sponsor_registrations: {
        Args: { _tournament_id: string }
        Returns: {
          company_name: string
          description: string
          id: string
          is_title_sponsor: boolean
          logo_url: string
          manually_approved: boolean
          payment_status: string
          show_on_leaderboard: boolean
          show_on_public: boolean
          tier_id: string
          tournament_id: string
          website_url: string
        }[]
      }
      get_public_team_roster: {
        Args: { _tournament_id: string }
        Returns: {
          first_name: string
          group_number: number
          group_position: number
          last_name: string
          registration_id: string
          scoring_code: string
          team_name: string
          tee_time: string
        }[]
      }
      get_public_tournament_site: { Args: { _slug: string }; Returns: Json }
      get_public_vendor_registrations: {
        Args: { _tournament_id: string }
        Returns: {
          booth_location: string
          business_type: string
          company_name: string
          description: string
          id: string
          logo_url: string
          manually_approved: boolean
          payment_status: string
          show_on_public: boolean
          tier_id: string
          tournament_id: string
          vendor_name: string
          website_url: string
        }[]
      }
      get_refund_request_by_token: {
        Args: { _token: string }
        Returns: {
          admin_notes: string | null
          amount_cents: number
          claim_token: string
          created_at: string
          id: string
          reason: string
          registration_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          stripe_refund_id: string | null
          tournament_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "tournament_refund_requests"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_score_edit_history: {
        Args: { _limit?: number; _tournament_id: string }
        Returns: {
          created_at: string
          edited_by: string
          editor_email: string
          editor_type: string
          hole_number: number
          id: string
          new_score: number
          notes: string
          old_score: number
          player_first_name: string
          player_last_name: string
          registration_id: string
          tournament_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_event_ticket_sold: {
        Args: { _qty: number; _tier_id: string }
        Returns: undefined
      }
      increment_sample_view: { Args: { _slug: string }; Returns: undefined }
      is_org_admin_or_owner: {
        Args: { _org_id: string; _user_id: string }
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
      is_trip_organizer: {
        Args: { _trip_id: string; _user_id: string }
        Returns: boolean
      }
      live_scoring_lookup_group: {
        Args: { _email: string; _scoring_code: string; _tournament_id: string }
        Returns: number
      }
      lookup_league_member_by_code: {
        Args: { _code: string; _league_slug: string }
        Returns: {
          avg_18_score: number
          avg_9_score: number
          course_handicap: number
          email: string
          handicap_index: number
          id: string
          is_active: boolean
          join_date: string
          league_id: string
          member_name: string
          membership_fee_cents: number
          membership_fee_paid: boolean
          membership_status: string
          phone: string
          playing_handicap: number
          profile_image_url: string
          scoring_code: string
          shirt_size: string
        }[]
      }
      lookup_league_member_code_by_email: {
        Args: { _email: string; _league_id: string }
        Returns: string
      }
      lookup_league_team_by_code: { Args: { _code: string }; Returns: Json }
      lookup_player_scoring_code: {
        Args: { _code: string; _tournament_id: string }
        Returns: string
      }
      lookup_scoring_access: {
        Args: { _code: string; _slug: string }
        Returns: {
          course_par: number
          hole_pars: Json
          kind: string
          live_allow_edit_past_holes: boolean
          live_leaderboard_enabled: boolean
          live_require_confirm_save: boolean
          route_slug: string
          title: string
          tournament_id: string
        }[]
      }
      mark_day_of_check_in: {
        Args: { _code: string; _tournament_id: string }
        Returns: Json
      }
      mark_demo_lead_started: {
        Args: { _id: string; _role: string; _user_agent: string }
        Returns: undefined
      }
      member_submit_score: {
        Args: {
          _code: string
          _event_id: string
          _gross: number
          _hole: number
          _league_slug: string
        }
        Returns: undefined
      }
      notify_sample_upgrade_interest: {
        Args: {
          _email?: string
          _message?: string
          _name?: string
          _token: string
        }
        Returns: boolean
      }
      org_has_active_league_subscription: {
        Args: { _org_id: string }
        Returns: boolean
      }
      org_is_demo_only: { Args: { _org_id: string }; Returns: boolean }
      push_admin_notification: {
        Args: {
          _link?: string
          _message: string
          _org?: string
          _title: string
          _type: string
        }
        Returns: undefined
      }
      recalculate_league_handicaps: {
        Args: { _league_id: string }
        Returns: number
      }
      recalculate_member_handicap: {
        Args: { _member_id: string }
        Returns: number
      }
      recompute_tournament_setup_progress: {
        Args: { _tournament_id: string }
        Returns: undefined
      }
      record_manual_entry:
        | {
            Args: {
              _amount_cents: number
              _confirm_fee: boolean
              _entity_id: string
              _entity_type: string
              _tournament_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              _amount_cents: number
              _confirm_fee: boolean
              _entity_id: string
              _entity_type: string
              _payment_method?: string
              _tournament_id: string
            }
            Returns: Json
          }
      record_org_login: {
        Args: { _organization_id: string; _user_agent?: string }
        Returns: undefined
      }
      record_site_visit: {
        Args: {
          _city?: string
          _country?: string
          _ip?: string
          _path: string
          _referrer?: string
          _user_agent?: string
        }
        Returns: undefined
      }
      regenerate_player_qr_token: {
        Args: { _registration_id: string }
        Returns: string
      }
      resolve_public_tournament: {
        Args: { _slug: string }
        Returns: {
          custom_slug: string
          id: string
          site_published: boolean
          slug: string
          title: string
        }[]
      }
      sample_viewer_user_id: { Args: never; Returns: string }
      save_group_scores: {
        Args: { _code: string; _scores: Json; _tournament_id: string }
        Returns: undefined
      }
      save_league_team_scores: {
        Args: { _code: string; _scores: Json }
        Returns: Json
      }
      settle_manual_entry_liabilities: {
        Args: { _max_deduct_cents: number; _organization_id: string }
        Returns: number
      }
      submit_age_update: {
        Args: { _age: number; _token: string }
        Returns: boolean
      }
      update_college_invitation_rsvp_by_token: {
        Args: { _response: string; _token: string }
        Returns: {
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
        SetofOptions: {
          from: "*"
          to: "college_tournament_invitations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_demo_lead_feedback: {
        Args: { _id: string; _reasons: string[]; _score: number; _text: string }
        Returns: undefined
      }
      validate_league_promo_code: {
        Args: { _base_cents: number; _code: string }
        Returns: Json
      }
      validate_promoter_ref_code: {
        Args: { _ref_code: string; _tournament_id: string }
        Returns: {
          id: string
          is_active: boolean
          tournament_id: string
        }[]
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
