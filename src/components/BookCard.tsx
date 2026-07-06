import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { HiHeart, HiShare, HiFlag, HiStar } from 'react-icons/hi';
import { Book } from '@/types';

interface BookCardProps {
  book: Book;
  onWishlist?: boolean;
  onWishlistClick?: () => void;
}

export const BookCard: React.FC<BookCardProps> = ({ book, onWishlist, onWishlistClick }) => {
  return (
    <Link href={`/book/${book.id}`}>
      <div className="bg-white rounded-card border border-gray-200 overflow-hidden hover:shadow-lg transition cursor-pointer">
        {/* Image Container */}
        <div className="relative w-full aspect-[3/4] bg-gray-100 overflow-hidden group">
          {book.image_urls && book.image_urls[0] ? (
            <Image
              src={book.image_urls[0]}
              alt={book.title}
              fill
              className="object-cover group-hover:scale-105 transition"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200 text-4xl">📚</div>
          )}
          
          {/* Overlay Actions */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition flex items-center justify-center space-x-4">
            <button
              onClick={(e) => {
                e.preventDefault();
                onWishlistClick?.();
              }}
              className="opacity-0 group-hover:opacity-100 transition bg-white rounded-full p-3 hover:bg-gray-100"
            >
              <HiHeart className={`w-5 h-5 ${onWishlist ? 'text-red-500 fill-current' : 'text-gray-600'}`} />
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
              }}
              className="opacity-0 group-hover:opacity-100 transition bg-white rounded-full p-3 hover:bg-gray-100"
            >
              <HiShare className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Condition Badge */}
          <div className="absolute top-2 left-2 bg-accent text-gray-900 text-xs font-bold px-2 py-1 rounded">
            {book.condition.toUpperCase()}
          </div>

          {/* Type Badge */}
          {book.book_type !== 'buy' && (
            <div className="absolute top-2 right-2 bg-primary text-white text-xs font-bold px-2 py-1 rounded">
              {book.book_type.toUpperCase()}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 line-clamp-2 mb-1 text-sm">{book.title}</h3>
          <p className="text-xs text-gray-500 mb-2">{book.author}</p>
          
          {/* Rating */}
          <div className="flex items-center space-x-1 mb-3">
            <div className="flex text-yellow-400">
              {[...Array(5)].map((_, i) => (
                <HiStar key={i} className={`w-3 h-3 ${i < Math.round(book.publisher ? 4 : 3) ? 'fill-current' : ''}`} />
              ))}
            </div>
            <span className="text-xs text-gray-500">(12)</span>
          </div>

          {/* Price */}
          <div className="flex items-baseline space-x-2 mb-3">
            <span className="font-bold text-lg text-primary">₹{book.price}</span>
            {book.negotiable && <span className="text-xs text-gray-500">Negotiable</span>}
          </div>

          {/* Location */}
          <p className="text-xs text-gray-500 mb-3">📍 {book.location}</p>

          {/* CTA Button */}
          <button className="w-full py-2 bg-gradient-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition">
            View Details
          </button>
        </div>
      </div>
    </Link>
  );
};
