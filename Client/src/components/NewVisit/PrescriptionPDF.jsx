import React from "react";

const Prescription = () => {
  return (
    <div className="max-w-3xl mx-auto border-2 border-blue-300 p-6 bg-blue-50 rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-2 mb-4">
        <h1 className="text-lg font-bold text-gray-800">
          <span className="text-2xl">✶</span> JSW STEEL LTD, SALEM WORKS
        </h1>
        <div className="text-right">
          <p className="text-sm font-semibold">Date: <span className="underline">26/06/2024</span></p>
          <p className="text-sm">S/B Dr. <span className="underline">Kumar</span></p>
        </div>
      </div>

      {/* Patient Info */}
      <div className="mb-4 text-gray-800">
        <p><strong>Name :</strong> Ramesh</p>
        <p><strong>Age :</strong> 25</p>
        <p><strong>Sex :</strong> Male</p>
      </div>

      {/* Vitals */}
      <div className="mb-4 text-gray-800">
        <h2 className="font-bold">Vitals :</h2>
        <p>BP: Sys - 23, Di - 24 &nbsp;&nbsp; Res: 18 &nbsp;&nbsp; SpO2: -- &nbsp;&nbsp; Weight: 67 Kg</p>
      </div>

      {/* Complaints */}
      <div className="mb-4">
        <h2 className="font-bold">C/o :</h2>
        <p className="text-gray-600">Comments .....</p>
      </div>

      {/* Diagnosis */}
      <div className="mb-4">
        <h2 className="font-bold">Diagnosis :</h2>
        <p className="text-gray-600">Comments .....</p>
      </div>

      {/* Prescription */}
      <div className="mb-6">
        <h2 className="font-bold text-2xl">Rx :</h2>

        {/* Tablets */}
        <div className="mt-2">
          <h3 className="font-bold">Tablets :</h3>
          <div className="grid grid-cols-5 gap-2 text-sm font-semibold">
            <span>Name of Tablet</span>
            <span>Qty</span>
            <span>Timing</span>
            <span>Food</span>
            <span>Days</span>
          </div>
        </div>

        {/* Injection */}
        <div className="mt-2">
          <h3 className="font-bold">Injection :</h3>
          <div className="grid grid-cols-2 gap-2 text-sm font-semibold">
            <span>Name of Injection</span>
            <span>Qty</span>
          </div>
        </div>

        {/* Creams */}
        <div className="mt-2">
          <h3 className="font-bold">Creams :</h3>
          <div className="grid grid-cols-2 gap-2 text-sm font-semibold">
            <span>Name of Creams</span>
            <span>Qty</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center border-t pt-4">
        <p className="text-gray-600">Signature</p>
        <button className="border px-4 py-2 rounded-lg flex items-center space-x-2 bg-gray-200">
          <span>☺</span>
          <span className="text-xs font-semibold">EAT HEALTHY, SLEEP WELL, LAUGH MORE</span>
          <span>☺</span>
        </button>
      </div>
    </div>
  );
};

export default Prescription;