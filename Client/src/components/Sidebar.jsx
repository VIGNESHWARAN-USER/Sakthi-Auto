import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  FaUserMd,
  FaUsers,
  FaRegCalendarAlt,
  FaSignOutAlt,
  FaPills,
  FaBars,
  FaTimes,
  FaAmbulance,
  FaUpload,
} from "react-icons/fa";
import {
  MdDashboard,
  MdEvent,
  MdFilterList,
  MdLibraryAdd,
  MdInventory,
  MdWarning,
  MdDelete,
  MdReceipt,
} from "react-icons/md";
import axios from "axios";
import img from "../assets/logo.png"; // Make sure this path is correct

// --- CHANGE 1: Accept the 'redCount' prop ---
const Sidebar = ({ redCount }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const userName = localStorage.getItem("userData") || "Unknown User";
  const accessLevel = localStorage.getItem("accessLevel") || "unknown";
  const [pendingCount, setPendingCount] = useState(null);
  const [expiryCount, setExpiryCount] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  // Close sidebar when navigating on mobile
  useEffect(() => {
    if (isOpen) {
      setIsOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  // --- CHANGE 2: Update the logic to use the prop or fetch from API ---
  useEffect(() => {
    // If redCount is passed as a prop (it will be a number, including 0), use it directly.
    // This will happen when the user is on the InstrumentCalibration page.
    if (typeof redCount === 'number') {
      setPendingCount(redCount);
    } else {
      // Otherwise (on any other page), fall back to the original fetch logic.
      if (accessLevel === 'nurse' || accessLevel === 'doctor') {
        fetchPendingCount();
      } else {
        setPendingCount(0); // Set to 0 if not applicable for this user role
      }
    }
    
    // Fetch expiry count separately, as this logic is independent.
    if (accessLevel === 'pharmacy') {
       fetchExpiryCount();
    }
  // This effect will re-run if the user navigates, the role changes, or the redCount prop updates.
  }, [redCount, accessLevel, location.pathname]);


  // This function now serves as the fallback for pages other than InstrumentCalibration.
  const fetchPendingCount = async () => {
    try {
      const response = await axios.get("http://localhost:8000/get_red_status_count/");
      setPendingCount(response.data.red_count);
    } catch (error) {
      console.error("Error fetching red count:", error);
      setPendingCount(0); // Default to 0 on error
    }
  };

  const fetchExpiryCount = async () => {
     if (accessLevel === 'pharmacy') {
        try {
            const response = await axios.get(
                "http://localhost:8000/get_current_expiry_count/"
            );
            setExpiryCount(response.data.count);
        } catch (error) {
            console.error("Error fetching expiry count:", error);
            setExpiryCount(0); // Default to 0 on error
        }
     } else {
         setExpiryCount(0); // Not applicable
     }
  };
  
  const menus = {
    nurse: [
      { name: "Dashboard", to: "../dashboard", icon: <MdDashboard /> },
      { name: "Worker Profile", to: "../searchemployee", icon: <FaUsers /> },
      { name: "New Visit", to: "../newvisit", icon: <FaUserMd /> },
      { name: "Events & Camps", to: "../eventsandcamps", icon: <MdEvent /> },
      { name: "Records & Filters", to: "../recordsfilters", icon: <MdFilterList /> },
      { name: "Mock Drills", to: "../mockdrills", icon: <MdLibraryAdd /> },
      { name: "Appointments & Reviews", to: "../appointments", icon: <FaRegCalendarAlt /> },
      { name: "Data Upload", to: "../dataupload", icon: <FaUpload /> },
      { name: "Instrument Calibration", to: "../instrumentcalibration", icon: <FaRegCalendarAlt />, badgeName: 'pending' },
    ],
    camp_nurse: [
      { name: "Dashboard", to: "../dashboard", icon: <MdDashboard /> },
      { name: "Worker Profile", to: "../searchemployee", icon: <FaUsers /> },
      { name: "New Visit", to: "../newvisit", icon: <FaUserMd /> },
      { name: "Appointments & Reviews", to: "../appointments", icon: <FaRegCalendarAlt /> },
    ],
    doctor: [
     { name: "Dashboard", to: "../dashboard", icon: <MdDashboard /> },
      { name: "Worker Profile", to: "../searchemployee", icon: <FaUsers /> },
      { name: "New Visit", to: "../newvisit", icon: <FaUserMd /> },
      { name: "Events & Camps", to: "../eventsandcamps", icon: <MdEvent /> },
      { name: "Records & Filters", to: "../recordsfilters", icon: <MdFilterList /> },
      { name: "Mock Drills", to: "../mockdrills", icon: <MdLibraryAdd /> },
      { name: "Appointments & Reviews", to: "../appointments", icon: <FaRegCalendarAlt /> },
      { name: "Instrument Calibration", to: "../instrumentcalibration", icon: <FaRegCalendarAlt />, badgeName: 'pending' },
      ],
    admin: [
      { name: "Admin Dashboard", to: "../admindashboard", icon: <FaUsers /> },
      { name: "Add Members", to: "../addmember", icon: <FaUsers /> },
    ],
    pharmacy: [
      { name: "View / Issue Prescription", to: "../viewprescription", icon: <FaPills /> },
      { name: "Add Stock", to: "../addstock", icon: <MdInventory /> },
      { name: "Current Stock", to: "../currentstock", icon: <MdDashboard /> },
      { name: "Daily Usage", to: "../prescriptionin", icon: <MdReceipt /> },
      { name: "Current Expiry", to: "../currentexpiry", icon: <MdWarning />, badgeName: 'expiry' },
      { name: "Expiry Register", to: "../expiryregister", icon: <MdWarning /> },
      { name: "Discard/Damaged", to: "../discarddamaged", icon: <MdDelete /> },
      { name: "Ward Consumable", to: "../wardconsumable", icon: <MdInventory /> },
      { name: "Ambulance Consumable", to: "../ambulanceconsumable", icon: <FaAmbulance /> },
    ],
    hr: [
      { name: "Worker Profile", to: "../searchemployee", icon: <FaUsers /> }
      ],
  };

  const currentMenu = menus[accessLevel] || [];

  // --- NO CHANGES NEEDED HERE ---
  // This function already reads from the `pendingCount` state, which we are now correctly updating.
  const renderBadge = (badgeName) => {
    let count = null;
    let isLoading = false;

    if (badgeName === "pending") {
      count = pendingCount;
      isLoading = pendingCount === null;
    } else if (badgeName === "expiry") {
      count = expiryCount;
      isLoading = expiryCount === null;
    } else {
      return null; // No badge for this item
    }

    return (
      <>
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-auto"></div>
        ) : count > 0 ? (
          <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-tight ml-auto">
            {count}
          </span>
        ) : (
           <span className="bg-green-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-tight ml-auto">
            0
          </span>
        )}
      </>
    );
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-blue-600 text-white rounded-md shadow-md"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Menu"
        aria-expanded={isOpen}
        aria-controls="sidebar"
      >
        {isOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
      </button>

      {/* Overlay for Mobile */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black opacity-50 z-30"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        ></div>
      )}

      {/* Sidebar */}
      <div
        id="sidebar"
        className={`
          fixed inset-y-0 left-0 z-40
          w-64 h-screen overflow-y-auto bg-gradient-to-b from-blue-600 to-blue-400
          text-white flex flex-col shadow-lg
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0 md:w-1/5 md:h-full md:flex md:shrink-0
          [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
          `}
      >
        {/* Logo */}
        <div className="p-6 flex justify-center flex-shrink-0 relative">
           <button
              className="md:hidden absolute top-2 right-2 p-2 text-white hover:text-gray-200"
              onClick={() => setIsOpen(false)}
              aria-label="Close Menu"
            >
              <FaTimes size={24} />
            </button>
          <img
            src={img}
            alt="Logo"
            className="w-auto max-w-[80%] h-auto shadow-2xl p-4 rounded-lg bg-white"
          />
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-4 py-2">
          {currentMenu.map((item, index) => {
             const absoluteBaseUrl = window.location.origin + location.pathname.substring(0, location.pathname.lastIndexOf('/'));
             const absoluteItemPath = new URL(item.to, absoluteBaseUrl + '/').pathname;
             const isActive = location.pathname === absoluteItemPath || (location.pathname.startsWith(absoluteItemPath + '/'));

            return (
              <Link
                key={index}
                to={item.to}
                className={`flex items-center justify-between p-3 mx-0 my-1 text-base rounded-lg font-medium transition duration-200 ease-in-out transform ${
                  isActive
                    ? "bg-white text-blue-600 scale-100 shadow-md font-semibold"
                    : "hover:bg-blue-500 hover:text-white hover:scale-105"
                }`}
              >
                {/* Icon and Text container */}
                <div className="flex items-center space-x-3">
                    <span className="flex-shrink-0 w-5 h-5">{item.icon}</span>
                    <span>{item.name}</span>
                </div>

                {/* Badge rendering */}
                 {item.badgeName && renderBadge(item.badgeName)}

              </Link>
            );
          })}
        </nav>

        
        <p className="flex justify-center font-bold tracking-wider text-lg px-4 py-2 text-center">
            {userName.toUpperCase()}
        </p>
        <p className="flex justify-center font-bold tracking-wider text-sm px-4 py-2 text-center">
            Login as: {accessLevel.toUpperCase()}
        </p>

        {/* Logout Button */}
        <div className="p-4 mt-auto flex-shrink-0">
          <button
            onClick={() => {
              localStorage.clear();
              navigate("../login");
            }}
            className="w-full flex items-center justify-center space-x-3 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition duration-200 ease-in-out"
          >
            <FaSignOutAlt />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;