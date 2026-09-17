import React from 'react';
import { Link } from 'react-router-dom';

const FAQ = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Frequently Asked Questions</h1>

      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-lg text-gray-900 mb-2">What is the difference between the BookBridge Store and the Marketplace?</h3>
          <p className="text-gray-700">
            The <strong>BookBridge Store</strong> features new books sold directly by us or authorized publishers. 
            The <strong>Marketplace</strong> is a platform where you can buy and sell used books directly with other individual users.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-lg text-gray-900 mb-2">Is it safe to buy from other users?</h3>
          <p className="text-gray-700">
            While we strive to keep our community safe, marketplace transactions are between you and the seller. We recommend reviewing our <Link to="/legal/safety" className="text-primary hover:underline">Safety Tips</Link> and always communicating via the in-app chat.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-lg text-gray-900 mb-2">Can I return a used book?</h3>
          <p className="text-gray-700">
            Sales on the P2P Marketplace are generally final. Returns for used books are up to the discretion of the individual seller. Please read our <Link to="/legal/refunds" className="text-primary hover:underline">Refund Policy</Link> for full details.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-lg text-gray-900 mb-2">Can I sell PDF or digital copies of books?</h3>
          <p className="text-gray-700">
            No. BookBridge is exclusively for physical books. Selling or distributing digital copies (PDFs, EPUBs) is strictly prohibited as per our <Link to="/legal/prohibited" className="text-primary hover:underline">Prohibited Items Policy</Link> and may result in an immediate ban.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-lg text-gray-900 mb-2">How do I report a listing or user?</h3>
          <p className="text-gray-700">
            You can use the 'Report' button available on every listing page and within the chat interface. Our moderation team reviews these reports promptly.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FAQ;
