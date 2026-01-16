import React, { useState, useEffect } from 'react';
import axios from 'axios';
const getDefaultFormData = (formType) => {
    console.log(formType)
    switch (formType) {
        case 'ophthalmicReport':
            return {
                contName: "", designation: "", patientName: "", age: "", date: "",
                rightEyeDistance: "", leftEyeDistance: "", rightEyeNear: "", leftEyeNear: "",
                anteriorSegment: "", fundus: "", colourVision: "", advice: "",
                ophthalmologistName: "", signature: ""
            };
        case 'eyeFitness':
            return {
                dept: "", name: "", dob: "", ageSex: "", natureOfWork: "",
                dateOfEmployment: "", dateOfEyeExam: "", colorVision: "",
                result: "", 
                remarks: "", ophthalmologistSign: ""
            };
        case 'alcoholPage':
            return {
                alcoholBreathSmell: "", speech: "", drynessOfMouth: "",
                drynessOfLips: "", cnsPupilReaction: "", handTremors: "",
                alcoholAnalyzerStudy: "", remarks: "", advice: "",
            };
        case 'medicalCertificate':
            return {
                employeeName: "", age: "", sex: "", date: "", empNo: "",
                department: "", jswContract: "",
                natureOfWork: "", covidVaccination: "", diagnosis: "",
                leaveFrom: "", leaveUpTo: "", daysLeave: "", rejoiningDate: "",
                shift: "", pr: "", sp02: "", temp: "", certificateFrom: "",
                note: "", ohcStaffSignature: "", individualSignature: "",
            };
        case 'canteenWorker':
            return {
                Name: "", Age: "", Sex: "", Date: "", Height: "", Weight: "",
                "EMP No": "", "Chest Inspiration": "", "Chest Expiration": "",
                "General Examination": "", "Surgical/Medical History": "",
                "Contagious Diseases": "", "Skin & Scalp": "", Ears: "",
                "Oral Cavity": "", Fingers: "", Trunk: "", "UL/LL": "",
                "CVS (BP, PR)": "", "RS (RR)": "", Abdomen: "", CNS: "",
                Others: "", "General Hygiene": "", Investigations: "",
                "Immunisation Status": "", Smoking: "", Alcohol: "",
                "Pann Chewing": "", "Fit/Unfit": "", "Staff Signature": "",
                "Individual Signature": "",
            };
        default:
            return {};
    }
};

// Helper to get the main title for each form
const getFormTitle = (formType) => {
     switch (formType) {
        case 'ophthalmicReport': return "Ophthalmic Report";
        case 'eyeFitness': return "Eye Fitness Certificate";
        case 'alcoholPage': return "Alcohol Consumption Check"; // Changed title slightly
        case 'medicalCertificate': return "Medical Certificate of Fitness to Return Duty";
        case 'canteenWorker': return "Medical Examination Report (Canteen Workers)";
        default: return "Form";
    }
};

// --- Reusable Input Component (Optional but helpful for consistency) ---
const FormInput = ({ label, name, value, onChange, type = "text", placeholder, required = false, className = '', ...props }) => (
    <div className={className}>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
            type={type}
            id={name}
            name={name}
            value={value || ''}
            onChange={onChange}
            placeholder={placeholder || `Enter ${label.toLowerCase()}...`}
            className="mt-1 px-3 py-2 w-full bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
            required={required}
            {...props}
        />
    </div>
);

const FormTextarea = ({ label, name, value, onChange, placeholder, rows = 3, required = false, className = '' }) => (
     <div className={className}>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <textarea
            id={name}
            name={name}
            value={value || ''}
            onChange={onChange}
            placeholder={placeholder || `Enter ${label.toLowerCase()}...`}
            rows={rows}
            className="mt-1 px-3 py-2 w-full bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
            required={required}
        />
    </div>
);

const FormSelect = ({ label, name, value, onChange, options, placeholder = "Select...", required = false, className = '' }) => (
     <div className={className}>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <select
            id={name}
            name={name}
            value={value || ''}
            onChange={onChange}
            className="mt-1 px-3 py-2 w-full bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
            required={required}
        >
            <option value="" disabled={required}>{placeholder}</option>
            {options.map(opt => (
                <option key={opt.value || opt} value={opt.value || opt}>
                    {opt.label || opt}
                </option>
            ))}
        </select>
    </div>
);

const FormRadioGroup = ({ label, name, value, onChange, options, required = false, className = '' }) => (
    <div className={className}>
        <label className="block text-sm font-medium text-gray-700 mb-2">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
            {options.map((option) => (
                <label key={option} className="flex items-center text-sm cursor-pointer">
                    <input
                        type="radio"
                        name={name}
                        value={option}
                        checked={value === option}
                        onChange={onChange}
                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500 mr-1.5"
                        required={required && options.indexOf(option) === 0} // Make first radio required visually
                    />
                    <span className="text-gray-800">{option}</span>
                </label>
            ))}
        </div>
    </div>
);


// --- Main FormFields Component ---
const FormFields = ({ formType, initialData = null, logoSrc = null, apiUrlBase = "http://localhost:8000" }) => {
    const [formData, setFormData] = useState({});

    useEffect(() => {
        console.log(`Form type changed to: ${formType}`);
        const defaultStructure = getDefaultFormData(formType);
        let dataToSet = { ...defaultStructure };

        if (initialData && typeof initialData === 'object') {
            console.log("Loading initial data:", initialData);
            for (const key in defaultStructure) { // Iterate over default keys
                if (initialData.hasOwnProperty(key)) {
                    dataToSet[key] = initialData[key] ?? ''; // Use provided value or empty string
                }
            }
        } else {
            console.log("No valid initial data provided or keys mismatch, using defaults.");
        }

        setFormData(dataToSet);
    }, [formType, initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target; // Simplified for most inputs
        setFormData(prevData => ({
            ...prevData,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log("Submitting Form Data:", formData);
        const apiUrl = `${apiUrlBase}/submit/${formType}`;

        if (!formType || Object.keys(getDefaultFormData(formType)).length === 0) {
            alert("Invalid form type. Cannot submit.");
            return;
        }
        // Add specific validation if needed

        try {
            const resp = await axios.post(apiUrl, formData);
            if (resp.status === 200 || resp.status === 201) {
                alert(`${getFormTitle(formType)} data submitted successfully!`);
            } else {
                alert(`Submission failed with status ${resp.status}. ${resp.data?.detail || ''}`);
            }
        } catch (error) {
            // ... (keep existing detailed error handling)
             console.error(`Error submitting ${formType} data:`, error);
            let errorMsg = "An unexpected error occurred.";
            if (error.response) {
                errorMsg = `Server Error (${error.response.status}): ${error.response.data?.detail || error.response.data || 'Please check details.'}`;
            } else if (error.request) {
                errorMsg = "Could not connect to the server.";
            } else {
                errorMsg = `Request Setup Error: ${error.message}`;
            }
            alert(`Failed to submit ${formType} data. ${errorMsg}`);
        }
    };

    // --- Rendering Logic with VitalsForm Styling ---

    const renderFormContent = () => {
        switch (formType) {
            case 'ophthalmicReport':
                return (
                    <>

                        <section className="mb-6 p-4 border rounded-lg bg-slate-50">
                            <h3 className="text-lg font-semibold text-gray-700 mb-4">Vision Assessment</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                <FormInput label="Right Eye Distance" name="rightEyeDistance" value={formData.rightEyeDistance} onChange={handleChange} />
                                <FormInput label="Left Eye Distance" name="leftEyeDistance" value={formData.leftEyeDistance} onChange={handleChange} />
                                <FormInput label="Right Eye Near" name="rightEyeNear" value={formData.rightEyeNear} onChange={handleChange} />
                                <FormInput label="Left Eye Near" name="leftEyeNear" value={formData.leftEyeNear} onChange={handleChange} />
                            </div>
                        </section>

                        <section className="mb-6 p-4 border rounded-lg bg-slate-50">
                             <h3 className="text-lg font-semibold text-gray-700 mb-4">Examinations & Advice</h3>
                             <div className="grid grid-cols-1 md:grid-cols-1 gap-x-6 gap-y-4"> {/* Changed to 1 col for full width */}
                                <FormInput label="Anterior Segment" name="anteriorSegment" value={formData.anteriorSegment} onChange={handleChange} />
                                <FormInput label="Fundus" name="fundus" value={formData.fundus} onChange={handleChange} />
                                <FormInput label="Colour Vision" name="colourVision" value={formData.colourVision} onChange={handleChange} />
                                <FormTextarea label="Advice" name="advice" value={formData.advice} onChange={handleChange} />
                             </div>
                        </section>

                        <section className="p-4 border rounded-lg bg-slate-50">
                             <h3 className="text-lg font-semibold text-gray-700 mb-4">Doctor Details</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                <FormInput label="Ophthalmologist Name" name="ophthalmologistName" value={formData.ophthalmologistName} onChange={handleChange} className="md:col-span-2" />
                                <FormInput label="Signature" name="signature" value={formData.signature} onChange={handleChange} className="md:col-span-2"/>
                             </div>
                        </section>
                    </>
                );

            case 'eyeFitness':
                 return (
                    <>
                         <p className="text-center text-sm mb-6 -mt-4 text-gray-600">
                            For All Drivers & Locomotive Operators
                            <br />(Crane, Forklift, Hydra, Boom Lift, Heavy Duty, Passenger Vehicle etc.)
                        </p>
                        <section className="mb-6 p-4 border rounded-lg bg-slate-50">
                            <h3 className="text-lg font-semibold text-gray-700 mb-4">Employee & Exam Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                                <FormInput label="Dept/Works" name="dept" value={formData.dept} onChange={handleChange} />
                                <FormInput label="Name" name="name" value={formData.name} onChange={handleChange} />
                                <FormInput label="Date of Birth" name="dob" type="date" value={formData.dob} onChange={handleChange} />
                                <FormInput label="Age/Sex" name="ageSex" value={formData.ageSex} onChange={handleChange} />
                                <FormInput label="Nature of Work" name="natureOfWork" value={formData.natureOfWork} onChange={handleChange} />
                                <FormInput label="Date of Employment" name="dateOfEmployment" type="date" value={formData.dateOfEmployment} onChange={handleChange} />
                                <FormInput label="Date of Eye Exam" name="dateOfEyeExam" type="date" value={formData.dateOfEyeExam} onChange={handleChange} />
                                <FormInput label="Color Vision" name="colorVision" value={formData.colorVision} onChange={handleChange} />
                            </div>
                        </section>

                        <section className="mb-6 p-4 border rounded-lg bg-slate-50">
                             <h3 className="text-lg font-semibold text-gray-700 mb-4">Eye Exam Result</h3>
                             <FormRadioGroup
                                label="Select Result" // Label for the group
                                name="result"
                                value={formData.result}
                                onChange={handleChange}
                                options={[
                                    "FIT", "FIT WITH NEWLY PRESCRIBED GLASS", "FIT WITH EXISTING GLASS",
                                    "FIT WITH AN ADVICE TO CHANGE EXISTING GLASS WITH NEWLY PRESCRIBED GLASS", "UNFIT"
                                ]}
                                className="col-span-1 md:col-span-2" // Example class
                             />
                        </section>

                        <section className="p-4 border rounded-lg bg-slate-50">
                            <h3 className="text-lg font-semibold text-gray-700 mb-4">Remarks & Signature</h3>
                             <div className="grid grid-cols-1 gap-y-4">
                                <FormTextarea label="Remarks" name="remarks" value={formData.remarks} onChange={handleChange} />
                                <FormInput label="Sign of Ophthalmologist (Reg No & Seal)" name="ophthalmologistSign" value={formData.ophthalmologistSign} onChange={handleChange} />
                             </div>
                        </section>
                    </>
                 );

            case 'alcoholPage':
                 return (
                     <>

                            <section className="bg-slate-50 p-4 rounded-lg border">
                                <h3 className="text-lg font-semibold text-gray-700 mb-4">Clinical Observations</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                     <FormInput label="Alcohol Breath Smell" name="alcoholBreathSmell" value={formData.alcoholBreathSmell} onChange={handleChange} />
                                     <FormInput label="Speech" name="speech" value={formData.speech} onChange={handleChange} />
                                     <FormInput label="Dryness of Mouth" name="drynessOfMouth" value={formData.drynessOfMouth} onChange={handleChange} />
                                     <FormInput label="Dryness of Lips" name="drynessOfLips" value={formData.drynessOfLips} onChange={handleChange} />
                                     <FormInput label="CNS Pupil Reaction" name="cnsPupilReaction" value={formData.cnsPupilReaction} onChange={handleChange} />
                                     <FormInput label="Hand Tremors" name="handTremors" value={formData.handTremors} onChange={handleChange} />
                                     <FormInput label="Alcohol Analyzer Study" name="alcoholAnalyzerStudy" value={formData.alcoholAnalyzerStudy} onChange={handleChange} className="md:col-span-2" />
                                </div>
                            </section>

                            <section className="bg-slate-50 p-4 rounded-lg border">
                                 <h3 className="text-lg font-semibold text-gray-700 mb-4">Remarks & Advice</h3>
                                 <div className="grid grid-cols-1 gap-y-4">
                                    <FormTextarea label="Remarks" name="remarks" value={formData.remarks} onChange={handleChange} />
                                    <FormTextarea label="Advice" name="advice" value={formData.advice} onChange={handleChange} />
                                 </div>
                            </section>
                         
                     </>
                 );

            case 'medicalCertificate':
                 return (
                    <>
                         {logoSrc && (
                            <div className="w-full flex justify-end mb-4 -mt-2">
                                <img src={logoSrc} className="w-auto h-16 sm:h-20" alt="Company Logo" />
                            </div>
                         )}
                         {/* Special Title Styling */}
                         <h2 className="text-xl underline font-bold text-center mb-6">
                             Medical Certificate of Fitness to Return Duty
                         </h2>
                         <div className="border-black border-2 p-4 sm:p-6 rounded-lg space-y-6">
                             <section className="bg-slate-50 p-4 rounded-lg border">
                                <h3 className="text-lg font-semibold text-gray-700 mb-4">Employee Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                                     <FormInput label="Employee Name" name="employeeName" value={formData.employeeName} onChange={handleChange} />
                                     <FormInput label="Age" name="age" value={formData.age} onChange={handleChange} />
                                     <FormInput label="Sex" name="sex" value={formData.sex} onChange={handleChange} />
                                     <FormInput label="Date" name="date" type="date" value={formData.date} onChange={handleChange} />
                                     <FormInput label="Emp No" name="empNo" value={formData.empNo} onChange={handleChange} />
                                     <FormInput label="Department" name="department" value={formData.department} onChange={handleChange} />
                                     <FormInput label="JSW Contract" name="jswContract" value={formData.jswContract} onChange={handleChange} />
                                     <FormInput label="Nature of Work" name="natureOfWork" value={formData.natureOfWork} onChange={handleChange} />
                                     <FormSelect
                                        label="Covid Vaccination" name="covidVaccination"
                                        value={formData.covidVaccination} onChange={handleChange}
                                        options={["Yes", "No", "Partial"]} placeholder="Select Status..."
                                     />
                                </div>
                            </section>

                             <section className="bg-slate-50 p-4 rounded-lg border">
                                <h3 className="text-lg font-semibold text-gray-700 mb-4">Medical Leave Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                                     <FormTextarea label="Diagnosis (Disease/Condition)" name="diagnosis" value={formData.diagnosis} onChange={handleChange} className="md:col-span-3" />
                                     <FormInput label="Leave From" name="leaveFrom" type="date" value={formData.leaveFrom} onChange={handleChange} />
                                     <FormInput label="Leave Up To" name="leaveUpTo" type="date" value={formData.leaveUpTo} onChange={handleChange} />
                                     <FormInput label="Number of Days Leave" name="daysLeave" type="number" value={formData.daysLeave} onChange={handleChange} />
                                </div>
                            </section>

                             <section className="bg-slate-50 p-4 rounded-lg border">
                                <h3 className="text-lg font-semibold text-gray-700 mb-4">Return to Duty Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                                     <FormInput label="Rejoining Duty On" name="rejoiningDate" type="date" value={formData.rejoiningDate} onChange={handleChange} />
                                     <FormSelect
                                        label="Shift" name="shift" value={formData.shift} onChange={handleChange}
                                        options={["G", "A", "B", "C"]} placeholder="Select Shift..."
                                        />
                                     <FormInput label="PR (/min)" name="pr" value={formData.pr} onChange={handleChange} />
                                     <FormInput label="SPO2 (%)" name="sp02" value={formData.sp02} onChange={handleChange} />
                                     <FormInput label="Temp (°F)" name="temp" value={formData.temp} onChange={handleChange} />
                                     <FormRadioGroup
                                        label="Certificate Issued From" name="certificateFrom"
                                        value={formData.certificateFrom} onChange={handleChange}
                                        options={["Govt Hospital", "ESI Hospital", "Private Hospital"]}
                                        className="lg:col-span-3" // Span across columns
                                    />
                                </div>
                            </section>

                             <section className="bg-slate-50 p-4 rounded-lg border">
                                <h3 className="text-lg font-semibold text-gray-700 mb-4">Notes & Signatures</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                    <FormTextarea label="Note / Remarks" name="note" value={formData.note} onChange={handleChange} className="md:col-span-2"/>
                                    <FormInput label="OHC Staff Signature" name="ohcStaffSignature" value={formData.ohcStaffSignature} onChange={handleChange} />
                                    <FormInput label="Individual Signature" name="individualSignature" value={formData.individualSignature} onChange={handleChange} />
                                </div>
                             </section>
                         </div>
                    </>
                 );

             case 'canteenWorker':
                 const canteenFieldsConfig = [
                    { label: "General Examination", name: "General Examination"}, 
                    { label: "Contagious Diseases", name: "Contagious Diseases"}, { label: "Skin & Scalp", name: "Skin & Scalp"}, { label: "Ears", name: "Ears"},
                    { label: "Oral Cavity", name: "Oral Cavity"}, { label: "Fingers", name: "Fingers"}, { label: "Trunk", name: "Trunk"},
                    { label: "UL/LL (Upper/Lower Limb)", name: "UL/LL"}, { label: "CVS (BP, PR)", name: "CVS (BP, PR)"}, { label: "RS (RR)", name: "RS (RR)"},
                    { label: "Abdomen", name: "Abdomen"}, { label: "CNS", name: "CNS"}, { label: "Others", name: "Others", type: 'textarea'},
                    { label: "General Hygiene", name: "General Hygiene"}];
                 return (
                    <>
                        <section className="p-4 border rounded-lg bg-slate-50">
                            <h3 className="text-lg font-semibold text-gray-700 mb-4">Canteen Worker Examination Details</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                                {canteenFieldsConfig.map(field => (
                                    field.type === 'textarea' ?
                                        <FormTextarea key={field.name} {...field} value={formData[field.name]} onChange={handleChange} /> :
                                        <FormInput key={field.name} {...field} value={formData[field.name]} onChange={handleChange} />
                                ))}
                            </div>
                        </section>
                    </>
                 );

            default:
                return <div className="text-red-500 font-semibold text-center p-6 bg-red-50 rounded-lg">Invalid form type specified: '{formType}'</div>;
        }
    };

    return (
        // Outer container matching VitalsForm
        <div className="bg-white mt-8 p-6 rounded-xl shadow-lg max-w-4xl mx-auto">
            {/* Main Title styled like VitalsForm */}
            <h2 className="text-xl font-semibold mb-6 text-gray-800 border-b pb-3">
                {getFormTitle(formType)}
            </h2>

            <form onSubmit={handleSubmit}>
                {/* Render the specific form content based on type */}
                {renderFormContent()}

                {/* Common Submit Button styled like VitalsForm */}
                {formType && getDefaultFormData(formType) && Object.keys(getDefaultFormData(formType)).length > 0 && (
                    <div className="mt-8 flex justify-end">
                        <button
                            type="submit"
                            className="bg-blue-600 text-white px-6 py-2 rounded-md shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-300 text-base"
                        >
                            Submit Form
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
};

export default FormFields;