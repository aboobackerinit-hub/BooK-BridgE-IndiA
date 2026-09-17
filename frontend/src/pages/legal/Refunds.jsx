import React from 'react';

const Refunds = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Refunds & Cancellations</h1>
      
      <p className="mb-4">
        Our refund and cancellation policies differ depending on whether you purchased from the BookBridge Store or from a P2P Marketplace Seller.
      </p>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-3 text-blue-900">1. BookBridge Store Purchases</h2>
        <p className="mb-4 text-blue-800">
          Items purchased directly from the official BookBridge Store or authorized premium publishers.
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-2 text-blue-800">
          <li><strong>Cancellations:</strong> You can cancel an order before it has been dispatched for a full refund.</li>
          <li><strong>Returns:</strong> Returns are accepted within 7 days of delivery if the book is damaged in transit, defective, or incorrect.</li>
          <li><strong>Refund Process:</strong> Approved refunds will be credited to the original payment method within 5-7 business days.</li>
        </ul>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-4">
        <h2 className="text-xl font-semibold mb-3 text-amber-900">2. P2P Marketplace Purchases</h2>
        <p className="mb-4 text-amber-800">
          Items purchased from other individual users on the platform.
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-2 text-amber-800">
          <li><strong>All Sales Are Final:</strong> Because these are user-to-user transactions for used items, BookBridge does not mandate returns or refunds for buyer's remorse.</li>
          <li><strong>Disputes:</strong> If the item received is significantly not as described, you must report it within 48 hours of delivery. BookBridge will attempt to mediate, but the final resolution depends on the seller's cooperation.</li>
          <li><strong>Cancellations:</strong> Buyers and sellers can mutually agree to cancel a transaction before shipment through the chat interface.</li>
        </ul>
      </div>
    </div>
  );
};

export default Refunds;
