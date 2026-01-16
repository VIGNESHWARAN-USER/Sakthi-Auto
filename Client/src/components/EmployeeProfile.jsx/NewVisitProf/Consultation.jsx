// ConsultationDisplay.jsx
import React, { useEffect, useState } from 'react';
import moment from 'moment'; 

// --- Reusable Detail Item Component ---
const DetailItem = ({ label, value, isFullWidth = false, isTextArea = false }) => (
    <div className={isFullWidth ? "md:col-span-2" : ""}> 
        <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
        <div className={`px-3 py-2 w-full bg-gray-50 border border-gray-200 rounded-md shadow-sm text-gray-800 text-sm min-h-[38px] ${isTextArea ? 'whitespace-pre-wrap' : 'flex items-center'}`}>
            {value !== null && value !== undefined && value !== '' ? (
                 value
            ) : (
                <span className="text-gray-400 italic">N/A</span>
            )}
        </div>
    </div>
);

// --- Main Consultation Display Component ---
const ConsultationDisplay = ({ data, type }) => {
    const [displayData, setDisplayData] = useState(null);

    const caseTypeLabels = {
        'occupationalillness': 'Occupational Illness',
        'occupationalinjury': 'Occupational Injury',
        'occ-disease': 'Occ Disease',
        'non-occupational': 'Non-Occupational',
        'domestic': 'Domestic',
        'commutation-injury': 'Commutation Injury',
        'other': 'Other',
    };

    useEffect(() => {
        if (data) {
            const consult = data;
            setDisplayData({
                complaints: consult.complaints || "N/A",
                examination: consult.examination || "N/A", // General
                systematic: consult.systematic || "N/A",   // ADDED: Systemic
                lexamination: consult.lexamination || "N/A", // Local
                diagnosis: consult.diagnosis || "N/A",       // FIXED: Mapped correctly
                procedure_notes: consult.procedure_notes || "N/A", // ADDED: Mapped correctly
                obsnotes: consult.obsnotes || "N/A",
                advice: consult.advice || "N/A",
                
                // Case Details
                case_type: caseTypeLabels[consult.case_type] || consult.case_type || "N/A",
                other_case_details: consult.other_case_details || "N/A",
                special_cases: consult.special_cases || "N/A", // ADDED
                
                // Investigation / Follow up
                investigation_details: consult.investigation_details || "N/A",
                follow_up_date: consult.follow_up_date ? moment(consult.follow_up_date).format('LL') : 'N/A',
                follow_up_mrd_history: Array.isArray(consult.follow_up_mrd_history) && consult.follow_up_mrd_history.length > 0 
                    ? consult.follow_up_mrd_history.join(', ') 
                    : "N/A", // ADDED

                // Referral
                referral: consult.referral ? (consult.referral === 'yes' ? 'Yes' : 'No') : 'N/A',
                hospital_name: consult.hospital_name || "N/A",
                speaciality: consult.speciality || "N/A",
                doctor_name: consult.doctor_name || "N/A",
                
                // Shifting / Ambulance (ADDED)
                shifting_required: consult.shifting_required ? (consult.shifting_required === 'yes' ? 'Yes' : 'No') : 'N/A',
                shifting_notes: consult.shifting_notes || "N/A",
                ambulance_details: consult.ambulance_details || "N/A",

                bookedDoctor: consult.bookedDoctor || "N/A",
                submittedDoctor: consult.submittedDoctor || "N/A",
                submittedNurse: consult.submittedNurse || "N/A",
            });
        } else {
            setDisplayData(null);
        }
    }, [data]);

    if (!displayData) {
        return (
            <div className="mt-6 p-6 bg-white rounded-lg shadow text-center text-gray-500">
                No consultation data available to display.
            </div>
        );
    }

    // Logic for conditional sections
    const wasOtherCaseType = data?.consultation?.case_type === 'other';
    const needsReferral = data?.consultation?.referral === 'yes';
    const needsShifting = data?.consultation?.shifting_required === 'yes';
    const isVisitor = type === 'Visitor';

    return (
        <div className="mt-6 p-6 bg-white rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-3">Consultation Details</h2>

            {/* Core Consultation Notes Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-6">
                <DetailItem label="Complaints" value={displayData.complaints} isTextArea={true} isFullWidth={true} />
                <DetailItem label="General Examination" value={displayData.examination} isTextArea={true} isFullWidth={true} />
                {/* ADDED: Systemic Exam */}
                <DetailItem label="Systemic Examination" value={displayData.systematic} isTextArea={true} isFullWidth={true} />
                <DetailItem label="Local Examination" value={displayData.lexamination} isTextArea={true} isFullWidth={true} />
                
                {/* FIXED: Diagnosis and Procedure Notes split */}
                <DetailItem label="Diagnosis Notes" value={displayData.diagnosis} isTextArea={true} isFullWidth={true} />
                <DetailItem label="Procedure Notes" value={displayData.procedure_notes} isTextArea={true} isFullWidth={true} />
                
                <DetailItem label="Observation / Ward Notes" value={displayData.obsnotes} isTextArea={true} isFullWidth={true} />
            </div>

            {/* Case Details Section */}
            <h3 className="text-xl font-semibold mb-4 text-gray-700 border-t pt-4">Case Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-6">
                <DetailItem label="Case Type" value={displayData.case_type} />
                {wasOtherCaseType && (
                    <DetailItem label="Other Case Details" value={displayData.other_case_details} isFullWidth={true} />
                )}
                <DetailItem label="Special Cases" value={displayData.special_cases} />
            </div>

             {/* Actions / Recommendations Section */}
            <h3 className="text-xl font-semibold mb-4 text-gray-700 border-t pt-4">Recommendations & Follow-up</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-6">
                <DetailItem label="Investigation" value={displayData.investigation_details} isTextArea={true} isFullWidth={true} />
                 <DetailItem label="Advice" value={displayData.advice} isTextArea={true} isFullWidth={true} />
                 <DetailItem label="Follow Up Date" value={displayData.follow_up_date} />
                 {/* ADDED: Previous MRD History */}
                 <DetailItem label="Reference MRD History" value={displayData.follow_up_mrd_history} isFullWidth={true} />
            </div>

            {/* Shifting Section - ADDED */}
            {(!isVisitor && displayData.shifting_required !== 'N/A') && (
                <>
                    <h3 className="text-xl font-semibold mb-4 text-gray-700 border-t pt-4">Shifting & Ambulance</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-6">
                        <DetailItem label="Shifting Required?" value={displayData.shifting_required} />
                        {needsShifting && (
                            <>
                                <DetailItem label="Shifting Notes" value={displayData.shifting_notes} isTextArea={true} />
                                <DetailItem label="Ambulance / Consumables" value={displayData.ambulance_details} isTextArea={true} />
                            </>
                        )}
                    </div>
                </>
            )}

            {/* Referral Section */}
            {!isVisitor && (
                <>
                    <h3 className="text-xl font-semibold mb-4 text-gray-700 border-t pt-4">Referral Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-6">
                        <DetailItem label="Referral Needed?" value={displayData.referral} />
                        {needsReferral && (
                            <>
                                <DetailItem label="Referred Hospital" value={displayData.hospital_name} />
                                <DetailItem label="Referred Speciality" value={displayData.speaciality} />
                                <DetailItem label="Referred Doctor" value={displayData.doctor_name} />
                            </>
                        )}
                    </div>
                </>
            )}

            <h3 className="text-xl font-semibold mb-4 text-gray-700 border-t pt-4">Submission Information</h3>
            <div className="grid grid-cols-3 md:grid-cols-3 gap-x-6 gap-y-4">
                
                <DetailItem label="Submitted Nurse" value={displayData.submittedNurse} />
                <DetailItem label="Booked Doctor" value={displayData.bookedDoctor} />                
                <DetailItem label="Consulted Doctor" value={displayData.submittedDoctor} />

            </div>

        </div>
    );
};

export default ConsultationDisplay;