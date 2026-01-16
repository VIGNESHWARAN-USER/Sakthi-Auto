import React, { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import Sidebar from "./Sidebar";

const InstrumentCalibration = () => {
  // --- STATE MANAGEMENT ---
  const [pendingCalibrations, setPendingCalibrations] = useState([]);
  const [calibrationHistory, setCalibrationHistory] = useState([]);
  const [uniqueInstruments, setUniqueInstruments] = useState([]);
  const [viewMode, setViewMode] = useState('current');
  const [showModal, setShowModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedInstrument, setSelectedInstrument] = useState(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // --- NEW: State to hold the current user's role ---
  const [userRole, setUserRole] = useState("");

  const [calibrationForm, setCalibrationForm] = useState(null);

  const [statusCounts, setStatusCounts] = useState({
    red_count: 0,
    yellow_count: 0,
    green_count: 0,
  });

  const frequencyOptions = [
    "Monthly", "Once in 2 Months", "Quarterly", "Half-Yearly", "Yearly", "Once in 2 Years",
  ];

  const initialInstrumentState = {
    instrument_number: "",
    equipment_sl_no: "",
    instrument_name: "",
    certificate_number: "",
    make: "",
    model_number: "",
    freq: "",
    calibration_date: "",
    next_due_date: "",
    calibration_status: "pending",
    inst_status: "inuse",
    done_by: "",
  };
  const [newInstrument, setNewInstrument] = useState(initialInstrumentState);

  // --- UTILITY FUNCTIONS ---
  const convertDisplayDateToYyyyMmDd = (displayDate) => {
    if (!displayDate) return "";

    // The new Date() constructor is smart enough to handle "dd-Mon-yyyy" format
    const date = new Date(displayDate);

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      // Try a more robust parsing if the direct one fails, just in case
      const parts = displayDate.split('-');
      if (parts.length === 3) {
        const robustDate = new Date(`${parts[1]} ${parts[0]}, ${parts[2]}`);
        if (!isNaN(robustDate.getTime())) return convertDisplayDateToYyyyMmDd(robustDate.toString());
      }
      return ""; // Return empty if still invalid
    }
    
    // Get the year, month, and day components *in the local timezone*
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // month is 0-indexed, add 1
    const day = String(date.getDate()).padStart(2, '0');

    // Manually construct the YYYY-MM-DD string without any timezone conversion
    return `${year}-${month}-${day}`;
  };

  const normalizeFrequency = (freq) => (freq || "").trim().toLowerCase();

  const calculateNextDueDate = (calibrationDate, freq) => {
    if (!calibrationDate || !freq) return "";
    const date = new Date(calibrationDate);
    if (isNaN(date.getTime())) return "";
    const normalizedFreq = normalizeFrequency(freq);
    switch (normalizedFreq) {
      case "monthly": date.setMonth(date.getMonth() + 1); break;
      case "once in 2 months": date.setMonth(date.getMonth() + 2); break;
      case "quarterly": date.setMonth(date.getMonth() + 3); break;
      case "half-yearly": date.setMonth(date.getMonth() + 6); break;
      case "yearly": date.setFullYear(date.getFullYear() + 1); break;
      case "once in 2 years": date.setFullYear(date.getFullYear() + 2); break;
      default: return "";
    }
    return date.toISOString().split("T")[0];
  };

  const getCalibrationStatusInfo = (nextDueDateStr, freq) => {
    if (!nextDueDateStr) return { color: "bg-gray-400", text: "Complete" };
    const dueDate = new Date(convertDisplayDateToYyyyMmDd(nextDueDateStr));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (isNaN(dueDate.getTime())) return { color: "bg-gray-400", text: "Complete" };
    if (dueDate < today) return { color: "bg-red-600", text: "Act" };
    const diffInMs = dueDate - today;
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
    const normalizedFreq = normalizeFrequency(freq);
    let totalDaysInPeriod = 365;
    if (normalizedFreq === "half-yearly") totalDaysInPeriod = 182;
    else if (normalizedFreq === "quarterly") totalDaysInPeriod = 91;
    else if (normalizedFreq === "once in 2 months") totalDaysInPeriod = 61;
    else if (normalizedFreq === "monthly") totalDaysInPeriod = 30;
    else if (normalizedFreq === "once in 2 years") totalDaysInPeriod = 730;
    const fractionRemaining = diffInDays / totalDaysInPeriod;
    if (fractionRemaining > 0.5) return { color: "bg-green-600", text: "Completed" };
    if (fractionRemaining > 0.25) return { color: "bg-yellow-500", text: "Be Ready" };
    return { color: "bg-red-600", text: "Act" };
  };
  
  // --- DATA FETCHING & SIDE EFFECTS ---
  useEffect(() => {
    fetchPendingCalibrations();
    // Get user role from localStorage
    const role = localStorage.getItem('accessLevel');
    if (role) {
      setUserRole(role);
    }
  }, []);

  useEffect(() => {
    const activeCalibrations = pendingCalibrations.filter(item => item.inst_status === 'inuse');
    const counts = activeCalibrations.reduce((acc, item) => {
      const { color } = getCalibrationStatusInfo(item.next_due_date, item.freq);
      if (color === "bg-red-600") acc.red_count++;
      else if (color === "bg-yellow-500") acc.yellow_count++;
      else if (color === "bg-green-600") acc.green_count++;
      return acc;
    }, { red_count: 0, yellow_count: 0, green_count: 0 });
    setStatusCounts(counts);
  }, [pendingCalibrations]);

  const fetchPendingCalibrations = async () => {
    try {
      const response = await axios.get("http://localhost:8000/get_calibrations/");
      setPendingCalibrations((response.data.pending_calibrations || []).sort((a, b) => a.id - b.id));
    } catch (error) { console.error("Error fetching pending calibrations:", error); alert("Error: Could not fetch pending calibrations."); }
  };
  const fetchCalibrationHistory = async () => {
    try {
      const params = {};
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      const response = await axios.get("http://localhost:8000/get_calibration_history/", { params });
      setCalibrationHistory((response.data.calibration_history || []).sort((a, b) => a.id - b.id));
      setViewMode('history');
    } catch (error) { console.error("Error fetching calibration history:", error); alert("Error: Could not fetch calibration history."); }
  };
  const fetchUniqueInstruments = async () => {
    try {
      const response = await axios.get("http://localhost:8000/get_unique_instruments/");
      setUniqueInstruments(response.data.unique_instruments || []);
      setViewMode('list');
    } catch (error) { console.error("Error fetching unique instruments:", error); alert("Error: Could not fetch unique instruments list."); }
  };

  // --- EVENT HANDLERS ---
  const handleDownloadExcel = () => {
    let dataToExport, worksheetName, fileName;
    if (viewMode === 'history') { [dataToExport, worksheetName, fileName] = [calibrationHistory, "Calibration History", "Calibration_History.xlsx"]; }
    else if (viewMode === 'list') { [dataToExport, worksheetName, fileName] = [uniqueInstruments, "Instrument List", "Instrument_List.xlsx"]; }
    else { [dataToExport, worksheetName, fileName] = [pendingCalibrations.filter(item => item.inst_status === 'inuse'), "Current Calibrations", "Current_Calibrations.xlsx"]; }
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, worksheetName);
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([excelBuffer], { type: "application/octet-stream" }), fileName);
  };
  const handleSaveInstrument = async () => {
    const requiredFields = ["instrument_number", "equipment_sl_no", "instrument_name", "calibration_date", "freq", "calibration_status", "done_by"];
    if (requiredFields.some(field => !newInstrument[field])) { alert("Please fill in all required fields."); return; }
    let payload = { ...newInstrument };
    if (payload.calibration_status === "Completed") payload.next_due_date = calculateNextDueDate(payload.calibration_date, payload.freq);
    setIsSubmitting(true);
    try {
      if (payload.id) { await axios.post("http://localhost:8000/EditInstrument", payload); alert("Instrument updated successfully!"); }
      else { await axios.post("http://localhost:8000/add_instrument/", payload); alert("Instrument added successfully!"); }
      handleCloseAddModal();
      await fetchPendingCalibrations();
    } catch (error) {
      const errorMessage = error.response?.data?.error || "An unknown server error occurred.";
      console.error("Error saving instrument:", errorMessage);
      alert(`Failed to save instrument: ${errorMessage}`);
    } finally { setIsSubmitting(false); }
  };
  const handleCompleteCalibration = async () => {
    if (!calibrationForm.freq || !calibrationForm.done_by) { alert("Please select a frequency and enter who performed the calibration."); return; }
    setIsSubmitting(true);
    try {
      const response = await axios.post("http://localhost:8000/complete_calibration/", calibrationForm);
      alert(response.data.message);
      setShowCompleteModal(false);
      setCalibrationForm(null);
      await fetchPendingCalibrations();
    } catch (error) {
      const errorMessage = error.response?.data?.error || "An unknown server error occurred.";
      console.error("Error completing calibration:", errorMessage);
      alert(`Failed to complete calibration: ${errorMessage}`);
    } finally { setIsSubmitting(false); }
  };
  const handleEdit = (instrument) => {
    setNewInstrument({ ...instrument, calibration_date: convertDisplayDateToYyyyMmDd(instrument.calibration_date), next_due_date: convertDisplayDateToYyyyMmDd(instrument.next_due_date), });
    setShowModal(true);
  };
  const handleDelete = async (instrumentToDelete) => {
    if (!window.confirm(`Are you sure you want to delete "${instrumentToDelete.instrument_name}"? This will remove all its history.`)) return;
    try {
      const response = await axios.post("http://localhost:8000/deleteInstrument", { instrument_number: instrumentToDelete.instrument_number });
      alert(response.data.message || "Instrument deleted successfully!");
      await fetchPendingCalibrations();
      if (viewMode === 'history') fetchCalibrationHistory();
    } catch (error) {
      console.error("Error deleting instrument:", error);
      alert(error.response?.data?.message || "An error occurred while deleting.");
    }
  };

  const handleOpenCompleteModal = (instrument) => {
    setSelectedInstrument(instrument);
    setCalibrationForm({
      id: instrument.id,
      instrument_number: instrument.instrument_number,
      equipment_sl_no: instrument.equipment_sl_no,
      instrument_name: instrument.instrument_name,
      make: instrument.make,
      model_number: instrument.model_number,
      // MODIFICATION: Use a separate property to hold the previous certificate number for display
      previous_certificate_number: instrument.certificate_number,
      // MODIFICATION: Initialize the new certificate number as an empty string for the user to fill
      certificate_number: "",
      calibration_date: new Date().toISOString().split("T")[0],
      freq: instrument.freq,
      entry_date: instrument.entry_date,
      last_calibration_date: instrument.calibration_date,
      last_next_due_date: instrument.next_due_date,
      inst_status:instrument.inst_status,
      next_due_date: calculateNextDueDate(new Date().toISOString().split("T")[0], instrument.freq),
      done_by: "",
    });
    setShowCompleteModal(true);
  };
  const handleCalibrationFormChange = (e) => {
    const { name, value } = e.target;
    setCalibrationForm(prev => {
      const updatedForm = { ...prev, [name]: value };
      if (name === 'calibration_date' || name === 'freq') {
        updatedForm.next_due_date = calculateNextDueDate(updatedForm.calibration_date, updatedForm.freq);
      }
      return updatedForm;
    });
  };

  const handleCloseAddModal = () => { setShowModal(false); setNewInstrument(initialInstrumentState); };
  const handleOpenAddModal = () => { setNewInstrument(initialInstrumentState); setShowModal(true); };
  const handleClearFilters = () => { setFromDate(""); setToDate(""); fetchCalibrationHistory(); };

  return (
    <div className="h-screen w-full flex bg-gradient-to-br from-blue-300 to-blue-400">
      <Sidebar redCount={statusCounts.red_count} />
      <div className="w-4/5 p-8 overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          {viewMode !== 'current' ? (
            <>
              <button className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800" onClick={() => setViewMode('current')}>
                ← Back to Current Status
              </button>
              {viewMode === 'history' && (
                <div className="flex justify-end items-center mb-4 space-x-2">
                  <label>From: <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="border p-1 ml-1" /></label>
                  <label>To: <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="border p-1 ml-1" /></label>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={fetchCalibrationHistory}>Apply Filter</button>
                  <button onClick={handleClearFilters} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">Clear</button>
                  <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700" onClick={handleDownloadExcel}>Download Excel</button>
                </div>
              )}
               {viewMode === 'list' && (
                  <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700" onClick={handleDownloadExcel}>Download Excel</button>
               )}
            </>
          ) : (
            <>
              <div className="flex flex-col space-y-2">
                <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700" onClick={handleOpenAddModal}>+ Add Instrument</button>
                <button className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700" onClick={fetchUniqueInstruments}>List of Instruments</button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={fetchCalibrationHistory}>View Calibration History</button>
              </div>
              <h2 className="text-3xl font-bold">Current Status</h2>
              <div className="flex space-x-2">
                <div className="px-3 py-2 bg-red-600 text-white rounded shadow">{statusCounts.red_count}</div>
                <div className="px-3 py-2 bg-yellow-500 text-white rounded shadow">{statusCounts.yellow_count}</div>
                <div className="px-3 py-2 bg-green-600 text-white rounded shadow">{statusCounts.green_count}</div>
              </div>
            </>
          )}
        </div>
          
        {viewMode === 'current' && (
          <div className="overflow-x-auto">
            <table className="bg-white w-full min-w-[1200px]">
              <thead>
                <tr className="bg-gray-200">
                  {["Instrument No.", "Reg No.", "Instrument Name", "Entry Date", "Brand Name", "Model No", "Equipment Sl.No", "Frequency", "Certificate No", "Calib. Date", "Next Due", "Instrument Status", "Complete"].map((head) => (
                    <th key={head} className="border px-4 py-2 text-left text-sm">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendingCalibrations.filter((item) => item.inst_status !== "obsolete").map((item) => {
                  const statusInfo = getCalibrationStatusInfo(item.next_due_date, item.freq);
                  return (
                    <tr key={item.id} className="hover:bg-gray-100">
                      <td className="border px-3 py-2 text-sm font-semibold">{item.instrument_number}</td>
                      <td className="border px-3 py-2 text-sm">{item.id}</td>
                      <td className="border px-3 py-2 text-sm">{item.instrument_name}</td>
                      <td className="border px-3 py-2 text-sm whitespace-nowrap">{item.entry_date}</td>
                      <td className="border px-3 py-2 text-sm">{item.make}</td>
                      <td className="border px-3 py-2 text-sm">{item.model_number}</td>
                      <td className="border px-3 py-2 text-sm">{item.equipment_sl_no}</td>
                      <td className="border px-3 py-2 text-sm">{item.freq}</td>
                      <td className="border px-3 py-2 text-sm">{item.certificate_number}</td>
                      <td className="border px-3 py-2 text-sm whitespace-nowrap">{item.calibration_date}</td>
                      <td className="border px-3 py-2 text-sm whitespace-nowrap">{item.next_due_date}</td>
                      <td className="border px-3 py-2 text-sm text-center">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.inst_status === 'inuse' ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-800'}`}>
                          {item.inst_status === 'inuse' ? 'In Use' : 'Obsolete'}
                        </span>
                      </td>
                      <td className="border px-3 py-2 text-sm text-center">
                        <button 
                          className={`${statusInfo.color} text-white py-1 px-3 text-xs rounded hover:opacity-80`} 
                          disabled={item.calibration_status === "Completed"} 
                          onClick={() => handleOpenCompleteModal(item)}
                        >
                          {statusInfo.text}
                        </button>
                      </td>
                      {/* <td className="border px-3 py-2 text-sm text-center"> */}
                        {/* <button className="bg-blue-600 text-white py-1 px-3 text-xs rounded hover:bg-blue-700" onClick={() => handleEdit(item)}>Edit</button> */}
                      {/* </td> */}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {viewMode === 'list' && (
          <div>
            <h2 className="text-2xl font-bold text-center mb-4">Master List of Instruments</h2>
            <table className="bg-white w-full">
              <thead>
                <tr className="bg-gray-200">
                  {["Instrument No.", "Instrument Name", "Entry Date", "Brand Name", "Model No", "Equipment Sl.No", "Certificate No", "Last calibration Date","Next Due", "Frequency","Status"].map((head) => (
                    <th key={head} className="border px-4 py-2 text-left">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {uniqueInstruments.map((item, index) => (
                    <tr key={`${item.instrument_number}-${index}`} className="hover:bg-gray-100">
                      <td className="border px-3 py-2 text-sm font-semibold">{item.instrument_number}</td>
                      <td className="border px-3 py-2 text-sm">{item.instrument_name}</td>
                      <td className="border px-3 py-2 text-sm whitespace-nowrap">{item.entry_date}</td>
                      <td className="border px-3 py-2 text-sm">{item.make}</td>
                      <td className="border px-3 py-2 text-sm">{item.model_number}</td>
                      <td className="border px-3 py-2 text-sm">{item.equipment_sl_no}</td>
                      <td className="border px-3 py-2 text-sm">{item.inst_status === 'obsolete' ? 'N/A' : item.certificate_number}</td>
                      <td className="border px-3 py-2 text-sm">{item.last_calibration_date}</td>
                      <td className="border px-3 py-2 text-sm">{item.inst_status === 'obsolete' ? 'N/A' : item.nextDue}</td>
                      <td className="border px-3 py-2 text-sm">{item.freq}</td>
                      <td className="border px-3 py-2 text-sm text-center">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.inst_status === 'inuse' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                          {item.inst_status === 'inuse' ? 'In Use' : 'Obsolete'}
                        </span>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {viewMode === 'history' && (
          <div>
            <h2 className="text-2xl font-bold text-center mb-4">Calibration History</h2>
            <table className="bg-white w-full">
              <thead>
                <tr className="bg-gray-200">
                  {/* Conditionally create the headers array */}
                  {["Instrument No.", "Reg No.", "Instrument Name", "Entry Date", "Brand Name", "Model No", "Equipment Sl.No", "Frequency", "Certificate No", "Calib. Date", "Next Due", "Instrument Status", "Done By"]
                    .concat(userRole === 'doctor' ? ['Edit'] : [])
                    .map((head) => (
                      <th key={head} className="border px-4 py-2 text-left">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {calibrationHistory.map((item) => {
                  const isObsoleteAndPending = item.inst_status === 'obsolete' && item.calibration_status === 'obsolete';
                  return (
                    <tr key={item.id} className="hover:bg-gray-100">
                      <td className="border px-3 py-2 text-sm font-semibold">{item.instrument_number}</td>
                      <td className="border px-3 py-2 text-sm">{item.id}</td>
                      <td className="border px-3 py-2 text-sm">{item.instrument_name}</td>
                      <td className="border px-3 py-2 text-sm whitespace-nowrap">{item.entry_date}</td>
                      <td className="border px-3 py-2 text-sm">{item.make}</td>
                      <td className="border px-3 py-2 text-sm">{item.model_number}</td>
                      <td className="border px-3 py-2 text-sm">{item.equipment_sl_no}</td>
                      <td className="border px-3 py-2 text-sm">{item.freq}</td>
                      <td className="border px-3 py-2 text-sm">{isObsoleteAndPending ? 'N/A' : item.certificate_number}</td>
                      <td className="border px-3 py-2 text-sm whitespace-nowrap">{ item.calibration_date}</td>
                      <td className="border px-3 py-2 text-sm whitespace-nowrap">{isObsoleteAndPending ? 'N/A' : item.next_due_date}</td>
                      <td className="border px-3 py-2 text-sm text-center">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.inst_status === 'inuse' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>{item.inst_status === 'inuse' ? 'In Use' : 'Obsolete'}</span>
                      </td>
                      <td className="border px-3 py-2 text-sm">{item.done_by}</td>
                      {/* Conditionally render the Edit button and its cell */}
                      {userRole === 'doctor' && (
                        <td className="border px-3 py-2 text-sm text-center">
                          <button className="bg-blue-600 text-white py-1 px-3 text-xs rounded hover:bg-blue-700" onClick={() => handleEdit(item)}>Edit</button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ... All Modals ... */}
        
      {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
            <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-3xl transform transition-all">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                {newInstrument.id ? "Edit Instrument" : "Add New Instrument"}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                <div>
                  <label htmlFor="instrument_number" className="block text-sm font-medium text-gray-700 mb-1">Instrument Number</label>
                  <input type="text" id="instrument_number" placeholder="Unique Instrument ID" className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-200" value={newInstrument.instrument_number} onChange={(e) => setNewInstrument({ ...newInstrument, instrument_number: e.target.value })} disabled={!!newInstrument.id} />
                </div>
                <div>
                  <label htmlFor="equipment_sl_no" className="block text-sm font-medium text-gray-700 mb-1">Equipment Serial No.</label>
                  <input type="text" id="equipment_sl_no" placeholder="Manufacturer's Serial Number" className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" value={newInstrument.equipment_sl_no} onChange={(e) => setNewInstrument({ ...newInstrument, equipment_sl_no: e.target.value })} />
                </div>
                <div className="md:col-span-3">
                  <label htmlFor="instrument_name" className="block text-sm font-medium text-gray-700 mb-1">Instrument Name</label>
                  <input type="text" id="instrument_name" placeholder="Enter Instrument Name" className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" value={newInstrument.instrument_name} onChange={(e) => setNewInstrument({ ...newInstrument, instrument_name: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="make" className="block text-sm font-medium text-gray-700 mb-1">Brand Name</label>
                  <input type="text" id="make" placeholder="Enter Brand Name" className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" value={newInstrument.make} onChange={(e) => setNewInstrument({ ...newInstrument, make: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="model_number" className="block text-sm font-medium text-gray-700 mb-1">Model Number</label>
                  <input type="text" id="model_number" placeholder="Enter Model Number" className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" value={newInstrument.model_number} onChange={(e) => setNewInstrument({ ...newInstrument, model_number: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="certificate_number" className="block text-sm font-medium text-gray-700 mb-1">Certificate Number</label>
                  <input type="text" id="certificate_number" placeholder="Enter Certificate Number" className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" value={newInstrument.certificate_number} onChange={(e) => setNewInstrument({ ...newInstrument, certificate_number: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="calibration_date" className="block text-sm font-medium text-gray-700 mb-1">Last Calibration Date</label>
                  <input type="date" id="calibration_date" className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" value={newInstrument.calibration_date} onChange={(e) => { const date = e.target.value; const nextDue = calculateNextDueDate(date, newInstrument.freq); setNewInstrument({ ...newInstrument, calibration_date: date, next_due_date: nextDue }); }} />
                </div>
                <div>
                  <label htmlFor="freq" className="block text-sm font-medium text-gray-700 mb-1">Calibration Frequency</label>
                  <select id="freq" className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" value={newInstrument.freq} onChange={(e) => { const freq = e.target.value; const nextDue = calculateNextDueDate(newInstrument.calibration_date, freq); setNewInstrument({ ...newInstrument, freq, next_due_date: nextDue }); }}>
                    <option value="" disabled>Select Frequency</option>
                    {frequencyOptions.map((freq, idx) => (<option key={idx} value={freq}>{freq}</option>))}
                  </select>
                </div>
                <div>
                  <label htmlFor="next_due_date" className="block text-sm font-medium text-gray-700 mb-1">Next Due Date</label>
                  <input type="date" id="next_due_date" className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed" readOnly value={newInstrument.next_due_date} />
                </div>
                {/* <div>
                  <label htmlFor="initial_status" className="block text-sm font-medium text-gray-700 mb-1">Initial Status</label>
                  <select id="initial_status" className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" value={newInstrument.calibration_status} onChange={(e) => setNewInstrument({ ...newInstrument, calibration_status: e.target.value })}>
                    <option value="" disabled>Select Status</option>
                    <option value="pending">Pending</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div> */}
                <div>
                  <label htmlFor="instrument_status" className="block text-sm font-medium text-gray-700 mb-1">Instrument Status</label>
                  <select id="instrument_status" className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" value={newInstrument.inst_status} onChange={(e) => setNewInstrument({ ...newInstrument, inst_status: e.target.value })}>
                    <option value="" disabled>Select Status</option>
                    <option value="inuse">In Use</option>
                    <option value="obsolete">Obsolete</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="done_by" className="block text-sm font-medium text-gray-700 mb-1">Done By</label>
                  <input type="text" id="done_by" placeholder="Enter your name" className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" value={newInstrument.done_by} onChange={(e) => setNewInstrument({ ...newInstrument, done_by: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end mt-8 pt-4 border-t">
                <button className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500" onClick={handleCloseAddModal}>Cancel</button>
                <button className="ml-4 px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500" onClick={handleSaveInstrument} disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : (newInstrument.id ? "Update Instrument" : "Save Instrument")}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {showCompleteModal && calibrationForm && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 overflow-y-auto p-4">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-3xl">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Complete Calibration</h2>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium text-gray-500">Instrument Number:</span>
                      <p className="text-gray-900">{calibrationForm.instrument_number}</p>
                    </div>
                    <div>
                    <span className="font-medium text-gray-500">Reg No:</span>
                    <p className="text-gray-900">{calibrationForm.id}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">Entry Date:</span>
                    <p className="text-gray-900">{calibrationForm.entry_date || "N/A"}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">Last Calib. Date:</span>
                    <p className="text-gray-900">{calibrationForm.last_calibration_date || "N/A"}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">Next Calib. Date:</span>
                    <p className="text-gray-900">{calibrationForm.last_next_due_date || "N/A"}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">Status:</span>
                    <p className="text-gray-900">{calibrationForm.inst_status}</p>
                  </div>
                  <div>
                      
                      <span className="font-medium text-gray-500">Certificate Number</span>
                      <p className="text-gray-900">{calibrationForm.previous_certificate_number || "N/A"}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">Equiment Serial No</span>
                      <p className="text-gray-900">{calibrationForm.equipment_sl_no || "N/A"}</p>
                    </div>
                    
                    <div className="md:col-span-2">
                      <span className="font-medium text-gray-500">Instrument Name</span>
                      <p className="text-gray-900">{calibrationForm.instrument_name || "N/A"}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">Brand Name</span>
                      <p className="text-gray-900">{calibrationForm.make || "N/A"}</p>
                    </div>
                    
                    
                    
                </div>
                {/* Find the editable grid at the bottom of the modal */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-6">
    <div>
      <label htmlFor="comp_calibration_date" className="block text-sm font-medium text-gray-700">Actual Calibration Date</label>
      <input id="comp_calibration_date" type="date" name="calibration_date" value={calibrationForm.calibration_date} onChange={handleCalibrationFormChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
    </div>
    <div>
      <label htmlFor="comp_freq" className="block text-sm font-medium text-gray-700">Calibration Frequency</label>
      <select id="comp_freq" name="freq" value={calibrationForm.freq} onChange={handleCalibrationFormChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
        <option value="" disabled>Select Frequency</option>
        {frequencyOptions.map((freq, idx) => (<option key={idx} value={freq}>{freq}</option>))}
      </select>
    </div>
    <div>
      <label htmlFor="comp_next_due_date" className="block text-sm font-medium text-gray-700">Next Due Date</label>
      <input id="comp_next_due_date" type="date" name="next_due_date" value={calibrationForm.next_due_date} readOnly className="mt-1 block w-full p-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed" />
    </div>
    
    {/* --- NEW FIELD ADDED HERE --- */}
    <div className="md:col-span-3">
      <label htmlFor="comp_certificate_number" className="block text-sm font-medium text-gray-700">New Certificate Number</label>
      <input id="comp_certificate_number" type="text" name="certificate_number" placeholder="Enter certificate number for this calibration" value={calibrationForm.certificate_number} onChange={handleCalibrationFormChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
    </div>
    {/* --- END OF NEW FIELD --- */}

    <div className="md:col-span-3">
      <label htmlFor="comp_done_by" className="block text-sm font-medium text-gray-700">Done By</label>
      <input id="comp_done_by" type="text" name="done_by" placeholder="Enter your name" value={calibrationForm.done_by} onChange={handleCalibrationFormChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
    </div>
</div>
              </div>
              <div className="flex justify-end mt-8 pt-4 border-t">
                <button className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700" onClick={() => { setShowCompleteModal(false); setCalibrationForm(null); }}>
                  Cancel
                </button>
                <button className="ml-4 bg-blue-600 text-white px-4 py-2 font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400" onClick={handleCompleteCalibration} disabled={isSubmitting || !calibrationForm.freq || !calibrationForm.done_by}>
                  {isSubmitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstrumentCalibration;