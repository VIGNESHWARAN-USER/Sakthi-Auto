import React, { useState } from 'react'; 
import { FaSearch, FaUserCircle } from 'react-icons/fa';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../Sidebar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';  
import { FaIdCard, FaVenusMars, FaBirthdayCake, FaUserTag, FaArrowRight, FaFingerprint } from 'react-icons/fa';

const Search = () => {
  const accessLevel = localStorage.getItem('accessLevel');
  const navigate = useNavigate();

  // Check access level early
  if (accessLevel !== "nurse" && accessLevel !== "doctor" && accessLevel !== "hr") {
    return (
      <section className="bg-white h-full flex items-center dark:bg-gray-900">
        <div className="py-8 px-4 mx-auto max-w-screen-xl lg:py-16 lg:px-6">
          <div className="mx-auto max-w-screen-sm text-center">
            <h1 className="mb-4 text-7xl tracking-tight font-extrabold lg:text-9xl text-primary-600 dark:text-primary-500">403</h1>
            <p className="mb-4 text-3xl tracking-tight font-bold text-gray-900 md:text-4xl dark:text-white">Access Denied.</p>
            <p className="mb-4 text-lg font-light text-gray-500 dark:text-gray-400">Sorry, you don't have permission to access this page.</p>
            <button onClick={() => navigate(-1)} className="inline-flex text-white bg-blue-600 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:focus:ring-blue-900 my-4">Go Back</button>
          </div>
        </div>
      </section>
    );
  }

  // State declarations
  const [employees, setEmployees] = useState([]); // Stores the search results
  const [searchId, setSearchId] = useState(""); 
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false); // To track if a search has been performed

  // Updated Search Function: Calls API with Aadhar parameter
  const handleSearch = async () => {
    // Validate length before calling API
    if (searchId.length !== 12) {
      alert("Please enter a valid 12-digit Aadhar number.");
      return;
    }

    setLoading(true);
    setHasSearched(true); // Mark that we have attempted a search
    setEmployees([]); // Clear previous results while loading

    try {
      // Sending Aadhar as a parameter in the body
      // Ensure your backend expects: req.body.aadhar
      const response = await axios.post("http://localhost:8000/userDataWithID", {
        aadhar: searchId
      });

      // Assuming backend returns { data: [ ...results ] }
      // If your backend returns the array directly, remove .data
      setEmployees(response.data.data || []); 
      
      console.log("Search Results:", response.data.data);

    } catch (error) {
      console.error("Error fetching data:", error);
      alert("Failed to fetch details. Please check the connection.");
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  // Allow searching by pressing "Enter" key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && searchId.length === 12) {
      handleSearch();
    }
  };

  // Calculate age safely
  const calculateAge = (dob) => {
    if (!dob) return '-';
    try {
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age >= 0 ? age : '-';
    } catch (e) {
      console.error("Error calculating age:", e);
      return '-';
    }
  };

  return (
    <div className="h-screen w-full flex bg-gradient-to-br from-blue-300 to-blue-400">
      <Sidebar />
      <div className="p-8 w-4/5 overflow-y-auto">
        <h1 className="text-4xl font-bold mb-8 text-gray-800">Search Person</h1>

        <div className="bg-white shadow-xl rounded-xl p-8 transition-all duration-300 hover:shadow-2xl">
          {/* Search Bar */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative flex-grow">
              <FaSearch className="absolute top-1/2 transform -translate-y-1/2 left-4 text-gray-600" />
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value.replace(/\D/g, ''))} // Allow only digits
                onKeyDown={handleKeyDown} // Listen for Enter key
                maxLength={12}
                placeholder="Search by Aadhar Number (12 digits)"
                className="w-full bg-gray-100 py-3 pl-12 pr-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading || searchId.length !== 12} // Disable if invalid length
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Search
            </button>
          </div>

          
          <div className="mt-8 w-full">
  {loading ? (
    // --- LOADING STATE ---
    <div className="flex flex-col items-center justify-center py-20 bg-white/50 rounded-xl border border-dashed border-gray-300">
      <FontAwesomeIcon icon={faSpinner} spin className="text-5xl text-blue-500 mb-4" />
      <p className="text-gray-600 font-semibold text-lg animate-pulse">Searching Database...</p>
    </div>
  ) : (
    employees.length > 0 ? (
      // --- RESULTS LIST (CARDS) ---
      <div className="grid gap-6">
        {employees.map((emp) => (
          <div 
            key={emp.id || emp.aadhar} 
            className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden flex flex-col md:flex-row"
          >
            {/* Left Side: Color Accent & Profile Pic */}
            <div className="w-full md:w-64 bg-slate-50 flex flex-col items-center justify-center p-6 border-r border-gray-100 relative">
              <div className="relative">
                {emp.profilepic_url ? (
                  <img 
                    src={emp.profilepic_url} 
                    alt="Profile" 
                    className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
                  />
                ) : (
                  <FaUserCircle className="w-24 h-24 text-gray-300 bg-white rounded-full" />
                )}
                {(emp.consultation?.special_cases === "Yes" || emp.fitnessassessment?.special_cases === "Yes") && (<span className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-white bg-red-500 `}></span>)}
              </div>
              <h3 className="mt-3 text-lg font-bold text-gray-800 text-center">{emp.name || 'Unknown'}</h3>
              <span className="text-xs font-semibold px-3 py-1 bg-blue-100 text-blue-700 rounded-full mt-1 uppercase tracking-wide">
                {emp.status || 'Unknown'}
              </span>
            </div>

            {/* Middle: Details Grid */}
            <div className="flex-1 p-6 grid grid-cols-2 md:grid-cols-4 gap-6 items-center">
              
              <div className="flex flex-col">
                <div className="flex items-center gap-2 text-gray-400 mb-1 text-xs font-bold uppercase tracking-wider">
                  <FaFingerprint /> Aadhar
                </div>
                <div className="font-mono text-gray-700 font-medium">{emp.aadhar || '-'}</div>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2 text-gray-400 mb-1 text-xs font-bold uppercase tracking-wider">
                  <FaIdCard /> Worker ID
                </div>
                <div className="text-gray-700 font-medium">{emp.emp_no || '-'}</div>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2 text-gray-400 mb-1 text-xs font-bold uppercase tracking-wider">
                  <FaBirthdayCake /> Age
                </div>
                <div className="text-gray-700 font-medium">{calculateAge(emp.dob)} Years</div>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2 text-gray-400 mb-1 text-xs font-bold uppercase tracking-wider">
                  <FaVenusMars /> Gender
                </div>
                <div className="text-gray-700 font-medium">{emp.sex || '-'}</div>
              </div>

            </div>

            {/* Right Side: Action Button */}
            <div className="p-6 flex items-center justify-center md:border-l border-gray-100 bg-gray-50/50">
              <button
                onClick={() => navigate("../employeeprofile", { state: { data: emp } })}
                className="group flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-blue-500/30 w-full md:w-auto font-medium"
              >
                View Profile
                <FaArrowRight className="group-hover:translate-x-1 transition-transform text-sm" />
              </button>
            </div>
          </div>
        ))}
      </div>
    ) : (
      // --- NO RESULTS STATE ---
      <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl shadow-sm border border-gray-100 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
          <FaUserTag className="text-3xl" />
        </div>
        <h3 className="text-xl font-bold text-gray-700">
          {hasSearched ? "No Person Found" : "Ready to Search"}
        </h3>
        <p className="text-gray-500 mt-2 max-w-sm">
          {hasSearched 
            ? "We couldn't find anyone matching that Aadhar number. Please check the digits and try again." 
            : "Enter a 12-digit Aadhar number above to fetch and view user details."}
        </p>
      </div>
    )
  )}
</div>
        </div>
      </div>
    </div>
  );
};

export default Search;