import React, { useEffect, useState } from "react";
import Sidebar from "../Sidebar";
import axios from "axios";
import * as XLSX from "xlsx";
import { FaDownload, FaSearch } from "react-icons/fa";
import { motion } from "framer-motion";

const CurrentStock = () => {
  const [stockData, setStockData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const doArchiveAndFetch = async () => {
      try {
        await axios.post("http://localhost:8000/archive_stock/");
        const res = await axios.get("http://localhost:8000/current_stock/");
        setStockData(res.data.stock);
        setFilteredData(res.data.stock);
      } catch (err) {
        setError("Error archiving or loading stock.");
      } finally {
        setLoading(false);
      }
    };

    doArchiveAndFetch();
  }, []);

  const handleSearch = (e) => {
    const value = e.target.value.toLowerCase();
    setSearchTerm(value);

    if (value === "") {
      setFilteredData(stockData);
    } else {
      const filtered = stockData.filter((item) => {
        const brand = (item.brand_name || "").toLowerCase();
        const chem = (item.chemical_name || "").toLowerCase();
        return brand.includes(value) || chem.includes(value);
      });
      setFilteredData(filtered);
    }
  };

  const handleDownloadExcel = () => {
    if (!stockData || stockData.length === 0) {
      alert("No stock available to download.");
      return;
    }

    const now = new Date();
    const day = now.getDate().toString().padStart(2, "0");
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[now.getMonth()];
    const year = now.getFullYear();

    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    
    const timeFormatted = `${hours}.${minutes} ${ampm}`;
    const fileName = `Pharmacy Current Stock - ${day}-${month}-${year} @ ${timeFormatted}.xlsx`;

    const ws = XLSX.utils.json_to_sheet(stockData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "StockData");
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="h-screen w-full flex bg-gradient-to-br from-blue-300 to-blue-400">
      <Sidebar />
      <div className="w-4/5 p-8 overflow-y-auto">
        
        {/* Header Section */}
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-4xl font-bold text-gray-800">Pharmacy Inventory</h1>
          <button
            onClick={handleDownloadExcel}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold px-5 py-2.5 rounded-lg shadow-md transition duration-300"
          >
            <FaDownload size={15} />
            <span>Export to Excel</span>
          </button>
        </div>

        <motion.div 
          className="bg-white p-8 rounded-lg shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl font-semibold mb-6 text-gray-700">Current Stock Details</h2>

          {/* Search Bar Row */}
          <div className="mb-6 flex flex-col md:flex-row items-center gap-4">
            <div className="w-full md:w-1/2">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Search Medicines
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <FaSearch size={14} />
                </span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearch}
                  placeholder="Search by Brand or Chemical Name..."
                  className="w-full pl-10 p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                />
              </div>
            </div>
            <div className="hidden md:flex flex-col justify-end h-full pt-7">
               <p className="text-xs text-gray-500 italic">Showing {filteredData.length} items in stock</p>
            </div>
          </div>

          {/* Table Container */}
          {loading ? (
            <div className="w-full text-center py-10">
              <div className="inline-block h-10 w-10 text-blue-500 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em]"></div>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">{error}</div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-10 text-gray-500">No stock records available.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto font-sans">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Form</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chemical Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dose</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entry Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition duration-150">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{item.medicine_form}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{item.brand_name}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.chemical_name}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{item.dose_volume}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.entry_date}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{item.total_quantity}</td>
                      <td className={`px-4 py-4 whitespace-nowrap text-sm font-bold`}>
                        <span className={`px-2 py-1 rounded ${
                          item.quantity_expiry <= 10 ? 'bg-red-100 text-red-700' : 
                          item.quantity_expiry <= 30 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {item.quantity_expiry}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{item.expiry_date}</td>
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

export default CurrentStock;