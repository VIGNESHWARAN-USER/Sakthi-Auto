import React, { useMemo, useState, useEffect } from 'react';
import axios from 'axios';

// --- Icons for UI (Pencil, Save, Cancel) ---
const EditIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
);
const SaveIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><polyline points="20 6 9 17 4 12"></polyline></svg>
);
const CancelIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);

// --- UPDATED DETAIL CARD COMPONENT ---
const DetailCard = ({ label, value, isTextArea = false, isEditable = false, onSave }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [inputValue, setInputValue] = useState(value || '');
    const [loading, setLoading] = useState(false);

    // Update local state if the parent prop value changes
    useEffect(() => {
        setInputValue(value || '');
    }, [value]);

    const handleSave = async () => {
        if (!onSave) return;
        setLoading(true);
        // Trigger the save action passed from parent
        await onSave(inputValue);
        setLoading(false);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setInputValue(value || ''); // Revert to original
        setIsEditing(false);
    };

    return (
        <div className={`${isTextArea ? 'col-span-1 md:col-span-3' : ''}`}>
            <label className="block text-sm font-medium text-gray-500 mb-1">{label}</label>
            <div className={`relative px-4 py-3 w-full border rounded-lg shadow-sm text-sm min-h-[44px] flex items-center 
                ${isTextArea ? 'items-start' : ''} 
                ${isEditing ? 'bg-white border-blue-400 ring-2 ring-blue-50' : 'bg-gray-100 border-gray-200'}
            `}>
                
                {/* EDIT MODE */}
                {isEditing ? (
                    <div className="flex w-full items-center gap-2">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            disabled={loading}
                            className="w-full bg-transparent outline-none text-gray-800"
                            autoFocus
                        />
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={handleSave} 
                                disabled={loading}
                                className="p-1 hover:bg-green-100 rounded transition"
                                title="Save"
                            >
                                {loading ? <span className="text-xs">...</span> : <SaveIcon />}
                            </button>
                            <button 
                                onClick={handleCancel} 
                                disabled={loading}
                                className="p-1 hover:bg-red-100 rounded transition"
                                title="Cancel"
                            >
                                <CancelIcon />
                            </button>
                        </div>
                    </div>
                ) : (
                /* VIEW MODE */
                    <div className="flex w-full justify-between items-center group">
                        <div className="flex-grow text-gray-800">
                            {value ? (
                                isTextArea ? <p className="whitespace-pre-wrap">{value}</p> : value
                            ) : (
                                <span className="text-gray-400 italic">N/A</span>
                            )}
                        </div>
                        {/* Edit Button (Only appears if isEditable is true) */}
                        {isEditable && (
                            <button 
                                onClick={() => setIsEditing(true)} 
                                className="ml-2 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                                title="Edit Field"
                            >
                                <EditIcon />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const BasicDetails = ({ data }) => {
    
    // Helper function to handle the update logic
    // You would pass 'onUpdateData' from your parent page component to handle the actual API call
    const handleFieldUpdate = async (fieldKey, newValue) => {
        console.log(`Updating ${fieldKey} to:`, newValue);
        
        try {
            
            console.log("HII")
            const respose = await axios.post("http://localhost:8000/updateEmployeeData",{
                emp_no: data.emp_no,
                field: fieldKey,
                value: newValue,
                aadhar: data.aadhar
            });
            if(fieldKey==="emp_no"){
                data.emp_no=newValue;
            }
            else if(fieldKey==="mail_id_Office"){
                data.mail_id_Office=newValue;
            }
            alert("Field updated successfully, Search again to see the changes.");
        }
        catch (error) {
            console.error("Error updating field:", error);
            alert("Failed to update the field. Please try again.");
        }
    };

    // 1. Normalize Role
    const role = data?.role?.toLowerCase() || '';
    const isVisitor = role.includes('visitor');
    const isContractor = role.includes('contractor');
    const isEmployee = role.includes('employee');

    // Calculate Age
    const age = useMemo(() => {
        if (!data?.dob) return 'N/A';
        try {
            const birthDate = new Date(data.dob);
            const today = new Date();
            if (isNaN(birthDate.getTime())) return 'Invalid Date';

            let calculatedAge = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                calculatedAge--;
            }
            return calculatedAge >= 0 ? calculatedAge : 'N/A';
        } catch (error) {
            return 'Error';
        }
    }, [data?.dob]);

    if (!data) {
        return <div className="mt-8 p-4 text-center text-gray-500">No details available.</div>;
    }

    return (
        <div className="mt-6 p-4 bg-white rounded-lg shadow space-y-8">
            
            {/* --- SECTION 1: PERSONAL IDENTITY --- */}
            <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">Basic Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                    <DetailCard label="Full Name" value={data?.name} />
                    <DetailCard label="Role/Category" value={data?.role} />
                    <DetailCard label="Date of Birth" value={data?.dob} />
                    <DetailCard label="Age" value={age} />
                    <DetailCard label="Gender" value={data?.sex} />
                    <DetailCard label="Marital Status" value={data?.marital_status} />
                    <DetailCard label="Aadhar Number" value={data?.aadhar} />
                    <DetailCard label="Blood Group" value={data?.bloodgrp} />
                    <DetailCard label="Identification Mark 1" value={data?.identification_marks1} />
                    <DetailCard label="Identification Mark 2" value={data?.identification_marks2} />
                    
                    {isVisitor && (
                        <>
                            <DetailCard label="Country ID" value={data?.country_id} />
                            <DetailCard label="Other Site ID" value={data?.other_site_id} />
                        </>
                    )}
                </div>
            </div>

            {/* --- SECTION 2: EMPLOYMENT / WORK DETAILS --- */}
            {(isContractor || isEmployee || data?.emp_no) && (
                <div>
                    <h2 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">Employment & Work Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                        
                        {/* --- EDITABLE FIELD: Employee/Pass No --- */}
                        <DetailCard 
                            label="Employee/Pass No" 
                            value={data?.emp_no} 
                            isEditable={true}
                            onSave={(val) => handleFieldUpdate('emp_no', val)}
                        />

                        <DetailCard label="Designation" value={data?.designation} />
                        <DetailCard label="Department" value={data?.department} />
                        <DetailCard label="Nature of Job" value={data?.job_nature} />
                        
                        <DetailCard label={isContractor ? "Contractor Agency" : "Employer Name"} value={data?.employer} />
                        
                        <DetailCard label="Work Location" value={data?.location} />
                        <DetailCard label="Date of Joining" value={data?.doj} />
                        
                        {(isEmployee || data?.moj) && <DetailCard label="Mode of Joining" value={data?.moj} />}
                        {(isContractor || data?.contractor_status) && <DetailCard label="Contractor Status" value={data?.contractor_status} />}
                    </div>
                </div>
            )}

            {/* --- SECTION 3: VISIT DETAILS (Visitor Only) --- */}
            {isVisitor && (
                <div>
                    <h2 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">Visit Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                        <DetailCard label="Organization Name" value={data?.organization} />
                        <DetailCard label="Organization Address" value={data?.addressOrganization} />
                        <DetailCard label="Department to Visit" value={data?.visiting_department} />
                        <DetailCard label="Purpose of Visit" value={data?.visiting_purpose} />
                        <DetailCard label="Visit Date From" value={data?.visiting_date_from} />
                        <DetailCard label="Guest House Required" value={data?.stay_in_guest_house} />
                    </div>
                </div>
            )}

            {/* --- SECTION 4: SAFETY, SECURITY & COMPLIANCE --- */}
            {(data?.police_verification_no || data?.medical_validity || data?.safety_training_date) && (
                <div>
                    <h2 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">Statutory & Compliance</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                        <DetailCard label="Police Verification No" value={data?.police_verification_no} />
                        <DetailCard label="PVC Validity" value={data?.police_verification_validity} />
                        <DetailCard label="Medical Test Date" value={data?.medical_test_date} />
                        <DetailCard label="Medical Validity" value={data?.medical_validity} />
                        <DetailCard label="Safety Training Date" value={data?.safety_training_date} />
                    </div>
                </div>
            )}

            {/* --- SECTION 5: CONTACT DETAILS --- */}
            <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">Contact Info</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                    <DetailCard label="Mobile (Personal)" value={data?.phone_Personal} />
                    <DetailCard label="Email (Personal)" value={data?.mail_id_Personal} />
                    <DetailCard label="Mobile (Office)" value={data?.phone_Office} />
                    
                    {/* --- EDITABLE FIELD: Email (Office) --- */}
                    <DetailCard 
                        label="Email (Office)" 
                        value={data?.mail_id_Office} 
                        isEditable={true}
                        onSave={(val) => handleFieldUpdate('mail_id_Office', val)}
                    />
                    
                    <div className="md:col-span-3 mt-2 mb-2 border-t border-gray-100"></div>
                    <DetailCard label="Emergency Contact Name" value={data?.emergency_contact_person} />
                    <DetailCard label="Relation" value={data?.emergency_contact_relation} />
                    <DetailCard label="Emergency Mobile" value={data?.emergency_contact_phone} />
                </div>
            </div>

            {/* --- SECTION 6: ADDRESSES --- */}
            <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">Address Details</h2>
                
                <h3 className="text-md font-bold text-gray-600 mb-2 mt-4 uppercase">Permanent Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                    <DetailCard label="City/Town" value={data?.permanent_area} />
                    <DetailCard label="State" value={data?.permanent_state} />
                    <DetailCard label="Nationality" value={data?.permanent_nationality} />
                    <DetailCard label="Full Address" value={data?.permanent_address} isTextArea={true} />
                </div>

                <div className="border-t my-4"></div>

                <h3 className="text-md font-bold text-gray-600 mb-2 mt-4 uppercase">Residential / Local Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                    <DetailCard label="City/Town" value={data?.residential_area} />
                    <DetailCard label="State" value={data?.residential_state} />
                    <DetailCard label="Nationality" value={data?.residential_nationality} />
                    <DetailCard label="Full Address" value={data?.residential_address} isTextArea={true} />
                </div>
            </div>

        </div>
    );
};

export default BasicDetails;