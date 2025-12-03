import { supabase } from './supabase';
import { Vendor, UserSubscription, Transaction, SubscriptionPlan } from '../types/index';

// ==================== VENDORS ====================

export const fetchVendors = async (category?: string): Promise<Vendor[]> => {
  let query = supabase
    .from('vendors')
    .select('*')
    .eq('active', true)
    .order('rating', { ascending: false });

  if (category && category !== 'All') {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching vendors:', error);
    return [];
  }

  return data || [];
};

export const fetchVendorById = async (id: string): Promise<Vendor | null> => {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching vendor:', error);
    return null;
  }

  return data;
};

export const searchVendors = async (query: string): Promise<Vendor[]> => {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('active', true)
    .ilike('name', `%${query}%`);

  if (error) {
    console.error('Error searching vendors:', error);
    return [];
  }

  return data || [];
};

// ==================== FAVORITES ====================

export const toggleFavorite = async (
  userId: string,
  vendorId: string
): Promise<boolean> => {
  // Check if already favorited
  const { data: existing } = await supabase
    .from('favorites')
    .select('*')
    .eq('user_id', userId)
    .eq('vendor_id', vendorId)
    .single();

  if (existing) {
    // Remove favorite
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('vendor_id', vendorId);

    return !error;
  } else {
    // Add favorite
    const { error } = await supabase
      .from('favorites')
      .insert({ user_id: userId, vendor_id: vendorId });

    return !error;
  }
};

export const fetchFavorites = async (userId: string): Promise<Vendor[]> => {
  const { data, error } = await supabase
    .from('favorites')
    .select('vendor_id, vendors(*)')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching favorites:', error);
    return [];
  }

  return data?.map((fav: any) => fav.vendors) || [];
};

export const isFavorite = async (
  userId: string,
  vendorId: string
): Promise<boolean> => {
  const { data } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('vendor_id', vendorId)
    .single();

  return !!data;
};

// ==================== SUBSCRIPTIONS ====================

export const fetchSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('active', true)
    .order('price', { ascending: true });

  if (error) {
    console.error('Error fetching subscription plans:', error);
    return [];
  }

  return data || [];
};

export const fetchUserSubscription = async (
  userId: string
): Promise<UserSubscription | null> => {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*, subscription_plans(*)')
    .eq('user_id', userId)
    .eq('active', true)
    .gte('end_date', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching user subscription:', error);
    return null;
  }

  return data;
};

export const createSubscription = async (
  userId: string,
  planId: string,
  paymentMethod: string,
  transactionId: string
): Promise<boolean> => {
  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (!plan) return false;

  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + plan.duration_months);

  const { error } = await supabase.from('user_subscriptions').insert({
    user_id: userId,
    plan_id: planId,
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
    active: true,
    payment_method: paymentMethod,
    transaction_id: transactionId,
  });

  if (error) {
    console.error('Error creating subscription:', error);
    return false;
  }

  return true;
};

export const cancelSubscription = async (
  subscriptionId: string
): Promise<boolean> => {
  const { error } = await supabase
    .from('user_subscriptions')
    .update({ auto_renew: false })
    .eq('id', subscriptionId);

  return !error;
};

// ==================== TRANSACTIONS ====================

export const fetchUserTransactions = async (
  userId: string
): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*, vendors(*)')
    .eq('user_id', userId)
    .order('redeemed_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }

  return data || [];
};

export const createTransaction = async (
  userId: string,
  vendorId: string,
  discountApplied: string,
  amountSaved: number
): Promise<boolean> => {
  const { error } = await supabase.from('transactions').insert({
    user_id: userId,
    vendor_id: vendorId,
    discount_applied: discountApplied,
    amount_saved: amountSaved,
  });

  if (error) {
    console.error('Error creating transaction:', error);
    return false;
  }

  return true;
};

// ==================== USER PROFILE ====================

export const updateUserProfile = async (
  userId: string,
  updates: Partial<{
    name: string;
    university: string;
    student_id: string;
    phone: string;
    gender: string;
    age: number;
  }>
): Promise<boolean> => {
  const { error } = await supabase
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.error('Error updating profile:', error);
    return false;
  }

  return true;
};

export const uploadStudentId = async (
  userId: string,
  imageUri: string
): Promise<string | null> => {
  try {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    const fileName = `${userId}/${Date.now()}.jpg`;

    const { data, error } = await supabase.storage
      .from('student_ids')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.error('Error uploading student ID:', error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('student_ids')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading student ID:', error);
    return null;
  }
};

// ==================== NOTIFICATIONS ====================

export const fetchUserNotifications = async (
  userId: string
): Promise<any[]> => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }

  return data || [];
};

export const markNotificationAsRead = async (
  notificationId: string
): Promise<boolean> => {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);

  return !error;
};

// ==================== REVIEWS ====================

export const createReview = async (
  userId: string,
  vendorId: string,
  rating: number,
  comment: string
): Promise<boolean> => {
  const { error } = await supabase.from('reviews').insert({
    user_id: userId,
    vendor_id: vendorId,
    rating,
    comment,
  });

  if (error) {
    console.error('Error creating review:', error);
    return false;
  }

  // Update vendor rating
  await updateVendorRating(vendorId);

  return true;
};

const updateVendorRating = async (vendorId: string): Promise<void> => {
  const { data: reviews } = await supabase
    .from('reviews')
    .select('rating')
    .eq('vendor_id', vendorId);

  if (reviews && reviews.length > 0) {
    const avgRating =
      reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await supabase
      .from('vendors')
      .update({
        rating: avgRating,
        total_reviews: reviews.length,
      })
      .eq('id', vendorId);
  }
};

// ==================== STATISTICS ====================

export const getUserStats = async (userId: string): Promise<{
  totalTransactions: number;
  totalSaved: number;
  favoriteVendors: number;
}> => {
  const { data: transactions } = await supabase
    .from('transactions')
    .select('amount_saved')
    .eq('user_id', userId);

  const { data: favorites } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', userId);

  const totalSaved =
    transactions?.reduce((sum, t) => sum + (t.amount_saved || 0), 0) || 0;

  return {
    totalTransactions: transactions?.length || 0,
    totalSaved,
    favoriteVendors: favorites?.length || 0,
  };
};

// ==================== ADMIN FUNCTIONS ====================

export const fetchAllUsers = async (): Promise<any[]> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }

  return data || [];
};

export const verifyUser = async (userId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('users')
    .update({ verified: true })
    .eq('id', userId);

  return !error;
};

export const createVendor = async (vendorData: Partial<Vendor>): Promise<boolean> => {
  // Generate unique QR code
  const qrCode = `VENDOR_${Date.now()}`;

  const { error } = await supabase.from('vendors').insert({
    ...vendorData,
    qr_code: qrCode,
  });

  if (error) {
    console.error('Error creating vendor:', error);
    return false;
  }

  return true;
};

export const updateVendor = async (
  vendorId: string,
  updates: Partial<Vendor>
): Promise<boolean> => {
  const { error } = await supabase
    .from('vendors')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', vendorId);

  return !error;
};

export const deleteVendor = async (vendorId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('vendors')
    .update({ active: false })
    .eq('id', vendorId);

  return !error;
};