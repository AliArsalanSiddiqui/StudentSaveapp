export interface User {
  id: string;
  email: string;
  name?: string;
  university?: string;
  student_id?: string;
  phone?: string;
  gender?: string;
  age?: number;
  role: 'student' | 'vendor' | 'admin';
  verified: boolean;
  avatar_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface Vendor {
  id: string;
  owner_id?: string;
  name: string;
  category: string;
  description?: string;
  discount_percentage: number;
  discount_text: string;
  logo_url?: string;
  location: string;
  latitude?: number;
  longitude?: number;
  rating: number;
  total_reviews: number;
  opening_hours?: any;
  terms?: string;
  active: boolean;
  qr_code: string;
  created_at: string;
  updated_at?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  duration_months: number;
  price: number;
  currency: string;
  features: string[];
  active: boolean;
  created_at: string;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  start_date: string;
  end_date: string;
  active: boolean;
  auto_renew: boolean;
  payment_method?: string;
  transaction_id?: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  vendor_id: string;
  vendor?: Vendor;
  discount_applied: string;
  amount_saved: number;
  redeemed_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  vendor_id: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type?: string;
  read: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  user_id: string;
  vendor_id: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface PromoCode {
  id: string;
  code: string;
  discount_percentage?: number;
  max_uses?: number;
  current_uses: number;
  valid_from?: string;
  valid_until?: string;
  active: boolean;
  created_at: string;
}

export type Category = 'Restaurant' | 'Cafe' | 'Arcade' | 'Clothing' | 'Entertainment';

export interface Stats {
  totalTransactions: number;
  totalSaved: number;
  favoriteVendors: number;
}

export interface PaymentIntent {
  clientSecret: string;
  paymentIntentId: string;
}