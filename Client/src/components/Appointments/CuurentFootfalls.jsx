import React, { useEffect, useState, useMemo } from "react";
import { FaSearch, FaCalendarAlt, FaFilter, FaSyncAlt } from "react-icons/fa";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import axios from 'axios';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

const CurrentFootfalls = () => {
  const [appointments, setAppointments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [purpose, setPurpose] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const purposeOptions = [
    "Pre employment", "Pre employment (Food Handler)", "Pre Placement",
    "Annual / Periodical", "Periodical (Food Handler)", "Camps (Mandatory)",
    "Camps (Optional)", "Special Work Fitness", "Special Work Fitness (Renewal)",
    "Fitness After Medical Leave", "Mock Drill", "BP Sugar Check  ( Normal Value)",
    "Review"
  ];

  
  useEffect(() => {
    fetchAppointments();
  }, [fromDate, toDate, purpose]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      let url
      if(accessLevel === "nurse" ){
        url = "http://localhost:8000/pendingfootfalls/";
      }
      else{
      url = "http://localhost:8000/currentfootfalls/";
      }
      
      const params = new URLSearchParams();

      if (fromDate) params.append("fromDate", fromDate);
      if (toDate) params.append("toDate", toDate);
      if (purpose) params.append("purpose", purpose);

      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }

      console.log("Fetching appointments from:", url);

      const response = await axios.post(url);
      if (response.status !== 200) {
        throw new Error(`HTTP error! status: ${response.status}`);
      } 
      
      const data = await response.data.data;
      console.log("Received appointments data:", data);

      if (data && Array.isArray(data)) {
        setAppointments(data);
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
  
  // Client-side filtering
  const filteredAppointments = useMemo(() => {
    const lowerCaseQuery = searchQuery.toLowerCase().trim();
    if (!lowerCaseQuery) {
      return appointments;
    }
    return appointments.filter(appointment => {
      const empNoMatch = appointment.details.emp_no?.toString().toLowerCase().includes(lowerCaseQuery);
      const nameMatch = appointment.details.name?.toLowerCase().includes(lowerCaseQuery);
      return empNoMatch || nameMatch;
    });
  }, [appointments, searchQuery]);

  const handleStatusChange = async (appointment) => {
    const mrdNo = appointment.details?.mrdNo || appointment.consultation?.mrdNo;
    const appointmentData = appointment.details || appointment.consultation;
    const fieldType = !appointment.consultation ? "assessment" : "consultation";
    if (!mrdNo) {
      alert("Error: No MRD Number found for this appointment.");
      return;
    }
    
    if( appointment.consultation && appointment.consultation.status.toLowerCase() === 'pending'){
      navigate("../newvisit", { 
        state: { 
          appointment: appointmentData, 
          reference: true,
          fieldType: fieldType
        } 
      });
      return;
    }
    if( appointment.assessment && appointment.assessment.status.toLowerCase() === 'pending'){
      navigate("../newvisit", { 
        state: { 
          appointment: appointmentData, 
          reference: true,
          fieldType: fieldType
        } 
      });
      return;
    }
    

    

    try {
      await axios.post('http://localhost:8000/update-status/', {
        id: mrdNo,
        status: 'inprogress',
        field: fieldType,
        doctor: localStorage.getItem('userData') || 'Unknown'
      });

      

      navigate("../newvisit", { 
        state: { 
          appointment: appointmentData, 
          reference: true,
          fieldType: fieldType
        } 
      });

    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status. Please try again.");
    }
  };

  const accessLevel = localStorage.getItem('accessLevel');
  const numberOfColumns = 11; // Adjusted to match header count

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
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">
          {accessLevel === "nurse" && 'Pending Footfalls' || 'All Appointments'}
        </h1>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-4 md:mb-6">
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          {/* Search Input */}
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

          {/* Date and Purpose Filters */}
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
                 <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition flex items-center gap-1.5 text-sm"
                onClick={clearFilters}
                disabled={loading}
              >
                <FaSyncAlt size={14}/> Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full table-auto">
          <thead className="bg-blue-50 text-blue-600">
            <tr>
              <th className="px-3 py-2 font-semibold text-left text-xs">MRD No.</th>
              <th className="px-3 py-2 font-semibold text-left text-xs">Role</th>
              <th className="px-3 py-2 font-semibold text-left text-xs sticky left-[70px] bg-blue-50 z-10">Emp No</th>
              <th className="px-3 py-2 font-semibold text-left text-xs">Aadhar No.</th>
              <th className="px-3 py-2 font-semibold text-left text-xs sticky left-[140px] bg-blue-50 z-10">Name</th>
              <th className="px-3 py-2 font-semibold text-left text-xs">Purpose</th>
              <th className="px-3 py-2 font-semibold text-left text-xs">Submitted Nurse</th>
              <th className="px-3 py-2 font-semibold text-left text-xs">Dr Submit</th>
              <th className="px-3 py-2 font-semibold text-left text-xs">Consult Dr</th>
              <th className="px-3 py-2 font-semibold text-center text-xs">Status</th>
              <th className="px-3 py-2 font-semibold text-center text-xs">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={numberOfColumns} className="text-center py-6">
                  <div className="flex flex-col items-center justify-center py-20 bg-white/50 rounded-xl border border-dashed border-gray-300">
                        <FontAwesomeIcon icon={faSpinner} spin className="text-5xl text-blue-500 mb-4" />
                        <p className="text-gray-600 font-semibold text-lg animate-pulse">Searching Database...</p>
                      </div>
                </td>
              </tr>
            ) : filteredAppointments.length > 0 ? (
                 filteredAppointments.map((appointment) => {
                    
                    const currentUser = localStorage.getItem("userData");
                    const activeRecord = appointment.consultation || appointment.assessment;
                    
                    
                    const rawStatus = activeRecord?.status || "initiate";
                    const status = rawStatus.toLowerCase(); 

                    
                    const owner = activeRecord?.submittedDoctor;

                    
                    const isLocked = status === 'inprogress' && owner !== currentUser;
                    const isCompleted = status === 'completed';
                   

                    return (
                        <tr key={appointment.id} className="border-b border-gray-100 hover:bg-gray-50 transition group">
                        <td className="px-3 py-2 text-xs text-gray-700 text-left truncate">{appointment.details.mrdNo || '-'}</td>
                        <td className="px-3 py-2 text-xs text-gray-700 text-left truncate">{appointment.details.type || '-'}</td>
                        <td className="px-3 py-2 text-xs text-gray-700 text-left truncate sticky left-[70px] bg-white group-hover:bg-gray-50 z-10">{appointment.details.emp_no || '-'}</td> 
                        <td className="px-3 py-2 text-xs text-gray-700 text-left truncate">{appointment.details.aadhar || '-'}</td>
                        <td className="px-3 py-2 text-xs text-gray-700 text-left truncate sticky left-[140px] bg-white group-hover:bg-gray-50 z-10">{appointment.details.name || '-'}</td> 
                        <td className="px-3 py-2 text-xs text-gray-700 text-left truncate">{appointment.details.register || '-'}</td>
                        <td className="px-3 py-2 text-xs text-gray-700 text-left truncate">{appointment?.consultation?.submittedNurse || appointment?.assessment?.submittedNurse || '-'}</td>
                        <td className="px-3 py-2 text-xs text-gray-700 text-left truncate">{appointment?.assessment?.bookedDoctor || appointment?.consultation?.bookedDoctor || '-'}</td>
                        <td className="px-3 py-2 text-xs text-gray-700 text-left truncate">{appointment?.consultation?.submittedDoctor || appointment?.assessment?.submittedDoctor || '-'}</td>
                        <td className="px-3 py-2 text-xs text-gray-700 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium 
                                ${status === 'completed' ? 'bg-green-100 text-green-700' : 
                                status === 'inprogress' ? 'bg-yellow-100 text-yellow-700' : 
                                'bg-red-100 text-red-700'}`}>
                                {status.toUpperCase()}
                            </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700 text-center">
                            <button
                                className={`px-2 py-1 rounded text-xs font-semibold mx-auto w-20 text-center transition-all ${
                                    status === "initiate" 
                                        ? "bg-red-500 text-white hover:bg-red-600" 
                                        : status === "inprogress" 
                                            ? `bg-yellow-500 text-white ${isLocked ? "cursor-not-allowed opacity-50" : "hover:bg-yellow-600"}`
                                            : status === "pending"?
                                            `bg-yellow-500 text-white ${isLocked ? "cursor-not-allowed opacity-50" : "hover:bg-yellow-600"}`
                                            : "bg-green-500 text-white cursor-not-allowed opacity-70"
                                }`}
                                onClick={() => handleStatusChange(appointment)}
                                disabled={isCompleted || isLocked}
                                title={isLocked ? `Locked by Dr. ${owner}` : ""}
                            >
                                {status === "initiate" ? "Initiate" :
                                status === "inprogress" ? "View" :
                                status === "pending" ? "View" :
                                "Completed"}
                            </button>
                        </td>
                        </tr>
                    );
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

export default CurrentFootfalls;