// User Types
export type User = {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  phone?: string;
  role: 'buyer' | 'seller' | 'publisher' | 'bookstore' | 'admin';
  is_verified: boolean;
  rating: number;
  reviews_count: number;
  created_at: string;
  updated_at: string;
};

// Book Types
export type Book = {
  id: string;
  title: string;
  author: string;
  publisher?: string;
  isbn?: string;
  edition?: string;
  language: string;
  pages?: number;
  category: string;
  subcategory?: string;
  description?: string;
  condition: 'new' | 'like-new' | 'good' | 'fair' | 'poor';
  price: number;
  negotiable: boolean;
  seller_id: string;
  image_urls: string[];
  location: string;
  latitude?: number;
  longitude?: number;
  availability: 'in-stock' | 'sold' | 'unavailable';
  book_type: 'buy' | 'sell' | 'exchange' | 'rent' | 'donate';
  created_at: string;
  updated_at: string;
};

// Order Types
export type Order = {
  id: string;
  book_id: string;
  buyer_id: string;
  seller_id: string;
  order_type: 'buy' | 'exchange' | 'rent';
  payment_id?: string;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  delivery_method: 'pickup' | 'courier';
  delivery_address?: string;
  tracking_number?: string;
  created_at: string;
  updated_at: string;
};

// Wishlist Types
export type WishlistItem = {
  id: string;
  user_id: string;
  book_id: string;
  created_at: string;
};

// Review Types
export type Review = {
  id: string;
  reviewer_id: string;
  seller_id: string;
  book_id?: string;
  order_id?: string;
  rating: number;
  comment: string;
  created_at: string;
};

// Message Types
export type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  chat_id: string;
  content: string;
  image_url?: string;
  read: boolean;
  created_at: string;
};

// Category Types
export type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon_url?: string;
  parent_id?: string;
};

// Coupon Types
export type Coupon = {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_uses: number;
  used_count: number;
  valid_from: string;
  valid_until: string;
  min_amount?: number;
  is_active: boolean;
};

// Notification Types
export type Notification = {
  id: string;
  user_id: string;
  type: 'message' | 'order' | 'price-drop' | 'wishlist' | 'rare-book' | 'review';
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  created_at: string;
};
