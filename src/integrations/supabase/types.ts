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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          actor_user_id: string
          created_at: string
          details: Json
          id: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_user_id: string
          created_at?: string
          details?: Json
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string
          created_at?: string
          details?: Json
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      content_access: {
        Row: {
          content_id: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          content_id: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          content_id?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "content_access_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
        ]
      }
      content_categories: {
        Row: {
          allowed_roles: string[] | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
        }
        Insert: {
          allowed_roles?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
        }
        Update: {
          allowed_roles?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      content_views: {
        Row: {
          content_id: string
          id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          content_id: string
          id?: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          content_id?: string
          id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_views_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
        ]
      }
      contents: {
        Row: {
          category: string
          content_type: string
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          external_url: string | null
          file_url: string | null
          id: string
          is_featured: boolean
          is_pinned: boolean
          is_required: boolean
          organization_id: string
          start_date: string
          store_id: string | null
          title: string
        }
        Insert: {
          category?: string
          content_type?: string
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          external_url?: string | null
          file_url?: string | null
          id?: string
          is_featured?: boolean
          is_pinned?: boolean
          is_required?: boolean
          organization_id: string
          start_date?: string
          store_id?: string | null
          title: string
        }
        Update: {
          category?: string
          content_type?: string
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          external_url?: string | null
          file_url?: string | null
          id?: string
          is_featured?: boolean
          is_pinned?: boolean
          is_required?: boolean
          organization_id?: string
          start_date?: string
          store_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "contents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contents_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      culture: {
        Row: {
          id: string
          mission: string
          organization_id: string
          updated_at: string
          values: string
          vision: string
        }
        Insert: {
          id?: string
          mission?: string
          organization_id: string
          updated_at?: string
          values?: string
          vision?: string
        }
        Update: {
          id?: string
          mission?: string
          organization_id?: string
          updated_at?: string
          values?: string
          vision?: string
        }
        Relationships: [
          {
            foreignKeyName: "culture_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          organization_id: string
          profile_type:
            | Database["public"]["Enums"]["customer_profile_type"]
            | null
          status: string
          store_id: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          profile_type?:
            | Database["public"]["Enums"]["customer_profile_type"]
            | null
          status?: string
          store_id: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          profile_type?:
            | Database["public"]["Enums"]["customer_profile_type"]
            | null
          status?: string
          store_id?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      followups: {
        Row: {
          completed_at: string | null
          created_at: string
          customer_id: string
          due_date: string | null
          id: string
          notes: string | null
          organization_id: string
          seller_id: string
          status: Database["public"]["Enums"]["followup_status"]
          store_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          customer_id: string
          due_date?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          seller_id: string
          status?: Database["public"]["Enums"]["followup_status"]
          store_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          seller_id?: string
          status?: Database["public"]["Enums"]["followup_status"]
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "followups_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followups_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_plans: {
        Row: {
          applied_goal_value: number | null
          break_even_value: number
          calculation_notes: string | null
          created_at: string
          created_by: string
          desired_growth_rate: number
          distribution_mode: string | null
          id: string
          inflation_rate: number
          market_growth_rate: number
          organization_id: string
          period_type: string
          planning_mode: string
          previous_revenue: number
          reference_period_end: string
          reference_period_start: string
          store_id: string | null
          suggested_goal_value: number
          target_period_end: string
          target_period_start: string
          viability_status: string | null
        }
        Insert: {
          applied_goal_value?: number | null
          break_even_value?: number
          calculation_notes?: string | null
          created_at?: string
          created_by: string
          desired_growth_rate?: number
          distribution_mode?: string | null
          id?: string
          inflation_rate?: number
          market_growth_rate?: number
          organization_id: string
          period_type?: string
          planning_mode?: string
          previous_revenue?: number
          reference_period_end: string
          reference_period_start: string
          store_id?: string | null
          suggested_goal_value?: number
          target_period_end: string
          target_period_start: string
          viability_status?: string | null
        }
        Update: {
          applied_goal_value?: number | null
          break_even_value?: number
          calculation_notes?: string | null
          created_at?: string
          created_by?: string
          desired_growth_rate?: number
          distribution_mode?: string | null
          id?: string
          inflation_rate?: number
          market_growth_rate?: number
          organization_id?: string
          period_type?: string
          planning_mode?: string
          previous_revenue?: number
          reference_period_end?: string
          reference_period_start?: string
          store_id?: string | null
          suggested_goal_value?: number
          target_period_end?: string
          target_period_start?: string
          viability_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goal_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_plans_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          current_value: number
          end_date: string | null
          goal_plan_id: string | null
          id: string
          organization_id: string
          parent_goal_id: string | null
          period_start: string
          period_type: Database["public"]["Enums"]["period_type"]
          source: string | null
          start_date: string | null
          store_id: string | null
          target_value: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          current_value?: number
          end_date?: string | null
          goal_plan_id?: string | null
          id?: string
          organization_id: string
          parent_goal_id?: string | null
          period_start?: string
          period_type?: Database["public"]["Enums"]["period_type"]
          source?: string | null
          start_date?: string | null
          store_id?: string | null
          target_value?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          current_value?: number
          end_date?: string | null
          goal_plan_id?: string | null
          id?: string
          organization_id?: string
          parent_goal_id?: string | null
          period_start?: string
          period_type?: Database["public"]["Enums"]["period_type"]
          source?: string | null
          start_date?: string | null
          store_id?: string | null
          target_value?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goals_goal_plan_id_fkey"
            columns: ["goal_plan_id"]
            isOneToOne: false
            referencedRelation: "goal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_parent_goal_id_fkey"
            columns: ["parent_goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_sections: {
        Row: {
          content: string
          created_at: string
          id: string
          organization_id: string
          sort_order: number
          title: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          organization_id: string
          sort_order?: number
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          organization_id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_sections_organization_id_fkey"
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
          id: string
          logo_url: string | null
          name: string
          primary_color: string | null
          secondary_color: string | null
          short_name: string | null
          tagline: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          primary_color?: string | null
          secondary_color?: string | null
          short_name?: string | null
          tagline?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          short_name?: string | null
          tagline?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          created_via: string
          email: string
          id: string
          manager_can_sell: boolean
          name: string
          organization_id: string | null
          store_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          created_via?: string
          email: string
          id: string
          manager_can_sell?: boolean
          name: string
          organization_id?: string | null
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          created_via?: string
          email?: string
          id?: string
          manager_can_sell?: boolean
          name?: string
          organization_id?: string | null
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_steps: {
        Row: {
          budget_identified: boolean | null
          closing_attempted: boolean | null
          created_at: string
          diagnostic_done: boolean | null
          directed_choice: boolean | null
          id: string
          objection_handled: boolean | null
          presented_benefits: boolean | null
          sale_id: string
        }
        Insert: {
          budget_identified?: boolean | null
          closing_attempted?: boolean | null
          created_at?: string
          diagnostic_done?: boolean | null
          directed_choice?: boolean | null
          id?: string
          objection_handled?: boolean | null
          presented_benefits?: boolean | null
          sale_id: string
        }
        Update: {
          budget_identified?: boolean | null
          closing_attempted?: boolean | null
          created_at?: string
          diagnostic_done?: boolean | null
          directed_choice?: boolean | null
          id?: string
          objection_handled?: boolean | null
          presented_benefits?: boolean | null
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_steps_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          closing_type: string | null
          created_at: string
          customer_id: string | null
          driver: Database["public"]["Enums"]["customer_profile_type"] | null
          id: string
          notes: string | null
          objection_description: string | null
          objection_reason: string | null
          organization_id: string
          product_type: string | null
          products_count: number | null
          products_shown_count: number | null
          seller_id: string
          status: Database["public"]["Enums"]["sale_status"]
          store_id: string
          total_value: number | null
        }
        Insert: {
          closing_type?: string | null
          created_at?: string
          customer_id?: string | null
          driver?: Database["public"]["Enums"]["customer_profile_type"] | null
          id?: string
          notes?: string | null
          objection_description?: string | null
          objection_reason?: string | null
          organization_id: string
          product_type?: string | null
          products_count?: number | null
          products_shown_count?: number | null
          seller_id: string
          status: Database["public"]["Enums"]["sale_status"]
          store_id: string
          total_value?: number | null
        }
        Update: {
          closing_type?: string | null
          created_at?: string
          customer_id?: string | null
          driver?: Database["public"]["Enums"]["customer_profile_type"] | null
          id?: string
          notes?: string | null
          objection_description?: string | null
          objection_reason?: string | null
          organization_id?: string
          product_type?: string | null
          products_count?: number | null
          products_shown_count?: number | null
          seller_id?: string
          status?: Database["public"]["Enums"]["sale_status"]
          store_id?: string
          total_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_action_plans: {
        Row: {
          action: string
          created_at: string
          created_by: string
          due_date: string | null
          id: string
          issue: string
          organization_id: string
          responsible: string | null
          source: string | null
          status: string
          store_id: string
          updated_at: string
        }
        Insert: {
          action: string
          created_at?: string
          created_by: string
          due_date?: string | null
          id?: string
          issue: string
          organization_id: string
          responsible?: string | null
          source?: string | null
          status?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          action?: string
          created_at?: string
          created_by?: string
          due_date?: string | null
          id?: string
          issue?: string
          organization_id?: string
          responsible?: string | null
          source?: string | null
          status?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_action_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_action_plans_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_visits: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          store_id: string
          supervisor_id: string
          visit_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          store_id: string
          supervisor_id: string
          visit_date: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          store_id?: string
          supervisor_id?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_visits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_visits_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          active: boolean
          city: string | null
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          active?: boolean
          city?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          active?: boolean
          city?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stores_organization_id_fkey"
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
      visit_actions: {
        Row: {
          action: string
          created_at: string
          due_date: string | null
          id: string
          issue: string
          responsible: string | null
          status: string
          visit_id: string
        }
        Insert: {
          action: string
          created_at?: string
          due_date?: string | null
          id?: string
          issue: string
          responsible?: string | null
          status?: string
          visit_id: string
        }
        Update: {
          action?: string
          created_at?: string
          due_date?: string | null
          id?: string
          issue?: string
          responsible?: string | null
          status?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_actions_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "store_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_checklists: {
        Row: {
          attempted_closing: boolean | null
          campaign_active: boolean | null
          follows_process: boolean | null
          id: string
          notes: string | null
          system_usage: boolean | null
          visit_id: string
        }
        Insert: {
          attempted_closing?: boolean | null
          campaign_active?: boolean | null
          follows_process?: boolean | null
          id?: string
          notes?: string | null
          system_usage?: boolean | null
          visit_id: string
        }
        Update: {
          attempted_closing?: boolean | null
          campaign_active?: boolean | null
          follows_process?: boolean | null
          id?: string
          notes?: string | null
          system_usage?: boolean | null
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_checklists_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "store_visits"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_admin_manage_user: {
        Args: { _target_user_id: string }
        Returns: boolean
      }
      get_daily_metrics: {
        Args: { _date?: string; _store_id: string }
        Returns: {
          avg_pa: number
          avg_ticket: number
          conversion_rate: number
          total_attendances: number
          total_sales: number
          total_value: number
          won_sales: number
        }[]
      }
      get_seller_ranking: {
        Args: { _date?: string; _store_id: string }
        Returns: {
          avg_pa: number
          conversion_rate: number
          seller_id: string
          seller_name: string
          total_count: number
          total_value: number
          won_count: number
        }[]
      }
      get_seller_ranking_period: {
        Args: { _end_date: string; _start_date: string; _store_id: string }
        Returns: {
          avg_pa: number
          avg_ticket: number
          conversion_rate: number
          seller_id: string
          seller_name: string
          total_count: number
          total_value: number
          won_count: number
        }[]
      }
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      get_user_store_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_can_access_content: {
        Args: { _content_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "seller" | "supervisor" | "super_admin"
      customer_profile_type: "price" | "quality" | "style" | "urgency"
      followup_status: "pending" | "completed" | "cancelled"
      period_type: "daily" | "weekly" | "monthly"
      sale_status: "won" | "lost"
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
      app_role: ["admin", "manager", "seller", "supervisor", "super_admin"],
      customer_profile_type: ["price", "quality", "style", "urgency"],
      followup_status: ["pending", "completed", "cancelled"],
      period_type: ["daily", "weekly", "monthly"],
      sale_status: ["won", "lost"],
    },
  },
} as const
