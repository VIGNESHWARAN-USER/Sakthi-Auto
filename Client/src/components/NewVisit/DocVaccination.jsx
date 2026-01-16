import React, { useState } from "react";

const Vaccination = () => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [showNewVaccinePopup, setShowNewVaccinePopup] = useState(false);
  const [newVaccineName, setNewVaccineName] = useState("");

  const handleAddNewVaccine = () => {
    if (newVaccineName.trim()) {
      alert(`New Vaccine Added: ${newVaccineName}`);
      setNewVaccineName("");
      setShowNewVaccinePopup(false);
    } else {
      alert("Please enter a valid vaccine name.");
    }
  };

  return (
    <div className=" mt-8">
      

      {/* Vaccination Section */}
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-6">Vaccination Information</h1>

        <div className="grid grid-cols-2 gap-8">
          <div>
            <label className="block mb-2 text-lg font-medium">Select Vaccine</label>
            <select className="px-4 py-2 w-full bg-blue-100 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Select</option>
              <option>Vaccine 1</option>
              <option>Vaccine 2</option>
              <option>Vaccine 3</option>
              <option onClick={() => setShowNewVaccinePopup(true)}>Add New Vaccine</option>
            </select>
          </div>
          <div>
            <label className="block mb-2 text-lg font-medium">Status</label>
            <select className="px-4 py-2 w-full bg-blue-100 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Full</option>
              <option>Partial</option>
            </select>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-8">
          {/* Normal Doses */}
          <div>
            <h2 className="text-lg font-medium">Normal Doses</h2>
            {[...Array(5)].map((_, index) => (
              <div className="grid grid-cols-2 gap-4 mt-2" key={index}>
                <input
                  type="date"
                  className="px-4 py-2 w-full bg-blue-100 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder={`Dose ${index + 1} Name`}
                  className="px-4 py-2 w-full bg-blue-100 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>

          {/* Booster Doses */}
          <div>
            <h2 className="text-lg font-medium">Booster Dose</h2>
            {[...Array(5)].map((_, index) => (
              <div className="grid grid-cols-2 gap-4 mt-2" key={index}>
                <input
                  type="date"
                  className="px-4 py-2 w-full bg-blue-100 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder={`Booster ${index + 1} Name`}
                  className="px-4 py-2 w-full bg-blue-100 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar Popup */}
      {showCalendar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-8 rounded-md shadow-md w-96">
            <h2 className="text-xl font-bold mb-4">Calendar</h2>
            <input
              type="date"
              className="px-4 py-2 w-full bg-blue-100 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end">
              <button
                className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
                onClick={() => setShowCalendar(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Vaccine Popup */}
      {showNewVaccinePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-8 rounded-md shadow-md w-96">
            <h2 className="text-xl font-bold mb-4">Enter New Vaccine Name</h2>
            <input
              type="text"
              value={newVaccineName}
              onChange={(e) => setNewVaccineName(e.target.value)}
              className="px-4 py-2 w-full bg-blue-100 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="New Vaccine Name"
            />
            <div className="flex justify-end space-x-4">
              <button
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                onClick={() => setShowNewVaccinePopup(false)}
              >
                Cancel
              </button>
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                onClick={handleAddNewVaccine}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vaccination;