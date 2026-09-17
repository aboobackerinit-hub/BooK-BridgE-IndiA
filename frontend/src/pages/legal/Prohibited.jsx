import React from 'react';

const Prohibited = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Prohibited Items</h1>
      
      <p className="mb-4">
        To maintain a legal and safe marketplace, the following items are strictly prohibited from being listed on BookBridge.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3 text-gray-800">1. Digital Media & Pirated Copies</h2>
      <ul className="list-disc pl-6 mb-4 space-y-2">
        <li>PDFs, EPUBs, MOBI, or any other digital ebook formats.</li>
        <li>Photocopied or printed/bound versions of copyrighted books without authorization.</li>
        <li>Unauthorized translations or adaptations.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-3 text-gray-800">2. Non-Book Items</h2>
      <ul className="list-disc pl-6 mb-4 space-y-2">
        <li>Electronics, clothing, furniture, or any item that is not a book, comic, or study material.</li>
        <li>Promotional material or services (e.g., tutoring services, assignment writing).</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-3 text-gray-800">3. Illegal & Restricted Content</h2>
      <ul className="list-disc pl-6 mb-4 space-y-2">
        <li>Materials that promote hate speech, violence, or illegal activities.</li>
        <li>Pornographic or explicitly obscene materials prohibited by Indian law.</li>
        <li>State-banned literature or content that threatens national security.</li>
      </ul>

      <p className="mt-8 text-sm text-gray-500">
        Note: If you encounter a prohibited listing, please report it immediately using the report button on the listing page.
      </p>
    </div>
  );
};

export default Prohibited;
