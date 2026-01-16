import React, { useEffect, useState } from "react";
import Sidebar from "../Sidebar";
import axios from "axios";
import { motion } from "framer-motion";
import { FaTrashAlt, FaCheckCircle } from "react-icons/fa";

const CurrentExpiry = () => {
  const [expiryStock, setExpiryStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch expiry stock
  const fetchExpiryStock = () => {
    setLoading(true);
    axios
      .post("http://localhost:8000/current_expiry/")
      .then((response) => {
        setExpiryStock(response.data.expiry_stock);
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to load expiry stock.");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchExpiryStock();
  }, []);

  // Remove expired medicine
  const handleRemove = async (id) => {
    if (!window.confirm("Are you sure you want to mark this item as removed?")) return;
    
    try {
      const response = await axios.post("http://localhost:8000/remove_expiry/", { id });

      if (response.data.success) {
        // Update UI: Set removed_date to today's date for the removed item
        setExpiryStock(expiryStock.map(med =>
          med.id === id ? { ...med, removed_date: new Date().toISOString().split("T")[0] } : med
        ));
      }
    } catch (error) {
      console.error("Error removing medicine:", error);
      alert("Failed to remove medicine");
    }
  };

  return (
    <div className="h-screen w-full flex bg-gradient-to-br from-blue-300 to-blue-400">
      <Sidebar />
      <div className="w-4/5 p-8 overflow-y-auto">
        {/* Header Section */}
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-4xl font-bold text-gray-800">Expiry Tracker</h1>
        </div>

        <motion.div 
          className="bg-white p-8 rounded-lg shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl font-semibold mb-6 text-gray-700">
            Current Expiry Medicines
          </h2>

          {loading ? (
            <div className="w-full text-center py-10">
              <div className="inline-block h-10 w-10 text-blue-500 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em]"></div>
              <p className="mt-2 text-gray-500">Loading inventory...</p>
            </div>
          ) : error ? (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          ) : expiryStock.length === 0 ? (
            <div className="text-center py-10 text-gray-500 italic">
              No expiring medicines found for the upcoming period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto font-sans">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Form</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chemical Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dose</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry Date</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {expiryStock.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition duration-150">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{item.medicine_form}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{item.brand_name}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.chemical_name}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{item.dose_volume}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-blue-600">{item.quantity}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-red-600 font-medium">{item.expiry_date}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        {item.removed_date ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                            <FaCheckCircle /> Removed
                          </span>
                        ) : (
                          <button
                            onClick={() => handleRemove(item.id)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-xs font-bold rounded-lg shadow hover:bg-red-600 transition duration-200"
                          >
                            <FaTrashAlt /> Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default CurrentExpiry;