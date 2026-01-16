import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { parse, isValid } from 'date-fns';
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const VisitHistory = ({ data }) => {
    // State for all filters
    const [searchQuery, setSearchQuery] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [visitReason, setVisitReason] = useState("");
    
    // State for data
    const [filteredData, setFilteredData] = useState([]);
    const [visitData, setVisitData] = useState([]); // This will hold the original, unfiltered data
    console.log(visitData)
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const aadhar = data.aadhar;

    useEffect(() => {
        const fetchVisitData = async () => {
            if (!aadhar) {
                setLoading(false);
                return;
            }
            try {
                const response = await axios.post(
                    `http://localhost:8000/visitData/${aadhar}`
                );
                const data = response.data.data || [];
                setVisitData(data);
                
                setFilteredData(data);
            } catch (error) {
                console.error("Error fetching visit data:", error);
                setVisitData([]);
                setFilteredData([]);
            } finally {
                setLoading(false);
            }
        };
        fetchVisitData();
    }, [aadhar]);

    
    const applyFilter = () => {
        const filtered = visitData.filter((item) => {
            // 1. Filter by MRD No. search query
            const searchCondition = searchQuery
                ? item.mrdNo && item.mrdNo.toLowerCase().includes(searchQuery.toLowerCase())
                : true;

            // 2. Filter by Date Range
            let visitDateObj;
            try {
                visitDateObj = parse(item.date, 'yyyy-MM-dd', new Date());
                if (!isValid(visitDateObj)) {
                    visitDateObj = parse(item.date, 'MM/dd/yyyy', new Date());
                }
                if (!isValid(visitDateObj)) {
                    visitDateObj = new Date(item.date);
                }
                if (!isValid(visitDateObj)) {
                    console.error("Invalid date format:", item.date);
                    return false;
                }
            } catch (error) {
                console.error("Error parsing date:", item.date, error);
                return false;
            }

            const fromDateObj = fromDate ? new Date(fromDate) : null;
            const toDateObj = toDate ? new Date(toDate) : null;

            const dateCondition =
                (!fromDateObj || visitDateObj >= fromDateObj) &&
                (!toDateObj || visitDateObj <= toDateObj);
            
            // 3. Filter by Visit Reason
            const reasonCondition = visitReason
                ? item.register.toLowerCase() === visitReason.toLowerCase()
                : true;

            // An item is included only if it meets all conditions
            return searchCondition && dateCondition && reasonCondition;
        });
        setFilteredData(filtered);
    };

    // Helper function to reset all filters
    const resetFilters = () => {
        setSearchQuery("");
        setFromDate("");
        setToDate("");
        setVisitReason("");
        setFilteredData(visitData); // Reset the table to show all original data
    };
    // ==== MODIFICATION END ====


    const formatFieldName = (name) => {
        return name
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    return (
        <div className="p-6 bg-gray-100 min-h-screen">
            {/* Filters */}
            {/* ==== MODIFICATION START: Updated layout to include Apply/Reset buttons ==== */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-4 bg-white p-6 shadow-md rounded-lg mb-6">
                {/* Search by MRD No. Input */}
                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                        Search by MRD No.
                    </label>
                    <input
                        type="text"
                        placeholder="Enter MRD No..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* From Date Input */}
                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                        From Date
                    </label>
                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* To Date Input */}
                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                        To Date
                    </label>
                    <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Visit Reason Select */}
                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                        Visit Reason
                    </label>
                    <select
                        value={visitReason}
                        onChange={(e) => setVisitReason(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                    >
                        <option value="">All Reasons</option>
                        {/* Other options... */}
                        <option>Pre employment</option>
                        <option>Pre employment (Food Handler)</option>
                        <option>Pre Placement</option>
                        <option>Annual / Periodical</option>
                        <option>Periodical (Food Handler)</option>
                        <option>Camps (Mandatory)</option>
                        <option>Camps (Optional)</option>
                        <option>Special Work Fitness</option>
                        <option>Special Work Fitness (Renewal)</option>
                        <option>Fitness After Medical Leave</option>
                        <option>Mock Drill</option>
                        <option>BP Sugar Check (Normal Value)</option>
                        <option>Retirement Examination</option>
                        <option>Illness</option>
                        <option>Over Counter Illness</option>
                        <option>Injury</option>
                        <option>Over Counter Injury</option>
                        <option>Follow-up Visits</option>
                        <option>BP Sugar Chart</option>
                        <option>Injury Outside the Premises</option>
                        <option>Over Counter Injury Outside the Premises</option>
                        <option>Alcohol Abuse</option>
                    </select>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 mb-6">
                 <button
                    onClick={resetFilters}
                    className="bg-gray-500 text-white px-6 py-2 rounded-md shadow-md hover:bg-gray-600 transition duration-300"
                >
                    Reset
                </button>
                <button
                    onClick={applyFilter}
                    className="bg-blue-500 text-white px-6 py-2 rounded-md shadow-md hover:bg-blue-600 transition duration-300"
                >
                    Apply 
                </button>
            </div>
            {/* ==== MODIFICATION END ==== */}

            {/* Table */}
            <div className="bg-white shadow-md rounded-lg p-6 overflow-x-auto">
                <table className="min-w-full bg-white rounded-lg shadow-lg">
                    {/* ... Table Head remains the same ... */}
                    <thead className="bg-blue-500 text-white">
                        <tr>
                            <th className="px-6 py-3 text-left text-sm font-medium">MRD No.</th>
                            <th className="px-6 py-3 text-left text-sm font-medium">Purpose</th>
                            <th className="px-6 py-3 text-left text-sm font-medium">Visited Date</th>
                            <th className="px-6 py-3 text-left text-sm font-medium">Fitness Outcome</th>
                            <th className="px-6 py-3 text-left text-sm font-medium">Consultation Outcome</th>
                            <th className="px-6 py-3 text-left text-sm font-medium">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan="6" className="text-center py-4 text-gray-500">
                                    <div className="flex flex-col items-center justify-center py-20 bg-white/50 rounded-xl border border-dashed border-gray-300">
                                          <FontAwesomeIcon icon={faSpinner} spin className="text-5xl text-blue-500 mb-4" />
                                          <p className="text-gray-600 font-semibold text-lg animate-pulse">Searching Database...</p>
                                        </div>
                                </td>
                            </tr>
                        ) : filteredData.length > 0 ? (
                            filteredData.map((visit, index) => {
                                
                                const uploadableFields = [
                                    'application_form', 'manual', 'self_declared',
                                    'consent', 'fc', 'report'
                                ];

                                const availableUploads = visit.vitals
                                    ? uploadableFields.filter(field => visit.vitals[field])
                                    : [];

                                return (
                                    <tr key={index} className="hover:bg-gray-100 transition duration-200">
                                        <td className="px-6 py-4 whitespace-nowrap">{visit.mrdNo || "N/A"}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{visit.register}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{visit.entry_date}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{visit.overall_fitness?.toUpperCase() || "-"}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{visit.diagnosis?.toUpperCase() || "-"}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button
                                                onClick={() => {
                                                    navigate("../summary", {
                                                        state: { mrdNo: visit.mrdNo },
                                                    });
                                                }}
                                                className="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800 transition duration-300"
                                            >
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="6" className="text-center py-4 text-gray-500">
                                    No records found for the selected filters
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default VisitHistory;