// types/supabase.ts
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
          name: string
          role: 'admin' | 'user'
          password_hash: string
          created_at: string
          last_login: string | null
        }
        Insert: {
          id?: string
          email: string
          name: string
          role?: 'admin' | 'user'
          password_hash: string
          created_at?: string
          last_login?: string | null
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: 'admin' | 'user'
          password_hash?: string
          created_at?: string
          last_login?: string | null
        }
      }
      menu_items: {
        Row: {
          id: number
          in_stock: boolean
          name: string
          description: string
          cost_price: number | null
          price: number
          image_url: string
          category: string | null
          is_veg: boolean | null
          is_spicy: boolean | null
          is_gluten_free: boolean | null
          preparation_time: string | null
          calories: number | null
          rating: number | null
          review_count: number | null
          ingredients: string[] | null
          nutritional_info: Json | null
          attributes: Json | null
          customization_options: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          in_stock?: boolean
          name: string
          description: string
          cost_price?: number | null
          price: number
          image_url: string
          category?: string | null
          is_veg?: boolean | null
          is_spicy?: boolean | null
          is_gluten_free?: boolean | null
          preparation_time?: string | null
          calories?: number | null
          rating?: number | null
          review_count?: number | null
          ingredients?: string[] | null
          nutritional_info?: Json | null
          attributes?: Json | null
          customization_options?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          in_stock?: boolean
          name?: string
          description?: string
          cost_price?: number | null
          price?: number
          image_url?: string
          category?: string | null
          is_veg?: boolean | null
          is_spicy?: boolean | null
          is_gluten_free?: boolean | null
          preparation_time?: string | null
          calories?: number | null
          rating?: number | null
          review_count?: number | null
          ingredients?: string[] | null
          nutritional_info?: Json | null
          attributes?: Json | null
          customization_options?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      cart_items: {
        Row: {
          id: string
          user_id: string
          menu_item_id: number
          quantity: number
          customizations: Json | null
          addon_price: number | null
          base_price: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          menu_item_id: number
          quantity: number
          customizations?: Json | null
          addon_price?: number | null
          base_price: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          menu_item_id?: number
          quantity?: number
          customizations?: Json | null
          addon_price?: number | null
          base_price?: number
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string
          order_number: string
          items: Json
          total_amount: number
          payment_mode: string
          delivery_type: string
          schedule_data: Json | null
          status: string
          delivery_fee: number
          discount: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          order_number: string
          items: Json
          total_amount: number
          payment_mode: string
          delivery_type: string
          schedule_data?: Json | null
          status?: string
          delivery_fee?: number
          discount?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          order_number?: string
          items?: Json
          total_amount?: number
          payment_mode?: string
          delivery_type?: string
          schedule_data?: Json | null
          status?: string
          delivery_fee?: number
          discount?: number
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
  }
}