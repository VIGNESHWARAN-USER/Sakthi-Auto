import React, { useEffect, useState } from "react";
import moment from 'moment';

// --- 1. Reusable UI Components ---

const DetailItem = ({ label, value, isFullWidth = false }) => (
    <div className={isFullWidth ? "md:col-span-3" : ""}>
        <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
        <div className="px-3 py-2 w-full bg-gray-50 border border-gray-200 rounded-md shadow-sm text-gray-800 text-sm min-h-[38px] flex items-center">
            {value !== null && value !== undefined && value !== '' ? (
                 <span className="capitalize">{String(value)}</span>
            ) : (
                 <span className="text-gray-400 italic">N/A</span>
            )}
        </div>
    </div>
);

const TextAreaDisplay = ({ label, value }) => (
    <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2 text-gray-700">{label}</h3>
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-md shadow-sm min-h-[60px] text-sm text-gray-800 whitespace-pre-wrap">
            {value || <span className="text-gray-400 italic">Not provided.</span>}
        </div>
    </div>
);

// --- 2. Statutory Form Display Components ---

const RenderForm17Display = ({ formData }) => {
    if (!formData || !formData.emp_no) return null; // Simple check if form has content
    return (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-blue-800 border-b border-blue-200 pb-2">Form 17 Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <DetailItem label="Dept" value={formData.dept} />
                <DetailItem label="Works Number" value={formData.worksNumber} />
                <DetailItem label="Worker Name" value={formData.workerName} />
                <DetailItem label="Sex" value={formData.sex} />
                <DetailItem label="Date of Birth" value={formData.dob ? moment(formData.dob).format('DD-MMM-YYYY') : 'N/A'} />
                <DetailItem label="Age" value={formData.age} />
                <DetailItem label="Employment Date" value={formData.employmentDate ? moment(formData.employmentDate).format('DD-MMM-YYYY') : 'N/A'} />
                <DetailItem label="Leaving Date" value={formData.leavingDate ? moment(formData.leavingDate).format('DD-MMM-YYYY') : 'N/A'} />
                <DetailItem label="Reason" value={formData.reason} />
                <DetailItem label="Transferred To" value={formData.transferredTo} />
                <DetailItem label="Job Nature" value={formData.jobNature} />
                <DetailItem label="Raw Material" value={formData.rawMaterial} />
                <DetailItem label="Medical Exam Date" value={formData.medicalExamDate ? moment(formData.medicalExamDate).format('DD-MMM-YYYY') : 'N/A'} />
                <DetailItem label="Medical Exam Result" value={formData.medicalExamResult} />
                <DetailItem label="Recertified Date" value={formData.recertifiedDate ? moment(formData.recertifiedDate).format('DD-MMM-YYYY') : 'N/A'} />
                <DetailItem label="Unfitness Certificate" value={formData.unfitnessCertificate} />
                <DetailItem label="Suspension Details" value={formData.suspensionDetails} isFullWidth={true} />
            </div>
        </div>
    );
};

const RenderForm38Display = ({ formData }) => {
    if (!formData || !formData.emp_no) return null;
    return (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-green-800 border-b border-green-200 pb-2">Form 38 Details (Eye Exam)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <DetailItem label="Serial Number" value={formData.serialNumber} />
                <DetailItem label="Department" value={formData.department} />
                <DetailItem label="Worker Name" value={formData.workerName} />
                <DetailItem label="Sex" value={formData.sex} />
                <DetailItem label="Age" value={formData.age} />
                <DetailItem label="Nature of Job" value={formData.jobNature} />
                <DetailItem label="Date of Employment" value={formData.employmentDate ? moment(formData.employmentDate).format('DD-MMM-YYYY') : 'N/A'} />
                <DetailItem label="Date of Eye Exam" value={formData.eyeExamDate ? moment(formData.eyeExamDate).format('DD-MMM-YYYY') : 'N/A'} />
                <DetailItem label="Result" value={formData.result} />
                <DetailItem label="Remarks" value={formData.remarks} isFullWidth={true}/>
            </div>
        </div>
    );
};

const RenderForm39Display = ({ formData }) => {
    if (!formData || !formData.emp_no) return null;
    return (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-yellow-800 border-b border-yellow-200 pb-2">Form 39 Details (Medical Exam Cert)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <DetailItem label="Serial Number" value={formData.serialNumber} />
                <DetailItem label="Worker Name" value={formData.workerName} />
                <DetailItem label="Sex" value={formData.sex} />
                <DetailItem label="Age" value={formData.age} />
                <DetailItem label="Proposed Employment Date" value={formData.proposedEmploymentDate ? moment(formData.proposedEmploymentDate).format('DD-MMM-YYYY') : 'N/A'} />
                <DetailItem label="Job Occupation" value={formData.jobOccupation} />
                <DetailItem label="Raw Material" value={formData.rawMaterialHandled} />
                <DetailItem label="Medical Exam Date" value={formData.medicalExamDate ? moment(formData.medicalExamDate).format('DD-MMM-YYYY') : 'N/A'} />
                <DetailItem label="Exam Result" value={formData.medicalExamResult} />
                <DetailItem label="Certified Status" value={formData.certifiedFit} />
                <DetailItem label="Dept/Section" value={formData.departmentSection} />
            </div>
        </div>
    );
};

const RenderForm40Display = ({ formData }) => {
    if (!formData || !formData.emp_no) return null;
    return (
        <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-purple-800 border-b border-purple-200 pb-2">Form 40 Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <DetailItem label="Serial Number" value={formData.serialNumber} />
                <DetailItem label="Date of Employment" value={formData.dateOfEmployment ? moment(formData.dateOfEmployment).format('DD-MMM-YYYY') : 'N/A'} />
                <DetailItem label="Worker Name" value={formData.workerName} />
                <DetailItem label="Sex" value={formData.sex} />
                <DetailItem label="Age" value={formData.age} />
                <DetailItem label="Son/Wife/Daughter Of" value={formData.sonWifeDaughterOf} />
                <DetailItem label="Nature of Job" value={formData.natureOfJob} />
                <DetailItem label="Urine Result" value={formData.urineResult} />
                <DetailItem label="Blood Result" value={formData.bloodResult} />
                <DetailItem label="Feces Result" value={formData.fecesResult} />
                <DetailItem label="X-ray Result" value={formData.xrayResult} />
                <DetailItem label="Other Exam Result" value={formData.otherExamResult} />
                <DetailItem label="Deworming" value={formData.deworming} />
                <DetailItem label="Typhoid Vac. Date" value={formData.typhoidVaccinationDate ? moment(formData.typhoidVaccinationDate).format('DD-MMM-YYYY') : 'N/A'} />
                <DetailItem label="Remarks" value={formData.remarks} isFullWidth={true}/>
            </div>
        </div>
    );
};

const RenderForm27Display = ({ formData }) => {
    if (!formData || !formData.emp_no) return null;
    return (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-red-800 border-b border-red-200 pb-2">Form 27 Details (Adolescent Fitness)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <DetailItem label="Serial Number" value={formData.serialNumber} />
                <DetailItem label="Date" value={formData.date ? moment(formData.date).format('DD-MMM-YYYY') : 'N/A'} />
                <DetailItem label="Department" value={formData.department} />
                <DetailItem label="Name of Works" value={formData.nameOfWorks} />
                <DetailItem label="Sex" value={formData.sex} />
                <DetailItem label="Age" value={formData.age} />
                <DetailItem label="Date of Birth" value={formData.dateOfBirth ? moment(formData.dateOfBirth).format('DD-MMM-YYYY') : 'N/A'} />
                <DetailItem label="Father's Name" value={formData.nameOfTheFather} />
                <DetailItem label="Job/Occupation" value={formData.natureOfJobOrOccupation} />
                <DetailItem label="Descriptive Marks" value={formData.descriptiveMarks} isFullWidth={true}/>
            </div>
        </div>
    );
};

// --- 3. Main Component ---

const Fitness = ({ data }) => {
    // Determine the source of fitness data (handling nested vs flat structure)
    // If 'data' has a 'fitnessassessment' property, we use that. Otherwise, we assume 'data' itself is the assessment.
    const fitnessAssessmentData = data?.fitnessassessment || data || {};
    
    // Forms are usually properties of the main object passed
    const formSource = data || {};
    const [displayData, setDisplayData] = useState({
        // Fitness Tests
        tremors: "N/A",
        romberg_test: "N/A",
        acrophobia: "N/A",
        trendelenberg_test: "N/A",
        CO_dizziness: "N/A",
        MusculoSkeletal_Movements: "N/A",
        Claustrophobia: "N/A",
        Tandem: "N/A",
        Nystagmus_Test: "N/A",
        Dysdiadochokinesia: "N/A",
        Finger_nose_test: "N/A",
        Psychological_PMK: "N/A",
        Psychological_zollingar: "N/A",

        // Examination and Status
        eye_exam_fit_status: "N/A",
        general_examination: "",
        systematic_examination: "",
        overallFitness: "N/A",
        comments: "",
        special_cases: "N/A",
        validity: "N/A",
        
        // Job Nature and Conditions
        jobNature: [],
        other_job_nature: "",
        conditionalFitFields: [],
        conditional_other_job_nature: "",

        // Statutory Forms
        form17: null,
        form27: null,
        form38: null,
        form39: null,
        form40: null,

        // Metadata
        bookedDoctor: "N/A",
        submittedDoctor: "N/A",
        submittedNurse: "N/A",
    });

    useEffect(() => {
        if (fitnessAssessmentData && Object.keys(fitnessAssessmentData).length > 0) {
            
            // Helper to parse JSON strings from DB
            const parseJsonField = (fieldData) => {
                if (!fieldData) return [];
                if (Array.isArray(fieldData)) return fieldData;
                if (typeof fieldData === 'string') {
                    try {
                        const parsed = JSON.parse(fieldData);
                        return Array.isArray(parsed) ? parsed : [];
                    } catch (error) {
                        return [];
                    }
                }
                return [];
            };

            const parsedJobNature = parseJsonField(fitnessAssessmentData.job_nature);
            const parsedConditionalFields = parseJsonField(fitnessAssessmentData.conditional_fit_feilds);

            setDisplayData({
                // Fitness Tests
                tremors: fitnessAssessmentData.tremors || "N/A",
                romberg_test: fitnessAssessmentData.romberg_test || "N/A",
                acrophobia: fitnessAssessmentData.acrophobia || "N/A",
                trendelenberg_test: fitnessAssessmentData.trendelenberg_test || "N/A",
                CO_dizziness: fitnessAssessmentData.CO_dizziness || "N/A",
                MusculoSkeletal_Movements: fitnessAssessmentData.MusculoSkeletal_Movements || "N/A",
                Claustrophobia: fitnessAssessmentData.Claustrophobia || "N/A",
                Tandem: fitnessAssessmentData.Tandem || "N/A",
                Nystagmus_Test: fitnessAssessmentData.Nystagmus_Test || "N/A",
                Dysdiadochokinesia: fitnessAssessmentData.Dysdiadochokinesia || "N/A",
                Finger_nose_test: fitnessAssessmentData.Finger_nose_test || "N/A",
                Psychological_PMK: fitnessAssessmentData.Psychological_PMK || "N/A",
                Psychological_zollingar: fitnessAssessmentData.Psychological_zollingar || "N/A",

                // Exams
                eye_exam_fit_status: fitnessAssessmentData.eye_exam_fit_status || "N/A",
                general_examination: fitnessAssessmentData.general_examination || "",
                systematic_examination: fitnessAssessmentData.systematic_examination || "",
                overallFitness: fitnessAssessmentData.overall_fitness || "N/A",
                comments: fitnessAssessmentData.comments || "",
                special_cases: fitnessAssessmentData.special_cases || "N/A",
                validity: fitnessAssessmentData.validity ? moment(fitnessAssessmentData.validity).format('DD-MMM-YYYY') : "N/A",

                // Job Nature
                jobNature: parsedJobNature,
                other_job_nature: fitnessAssessmentData.other_job_nature || "",
                conditionalFitFields: parsedConditionalFields,
                conditional_other_job_nature: fitnessAssessmentData.conditional_other_job_nature || "",
                
                // Statutory Forms (Mapped from parent object)
                form17: formSource.form17 || null,
                form27: formSource.form27 || null,
                form38: formSource.form38 || null,
                form39: formSource.form39 || null,
                form40: formSource.form40 || null,

                // Metadata
                bookedDoctor: fitnessAssessmentData.bookedDoctor || "N/A",
                submittedDoctor: fitnessAssessmentData.submittedDoctor || "N/A",
                submittedNurse: fitnessAssessmentData.submittedNurse || "N/A",
            });
        }
    }, [data, fitnessAssessmentData, formSource]);
    console.log("Display Data:", displayData);

    return (
        <div className="mt-6 p-6 bg-white rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-3">Fitness Assessment Details</h2>

            {/* 1. Overall Status */}
            <h3 className="text-lg font-semibold mb-3 text-gray-700">Overall Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 mb-6 p-4 bg-gray-50 rounded-lg border">
                <DetailItem label="Overall Fitness" value={displayData.overallFitness} />
                <DetailItem label="Ophthalmologist Status" value={displayData.eye_exam_fit_status} />
                <DetailItem label="Special Cases" value={displayData.special_cases} />
                <DetailItem label="Validity Date" value={displayData.validity} />
            </div>

            {/* 2. Fitness Tests */}
            <h3 className="text-lg font-semibold mb-3 text-gray-700">Fitness Tests</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 mb-6">
                <DetailItem label="Tremors" value={displayData.tremors} />
                <DetailItem label="Romberg Test" value={displayData.romberg_test} />
                <DetailItem label="Fear Of Height (Acrophobia)" value={displayData.acrophobia} />
                <DetailItem label="Trendelenberg Test" value={displayData.trendelenberg_test} />
                <DetailItem label="C/O Dizziness" value={displayData.CO_dizziness} />
                <DetailItem label="MusculoSkeletal Movements" value={displayData.MusculoSkeletal_Movements} />
                <DetailItem label="Fear in confined Space (Claustrophobia)" value={displayData.Claustrophobia} />
                <DetailItem label="Straight Line (Tandem) Walking" value={displayData.Tandem} />
                <DetailItem label="Nystagmus Test" value={displayData.Nystagmus_Test} />
                <DetailItem label="Dysdiadochokinesia" value={displayData.Dysdiadochokinesia} />
                <DetailItem label="Finger Nose Test" value={displayData.Finger_nose_test} />
                <DetailItem label="Psychological - PMK" value={displayData.Psychological_PMK} />
                <DetailItem label="Psychological - Zollinger" value={displayData.Psychological_zollingar} />
            </div>

            {/* 3. Job Nature */}
            <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-gray-700">Fitness applied for (Job Nature)</h3>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-md shadow-sm min-h-[40px]">
                    {displayData.jobNature && displayData.jobNature.length > 0 ? (
                        <>
                            <ul className="list-disc list-inside text-sm text-gray-800 space-y-1">
                                {displayData.jobNature.map((job, index) => (
                                    <li key={index}>{job}</li>
                                ))}
                            </ul>
                            {displayData.jobNature.includes("Others") && displayData.other_job_nature && (
                                    <div className="mt-2 pt-2 border-t border-gray-300 pl-5 text-sm">
                                        <span className="font-medium text-gray-600">Other Details: </span>
                                        <span className="text-gray-800">{displayData.other_job_nature}</span>
                                    </div>
                            )}
                        </>
                    ) : (
                        <p className="text-sm text-gray-500 italic">No job nature specified.</p>
                    )}
                </div>
            </div>

            {/* 4. Conditional Fit Fields (Conditional Render) */}
            {displayData.overallFitness?.toLowerCase() === "conditional" && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="text-lg font-semibold mb-3 text-blue-800">Conditionally Fit For</h3>
                    <div className="p-3 bg-white border border-gray-200 rounded-md shadow-sm min-h-[40px]">
                        {displayData.conditionalFitFields && displayData.conditionalFitFields.length > 0 ? (
                                <>
                                <ul className="list-disc list-inside text-sm text-gray-800 space-y-1">
                                    {displayData.conditionalFitFields.map((field, index) => (
                                        <li key={index}>{field}</li>
                                    ))}
                                </ul>
                                {displayData.conditionalFitFields.includes("Others") && displayData.conditional_other_job_nature && (
                                        <div className="mt-2 pt-2 border-t border-gray-300 pl-5 text-sm">
                                            <span className="font-medium text-gray-600">Other Conditional Details: </span>
                                            <span className="text-gray-800">{displayData.conditional_other_job_nature}</span>
                                        </div>
                                )}
                                </>
                        ) : (
                            <p className="text-sm text-gray-500 italic">No specific conditional fields listed.</p>
                        )}
                    </div>
                </div>
            )}

            {/* 5. Exam and Comments */}
            <TextAreaDisplay label="General Examination" value={displayData.general_examination} />
            <TextAreaDisplay label="Systemic Examination (CVS, RS, GIT, CNS, etc)" value={displayData.systematic_examination} />
            <TextAreaDisplay label="Doctor's Remarks / Comments" value={displayData.comments} />

            {/* 6. Statutory Forms Section (The requested addition) */}
            {(displayData.form17 || displayData.form27 || displayData.form38 || displayData.form39 || displayData.form40) && (
                <div className="mt-8 border-t-2 border-gray-200 pt-6">
                    <h2 className="text-2xl font-bold mb-4 text-gray-800">Associated Statutory Forms</h2>
                    <RenderForm17Display formData={displayData.form17} />
                    <RenderForm38Display formData={displayData.form38} />
                    <RenderForm39Display formData={displayData.form39} />
                    <RenderForm40Display formData={displayData.form40} />
                    <RenderForm27Display formData={displayData.form27} />
                </div>
            )}

            {/* 7. Footer / Metadata */}
            <h3 className="text-xl font-semibold mb-4 text-gray-700 border-t pt-4 mt-8">Submission Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                <DetailItem label="Submitted Nurse" value={displayData.submittedNurse} />
                <DetailItem label="Booked Doctor" value={displayData.bookedDoctor} />                
                <DetailItem label="Consulted Doctor" value={displayData.submittedDoctor} />
            </div>
        </div>
    );
};

export default Fitness;