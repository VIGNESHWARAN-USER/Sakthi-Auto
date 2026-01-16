import React, { useState, useEffect } from 'react';
import axios from 'axios';

// --- Reusable helper components (unchanged) ---
const inputClasses = `w-full p-2 border rounded-md bg-white focus:ring-2 focus:ring-blue-300 disabled:bg-gray-100 disabled:cursor-not-allowed`;
const labelClasses = "block text-sm font-medium text-gray-700 mb-1";

export const FormInput = ({ label, name, value, onChange, type = "text", className = "", disabled = false }) => (
    <div className={className}><label htmlFor={name} className={labelClasses}>{label}</label><input type={type} id={name} name={name} value={value || ''} onChange={onChange} disabled={disabled} className={inputClasses} /></div>
);
export const FormTextarea = ({ label, name, value, onChange, className = "", disabled = false }) => (
    <div className={className}><label htmlFor={name} className={labelClasses}>{label}</label><textarea id={name} name={name} value={value || ''} onChange={onChange} disabled={disabled} rows="3" className={inputClasses} /></div>
);
export const FormRadioGroup = ({ label, name, value, onChange, options, className = "", disabled = false }) => (
    <div className={className}><label className={labelClasses}>{label}</label><div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">{options.map(opt => (<label key={opt} className={`flex items-center gap-2 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}><input type="radio" name={name} value={opt} checked={value === opt} onChange={onChange} disabled={disabled} className="form-radio h-4 w-4 text-blue-600 disabled:opacity-50" /><span className={disabled ? 'text-gray-500' : ''}>{opt}</span></label>))}</div></div>
);


const PersonalLeaveCertificateForm = ({ aadhar, mrdNo, onDataChange, isDoctor, logoSrc }) => {
  // ----> ADD THIS LINE TO DEBUG <----
  console.log(`[Certificate Form] Received isDoctor prop with value:`, isDoctor);

  const [showForm, setShowForm] = useState(false);

  const defaultState = {
    employeeName: '', age: '', sex: '', date: '', empNo: '', department: '',
    jswContract: '', natureOfWork: '', hasSurgicalHistory: '', covidVaccination: '',
    personalLeaveDescription: '', leaveFrom: '', leaveUpTo: '', daysLeave: '',
    rejoiningDate: '', bp: '', pr: '', spo2: '', temp: '', note: '',
    ohcStaffSignature: '', individualSignature: '',
  };
  const [formData, setFormData] = useState(defaultState);

  const [isFetching, setIsFetching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (!aadhar) {
      setFormData(defaultState);
      setShowForm(false);
      return;
    }
    
    const fetchData = async () => {
      setIsFetching(true);
      try {
        const response = await axios.get(`http://localhost:8000/personal-leave/get/?aadhar=${aadhar}`);
        if (response.data && Object.keys(response.data).length > 0) {
          setFormData(response.data);
          setShowForm(true);
        } else {
          setFormData(defaultState);
        }
      } catch (error) {
        console.error("Error fetching personal leave data:", error);
        setFormData(defaultState);
      } finally {
        setIsFetching(false);
      }
    };
    fetchData();
  }, [aadhar]);

  const toggleFormVisibility = () => setShowForm(prevState => !prevState);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updatedFormData = { ...formData, [name]: value };
    setFormData(updatedFormData);
    if (onDataChange) {
      onDataChange(updatedFormData);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isDoctor) {
        alert("Only doctors can submit this form.");
        return;
    }
    setIsSubmitting(true);
    setStatusMessage({ text: '', type: '' });
    
    const payload = { ...formData, aadhar, mrdNo };

    try {
        const response = await axios.post('http://localhost:8000/personal-leave/save/', payload);
        setStatusMessage({ text: response.data.message, type: 'success' });
    } catch (error) {
        const errorText = error.response?.data?.error || "Failed to save data.";
        setStatusMessage({ text: errorText, type: 'error' });
        console.error("Submission error:", error);
    } finally {
        setIsSubmitting(false);
    }
  };

  const cardStyle = { border: '1px solid #dee2e6', borderRadius: '0.5rem', backgroundColor: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' };
  const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', cursor: 'pointer', backgroundColor: '#f8f9fa', borderBottom: showForm ? '1px solid #dee2e6' : 'none', borderTopLeftRadius: '0.5rem', borderTopRightRadius: '0.5rem', borderBottomLeftRadius: showForm ? 0 : '0.5rem', borderBottomRightRadius: showForm ? 0 : '0.5rem' };
  const titleStyle = { margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#343a40' };
  const formContentStyle = { padding: '1.5rem', backgroundColor: '#fdfdff' };
  const sectionTitleClasses = "text-lg font-semibold text-gray-800 mb-4 border-b pb-2";
  
  // This logic correctly uses the `isDoctor` prop
  const allFieldsDisabled = !isDoctor || isSubmitting;

  return (
    <div style={cardStyle}>
      <div style={headerStyle} onClick={toggleFormVisibility}>
        <h2 style={titleStyle}>Personal Leave Details</h2>
        <span className="text-lg font-semibold">{showForm ? "[-]" : "[+]"}</span>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={formContentStyle}>
          {isFetching ? (
            <div className="p-4 text-center">Loading...</div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-6">
                {logoSrc && <img src={logoSrc} className="h-12" alt="Company Logo" />}
              </div>
              <div className="space-y-8">
                <section>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <FormTextarea label="Personal Leave Description" name="personalLeaveDescription" value={formData.personalLeaveDescription} onChange={handleChange} disabled={allFieldsDisabled} className="md:col-span-2"/>
                        <FormInput label="Leave From" name="leaveFrom" type="date" value={formData.leaveFrom} onChange={handleChange} disabled={allFieldsDisabled}/>
                        <FormInput label="Leave Up To" name="leaveUpTo" type="date" value={formData.leaveUpTo} onChange={handleChange} disabled={allFieldsDisabled}/>
                        <FormInput label="Number of Days Leave" name="daysLeave" type="number" value={formData.daysLeave} onChange={handleChange} disabled={allFieldsDisabled}/>
                        <FormInput label="Re-joining Duty On" name="rejoiningDate" type="date" value={formData.rejoiningDate} onChange={handleChange} disabled={allFieldsDisabled} className="md:col-span-2"/>
                    </div>
                </section>
                <section>
                    <h3 className={sectionTitleClasses}>Vitals</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
                        <FormInput label="BP" name="bp" value={formData.bp} onChange={handleChange} disabled={allFieldsDisabled}/>
                        <FormInput label="PR" name="pr" value={formData.pr} onChange={handleChange} disabled={allFieldsDisabled}/>
                        <FormInput label="SPO2" name="spo2" value={formData.spo2} onChange={handleChange} disabled={allFieldsDisabled}/>
                        <FormInput label="Temp" name="temp" value={formData.temp} onChange={handleChange} disabled={allFieldsDisabled}/>
                    </div>
                </section>
                <section>
                     <h3 className={sectionTitleClasses}>Signatures</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <FormInput label="OHC Staff Signature" name="ohcStaffSignature" value={formData.ohcStaffSignature} onChange={handleChange} disabled={allFieldsDisabled}/>
                        <FormInput label="Individual Signature" name="individualSignature" value={formData.individualSignature} onChange={handleChange} disabled={allFieldsDisabled}/>
                     </div>
                </section>
              </div>
              <div className="mt-8 pt-4 border-t flex items-center justify-end gap-4">
                {statusMessage.text && (
                    <p className={`text-sm ${statusMessage.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                        {statusMessage.text}
                    </p>
                )}
                <button type="submit" disabled={allFieldsDisabled}
                    className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed">
                    {isSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </>
          )}
        </form>
      )}
    </div>
  );
};

export default PersonalLeaveCertificateForm;