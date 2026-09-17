import React from 'react';

const MarketplaceRules = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Marketplace Rules</h1>
      
      <p className="mb-4">
        The BookBridge P2P Marketplace is a community platform connecting book lovers. To maintain a safe and trusted environment, all users must adhere to the following rules.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3 text-gray-800">1. Accurate Listings</h2>
      <ul className="list-disc pl-6 mb-4 space-y-2">
        <li>All listings must be for physical books. Digital copies (PDFs, EPUBs) are strictly prohibited.</li>
        <li>You must accurately describe the condition of the book (e.g., Like New, Good, Acceptable, Poor).</li>
        <li>Upload clear, original photos of the actual book you are selling. Do not use stock images.</li>
        <li>Disclose any damages, missing pages, or heavy highlighting in the description.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-3 text-gray-800">2. Communication & Transactions</h2>
      <ul className="list-disc pl-6 mb-4 space-y-2">
        <li>All communication should take place within the BookBridge chat system.</li>
        <li>Do not spam other users or use offensive language.</li>
        <li>Prices negotiated in chat are binding between the buyer and seller.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-3 text-gray-800">3. Intermediary Role</h2>
      <p className="mb-4">
        Please remember that for marketplace listings, BookBridge is merely an <strong>intermediary</strong>. 
        We do not warehouse these books, nor do we verify their quality firsthand. The responsibility for fulfilling the order and ensuring item quality rests solely with the seller.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3 text-gray-800">4. Violations</h2>
      <p className="mb-4">
        Violation of these rules may result in the immediate removal of your listings, suspension of your account, or permanent banning from the BookBridge platform, at our sole discretion.
      </p>
    </div>
  );
};

export default MarketplaceRules;
