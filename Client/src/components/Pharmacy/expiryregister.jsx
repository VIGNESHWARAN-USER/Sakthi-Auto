import React, { useEffect, useState } from "react";
import Sidebar from "../Sidebar";
import axios from "axios";
import * as XLSX from "xlsx";
import { FaDownload, FaFilter, FaEraser } from "react-icons/fa";
import { motion } from "framer-motion";

const ExpiryRegister = () => {
  const [expiryRegister, setExpiryRegister] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    fetchExpiryRegister();
  }, []);

  const fetchExpiryRegister = async () => {
    setLoading(true);
    try {
      const params = {};
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;

      const res = await axios.get("http://localhost:8000/expiry_register/", { params });
      setExpiryRegister(res.data.expiry_register);
      setLoading(false);
    } catch (err) {
      setError("Failed to load expiry register.");
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setFromDate("");
    setToDate("");
    fetchExpiryRegister();
  };

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === "Not Removed") return "Not Removed";
    // Handle the month-year format by prepending a dummy day for parsing
    const fullDateStr = dateStr.includes("-") && dateStr.split("-").length === 2 ? `01-${dateStr}` : dateStr;
    const date = new Date(fullDateStr);
    
    if (isNaN(date.getTime())) return dateStr;

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleDownloadExcel = () => {
    if (!expiryRegister || expiryRegister.length === 0) {
      alert("No expiry records available to download.");
      return;
    }

    const dataToExport = expiryRegister.map((item) => ({
      "Medicine Form": item.medicine_form,
      "Brand Name": item.brand_name,
      "Chemical Name": item.chemical_name,
      "Dose/Volume": item.dose_volume,
      "Quantity": item.quantity,
      "Total Quantity": item.total_quantity || item.Total_quantity,
      "Expiry Date": formatDate(item.expiry_date),
      "Removed Date": formatDate(item.removed_date),
    }));

    const now = new Date();
    const day = now.getDate().toString().padStart(2, "0");
    const month = now.toLocaleString('default', { month: 'short' });
    const year = now.getFullYear();
    const formattedTime = `${now.getHours() % 12 || 12}.${now.getMinutes().toString().padStart(2, "0")} ${now.getHours() >= 12 ? 'PM' : 'AM'}`;
    const fileName = `Pharmacy Expiry Register - ${day}-${month}-${year} @ ${formattedTime}.xlsx`;

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ExpiryRegister");
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="h-screen w-full flex bg-gradient-to-br from-blue-300 to-blue-400">
      <Sidebar />
      <div className="w-4/5 p-8 overflow-y-auto">
        
        {/* Header Section */}
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-4xl font-bold text-gray-800">Expiry Ledger</h1>
        </div>

        <motion.div 
          className="bg-white p-8 rounded-lg shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl font-semibold mb-6 text-gray-700">Expiry History</h2>

          {/* Filter Section */}
          <div className="mb-6 flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4 items-end">
            <div>
              <label className="block text-gray-700 text-xs font-bold mb-1">From Date</label>
              <input 
                type="date" 
                value={fromDate} 
                onChange={(e) => setFromDate(e.target.value)} 
                className="p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
            <div>
              <label className="block text-gray-700 text-xs font-bold mb-1">To Date</label>
              <input 
                type="date" 
                value={toDate} 
                onChange={(e) => setToDate(e.target.value)} 
                className="p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
            <button 
              onClick={fetchExpiryRegister} 
              className="bg-blue-500 text-white px-5 py-2 rounded-md hover:bg-blue-600 flex items-center gap-2 text-sm transition font-semibold"
            >
              <FaFilter size={12} /> Get
            </button>
            <button 
              onClick={handleClearFilters} 
              className="bg-gray-500 text-white px-5 py-2 rounded-md hover:bg-gray-600 flex items-center gap-2 text-sm transition font-semibold"
            >
              <FaEraser size={12} /> Clear
            </button>
            <button 
              onClick={handleDownloadExcel} 
              className="bg-blue-700 text-white px-5 py-2 rounded-md hover:bg-blue-800 flex items-center gap-2 text-sm transition ml-auto font-semibold"
            >
              <FaDownload size={12} /> Export to Excel
            </button>
          </div>

          {/* Table Section */}
          {loading ? (
            <div className="w-full text-center py-10">
              <div className="inline-block h-10 w-10 text-blue-500 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em]"></div>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">{error}</div>
          ) : expiryRegister.length === 0 ? (
            <div className="text-center py-10 text-gray-500 italic border-2 border-dashed border-gray-100 rounded-xl">
              No expired medicines recorded for this period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto font-sans">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Form</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chemical</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dose</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Removed Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {expiryRegister.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition duration-150">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{item.medicine_form}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{item.brand_name}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.chemical_name}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{item.dose_volume}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-red-500">{item.quantity}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">{item.total_quantity}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(item.expiry_date)}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-green-700 font-semibold italic">
                        {formatDate(item.removed_date)}
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

export default ExpiryRegister;