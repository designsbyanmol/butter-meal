// types/supabase.ts

export type TableName =
  | 'star_veg_menu_items'
  | 'star_veg_users'
  | 'star_veg_store_settings';

export type Json =
  | string | number | boolean | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      star_veg_menu_items: {
        Row: {
          id: number;
          in_stock: boolean;
          name: string;
          description: string;
          cost_price: number | null;
          price: number;
          image_url: string;
          category: string | null;
          is_veg: boolean | null;
          is_spicy: boolean | null;
          is_gluten_free: boolean | null;
          preparation_time: string | null;
          calories: number | null;
          rating: number | null;
          review_count: number | null;
          ingredients: string[] | null;
          nutritional_info: Json | null;
          attributes: Json | null;
          // Shape: Array<{ name: string; choices: Array<{ name: string; price: number }>; default?: string }>
          customization_options: Json | null;
          sort_order: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: { [key: string]: any };
        Update: { [key: string]: any };
      };
      star_veg_users: {
        Row: {
          id: string;
          phone: string;
          name: string;
          password_hash: string;
          role: 'admin' | 'user';
          is_active: boolean;
          created_at: string;
          last_login: string | null;
        };
        Insert: { [key: string]: any };
        Update: { [key: string]: any };
      };
      star_veg_store_settings: {
        Row: {
          id: number;
          is_open: boolean;
          closed_message: string;
          expected_open_date: string | null;
          expected_open_time: string | null;
          last_updated: string;
          created_at: string;
        };
        Insert: { [key: string]: any };
        Update: { [key: string]: any };
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
  };
}