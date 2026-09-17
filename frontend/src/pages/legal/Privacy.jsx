import React from 'react';

const Privacy = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Privacy Policy</h1>
      
      <p className="mb-4">Last Updated: {new Date().toLocaleDateString()}</p>

      <h2 className="text-xl font-semibold mt-6 mb-3 text-gray-800">1. Information We Collect</h2>
      <p className="mb-4">
        We collect information you provide directly to us, including:
      </p>
      <ul className="list-disc pl-6 mb-4 space-y-2">
        <li>Name, email address, and verified 10-digit mobile number</li>
        <li>Shipping and billing addresses</li>
        <li>Profile information, including profile pictures</li>
        <li>Communications with other users via our built-in chat</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-3 text-gray-800">2. How We Use Your Information</h2>
      <p className="mb-4">
        We use the information we collect to:
      </p>
      <ul className="list-disc pl-6 mb-4 space-y-2">
        <li>Provide, maintain, and improve the BookBridge platform</li>
        <li>Process transactions and send related information (e.g., confirmations, receipts)</li>
        <li>Facilitate communication between buyers and sellers in the P2P Marketplace</li>
        <li>Monitor and prevent fraud, spam, and abuse</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-3 text-gray-800">3. Sharing of Information</h2>
      <p className="mb-4">
        <strong>Important note for Marketplace Users:</strong> When you engage in a P2P transaction, certain information (such as your name, profile picture, and general location) is shared with the other party to facilitate the transaction. We strongly advise using the built-in BookBridge chat rather than sharing your personal phone number or email directly.
      </p>
      <p className="mb-4">
        We do not sell your personal data to third parties. We may share data with legal authorities if required by Indian law.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3 text-gray-800">4. Data Security & Rights</h2>
      <p className="mb-4">
        We take reasonable measures to help protect information about you from loss, theft, misuse, unauthorized access, disclosure, alteration, and destruction. You have the right to request access to, or deletion of, your personal data by contacting our Grievance Officer.
      </p>
    </div>
  );
};

export default Privacy;
