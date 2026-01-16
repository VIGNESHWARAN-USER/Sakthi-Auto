import React, { useEffect, useState, useCallback } from "react";
import Sidebar from "../Sidebar";
import axios from "axios";
import * as XLSX from "xlsx";
import { FaDownload, FaEraser, FaSearch, FaFilter } from "react-icons/fa";
import { motion } from "framer-motion";

const API_BASE_URL = "http://localhost:8000";
const CURRENT_STOCK_URL = `${API_BASE_URL}/current_stock/`;
const STOCK_HISTORY_URL = `${API_BASE_URL}/stock_history/`;

const StockHistory = () => {
  const [combinedStock, setCombinedStock] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [currentRes, historyRes] = await Promise.all([
        axios.get(CURRENT_STOCK_URL),
        axios.get(STOCK_HISTORY_URL),
      ]);

      const currentStock = (currentRes.data.stock || []).map(item => ({
        ...item,
        dataType: 'Current',
        displayQuantity: item.quantity_expiry
      }));

      const stockHistory = (historyRes.data.stock_history || []).map(item => ({
        ...item,
        dataType: 'Expired',
        displayQuantity: item.total_quantity_recorded || item.total_quantity_sum
      }));

      const allData = [...currentStock, ...stockHistory];

      allData.sort((a, b) => {
         if (a.dataType !== b.dataType) return a.dataType.localeCompare(b.dataType);
         if (a.brand_name !== b.brand_name) return a.brand_name.localeCompare(b.brand_name);
         return new Date(b.entry_date) - new Date(a.entry_date);
      });

      setCombinedStock(allData);
    } catch (err) {
      setError("Error loading stock history. Please check your connection.");
      setCombinedStock([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    let result = combinedStock;
    if (searchTerm) {
      const lowerValue = searchTerm.toLowerCase();
      result = result.filter(item =>
          item.brand_name?.toLowerCase().includes(lowerValue) ||
          item.chemical_name?.toLowerCase().includes(lowerValue)
      );
    }
    if (fromDate) result = result.filter(item => item.entry_date && item.entry_date >= fromDate);
    if (toDate) result = result.filter(item => item.entry_date && item.entry_date <= toDate);
    setFilteredData(result);
  }, [combinedStock, searchTerm, fromDate, toDate]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setFromDate("");
    setToDate("");
  };

  const handleDownloadExcel = () => {
    if (!filteredData.length) return;
    const dataForExport = filteredData.map(item => ({
      "Type": item.dataType,
      "Medicine Form": item.medicine_form,
      "Brand Name": item.brand_name,
      "Chemical Name": item.chemical_name,
      "Dose/Volume": item.dose_volume,
      "Quantity": item.displayQuantity,
      "Entry Date": item.entry_date,
      "Expiry Date": item.expiry_date,
    }));

    const now = new Date();
    const fileName = `Stock_Report_${now.getDate()}_${now.getMonth()+1}_${now.getFullYear()}.xlsx`;
    const ws = XLSX.utils.json_to_sheet(dataForExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "StockReport");
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="h-screen w-full flex bg-gradient-to-br from-blue-300 to-blue-400">
      <Sidebar />
      <div className="w-4/5 p-8 overflow-y-auto">
        
        {/* Header Section */}
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-4xl font-bold text-gray-800">Stock Report</h1>
        </div>

        <motion.div 
          className="bg-white p-8 rounded-lg shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl font-semibold mb-6 text-gray-700">Detailed Inventory History</h2>

          {/* Filters Row */}
          <div className="mb-8 flex flex-wrap items-end gap-4 border-b border-gray-100 pb-6">
            <div className="flex-grow min-w-[250px]">
              <label className="block text-gray-700 text-xs font-bold mb-2 uppercase tracking-wide">Search Medicines</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400"><FaSearch size={13} /></span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Brand or chemical name..."
                  className="w-full pl-10 p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 text-xs font-bold mb-2 uppercase tracking-wide">From Date</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" />
            </div>

            <div>
              <label className="block text-gray-700 text-xs font-bold mb-2 uppercase tracking-wide">To Date</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" />
            </div>

            <div className="flex gap-2">
              <button 
                onClick={handleClearFilters} 
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-bold transition shadow-md"
              >
                <FaEraser size={14} /> Clear
              </button>
              <button 
                onClick={handleDownloadExcel} 
                disabled={loading || !filteredData.length}
                className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm font-bold transition shadow-md disabled:opacity-50"
              >
                <FaDownload size={14} /> Export Excel
              </button>
            </div>
          </div>

          {/* Table Section */}
          {loading ? (
            <div className="w-full text-center py-20">
              <div className="inline-block h-10 w-10 text-blue-500 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
              <p className="mt-2 text-gray-500 font-medium">Aggregating records...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-center font-medium">{error}</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-inner">
              <table className="min-w-full table-auto font-sans">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Form</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Brand Name</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Chemical</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Dose</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Qty</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Entry</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Expiry</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredData.length > 0 ? (
                    filteredData.map((item, index) => (
                      <tr key={index} className="hover:bg-blue-50 transition duration-150">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full shadow-sm ${
                            item.dataType === 'Current' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                          }`}>
                            {item.dataType}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{item.medicine_form}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{item.brand_name}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.chemical_name}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{item.dose_volume}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-blue-700">{item.displayQuantity ?? '0'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-500 font-medium">{item.entry_date}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-500 font-medium">{item.expiry_date}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="p-10 text-center text-gray-500 italic">No records found matching your filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default StockHistory;