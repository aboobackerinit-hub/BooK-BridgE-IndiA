import React from 'react';

const Grievance = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Grievance Officer</h1>
      
      <p className="mb-4">
        In accordance with the Information Technology Act, 2000, and the rules made thereunder, including the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, the name and contact details of the Grievance Officer are provided below:
      </p>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Mr. / Ms. [Placeholder Name]</h2>
        <p className="text-gray-700 mb-4">Grievance Officer, BookBridge</p>
        
        <div className="space-y-3">
          <div>
            <strong className="text-gray-900 block">Email:</strong>
            <a href="mailto:grievance@bookbridge.placeholder" className="text-primary hover:underline">
              [Placeholder Email Address]
            </a>
          </div>
          
          <div>
            <strong className="text-gray-900 block">Phone:</strong>
            <span className="text-gray-700">[Placeholder Phone Number]</span>
            <span className="text-sm text-gray-500 ml-2">(Mon - Fri, 9:00 AM to 6:00 PM IST)</span>
          </div>

          <div>
            <strong className="text-gray-900 block">Address:</strong>
            <p className="text-gray-700 whitespace-pre-line">
              [Placeholder Company Name] Pvt. Ltd.{"\n"}
              [Placeholder Building/Street] {"\n"}
              [Placeholder City, State, Pincode]{"\n"}
              India
            </p>
          </div>
        </div>
      </div>

      <p className="mt-6 text-sm text-gray-600">
        Please note that the Grievance Officer is strictly for legal, policy, and compliance issues. For general customer support, order tracking, or app issues, please contact our general support team.
      </p>
    </div>
  );
};

export default Grievance;
