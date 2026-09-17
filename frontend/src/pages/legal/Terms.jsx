import React from 'react';

const Terms = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Terms & Conditions</h1>
      
      <p className="mb-4">Last Updated: {new Date().toLocaleDateString()}</p>
      
      <h2 className="text-xl font-semibold mt-6 mb-3 text-gray-800">1. Acceptance of Terms</h2>
      <p className="mb-4">
        By accessing or using BookBridge ("the Platform"), you agree to be bound by these Terms & Conditions. 
        If you do not agree to these terms, please do not use our services.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3 text-gray-800">2. Our Commerce Models</h2>
      <p className="mb-4">
        BookBridge operates under two distinct commerce models. Your rights and responsibilities vary depending on which model you are engaging with:
      </p>
      <ul className="list-disc pl-6 mb-4 space-y-2">
        <li>
          <strong>BookBridge Store:</strong> Direct sales where BookBridge or an authorized seller is the merchant of record. These products are fulfilled directly.
        </li>
        <li>
          <strong>Peer-to-Peer (P2P) Marketplace:</strong> A platform where individual users can list, buy, and sell used books. For these transactions, BookBridge acts solely as an <em>intermediary</em> under the Information Technology Act, 2000. We do not own the items, and the contract of sale is strictly between the buyer and the seller.
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-3 text-gray-800">3. User Accounts</h2>
      <p className="mb-4">
        You must provide accurate and complete information when creating an account, including a valid 10-digit Indian mobile number. You are responsible for maintaining the confidentiality of your account credentials.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3 text-gray-800">4. Intermediary Status & Limitation of Liability</h2>
      <p className="mb-4">
        For P2P Marketplace listings, BookBridge provides a platform for discovery and communication. We do not guarantee the quality, safety, or legality of items advertised, the truth or accuracy of listings, or the ability of sellers to sell items or buyers to pay for them.
      </p>
      <p className="mb-4">
        BookBridge shall not be liable for any indirect, incidental, special, consequential or punitive damages arising out of your use of the platform.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3 text-gray-800">5. Governing Law</h2>
      <p className="mb-4">
        These Terms shall be governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in [Placeholder City], India.
      </p>
    </div>
  );
};

export default Terms;
