import React from 'react';
import Sidebar from "./Sidebar";
import { motion } from "framer-motion";
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from "react";
import * as XLSX from 'xlsx';

// Define the initial empty state for the form outside the component
// This helps in resetting and initializing.
const initialMockDrillFormState = {
    date: '',
    time: '',
    department: '',
    location: '',
    scenario: '',
    ambulance_timing: '',
    departure_from_OHC: '',
    return_to_OHC: '',
    emp_no: '',
    aadhar: '',
    victim_department: '',
    victim_name: '',
    nature_of_job: '',
    age: '',
    mobile_no: '',
    gender: '',
    vitals: '',
    complaints: '',
    treatment: '',
    referal: '',
    ambulance_driver: '',
    staff_name: '',
    OHC_doctor: '',
    staff_nurse: '',
    Responsible: '',        // Keep these as per your current form state
    Action_Completion: '',  // Keep these as per your current form state
};


const MockDrills = () => {
    const accessLevel = localStorage.getItem('accessLevel');
    const navigate = useNavigate();

    const [showForm, setShowForm] = useState(false); // Will be true by default due to handleAddMockDrills in useEffect
    const [viewButtonSelected, setViewButtonSelected] = useState(false);
    const [addButtonSelected, setAddButtonSelected] = useState(true); // True by default
    const [formDatas, setformDatas] = useState(initialMockDrillFormState); // Initialize with empty state
    const [mockDrillData, setMockDrillData] = useState([]);
    const [selectedDrill, setSelectedDrill] = useState(null);
    const [detailedView, setDetailedView] = useState(false);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    // This useEffect will call handleAddMockDrills on component mount
    useEffect(() => {
        handleAddMockDrills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty dependency array means it runs once on mount

   const handleViewMockDrills = async () => {
    try {
        const url = 'http://localhost:8000/get-mockdrills/';

        const bodyData = {
            from_date: fromDate || "",
            to_date: toDate || ""
        };

        console.log("Sending body:", bodyData);

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(bodyData),
        });

        console.log("response value", response);

        if (response.ok) {
            const data = await response.json();
            setMockDrillData(data);
            setShowForm(false);
            setViewButtonSelected(true);
            setAddButtonSelected(false);
            setDetailedView(true);
        } else {
            console.error("Failed to fetch mock drills:", response.status);
            const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
            alert(`Failed to fetch data: ${errorData.detail || response.statusText}`);
        }
    } catch (error) {
        console.error("Error fetching mock drills:", error);
        alert("Error fetching data. Check console for details.");
    }
};


    const handleAddMockDrills = async () => {
        setShowForm(true);
        setViewButtonSelected(false);
        setAddButtonSelected(true);
        setMockDrillData([]);
        setSelectedDrill(null);
        setDetailedView(false);
        setFromDate('');
        setToDate('');

        // Fetch the latest mock drill data to autofill the form
        try {
            // const response = await fetch("http://localhost:8000/get-one-mockdrills");
            if (response.ok) {
                const latestData = await response.json();
                console.log("Latest mock drill data fetched for autofill:", latestData);
                if (latestData && Object.keys(latestData).length > 0) {
                    // Populate formDatas with latestData
                    // Map backend keys (lowercase) to frontend state keys (mixed case for some)
                    setformDatas({
                        date: latestData.date || '',
                        time: latestData.time || '',
                        department: latestData.department || '',
                        location: latestData.location || '',
                        scenario: latestData.scenario || '',
                        ambulance_timing: latestData.ambulance_timing || '',
                        departure_from_OHC: latestData.departure_from_OHC || '',
                        return_to_OHC: latestData.return_to_OHC || '',
                        emp_no: latestData.emp_no || '',
                        aadhar: latestData.aadhar || '',
                        victim_department: latestData.victim_department || '',
                        victim_name: latestData.victim_name || '',
                        nature_of_job: latestData.nature_of_job || '',
                        age: latestData.age ? String(latestData.age) : '', // Ensure age is a string for input
                        mobile_no: latestData.mobile_no || '',
                        gender: latestData.gender || '',
                        vitals: latestData.vitals || '',
                        complaints: latestData.complaints || '',
                        treatment: latestData.treatment || '',
                        referal: latestData.referal || '',
                        ambulance_driver: latestData.ambulance_driver || '',
                        staff_name: latestData.staff_name || '',
                        OHC_doctor: latestData.OHC_doctor || '',
                        staff_nurse: latestData.staff_nurse || '',
                        // Backend model_to_dict returns lowercase 'responsible' and 'action_completion'
                        Responsible: latestData.responsible || '', 
                        Action_Completion: latestData.action_completion || '',
                    });
                } else {
                    // No latest data found, reset to initial empty state
                    setformDatas(initialMockDrillFormState);
                }
            } else {
                console.error("Failed to fetch latest mock drill data:", response.status);
                // Optionally alert the user or just reset to empty form
                setformDatas(initialMockDrillFormState);
            }
        } catch (error) {
            console.error("Error fetching latest mock drill data:", error);
            // In case of error, reset to empty form
            setformDatas(initialMockDrillFormState);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setformDatas(prevFormData => ({
            ...prevFormData,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formDatas.date || !formDatas.time || !formDatas.department || !formDatas.location || !formDatas.scenario) {
            alert("Please fill in all required general mock drill fields (Date, Time, Department, Location, Scenario).");
            return;
        }
        if (formDatas.aadhar && !/^\d{12}$/.test(formDatas.aadhar)) {
            alert("Aadhar number must be 12 digits if provided.");
            return;
        }

        const response = await fetch("http://localhost:8000/save-mockdrills/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(formDatas),
        });

        if (response.ok) {
            alert("Mock Drill data saved successfully");
            // After saving, call handleAddMockDrills again to reset and potentially prefill with the newly saved data (or the latest)
            handleAddMockDrills(); 
        } else {
            const errorData = await response.json().catch(() => ({ error: "Unknown error saving data" }));
            alert(`Error saving data: ${errorData.error || errorData.detail || "Please try again."}`);
            console.error("Error saving data:", errorData);
        }
    };

    const buttonStyle = {
        backgroundColor: addButtonSelected ? 'blue' : 'green',
        color: 'white',
        padding: '10px 20px',
        borderRadius: '5px',
        cursor: 'pointer',
        border: 'none',
        fontSize: '16px',
    };

    const buttonStyleView = {
        backgroundColor: viewButtonSelected ? 'blue' : 'green',
        color: 'white',
        padding: '10px 20px',
        borderRadius: '5px',
        cursor: 'pointer',
        border: 'none',
        fontSize: '16px',
    };

    const handleViewMore = (drill) => {
        setSelectedDrill(drill);
    };

    const handleCloseDetails = () => {
        setSelectedDrill(null);
    };

    const generateExcel = () => {
        if (mockDrillData.length === 0) {
            alert("No data to export!");
            return;
        }
        const worksheet = XLSX.utils.json_to_sheet(mockDrillData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "MockDrills");
        XLSX.writeFile(workbook, "MockDrills.xlsx");
    };

    // ... (rest of your component JSX remains the same)
    // Ensure all input fields use `value={formDatas.fieldName}` and `name="fieldName"` correctly.
    // For example:
    // <textarea
    //      name="Responsible"
    //      value={formDatas.Responsible}
    //      onChange={handleChange} ... />
    // <textarea
    //      name="Action_Completion"
    //      value={formDatas.Action_Completion}
    //      onChange={handleChange} ... />

    if (accessLevel === "nurse" || accessLevel === "doctor") {
        return (
            <div className="h-screen w-full flex bg-gradient-to-br from-blue-300 to-blue-400">
                <Sidebar />
                <div className="w-4/5 h-screen overflow-auto p-8">

                    {/* Buttons moved to the top right corner */}
                    <div className="flex justify-end space-x-4 mb-4">
                        <button
                            style={buttonStyleView}
                            onClick={handleViewMockDrills}
                        >
                            View Mock Drills
                        </button>
                        <button
                            style={buttonStyle}
                            onClick={handleAddMockDrills} // This will now also attempt to autofill
                        >
                            Add Mock Drill
                        </button>
                    </div>

                    {detailedView && (
                        <div className="mb-4 flex space-x-4 items-end"> {/* items-end to align button with inputs */}
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">From Date</label>
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">To Date</label>
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                />
                            </div>
                            <div>
                                <button
                                    onClick={handleViewMockDrills}
                                    className="bg-blue-700 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" // Removed mt-6
                                >
                                    Apply Filter
                                </button>
                            </div>
                            <div>
                                <button
                                    onClick={generateExcel}
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" // Removed mt-6, changed color
                                >
                                    Export to Excel
                                </button>
                            </div>
                        </div>

                    )}

                    {showForm && (
                        <>
                            <h2 className="text-4xl font-bold mt-8 ml-8 mb-4">Mock Drill</h2>
                            <motion.div
                                className="bg-white p-8 rounded-lg shadow-lg"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                            >
                                <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[70vh]">
                                    {/* General Mock Drill Info */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                                        <div>
                                            <label className="block text-gray-700 text-sm font-bold mb-2">Date <span className="text-red-500">*</span></label>
                                            <input
                                                type="date"
                                                name="date"
                                                value={formDatas.date}
                                                onChange={handleChange}
                                                className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 text-sm font-bold mb-2">Time <span className="text-red-500">*</span></label>
                                            <input
                                                type="time"
                                                name="time"
                                                value={formDatas.time}
                                                onChange={handleChange}
                                                className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                                        <div>
                                            <label className="block text-gray-700 text-sm font-bold mb-2">Department <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                name="department"
                                                value={formDatas.department}
                                                onChange={handleChange}
                                                className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 text-sm font-bold mb-2">Location <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                name="location"
                                                value={formDatas.location}
                                                onChange={handleChange}
                                                className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 text-sm font-bold mb-2">Scenario <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                name="scenario"
                                                value={formDatas.scenario}
                                                onChange={handleChange}
                                                className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Ambulance Timing */}
                                    <h2 className="text-2xl font-semibold mb-6 text-gray-700">Ambulance Timing</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4"> {/* Adjusted to 3 columns for better fit */}
                                        <div>
                                            <label className="block text-gray-700 text-sm font-bold mb-2">Departure from OHC</label>
                                            <input
                                                type="time"
                                                name="departure_from_OHC"
                                                value={formDatas.departure_from_OHC}
                                                onChange={handleChange}
                                                className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 text-sm font-bold mb-2">Return to OHC</label>
                                            <input
                                                type="time"
                                                name="return_to_OHC"
                                                value={formDatas.return_to_OHC}
                                                onChange={handleChange}
                                                className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 text-sm font-bold mb-2">Ambulance time</label>
                                            <input
                                                type="time"
                                                name="ambulance_timing"
                                                value={formDatas.ambulance_timing}
                                                onChange={handleChange}
                                                className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Victim Details */}
                                    <h2 className="text-2xl font-semibold mb-6 text-gray-700">Victim Details</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
                                        <div>
                                            <label className="block text-gray-700 text-sm font-bold mb-2">Emp ID</label>
                                            <input
                                                type="text"
                                                name="emp_no"
                                                value={formDatas.emp_no}
                                                onChange={handleChange}
                                                className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 text-sm font-bold mb-2">Aadhar Number</label>
                                            <input
                                                type="text"
                                                name="aadhar"
                                                value={formDatas.aadhar}
                                                onChange={handleChange}
                                                className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                maxLength="12"
                                                pattern="\d{12}"
                                                title="Aadhar number should be 12 digits (if provided)."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 text-sm font-bold mb-2">Victim Name</label>
                                            <input
                                                type="text"
                                                name="victim_name"
                                                value={formDatas.victim_name}
                                                onChange={handleChange}
                                                className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 text-sm font-bold mb-2">Age</label>
                                            <input
                                                type="number"
                                                name="age"
                                                value={formDatas.age}
                                                onChange={handleChange}
                                                className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
    <label className="block text-gray-700 text-sm font-bold mb-2">Gender</label>
    <select
        name="gender"
        value={formDatas.gender}
        onChange={handleChange}
        className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
        <option value="">-- Select Gender --</option>
        <option value="Male">Male</option>
        <option value="Female">Female</option>
    </select>
</div>

                                        <div>
                                            <label className="block text-gray-700 text-sm font-bold mb-2">Victim Department</label>
                                            <input
                                                type="text"
                                                name="victim_department"
                                                value={formDatas.victim_department}
                                                onChange={handleChange}
                                                className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 text-sm font-bold mb-2">Nature of Job</label>
                                            <input
                                                type="text"
                                                name="nature_of_job"
                                                value={formDatas.nature_of_job}
                                                onChange={handleChange}
                                                className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 text-sm font-bold mb-2">Mobile No</label>
                                            <input
                                                type="text" 
                                                name="mobile_no"
                                                value={formDatas.mobile_no}
                                                onChange={handleChange}
                                                className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                pattern="[0-9]{10}" 
                                                title="Mobile number should be 10 digits (if provided)."
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <label className="block text-gray-700 text-sm font-bold mb-2">Complaints</label>
                                        <textarea
                                            name="complaints"
                                            value={formDatas.complaints}
                                            onChange={handleChange}
                                            placeholder="Complaints"
                                            className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            rows="3"
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-gray-700 text-sm font-bold mb-2">Treatment</label>
                                        <textarea
                                            name="treatment"
                                            value={formDatas.treatment}
                                            onChange={handleChange}
                                            placeholder="Treatment"
                                            className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            rows="3"
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-gray-700 text-sm font-bold mb-2">Referral</label>
                                        <textarea
                                            name="referal"
                                            value={formDatas.referal}
                                            onChange={handleChange}
                                            placeholder="Referral"
                                            className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            rows="3"
                                        />
                                    </div>

                                    <h3 className="text-2xl font-semibold mb-6 text-gray-700">Ambulance Personnel</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                                        <div>
                                            <label className="block text-gray-700 text-sm font-bold mb-2">Ambulance Driver</label>
                                            <input
                                                type="text"
                                                name="ambulance_driver"
                                                value={formDatas.ambulance_driver}
                                                onChange={handleChange}
                                                placeholder="Ambulance Driver"
                                                className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 text-sm font-bold mb-2">Staff Name (Ambulance)</label>
                                            <input
                                                type="text"
                                                name="staff_name"
                                                value={formDatas.staff_name}
                                                onChange={handleChange}
                                                placeholder="Staff Name"
                                                className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>

                                    <h4 className="text-2xl font-semibold mb-6 text-gray-700">OHC Personnel</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                                        <div>
                                            <label className="block text-gray-700 text-sm font-bold mb-2">OHC Doctor</label>
                                            <input
                                                type="text"
                                                name="OHC_doctor"
                                                value={formDatas.OHC_doctor}
                                                onChange={handleChange}
                                                placeholder="OHC Doctor"
                                                className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 text-sm font-bold mb-2">Staff Nurse</label>
                                            <input
                                                type="text"
                                                name="staff_nurse"
                                                value={formDatas.staff_nurse}
                                                onChange={handleChange}
                                                placeholder="Staff Nurse"
                                                className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                    <h4 className="text-2xl font-semibold mb-6 text-gray-700">OHC Observation/Action/Follow up</h4>
                                    <div className="mb-4">
                                        <label className="block text-gray-700 text-sm font-bold mb-2">Vitals</label>
                                        <textarea
                                            name="vitals"
                                            value={formDatas.vitals}
                                            onChange={handleChange}
                                            placeholder="Vitals"
                                            className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            rows="3"
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-gray-700 text-sm font-bold mb-2">Action / Completion</label>
                                        <textarea
                                            name="Action_Completion" 
                                            value={formDatas.Action_Completion}
                                            onChange={handleChange}
                                            placeholder="Action / Completion"
                                            className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            rows="3"
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-gray-700 text-sm font-bold mb-2">Responsible</label>
                                        <textarea
                                            name="Responsible" 
                                            value={formDatas.Responsible}
                                            onChange={handleChange}
                                            placeholder="Responsible"
                                            className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            rows="3"
                                        />
                                    </div>

                                    <div className="text-right mt-6">
                                        <button
                                            type="submit"
                                            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 focus:outline-none focus:ring focus:ring-blue-300 transition-colors duration-200"
                                        >
                                            Submit
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </>
                    )}
                    {detailedView && mockDrillData.length > 0 && ( 
                        <motion.div
                            className="bg-white p-8 rounded-lg shadow-lg overflow-x-auto"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <div>
                                <h2 className="text-2xl font-bold mb-4">Mock Drill Records</h2>
                                <div className="overflow-x-auto"> 
                                    <table className="min-w-full table-auto border-collapse"> 
                                        <thead className="bg-gray-200">
                                            <tr>
                                                {Object.keys(mockDrillData[0]).map(key => (
                                                    <th key={key} className="px-4 py-2 border border-gray-300 text-left text-sm font-semibold text-gray-700">{key.replace(/_/g, ' ').toUpperCase()}</th>
                                                ))}
                                                <th className="px-4 py-2 border border-gray-300 text-left text-sm font-semibold text-gray-700">ACTIONS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {mockDrillData.map((drill) => (
                                                <tr key={drill.id} className="border-b border-gray-200 hover:bg-gray-50">
                                                    {Object.values(drill).map((value, index) => (
                                                        <td key={index} className="px-4 py-2 border border-gray-300 text-sm text-gray-600 whitespace-nowrap">{value != null ? String(value) : ''}</td>
                                                    ))}
                                                    <td className="px-4 py-2 border border-gray-300 text-sm">
                                                        <button
                                                            onClick={() => handleViewMore(drill)}
                                                            className="text-blue-600 hover:text-blue-800 font-medium"
                                                        >
                                                            View Details
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </motion.div>
                    )}
                     {detailedView && mockDrillData.length === 0 && !showForm && ( 
                        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
                            <p className="text-gray-600 text-lg">No mock drill records found for the selected criteria.</p>
                        </div>
                    )}


                    {selectedDrill && (
                        <motion.div
                            className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center p-4 overflow-auto" 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="bg-white rounded-lg shadow-xl overflow-hidden max-w-3xl w-full"> 
                                <div className="p-6 overflow-y-auto max-h-[90vh]"> 
                                    <div className="flex justify-between items-center mb-4">
                                      <h2 className="text-2xl font-bold text-gray-800">Mock Drill Details</h2>
                                      <button
                                            onClick={handleCloseDetails}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4"> 
                                        {[
                                            { label: "Date", value: selectedDrill.date },
                                            { label: "Time", value: selectedDrill.time },
                                            { label: "Department", value: selectedDrill.department },
                                            { label: "Location", value: selectedDrill.location },
                                            { label: "Scenario", value: selectedDrill.scenario },
                                            { label: "Ambulance Timing", value: selectedDrill.ambulance_timing },
                                            { label: "Departure from OHC", value: selectedDrill.departure_from_OHC },
                                            { label: "Return to OHC", value: selectedDrill.return_to_OHC },
                                            { label: "Emp No", value: selectedDrill.emp_no },
                                            { label: "Aadhar Number", value: selectedDrill.aadhar }, 
                                            { label: "Victim Name", value: selectedDrill.victim_name },
                                            { label: "Age", value: selectedDrill.age },
                                            { label: "Gender", value: selectedDrill.gender },
                                            { label: "Victim Department", value: selectedDrill.victim_department },
                                            { label: "Nature of Job", value: selectedDrill.nature_of_job },
                                            { label: "Mobile No", value: selectedDrill.mobile_no },
                                            { label: "Vitals", value: selectedDrill.vitals, fullWidth: true }, 
                                            { label: "Complaints", value: selectedDrill.complaints, fullWidth: true },
                                            { label: "Treatment", value: selectedDrill.treatment, fullWidth: true },
                                            { label: "Referral", value: selectedDrill.referal, fullWidth: true }, 
                                            { label: "Ambulance Driver", value: selectedDrill.ambulance_driver },
                                            { label: "Staff Name (Ambulance)", value: selectedDrill.staff_name },
                                            { label: "OHC Doctor", value: selectedDrill.OHC_doctor },
                                            { label: "Staff Nurse", value: selectedDrill.staff_nurse },
                                            // Ensure these keys match what's in selectedDrill
                                            // If get-mockdrills returns 'responsible' (lowercase), then use that.
                                            { label: "Responsible", value: selectedDrill.Responsible || selectedDrill.responsible, fullWidth: true }, 
                                            { label: "Action Completion", value: selectedDrill.Action_Completion || selectedDrill.action_completion, fullWidth: true } 
                                        ].map(item => (
                                            <div key={item.label} className={item.fullWidth ? "md:col-span-2" : ""}>
                                                <strong className="block font-semibold text-gray-700 mb-1">{item.label}:</strong>
                                                <div className="text-gray-800 break-words whitespace-pre-wrap bg-gray-50 p-2 rounded"> 
                                                    {item.value !== null && item.value !== undefined ? String(item.value) : <span className="text-gray-400">N/A</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-6 flex justify-end">
                                        <button
                                            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                                            onClick={handleCloseDetails}
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>
        );
    } else {
         return (
            <section className="bg-white h-full flex items-center dark:bg-gray-900">
                <div className="py-8 px-4 mx-auto max-w-screen-xl lg:py-16 lg:px-6">
                    <div className="mx-auto max-w-screen-sm text-center">
                        <h1 className="mb-4 text-7xl tracking-tight font-extrabold lg:text-9xl text-primary-600 dark:text-primary-500">403</h1>
                        <p className="mb-4 text-3xl tracking-tight font-bold text-gray-900 md:text-4xl dark:text-white">Access Denied.</p>
                        <p className="mb-4 text-lg font-light text-gray-500 dark:text-gray-400">Sorry, you do not have permission to access this page. </p>
                        <button onClick={() => navigate(-1)} className="inline-flex text-white bg-blue-600 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:focus:ring-blue-900 my-4">Go Back</button>
                    </div>
                </div>
            </section>
        );
    }
};

export default MockDrills;