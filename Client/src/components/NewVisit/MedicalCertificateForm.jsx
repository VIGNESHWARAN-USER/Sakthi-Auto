import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { data } from 'react-router-dom';

// --- Helper components (unchanged) ---
const inputClasses = `w-full p-2 border rounded-md bg-white focus:ring-2 focus:ring-blue-300 disabled:bg-gray-100 disabled:cursor-not-allowed`;
const labelClasses = "block text-sm font-medium text-gray-700 mb-1";

export const FormInput = ({ label, name, value, onChange, type = "text", className = "", disabled = false }) => (
    <div className={className}>
        <label htmlFor={name} className={labelClasses}>{label}</label>
        <input type={type} id={name} name={name} value={value || ''} onChange={onChange} disabled={disabled} className={inputClasses} />
    </div>
);

export const FormTextarea = ({ label, name, value, onChange,  className = "", disabled = false }) => (
    <div className={className}>
        <label htmlFor={name} className={labelClasses}>{label}</label>
        <textarea id={name} name={name} value={value || ''} onChange={onChange} disabled={disabled} rows="3" className={inputClasses} />
    </div>
);

export const FormSelect = ({ label, name, value, onChange, options, placeholder, className = "", disabled = false }) => (
    <div className={className}>
        <label htmlFor={name} className={labelClasses}>{label}</label>
        <select id={name} name={name} value={value || ''} onChange={onChange} disabled={disabled} className={inputClasses}>
            {placeholder && <option value="">{placeholder}</option>}
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
);

export const FormRadioGroup = ({ label, name, value, onChange, options, className = "", disabled = false }) => (
    <div className={className}>
        <label className={labelClasses}>{label}</label>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
            {options.map(opt => (
                <label key={opt} className={`flex items-center gap-2 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                    <input type="radio" name={name} value={opt} checked={value === opt} onChange={onChange} disabled={disabled} className="form-radio h-4 w-4 text-blue-600 disabled:bg-gray-200" />
                    <span className={disabled ? 'text-gray-500' : ''}>{opt}</span>
                </label>
            ))}
        </div>
    </div>
);


/**
 * A self-contained, collapsible form for a Medical Certificate of Fitness.
 * This version fetches its own data using the `aadhar` prop.
 *
 * @param {function} onDataChange - Optional callback for data changes.
 * @param {string} mrdNo - Patient's Medical Record Number.
 * @param {string} aadhar - Patient's Aadhar number (used for fetching and submitting).
 */
// --- MODIFIED: The `initialData` prop is removed. ---
const MedicalCertificateForm = ({ onDataChange,  mrdNo, aadhar }) => {
  const [showForm, setShowForm] = useState(false);
  console.log()
  // --- A constant for the default empty state, used for resetting the form. ---
  const defaultFormState = {
    employeeName: '', age: '', sex: '', date: '', empNo: '',
    department: '', jswContract: '', natureOfWork: '', covidVaccination: '',
    diagnosis: '', leaveFrom: '', leaveUpTo: '', daysLeave: '',
    rejoiningDate: '', shift: '', pr: '', sp02: '', temp: '',
    certificateFrom: '', note: '', ohcStaffSignature: '', individualSignature: ''
  };

  const [formData, setFormData] = useState(defaultFormState);

  // --- State for submission and data fetching is separated for clarity. ---
  const [isFetching, setIsFetching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState({ message: '', type: '' });

  // --- KEY CHANGE: This useEffect hook fetches data when `aadhar` changes. ---
  useEffect(() => {
    // If there's no Aadhar, reset the form and stop.
    if (!aadhar) {
      setFormData(defaultFormState);
      setShowForm(false); // Optionally hide form if no patient
      return;
    }

    const fetchCertificateData = async () => {
      setIsFetching(true);
      try {
        // We assume you have a GET endpoint like this.
        // Make sure the URL is correct.
        const response = await axios.get(`http://localhost:8000/medical-certificate/get/?aadhar=${aadhar}`);
        
        if (response.data && Object.keys(response.data).length > 0) {
          console.log("Fetched existing certificate data:", response.data);
          setFormData(response.data); // Populate the form with fetched data.
          setShowForm(true); // Automatically expand the form if data exists.
        } else {
          console.log("No existing certificate data found. Displaying empty form.");
          setFormData(defaultFormState); // Reset to empty form if no data.
        }
      } catch (error) {
        console.error("Failed to fetch medical certificate data:", error);
        setFormData(defaultFormState); // Also reset form on API error.
      } finally {
        setIsFetching(false);
      }
    };

    fetchCertificateData();
  }, [aadhar]); // This dependency array makes the hook re-run whenever `aadhar` changes.

  const toggleFormVisibility = () => {
    setShowForm(prevState => !prevState);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updatedState = { ...formData, [name]: value };
    setFormData(updatedState);
    if (onDataChange) {
      onDataChange(updatedState);
    }
  };

  // The submit handler now uses `isSubmitting` state.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmissionStatus({ message: '', type: '' });
    
    // Check for required identifiers
    if (!aadhar || !mrdNo) {
        alert("Cannot submit: Patient Aadhar and MRD Number are missing.");
        setIsSubmitting(false);
        return;
    }
    
    const payload = { ...formData, mrdNo, aadhar };

    try {
      // Your backend view for submitting is at `/medical-certificate/submit/`
      const response = await axios.post("http://localhost:8000/medical-certificate/submit/", payload);
      setSubmissionStatus({ message: response.data.message || "Certificate saved successfully!", type: 'success' });
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || 'An unknown server error occurred.';
      setSubmissionStatus({ message: errorMsg, type: 'error' });
      console.error("Submission failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };


  // --- Styles (unchanged) ---
  const cardStyle = { border: '1px solid #dee2e6', borderRadius: '0.5rem', backgroundColor: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' };
  const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', cursor: 'pointer', backgroundColor: '#f8f9fa', borderBottom: showForm ? '1px solid #dee2e6' : 'none', borderTopLeftRadius: '0.5rem', borderTopRightRadius: '0.5rem', borderBottomLeftRadius: showForm ? 0 : '0.5rem', borderBottomRightRadius: showForm ? 0 : '0.5rem' };
  const titleStyle = { margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#343a40' };
  const formContentStyle = { padding: '1.5rem', backgroundColor: '#fdfdff' };
  const sectionTitleClasses = "text-lg font-semibold text-gray-800 mb-4 border-b pb-2";

  return (
    <div style={cardStyle}>
      <div style={headerStyle} onClick={toggleFormVisibility}>
        <h2 style={titleStyle}>Medical Certificate of Fitness</h2>
        <span className="text-lg font-semibold">{showForm ? "[-]" : "[+]"}</span>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={formContentStyle}>
            {/* --- NEW: Show a loading message while fetching initial data. --- */}
            {isFetching ? (
                <div className="text-center p-8 text-gray-500">Loading certificate details...</div>
            ) : (
                <>
                    <div className="flex justify-between items-center mb-6">
                    </div>
                    <div className="space-y-8">
                        <section>
                            <h3 className={sectionTitleClasses}>Medical Leave Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                                <FormTextarea label="Diagnosis (Disease/Condition)" name="diagnosis" value={formData.diagnosis} onChange={handleChange} className="lg:col-span-3" />
                                <FormInput label="Leave From" name="leaveFrom" type="date" value={formData.leaveFrom} onChange={handleChange} />
                                <FormInput label="Leave Up To" name="leaveUpTo" type="date" value={formData.leaveUpTo} onChange={handleChange} />
                                <FormInput label="Number of Days Leave" name="daysLeave" type="number" value={formData.daysLeave} onChange={handleChange} />
                            </div>
                        </section>
                        <section>
                            <h3 className={sectionTitleClasses}>Return to Duty Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                                <FormInput label="Rejoining Duty On" name="rejoiningDate" type="date" value={formData.rejoiningDate} onChange={handleChange} />
                                <FormSelect label="Shift" name="shift" value={formData.shift} onChange={handleChange} options={["G", "A", "B", "C"]} placeholder="Select Shift..." />
                                <FormInput label="PR (/min)" name="pr" value={formData.pr} onChange={handleChange} />
                                <FormInput label="SPO2 (%)" name="sp02" value={formData.sp02} onChange={handleChange} />
                                <FormInput label="Temp (°F)" name="temp" value={formData.temp} onChange={handleChange} />
                                <FormRadioGroup label="Certificate Issued From" name="certificateFrom" value={formData.certificateFrom} onChange={handleChange} options={["Govt Hospital", "ESI Hospital", "Private Hospital"]} className="lg:col-span-3" />
                            </div>
                        </section>
                        <section>
                            <h3 className={sectionTitleClasses}>Signatures</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                <FormInput label="OHC Staff Signature" name="ohcStaffSignature" value={formData.ohcStaffSignature} onChange={handleChange} />
                                <FormInput label="Individual Signature" name="individualSignature" value={formData.individualSignature} onChange={handleChange} />
                            </div>
                        </section>
                    </div>
                    <div className="mt-8 pt-6 border-t flex items-center justify-end gap-4">
                        {submissionStatus.message && (
                            <p className={`text-sm ${submissionStatus.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{submissionStatus.message}</p>
                        )}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Submitting...' : 'Save Certificate'}
                        </button>
                    </div>
                </>
            )}
        </form>
      )}
    </div>
  );
};

export default MedicalCertificateForm;