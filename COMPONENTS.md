# 📱 Component Library

## Shared Components

### Header
Navigation header with search, user menu, and mobile responsiveness.

**Usage:**
\`\`\`tsx
import { Header } from '@/components/Header';

<Header />
\`\`\`

**Features:**
- Responsive mobile menu
- User authentication dropdown
- Search bar
- Quick navigation links

---

### Footer
Application footer with links and social media.

**Usage:**
\`\`\`tsx
import { Footer } from '@/components/Footer';

<Footer />
\`\`\`

---

### Layout
Main layout wrapper for all pages.

**Usage:**
\`\`\`tsx
import { Layout } from '@/components/Layout';

<Layout title="Page Title">
  {/* Your content */}
</Layout>
\`\`\`

**Props:**
- `title`: Page title
- `description`: Meta description
- `ogImage`: Open Graph image

---

### BookCard
Reusable book listing card.

**Usage:**
\`\`\`tsx
import { BookCard } from '@/components/BookCard';

<BookCard
  book={bookData}
  onWishlist={isInWishlist}
  onWishlistClick={handleWishlist}
/>
\`\`\`

**Features:**
- Image hover effects
- Wishlist toggle
- Share button
- Book condition badge
- Type badge (Buy/Sell/Exchange)
- Star rating
- Price display
- Location info
- View details CTA

---

## Creating New Components

1. Create component file in `src/components/`
2. Use TypeScript interfaces for props
3. Export component as named export
4. Add JSDoc comments for documentation

**Template:**
\`\`\`tsx
import React from 'react';

interface MyComponentProps {
  title: string;
  // ... other props
}

export const MyComponent: React.FC<MyComponentProps> = ({ title }) => {
  return (
    <div>
      {title}
    </div>
  );
};
\`\`\`

---

## Component Checklist

- [ ] Component file created
- [ ] Props interface defined
- [ ] TypeScript types used
- [ ] Accessibility (a11y) implemented
- [ ] Mobile responsive
- [ ] Dark mode compatible
- [ ] JSDoc comments added
- [ ] Component exported
- [ ] Stories/examples added (if complex)
