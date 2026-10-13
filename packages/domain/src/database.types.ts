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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      bus_positions: {
        Row: {
          distance_m: number
          heading: number | null
          latitude: number
          longitude: number
          recorded_at: string
          speed_mps: number | null
          trip_id: string
        }
        Insert: {
          distance_m: number
          heading?: number | null
          latitude: number
          longitude: number
          recorded_at?: string
          speed_mps?: number | null
          trip_id: string
        }
        Update: {
          distance_m?: number
          heading?: number | null
          latitude?: number
          longitude?: number
          recorded_at?: string
          speed_mps?: number | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bus_positions_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: true
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      buses: {
        Row: {
          created_at: string
          id: string
          layout_id: string
          plate: string
          status: Database["public"]["Enums"]["bus_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          layout_id: string
          plate: string
          status?: Database["public"]["Enums"]["bus_status"]
        }
        Update: {
          created_at?: string
          id?: string
          layout_id?: string
          plate?: string
          status?: Database["public"]["Enums"]["bus_status"]
        }
        Relationships: [
          {
            foreignKeyName: "buses_layout_id_fkey"
            columns: ["layout_id"]
            isOneToOne: false
            referencedRelation: "seat_layouts"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          created_at: string
          first_name: string
          id: string
          last_name: string
          status: Database["public"]["Enums"]["driver_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          first_name: string
          id: string
          last_name: string
          status?: Database["public"]["Enums"]["driver_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          status?: Database["public"]["Enums"]["driver_status"]
          updated_at?: string
        }
        Relationships: []
      }
      fare_rules: {
        Row: {
          active: boolean
          base_pesewas: number
          booking_fee_pesewas: number
          created_at: string
          id: string
          note: string | null
          peak_multiplier: number
          per_km_pesewas: number
          platform_fee_bps: number
          route_code: string
        }
        Insert: {
          active?: boolean
          base_pesewas?: number
          booking_fee_pesewas: number
          created_at?: string
          id?: string
          note?: string | null
          peak_multiplier?: number
          per_km_pesewas: number
          platform_fee_bps: number
          route_code: string
        }
        Update: {
          active?: boolean
          base_pesewas?: number
          booking_fee_pesewas?: number
          created_at?: string
          id?: string
          note?: string | null
          peak_multiplier?: number
          per_km_pesewas?: number
          platform_fee_bps?: number
          route_code?: string
        }
        Relationships: []
      }
      otp_requests: {
        Row: {
          attempts: number
          channel: string
          identifier: string
          requested_at: string
        }
        Insert: {
          attempts?: number
          channel: string
          identifier: string
          requested_at?: string
        }
        Update: {
          attempts?: number
          channel?: string
          identifier?: string
          requested_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_pesewas: number
          attempts: number
          created_at: string
          expires_at: string
          failure_reason: string | null
          id: string
          method: string | null
          paid_at: string | null
          passenger_id: string
          provider: string | null
          provider_ref: string | null
          status: string
          trip_id: string
        }
        Insert: {
          amount_pesewas: number
          attempts?: number
          created_at?: string
          expires_at: string
          failure_reason?: string | null
          id?: string
          method?: string | null
          paid_at?: string | null
          passenger_id: string
          provider?: string | null
          provider_ref?: string | null
          status?: string
          trip_id: string
        }
        Update: {
          amount_pesewas?: number
          attempts?: number
          created_at?: string
          expires_at?: string
          failure_reason?: string | null
          id?: string
          method?: string | null
          paid_at?: string | null
          passenger_id?: string
          provider?: string | null
          provider_ref?: string | null
          status?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_name: string
          created_at: string
          first_name: string
          id: string
          last_name: string
          onboarded_at: string | null
          residential_area: string
          terms_accepted_at: string | null
          terms_version: string | null
          updated_at: string
          work_location: string
        }
        Insert: {
          company_name: string
          created_at?: string
          first_name: string
          id: string
          last_name: string
          onboarded_at?: string | null
          residential_area: string
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
          work_location: string
        }
        Update: {
          company_name?: string
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          onboarded_at?: string | null
          residential_area?: string
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
          work_location?: string
        }
        Relationships: []
      }
      route_paths: {
        Row: {
          path: Json
          route_id: string
        }
        Insert: {
          path: Json
          route_id: string
        }
        Update: {
          path?: Json
          route_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_paths_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: true
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      route_stops: {
        Row: {
          distance_m: number
          route_id: string
          stop_id: string
          stop_idx: number
        }
        Insert: {
          distance_m: number
          route_id: string
          stop_id: string
          stop_idx: number
        }
        Update: {
          distance_m?: number
          route_id?: string
          stop_id?: string
          stop_idx?: number
        }
        Relationships: [
          {
            foreignKeyName: "route_stops_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_stops_stop_id_fkey"
            columns: ["stop_id"]
            isOneToOne: false
            referencedRelation: "stops"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          code: string
          created_at: string
          direction: Database["public"]["Enums"]["route_direction"]
          free_flow_s: number | null
          id: string
          length_m: number
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          direction: Database["public"]["Enums"]["route_direction"]
          free_flow_s?: number | null
          id?: string
          length_m: number
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          direction?: Database["public"]["Enums"]["route_direction"]
          free_flow_s?: number | null
          id?: string
          length_m?: number
          name?: string
        }
        Relationships: []
      }
      seat_layouts: {
        Row: {
          grid: Json
          id: string
          name: string
          seat_count: number
        }
        Insert: {
          grid: Json
          id?: string
          name: string
          seat_count: number
        }
        Update: {
          grid?: Json
          id?: string
          name?: string
          seat_count?: number
        }
        Relationships: []
      }
      stops: {
        Row: {
          created_at: string
          id: string
          latitude: number
          longitude: number
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          name?: string
        }
        Relationships: []
      }
      ticket_shares: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string
          ticket_id: string
          token: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at: string
          ticket_id: string
          token?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string
          ticket_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_shares_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: true
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          created_at: string
          dropoff_idx: number
          fare_pesewas: number
          hold_expires_at: string | null
          id: string
          passenger_id: string | null
          payment_id: string | null
          pickup_idx: number
          qr_token: string
          seat_no: number
          status: Database["public"]["Enums"]["ticket_status"]
          ticket_code: string
          trip_id: string
        }
        Insert: {
          created_at?: string
          dropoff_idx: number
          fare_pesewas: number
          hold_expires_at?: string | null
          id?: string
          passenger_id?: string | null
          payment_id?: string | null
          pickup_idx: number
          qr_token?: string
          seat_no: number
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_code?: string
          trip_id: string
        }
        Update: {
          created_at?: string
          dropoff_idx?: number
          fare_pesewas?: number
          hold_expires_at?: string | null
          id?: string
          passenger_id?: string | null
          payment_id?: string | null
          pickup_idx?: number
          qr_token?: string
          seat_no?: number
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_code?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          bus_id: string
          created_at: string
          departs_at: string
          id: string
          route_id: string
          status: Database["public"]["Enums"]["trip_status"]
        }
        Insert: {
          bus_id: string
          created_at?: string
          departs_at: string
          id?: string
          route_id: string
          status?: Database["public"]["Enums"]["trip_status"]
        }
        Update: {
          bus_id?: string
          created_at?: string
          departs_at?: string
          id?: string
          route_id?: string
          status?: Database["public"]["Enums"]["trip_status"]
        }
        Relationships: [
          {
            foreignKeyName: "trips_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount_pesewas: number
          created_at: string
          id: string
          kind: string
          passenger_id: string
          payment_id: string | null
        }
        Insert: {
          amount_pesewas: number
          created_at?: string
          id?: string
          kind: string
          passenger_id: string
          payment_id?: string | null
        }
        Update: {
          amount_pesewas?: number
          created_at?: string
          id?: string
          kind?: string
          passenger_id?: string
          payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance_pesewas: number
          passenger_id: string
          updated_at: string
        }
        Insert: {
          balance_pesewas?: number
          passenger_id: string
          updated_at?: string
        }
        Update: {
          balance_pesewas?: number
          passenger_id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      confirm_payment: {
        Args: {
          p_method: string
          p_payment_id: string
          p_provider: string
          p_provider_ref: string
        }
        Returns: string
      }
      hold_seats: {
        Args: { p_pickup_stop_id: string; p_seats: Json; p_trip_id: string }
        Returns: Json
      }
      my_wallet: { Args: never; Returns: number }
      new_ticket_code: { Args: never; Returns: string }
      record_payment_failure: {
        Args: { p_method: string; p_payment_id: string; p_reason: string }
        Returns: undefined
      }
      release_expired_holds: { Args: { p_trip_id: string }; Returns: undefined }
      seat_fare_pesewas: {
        Args: { p_distance_m: number; p_route_code: string }
        Returns: number
      }
      share_ticket: { Args: { p_ticket_id: string }; Returns: string }
      shared_ticket: { Args: { p_token: string }; Returns: Json }
      trip_can_board_at: {
        Args: { p_pickup_idx: number; p_trip_id: string }
        Returns: boolean
      }
      trip_options: {
        Args: { p_dropoff_stop_id: string; p_pickup_stop_id: string }
        Returns: {
          bus_distance_m: number
          bus_recorded_at: string
          departs_at: string
          direction: Database["public"]["Enums"]["route_direction"]
          dropoff_distance_m: number
          dropoff_idx: number
          free_flow_s: number
          passed: boolean
          pickup_distance_m: number
          pickup_idx: number
          plate: string
          route_code: string
          route_id: string
          route_length_m: number
          seat_count: number
          seats_free: number
          trip_id: string
          trip_status: Database["public"]["Enums"]["trip_status"]
        }[]
      }
      trip_seat_segments: {
        Args: { p_trip_id: string }
        Returns: {
          dropoff_idx: number
          pickup_idx: number
          seat_no: number
        }[]
      }
      wallet_test_credit_pesewas: { Args: never; Returns: number }
    }
    Enums: {
      bus_status: "active" | "standby" | "maintenance" | "inactive"
      driver_status: "pending" | "approved" | "rejected"
      route_direction: "inbound" | "outbound"
      ticket_status:
        | "held"
        | "reserved"
        | "boarded"
        | "completed"
        | "absent"
        | "cancelled"
      trip_status: "scheduled" | "active" | "completed" | "cancelled"
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
    Enums: {
      bus_status: ["active", "standby", "maintenance", "inactive"],
      driver_status: ["pending", "approved", "rejected"],
      route_direction: ["inbound", "outbound"],
      ticket_status: [
        "held",
        "reserved",
        "boarded",
        "completed",
        "absent",
        "cancelled",
      ],
      trip_status: ["scheduled", "active", "completed", "cancelled"],
    },
  },
} as const
