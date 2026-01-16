import React from "react";

const ViewDetails = () => {
  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Appointments</h2>
        <button
          className="px-4 py-2 bg-red-500 text-white rounded"
          onClick={() => console.log("Close")}
        >
          Close
        </button>
      </div>

      <div className="bg-white shadow rounded p-6">
        {/* Basic Details */}
        <h3 className="text-lg font-bold mb-4">Basic Details</h3>
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div>
            <label className="block text-gray-700">Patient ID</label>
            <input
              type="text"
              className="w-full border rounded p-2"
              placeholder="Enter Patient ID"
            />
            <label className="block text-gray-700 mt-4">Gender</label>
            <input
              type="text"
              className="w-full border rounded p-2"
              placeholder="Enter Gender"
            />
            <label className="block text-gray-700 mt-4">Nature of Job</label>
            <input
              type="text"
              className="w-full border rounded p-2"
              placeholder="Enter Nature of Job"
            />
            <label className="block text-gray-700 mt-4">Mobile No.</label>
            <input
              type="text"
              className="w-full border rounded p-2"
              placeholder="Enter Mobile No."
            />
          </div>
          <div>
            <label className="block text-gray-700">Patient Name</label>
            <input
              type="text"
              className="w-full border rounded p-2"
              placeholder="Enter Patient Name"
            />
            <label className="block text-gray-700 mt-4">Department</label>
            <input
              type="text"
              className="w-full border rounded p-2"
              placeholder="Enter Department"
            />
            <label className="block text-gray-700 mt-4">Aadhaar Number</label>
            <input
              type="text"
              className="w-full border rounded p-2"
              placeholder="Enter Aadhaar Number"
            />
            <label className="block text-gray-700 mt-4">Blood Group</label>
            <input
              type="text"
              className="w-full border rounded p-2"
              placeholder="Enter Blood Group"
            />
          </div>
          <div>
            <label className="block text-gray-700">Hospital</label>
            <input
              type="text"
              className="w-full border rounded p-2"
              placeholder="Enter Hospital"
            />
            <label className="block text-gray-700 mt-4">Designation</label>
            <input
              type="text"
              className="w-full border rounded p-2"
              placeholder="Enter Designation"
            />
            <label className="block text-gray-700 mt-4">Address</label>
            <input
              type="text"
              className="w-full border rounded p-2"
              placeholder="Enter Address"
            />
          </div>
        </div>

        {/* Vitals */}
        <h3 className="text-lg font-bold mb-4">Vitals</h3>
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-gray-700">Systolic</label>
            <input
              type="text"
              className="w-full border rounded p-2"
              placeholder="Enter Systolic"
            />
            <label className="block text-gray-700 mt-4">Diolic</label>
            <input
              type="text"
              className="w-full border rounded p-2"
              placeholder="Enter Diolic"
            />
          </div>
          <div>
            <label className="block text-gray-700">Pulse Rate</label>
            <input
              type="text"
              className="w-full border rounded p-2"
              placeholder="Enter Pulse Rate"
            />
            <label className="block text-gray-700 mt-4">Respiratory Rate</label>
            <input
              type="text"
              className="w-full border rounded p-2"
              placeholder="Enter Respiratory Rate"
            />
          </div>
          <div>
            <label className="block text-gray-700">Sp O2</label>
            <input
              type="text"
              className="w-full border rounded p-2"
              placeholder="Enter Sp O2"
            />
            <label className="block text-gray-700 mt-4">Height</label>
            <input
              type="text"
              className="w-full border rounded p-2"
              placeholder="Enter Height"
            />
          </div>
          <div>
            <label className="block text-gray-700">Temperature</label>
            <input
              type="text"
              className="w-full border rounded p-2"
              placeholder="Enter Temperature"
            />
            <label className="block text-gray-700 mt-4">Weight</label>
            <input
              type="text"
              className="w-full border rounded p-2"
              placeholder="Enter Weight"
            />
          </div>
        </div>

        {/* Renal Function Test */}
        <h3 className="text-lg font-bold mb-4">Renal Function Test</h3>
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div>
            <p className="font-semibold">Name</p>
            {[
              "Blood urea nitrogen (BUN) (mg/dL)",
              "Sr.Creatinine (mg/dL)",
              "Sodium (meg/dL)",
              "Calcium (mg/dL)",
              "Potassium (meg/dL)",
              "Uric acid (mg/dL)",
            ].map((label, index) => (
              <p key={index}>{label}</p>
            ))}
          </div>
          <div>
            <p className="font-semibold">Result</p>
            {Array(6)
              .fill(0)
              .map((_, index) => (
                <input
                  key={index}
                  type="text"
                  className="w-full border rounded p-2 mb-2"
                  placeholder={`Result ${index + 1}`}
                />
              ))}
          </div>
          <div>
            <p className="font-semibold">Reference Range</p>
            {[
              "1-2 (mg/dL)",
              "50-60 (mg/dL)",
              "1-2 (mg/dL)",
              "50-60 (mg/dL)",
            ].map((label, index) => (
              <p key={index}>{label}</p>
            ))}
          </div>
        </div>

        {/* Fitness */}
        <h3 className="text-lg font-bold mb-4">Fitness</h3>
        <div className="flex gap-6 mb-8">
          <div>
            <label className="block text-gray-700">Fit Status</label>
            <select
              className="w-full border rounded p-2"
              defaultValue="Fit to Join"
            >
              <option>Fit to Join</option>
              <option>Unfit</option>
              <option>Conditional Fit</option>
            </select>
          </div>
          <div>
            <label className="block text-gray-700">Comments</label>
            <textarea
              className="w-full border rounded p-2"
              placeholder="Add comments"
            />
          </div>
        </div>

        {/* Medical History */}
        <h3 className="text-lg font-bold mb-4">Medical Surgical History</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-gray-700">Personal History</label>
            <select
              multiple
              className="w-full border rounded p-2"
              defaultValue={["Smoker"]}
            >
              <option>Smoker</option>
              <option>Alcoholic</option>
              <option>Veg</option>
              <option>Mixed Diet</option>
            </select>
          </div>
          <div>
            <label className="block text-gray-700">Medical History</label>
            <select multiple className="w-full border rounded p-2">
              <option>BP</option>
              <option>DM</option>
              <option>Others</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewDetails;