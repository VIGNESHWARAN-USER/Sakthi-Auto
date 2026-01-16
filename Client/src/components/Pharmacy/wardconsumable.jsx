import React, { useState, useEffect } from "react";
import axios from "axios";
import { debounce } from "lodash";
import Sidebar from "../Sidebar";
import * as XLSX from "xlsx";
import { FaPlus, FaFilter, FaEraser, FaDownload, FaArrowLeft, FaSearch } from "react-icons/fa";
import { motion } from "framer-motion";

const WardConsumables = () => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    medicine_form: "",
    chemical_name: "",
    brand_name: "",
    dose_volume: "",
    quantity: "",
    expiry_date: "",
    consumed_date: new Date().toISOString().split("T")[0],
  });

  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  
  // Suggestion States
  const [suggestions, setSuggestions] = useState([]); 
  const [chemicalSuggestions, setChemicalSuggestions] = useState([]);
  const [doseSuggestions, setDoseSuggestions] = useState([]);
  const [expirySuggestions, setExpirySuggestions] = useState([]);
  const [quantitySuggestions, setQuantitySuggestions] = useState([]);

  // Visibility States
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showChemicalSuggestions, setShowChemicalSuggestions] = useState(false);
  const [showDoseSuggestions, setShowDoseSuggestions] = useState(false);
  const [showExpirySuggestions, setShowExpirySuggestions] = useState(false);
  const [showQuantitySuggestions, setShowQuantitySuggestions] = useState(false);

  const [doseManuallyEntered, setDoseManuallyEntered] = useState(false);
  const [expiryManuallyEntered, setExpiryManuallyEntered] = useState(false);
  const [quantityManuallyEntered, setQuantityManuallyEntered] = useState(false);

  const [wardConsumables, setWardConsumables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const medicineOptions = [
    "Tablet", "Syrup", "Injection", "Lotions", "Respules", "Powder",
    "Creams", "Drops", "Fluids", "SutureAndProcedureItems",
    "DressingItems", "Other",
  ];

  const fetchWardConsumables = async () => {
    try {
      setLoading(true);
      let url = "http://localhost:8000/get_ward_consumable/";
      const params = [];
      if (fromDate) params.push(`from_date=${fromDate}`);
      if (toDate) params.push(`to_date=${toDate}`);
      if (params.length) url += `?${params.join("&")}`;

      const response = await axios.get(url);
      setWardConsumables(response.data.ward_consumables || response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching ward consumables:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWardConsumables();
  }, []);

  // --------- Suggestion Fetchers (Debounced) ----------
  const fetchChemicalSuggestions = debounce(async (chemicalName, medicineForm) => {
    if (chemicalName.length < 3 || !medicineForm) return;
    try {
      const res = await axios.get(`http://localhost:8000/get-chemical-name-by-chemical/?chemical_name=${chemicalName}&medicine_form=${medicineForm}`);
      setChemicalSuggestions(res.data.suggestions || []);
      setShowChemicalSuggestions(true);
    } catch (err) { console.error(err); }
  }, 500);

  const fetchBrandSuggestions = debounce(async (chemicalName, medicineForm) => {
    if (chemicalName.length < 3 || !medicineForm) return;
    try {
      const res = await axios.get(`http://localhost:8000/get-brand-names/?chemical_name=${chemicalName}&medicine_form=${medicineForm}`);
      setSuggestions(res.data.suggestions || []);
      setShowSuggestions(true);
    } catch (err) { console.error(err); }
  }, 500);

  const fetchDoseSuggestions = debounce(async (brandName, chemicalName, medicineForm) => {
    if (!brandName || !chemicalName || !medicineForm) return;
    try {
      const res = await axios.get(`http://localhost:8000/get-dose-volume/?brand_name=${brandName}&chemical_name=${chemicalName}&medicine_form=${medicineForm}`);
      setDoseSuggestions(res.data.suggestions || []);
      setShowDoseSuggestions((res.data.suggestions || []).length > 0);
      if (!doseManuallyEntered && (res.data.suggestions || []).length === 1) {
        setFormData((prev) => ({ ...prev, dose_volume: res.data.suggestions[0] }));
      }
    } catch (err) { console.error(err); }
  }, 500);

  const fetchExpirySuggestions = debounce(async (chemicalName, brandName, dose_volume) => {
    if (!brandName || !chemicalName || !dose_volume) return;
    try {
      const res = await axios.get(`http://localhost:8000/get-expiry-dates/?brand_name=${brandName}&chemical_name=${chemicalName}&dose_volume=${dose_volume}`);
      setExpirySuggestions(res.data.suggestions || []);
      setShowExpirySuggestions((res.data.suggestions || []).length > 0);
      if (!expiryManuallyEntered && (res.data.suggestions || []).length === 1) {
        setFormData((prev) => ({ ...prev, expiry_date: res.data.suggestions[0] }));
      }
    } catch (err) { console.error(err); }
  }, 500);

  const fetchQuantitySuggestions = debounce(async (chemicalName, brandName, expiry_date) => {
    if (!brandName || !chemicalName || !expiry_date) return;
    try {
      const res = await axios.get(`http://localhost:8000/get-quantity-suggestions/?brand_name=${brandName}&chemical_name=${chemicalName}&expiry_date=${expiry_date}`);
      setQuantitySuggestions(res.data.suggestions || []);
      setShowQuantitySuggestions((res.data.suggestions || []).length > 0);
      if (!quantityManuallyEntered && (res.data.suggestions || []).length === 1) {
        setFormData((prev) => ({ ...prev, quantity: res.data.suggestions[0] }));
      }
    } catch (err) { console.error(err); }
  }, 500);

  // --------- Suggestion Handlers ----------
  const handleChemicalSuggestionClick = (suggestion) => {
    setFormData((prev) => ({ ...prev, chemical_name: suggestion }));
    setShowChemicalSuggestions(false);
    if (!isSpecialForm()) fetchBrandSuggestions(suggestion, formData.medicine_form);
  };

  const handleBrandSuggestionClick = (suggestion) => {
    setFormData((prev) => ({ ...prev, brand_name: suggestion }));
    setShowSuggestions(false);
    if (!isSpecialForm()) fetchDoseSuggestions(suggestion, formData.chemical_name, formData.medicine_form);
  };

  const handleDoseSuggestionClick = (suggestion) => {
    setFormData((prev) => ({ ...prev, dose_volume: suggestion }));
    setShowDoseSuggestions(false);
    if (!isSpecialForm()) fetchExpirySuggestions(formData.chemical_name, formData.brand_name, suggestion);
  };

  const handleExpirySuggestionClick = (suggestion) => {
    setFormData((prev) => ({ ...prev, expiry_date: suggestion }));
    setShowExpirySuggestions(false);
    if (!isSpecialForm()) fetchQuantitySuggestions(formData.chemical_name, formData.brand_name, suggestion);
  };

  const handleQuantitySuggestionClick = (suggestion) => {
    setFormData((prev) => ({ ...prev, quantity: suggestion }));
    setShowQuantitySuggestions(false);
  };

  const isSpecialForm = () => formData.medicine_form === "SutureAndProcedureItems" || formData.medicine_form === "DressingItems";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "medicine_form") {
      setSuggestions([]); setChemicalSuggestions([]); setDoseSuggestions([]); setExpirySuggestions([]); setQuantitySuggestions([]);
    }
    if (isSpecialForm()) return;
    if (name === "chemical_name") { fetchChemicalSuggestions(value, formData.medicine_form); fetchBrandSuggestions(value, formData.medicine_form); }
    if (name === "brand_name") fetchDoseSuggestions(value, formData.chemical_name, formData.medicine_form);
    if (name === "dose_volume") { setDoseManuallyEntered(true); setShowDoseSuggestions(false); }
    if (name === "expiry_date") { setExpiryManuallyEntered(true); setShowExpirySuggestions(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(""); setIsError(false);
    try {
      const payload = { ...formData, quantity: Number(formData.quantity), chemical_name: isSpecialForm() ? null : formData.chemical_name, dose_volume: isSpecialForm() ? null : formData.dose_volume };
      await axios.post("http://localhost:8000/add_ward_consumable/", payload);
      alert("Ward consumable added successfully!");
      setShowForm(false);
      fetchWardConsumables();
      setFormData({ medicine_form: "", chemical_name: "", brand_name: "", dose_volume: "", quantity: "", expiry_date: "", consumed_date: new Date().toISOString().split("T")[0] });
    } catch (err) {
      setMessage(err.response?.data?.error || "Error adding ward consumable.");
      setIsError(true);
    }
  };

  const handleDownloadExcel = () => {
    const ws = XLSX.utils.json_to_sheet(wardConsumables);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "WardConsumables");
    XLSX.writeFile(wb, `Ward_Consumables_${Date.now()}.xlsx`);
  };

  return (
    <div className="h-screen w-full flex bg-gradient-to-br from-blue-300 to-blue-400">
      <Sidebar />
      <div className="w-4/5 p-8 overflow-y-auto">
        
        {/* Header Section */}
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-4xl font-bold text-gray-800">Ward Consumables</h1>
          {!showForm && (
            <button 
              onClick={() => setShowForm(true)} 
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 px-5 rounded-lg flex items-center gap-2 transition shadow-md"
            >
              <FaPlus size={14} /> Add Consumed Item
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
              <button onClick={fetchWardConsumables} className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center gap-1 text-sm transition">
                <FaFilter size={12} /> Get
              </button>
              <button onClick={() => {setFromDate(""); setToDate(""); fetchWardConsumables();}} className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 flex items-center gap-1 text-sm transition">
                <FaEraser size={12} /> Clear
              </button>
              <button onClick={handleDownloadExcel} className="bg-blue-700 text-white px-5 py-2 rounded-md hover:bg-blue-800 flex items-center gap-2 text-sm transition ml-auto">
                <FaDownload size={12} /> Export to Excel
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Form</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chemical</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand / Item</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dose</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Consumed Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr><td colSpan="7" className="text-center py-4">Loading...</td></tr>
                  ) : wardConsumables.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition duration-150">
                      <td className="px-4 py-3 text-sm text-gray-600">{item.medicine_form}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{item.chemical_name || "N/A"}</td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-800">{item.brand_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.dose_volume || "N/A"}</td>
                      <td className="px-4 py-3 text-sm font-bold text-blue-600">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{item.expiry_date || "N/A"}</td>
                      <td className="px-4 py-3 text-sm text-red-600 font-semibold">{new Date(item.consumed_date).toLocaleDateString("en-GB")}</td>
                    </tr>
                  ))}
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
              <h2 className="text-2xl font-semibold text-gray-700">Add Ward Consumable</h2>
            </div>

            {message && (
              <div className={`mb-4 p-4 rounded border ${isError ? "bg-red-100 border-red-400 text-red-700" : "bg-green-100 border-green-400 text-green-700"}`}>
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">Medicine Form</label>
                  <select name="medicine_form" value={formData.medicine_form} onChange={handleChange} className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required>
                    <option value="">Select Form</option>
                    {medicineOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>

                <div className="relative">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Chemical Name</label>
                  <input type="text" name="chemical_name" value={formData.chemical_name} onChange={handleChange} className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" autoComplete="off" />
                  {showChemicalSuggestions && chemicalSuggestions.length > 0 && (
                    <ul className="absolute z-20 w-full bg-white border border-gray-300 mt-1 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                      {chemicalSuggestions.map(s => <li key={s} onClick={() => handleChemicalSuggestionClick(s)} className="p-3 hover:bg-blue-50 cursor-pointer text-sm">{s}</li>)}
                    </ul>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Brand / Item Name</label>
                  <input type="text" name="brand_name" value={formData.brand_name} onChange={handleChange} className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required autoComplete="off" />
                  {showSuggestions && suggestions.length > 0 && (
                    <ul className="absolute z-20 w-full bg-white border border-gray-300 mt-1 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                      {suggestions.map(s => <li key={s} onClick={() => handleBrandSuggestionClick(s)} className="p-3 hover:bg-blue-50 cursor-pointer text-sm">{s}</li>)}
                    </ul>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Dose / Volume</label>
                  <input type="text" name="dose_volume" value={formData.dose_volume} onChange={handleChange} className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" autoComplete="off" />
                  {showDoseSuggestions && doseSuggestions.length > 0 && (
                    <ul className="absolute z-20 w-full bg-white border border-gray-300 mt-1 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                      {doseSuggestions.map(s => <li key={s} onClick={() => handleDoseSuggestionClick(s)} className="p-3 hover:bg-blue-50 cursor-pointer text-sm">{s}</li>)}
                    </ul>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Expiry Date</label>
                  <input type="date" name="expiry_date" value={formData.expiry_date} onChange={handleChange} className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  {showExpirySuggestions && expirySuggestions.length > 0 && (
                    <ul className="absolute z-20 w-full bg-white border border-gray-300 mt-1 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                      {expirySuggestions.map(s => <li key={s} onClick={() => handleExpirySuggestionClick(s)} className="p-3 hover:bg-blue-50 cursor-pointer text-sm">{s}</li>)}
                    </ul>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Quantity Consumed</label>
                  <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
                  {showQuantitySuggestions && quantitySuggestions.length > 0 && (
                    <ul className="absolute z-20 w-full bg-white border border-gray-300 mt-1 rounded-lg shadow-xl">
                      {quantitySuggestions.map(s => <li key={s} onClick={() => handleQuantitySuggestionClick(s)} className="p-3 bg-yellow-50 text-yellow-800 font-bold cursor-pointer text-sm">Stock Available: {s}</li>)}
                    </ul>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Consumed Date (Today)</label>
                  <input type="date" value={formData.consumed_date} readOnly className="w-full mt-1 p-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-500 cursor-not-allowed" />
                </div>
              </div>

              <div className="mt-8">
                <button type="submit" className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition font-bold shadow-md">
                  Submit Consumed Item
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default WardConsumables;