import React from 'react';
import { Layout } from '@/components/Layout';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { HiHeart, HiShare, HiPhone, HiChat, HiLocationMarker, HiStar, HiFlag } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function BookDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [wishlist, setWishlist] = React.useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = React.useState(false);

  // Mock book data - replace with actual API call
  const book = {
    id,
    title: 'The Alchemist',
    author: 'Paulo Coelho',
    price: 250,
    negotiable: true,
    condition: 'Like New',
    images: ['📖', '📖', '📖'],
    description: 'A beautiful story about self-discovery and following your dreams. Book is in excellent condition with no markings or damage.',
    publisher: 'Penguin Books',
    pages: 224,
    language: 'English',
    category: 'Fiction',
    location: 'Mumbai, Maharashtra',
    seller: {
      name: 'Raj Kumar',
      rating: 4.8,
      reviews: 342,
      verified: true,
      location: 'Bandra, Mumbai',
    },
  };

  const handleAddToWishlist = () => {
    setWishlist(!wishlist);
    toast.success(wishlist ? 'Removed from wishlist' : 'Added to wishlist');
  };

  const handleBuyNow = async () => {
    if (typeof window === 'undefined') return;

    const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!razorpayKey || razorpayKey.includes('your-razorpay-key')) {
      toast.error('Razorpay is not configured yet.');
      return;
    }

    setIsProcessingPayment(true);

    const existingScript = document.getElementById('razorpay-checkout-script');
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.id = 'razorpay-checkout-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      const options = {
        key: razorpayKey,
        amount: Number(book.price) * 100,
        currency: 'INR',
        name: 'BookBridge India',
        description: `Purchase: ${book.title}`,
        notes: {
          upi: '8086377372@ptsbi',
        },
        handler: (response: { razorpay_payment_id: string }) => {
          toast.success(`Payment successful! Payment ID: ${response.razorpay_payment_id}`);
        },
        prefill: {
          name: 'Book Buyer',
          email: 'buyer@example.com',
          contact: '9999999999',
        },
        theme: {
          color: '#2E7D32',
        },
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
      setIsProcessingPayment(false);
    };
    script.onerror = () => {
      toast.error('Unable to load payment gateway.');
      setIsProcessingPayment(false);
    };
    document.body.appendChild(script);
  };

  const mapQuery = encodeURIComponent(book.location);
  const mapUrl = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.includes('your-google-maps-key')
    ? `https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${mapQuery}`
    : `https://www.google.com/maps?q=${mapQuery}&output=embed`;

  return (
    <Layout title={`${book.title} | BookBridge India`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Images */}
          <div className="lg:col-span-1">
            <div className="relative aspect-[3/4] bg-gray-100 rounded-card overflow-hidden mb-4">
              <div className="w-full h-full flex items-center justify-center text-9xl">
                {book.images[0]}
              </div>
              <div className="absolute top-3 right-3">
                <span className="bg-accent text-gray-900 px-3 py-1 rounded font-bold">
                  {book.condition}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {book.images.map((img, i) => (
                <div key={i} className="aspect-[3/4] bg-gray-100 rounded cursor-pointer text-5xl flex items-center justify-center hover:ring-2 hover:ring-primary">
                  {img}
                </div>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="lg:col-span-2">
            {/* Title & Rating */}
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{book.title}</h1>
            <p className="text-xl text-gray-600 mb-4">{book.author}</p>
            
            <div className="flex items-center space-x-4 mb-6 pb-6 border-b">
              <div className="flex items-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <HiStar key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                ))}
              </div>
              <span className="text-gray-600">({book.seller.reviews} reviews)</span>
            </div>

            {/* Price */}
            <div className="mb-6 rounded-card border border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-primary">Selling Price</p>
                  <p className="text-3xl font-bold text-primary">₹{book.price}</p>
                </div>
                {book.negotiable && (
                  <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-gray-700 shadow-sm">Negotiable</span>
                )}
              </div>
            </div>

            {/* Book Info */}
            <div className="bg-gray-50 rounded-card p-6 mb-6 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Publisher</span>
                <span className="font-medium">{book.publisher}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pages</span>
                <span className="font-medium">{book.pages}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Language</span>
                <span className="font-medium">{book.language}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Category</span>
                <span className="font-medium">{book.category}</span>
              </div>
            </div>

            {/* Description */}
            <div className="mb-8">
              <h2 className="font-bold text-lg mb-3">Description</h2>
              <p className="text-gray-700 leading-relaxed">{book.description}</p>
            </div>

            {/* Payment & Pickup */}
            <div className="mb-8 rounded-card border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Secure Payment</h2>
                  <p className="text-sm text-gray-600">Complete your purchase safely with Razorpay.</p>
                </div>
                <div className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">Trusted</div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                <p className="font-medium text-gray-900">Receive payment at</p>
                <p className="mt-1 font-semibold text-primary">8086377372@ptsbi</p>
              </div>

              <div className="mt-4 space-y-3">
                <button
                  onClick={handleBuyNow}
                  disabled={isProcessingPayment}
                  className="w-full rounded-lg bg-gradient-primary py-3 font-bold text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {isProcessingPayment ? 'Processing...' : 'Buy Now'}
                </button>
                <button className="w-full rounded-lg border border-gray-300 py-3 font-bold text-gray-900 transition hover:bg-gray-50">
                  Make an Offer
                </button>
              </div>
            </div>

            {/* Location */}
            <div className="mb-4 flex items-center space-x-2 text-gray-700">
              <HiLocationMarker className="w-5 h-5" />
              <span className="font-medium">{book.location}</span>
            </div>

            <div className="mb-8 overflow-hidden rounded-card border border-gray-200">
              <iframe
                title={`Map for ${book.location}`}
                src={mapUrl}
                className="h-64 w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            {/* Secondary Actions */}
            <div className="flex space-x-3">
              <button
                onClick={handleAddToWishlist}
                className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center justify-center space-x-2"
              >
                <HiHeart className={`w-5 h-5 ${wishlist ? 'text-red-500 fill-current' : ''}`} />
                <span>Wishlist</span>
              </button>
              <button className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center justify-center space-x-2">
                <HiShare className="w-5 h-5" />
                <span>Share</span>
              </button>
              <button className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center justify-center space-x-2">
                <HiFlag className="w-5 h-5" />
                <span>Report</span>
              </button>
            </div>
          </div>
        </div>

        {/* Seller Card */}
        <div className="mt-16 grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-6">About the Seller</h2>
            <div className="bg-white rounded-card p-8 border border-gray-200">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold">{book.seller.name}</h3>
                  <p className="text-gray-600 flex items-center space-x-1 mt-1">
                    <HiLocationMarker className="w-4 h-4" />
                    <span>{book.seller.location}</span>
                  </p>
                </div>
                {book.seller.verified && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm font-bold">
                    ✓ Verified
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b">
                <div>
                  <p className="text-gray-600 text-sm">Rating</p>
                  <p className="text-2xl font-bold text-yellow-500">{book.seller.rating} ⭐</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Reviews</p>
                  <p className="text-2xl font-bold">{book.seller.reviews}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Response</p>
                  <p className="text-2xl font-bold">2.3h</p>
                </div>
              </div>

              <div className="space-y-3">
                <button className="w-full py-2 border-2 border-primary text-primary rounded-lg font-bold hover:bg-primary hover:text-white transition flex items-center justify-center space-x-2">
                  <HiChat className="w-5 h-5" />
                  <span>Chat with Seller</span>
                </button>
                <button className="w-full py-2 border-2 border-primary text-primary rounded-lg font-bold hover:bg-primary hover:text-white transition flex items-center justify-center space-x-2">
                  <HiPhone className="w-5 h-5" />
                  <span>Call Seller</span>
                </button>
              </div>
            </div>
          </div>

          {/* Seller Recent Listings */}
          <div>
            <h2 className="text-2xl font-bold mb-6">More from Seller</h2>
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="bg-white rounded-card p-4 cursor-pointer hover:shadow-lg transition">
                  <div className="aspect-[3/4] bg-gray-100 rounded mb-2 text-4xl flex items-center justify-center">
                    📚
                  </div>
                  <h4 className="font-semibold text-sm line-clamp-2">Book Title Here</h4>
                  <p className="text-primary font-bold mt-2">₹299</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
