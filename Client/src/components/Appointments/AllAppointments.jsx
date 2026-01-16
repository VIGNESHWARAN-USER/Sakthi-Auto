import React, { useEffect, useState, useMemo } from "react";
import { FaSearch, FaCalendarAlt, FaFilter, FaSyncAlt, FaDownload } from "react-icons/fa";
import { motion } from "framer-motion"; 
import { useNavigate } from "react-router-dom";
import axios from 'axios';
import * as XLSX from 'xlsx';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

const AllAppointments = () => {
    const [appointments, setAppointments] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [purpose, setPurpose] = useState("");
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState([]);
    const navigate = useNavigate();

    const purposeOptions = [
        "Pre employment", "Pre employment (Food Handler)", "Pre Placement",
        "Annual / Periodical", "Periodical (Food Handler)", "Camps (Mandatory)",
        "Camps (Optional)", "Special Work Fitness", "Special Work Fitness (Renewal)",
        "Fitness After Medical Leave", "Mock Drill", "BP Sugar Check  ( Normal Value)",
        "Review"
    ];

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const response = await axios.post("http://localhost:8000/userData");
                setEmployees(response.data.data || []);
            } catch (error) {
                console.error("Error fetching employee data:", error);
                setEmployees([]);
            }
        };
        fetchDetails();
    }, []);

    useEffect(() => {
        fetchAppointments();
    }, [fromDate, toDate, purpose]);

    const fetchAppointments = async () => {
        setLoading(true);
        try {
            let url = "http://localhost:8000/appointments/";
            const params = new URLSearchParams();

            if (fromDate) {
            params.append("fromDate", fromDate);
            } else {
            const today = new Date().toISOString().split('T')[0]; 
            params.append("fromDate", today);
            }
            if (toDate) params.append("toDate", toDate);
            if (purpose) params.append("purpose", purpose);


            const queryString = params.toString();
            if (queryString) {
                url += `?${queryString}`;
            }

            console.log("Fetching appointments from:", url);

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            console.log("Received appointments data:", data);

            if (data.appointments && Array.isArray(data.appointments)) {
                setAppointments(data.appointments);
            } else {
                console.warn("No 'appointments' array found in response or it's not an array:", data);
                setAppointments([]);
            }
        } catch (error) {
            console.error("Error fetching appointments:", error);
            setAppointments([]);
        } finally {
            setLoading(false);
        }
    };

    const clearFilters = () => {
        setFromDate("");
        setToDate("");
        setPurpose("");
        setSearchQuery("");
    };

    const currentUser = localStorage.getItem("userData");

    const filteredAppointments = useMemo(() => {
        const lowerCaseQuery = searchQuery.toLowerCase().trim();
        if (!lowerCaseQuery) {
            return appointments;
        }
        return appointments.filter(appointment => {
            const empNoMatch = appointment.emp_no?.toString().toLowerCase().includes(lowerCaseQuery);
            const nameMatch = appointment.name?.toLowerCase().includes(lowerCaseQuery);
            return empNoMatch || nameMatch;
        });
    }, [appointments, searchQuery]);
    console.log(filteredAppointments);
    const handleNavigate = async (appointment) => {
        console.log();
            navigate("../newvisit", { state: { appointment: appointment, reference: true} });
    };

    const numberOfColumns = 18;

    const downloadExcel = () => {   
        const data = filteredAppointments.map(appointment => ({
            'Appt No.': appointment.appointment_no || '-',
            'Booked Date': appointment.booked_date || '-',
            'MRD No.': appointment.mrdNo || '-',
            'Role': appointment.role || '-',
            'Emp No.': appointment.emp_no || '-',
            'Aadhar No.': appointment.aadhar || '-',
            'Name': appointment.name || '-',
            'Organization': appointment.organization_name || '-',
            'Contractor': appointment.contractor_name || '-',
            'Purpose': appointment.purpose || '-',
            'Date': appointment.date || '-',
            'Time': appointment.time || '-',
            'Booked By': appointment.booked_by || '-',
            'Nurse Submit': appointment.submitted_by_nurse || '-',
            'Dr Submit': appointment.submitted_Dr || '-',
            'Consult Dr': appointment.consultated_Dr || '-',
            'Status': appointment.status || '-',
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Appointments");
        XLSX.writeFile(workbook, "Appointments.xlsx");
    };

    const getNoResultsMessage = () => {
        if (searchQuery) {
            return `No appointments found matching your search "${searchQuery}" with the selected filters.`;
        }
        if (purpose || fromDate || toDate) {
            let filterDesc = [];
            if (purpose) filterDesc.push(`purpose "${purpose}"`);
            if (fromDate && toDate) filterDesc.push(`dates between ${fromDate} and ${toDate}`);
            else if (fromDate) filterDesc.push(`date from ${fromDate}`);
            else if (toDate) filterDesc.push(`date up to ${toDate}`);
            return `No appointments found for ${filterDesc.join(' and ')}. Try broadening your filters.`;
        }
        return "No appointments available.";
    };

    return (
        <motion.div
            className="p-4 md:p-6 rounded-lg bg-gray-50 shadow-md min-h-screen"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="mb-4 md:mb-6 flex justify-between items-center">
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">
                    {`${purpose ? `${purpose} Appointments` : "All Appointments"}`}
                </h1>
                <button
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center gap-2 text-sm"
                    onClick={downloadExcel}
                    disabled={filteredAppointments.length === 0 || loading}
                >
                    <FaDownload size={14} /> Download Excel
                </button>
            </div>

            <div className="bg-white rounded-lg shadow p-4 mb-4 md:mb-6">
                <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
                    <div className="flex items-center gap-2 md:gap-4 w-full">
                        <div className="relative flex items-center w-full">
                            <FaSearch className="absolute left-3 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by Emp No or Name..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-4 w-full md:w-auto">
                        <div className="relative flex items-center w-full md:w-40">
                            <FaCalendarAlt className="absolute left-3 text-gray-400" />
                            <input
                                type="date"
                                title="From Date"
                                className="w-full pl-10 pr-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                            />
                        </div>
                        <div className="relative flex items-center w-full md:w-40">
                            <FaCalendarAlt className="absolute left-3 text-gray-400" />
                            <input
                                type="date"
                                title="To Date"
                                className="w-full pl-10 pr-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                            />
                        </div>
                        <div className="relative flex items-center w-full md:w-48">
                            <FaFilter className="absolute left-3 text-gray-400" />
                            <select
                                value={purpose}
                                onChange={(e) => setPurpose(e.target.value)}
                                className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white text-sm"
                            >
                                <option value="">All Purposes</option>
                                {purposeOptions.map((option, index) => (
                                    <option key={index} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                            <button
                                className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition flex items-center gap-1.5 text-sm"
                                onClick={clearFilters}
                                disabled={loading}
                            >
                                <FaSyncAlt size={14} /> Clear
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-x-auto">
                <table className="min-w-full table-auto">
                    <thead className="bg-blue-50 text-blue-600">
                        <tr>
                            <th className="px-3 py-2 font-semibold text-left text-xs sticky left-0 top-0 bg-blue-50 z-10">Appt No.</th>
                            <th className="px-3 py-2 font-semibold text-left text-xs">Booked Date</th>
                            <th className="px-3 py-2 font-semibold text-left text-xs">MRD No.</th>
                            <th className="px-3 py-2 font-semibold text-left text-xs">Role</th>
                            <th className="px-3 py-2 font-semibold text-left text-xs sticky left-[70px] bg-blue-50 z-10">Emp No</th>
                            <th className="px-3 py-2 font-semibold text-left text-xs">Aadhar No.</th>
                            <th className="px-3 py-2 font-semibold text-left text-xs sticky left-[140px] bg-blue-50 z-10">Name</th>
                            <th className="px-3 py-2 font-semibold text-left text-xs">Organization</th>
                            <th className="px-3 py-2 font-semibold text-left text-xs">Contractor</th>
                            <th className="px-3 py-2 font-semibold text-left text-xs">Purpose</th>
                            <th className="px-3 py-2 font-semibold text-left text-xs">Date</th>
                            <th className="px-3 py-2 font-semibold text-left text-xs">Time</th>
                            <th className="px-3 py-2 font-semibold text-left text-xs">Booked By</th>
                            <th className="px-3 py-2 font-semibold text-left text-xs">Nurse Submit</th>
                            <th className="px-3 py-2 font-semibold text-left text-xs">Dr Submit</th>
                            <th className="px-3 py-2 font-semibold text-left text-xs">Consult Dr</th>
                            <th className="px-3 py-2 font-semibold text-left text-xs">Status</th>
                            <th className="px-3 py-2 font-semibold text-center text-xs">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={numberOfColumns} className="text-center py-6">
                                    <div className="flex flex-col items-center justify-center py-20 bg-white/50 rounded-xl border border-dashed border-gray-300">
                                          <FontAwesomeIcon icon={faSpinner} spin className="text-5xl text-blue-500 mb-4" />
                                          <p className="text-gray-600 font-semibold text-lg animate-pulse">Searching Appointments...</p>
                                        </div>
                                </td>
                            </tr>
                        ) : filteredAppointments.length > 0 ? (
                            filteredAppointments.map((appointment) => {
                                console.log(appointment.submitted_Dr, appointment.submitted_by_nurse)
                                let owner = appointment.submitted_Dr;
                                if(owner === undefined || owner === "") owner = appointment.submitted_by_nurse;
                                const isLocked = appointment.status === 'inprogress' && currentUser !== owner;
                                const isCompleted = appointment.status === 'completed';
                                console.log(appointment.status, currentUser, isLocked, isCompleted);
                                return(
                                <tr key={appointment.id} className="border-b border-gray-100 hover:bg-gray-50 transition group">
                                    <td className="px-3 py-2 text-xs text-gray-700 text-left truncate sticky left-0 bg-white group-hover:bg-gray-50 z-10">{appointment.appointment_no || '-'}</td>
                                    <td className="px-3 py-2 text-xs text-gray-700 text-left truncate">{appointment.booked_date || '-'}</td>
                                    <td className="px-3 py-2 text-xs text-gray-700 text-left truncate">{appointment.mrdNo || '-'}</td>
                                    <td className="px-3 py-2 text-xs text-gray-700 text-left truncate">{appointment.role || '-'}</td>
                                    <td className="px-3 py-2 text-xs text-gray-700 text-left truncate sticky left-[70px] bg-white group-hover:bg-gray-50 z-10">{appointment.emp_no || '-'}</td>
                                    <td className="px-3 py-2 text-xs text-gray-700 text-left truncate">{appointment.aadhar || '-'}</td>
                                    <td className="px-3 py-2 text-xs text-gray-700 text-left truncate sticky left-[140px] bg-white group-hover:bg-gray-50 z-10">{appointment.name || '-'}</td>
                                    <td className="px-3 py-2 text-xs text-gray-700 text-left truncate">{appointment.organization_name || '-'}</td>
                                    <td className="px-3 py-2 text-xs text-gray-700 text-left truncate">{appointment.contractor_name || '-'}</td>
                                    <td className="px-3 py-2 text-xs text-gray-700 text-left truncate">{appointment.register || '-'}</td>
                                    <td className="px-3 py-2 text-xs text-gray-700 text-left truncate">{appointment.date || '-'}</td>
                                    <td className="px-3 py-2 text-xs text-gray-700 text-left truncate">{appointment.time || '-'}</td>
                                    <td className="px-3 py-2 text-xs text-gray-700 text-left truncate">{appointment.booked_by || '-'}</td>
                                    <td className="px-3 py-2 text-xs text-gray-700 text-left truncate">{appointment.submitted_by_nurse || '-'}</td>
                                    <td className="px-3 py-2 text-xs text-gray-700 text-left truncate">{appointment.submitted_Dr || '-'}</td>
                                    <td className="px-3 py-2 text-xs text-gray-700 text-left truncate">{appointment.consultated_Dr || '-'}</td>
                                    <td className="px-3 py-2 text-xs text-gray-700 text-left truncate">{appointment.status.toUpperCase() || '-'}</td>
                                    <td className="px-3 py-2 text-xs text-gray-700 text-center">
                                        <button
                                className={`px-2 py-1 rounded text-xs font-semibold mx-auto w-20 text-center transition-all ${
                                    appointment.status === "initiate" 
                                        ? "bg-red-500 text-white hover:bg-red-600" 
                                        : appointment.status === "inprogress" 
                                            ? `bg-yellow-500 text-white ${isLocked ? "cursor-not-allowed opacity-50" : "hover:bg-yellow-600"}`
                                            : appointment.status === "pending"?
                                            `bg-yellow-500 text-white ${isLocked ? "cursor-not-allowed opacity-50" : "hover:bg-yellow-600"}`
                                            : "bg-green-500 text-white cursor-not-allowed opacity-70"
                                }`}
                                onClick={() => handleNavigate(appointment)}
                                disabled={isCompleted || isLocked}
                                title={isLocked ? `Locked by ${owner}` : ""}
                            >
                                {appointment.status === "initiate" ? "Initiate" :
                                appointment.status === "inprogress" ? "View" :
                                appointment.status === "pending" ? "View" :
                                "Completed"}
                            </button>
                                    </td>
                                </tr>
                            )
                            })
                        ) : (
                            <tr>
                                <td colSpan={numberOfColumns} className="p-6 text-center text-gray-500">
                                    {getNoResultsMessage()}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </motion.div>
    );
};

export default AllAppointments;