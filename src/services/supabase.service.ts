// services/supabase.service.ts
import { supabase, isSupabaseConfigured } from './supabase.client';
import { User, MenuItem, CartItem, StoreSettings } from '../types';
import { TABLES } from '../config/tables';

class SupabaseService {
  private static instance: SupabaseService;

  private constructor() {}

  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  private checkSupabaseInitialized() {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase is not configured. Falling back to localStorage.');
      return false;
    }
    return true;
  }

  private getClient() {
    if (!this.checkSupabaseInitialized() || !supabase) {
      return null;
    }
    return supabase;
  }

  // ============ USER METHODS ============
  
  async getUsers(): Promise<User[]> {
    try {
      const client = this.getClient();
      if (!client) return [];
      
      const { data: users, error } = await client
        .from(TABLES.USERS)  // ✅ Using env variable
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return users.map(this.mapSupabaseUser);
    } catch (error) {
      console.error('Get users error:', error);
      return [];
    }
  }

  async getUserByPhone(phone: string): Promise<User | null> {
    try {
      const client = this.getClient();
      if (!client) return null;
      
      const { data: user, error } = await client
        .from(TABLES.USERS)  // ✅ Using env variable
        .select('*')
        .eq('phone', phone)
        .single();

      if (error) throw error;
      return user ? this.mapSupabaseUser(user) : null;
    } catch (error) {
      console.error('Get user by phone error:', error);
      return null;
    }
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      const client = this.getClient();
      if (!client) return null;
      
      const { data: user, error } = await client
        .from(TABLES.USERS)  // ✅ Using env variable
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return user ? this.mapSupabaseUser(user) : null;
    } catch (error) {
      console.error('Get user by id error:', error);
      return null;
    }
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    try {
      const client = this.getClient();
      if (!client) {
        throw new Error('Supabase not configured');
      }
      
      const { data: user, error } = await client
        .from(TABLES.USERS)  // ✅ Using env variable
        .insert({
          phone: userData.phone,
          name: userData.name,
          password_hash: userData.password,
          role: userData.role || 'user',
          is_active: userData.isActive !== undefined ? userData.isActive : true,
        })
        .select()
        .single();

      if (error) throw error;
      return this.mapSupabaseUser(user);
    } catch (error) {
      console.error('Create user error:', error);
      throw error;
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    try {
      const client = this.getClient();
      if (!client) return null;
      
      const supabaseUpdates: any = {};
      if (updates.name) supabaseUpdates.name = updates.name;
      if (updates.phone) supabaseUpdates.phone = updates.phone;
      if (updates.password) supabaseUpdates.password_hash = updates.password;
      if (updates.isActive !== undefined) supabaseUpdates.is_active = updates.isActive;
      if (updates.role) supabaseUpdates.role = updates.role;

      const { data: user, error } = await client
        .from(TABLES.USERS)  // ✅ Using env variable
        .update(supabaseUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return user ? this.mapSupabaseUser(user) : null;
    } catch (error) {
      console.error('Update user error:', error);
      return null;
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      const client = this.getClient();
      if (!client) return false;
      
      const { error } = await client
        .from(TABLES.USERS)  // ✅ Using env variable
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Delete user error:', error);
      return false;
    }
  }

  async toggleUserStatus(id: string): Promise<User | null> {
    try {
      const client = this.getClient();
      if (!client) return null;
      
      const { data: currentUser, error: getError } = await client
        .from(TABLES.USERS)  // ✅ Using env variable
        .select('is_active')
        .eq('id', id)
        .single();

      if (getError) throw getError;

      const { data: user, error } = await client
        .from(TABLES.USERS)  // ✅ Using env variable
        .update({ is_active: !currentUser.is_active })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return user ? this.mapSupabaseUser(user) : null;
    } catch (error) {
      console.error('Toggle user status error:', error);
      return null;
    }
  }

  async changeUserPassword(id: string, newPassword: string): Promise<boolean> {
    try {
      const client = this.getClient();
      if (!client) return false;
      
      const { error } = await client
        .from(TABLES.USERS)  // ✅ Using env variable
        .update({ 
          password_hash: newPassword,
          is_active: true
        })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Change user password error:', error);
      return false;
    }
  }

  // ============ AUTH METHODS ============
  
  async signIn(phone: string, password: string): Promise<{ user: User | null; error?: string }> {
    try {
      const client = this.getClient();
      if (!client) {
        return { user: null, error: 'Supabase not configured' };
      }
      
      const { data: user, error } = await client
        .from(TABLES.USERS)  // ✅ Using env variable
        .select('*')
        .eq('phone', phone)
        .eq('password_hash', password)
        .single();

      if (error || !user) {
        return { user: null, error: 'Invalid phone number or password' };
      }

      if (!user.is_active) {
        return { user: null, error: 'Account is deactivated. Please contact admin.' };
      }

      await client
        .from(TABLES.USERS)  // ✅ Using env variable
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);

      return { user: this.mapSupabaseUser(user) };
    } catch (error) {
      console.error('Signin error:', error);
      return { user: null, error: 'An error occurred during signin' };
    }
  }

  async signOut(): Promise<void> {
    // Nothing to do with Supabase for now
  }

  // ============ MENU ITEMS METHODS ============

  async addMenuItem(item: MenuItem): Promise<MenuItem | null> {
    try {
      const client = this.getClient();
      if (!client) return null;

      const supabaseItem = {
        in_stock: item.inStock,
        name: item.name,
        description: item.desc,
        cost_price: item.costPrice || null,
        price: item.price,
        image_url: item.img,
        category: item.category || null,
        is_veg: item.isVeg || false,
        is_spicy: item.isSpicy || false,
        is_gluten_free: item.isGlutenFree || false,
        preparation_time: item.preparationTime || null,
        calories: item.calories || null,
        rating: item.rating || null,
        review_count: item.reviewCount || 0,
        ingredients: item.ingredients || null,
        nutritional_info: item.nutritionalInfo || null,
        attributes: item.attributes || null,
        customization_options: item.customizationOptions || null,
      };

      const { data, error } = await client
        .from(TABLES.MENU)  // ✅ Using env variable
        .insert([supabaseItem])
        .select()
        .single();
      
      if (error) throw error;
      return data ? this.mapSupabaseMenuItem(data) : null;
    } catch (error) {
      console.error('Error adding menu item:', error);
      return null;
    }
  }

  async deleteMenuItem(id: number): Promise<boolean> {
    try {
      const client = this.getClient();
      if (!client) return false;
      
      const { error } = await client
        .from(TABLES.MENU)  // ✅ Using env variable
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting menu item:', error);
      return false;
    }
  }

  async getMenuItems(): Promise<MenuItem[]> {
    try {
      const client = this.getClient();
      if (!client) return [];
      
      const { data: items, error } = await client
        .from(TABLES.MENU)  // ✅ Using env variable
        .select('*')
        .order('id');

      if (error) throw error;
      return items.map(this.mapSupabaseMenuItem);
    } catch (error) {
      console.error('Get menu items error:', error);
      return [];
    }
  }

  async getVisibleMenuItems(): Promise<MenuItem[]> {
    try {
      const client = this.getClient();
      if (!client) return [];
      
      const { data: items, error } = await client
        .from(TABLES.MENU)  // ✅ Using env variable
        .select('*')
        .eq('in_stock', true)
        .order('id');

      if (error) throw error;
      return items.map(this.mapSupabaseMenuItem);
    } catch (error) {
      console.error('Get visible menu items error:', error);
      return [];
    }
  }

  async updateMenuItem(id: number, updates: Partial<MenuItem>): Promise<MenuItem | null> {
    try {
      const client = this.getClient();
      if (!client) return null;
      
      const supabaseUpdates: any = {};
      if (updates.inStock !== undefined) supabaseUpdates.in_stock = updates.inStock;
      if (updates.name) supabaseUpdates.name = updates.name;
      if (updates.desc) supabaseUpdates.description = updates.desc;
      if (updates.price) supabaseUpdates.price = updates.price;
      if (updates.img) supabaseUpdates.image_url = updates.img;
      if (updates.category) supabaseUpdates.category = updates.category;
      if (updates.isVeg !== undefined) supabaseUpdates.is_veg = updates.isVeg;
      if (updates.isSpicy !== undefined) supabaseUpdates.is_spicy = updates.isSpicy;
      if (updates.isGlutenFree !== undefined) supabaseUpdates.is_gluten_free = updates.isGlutenFree;
      if (updates.preparationTime) supabaseUpdates.preparation_time = updates.preparationTime;
      if (updates.calories) supabaseUpdates.calories = updates.calories;
      if (updates.rating) supabaseUpdates.rating = updates.rating;
      if (updates.reviewCount) supabaseUpdates.review_count = updates.reviewCount;
      if (updates.ingredients) supabaseUpdates.ingredients = updates.ingredients;
      if (updates.nutritionalInfo) supabaseUpdates.nutritional_info = updates.nutritionalInfo;
      if (updates.attributes) supabaseUpdates.attributes = updates.attributes;
      if (updates.customizationOptions) supabaseUpdates.customization_options = updates.customizationOptions;
      supabaseUpdates.updated_at = new Date().toISOString();

      const { data: item, error } = await client
        .from(TABLES.MENU)  // ✅ Using env variable
        .update(supabaseUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return item ? this.mapSupabaseMenuItem(item) : null;
    } catch (error) {
      console.error('Update menu item error:', error);
      return null;
    }
  }

  async toggleMenuItemStock(id: number): Promise<MenuItem | null> {
    try {
      const client = this.getClient();
      if (!client) return null;
      
      const { data: currentItem, error: getError } = await client
        .from(TABLES.MENU)  // ✅ Using env variable
        .select('in_stock')
        .eq('id', id)
        .single();

      if (getError) throw getError;

      const { data: item, error } = await client
        .from(TABLES.MENU)  // ✅ Using env variable
        .update({ 
          in_stock: !currentItem.in_stock,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return item ? this.mapSupabaseMenuItem(item) : null;
    } catch (error) {
      console.error('Toggle menu item stock error:', error);
      return null;
    }
  }

  async bulkUpdateMenuItems(updates: { id: number; inStock: boolean }[]): Promise<MenuItem[]> {
    try {
      const client = this.getClient();
      if (!client) return [];
      
      const updatedItems: MenuItem[] = [];
      
      for (const update of updates) {
        const result = await this.updateMenuItem(update.id, { inStock: update.inStock });
        if (result) {
          updatedItems.push(result);
        }
      }

      return updatedItems;
    } catch (error) {
      console.error('Bulk update menu items error:', error);
      return [];
    }
  }

  async initializeMenuItems(defaultItems: MenuItem[]): Promise<void> {
    try {
      const client = this.getClient();
      if (!client) {
        console.warn('Supabase not configured, skipping initialization');
        return;
      }
      
      const { count, error: countError } = await client
        .from(TABLES.MENU)  // ✅ Using env variable
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;

      if (count === 0) {
        const itemsToInsert = defaultItems.map(item => ({
          in_stock: item.inStock,
          name: item.name,
          description: item.desc,
          cost_price: item.costPrice || null,
          price: item.price,
          image_url: item.img,
          category: item.category || null,
          is_veg: item.isVeg || false,
          is_spicy: item.isSpicy || false,
          is_gluten_free: item.isGlutenFree || false,
          preparation_time: item.preparationTime || null,
          calories: item.calories || null,
          rating: item.rating || null,
          review_count: item.reviewCount || 0,
          ingredients: item.ingredients || null,
          nutritional_info: item.nutritionalInfo || null,
          attributes: item.attributes || null,
          customization_options: item.customizationOptions || null,
        }));

        console.log('📦 Inserting menu items:', itemsToInsert.length);

        const batchSize = 10;
        for (let i = 0; i < itemsToInsert.length; i += batchSize) {
          const batch = itemsToInsert.slice(i, i + batchSize);
          const { error: insertError } = await client
            .from(TABLES.MENU)  // ✅ Using env variable
            .insert(batch);

          if (insertError) {
            console.error(`❌ Insert error at batch ${i / batchSize + 1}:`, insertError);
            throw insertError;
          }
          console.log(`✅ Batch ${i / batchSize + 1} inserted successfully`);
        }
        
        console.log('✅ All menu items initialized successfully!');
      } else {
        console.log('📋 Menu items already exist, skipping initialization');
      }
    } catch (error) {
      console.error('Initialize menu items error:', error);
      throw error;
    }
  }

  // ============ STORE SETTINGS ============

  async getStoreSettings(): Promise<StoreSettings | null> {
    try {
      const client = this.getClient();
      if (!client) {
        console.warn('⚠️ Supabase client not available');
        return null;
      }
      
      console.log('📡 Fetching store settings from Supabase...');
      
      const { data, error } = await client
        .from(TABLES.STORE_SETTINGS)  // ✅ Using env variable
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('❌ Error fetching store settings:', error);
        return null;
      }
      
      if (!data) {
        console.warn('⚠️ No store settings found in database');
        return null;
      }
      
      console.log('✅ Store settings fetched from Supabase:', data);
      
      return {
        isOpen: data.is_open ?? true,
        closedMessage: data.closed_message || '',
        expectedOpenDate: data.expected_open_date || '',
        expectedOpenTime: data.expected_open_time || '',
        lastUpdated: data.last_updated || new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Get store settings error:', error);
      return null;
    }
  }

  async updateStoreSettings(settings: StoreSettings): Promise<boolean> {
    try {
      const client = this.getClient();
      if (!client) {
        console.warn('⚠️ Supabase client not available');
        return false;
      }
      
      console.log('📡 Updating store settings in Supabase...');
      
      const updateData = {
        is_open: settings.isOpen,
        closed_message: settings.closedMessage || '',
        expected_open_date: settings.expectedOpenDate || null,
        expected_open_time: settings.expectedOpenTime || null,
        last_updated: new Date().toISOString(),
      };
      
      console.log('📤 Sending update data:', updateData);
      
      const { error } = await client
        .from(TABLES.STORE_SETTINGS)  // ✅ Using env variable
        .upsert({
          id: 1,
          ...updateData
        }, {
          onConflict: 'id'
        });

      if (error) {
        console.error('❌ Update error:', error);
        return false;
      }
      
      console.log('✅ Store settings updated successfully in Supabase');
      return true;
    } catch (error) {
      console.error('❌ Update store settings error:', error);
      return false;
    }
  }

  // ============ CART METHODS ============

  async getCartItems(userId: string): Promise<CartItem[]> {
    try {
      const client = this.getClient();
      if (!client) return [];
      
      const { data: items, error } = await client
        .from(TABLES.CART)  // ✅ Using env variable
        .select('*, menu_items(*)')
        .eq('user_id', userId);

      if (error) throw error;

      return items.map(item => ({
        ...this.mapSupabaseMenuItem(item.menu_items),
        quantity: item.quantity,
        customizations: item.customizations,
        addonPrice: item.addon_price,
        basePrice: item.base_price,
      }));
    } catch (error) {
      console.error('Get cart items error:', error);
      return [];
    }
  }

  async addToCart(userId: string, menuItemId: number, quantity: number, customizations?: any): Promise<void> {
    try {
      const client = this.getClient();
      if (!client) return;
      
      const { data: existing, error: checkError } = await client
        .from(TABLES.CART)  // ✅ Using env variable
        .select('id, quantity')
        .eq('user_id', userId)
        .eq('menu_item_id', menuItemId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existing) {
        const { error: updateError } = await client
          .from(TABLES.CART)  // ✅ Using env variable
          .update({ 
            quantity: existing.quantity + quantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;
      } else {
        const { data: menuItem, error: menuError } = await client
          .from(TABLES.MENU)  // ✅ Using env variable
          .select('price')
          .eq('id', menuItemId)
          .single();

        if (menuError) throw menuError;

        const { error: insertError } = await client
          .from(TABLES.CART)  // ✅ Using env variable
          .insert({
            user_id: userId,
            menu_item_id: menuItemId,
            quantity,
            customizations,
            base_price: menuItem.price,
          });

        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error('Add to cart error:', error);
    }
  }

  async removeFromCart(userId: string, menuItemId: number): Promise<void> {
    try {
      const client = this.getClient();
      if (!client) return;
      
      const { error } = await client
        .from(TABLES.CART)  // ✅ Using env variable
        .delete()
        .eq('user_id', userId)
        .eq('menu_item_id', menuItemId);

      if (error) throw error;
    } catch (error) {
      console.error('Remove from cart error:', error);
    }
  }

  async updateCartItemQuantity(userId: string, menuItemId: number, quantity: number): Promise<void> {
    try {
      const client = this.getClient();
      if (!client) return;
      
      if (quantity <= 0) {
        await this.removeFromCart(userId, menuItemId);
        return;
      }

      const { error } = await client
        .from(TABLES.CART)  // ✅ Using env variable
        .update({ 
          quantity,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('menu_item_id', menuItemId);

      if (error) throw error;
    } catch (error) {
      console.error('Update cart item quantity error:', error);
    }
  }

  async clearCart(userId: string): Promise<void> {
    try {
      const client = this.getClient();
      if (!client) return;
      
      const { error } = await client
        .from(TABLES.CART)  // ✅ Using env variable
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Clear cart error:', error);
    }
  }

  // ============ ORDER METHODS ============

  async createOrder(orderData: any): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      const client = this.getClient();
      if (!client) {
        return { success: false, error: 'Supabase not configured' };
      }
      
      const { data: order, error } = await client
        .from(TABLES.ORDERS)  // ✅ Using env variable
        .insert(orderData)
        .select('id')
        .single();

      if (error) throw error;
      return { success: true, orderId: order.id };
    } catch (error) {
      console.error('Create order error:', error);
      return { success: false, error: 'Failed to create order' };
    }
  }

  // ============ HELPER METHODS ============

  private mapSupabaseUser(user: any): User {
    return {
      id: user.id,
      phone: user.phone,
      name: user.name,
      password: user.password_hash,
      role: user.role,
      isActive: user.is_active,
      createdAt: user.created_at,
      lastLogin: user.last_login,
    };
  }

  private mapSupabaseMenuItem(item: any): MenuItem {
    return {
      id: item.id,
      inStock: item.in_stock,
      name: item.name,
      desc: item.description,
      costPrice: item.cost_price,
      price: item.price,
      img: item.image_url,
      category: item.category,
      isVeg: item.is_veg,
      isSpicy: item.is_spicy,
      isGlutenFree: item.is_gluten_free,
      preparationTime: item.preparation_time,
      calories: item.calories,
      rating: item.rating,
      reviewCount: item.review_count,
      ingredients: item.ingredients,
      nutritionalInfo: item.nutritional_info,
      attributes: item.attributes,
      customizationOptions: item.customization_options,
    };
  }
}

export const supabaseService = SupabaseService.getInstance();