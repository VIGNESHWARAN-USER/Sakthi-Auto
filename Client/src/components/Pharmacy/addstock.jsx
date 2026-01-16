import React, { useState, useEffect } from "react";
import axios from "axios";
import { debounce } from "lodash";
import Sidebar from "../Sidebar";
import { useNavigate } from "react-router-dom";
import { FaHistory } from "react-icons/fa";
import { motion } from "framer-motion"; // Added for animation consistency

const AddStock = () => {
  const [formData, setFormData] = useState({
    medicine_form: "",
    brand_name: "",
    chemical_name: "",
    dose_volume: "",
    quantity: "",
    expiry_date: "",
  });

  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false); // Track if message is an error
  const [brandSuggestions, setBrandSuggestions] = useState([]);
  const [chemicalSuggestions, setChemicalSuggestions] = useState([]);
  const [doseSuggestions, setDoseSuggestions] = useState([]);
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false);
  const [showChemicalSuggestions, setShowChemicalSuggestions] = useState(false);
  const [showDoseSuggestions, setShowDoseSuggestions] = useState(false);
  const [doseManuallyEntered, setDoseManuallyEntered] = useState(false);

  const navigate = useNavigate();

  const medicineOptions = [
    "Tablet", "Syrup", "Injection", "Lotions", "Respules",
    "Powder", "Creams", "Drops", "Fluids", "Other",
    "SutureAndProcedureItems", "DressingItems"
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        await axios.get("http://localhost:8000/archive_stock/");
        await axios.get("http://localhost:8000/current_expiry/");
      } catch (error) {
        console.error("Error fetching initial data", error);
      }
    };
    fetchData();
  }, []);

  // --- Debounced Functions ---
  const fetchBrandSuggestions = debounce(async (chemicalName, medicineForm) => {
    if (chemicalName.length < 3 || !medicineForm) {
      setBrandSuggestions([]);
      setShowBrandSuggestions(false);
      return;
    }
    try {
      const response = await axios.get(`http://localhost:8000/get-brand-names/?chemical_name=${chemicalName}&medicine_form=${medicineForm}`);
      setBrandSuggestions(response.data.suggestions);
      setShowBrandSuggestions(true);
    } catch (error) { console.error(error); }
  }, 500);

  const fetchChemicalSuggestions = debounce(async (brandName, medicineForm) => {
    if (brandName.length < 3 || !medicineForm) {
      setChemicalSuggestions([]);
      setShowChemicalSuggestions(false);
      return;
    }
    try {
      const response = await axios.get(`http://localhost:8000/get-chemical-name-by-brand/?brand_name=${brandName}&medicine_form=${medicineForm}`);
      setChemicalSuggestions(response.data.suggestions);
      setShowChemicalSuggestions(true);
    } catch (error) { console.error(error); }
  }, 500);

  const fetchDoseSuggestions = debounce(async (brandName, chemicalName, medicineForm) => {
    if (!brandName || !chemicalName || !medicineForm) return;
    try {
      const response = await axios.get(`http://localhost:8000/get-dose-volume/?brand_name=${brandName}&chemical_name=${chemicalName}&medicine_form=${medicineForm}`);
      setDoseSuggestions(response.data.suggestions);
      setShowDoseSuggestions(response.data.suggestions.length > 1);
      if (!doseManuallyEntered && response.data.suggestions.length === 1) {
        setFormData((prev) => ({ ...prev, dose_volume: response.data.suggestions[0] }));
      }
    } catch (error) { console.error(error); }
  }, 500);

  const handleSuggestionClick = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === "chemical_name") {
      setShowChemicalSuggestions(false);
      fetchBrandSuggestions(value, formData.medicine_form);
      fetchDoseSuggestions(formData.brand_name, value, formData.medicine_form);
    } else if (field === "brand_name") {
      setShowBrandSuggestions(false);
      if (!formData.chemical_name) fetchChemicalSuggestions(value, formData.medicine_form);
      fetchDoseSuggestions(value, formData.chemical_name, formData.medicine_form);
    } else if (field === "dose_volume") {
      setDoseManuallyEntered(false);
      setShowDoseSuggestions(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "chemical_name") fetchBrandSuggestions(value, formData.medicine_form);
    if (name === "brand_name") {
      fetchChemicalSuggestions(value, formData.medicine_form);
      fetchDoseSuggestions(value, formData.chemical_name, formData.medicine_form);
    }
    if (name === "medicine_form") {
      setBrandSuggestions([]);
      setChemicalSuggestions([]);
      setDoseSuggestions([]);
      setFormData(prev => ({ ...prev, brand_name: "", chemical_name: "", dose_volume: "" }));
    }
    if (name === "dose_volume") {
      setDoseManuallyEntered(true);
      setShowDoseSuggestions(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);

    if (!formData.medicine_form || !formData.brand_name || !formData.chemical_name || !formData.dose_volume || !formData.quantity || !formData.expiry_date) {
      setMessage("Please fill in all required fields.");
      setIsError(true);
      return;
    }

    try {
      const response = await axios.post("http://localhost:8000/add-stock/", formData);
      setMessage("Stock added successfully!");
      setIsError(false);

      setFormData({
        medicine_form: "",
        brand_name: "",
        chemical_name: "",
        dose_volume: "",
        quantity: "",
        expiry_date: "",
      });
      setDoseManuallyEntered(false);
    } catch (error) {
      console.error("Error adding stock:", error);
      setMessage("Error adding stock. Please try again.");
      setIsError(true);
    }
  };

  return (
    <div className="h-screen w-full flex bg-gradient-to-br from-blue-300 to-blue-400">
      <Sidebar />
      <div className="w-4/5 p-8 overflow-y-auto">
        {/* Header Section */}
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-4xl font-bold text-gray-800">Inventory</h1>
          <button
            onClick={() => navigate("../stockhistory")}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center gap-2 transition duration-300 shadow-md"
          >
            <FaHistory size={16} />
            View Stock History
          </button>
        </div>

        {/* Form Container */}
        <motion.div
          className="bg-white p-8 rounded-lg shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl font-semibold mb-6 text-gray-700">
            Add New Stock
          </h2>

          {message && (
            <div className={`mb-4 p-4 rounded border ${isError ? "bg-red-100 border-red-400 text-red-700" : "bg-green-100 border-green-400 text-green-700"}`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Medicine Form */}
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Medicine Form / Category
                </label>
                <select
                  name="medicine_form"
                  value={formData.medicine_form}
                  onChange={handleChange}
                  className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Category</option>
                  {medicineOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              {/* Chemical Name */}
              <div className="relative">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Chemical Name
                </label>
                <input
                  type="text"
                  name="chemical_name"
                  value={formData.chemical_name}
                  onChange={handleChange}
                  placeholder="Enter or search chemical..."
                  className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoComplete="off"
                  disabled={!formData.medicine_form}
                />
                {showChemicalSuggestions && chemicalSuggestions.length > 0 && (
                  <ul className="absolute z-20 bg-white border border-gray-300 w-full mt-1 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                    {chemicalSuggestions.map((s, i) => (
                      <li key={i} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm" onClick={() => handleSuggestionClick("chemical_name", s)}>
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Brand Name */}
              <div className="relative">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Brand Name
                </label>
                <input
                  type="text"
                  name="brand_name"
                  value={formData.brand_name}
                  onChange={handleChange}
                  placeholder="Enter or search brand..."
                  className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoComplete="off"
                  disabled={!formData.medicine_form}
                />
                {showBrandSuggestions && brandSuggestions.length > 0 && (
                  <ul className="absolute z-20 bg-white border border-gray-300 w-full mt-1 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                    {brandSuggestions.map((s, i) => (
                      <li key={i} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm" onClick={() => handleSuggestionClick("brand_name", s)}>
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Dose / Volume */}
              <div className="relative">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Dose / Volume
                </label>
                <input
                  type="text"
                  name="dose_volume"
                  value={formData.dose_volume}
                  onChange={handleChange}
                  placeholder="e.g. 500mg, 10ml"
                  className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!formData.medicine_form}
                />
                {showDoseSuggestions && doseSuggestions.length > 0 && (
                  <ul className="absolute z-20 bg-white border border-gray-300 w-full mt-1 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                    {doseSuggestions.map((s, i) => (
                      <li key={i} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm" onClick={() => handleSuggestionClick("dose_volume", s)}>
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Expiry Date
                </label>
                <input
                  type="month"
                  name="expiry_date"
                  value={formData.expiry_date}
                  onChange={handleChange}
                  className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-8">
              <button
                type="submit"
                className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-300 font-bold"
              >
                Add Stock to Inventory
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default AddStock;