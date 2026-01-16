import React, { useEffect, useState } from 'react';
import axios from 'axios';
import SignificantNotes from './SignificantNotes'; 

// --- INTERNAL COMPONENT: AlcoholAbuseForm ---
const AlcoholAbuseForm = ({ initialData, patientEmpNo, isDoctor, mrdNo, aadhar }) => {
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    alcoholBreathSmell: '', speech: '', drynessOfMouth: '', drynessOfLips: '',
    cnsPupilReaction: '', handTremors: '', alcoholAnalyzerStudy: '', remarks: '', advice: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      if (Object.values(initialData).some(val => val && String(val).length > 0)) {
        setShowForm(true);
      }
    } else {
        setFormData({
            alcoholBreathSmell: '', speech: '', drynessOfMouth: '', drynessOfLips: '',
            cnsPupilReaction: '', handTremors: '', alcoholAnalyzerStudy: '', remarks: '', advice: '',
        });
    }
  }, [initialData]);

  const toggleFormVisibility = () => setShowForm(prevState => !prevState);
  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleAlcoholFormSubmit = async (e) => {
    e.preventDefault();
    if (!isDoctor || !patientEmpNo) {
        alert("Cannot submit. Ensure you are logged in as a doctor and patient data is available.");
        return;
    }
    if (!Object.values(formData).some(val => val && String(val).trim() !== '')) {
        alert("Please fill in at least one field before submitting.");
        return;
    }
    if(!mrdNo || !aadhar) {
      alert("Please make entry to get the MRD number first!")
      return
    }
    setIsSubmitting(true);
    const payload = {
        ...formData, empNo: patientEmpNo, aadhar, mrdNo,
        date: new Date().toISOString().split('T')[0],
    };
    
    try {
        const response = await axios.post("http://localhost:8000/add_alcohol_form_data/", payload);
        if (response.status === 200 || response.status === 201) {
            alert(response.data.message || "Alcohol Abuse details submitted successfully!");
        } else {
            alert(`Error submitting Alcohol Abuse details: ${response.data?.error || response.statusText}`);
        }
    } catch (error) {
        console.error("Error submitting alcohol form:", error);
        alert(`An error occurred while submitting Alcohol Abuse details: ${error.response?.data?.error || error.message}`);
    } finally {
        setIsSubmitting(false);
    }
  };

  const cardStyle = { border: '1px solid #dee2e6', borderRadius: '0.5rem', backgroundColor: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' };
  const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', cursor: 'pointer', backgroundColor: '#f8f9fa', borderBottom: showForm ? '1px solid #dee2e6' : 'none', borderTopLeftRadius: '0.5rem', borderTopRightRadius: '0.5rem', borderBottomLeftRadius: showForm ? 0 : '0.5rem', borderBottomRightRadius: showForm ? 0 : '0.5rem' };
  const titleStyle = { margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#343a40' };
  const formContentStyle = { padding: '1.5rem', backgroundColor: '#fdfdff' };
  const inputClasses = `w-full p-3 border rounded-lg bg-blue-50 focus:ring-2 focus:ring-blue-300 disabled:bg-gray-100 disabled:cursor-not-allowed`;
  const textAreaClasses = `w-full p-4 border rounded-lg bg-blue-50 focus:ring-2 focus:ring-blue-300 disabled:bg-gray-100 disabled:cursor-not-allowed`;
  const labelClasses = "block text-gray-700 mb-2 text-lg font-medium";

  return (
    <div style={cardStyle}>
        <div style={headerStyle} onClick={toggleFormVisibility}>
            <h2 style={titleStyle}>Alcohol Abuse Details</h2>
            <span className="text-lg font-semibold">{showForm ? "[-]" : "[+]"}</span>
        </div>
        {showForm && (
            <form onSubmit={handleAlcoholFormSubmit} style={formContentStyle}>
                <div className="space-y-6">
                    <section>
                    <h4 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">Clinical Observations</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div><label htmlFor="alcoholBreathSmell" className={labelClasses}>Alcohol Breath Smell</label><input id="alcoholBreathSmell" name="alcoholBreathSmell" type="text" className={inputClasses} value={formData.alcoholBreathSmell || ''} onChange={handleChange} disabled={!isDoctor || isSubmitting} /></div>
                        <div><label htmlFor="speech" className={labelClasses}>Speech</label><input id="speech" name="speech" type="text" className={inputClasses} value={formData.speech || ''} onChange={handleChange} disabled={!isDoctor || isSubmitting} /></div>
                        <div><label htmlFor="drynessOfMouth" className={labelClasses}>Dryness of Mouth</label><input id="drynessOfMouth" name="drynessOfMouth" type="text" className={inputClasses} value={formData.drynessOfMouth || ''} onChange={handleChange} disabled={!isDoctor || isSubmitting} /></div>
                        <div><label htmlFor="drynessOfLips" className={labelClasses}>Dryness of Lips</label><input id="drynessOfLips" name="drynessOfLips" type="text" className={inputClasses} value={formData.drynessOfLips || ''} onChange={handleChange} disabled={!isDoctor || isSubmitting} /></div>
                        <div><label htmlFor="cnsPupilReaction" className={labelClasses}>CNS Pupil Reaction</label><input id="cnsPupilReaction" name="cnsPupilReaction" type="text" className={inputClasses} value={formData.cnsPupilReaction || ''} onChange={handleChange} disabled={!isDoctor || isSubmitting} /></div>
                        <div><label htmlFor="handTremors" className={labelClasses}>Hand Tremors</label><input id="handTremors" name="handTremors" type="text" className={inputClasses} value={formData.handTremors || ''} onChange={handleChange} disabled={!isDoctor || isSubmitting} /></div>
                        <div className="md:col-span-2"><label htmlFor="alcoholAnalyzerStudy" className={labelClasses}>Alcohol Analyzer Study</label><input id="alcoholAnalyzerStudy" name="alcoholAnalyzerStudy" type="text" className={inputClasses} value={formData.alcoholAnalyzerStudy || ''} onChange={handleChange} disabled={!isDoctor || isSubmitting} /></div>
                    </div>
                    </section>
                    <section>
                    <h4 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">Remarks & Advice</h4>
                    <div className="grid grid-cols-1 gap-y-4">
                        <div><label htmlFor="remarks" className={labelClasses}>Remarks</label><textarea id="remarks" name="remarks" className={textAreaClasses} rows="3" value={formData.remarks || ''} onChange={handleChange} disabled={!isDoctor || isSubmitting}></textarea></div>
                        <div><label htmlFor="advice" className={labelClasses}>Advice</label><textarea id="advice" name="advice" className={textAreaClasses} rows="3" value={formData.advice || ''} onChange={handleChange} disabled={!isDoctor || isSubmitting}></textarea></div>
                    </div>
                    </section>
                </div>
                <div className="mt-6 flex justify-end">
                    <button type="submit" className={`min-w-[200px] bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition duration-300 ${(!isDoctor || isSubmitting) ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={!isDoctor || isSubmitting}>
                        {isSubmitting ? 'Submitting Details...' : 'Submit Alcohol Details'}
                    </button>
                </div>
            </form>
        )}
    </div>
  );
};


const Consultation = ({ data, type, mrdNo, register, reference, appointment }) => {
  // --- State Variables ---
  const [complaints, setComplaints] = useState('');
  const [examination, setExamination] = useState('');
  const [systematic, setSystematic] = useState('');
  const [lexamination, setLexamination] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [procedureNotes, setProcedureNotes] = useState('');
  const [obsnotes, setObsnotes] = useState('');
  const [notifiableRemarks, setNotifiableRemarks] = useState('');
  const [caseType, setCaseType] = useState('');
  const [illnessOrInjury, setIllnessOrInjury] = useState('');
  const [otherCaseDetails, setOtherCaseDetails] = useState('');
  const [investigationDetails, setInvestigationDetails] = useState('');
  const [adviceDetails, setAdviceDetails] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [specialCases, setSpecialCases] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [referral, setReferral] = useState(null);
  const [hospitalName, setHospitalName] = useState('');
  const [speciality, setSpeciality] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [shiftingRequired, setShiftingRequired] = useState(null);
  const [shiftingNotes, setShiftingNotes] = useState('');
  const [ambulanceDetails, setAmbulanceDetails] = useState('');
  const [initialAlcoholData, setInitialAlcoholData] = useState(null);

  const [previousVisits, setPreviousVisits] = useState([]);
  const [bookedDoctor, setbookedDoctor] = useState([])
  const [doctors, setdoctors] = useState([])

  // --- Derived Data & Constants ---
  const emp_no = data && data[0]?.aadhar;
  const patientData = data && data[0];
  const submittedDoctor = localStorage.getItem('userData') || 'Unknown Doctor';
  const accessLevel = localStorage.getItem('accessLevel');
  
  // --- Access Control Logic ---
  const isDoctor = accessLevel === 'doctor';
  const isNurse = accessLevel === 'nurse';
  // Allow Doctor OR Nurse to edit ambulance details
  const canEditAmbulance = isDoctor || isNurse; 

  // --- useEffect for Auto-filling fields ---
  // FIX 1: Changed dependency array to [patientData?.aadhar]
  // This ensures the form only reloads from DB when the PATIENT changes,
  // not when you click Submit/Hold (which might trigger a re-render with the same patient).
  useEffect(() => {
    if (patientData) {
        if (patientData.consultation) {
            const consult = patientData.consultation;
            setComplaints(consult.complaints || '');
            setExamination(consult.examination || '');
            setSystematic(consult.systematic || '');
            setLexamination(consult.lexamination || '');
            setDiagnosis(consult.diagnosis || '');
            setProcedureNotes(consult.procedure_notes || '');
            setObsnotes(consult.obsnotes || '');
            setNotifiableRemarks(consult.notifiable_remarks || '');
            setCaseType(consult.case_type || '');
            setIllnessOrInjury(consult.illness_or_injury || '');
            setOtherCaseDetails(consult.other_case_details || '');
            setInvestigationDetails(consult.investigation_details || '');
            setAdviceDetails(consult.advice || '');
            setFollowUpDate(consult.follow_up_date || '');
            setSpecialCases(consult.special_cases || '');
            setReferral(consult.referral || null);
            setHospitalName(consult.hospital_name || '');
            setSpeciality(consult.speciality || '');
            setDoctorName(consult.doctor_name || '');
            setShiftingRequired(consult.shifting_required || null);
            setShiftingNotes(consult.shifting_notes || '');
            setAmbulanceDetails(consult.ambulance_details || '');

            if (Array.isArray(consult.follow_up_mrd_history)) {
                const formattedVisits = consult.follow_up_mrd_history.map((mrdString, index) => ({
                    id: Date.now() + index,
                    mrd: mrdString,
                }));
                setPreviousVisits(formattedVisits);
            } else {
                setPreviousVisits([]);
            }
        }
    } else {
      // Reset all fields if no patient data (e.g. initial load or patient deselected)
      setComplaints(''); setExamination(''); setSystematic(''); setLexamination('');
      setDiagnosis(''); setProcedureNotes(''); setObsnotes(''); setNotifiableRemarks('');
      setCaseType(''); setIllnessOrInjury(''); setOtherCaseDetails(''); setInvestigationDetails('');
      setAdviceDetails(''); setFollowUpDate(''); setSpecialCases(''); setReferral(null);
      setHospitalName(''); setSpeciality(''); setDoctorName(''); setShiftingRequired(null);
      setShiftingNotes(''); setAmbulanceDetails('');
      setInitialAlcoholData(null);
      setPreviousVisits([]);
    }
  }, [patientData?.aadhar]); // <--- ONLY TRIGGERS ON ID CHANGE

  

  // --- useEffect for Alcohol Data ---
  useEffect(() => {
    if (emp_no && register === "Alcohol Abuse") {
        const fetchAlcoholData = async () => {
            try {
                const response = await axios.get(`http://localhost:8000/get_alcohol_form_data/?aadhar=${emp_no}`);
                setInitialAlcoholData(response.data && Object.keys(response.data).length > 0 ? response.data : null);
            } catch (error) {
                console.error("Could not fetch alcohol form data:", error);
                setInitialAlcoholData(null);
            }
        };
        fetchAlcoholData();
    } else {
        setInitialAlcoholData(null);
    }
  }, [emp_no, register]);
    
  useEffect(() => {
      const fetchDetails = async () => {
          try {
              const response = await axios.post("http://localhost:8000/adminData");
              const fetchedEmployees = response.data.data;
  
              const doctorNames = fetchedEmployees
                  .filter(emp => emp.role === "doctor")
                  .map(emp => emp.name);
  
              setdoctors(doctorNames);
              if(doctorNames.length > 0) setbookedDoctor(doctorNames[0]);
  
          } catch (error) {
              console.error("Error fetching employee data:", error);
          }
      };
  
      fetchDetails();
  }, []); 

  const handleAddPreviousVisit = () => {
    setPreviousVisits(prev => [...prev, { id: Date.now(), mrd: '' }]);
  };

  const handleRemovePreviousVisit = (id) => {
    setPreviousVisits(prev => prev.filter(visit => visit.id !== id));
  };

  const handlePreviousVisitChange = (id, value) => {
    setPreviousVisits(prev =>
      prev.map(visit => (visit.id === id ? { ...visit, mrd: value } : visit))
    );
  };


  const handleConsultationSubmit = async (param) => {
    if (mrdNo === "") {
      alert("Please submit the entries first to get MRD Number");
      return;
    }

    const newMrds = previousVisits.map(visit => visit.mrd.trim()).filter(Boolean);
    const currentSessionHistory = [...new Set([...newMrds, mrdNo])];
    const isDoctorVisited = data[0]?.consultation?.submittedDoctor === "" || data[0]?.consultation?.submittedDoctor === null || data[0]?.consultation?.submittedDoctor === undefined || data[0]?.consultation?.mrdNo !== mrdNo;
    

    setIsSubmitting(true);
    const consultationPayload = {
      aadhar: emp_no,
      mrdNo: mrdNo,
      accessLevel,
      complaints,
      examination,
      systematic,
      lexamination,
      diagnosis,
      procedure_notes: procedureNotes,
      obsnotes,
      notifiable_remarks: notifiableRemarks,
      case_type: caseType,
      illness_or_injury: illnessOrInjury,
      other_case_details: otherCaseDetails,
      investigation_details: investigationDetails,
      advice: adviceDetails,
      special_cases: specialCases,
      submittedDoctor,
      bookedDoctor,
      follow_up_date: followUpDate || null,
      referral,
      hospital_name: referral === 'yes' ? hospitalName : '',
      speciality: referral === 'yes' ? speciality : '',
      doctor_name: referral === 'yes' ? doctorName : '',
      shifting_required: shiftingRequired,
      shifting_notes: shiftingRequired === 'yes' ? shiftingNotes : '',
      ambulance_details: shiftingRequired === 'yes' ? ambulanceDetails : '',
      reference: reference || false,
      follow_up_mrd_history: currentSessionHistory,
      param: param,
      isDoctorVisited: isDoctorVisited,
    };
    
    try {
      const response = await axios.post("http://localhost:8000/consultations/add/", consultationPayload);
      if (response.status === 200 || response.status === 201) {
        alert("Consultation data submitted successfully!");
        if (followUpDate) {
             const appointmentPayload = {
                 role: patientData?.type || 'Unknown', name: patientData?.name || 'N/A', employeeId: patientData?.emp_no || '',
                 organization: (patientData?.type === 'Employee' || patientData?.type === 'Visitor') ? (patientData?.employer || patientData?.organization || 'N/A') : null,
                 aadharNo: emp_no, contractorName: patientData?.type === 'Contractor' ? (patientData?.employer || 'N/A') : null,
                 purpose: "Follow Up", appointmentDate: followUpDate, time: "10:00", bookedBy: submittedDoctor,
                 consultedDoctor: "", employer: patientData?.employer || '',
             };
             try {
                 await axios.post("http://localhost:8000/bookAppointment/", appointmentPayload);
                 alert(`Follow-up appointment booked successfully!`);
             } catch (apptError) {
                 console.error('Error booking follow-up appointment:', apptError);
                 alert("Consultation saved, but error booking follow-up.");
             }
        }
      } else {
        alert(`Error submitting consultation data.`);
      }
    } catch (error) {
      console.error('Error submitting consultation:', error);
      alert("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!patientData) {
    return <div className="p-6 text-center text-red-600">Please select an employee to view or create a Consultation.</div>;
  }

  const textAreaClasses = `w-full p-4 border rounded-lg bg-blue-50 focus:ring-2 focus:ring-blue-300 disabled:bg-gray-100 disabled:cursor-not-allowed`;
  const inputClasses = `w-full p-3 border rounded-lg bg-blue-50 focus:ring-2 focus:ring-blue-300 disabled:bg-gray-100 disabled:cursor-not-allowed`;
  const labelClasses = "block text-gray-700 mb-2 text-lg font-medium";
  const radioLabelClasses = "flex items-center gap-2 cursor-pointer";
  const radioInputClasses = "form-radio text-blue-500 h-5 w-5 disabled:opacity-50 disabled:cursor-not-allowed";
  const sectionHeadingClasses = "text-xl font-semibold mb-2";

  return (
    <div className="bg-white min-h-screen p-4 md:p-6">
      <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 border-b pb-3">Consultation</h2>

      { register === "Alcohol Abuse" && (
        <div className='mb-8'>
          <AlcoholAbuseForm
              initialData={initialAlcoholData}
              patientEmpNo={patientData?.emp_no}
              isDoctor={isDoctor}
              aadhar={emp_no}
              mrdNo={mrdNo}
          />
        </div>
      )}
      
      { register === "Curative - Follow Up Visits" && (
        <div className="mt-6 mb-8 p-4 border rounded-lg bg-white shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Previous Visit References</h2>
                <button type="button" onClick={handleAddPreviousVisit} disabled={isSubmitting} className="bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-400">
                    + Add Previous Visit
                </button>
            </div>
            <div className="space-y-3">
                {previousVisits.map((visit, index) => (
                    <div key={visit.id} className="flex items-center gap-4 p-2 bg-gray-50 rounded-md">
                        <label className="font-medium text-gray-700">Ref ({index + 1}):</label>
                        <input type="text" placeholder="Enter previous MRD number" className={inputClasses} value={visit.mrd} onChange={(e) => handlePreviousVisitChange(visit.id, e.target.value)} disabled={isSubmitting} />
                        <button type="button" onClick={() => handleRemovePreviousVisit(visit.id)} disabled={isSubmitting} className="bg-red-500 text-white font-bold py-2 px-4 rounded hover:bg-red-700 disabled:bg-gray-400">Remove</button>
                    </div>
                ))}
            </div>
        </div>
      )}

      <form className="mt-4 space-y-6">
        <div><label className={labelClasses}>Complaints</label><textarea className={textAreaClasses} rows="4" value={complaints} onChange={(e) => setComplaints(e.target.value)} disabled={!isDoctor || isSubmitting} /></div>
        <div><label className={labelClasses}>General Examination</label><textarea className={textAreaClasses} rows="4" value={examination} onChange={(e) => setExamination(e.target.value)} disabled={!isDoctor || isSubmitting} /></div>
        <div><label className={labelClasses}>Systemic Examination</label><textarea className={textAreaClasses} rows="4" value={systematic} onChange={(e) => setSystematic(e.target.value)} disabled={!isDoctor || isSubmitting} /></div>
        <div><label className={labelClasses}>Local Examination</label><textarea className={textAreaClasses} rows="4" value={lexamination} onChange={(e) => setLexamination(e.target.value)} disabled={!isDoctor || isSubmitting} /></div>
        <div><label className={labelClasses}>Diagnosis Notes</label><textarea className={textAreaClasses} rows="4" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} disabled={!isDoctor || isSubmitting} /></div>
        <div><label className={labelClasses}>Procedure Notes</label><textarea className={textAreaClasses} rows="4" value={procedureNotes} onChange={(e) => setProcedureNotes(e.target.value)} disabled={!isDoctor || isSubmitting} /></div>
        <div><label className={labelClasses}>Observation / Ward Notes</label><textarea className={textAreaClasses} rows="4" value={obsnotes} onChange={(e) => setObsnotes(e.target.value)} disabled={!isDoctor || isSubmitting} /></div>

         <div className="border-t pt-6 space-y-4">
             <div><label className={labelClasses}>Investigation</label><textarea className={textAreaClasses} rows="3" value={investigationDetails} onChange={(e) => setInvestigationDetails(e.target.value)} disabled={!isDoctor || isSubmitting} /></div>
             <div><label className={labelClasses}>Advice</label><textarea className={textAreaClasses} rows="3" value={adviceDetails} onChange={(e) => setAdviceDetails(e.target.value)} disabled={!isDoctor || isSubmitting} /></div>
             <div><label className={labelClasses}>Follow Up (Review Date):</label><input type="date" className={inputClasses} value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} disabled={!isDoctor || isSubmitting} min={new Date().toISOString().split('T')[0]} /></div>
         </div>

        {/* --- FIX 2: Shifting In Ambulance Section with Nurse Access --- */}
        {type !== '' && (
          <div className="border-t pt-6 space-y-4">
            <h3 className={sectionHeadingClasses}>Shifting In Ambulance</h3>
            <div>
              <label className={labelClasses}>Is shifting required?</label>
              <div className="flex items-center gap-4 md:gap-6">
                <label className={radioLabelClasses}>
                  <input type="radio" name="shiftingRequired" value="yes"
                    checked={shiftingRequired === 'yes'} onChange={() => setShiftingRequired('yes')}
                    className={radioInputClasses} 
                    disabled={!canEditAmbulance || isSubmitting} 
                  /> Yes
                </label>
                <label className={radioLabelClasses}>
                  <input type="radio" name="shiftingRequired" value="no"
                    checked={shiftingRequired === 'no'} onChange={() => setShiftingRequired('no')}
                    className={radioInputClasses} 
                    disabled={!canEditAmbulance || isSubmitting} 
                  /> No
                </label>
                 <label className={radioLabelClasses}>
                  <input type="radio" name="shiftingRequired" value=""
                    checked={shiftingRequired === null || shiftingRequired === ''} onChange={() => setShiftingRequired(null)}
                    className={radioInputClasses.replace('blue','gray')} 
                    disabled={!canEditAmbulance || isSubmitting} 
                  /> N/A
                </label>
              </div>
            </div>

            {shiftingRequired === 'yes' && (
                <div className="space-y-4 pl-2 border-l-2 border-blue-200 ml-1">
                 <div>
                    <label className={labelClasses}>Shifting Notes</label>
                    <textarea className={textAreaClasses} rows="3"
                        placeholder="Enter reason for shifting..." value={shiftingNotes}
                        onChange={(e) => setShiftingNotes(e.target.value)} 
                        disabled={!canEditAmbulance || isSubmitting} 
                        required={shiftingRequired === 'yes'}
                    />
                </div>
                <div>
                    <label className={labelClasses}>Ambulance Details / Consumables Used</label>
                    <textarea className={textAreaClasses} rows="3"
                        placeholder="Enter ambulance number, driver, consumables..." value={ambulanceDetails}
                        onChange={(e) => setAmbulanceDetails(e.target.value)} 
                        disabled={!canEditAmbulance || isSubmitting} 
                        required={shiftingRequired === 'yes'}
                    />
                </div>
                </div>
            )}
          </div>
        )}

        {type !== '' && (
          <div className="border-t pt-6 space-y-4">
            <h3 className={sectionHeadingClasses}>Referral</h3>
            <div>
              <label className={labelClasses}>Do you need a referral?</label>
              <div className="flex items-center gap-4 md:gap-6">
                <label className={radioLabelClasses}>
                  <input type="radio" name="referral" value="yes" checked={referral === 'yes'} onChange={() => setReferral('yes')} className={radioInputClasses} disabled={!isDoctor || isSubmitting} /> Yes
                </label>
                <label className={radioLabelClasses}>
                  <input type="radio" name="referral" value="no" checked={referral === 'no'} onChange={() => setReferral('no')} className={radioInputClasses} disabled={!isDoctor || isSubmitting} /> No
                </label>
                 <label className={radioLabelClasses}>
                  <input type="radio" name="referral" value="" checked={referral === null || referral === ''} onChange={() => setReferral(null)} className={radioInputClasses.replace('blue','gray')} disabled={!isDoctor || isSubmitting} /> N/A
                </label>
              </div>
            </div>

            {referral === 'yes' && (
                <div className="space-y-4 pl-2 border-l-2 border-blue-200 ml-1">
                 <div><label className={labelClasses}>Hospital Name</label><input type="text" className={inputClasses} value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} disabled={!isDoctor || isSubmitting} required={referral === 'yes'} /></div>
                 <div><label className={labelClasses}>Speciality</label><input type="text" className={inputClasses} value={speciality} onChange={(e) => setSpeciality(e.target.value)} disabled={!isDoctor || isSubmitting} required={referral === 'yes'} /></div>
                 <div><label className={labelClasses}>Referred Doctor Name (Optional)</label><input type="text" className={inputClasses} value={doctorName} onChange={(e) => setDoctorName(e.target.value)} disabled={!isDoctor || isSubmitting} /></div>
                </div>
            )}
          </div>
        )}

        <div className="border-t pt-6 space-y-2">
          <label className={labelClasses}>Special Cases</label>
          <div className="flex items-center gap-4 md:gap-6">
            {["Yes", "No", "N/A"].map((value) => (
              <label key={value} className={radioLabelClasses}>
                <input type="radio" name="specialCases" value={value} checked={specialCases === value} onChange={(e) => setSpecialCases(e.target.value)} className={radioInputClasses} disabled={!isDoctor || isSubmitting} />
                {value}
              </label>
            ))}
          </div>
        </div>
        
        { accessLevel  === "nurse" && (     
        <div>
            <div>
                <label htmlFor="">Book this footfall to:</label>
                <select className="px-4 py-2 w-full bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={bookedDoctor} onChange={(e)=>{setbookedDoctor(e.target.value)}}>
                    {doctors.map((doc,key) =>(
                        <option key={key} value ={doc}>{doc}</option>
                    ))}
                </select>
            </div>
        </div>)}

        <div className="mt-8 flex justify-end">
          <button type="button" onClick={()=>handleConsultationSubmit("hold")} className={`min-w-[150px] me-4 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-300`} disabled={isSubmitting}>
            {isSubmitting ? 'Holding...' : 'Hold Consultation'}
          </button>
          <button type="button" onClick={()=>handleConsultationSubmit("submit")} className={`min-w-[150px] bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-300`} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Consultation'}
          </button>
        </div>
      </form>

      <div className="border-t pt-6 mt-8">
             <SignificantNotes data={data} type={type} mrdNo={mrdNo} />
        </div>
    </div>
  );
};

export default Consultation;