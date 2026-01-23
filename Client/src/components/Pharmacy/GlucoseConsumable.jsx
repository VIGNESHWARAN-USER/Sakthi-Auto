import React, { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "../Sidebar";
import * as XLSX from 'xlsx';
import { FaPlus, FaFilter, FaEraser, FaDownload, FaArrowLeft } from "react-icons/fa";
import { motion } from "framer-motion";

const GlucoseConsumables = () => {
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        quantity: "",
        aadhar: "",
    });

    const [employeeName, setEmployeeName] = useState("");
    const [aadharError, setAadharError] = useState("");

    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false);

    const [glucoseConsumables, setGlucoseConsumables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    // Total Glucose Stock
    const [totalStock, setTotalStock] = useState(0);

    const fetchGlucoseConsumables = async () => {
        try {
            setLoading(true);
            const params = {};
            if (fromDate) params.from_date = fromDate;
            if (toDate) params.to_date = toDate;

            const response = await axios.get("http://localhost:8000/get_glucose_consumable/", { params });
            // Handle potentially different response structures
            setGlucoseConsumables(response.data.glucose_consumables || response.data || []);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching glucose consumables:", error);
            setLoading(false);
        }
    };

    const fetchStock = async () => {
        try {
            await axios.post("http://localhost:8000/archive_stock/"); // maintain hygiene
            const res = await axios.get("http://localhost:8000/current_stock/");
            if (res.data && res.data.stock) {
                // Filter for Glucose
                const glucoseItems = res.data.stock.filter(item =>
                    (item.medicine_form && item.medicine_form.toLowerCase().includes("glucose")) ||
                    (item.brand_name && item.brand_name.toLowerCase().includes("glucose")) ||
                    (item.chemical_name && item.chemical_name.toLowerCase().includes("glucose"))
                );

                // Sum total quantity
                const total = glucoseItems.reduce((acc, item) => acc + item.quantity, 0);
                setTotalStock(total);
            }
        } catch (err) {
            console.error("Error fetching stock:", err);
        }
    };

    useEffect(() => {
        fetchGlucoseConsumables();
        fetchStock();
    }, []);

    // --- Aadhar Validation ---
    const validateAadhar = async (aadhar) => {
        if (aadhar.length !== 12) {
            setAadharError("Aadhar must be 12 digits.");
            setEmployeeName("");
            return;
        }
        try {
            const res = await axios.post("http://localhost:8000/userDataWithID", { aadhar });

            if (res.data && res.data.data && res.data.data.length > 0) {
                const emp = res.data.data[0];
                setEmployeeName(emp.name || "Unknown Name");
                setAadharError("");
            } else {
                setEmployeeName("");
                setAadharError("Employee not found in backend records.");
            }
        } catch (error) {
            console.error("Aadhar validation error:", error);
            setEmployeeName("");
            setAadharError("Error checking Aadhar.");
        }
    };

    const handleAadharBlur = () => {
        if (formData.aadhar) validateAadhar(formData.aadhar);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("");
        setIsError(false);

        if (!formData.aadhar || aadharError) {
            setMessage("Valid Aadhar Number is required.");
            setIsError(true);
            return;
        }

        if (!formData.quantity) {
            setMessage("Please enter Quantity.");
            setIsError(true);
            return;
        }

        try {
            await axios.post("http://localhost:8000/add_glucose_consumable/", formData);
            alert("Glucose Consumable added successfully!");
            setShowForm(false);
            fetchGlucoseConsumables();
            fetchStock(); // Refresh available stock display
            setFormData({
                quantity: "",
                aadhar: "",
            });
            setEmployeeName("");
        } catch (err) {
            setMessage(err.response?.data?.error || "Error adding record.");
            setIsError(true);
        }
    };

    const handleDownloadExcel = () => {
        const dataToExport = glucoseConsumables.map((item) => ({
            "Aadhar": item.aadhar,
            "Quantity": item.quantity,
            "Consumed Date": new Date(item.consumed_date).toLocaleDateString("en-GB"),
        }));
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "GlucoseConsumables");
        XLSX.writeFile(workbook, `Glucose_Consumables_${Date.now()}.xlsx`);
    };

    return (
        <div className="h-screen w-full flex bg-gradient-to-br from-blue-300 to-blue-400">
            <Sidebar />
            <div className="w-4/5 p-8 overflow-y-auto">

                <div className="mb-8 flex justify-between items-center">
                    <h1 className="text-4xl font-bold text-gray-800">Glucose Consumables</h1>
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

                        {/* Display Total Available Stock */}
                        <div className="mb-4 bg-blue-100 p-4 rounded-md border border-blue-200">
                            <h3 className="text-lg font-semibold text-blue-800">Total Available Glucose Stock: {totalStock}</h3>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full table-auto font-sans">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aadhar</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Consumed On</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {loading ? (
                                        <tr><td colSpan="3" className="text-center py-4 text-gray-500">Loading...</td></tr>
                                    ) : glucoseConsumables.length === 0 ? (
                                        <tr><td colSpan="3" className="text-center py-4 text-gray-500">No records found.</td></tr>
                                    ) : (
                                        glucoseConsumables.map((item, index) => (
                                            <tr key={item.id || index} className="hover:bg-blue-50 transition">
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{item.aadhar}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-red-600 font-bold">{item.quantity}</td>
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

                            <h2 className="text-2xl font-bold mb-6 text-center text-blue-600">Add Glucose Consumption</h2>
                            <p className="text-center text-gray-500 text-sm mb-4">Stock will be automatically deducted from available batches.</p>

                            <div className="text-center mb-6">
                                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">Available Stock: {totalStock}</span>
                            </div>

                            {message && (
                                <div className={`p-4 mb-4 rounded-md text-center ${isError ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                                    {message}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Aadhar Input */}
                                <div>
                                    <label className="block text-gray-700 font-bold mb-1">Aadhar Number</label>
                                    <input
                                        type="text"
                                        name="aadhar"
                                        value={formData.aadhar}
                                        onChange={handleChange}
                                        onBlur={handleAadharBlur}
                                        maxLength={12}
                                        className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 ${aadharError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                                        placeholder="Enter 12-digit Aadhar"
                                    />
                                    {aadharError && <p className="text-red-500 text-xs mt-1">{aadharError}</p>}
                                    {employeeName && <p className="text-green-600 text-sm mt-1 font-semibold">Name: {employeeName}</p>}
                                </div>

                                <div className="relative">
                                    <label className="block text-gray-700 font-bold mb-1">Quantity to Consume</label>
                                    <input
                                        type="number"
                                        name="quantity"
                                        value={formData.quantity}
                                        onChange={handleChange}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Qty"
                                        min="1"
                                        max={totalStock > 0 ? totalStock : undefined}
                                    />
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition duration-300 shadow-md"
                                    >
                                        Confirm & Add
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
