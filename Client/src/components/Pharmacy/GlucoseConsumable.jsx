import React, { useState, useEffect } from "react";
import axios from "axios";
import { debounce } from "lodash";
import Sidebar from "../Sidebar";
import * as XLSX from 'xlsx';
import { FaPlus, FaFilter, FaEraser, FaDownload, FaArrowLeft } from "react-icons/fa";
import { motion } from "framer-motion";

const GlucoseConsumables = () => {
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

    const [glucoseConsumables, setGlucoseConsumables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const medicineOptions = [
        "Tablet", "Syrup", "Injection", "Lotions", "Respules", "Powder",
        "Creams", "Drops", "Fluids", "SutureAndProcedureItems",
        "DressingItems", "Other"
    ];

    const fetchGlucoseConsumables = async () => {
        try {
            setLoading(true);
            const params = {};
            if (fromDate) params.from_date = fromDate;
            if (toDate) params.to_date = toDate;

            const response = await axios.get("http://localhost:8000/get_glucose_consumable/", { params });
            setGlucoseConsumables(response.data.glucose_consumables || response.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching glucose consumables:", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGlucoseConsumables();
    }, []);

    // --- Suggestion Fetchers ---
    const fetchChemicalSuggestions = debounce(async (chemicalName, medicineForm) => {
        if (chemicalName.length < 3 || !medicineForm) return;
        try {
            const res = await axios.get(`http://localhost:8000/get-chemical-name-by-chemical/?chemical_name=${chemicalName}&medicine_form=${medicineForm}`);
            setChemicalSuggestions(res.data.suggestions);
            setShowChemicalSuggestions(true);
        } catch (error) { console.error(error); }
    }, 500);

    const fetchBrandSuggestions = debounce(async (chemicalName, medicineForm) => {
        if (chemicalName.length < 3 || !medicineForm) return;
        try {
            const res = await axios.get(`http://localhost:8000/get-brand-names/?chemical_name=${chemicalName}&medicine_form=${medicineForm}`);
            setSuggestions(res.data.suggestions);
            setShowSuggestions(true);
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

        const isSpecialForm = ["SutureAndProcedureItems", "DressingItems"].includes(formData.medicine_form);
        if (isSpecialForm) {
            if (!formData.brand_name || !formData.quantity || !formData.expiry_date) {
                setMessage("Item Name, Quantity, and Expiry are required.");
                setIsError(true);
                return;
            }
        } else {
            if (!formData.chemical_name || !formData.brand_name || !formData.dose_volume || !formData.quantity || !formData.expiry_date) {
                setMessage("All fields are required.");
                setIsError(true);
                return;
            }
        }

        try {
            await axios.post("http://localhost:8000/add_glucose_consumable/", formData);
            alert("Consumable added successfully!");
            setShowForm(false);
            fetchGlucoseConsumables();
            setFormData({
                medicine_form: "", chemical_name: "", brand_name: "",
                dose_volume: "", quantity: "", expiry_date: "",
                consumed_date: new Date().toISOString().split("T")[0],
            });
        } catch (err) {
            setMessage(err.response?.data?.error || "Error adding record.");
            setIsError(true);
        }
    };

    const handleDownloadExcel = () => {
        const dataToExport = glucoseConsumables.map((item) => ({
            Form: item.medicine_form,
            Chemical: item.chemical_name,
            Brand: item.brand_name,
            Dose: item.dose_volume,
            Quantity: item.quantity,
            "Expiry Date": item.expiry_date,
            "Consumed Date": new Date(item.consumed_date).toLocaleDateString("en-GB"),
        }));
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Consumables");
        XLSX.writeFile(workbook, `Glucose_Consumables_${Date.now()}.xlsx`);
    };

    return (
        <div className="h-screen w-full flex bg-gradient-to-br from-blue-300 to-blue-400">
            <Sidebar />
            <div className="w-4/5 p-8 overflow-y-auto">

                <div className="mb-8 flex justify-between items-center">
                    <h1 className="text-4xl font-bold text-gray-800">Glucose Items</h1>
                    {!showForm && (
                        <button
                            onClick={() => setShowForm(true)}
                            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex items-center gap-2 transition shadow-md"
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
                        <div className="mb-6 flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4 items-end">
                            <div>
                                <label className="block text-gray-700 text-xs font-bold mb-1">From Date</label>
                                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="p-2 border border-gray-300 rounded-md text-sm" />
                            </div>
                            <div>
                                <label className="block text-gray-700 text-xs font-bold mb-1">To Date</label>
                                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="p-2 border border-gray-300 rounded-md text-sm" />
                            </div>
                            <button onClick={fetchGlucoseConsumables} className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center gap-1 text-sm transition">
                                <FaFilter size={12} /> Get
                            </button>
                            <button onClick={() => { setFromDate(""); setToDate(""); fetchGlucoseConsumables(); }} className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 flex items-center gap-1 text-sm transition">
                                <FaEraser size={12} /> Clear
                            </button>
                            <button onClick={handleDownloadExcel} className="bg-blue-700 text-white px-4 py-2 rounded-md hover:bg-blue-800 flex items-center gap-2 text-sm transition ml-auto">
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
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Consumed On</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {loading ? (
                                        <tr><td colSpan="7" className="text-center py-4 text-gray-500">Loading...</td></tr>
                                    ) : glucoseConsumables.length === 0 ? (
                                        <tr><td colSpan="7" className="text-center py-4 text-gray-500">No records found.</td></tr>
                                    ) : (
                                        glucoseConsumables.map((item) => (
                                            <tr key={item.id} className="hover:bg-blue-50 transition">
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{item.medicine_form}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{item.chemical_name || "-"}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{item.brand_name}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{item.dose_volume || "-"}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-red-600 font-bold">{item.quantity}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{item.expiry_date}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{item.consumed_date}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                    </motion.div>
                ) : (
                    <div className="flex justify-center">
                        <motion.div
                            className="w-full max-w-lg bg-white p-8 rounded-lg shadow-2xl relative"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}
                        >
                            <button
                                onClick={() => setShowForm(false)}
                                className="absolute top-4 left-4 text-gray-600 hover:text-gray-800 transition transform hover:scale-110"
                            >
                                <FaArrowLeft size={20} />
                            </button>

                            <h2 className="text-2xl font-bold mb-6 text-center text-blue-600">Add Consumed Item</h2>

                            {message && (
                                <div className={`p-4 mb-4 rounded-md text-center ${isError ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                                    {message}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">

                                <div>
                                    <label className="block text-gray-700 font-bold mb-2">Medicine Form</label>
                                    <select
                                        name="medicine_form"
                                        value={formData.medicine_form}
                                        onChange={handleChange}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                    >
                                        <option value="">Select Form</option>
                                        {medicineOptions.map((opt) => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>

                                {!["SutureAndProcedureItems", "DressingItems"].includes(formData.medicine_form) && (
                                    <div className="relative">
                                        <label className="block text-gray-700 font-bold mb-2">Chemical Name</label>
                                        <input
                                            type="text"
                                            name="chemical_name"
                                            value={formData.chemical_name}
                                            onChange={handleChange}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Enter Chemical Name"
                                            autoComplete="off"
                                        />
                                        {showChemicalSuggestions && chemicalSuggestions.length > 0 && (
                                            <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg mt-1 max-h-40 overflow-y-auto shadow-lg">
                                                {chemicalSuggestions.map((suggestion, index) => (
                                                    <li
                                                        key={index}
                                                        className="p-2 hover:bg-blue-100 cursor-pointer text-sm"
                                                        onClick={() => handleChemicalSuggestionClick(suggestion)}
                                                    >
                                                        {suggestion}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}

                                <div className="relative">
                                    <label className="block text-gray-700 font-bold mb-2">Brand Name (Item Name)</label>
                                    <input
                                        type="text"
                                        name="brand_name"
                                        value={formData.brand_name}
                                        onChange={handleChange}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter Brand Name"
                                        autoComplete="off"
                                    />
                                    {showSuggestions && suggestions.length > 0 && (
                                        <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg mt-1 max-h-40 overflow-y-auto shadow-lg">
                                            {suggestions.map((suggestion, index) => (
                                                <li
                                                    key={index}
                                                    className="p-2 hover:bg-blue-100 cursor-pointer text-sm"
                                                    onClick={() => handleBrandSuggestionClick(suggestion)}
                                                >
                                                    {suggestion}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                {!["SutureAndProcedureItems", "DressingItems"].includes(formData.medicine_form) && (
                                    <div className="relative">
                                        <label className="block text-gray-700 font-bold mb-2">Dose / Volume</label>
                                        <input
                                            type="text"
                                            name="dose_volume"
                                            value={formData.dose_volume}
                                            onChange={handleChange}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="e.g. 500mg, 10ml"
                                            autoComplete="off"
                                        />
                                        {showDoseSuggestions && doseSuggestions.length > 0 && (
                                            <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg mt-1 max-h-40 overflow-y-auto shadow-lg">
                                                {doseSuggestions.map((suggestion, index) => (
                                                    <li
                                                        key={index}
                                                        className="p-2 hover:bg-blue-100 cursor-pointer text-sm"
                                                        onClick={() => handleDoseSuggestionClick(suggestion)}
                                                    >
                                                        {suggestion}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}


                                <div className="grid grid-cols-2 gap-4">
                                    <div className="relative">
                                        <label className="block text-gray-700 font-bold mb-2">Expiry Date</label>
                                        <input
                                            type="date"
                                            name="expiry_date"
                                            value={formData.expiry_date}
                                            onChange={(e) => {
                                                setFormData(prev => ({ ...prev, expiry_date: e.target.value }));
                                                setExpiryManuallyEntered(true);
                                                setShowExpirySuggestions(false);
                                            }}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        {showExpirySuggestions && expirySuggestions.length > 0 && (
                                            <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg mt-1 max-h-40 overflow-y-auto shadow-lg">
                                                {expirySuggestions.map((suggestion, index) => (
                                                    <li
                                                        key={index}
                                                        className="p-2 hover:bg-blue-100 cursor-pointer text-sm"
                                                        onClick={() => handleExpirySuggestionClick(suggestion)}
                                                    >
                                                        {suggestion}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>

                                    <div className="relative">
                                        <label className="block text-gray-700 font-bold mb-2">Quantity</label>
                                        <input
                                            type="number"
                                            name="quantity"
                                            value={formData.quantity}
                                            onChange={(e) => {
                                                setFormData(prev => ({ ...prev, quantity: e.target.value }));
                                                setQuantityManuallyEntered(true);
                                                setShowQuantitySuggestions(false);
                                            }}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Qty"
                                        />
                                        {showQuantitySuggestions && quantitySuggestions.length > 0 && (
                                            <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg mt-1 max-h-40 overflow-y-auto shadow-lg">
                                                {quantitySuggestions.map((suggestion, index) => (
                                                    <li
                                                        key={index}
                                                        className="p-2 hover:bg-blue-100 cursor-pointer text-sm"
                                                        onClick={() => handleQuantitySuggestionClick(suggestion)}
                                                    >
                                                        {suggestion}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-gray-700 font-bold mb-2">Consumed Date</label>
                                    <input
                                        type="date"
                                        name="consumed_date"
                                        value={formData.consumed_date}
                                        onChange={handleChange}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition duration-300 shadow-md"
                                    >
                                        Add Record
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GlucoseConsumables;
