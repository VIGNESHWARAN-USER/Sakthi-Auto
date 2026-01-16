import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../Sidebar"; 
import { FaUserCircle } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import NewVisit from "./NewVisitProf/NewVisit"; 
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import axios from "axios";

// --- HealthSummary Content Component ---
const HealthSummaryContent = ({ visitData }) => (
    <div className="space-y-4 text-sm">
        <h4 className="font-semibold text-base text-blue-700 mb-2">Visit Health Summaries:</h4>
        {!visitData ? (
             <p className="text-gray-500">Loading visit history...</p>
        ) : visitData.length > 0 ? (
            visitData.map((visit, index) => (
                <div key={visit.id || index} className="p-3 border rounded-md bg-gray-50 shadow-sm mb-3">
                    <p><span className="font-semibold">Visit Date:</span> {visit.entry_date ? new Date(visit.entry_date).toLocaleDateString() : 'N/A'}</p>
                    <p><span className="font-semibold">Visit Summary:</span> {visit.healthsummary || "N/A"}</p>
                </div>
            ))
        ) : (
            <p className="text-gray-500">No visit health summary entries found.</p>
        )}
    </div>
);

// --- Remarks/Defaults Content Component ---
const RemarksDefaultsContent = ({ visitData }) => (
    <div className="space-y-4 text-sm">
        <h4 className="font-semibold text-base text-blue-700 mb-2">Visit-Specific Remarks:</h4>
         {!visitData ? (
             <p className="text-gray-500">Loading visit history...</p>
        ) : visitData.length > 0 ? (
            visitData.map((visit, index) => (
                <div key={visit.id || index} className="p-3 border rounded-md bg-gray-50 shadow-sm mb-3">
                    <p><span className="font-semibold">Visit Date:</span> {visit.entry_date ? new Date(visit.entry_date).toLocaleDateString() : 'N/A'}</p>
                    <p><span className="font-semibold">Remarks:</span> {visit.remarks || "None"}</p>
                </div>
            ))
        ) : (
            <p className="text-gray-500">No visit-specific remarks found.</p>
        )}
    </div>
);

// --- Significant Notes Content Component ---
const SignificantNotesContent = ({ visitData }) => (
    <div className="space-y-4 text-sm">
        <h4 className="font-semibold text-base text-blue-700 mb-2">Visit-Specific Significant Details:</h4>
         {!visitData ? (
             <p className="text-gray-500">Loading visit history...</p>
        ) : visitData.length > 0 ? (
            visitData.map((visit, index) => (
                <div key={visit.id || index} className="p-3 border rounded-md bg-gray-50 shadow-sm mb-3">
                    <p><span className="font-semibold">Visit Date:</span> {visit.entry_date ? new Date(visit.entry_date).toLocaleDateString() : 'N/A'}</p>
                    <p><span className="font-semibold">Communicable Disease:</span> {visit.communicable_disease || "N/A"}</p>
                    <p><span className="font-semibold">Notifiable Disease:</span> {visit.notifiable_disease || "N/A"}</p>
                    {visit.injury_type &&
                        <p><span className="font-semibold">Injury:</span> {visit.injury_type} ({visit.injury_cause || "No Cause Specified"})</p>
                    }
                </div>
            ))
        ) : (
            <p className="text-gray-500">No visit-specific significant details found.</p>
        )}
    </div>
);

// --- EmploymentStatusContent Component ---
const EmploymentStatusContent = ({
    employmentHistory,
    isLoadingHistory,
    currentStatus,
    currentDateSince,
    transferredToDetail, 
    otherReasonDetail,   
    onStatusChange,
    onDateChange,
    onTransferredToChange, 
    onOtherReasonChange,   
    onSubmit,
    isSubmitting
}) => (
    <div className="space-y-6 text-sm">
        {/* Status History Section */}
        <div>
            <h4 className="font-semibold text-base text-blue-700 mb-3 border-b pb-2">Status History</h4>
            {isLoadingHistory ? (
                <p className="text-gray-500">Loading status history...</p>
            ) : employmentHistory && employmentHistory.length > 0 ? (
                <div className="max-h-60 overflow-y-auto space-y-3 pr-2">
                    {employmentHistory.map((statusEntry, index) => (
                            <div key={statusEntry.id || index} className="p-3 border rounded-md bg-gray-50 shadow-sm">
                                <div className="flex justify-between">
                                    <p><span className="font-semibold text-gray-700">Status:</span> {statusEntry.status || statusEntry.employeestatus || "N/A"}</p>
                                    <p className="text-xs text-gray-500">{statusEntry.entry_date ? `Recorded: ${statusEntry.entry_date}` : ''}</p>
                                </div>
                                <p><span className="font-semibold text-gray-700">Since:</span> {statusEntry.since_date || "N/A"}</p>
                                
                                {statusEntry.transfer_details && (
                                    <p className="text-gray-600 mt-1"><span className="font-semibold">Transferred To:</span> {statusEntry.transfer_details}</p>
                                )}
                                {statusEntry.other_reason_details && (
                                    <p className="text-gray-600 mt-1"><span className="font-semibold">Reason:</span> {statusEntry.other_reason_details}</p>
                                )}
                            </div>
                        ))
                    }
                </div>
            ) : (
                <p className="text-gray-500">No status history found.</p>
            )}
        </div>

        {/* Update Status Form */}
        <form onSubmit={onSubmit} className="space-y-4 pt-4 border-t">
            <h4 className="font-semibold text-base text-blue-700 mb-2">Update Current Status</h4>
            <div className="flex flex-col">
                <label htmlFor="status" className="mb-1 text-gray-700 font-medium">New Status</label>
                <select
                    name="status" id="status" value={currentStatus}
                    onChange={(e) => onStatusChange(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-lg shadow-sm px-3 py-2 bg-white"
                >
                    <option value="Active">Active</option>
                    <option value="Resigned">Resigned</option>
                    <option value="Terminated">Terminated</option>
                    <option value="Unauthorised Absence">Unauthorised Absence</option>
                    <option value="Transferred">Transferred</option>
                    <option value="Deceased">Deceased</option>
                    <option value="Retired">Retired</option>
                    <option value="Other">Other</option>
                </select>
            </div>

            {currentStatus === "Transferred" && (
                <div className="flex flex-col">
                    <label htmlFor="transferred_to_detail" className="mb-1 text-gray-700 font-medium">
                        Transferred To (Area/Department) <span className="text-red-500">*</span>
                    </label>
                    <input type="text" id="transferred_to_detail" value={transferredToDetail} onChange={(e) => onTransferredToChange(e.target.value)} required className="w-full border px-3 py-2 rounded-lg" />
                </div>
            )}

            {currentStatus === "Other" && (
                <div className="flex flex-col">
                    <label htmlFor="other_reason_detail" className="mb-1 text-gray-700 font-medium">
                        Reason for 'Other' Status <span className="text-red-500">*</span>
                    </label>
                    <input type="text" id="other_reason_detail" value={otherReasonDetail} onChange={(e) => onOtherReasonChange(e.target.value)} required className="w-full border px-3 py-2 rounded-lg" />
                </div>
            )}

            <div className="flex flex-col">
                <label htmlFor="date_since" className="mb-1 text-gray-700 font-medium">Date Since <span className="text-red-500">*</span></label>
                <input type="date" value={currentDateSince} onChange={(e) => onDateChange(e.target.value)} id="date_since" required className="w-full border px-3 py-2 rounded-lg" />
            </div>

            <button type="submit" disabled={isSubmitting} className={`w-full font-bold py-2 px-4 rounded-lg text-white ${isSubmitting ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-700'}`}>
                {isSubmitting ? 'Submitting...' : 'Submit New Status'}
            </button>
        </form>
    </div>
);

// --- Modal Component ---
const InfoModal = ({ isOpen, onClose, title, children }) => {
     return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: -20 }}
                        className="fixed z-50 bg-white rounded-xl shadow-2xl w-full max-w-lg mx-auto overflow-hidden"
                        style={{ top: '10vh', left: '50%', transform: 'translateX(-50%)' }} // Centering fix
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                            <h3 className="text-lg font-semibold text-blue-800">{title}</h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-red-600"><X size={20} /></button>
                        </div>
                        <div className="p-5 max-h-[70vh] overflow-y-auto">
                            {children}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

// --- Main EmployeeProfile Component ---
const EmployeeProfile = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const accessLevel = localStorage.getItem('accessLevel');

    const [employeeData, setEmployeeData] = useState(null);
    const [notes, setNotes] = useState([]); // Visit notes
    const [employmentHistoryState, setEmploymentHistoryState] = useState([]); // Status History
    const [isLoadingEmployee, setIsLoadingEmployee] = useState(true);
    const [isLoadingNotes, setIsLoadingNotes] = useState(false);
    const [error, setError] = useState(null);

    // Form State
    const [employeestatus, setEmployeestatus] = useState("Active");
    const [dateSince, setDateSince] = useState("");
    const [transferredToDetail, setTransferredToDetail] = useState("");
    const [otherReasonDetail, setOtherReasonDetail] = useState("");
    const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContentId, setModalContentId] = useState(null);

    // --- Fetch Data Function (UPDATED) ---
    const fetchNotesAndStatus = useCallback(async (idValue) => {
        if (!idValue) return;
        setIsLoadingNotes(true); 
        setError(null);
        try {
            // Ensure endpoint matches your backend urls.py
            const response = await axios.get(`http://localhost:8000/get_notes/${idValue}`);
            
            console.log("Fetched Data:", response.data);

            // 1. Handle Notes (Visit history)
            if (Array.isArray(response.data.notes)) {
                setNotes(response.data.notes);
            } else {
                setNotes([]);
            }

            // 2. Handle Status History
            if (Array.isArray(response.data.status_history)) {
                setEmploymentHistoryState(response.data.status_history);
                console.log("Employment History:", response.data.status_history);   
            } else {
                // Fallback for empty or unexpected structure
                setEmploymentHistoryState([]);
            }

        } catch (err) {
            console.error("Error fetching notes/status:", err);
            setNotes([]);
            setEmploymentHistoryState([]);
        } finally {
            setIsLoadingNotes(false);
        }
    }, []);

    // --- Submit Handler (Same logic, slightly cleaner) ---
    const handleSubmitStatus = async (e) => {
        e.preventDefault();
        const identifier = employeeData?.aadhar || employeeData?.emp_no || employeeData?.country_id;
        const idType = employeeData?.aadhar ? 'aadhar' : employeeData?.emp_no ? 'emp_no' : employeeData?.country_id ? 'country_id' : null;

        if (!identifier) { alert("Identifier missing."); return; }

        setIsSubmittingStatus(true);
        const payload = {
            identifier: identifier,
            id_type: idType,
            status: employeestatus,
            date_since: dateSince,
            transfer_details: employeestatus === "Transferred" ? transferredToDetail : "",
            other_reason_details: employeestatus === "Other" ? otherReasonDetail : ""
        };

        try {
            const response = await fetch("http://localhost:8000/update_employee_status/", {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
            });
            const result = await response.json();
            
            if (response.ok && result.success) {
                alert("Status updated successfully!");
                // Update local Badge
                setEmployeeData(prev => ({
                    ...prev,
                    status: { status: employeestatus, date_since: dateSince }
                }));
                // Refresh History
                fetchNotesAndStatus(identifier);
                closeModal();
                setTransferredToDetail(""); setOtherReasonDetail("");
            } else {
                alert(`Error: ${result.message}`);
            }
        } catch (error) {
            alert(`Submit failed: ${error.message}`);
        } finally {
            setIsSubmittingStatus(false);
        }
    };

    // --- Init Effect ---
    useEffect(() => {
        const initialData = location.state?.data;
        if (initialData && (initialData.emp_no || initialData.aadhar || initialData.country_id)) {
            setEmployeeData(initialData);
            
            // Set current dropdown value based on data
            const currentStat = (typeof initialData.status === 'object') ? initialData.status?.status : initialData.status;
            setEmployeestatus(currentStat || "Active");
            setIsLoadingEmployee(false);

            // Fetch History using Aadhar (preferred) or others
            const idToFetch = initialData.aadhar || initialData.emp_no || initialData.country_id;
            fetchNotesAndStatus(idToFetch);
        } else {
            setError("No employee data found.");
            setIsLoadingEmployee(false);
        }
    }, [location.state, fetchNotesAndStatus]);

    const handleStatusDropdownChange = (val) => {
        setEmployeestatus(val);
        if (val !== "Transferred") setTransferredToDetail("");
        if (val !== "Other") setOtherReasonDetail("");
    };
    
    // --- Loading / Access Checks ---
    if (isLoadingEmployee) return <div className="p-10">Loading...</div>;
    if (error && !employeeData) return <div className="p-10 text-red-600">{error}</div>;
    if (!["nurse", "doctor", "hr"].includes(accessLevel)) return <div className="p-10 text-red-600">Access Denied</div>;
    
    const cardDetails = [
        { id: 'health', label: 'Health Summary', Component: HealthSummaryContent },
        { id: 'remarks', label: 'Remarks/Defaults', Component: RemarksDefaultsContent },
        { id: 'notes', label: 'Significant Notes', Component: SignificantNotesContent },
        { id: 'employment', label: 'Employment Status', Component: EmploymentStatusContent },
    ];

    const handleButtonClick = (cardId) => { setModalContentId(cardId); setIsModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); setModalContentId(null); };

    // Badge Logic
    let statusText = 'Active';
    let statusBgColor = 'bg-gray-400';
    const currentStatusFromData = (typeof employeeData.status === 'object') ? employeeData.status?.status : employeeData.status;
    
    if (currentStatusFromData) {
        statusText = currentStatusFromData;
        const lower = statusText.toLowerCase();
        if(lower === 'active') statusBgColor = 'bg-green-500';
        else if(lower === 'resigned') statusBgColor = 'bg-orange-500';
        else if(lower === 'terminated') statusBgColor = 'bg-red-600';
        else if(lower === 'transferred') statusBgColor = 'bg-blue-500';
    }
    
    
    return (
        <div className="h-screen w-full flex bg-gradient-to-br from-blue-300 to-blue-400">
            <Sidebar />
            <div className="flex-1 h-screen overflow-y-auto p-6 space-y-6">
                <div className="bg-white shadow-lg rounded-xl p-6 flex flex-col md:flex-row md:space-x-8 items-center border-t-4 border-blue-600">
                    {/* Profile Header */}
                     <div className="flex flex-col items-center text-center md:w-1/5 space-y-2 mb-4 md:mb-0">
                         {employeeData.profilepic_url ? (
                             <img src={employeeData.profilepic_url} alt="Profile" className="w-32 h-32 rounded-full object-cover border-2 border-blue-200" />
                         ) : <FaUserCircle className="text-blue-600 text-7xl w-32 h-32" />
                         
                         }
                         {(employeeData.consultation?.special_cases === "Yes" || employeeData.fitnessassessment?.special_cases === "Yes") && (<span className={`relative bottom-8 left-10 w-5 h-5 rounded-full border-2 border-white bg-red-500 `}></span>)}
                         <span className={`px-3 py-1 rounded text-xs font-bold text-white ${statusBgColor}`}>{statusText}</span>
                         <h2 className="text-xl font-bold text-blue-800">{employeeData.name}</h2>
                         <p className="text-sm text-gray-500">{employeeData.emp_no || employeeData.aadhar}</p>  
                     </div>

                    {/* Details */}
                    <div className="w-full md:flex-1">
                         <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm w-full">
                            <p className="p-2 bg-gray-50 rounded border-l-4 border-blue-500"><b>Gender:</b> {employeeData.sex}</p>
                            <p className="p-2 bg-gray-50 rounded border-l-4 border-blue-500"><b>Department:</b> {employeeData.department}</p>
                            <p className="p-2 bg-gray-50 rounded border-l-4 border-blue-500"><b>Designation:</b> {employeeData.designation}</p>
                            <p className="p-2 bg-gray-50 rounded border-l-4 border-blue-500"><b>Employer:</b> {employeeData.employer}</p>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm w-full mt-6">
                            {accessLevel !== "hr" && cardDetails.map((card) => (
                                <button key={card.id} onClick={() => handleButtonClick(card.id)} className="py-2 px-4 rounded bg-blue-500 text-white hover:bg-blue-600 font-bold">
                                    {card.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <InfoModal isOpen={isModalOpen} onClose={closeModal} title={cardDetails.find(c => c.id === modalContentId)?.label}>
                    {(() => {
                        const cardInfo = cardDetails.find(c => c.id === modalContentId);
                        if (!cardInfo) return null;
                        const CardComponent = cardInfo.Component;
                        return <CardComponent 
                            visitData={notes} // Pass visit history
                            employmentHistory={employmentHistoryState} // Pass Status History
                            isLoadingHistory={isLoadingNotes}
                            currentStatus={employeestatus}
                            currentDateSince={dateSince}
                            transferredToDetail={transferredToDetail}
                            otherReasonDetail={otherReasonDetail}
                            onStatusChange={handleStatusDropdownChange}
                            onDateChange={setDateSince}
                            onTransferredToChange={setTransferredToDetail}
                            onOtherReasonChange={setOtherReasonDetail}
                            onSubmit={handleSubmitStatus}
                            isSubmitting={isSubmittingStatus}
                        />;
                    })()}
                </InfoModal>

                <NewVisit data={employeeData} />
            </div>
        </div>
    );
};

export default EmployeeProfile;