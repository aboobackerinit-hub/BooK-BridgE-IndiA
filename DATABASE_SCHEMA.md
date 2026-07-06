# BookBridge India - Database Schema

## Overview
PostgreSQL database schema for BookBridge India - India's largest book marketplace.

---

## Tables

### 1. users
Stores user profile information and authentication data.

\`\`\`sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  phone TEXT,
  role TEXT DEFAULT 'buyer', -- buyer, seller, publisher, bookstore, admin
  is_verified BOOLEAN DEFAULT false,
  rating NUMERIC(3,2) DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  total_books_listed INTEGER DEFAULT 0,
  total_books_sold INTEGER DEFAULT 0,
  total_books_bought INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
\`\`\`

### 2. books
Stores all book listings on the platform.

\`\`\`sql
CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  publisher TEXT,
  isbn TEXT UNIQUE,
  edition TEXT,
  language TEXT DEFAULT 'English',
  pages INTEGER,
  category TEXT NOT NULL,
  subcategory TEXT,
  description TEXT,
  condition TEXT DEFAULT 'good', -- new, like-new, good, fair, poor
  price NUMERIC(10,2) NOT NULL,
  negotiable BOOLEAN DEFAULT false,
  seller_id UUID NOT NULL REFERENCES users(id),
  image_urls TEXT[] NOT NULL, -- Array of image URLs
  location TEXT NOT NULL,
  latitude NUMERIC(10,8),
  longitude NUMERIC(11,8),
  availability TEXT DEFAULT 'in-stock', -- in-stock, sold, unavailable
  book_type TEXT DEFAULT 'buy', -- buy, sell, exchange, rent, donate
  views_count INTEGER DEFAULT 0,
  wishlist_count INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_books_seller_id ON books(seller_id);
CREATE INDEX idx_books_category ON books(category);
CREATE INDEX idx_books_location ON books(location);
CREATE INDEX idx_books_created_at ON books(created_at DESC);
\`\`\`

### 3. orders
Stores all transactions and orders.

\`\`\`sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id),
  buyer_id UUID NOT NULL REFERENCES users(id),
  seller_id UUID NOT NULL REFERENCES users(id),
  order_type TEXT DEFAULT 'buy', -- buy, exchange, rent
  payment_id TEXT,
  total_amount NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, confirmed, shipped, delivered, cancelled
  delivery_method TEXT, -- pickup, courier
  delivery_address TEXT,
  tracking_number TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX idx_orders_seller_id ON orders(seller_id);
CREATE INDEX idx_orders_status ON orders(status);
\`\`\`

### 4. wishlist
Stores user wishlists.

\`\`\`sql
CREATE TABLE wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  book_id UUID NOT NULL REFERENCES books(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, book_id)
);

CREATE INDEX idx_wishlist_user_id ON wishlist(user_id);
\`\`\`

### 5. reviews
Stores reviews and ratings.

\`\`\`sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID NOT NULL REFERENCES users(id),
  seller_id UUID NOT NULL REFERENCES users(id),
  book_id UUID REFERENCES books(id),
  order_id UUID REFERENCES orders(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reviews_seller_id ON reviews(seller_id);
CREATE INDEX idx_reviews_book_id ON reviews(book_id);
\`\`\`

### 6. messages
Stores direct messages between users.

\`\`\`sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id),
  receiver_id UUID NOT NULL REFERENCES users(id),
  chat_id TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);
\`\`\`

### 7. categories
Stores book categories.

\`\`\`sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon_url TEXT,
  parent_id UUID REFERENCES categories(id),
  created_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

### 8. coupons
Stores discount coupons.

\`\`\`sql
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL, -- percentage, fixed
  discount_value NUMERIC(10,2) NOT NULL,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMP NOT NULL,
  valid_until TIMESTAMP NOT NULL,
  min_amount NUMERIC(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_coupons_code ON coupons(code);
\`\`\`

### 9. notifications
Stores user notifications.

\`\`\`sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL, -- message, order, price-drop, wishlist, rare-book, review
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
\`\`\`

### 10. verifications
Stores user verification documents.

\`\`\`sql
CREATE TABLE verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  document_type TEXT NOT NULL, -- aadhar, pan, driving_license
  document_url TEXT NOT NULL,
  verified BOOLEAN DEFAULT false,
  rejected BOOLEAN DEFAULT false,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  verified_at TIMESTAMP
);
\`\`\`

### 11. rare_book_requests
Stores rare book search requests.

\`\`\`sql
CREATE TABLE rare_book_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  author TEXT,
  description TEXT,
  fulfilled BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  fulfilled_at TIMESTAMP
);
\`\`\`

### 12. transactions
Stores all payment transactions.

\`\`\`sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL, -- upi, card, net-banking, wallet, cod
  payment_id TEXT,
  status TEXT DEFAULT 'pending', -- pending, completed, failed
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transactions_order_id ON transactions(order_id);
\`\`\`

---

## Row Level Security (RLS)

Enable RLS on sensitive tables:
\`\`\`sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
\`\`\`

---

## Triggers

\`\`\`sql
-- Update book views count
CREATE OR REPLACE FUNCTION increment_book_views()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE books SET views_count = views_count + 1 WHERE id = NEW.book_id;
  RETURN NEW;
END;
\$$ LANGUAGE plpgsql;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
\$$ LANGUAGE plpgsql;
\`\`\`

---

## Indexes

All important indexes have been created above for optimal query performance.

---

## Relationships

- **users** ← one-to-many → **books** (seller)
- **users** ← one-to-many → **orders** (buyer, seller)
- **books** ← one-to-many → **orders**
- **users** ← one-to-many → **wishlist**
- **books** ← one-to-many → **wishlist**
- **users** ← one-to-many → **reviews** (reviewer, seller)
- **users** ← one-to-many → **messages** (sender, receiver)
- **categories** ← self-referential (parent-child)
