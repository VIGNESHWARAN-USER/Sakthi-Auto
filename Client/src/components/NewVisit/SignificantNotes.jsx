import React, { useEffect, useState } from 'react';
import axios from 'axios';
// FaCircleInfo is not used, FaInfoCircle is. I've cleaned up the import.
import { FaInfoCircle } from 'react-icons/fa';

// --- Data for the Information Modal ---
const notifiableDiseases = [
    { no: 1, name: "Lead poisoning including poisoning by any preparation or compound of lead or their sequelae." },
    { no: 2, name: "Lead tetra-ethyl poisoning." },
    { no: 3, name: "Phosphorous poisoning or its sequelae." },
    { no: 4, name: "Mercury poisoning or its sequelae." },
    { no: 5, name: "Manganese poisoning or its sequelae." },
    { no: 6, name: "Arsenic poisoning or its sequelae." },
    { no: 7, name: "Poisoning by nitrous fumes." },
    { no: 8, name: "Carbon bisulphide poisoning." },
    { no: 9, name: "Benzene poisoning, including poisoning by any of its homologues, their nitro or amido derivatives or its sequelae." },
    { no: 10, name: "Chrome ulceration or its sequelae." },
    { no: 11, name: "Anthrax." },
    { no: 12, name: "Silicosis." },
    { no: 13, name: "Poisoning by halogens or halogen derivatives of the hydrocarbons, of the aliphatic series." },
    { no: 14, name: "Pathological manifestation due to : - a. Radium or other radioactive substances. b. X-rays." },
    { no: 15, name: "Primary epitheliomatous cancer of the skin." },
    { no: 16, name: "Toxic anemia." },
    { no: 17, name: "Toxic jaundice due to poisonous substances." },
    { no: 18, name: "Oil acne or dermatitis due to mineral oils and compounds containing mineral oil base." },
    { no: 19, name: "Byssinosis." },
    { no: 20, name: "Asbestosis." },
    { no: 21, name: "Occupational or contact dermatitis caused by direct contract with chemical and paints. These are of types, that is, primary irritants and allergic sensitizers." },
    { no: 22, name: "Noise induced hearing loss (exposure to high noise levels)." },
    { no: 23, name: "Beryllium poisoning." },
    { no: 24, name: "Carbon monoxide." },
    { no: 25, name: "Coal miners' pneumoconiosis." },
    { no: 26, name: "Phosgene poisoning." },
    { no: 27, name: "Occupational cancer." },
    { no: 28, name: "Isocyanates poisoning." },
    { no: 29, name: "Toxic nephritis." }
];

// --- Reusable Modal Component ---
const InfoModal = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;

    return (
        // Backdrop
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 transition-opacity duration-300">
            {/* Modal Content */}
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
                {/* Modal Header */}
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-lg font-semibold text-gray-800">Additional Information</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-3xl leading-none">&times;</button>
                </div>
                {/* Modal Body */}
                <div className="p-6 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};


// Helper component to display historical entries (remains the same)
const HistoryList = ({ title, notes, fieldKey, isLoading, error }) => {
    // Sort notes by date descending (most recent first)
    const sortedNotes = [...notes].sort((a, b) => {
        const dateA = a.entry_date ? new Date(a.entry_date) : 0;
        const dateB = b.entry_date ? new Date(b.entry_date) : 0;
        // Handle potential invalid dates gracefully
        if (isNaN(dateA) && isNaN(dateB)) return 0;
        if (isNaN(dateA)) return 1; // Put invalid dates at the end
        if (isNaN(dateB)) return -1; // Put invalid dates at the end
        return dateB - dateA;
    });

    return (
        <div className="h-full flex flex-col"> {/* Ensures the container takes full height */}
            <h4 className="text-sm font-semibold text-gray-600 mb-2 border-b pb-1">{title}</h4>
            {isLoading && <p className="text-xs text-blue-500 animate-pulse">Loading history...</p>}
            {error && <p className="text-xs text-red-500">Error: {error}</p>}
            {!isLoading && !error && notes.length === 0 && (
                <p className="text-xs text-gray-400 italic">No history available.</p>
            )}
            {!isLoading && !error && notes.length > 0 && (
                 // Check if any note actually has a value for the specific fieldKey
                 sortedNotes.some(note => note[fieldKey]) ? (
                    <div className="overflow-y-auto h-40 md:h-48 border rounded-md p-2 bg-gray-50 flex-grow shadow-inner"> {/* Adjusted height & styling */}
                        <ul className="space-y-2">
                            {/* Filter out entries where the specific field is empty/null */}
                            {sortedNotes.filter(note => note[fieldKey]).map((note, index) => (
                                <li key={note.id || index} className="text-xs border-b last:border-b-0 pb-1">
                                    <span className="font-medium text-gray-500 mr-1">
                                        {note.entry_date ? new Date(note.entry_date).toLocaleDateString() : 'No Date'}:
                                    </span>
                                    <span className="text-gray-700 whitespace-pre-wrap break-words">
                                        {/* Display the value for the specific fieldKey */}
                                        {note[fieldKey]}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                 ) : (
                    <p className="text-xs text-gray-400 italic mt-2">No historical entries for {title.toLowerCase()}.</p>
                 )
            )}
        </div>
    );
};


const SignificantNotes = ({ data, type, mrdNo}) => {
  // --- States for current input ---
  const [healthsummary, setHealthsummary] = useState('');
  const [remarks, setRemarks] = useState('');
  const [communicableDisease, setCommunicableDisease] = useState('');
  const [incidentType, setIncidentType] = useState('');
  const [incident, setIncident] = useState('');
  const [illnessType, setIllnessType] = useState('');

  // --- State for submission status ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // --- NEW: State for information modal ---
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  // --- States for historical data ---
  const [historicalNotes, setHistoricalNotes] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  // --- State for previous communicable disease entry (still useful for quick view) ---
  const [previousCommunicableDisease, setPreviousCommunicableDisease] = useState('');

  // --- Dropdown Options (replace with your actual options) ---
  const communicableDiseaseOptions = [
    { value: '', label: 'Select...' }, // Add a default empty option
    { value: 'Notification 0', label: 'Notification 0' },
    { value: 'Notification 1', label: 'Notification 1' },
    { value: 'Notification 2', label: 'Notification 2' },
    { value: 'Notification 3', label: 'Notification 3' }
  ];
  const incidentTypeOptions = [ { value: '', label: 'Select...' }, { value: 'FAC', label: 'FAC' }, { value: 'LTI', label: 'LTI' }, { value: 'MTC', label: 'MTC' }, { value: 'FATAL', label: 'FATAL' }, { value: 'RWC', label: 'RWC' } ];
  const incidentOptions = [ /* ...options... */ { value: '', label: 'Select...' }, {value: 'Work Related Injury', label: 'Work Related Injury'}, {value: 'Domestic Injury', label: 'Domestic Injury'}, {value: 'Commutation Injury', label: 'Commutation Injury'}, {value: 'Others', label: 'Others'} ];
  const illnessTypeOptions = [ /* ...options... */ { value: '', label: 'Select...' }, {value: 'Work Related Illness', label: 'Work Related Illness'}, {value: 'Notifiable Disease', label: 'Notifiable Disease'} ];


  // --- Extract employee number and check access level ---
  const emp_no = data && data.length > 0 ? data[0]?.emp_no : null;
  const aadhar = data && data.length > 0 ? data[0]?.aadhar : null;
  const accessLevel = typeof window !== 'undefined' ? localStorage.getItem('accessLevel') : null; // Check for window object
  console.log(accessLevel)
  const isDoctor = accessLevel === 'doctor';

  // Function to fetch history and find previous entry (remains mostly the same)
  const fetchHistory = async (aadharNumber) => {
        if (!aadharNumber) return;

        setIsLoadingHistory(true);
        setHistoryError(null);
        setHistoricalNotes([]);
        setPreviousCommunicableDisease(''); // Reset previous value on fetch
        try {
            const response = await axios.get(`http://localhost:8000/get_notes/${aadharNumber}`);
            console.log("Fetched Historical Notes:", response.data);

            // Handle the new response format
            let fetchedNotesArray = [];
            if (response.data?.notes && Array.isArray(response.data.notes)) {
                fetchedNotesArray = response.data.notes;
            } else if (response.data?.data && Array.isArray(response.data.data)) {
                fetchedNotesArray = response.data.data;
            } else if (Array.isArray(response.data)) {
                fetchedNotesArray = response.data;
            } else {
                console.warn("Unexpected response format:", response.data);
                return;
            }

            // Sort notes descending by date for finding previous entry and for display
            const sortedNotes = [...fetchedNotesArray].sort((a, b) => {
                const dateA = a.entry_date ? new Date(a.entry_date) : 0;
                const dateB = b.entry_date ? new Date(b.entry_date) : 0;
                if (isNaN(dateA) && isNaN(dateB)) return 0;
                if (isNaN(dateA)) return 1;
                if (isNaN(dateB)) return -1;
                return dateB - dateA;
            });

            // Set historical notes state (used by all HistoryList components)
            setHistoricalNotes(sortedNotes);

            // Find the most recent previous entry with a non-empty communicable_disease value
            let prevValue = '';
            for (let i = 0; i < sortedNotes.length; i++) {
                if (sortedNotes[i]?.communicable_disease) {
                    prevValue = sortedNotes[i].communicable_disease;
                    break; // Found the most recent non-empty previous value
                }
            }

            setPreviousCommunicableDisease(prevValue);

        } catch (err) {
            console.error("Error fetching history:", err);
            setHistoryError(err.response?.data?.detail || err.message || "Failed to fetch history.");
        } finally {
            setIsLoadingHistory(false);
        }
    };


  // --- useEffect to load existing data AND fetch history ---
  useEffect(() => {
    // 1. Set current fields based on the latest entry (if available)
    // This usually represents the *last saved state* or data passed for a new entry.
    const latestNotes = data && data.length > 0 ? data[0]?.significant_notes : null;

    if (latestNotes) {
        setHealthsummary(latestNotes.healthsummary || '');
        setRemarks(latestNotes.remarks || '');
        setCommunicableDisease(latestNotes.communicable_disease || '');
        setIncidentType(latestNotes.incident_type || '');
        setIncident(latestNotes.incident || '');
        setIllnessType(latestNotes.illness_type || '');
    } else {
      // Reset fields if no latest data is passed (e.g., creating a new record)
      setHealthsummary('');
      setRemarks('');
      setCommunicableDisease('');
      setIncidentType('');
      setIncident('');
      setIllnessType('');
    }

    // 2. Fetch historical notes if emp_no is available
    if (aadhar) {
        fetchHistory(aadhar);
    } else {
        // No emp_no, clear history state
        setHistoricalNotes([]);
        setPreviousCommunicableDisease('');
        setIsLoadingHistory(false);
        setHistoryError(null);
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, aadhar]); // Rerun when data or emp_no changes


  // --- Handle form submission ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!aadhar) {
        alert("Employee aadhar number is missing. Cannot submit.");
        return;
    }
    // Relax validation: Allow submission even if only dropdowns are selected
    // if (!healthsummary.trim() && !remarks.trim() && !communicableDisease && !incidentType && !incident && !illnessType) {
    //     alert("Please enter at least one piece of information (Summary, Remarks, or select a dropdown value).");
    //     return;
    // }
    setIsSubmitting(true);
    const significantNotesData = {
      emp_no: emp_no || null,
      aadhar: aadhar, // Send null if empty
      healthsummary: healthsummary || null, // Send null if empty
      remarks: remarks || null,
      communicable_disease: communicableDisease || null,
      incident_type: incidentType || null,
      incident: incident || null,
      illness_type: illnessType || null,
      mrdNo: mrdNo || null,
    };
    try {
      const response = await axios.post("http://localhost:8000/significant_notes/add/", significantNotesData);
      if (response.status === 200 || response.status === 201) {
        alert("Significant notes submitted successfully!");
        // Don't clear fields immediately, wait for data refresh? Or clear selectively?
        // For now, let's clear them for a fresh entry feel.
        setHealthsummary(''); setRemarks(''); setCommunicableDisease('');
        setIncidentType(''); setIncident(''); setIllnessType('');

        // IMPORTANT: Refetch history AFTER successful submission to include the new entry
        fetchHistory(aadhar);

        // Optionally: Call a function passed via props to update parent state if needed
        // e.g., onDataUpdateSuccess();

      } else {
        console.error('Error submitting notes:', response.status, response.data);
        alert(`Error submitting significant notes (${response.status}). Please try again.`);
      }
    } catch (error) {
       console.error('Error submitting notes:', error);
       const errorMsg = typeof error.response?.data?.detail === 'string' ? error.response.data.detail
           : typeof error.response?.data === 'string' ? error.response.data
           : 'Please check details and try again.';
       alert(`Server error (${error.response?.status || 'Network Error'}): ${errorMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Render ---
  if (!aadhar && !isLoadingHistory) { // Avoid showing error if history is still loading initially
      return <div className="p-6 text-center text-red-600 bg-white rounded-lg shadow">No employee selected or data available.</div>;
  }
   if (isLoadingHistory && !historicalNotes.length) { // Show loading indicator centered if it's the initial load
       return <div className="p-6 text-center text-blue-500 bg-white rounded-lg shadow">Loading employee data...</div>;
   }


  return (
    <div className="bg-white min-h-screen p-4 md:p-6 rounded-lg shadow-md">
      <h2 className="text-xl md:text-2xl font-semibold mb-6 text-gray-700 border-b pb-2">Significant Notes</h2>

      <form >
        {/* Health Summary Section */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input Column */}
            <div className="flex flex-col"> {/* Fixed height for layout consistency */}
                <label className="block text-gray-700 mb-1 text-sm font-medium" htmlFor="healthsummary">
                    Visit Summary
                </label>
                <textarea
                    id="healthsummary"
                    className={isDoctor?"w-full p-2 border rounded-md bg-blue-50 focus:ring-1 focus:ring-blue-400  focus:border-blue-400 text-sm flex-grow":"w-full p-2 border rounded-md bg-blue-50 focus:ring-1 focus:ring-blue-400 cursor-not-allowed focus:border-blue-400 text-sm flex-grow"} 
                    placeholder="Enter overall health summary..."
                    onChange={(e) => setHealthsummary(e.target.value)}
                    disabled={!isDoctor}
                ></textarea>
            </div>
            {/* History Column */}
            <div className=""> {/* Fixed height */}
                 <HistoryList
                    title="Health Summary History"
                    notes={historicalNotes}
                    fieldKey="healthsummary"
                    isLoading={isLoadingHistory}
                    error={historyError}
                />
             </div>
        </div>

        {/* Remarks Section */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input Column */}
            <div className="flex flex-col"> {/* Fixed height */}
                <label className="block text-gray-700 mb-1 text-sm font-medium" htmlFor="remarks">
                    Remarks / Defaults
                </label>
                <textarea
                    id="remarks"
                    className={isDoctor?"w-full p-2 border rounded-md bg-blue-50 focus:ring-1 focus:ring-blue-400  focus:border-blue-400 text-sm flex-grow":"w-full p-2 border rounded-md bg-blue-50 focus:ring-1 focus:ring-blue-400 cursor-not-allowed focus:border-blue-400 text-sm flex-grow"} // Added resize-none
                    placeholder="Enter any relevant remarks..."
                    
                    onChange={(e) => setRemarks(e.target.value)}
                    disabled={!isDoctor}
                ></textarea>
            </div>
             {/* History Column */}
            <div className=""> {/* Fixed height */}
                 <HistoryList
                    title="Remarks / Defaults History"
                    notes={historicalNotes}
                    fieldKey="remarks"
                    isLoading={isLoadingHistory}
                    error={historyError}
                />
            </div>
        </div>

         {/* --- Communicable Disease Section --- */}
         <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-6 mt-6">
             {/* Input Column */}
             <div className="flex flex-col"> {/* Removed fixed height for dropdowns */}
                 <label htmlFor="communicableDisease" className="block text-gray-700 text-sm font-medium mb-1">
                    Notification
                 </label>
                 <select
                    id="communicableDisease"
                    className={isDoctor?"w-full p-2 border rounded-md bg-blue-50 focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm":"w-full p-2 border rounded-md bg-blue-50 focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm cursor-not-allowed"}
                    value={communicableDisease}
                    onChange={(e) => setCommunicableDisease(e.target.value)}
                    disabled={!isDoctor}
                 >
                    {/* <option value="">Select...</option> // Included in options array */}
                    {communicableDiseaseOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                 </select>
                 {/* --- Display Previous Entry (Quick View) --- */}
                 {!isLoadingHistory && previousCommunicableDisease && communicableDisease !== previousCommunicableDisease && ( // Only show if different from current selection
                    <p className="text-xs text-gray-500 mt-1">
                        Previous Entry: <span className="font-medium text-gray-700">{previousCommunicableDisease}</span>
                    </p>
                 )}
                 {!isLoadingHistory && !previousCommunicableDisease && historicalNotes.length > 0 && (
                    <p className="text-xs text-gray-400 italic mt-1">No previous entry found.</p>
                 )}
                 {/* --- End Display Previous Entry --- */}
             </div>
             {/* History Column */}
             <div className="h-64"> {/* Fixed height for history list consistency */}
                <HistoryList
                    title="Notification History"
                    notes={historicalNotes}
                    fieldKey="communicable_disease" // Use the correct field key from your API data
                    isLoading={isLoadingHistory}
                    error={historyError}
                />
            </div>
        </div>

         {/* --- Curative Specific Dropdowns Section (Only if type is Curative) --- */}
        {type === "Curative" && (
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t pt-6">
                 {/* Incident Type */}
                 <div>
                    <label htmlFor="incidentType" className="block text-gray-700 text-sm font-medium mb-1">
                        Incident Category
                    </label>
                    <select id="incidentType" className={isDoctor?"w-full p-2 border rounded-md bg-blue-50 focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm":"w-full p-2 border rounded-md bg-blue-50 focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm cursor-not-allowed"} value={incidentType} onChange={(e) => setIncidentType(e.target.value)} disabled={!isDoctor}>
                        {/* <option value="">Select...</option> // Included in options array */}
                        {incidentTypeOptions.map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}
                    </select>
                    {/* TODO: Add HistoryList for incident_type if needed */}
                 </div>
                 {/* Incident */}
                 <div>
                    <label htmlFor="incident" className="block text-gray-700 text-sm font-medium mb-1">
                       Incident Nature
                    </label>
                    <select id="incident" className={isDoctor?"w-full p-2 border rounded-md bg-blue-50 focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm":"w-full p-2 border rounded-md bg-blue-50 focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm cursor-not-allowed"} value={incident} onChange={(e) => setIncident(e.target.value)} disabled={!isDoctor}>
                        {/* <option value="">Select...</option> // Included in options array */}
                        {incidentOptions.map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}
                    </select>
                     {/* TODO: Add HistoryList for incident if needed */}
                 </div>
                 {/* Illness Type */}
                <div>
                    {/* MODIFICATION START */}
                    <label htmlFor="illnessType" className="block text-gray-700 text-sm font-medium mb-1 flex items-center">
                        <span>Additional Illness register</span>
                        {/* This button now opens the modal */}
                        <button
                            type="button" 
                            onClick={() => setIsInfoModalOpen(true)}
                            className="ml-2 text-blue-500 hover:text-blue-700"
                            title="Click for more information on work-related illnesses and notifiable diseases"
                        >
                            <FaInfoCircle size={16} />
                        </button>
                    </label>
                    {/* MODIFICATION END */}
                    
                    <select 
                        id="illnessType" 
                        className="w-full p-2 border rounded-md bg-blue-50 focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm cursor-not-allowed" 
                        value={illnessType} 
                        onChange={(e) => setIllnessType(e.target.value)} 
                        disabled={!isDoctor}
                    >
                    {illnessTypeOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                    </select>
                    
                    {/* TODO: Add HistoryList for illness_type if needed */}
                </div>
            </div>
        )}

        {/* Submit Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSubmit}
             type="button"
             className={`bg-blue-600 text-white px-5 py-2 rounded-md shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-300 text-sm }`}
             
          >
            {isSubmitting ? (
                <><svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>Submitting...</>
            ) : ('Submit Note')}
          </button>
        </div>
      </form>

      {/* MODAL RENDER: This is where the modal is called and its content is defined. */}
      <InfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)}>
        <div className="space-y-6 text-sm text-gray-700">
            <div>
                <h4 className="font-bold text-base mb-2 text-gray-800">Work-related ill health / Illness</h4>
                <p>
                    Work-related ill health can include acute, recurring, and chronic health problems caused or
                    aggravated by work conditions or practices. They include musculoskeletal disorders, skin and
                    respiratory diseases, malignant cancers, diseases caused by physical agents (e.g., noise induced
                    hearing loss, vibration-caused diseases), and mental illnesses (e.g., anxiety, posttraumatic
                    stress disorder).
                </p>
            </div>

            <hr />

            <div>
                <h4 className="font-bold text-base mb-3 text-gray-800">List of notifiable diseases (The Factories Act – 1948)</h4>
                <div className="overflow-x-auto border rounded-md">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                                    S.No
                                </th>
                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Disease
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {notifiableDiseases.map((disease) => (
                                <tr key={disease.no} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 whitespace-nowrap text-center font-medium">{disease.no}</td>
                                    <td className="px-4 py-2">{disease.name}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      </InfoModal>

    </div>
  );
};

export default SignificantNotes;