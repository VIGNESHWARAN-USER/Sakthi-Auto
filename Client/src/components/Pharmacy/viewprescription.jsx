import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Sidebar from "../Sidebar";
import Prescription from '../NewVisit/Prescription';
import { FaEraser, FaClock, FaCheckCircle, FaPrescriptionBottleAlt, FaSearch, FaTimes } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

function Viewprescription() {
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPrescriptionData, setSelectedPrescriptionData] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [showIssued, setShowIssued] = useState(false);
    const [selectedIssuedPrescriptionItems, setSelectedIssuedPrescriptionItems] = useState([]);
    const [viewedPrescriptionId, setViewedPrescriptionId] = useState(null);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [filteredPrescriptions, setFilteredPrescriptions] = useState([]);

    // Logic preserved exactly as provided
    const fetchPrescriptions = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axios.get('http://localhost:8000/prescriptions/view/');
            if (response.data && Array.isArray(response.data.prescriptions)) {
                setPrescriptions(response.data.prescriptions);
                setFilteredPrescriptions(response.data.prescriptions);
            } else {
                throw new Error('Invalid response format from server');
            }
        } catch (error) {
            console.error('Error fetching prescriptions:', error);
            setError(error.response?.data?.message || 'Failed to fetch prescriptions');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPrescriptions();
    }, [fetchPrescriptions]);

    const pendingCount = prescriptions.filter(p => p.issued_status === 0 || p.issued_status === false).length;
    const issuedCount = prescriptions.filter(p => p.issued_status === 1 || p.issued_status === true).length;

    useEffect(() => {
        const filtered = prescriptions.filter(prescription => {
            const prescriptionDate = new Date(prescription.entry_date);
            const from = fromDate ? new Date(fromDate) : null;
            const to = toDate ? new Date(toDate) : null;
            const statusMatch = showIssued 
                ? (prescription.issued_status === 1 || prescription.issued_status === true)
                : (prescription.issued_status === 0 || prescription.issued_status === false);

            if (!statusMatch) return false;
            if (from && to) return prescriptionDate >= from && prescriptionDate <= to;
            else if (from) return prescriptionDate >= from;
            else if (to) return prescriptionDate <= to;
            return true;
        });
        setFilteredPrescriptions(filtered);
    }, [fromDate, toDate, prescriptions, showIssued]);

    const handlePrescriptionUpdate = useCallback(async (issuedItems) => {
        try {
            if (!Array.isArray(issuedItems)) throw new Error('Invalid issued items data');
            await fetchPrescriptions();
            const updatePromises = issuedItems.map(async (item) => {
                if (!item.issuedIn || parseInt(item.issuedIn) <= 0) return;
                const response = await axios.post('http://localhost:8000/update-pharmacy-stock/', {
                    doseVolume: item.doseVolume,
                    expiryDate: item.expiryDate,
                    quantity: parseInt(item.issuedIn),
                    type: item.type.toLowerCase(),
                    chemicalName: item.chemicalName,
                    brandName: item.brandName,
                    action: 'decrease'
                });
                return response.data;
            });
            await Promise.all(updatePromises);
            setSelectedPrescriptionData(null);
            setIsUpdating(false);
            alert("Prescription Issued Successfully and Stock Updated!");
            setShowIssued(true);
            setFromDate('');
            setToDate('');
        } catch (error) {
            alert('Error updating prescription and stock. Please try again.');
        }
    }, [fetchPrescriptions]);

    const processPrescriptionItems = (prescriptionId) => {
        const prescription = prescriptions.find(p => p.id === prescriptionId);
        if (!prescription) return;
        const items = [];
        const processItems = (itemList, typeName) => {
            if (!Array.isArray(itemList)) return;
            itemList.forEach((item, index) => {
                if (item && item.chemicalName) {
                    items.push({
                        key: `${typeName.toLowerCase()}-${item.id || index}-${prescriptionId}`,
                        type: typeName,
                        id: item.id,
                        chemicalName: item.chemicalName || '-',
                        brandName: item.brandName || '-',
                        doseVolume: item.doseVolume || '-',
                        servingOrQty: (typeName === 'Syrup' || typeName === 'Drops') ? (item.serving || item.qty || '-') : (item.qty || '-'),
                        expiryDate: item.expiryDate || '-',
                        issuedIn: item.issuedIn || '-',
                    });
                }
            });
        };
        const categories = { tablets: 'Tablet', syrups: 'Syrup', injections: 'Injection', creams: 'Cream', drops: 'Drops', fluids: 'Fluid', lotions: 'Lotion', powder: 'Powder', respules: 'Respule', suture_procedure: 'Suture/Procedure', dressing: 'Dressing', others: 'Other' };
        Object.entries(categories).forEach(([key, label]) => processItems(prescription[key], label));
        setSelectedIssuedPrescriptionItems(items);
    };

    const handleInitiate = (prescriptionToIssue) => {
        if (!prescriptionToIssue) return;
        setSelectedPrescriptionData([prescriptionToIssue]);
        setIsUpdating(true);
        setTimeout(() => {
            const el = document.getElementById('dispensing-section');
            if(el) el.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleViewIssuedItems = (prescriptionId) => {
        setViewedPrescriptionId(prescriptionId);
        processPrescriptionItems(prescriptionId);
    };

    return (
        <div className="h-screen w-full flex bg-gradient-to-br from-blue-300 to-blue-400 font-sans">
            <Sidebar />
            <div className="w-4/5 p-8 overflow-y-auto">
                
                {/* Header Section */}
                <div className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <h1 className="text-4xl font-bold text-gray-800">Dispensing Queue</h1>
                    
                    {/* Status Switcher */}
                    <div className="flex bg-white p-1.5 rounded-xl shadow-md border border-blue-200">
                        <button
                            onClick={() => { setShowIssued(false); setIsUpdating(false); }}
                            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition duration-200 ${!showIssued ? 'bg-blue-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            <FaClock size={14} /> Pending
                            <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${!showIssued ? 'bg-blue-400 text-white' : 'bg-gray-200 text-gray-600'}`}>{pendingCount}</span>
                        </button>
                        <button
                            onClick={() => { setShowIssued(true); setIsUpdating(false); }}
                            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition duration-200 ${showIssued ? 'bg-green-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            <FaCheckCircle size={14} /> Issued
                            <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${showIssued ? 'bg-green-400 text-white' : 'bg-gray-200 text-gray-600'}`}>{issuedCount}</span>
                        </button>
                    </div>
                </div>

                <motion.div 
                    className="bg-white p-8 rounded-lg shadow-lg mb-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-semibold text-gray-700">
                            {showIssued ? 'Issued History' : 'Pending Requests'}
                        </h2>
                        
                        {/* Date Filter Row for Issued */}
                        {showIssued && (
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">From</label>
                                    <input type="date" className="p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">To</label>
                                    <input type="date" className="p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                                </div>
                                <button onClick={() => {setFromDate(''); setToDate('');}} className="p-2.5 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition" title="Clear Filters">
                                    <FaEraser size={14} />
                                </button>
                            </div>
                        )}
                    </div>

                    {loading ? (
                        <div className="py-20 text-center">
                            <div className="inline-block h-10 w-10 text-blue-500 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
                            <p className="mt-2 text-gray-500 font-medium">Fetching records...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-inner">
                            <table className="min-w-full table-auto">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ID</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">MRD No</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Aadhar / ID</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Patient Name</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {filteredPrescriptions.length > 0 ? (
                                        filteredPrescriptions.map((prescription) => (
                                            <tr key={prescription.id} className={`hover:bg-blue-50 transition duration-150 ${isUpdating && selectedPrescriptionData?.[0]?.id === prescription.id ? 'bg-blue-50 ring-2 ring-blue-500 ring-inset' : ''}`}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">{prescription.id}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-700">{prescription.mrdNo}</td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{prescription.aadhar}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{prescription.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {prescription.entry_date ? new Date(prescription.entry_date).toLocaleDateString("en-GB") : 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    {showIssued ? (
                                                        <button
                                                            className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-100 text-green-700 text-xs font-bold rounded-lg border border-green-200 hover:bg-green-200 transition"
                                                            onClick={() => handleViewIssuedItems(prescription.id)}
                                                        >
                                                            <FaSearch size={10} /> View Items
                                                        </button>
                                                    ) : (
                                                        <button
                                                            className="inline-flex items-center gap-2 px-5 py-1.5 bg-blue-500 text-white text-xs font-bold rounded-lg hover:bg-blue-600 shadow-sm transition"
                                                            onClick={() => handleInitiate(prescription)}
                                                            disabled={isUpdating}
                                                        >
                                                            <FaPrescriptionBottleAlt size={12} /> Dispense
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="py-20 text-center text-gray-500 italic">
                                                No {showIssued ? 'issued' : 'pending'} prescriptions found for the current filter.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </motion.div>

                {/* Active Dispensing Section */}
                <AnimatePresence>
                    {isUpdating && selectedPrescriptionData?.[0] && (
                        <motion.div 
                            id="dispensing-section"
                            className="mt-8 p-8 bg-white rounded-xl shadow-2xl border-t-8 border-blue-500"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                        >
                            <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
                                <div>
                                    <h2 className="text-3xl font-bold text-gray-800">Dispensing Drugs</h2>
                                    <p className="text-gray-500 font-medium">Prescription #{selectedPrescriptionData[0].id} • Patient: <span className="text-blue-600 font-bold">{selectedPrescriptionData[0].name}</span></p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded text-sm font-bold border">Date: {new Date(selectedPrescriptionData[0].entry_date).toLocaleDateString()}</span>
                                    <button
                                        className="px-5 py-2 bg-gray-500 text-white font-bold rounded-lg hover:bg-gray-600 transition shadow-md"
                                        onClick={() => {setSelectedPrescriptionData(null); setIsUpdating(false);}}
                                    >
                                        Cancel Transaction
                                    </button>
                                </div>
                            </div>
                            
                            <Prescription
                                data={selectedPrescriptionData}
                                onPrescriptionUpdate={handlePrescriptionUpdate}
                                condition={true}
                                mrdNo={selectedPrescriptionData[0].mrdNo}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Issued Items Modal */}
                <AnimatePresence>
                    {selectedIssuedPrescriptionItems.length > 0 && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
                            <motion.div 
                                className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full overflow-hidden"
                                initial={{ opacity: 0, y: 50 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 50 }}
                            >
                                <div className="bg-gray-50 px-8 py-5 border-b flex justify-between items-center">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-800">Issued Medicine Details</h2>
                                        <p className="text-sm text-gray-500 font-bold">Prescription Order {viewedPrescriptionId}</p>
                                    </div>
                                    <button onClick={() => setSelectedIssuedPrescriptionItems([])} className="p-2 hover:bg-red-100 text-gray-400 hover:text-red-600 rounded-full transition">
                                        <FaTimes size={24} />
                                    </button>
                                </div>

                                <div className="p-8 max-h-[70vh] overflow-y-auto">
                                    <table className="min-w-full bg-white border rounded-xl overflow-hidden">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Type</th>
                                                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Chemical Name</th>
                                                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Brand Name</th>
                                                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Dose/Vol</th>
                                                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Qty</th>
                                                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Expiry</th>
                                                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Issued Notes</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {selectedIssuedPrescriptionItems.map((item) => (
                                                <tr key={item.key} className="hover:bg-gray-50 transition">
                                                    <td className="px-4 py-4 text-xs font-bold text-blue-600 uppercase">{item.type}</td>
                                                    <td className="px-4 py-4 text-sm text-gray-700">{item.chemicalName}</td>
                                                    <td className="px-4 py-4 text-sm font-bold text-gray-900">{item.brandName}</td>
                                                    <td className="px-4 py-4 text-sm text-gray-500">{item.doseVolume}</td>
                                                    <td className="px-4 py-4 text-sm font-bold text-green-600">{item.servingOrQty}</td>
                                                    <td className="px-4 py-4 text-xs text-gray-400 font-medium">{item.expiryDate}</td>
                                                    <td className="px-4 py-4 text-sm text-gray-700 whitespace-pre-wrap italic">{item.issuedIn}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="bg-gray-50 px-8 py-4 border-t text-right">
                                    <button
                                        className="bg-gray-800 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-black transition shadow-lg"
                                        onClick={() => setSelectedIssuedPrescriptionItems([])}
                                    >
                                        Close Details
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

export default Viewprescription;