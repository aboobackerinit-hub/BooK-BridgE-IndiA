import React from 'react';

const Safety = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Safety Tips</h1>
      
      <p className="mb-4">
        Your safety is our top priority. Please follow these guidelines when engaging in P2P transactions on BookBridge.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3 text-gray-800">1. Keep Communication on Platform</h2>
      <p className="mb-4">
        Always use the BookBridge built-in chat system. Do not share your personal phone number, WhatsApp, or email address with strangers. Scammers often try to take the conversation off-platform to avoid our security systems.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3 text-gray-800">2. Secure Transactions</h2>
      <p className="mb-4">
        BookBridge does not currently support escrow for P2P payments. We recommend using secure shipping methods where possible. 
        <strong>Avoid face-to-face meetups with strangers.</strong> If you must meet locally, we strongly advise using professional courier or local delivery apps (like Dunzo, Swiggy Genie, or Porter) to exchange the item rather than meeting in person.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3 text-gray-800">3. Beware of Phishing</h2>
      <p className="mb-4">
        BookBridge will never ask for your UPI PIN, banking passwords, or OTPs. If a buyer claims they sent you money and sends a link asking you to "enter your UPI PIN to receive funds", <strong>it is a scam</strong>. You only enter a UPI PIN to <em>send</em> money, never to receive it.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3 text-gray-800">4. Report Suspicious Activity</h2>
      <p className="mb-4">
        If a user is acting suspiciously, making threats, or violating marketplace rules, please use the "Report User" feature in the chat or contact our support team immediately.
      </p>
    </div>
  );
};

export default Safety;
