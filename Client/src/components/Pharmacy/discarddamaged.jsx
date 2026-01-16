import React, { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "../Sidebar";
import * as XLSX from "xlsx";
import { FaFilter, FaEraser, FaDownload, FaPlus, FaArrowLeft, FaSearch } from "react-icons/fa";
import { debounce } from "lodash";
import { motion } from "framer-motion";

const formatDate = (isoDate) => {
  if (!isoDate) return "N/A";
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const DiscardedMedicines = () => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    medicine_form: "",
    chemical_name: "",
    brand_name: "",
    dose_volume: "",
    quantity: "",
    expiry_date: "",
    reason: "",
  });

  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  
  // Suggestions
  const [suggestions, setSuggestions] = useState([]);
  const [chemicalSuggestions, setChemicalSuggestions] = useState([]);
  const [doseSuggestions, setDoseSuggestions] = useState([]);
  const [quantitySuggestions, setQuantitySuggestions] = useState([]);
  const [expirySuggestions, setExpirySuggestions] = useState([]);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showChemicalSuggestions, setShowChemicalSuggestions] = useState(false);
  const [showDoseSuggestions, setShowDoseSuggestions] = useState(false);
  const [showQuantitySuggestions, setShowQuantitySuggestions] = useState(false);
  const [showExpirySuggestions, setShowExpirySuggestions] = useState(false);

  const [doseManuallyEntered, setDoseManuallyEntered] = useState(false);
  const [expiryManuallyEntered, setExpiryManuallyEntered] = useState(false);
  const [quantityManuallyEntered, setQuantityManuallyEntered] = useState(false);

  const [discardedMedicines, setDiscardedMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const medicineOptions = [
    "Tablet", "Syrup", "Injection", "Lotions", "Respules", "Powder",
    "Creams", "Drops", "Fluids", "SutureAndProcedureItems",
    "DressingItems", "Other",
  ];

  useEffect(() => {
    fetchDiscardedMedicines();
  }, []);

  const fetchDiscardedMedicines = async () => {
    try {
      setLoading(true);
      const params = {};
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;

      const response = await axios.get("http://localhost:8000/discarded_medicines/", { params });
      setDiscardedMedicines(response.data.discarded_medicines);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching discarded medicines:", error);
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setFromDate("");
    setToDate("");
    fetchDiscardedMedicines();
  };

  // --- Fetchers ---
  const fetchBrandSuggestions = debounce(async (chemicalName, medicineForm) => {
    if (chemicalName.length < 3 || !medicineForm) return;
    try {
      const res = await axios.get(`http://localhost:8000/get-brand-names/?chemical_name=${chemicalName}&medicine_form=${medicineForm}`);
      setSuggestions(res.data.suggestions);
      setShowSuggestions(true);
    } catch (error) { console.error(error); }
  }, 500);

  const fetchChemicalSuggestions = debounce(async (chemicalName, medicineForm) => {
    if (chemicalName.length < 3 || !medicineForm) return;
    try {
      const res = await axios.get(`http://localhost:8000/get-chemical-name-by-chemical/?chemical_name=${chemicalName}&medicine_form=${medicineForm}`);
      setChemicalSuggestions(res.data.suggestions);
      setShowChemicalSuggestions(true);
    } catch (error) { console.error(error); }
  }, 500);

  const fetchDoseSuggestions = debounce(async (brandName, chemicalName, medicineForm) => {
    if (!brandName || !chemicalName || !medicineForm) return;
    try {
      const res = await axios.get(`http://localhost:8000/get-dose-volume/?brand_name=${brandName}&chemical_name=${chemicalName}&medicine_form=${medicineForm}`);
      setDoseSuggestions(res.data.suggestions);
      setShowDoseSuggestions(res.data.suggestions.length > 0);
      if (!doseManuallyEntered && res.data.suggestions.length === 1) {
        setFormData((prev) => ({ ...prev, dose_volume: res.data.suggestions[0] }));
      }
    } catch (error) { console.error(error); }
  }, 500);

  const fetchExpirySuggestions = debounce(async (chemicalName, brandName, dose_volume) => {
    if (!brandName || !chemicalName || !dose_volume) return;
    try {
      const res = await axios.get(`http://localhost:8000/get-expiry-dates/?brand_name=${brandName}&chemical_name=${chemicalName}&dose_volume=${dose_volume}`);
      setExpirySuggestions(res.data.suggestions);
      setShowExpirySuggestions(res.data.suggestions.length > 0);
      if (!expiryManuallyEntered && res.data.suggestions.length === 1) {
        setFormData((prev) => ({ ...prev, expiry_date: res.data.suggestions[0] }));
      }
    } catch (error) { console.error(error); }
  }, 500);

  const fetchQuantitySuggestions = debounce(async (chemicalName, brandName, expiry_date) => {
    if (!brandName || !chemicalName || !expiry_date) return;
    try {
      const res = await axios.get(`http://localhost:8000/get-quantity-suggestions/?brand_name=${brandName}&chemical_name=${chemicalName}&expiry_date=${expiry_date}`);
      setQuantitySuggestions(res.data.suggestions);
      setShowQuantitySuggestions(res.data.suggestions.length > 0);
      if (!quantityManuallyEntered && res.data.suggestions.length === 1) {
        setFormData((prev) => ({ ...prev, quantity: res.data.suggestions[0] }));
      }
    } catch (error) { console.error(error); }
  }, 500);

  // --- Handlers ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "chemical_name") {
      fetchChemicalSuggestions(value, formData.medicine_form);
      fetchBrandSuggestions(value, formData.medicine_form);
    }
    if (name === "brand_name") {
      fetchDoseSuggestions(value, formData.chemical_name, formData.medicine_form);
    }
    if (name === "medicine_form") {
      setSuggestions([]);
      setChemicalSuggestions([]);
      setDoseSuggestions([]);
    }
    if (name === "dose_volume") {
      setDoseManuallyEntered(true);
      setShowDoseSuggestions(false);
    }
  };

  const handleChemicalSuggestionClick = (suggestion) => {
    setFormData((prev) => ({ ...prev, chemical_name: suggestion }));
    setShowChemicalSuggestions(false);
    fetchBrandSuggestions(suggestion, formData.medicine_form);
  };

  const handleBrandSuggestionClick = (suggestion) => {
    setFormData((prev) => ({ ...prev, brand_name: suggestion }));
    setShowSuggestions(false);
    fetchDoseSuggestions(suggestion, formData.chemical_name, formData.medicine_form);
  };

  const handleDoseSuggestionClick = (suggestion) => {
    setFormData((prev) => ({ ...prev, dose_volume: suggestion }));
    setShowDoseSuggestions(false);
    fetchExpirySuggestions(formData.chemical_name, formData.brand_name, suggestion);
  };

  const handleExpirySuggestionClick = (suggestion) => {
    setFormData((prev) => ({ ...prev, expiry_date: suggestion }));
    setShowExpirySuggestions(false);
    fetchQuantitySuggestions(formData.chemical_name, formData.brand_name, suggestion);
  };

  const handleQuantitySuggestionClick = (suggestion) => {
    setFormData((prev) => ({ ...prev, quantity: suggestion }));
    setShowQuantitySuggestions(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);

    if (!formData.medicine_form || !formData.brand_name || !formData.chemical_name || !formData.dose_volume || !formData.quantity || !formData.expiry_date || !formData.reason) {
      setMessage("Please fill in all required fields including the reason.");
      setIsError(true);
      return;
    }

    try {
      await axios.post("http://localhost:8000/add_discarded_medicine/", formData);
      alert("Medicine discarded successfully!");
      setFormData({
        medicine_form: "", chemical_name: "", brand_name: "",
        dose_volume: "", quantity: "", expiry_date: "", reason: "",
      });
      fetchDiscardedMedicines();
      setShowForm(false);
    } catch (error) {
      setMessage("Error processing request. Please try again.");
      setIsError(true);
    }
  };

  const handleDownloadExcel = () => {
    if (!discardedMedicines || discardedMedicines.length === 0) return;

    const dataToExport = discardedMedicines.map((item) => ({
      Form: item.medicine_form,
      Chemical: item.chemical_name,
      Brand: item.brand_name,
      Dose: item.dose_volume,
      Quantity: item.quantity,
      "Discarded Date": formatDate(item.entry_date),
      "Expiry Date": formatDate(item.expiry_date),
      Reason: item.reason,
    }));

    const now = new Date();
    const day = now.getDate().toString().padStart(2, "0");
    const month = now.toLocaleString('default', { month: 'short' });
    const year = now.getFullYear();
    const formattedTime = `${now.getHours() % 12 || 12}.${now.getMinutes().toString().padStart(2, "0")} ${now.getHours() >= 12 ? 'PM' : 'AM'}`;
    const fileName = `Discarded Medicines - ${day}-${month}-${year} @ ${formattedTime}.xlsx`;

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Discarded Medicines");
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="h-screen w-full flex bg-gradient-to-br from-blue-300 to-blue-400">
      <Sidebar />
      <div className="w-4/5 p-8 overflow-y-auto">
        
        {/* Header Section */}
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-4xl font-bold text-gray-800">Discard History</h1>
          {!showForm && (
            <button 
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 px-5 rounded-lg flex items-center gap-2 transition shadow-md" 
              onClick={() => setShowForm(true)}
            >
              <FaPlus size={14} /> Add Discarded Medicine
            </button>
          )}
        </div>

        {!showForm ? (
          <motion.div 
            className="bg-white p-8 rounded-lg shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Filter Section */}
            <div className="mb-6 flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4 items-end">
              <div>
                <label className="block text-gray-700 text-xs font-bold mb-1">From Date</label>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="p-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-gray-700 text-xs font-bold mb-1">To Date</label>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="p-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <button onClick={fetchDiscardedMedicines} className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center gap-1 text-sm transition">
                <FaFilter size={12} /> Get
              </button>
              <button onClick={handleClearFilters} className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 flex items-center gap-1 text-sm transition">
                <FaEraser size={12} /> Clear
              </button>
              <button onClick={handleDownloadExcel} className="bg-blue-700 text-white px-5 py-2 rounded-md hover:bg-blue-800 flex items-center gap-2 text-sm transition ml-auto">
                <FaDownload size={12} /> Export to Excel
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full table-auto font-sans">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Form</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chemical</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dose</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discarded</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr><td colSpan="8" className="text-center py-4">Loading...</td></tr>
                  ) : discardedMedicines.length > 0 ? (
                    discardedMedicines.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition duration-150">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{item.medicine_form}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{item.chemical_name}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-800">{item.brand_name}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{item.dose_volume}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-red-500">{item.quantity}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatDate(item.entry_date)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{item.expiry_date}</td>
                        <td className="px-4 py-3 text-sm text-red-600 italic font-medium">{item.reason}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="8" className="text-center py-10 text-gray-500 italic">No discarded records found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            className="bg-white p-8 rounded-lg shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => setShowForm(false)} className="text-blue-500 hover:text-blue-700">
                <FaArrowLeft size={20} />
              </button>
              <h2 className="text-2xl font-semibold text-gray-700">Add Discard Record</h2>
            </div>

            {message && (
              <div className={`mb-4 p-4 rounded border ${isError ? "bg-red-100 border-red-400 text-red-700" : "bg-green-100 border-green-400 text-green-700"}`}>
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Form Selection */}
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">Medicine Form</label>
                  <select name="medicine_form" value={formData.medicine_form} onChange={handleChange} className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">Select Form</option>
                    {medicineOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>

                {/* Chemical */}
                <div className="relative">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Chemical Name</label>
                  <input type="text" name="chemical_name" value={formData.chemical_name} onChange={handleChange} placeholder="Search chemical..." className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" autoComplete="off" />
                  {showChemicalSuggestions && chemicalSuggestions.length > 0 && (
                    <ul className="absolute z-20 w-full bg-white border border-gray-300 mt-1 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                      {chemicalSuggestions.map(s => <li key={s} onClick={() => handleChemicalSuggestionClick(s)} className="p-3 hover:bg-blue-50 cursor-pointer text-sm">{s}</li>)}
                    </ul>
                  )}
                </div>

                {/* Brand */}
                <div className="relative">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Brand / Item Name</label>
                  <input type="text" name="brand_name" value={formData.brand_name} onChange={handleChange} placeholder="Search brand..." className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" autoComplete="off" />
                  {showSuggestions && suggestions.length > 0 && (
                    <ul className="absolute z-20 w-full bg-white border border-gray-300 mt-1 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                      {suggestions.map(s => <li key={s} onClick={() => handleBrandSuggestionClick(s)} className="p-3 hover:bg-blue-50 cursor-pointer text-sm">{s}</li>)}
                    </ul>
                  )}
                </div>

                {/* Dose */}
                <div className="relative">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Dose / Volume</label>
                  <input type="text" name="dose_volume" value={formData.dose_volume} onChange={handleChange} placeholder="e.g. 500mg" className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" autoComplete="off" />
                  {showDoseSuggestions && doseSuggestions.length > 0 && (
                    <ul className="absolute z-20 w-full bg-white border border-gray-300 mt-1 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                      {doseSuggestions.map(s => <li key={s} onClick={() => handleDoseSuggestionClick(s)} className="p-3 hover:bg-blue-50 cursor-pointer text-sm">{s}</li>)}
                    </ul>
                  )}
                </div>

                {/* Expiry */}
                <div className="relative">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Expiry Date</label>
                  <input type="text" name="expiry_date" value={formData.expiry_date} onChange={handleChange} placeholder="YYYY-MM-DD" className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  {showExpirySuggestions && expirySuggestions.length > 0 && (
                    <ul className="absolute z-20 w-full bg-white border border-gray-300 mt-1 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                      {expirySuggestions.map(s => <li key={s} onClick={() => handleExpirySuggestionClick(s)} className="p-3 hover:bg-blue-50 cursor-pointer text-sm">{s}</li>)}
                    </ul>
                  )}
                </div>

                {/* Quantity */}
                <div className="relative">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Quantity to Discard</label>
                  <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  {showQuantitySuggestions && quantitySuggestions.length > 0 && (
                    <ul className="absolute z-20 w-full bg-white border border-gray-200 mt-1 rounded-lg shadow-xl">
                      {quantitySuggestions.map(s => <li key={s} onClick={() => handleQuantitySuggestionClick(s)} className="p-3 bg-yellow-50 text-yellow-800 font-bold cursor-pointer text-sm">Stock Available: {s}</li>)}
                    </ul>
                  )}
                </div>

                {/* Reason */}
                <div className="md:col-span-2">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Reason for Discarding</label>
                  <textarea name="reason" value={formData.reason} onChange={handleChange} placeholder="e.g. Damaged packaging, Wrong entry, etc." className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24" />
                </div>
              </div>

              <div className="mt-8">
                <button type="submit" className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition font-bold shadow-md">
                  Discard Medicine
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default DiscardedMedicines;