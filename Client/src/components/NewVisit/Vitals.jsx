import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { FaFileUpload, FaInfoCircle } from 'react-icons/fa';
import { MdDelete, MdClose } from "react-icons/md";

// --- Generic Info Modal Component (Keep as is from Primary) ---
const InfoModal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-2xl font-bold" aria-label="Close modal">×</button>
                <h3 className="text-lg font-semibold mb-4 text-gray-800">{title}</h3>
                <div className="text-sm text-gray-600 space-y-2">
                    {children}
                </div>
                <div className="mt-5 text-right">
                    <button onClick={onClose} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">Close</button>
                </div>
            </div>
        </div>
    );
};

// --- BMI Standards Modal Component (Keep Updated Ranges from Primary) ---
const BmiStandardsModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    const standards = [
        { range: "< 18.5", classification: "Underweight" },
        { range: "18.5 – 24.9", classification: "Normal weight" },
        { range: "25.0 – 29.9", classification: "Overweight" },
        { range: "30.0 – 39.9", classification: "Obesity" },
        { range: "≥ 40.0", classification: "Severe Obesity" },
    ];
    return ( <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm" onClick={onClose} > <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative" onClick={(e) => e.stopPropagation()} > <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-2xl font-bold" aria-label="Close modal" > × </button> <h3 className="text-lg font-semibold mb-4 text-gray-800">BMI Classification Standards</h3> <table className="w-full text-sm text-left text-gray-600"> <thead className="text-xs text-gray-700 uppercase bg-gray-100 rounded-t-lg"> <tr> <th scope="col" className="px-4 py-2">BMI Range (kg/m²)</th> <th scope="col" className="px-4 py-2">Classification</th> </tr> </thead> <tbody> {standards.map((standard, index) => ( <tr key={index} className="bg-white border-b border-gray-100 last:border-b-0"> <td className="px-4 py-2 font-medium text-gray-900 whitespace-nowrap">{standard.range}</td> <td className="px-4 py-2">{standard.classification}</td> </tr> ))} </tbody> </table> <div className="mt-5 text-right"> <button onClick={onClose} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2" > Close </button> </div> </div> </div> );
};

// --- BP Standards Modal Component (Keep as is from Primary) ---
const BpStandardsModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    const standards = [ { range: "< 90 / < 60", classification: "Low BP (Hypotension)" }, { range: "< 120 / < 80", classification: "Normal" }, { range: "120-139 / 80-89", classification: "High Normal (Prehypertension)" }, { range: "140-159 / 90-99", classification: "Stage 1 Hypertension" }, { range: "≥ 160 / ≥ 100", classification: "Stage 2 Hypertension" }, { range: "> 180 / > 120", classification: "Hypertensive Urgency/Crisis" }, ];
    return ( <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm" onClick={onClose} > <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg relative" onClick={(e) => e.stopPropagation()} > <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-2xl font-bold" aria-label="Close modal" > × </button> <h3 className="text-lg font-semibold mb-4 text-gray-800">Blood Pressure Classification</h3> <p className="text-xs text-gray-500 mb-3">Based on Systolic (Sys) / Diastolic (Dia) mmHg. Higher category applies if Sys/Dia fall into different categories.</p> <table className="w-full text-sm text-left text-gray-600"> <thead className="text-xs text-gray-700 uppercase bg-gray-100"> <tr> <th scope="col" className="px-4 py-2">Range (mmHg)</th> <th scope="col" className="px-4 py-2">Classification</th> </tr> </thead> <tbody> {standards.map((standard, index) => ( <tr key={index} className="bg-white border-b border-gray-100 last:border-b-0"> <td className="px-4 py-2 font-medium text-gray-900 whitespace-nowrap">{standard.range}</td> <td className="px-4 py-2">{standard.classification}</td> </tr> ))} </tbody> </table> <div className="mt-5 text-right"> <button onClick={onClose} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2" > Close </button> </div> </div> </div> );
};


// --- Main Vitals Form Component (Integrated) ---
const VitalsForm = ({ data, type, mrdNo }) => {
    const [isUpdated, setIsUpdated] = useState(false);
    const initialData = data?.[0] || {};

    const [formData, setFormData] = useState({
        systolic: '', diastolic: '', bp_status: '',
        pulse: '', pulse_status: '', pulse_comment: '',
        respiratory_rate: '', respiratory_rate_status: '', respiratory_rate_comment: '',
        temperature: '', temperature_status: '', temperature_comment: '',
        spO2: '', spO2_status: '', spO2_comment: '',
        weight: '', height: '',
        bmi: '', bmi_status: '', bmi_comment: '',
        aadhar: initialData.aadhar || '',
    });

    const [selectedFiles, setSelectedFiles] = useState({
        application_form: null,
        self_declared: null,
        consent: null,
        fc: null,
        report: null,
        manual: null,
    });

    

    const [isBpModalOpen, setIsBpModalOpen] = useState(false);
    const [isPulseModalOpen, setIsPulseModalOpen] = useState(false);
    const [isTempModalOpen, setIsTempModalOpen] = useState(false);
    const [isSpo2ModalOpen, setIsSpo2ModalOpen] = useState(false);
    const [isRespRateModalOpen, setIsRespRateModalOpen] = useState(false);
    const [isBmiModalOpen, setIsBmiModalOpen] = useState(false);

    const calculateBmiStatus = (bmiString) => { if (bmiString === null || bmiString === undefined || String(bmiString).trim() === '') { return ''; } const bmiValue = parseFloat(bmiString); if (isNaN(bmiValue)) { return ''; } if (bmiValue < 18.5) return 'Underweight'; if (bmiValue >= 18.5 && bmiValue <= 24.9) return 'Normal weight'; if (bmiValue >= 25.0 && bmiValue <= 29.9) return 'Overweight'; if (bmiValue >= 30.0 && bmiValue <= 39.9) return 'Obesity'; if (bmiValue >= 40.0) return 'Severe Obesity'; return ''; };
    const calculateBpStatus = (sysStr, diaStr) => { const sys = parseInt(sysStr, 10); const dia = parseInt(diaStr, 10); if (isNaN(sys) || isNaN(dia) || sys <= 0 || dia <= 0) { return ''; } if (sys > 180 || dia > 120) return 'Hypertensive Urgency/Crisis'; if (sys >= 160 || dia >= 100) return 'Stage 2 Hypertension'; if ((sys >= 140 && sys <= 159) || (dia >= 90 && dia <= 99)) return 'Stage 1 Hypertension'; if ((sys >= 120 && sys <= 139) || (dia >= 80 && dia <= 89)) return 'High Normal (Prehypertension)'; if (sys < 120 && dia < 80) return 'Normal'; if (sys < 90 || dia < 60) return 'Low BP (Hypotension)'; return 'Check Values'; };
    const calculateBmiValue = (heightStr, weightStr) => { const heightCm = parseFloat(heightStr); const weightKg = parseFloat(weightStr); if (isNaN(heightCm) || isNaN(weightKg) || heightCm <= 0 || weightKg <= 0) { return ''; } const heightM = heightCm / 100; const bmi = weightKg / (heightM * heightM); return bmi.toFixed(1); };
    const calculatePulseStatus = (pulseStr) => { const pulse = parseInt(pulseStr, 10); if (isNaN(pulse) || pulse <= 0) return ''; if (pulse < 60) return 'Bradycardia'; if (pulse > 100) return 'Tachycardia'; if (pulse >= 60 && pulse <= 100) return 'Normal'; return 'Check Value'; };
    const calculateTemperatureStatus = (tempStr) => { const tempF = parseFloat(tempStr); if (isNaN(tempF)) return ''; if (tempF < 99.1) return 'Normal'; if (tempF >= 99.1 && tempF <= 100.4) return 'Low Grade Fever'; if (tempF >= 100.5 && tempF <= 102.2) return 'Moderate Grade Fever'; if (tempF >= 102.3 && tempF <= 105.8) return 'High Grade Fever'; if (tempF > 105.8) return 'Hyperthermic'; return 'Check Value'; };
    const calculateSpo2Status = (spo2Str) => { const spo2 = parseInt(spo2Str, 10); if (isNaN(spo2) || spo2 < 0 || spo2 > 100) return ''; if (spo2 < 86) return 'Severe Hypoxemia'; if (spo2 >= 86 && spo2 <= 90) return 'Moderate Hypoxemia'; if (spo2 >= 91 && spo2 <= 94) return 'Mild Hypoxemia'; if (spo2 >= 95 && spo2 <= 100) return 'Normal'; return 'Check Value'; };
    const calculateRespRateStatus = (respRateStr) => { const rate = parseInt(respRateStr, 10); if (isNaN(rate) || rate <= 0) return ''; if (rate < 12) return 'Bradypnea'; if (rate > 20) return 'Tachypnea'; if (rate >= 12 && rate <= 20) return 'Normal'; return 'Check Value'; };

     useEffect(() => {
        const initialVitals = initialData?.vitals;
        
        const defaultState = {
            systolic: '', diastolic: '', bp_status: '', pulse: '', pulse_status: '', pulse_comment: '', respiratory_rate: '', respiratory_rate_status: '', respiratory_rate_comment: '', temperature: '', temperature_status: '', temperature_comment: '', spO2: '', spO2_status: '', spO2_comment: '', weight: '', height: '', bmi: '', bmi_status: '', bmi_comment: '',
            aadhar: initialData.aadhar || '', application_form: null, self_declared: null, consent: null, fc: null, report: null, manual: null
        };
        setSelectedFiles({ application_form: null, self_declared: null, consent: null, fc: null, report: null, manual: null });

        if (initialVitals && typeof initialVitals === 'object') {
            const loadedData = { ...defaultState };
            for (const key in defaultState) {
                if (key === 'aadhar') continue; // Aadhar is handled separately
                if (key in initialVitals && initialVitals[key] !== null && initialVitals[key] !== undefined) {
                    loadedData[key] = initialVitals[key];
                }
            }
            console.log(loadedData)
            loadedData.aadhar = initialData.aadhar || loadedData.aadhar || '';
            loadedData.bp_status = calculateBpStatus(loadedData.systolic, loadedData.diastolic);
            loadedData.pulse_status = calculatePulseStatus(loadedData.pulse);
            loadedData.temperature_status = calculateTemperatureStatus(loadedData.temperature);
            loadedData.spO2_status = calculateSpo2Status(loadedData.spO2);
            loadedData.respiratory_rate_status = calculateRespRateStatus(loadedData.respiratory_rate);
            loadedData.bmi = calculateBmiValue(loadedData.height, loadedData.weight);
            loadedData.bmi_status = calculateBmiStatus(loadedData.bmi);
            setFormData(loadedData);
        } else {
            console.log("No initial vitals found or invalid format. Using default empty state.");
            const initialBmi = calculateBmiValue(defaultState.height, defaultState.weight);
            defaultState.bmi = initialBmi;
            defaultState.bmi_status = calculateBmiStatus(initialBmi);
            setFormData(defaultState);
        }
    }, []); // Added initialData.aadhar to dependency if it can change independently


    useEffect(() => { const s = calculateBpStatus(formData.systolic, formData.diastolic); if (s !== formData.bp_status) { setFormData(p => ({ ...p, bp_status: s })); } }, [formData.systolic, formData.diastolic, formData.bp_status]);
    useEffect(() => { const bmiV = calculateBmiValue(formData.height, formData.weight); const bmiS = calculateBmiStatus(bmiV); if (bmiV !== formData.bmi || bmiS !== formData.bmi_status) { setFormData(p => ({ ...p, bmi: bmiV, bmi_status: bmiS })); } }, [formData.height, formData.weight, formData.bmi, formData.bmi_status]);
    useEffect(() => { const s = calculatePulseStatus(formData.pulse); if (s !== formData.pulse_status) { setFormData(p => ({ ...p, pulse_status: s })); } }, [formData.pulse, formData.pulse_status]);
    useEffect(() => { const s = calculateTemperatureStatus(formData.temperature); if (s !== formData.temperature_status) { setFormData(p => ({ ...p, temperature_status: s })); } }, [formData.temperature, formData.temperature_status]);
    useEffect(() => { const s = calculateSpo2Status(formData.spO2); if (s !== formData.spO2_status) { setFormData(p => ({ ...p, spO2_status: s })); } }, [formData.spO2, formData.spO2_status]);
    useEffect(() => { const s = calculateRespRateStatus(formData.respiratory_rate); if (s !== formData.respiratory_rate_status) { setFormData(p => ({ ...p, respiratory_rate_status: s })); } }, [formData.respiratory_rate, formData.respiratory_rate_status]);

    const handleInputChange = (e) => {
  const { name, value } = e.target;

  setFormData(prev => {
    const updated = { ...prev, [name]: value };

    // Check if any field changed from previous value
    if (prev[name] !== value) {
      setIsUpdated(true);
    }

    return updated;
  });
};


    const handleRemoveSelectedFile = (e, key) => {
        e.stopPropagation(); // Prevents opening the file browser
        
        // 1. Remove from state
        setSelectedFiles((prev) => {
            const newFiles = { ...prev };
            delete newFiles[key];
            return newFiles;
        });

        // 2. Reset the actual HTML input value
        // (Crucial: otherwise selecting the same file again won't trigger onChange)
        const inputElement = document.getElementById(key);
        if (inputElement) {
            inputElement.value = "";
        }
    };

    const handleDelete = async (e, key, mrdNo) => {
    e.preventDefault();
    try {
        const response = await axios.post(
            "http://localhost:8000/deleteUploadedFile",
            { mrdNo, key }
        );
        alert(response.data.message)
        if(response.data.success)
        {
            selectedFiles[key] = "";
        }
    } catch (error) {
        alert(error.message);
    }
};


    const handleFileChange = (event, fileKey) => {
        const file = event.target.files[0];
        setSelectedFiles((prevFiles) => ({ ...prevFiles, [fileKey]: file || null }));
        setIsUpdated(true)
        event.target.value = null; // Allows re-selecting the same file
    };

    const handleBrowseClick = (fileKey) => {
        document.getElementById(fileKey)?.click();
    };

    const fileFieldMapping = {
        application_form: 'application_form',
        self_declared: 'self_declared',
        consent: 'consent',
        fc: 'fc',
        report: 'report',
        manual: 'manual',
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (mrdNo === "") {
            alert("Please submit the entries first to get MRD Number");
            return;
        }
        if (!formData.aadhar) {
            alert("Aadhar number is missing. Cannot submit vitals.");
            return;
        }

        const submissionData = new FormData();
        for (const key in formData) {
            if (formData[key] !== null && formData[key] !== undefined) {
                submissionData.append(key, formData[key]);
            }
        }
        if (mrdNo) { // Only append mrdNo if it exists
            submissionData.append('mrdNo', mrdNo);
        }


        for (const frontendKey in selectedFiles) {
            const file = selectedFiles[frontendKey];
            if (file instanceof File) {
                const backendKey = fileFieldMapping[frontendKey];
                if (backendKey) {
                    submissionData.append(backendKey, file, file.name);
                } else {
                    console.warn(`No backend mapping for file key: ${frontendKey}`);
                }
            }
        }

        console.log("Submitting FormData:");
        for (let pair of submissionData.entries()) {
            console.log(pair[0] + ': ' + (pair[1] instanceof File ? `File(${pair[1].name}, size: ${pair[1].size}, type: ${pair[1].type})` : pair[1]));
        }

        const apiUrl = "http://localhost:8000/addvitals";

        try {
            const resp = await axios.post(apiUrl, submissionData);

            if (resp.status === 200 || resp.status === 201) {
                alert(`Vitals and documents ${resp.status === 201 ? 'added' : 'updated'} successfully!`);
                setSelectedFiles({ application_form: null, self_declared: null, consent: null, fc: null, report: null, manual: null });
                // Optionally reset text inputs or refetch data here
            } else {
                console.warn("Vitals/File submission response status not OK:", resp.status, resp.data);
                alert(`Received status ${resp.status}. ${resp.data?.message || resp.data?.error || 'Submission may not be fully successful.'}`);
            }
        } catch (error) {
            console.error("Error adding/updating vitals and files:", error);
            let errorMsg = "An unexpected error occurred during submission.";
            if (error.response) {
                console.error("Server Response Error Data:", error.response.data);
                let errorDetail = error.response.data?.error || error.response.data?.detail || JSON.stringify(error.response.data);
                 if (typeof error.response.data === 'object' && error.response.data !== null) {
                    let fieldErrors = [];
                    for (const field in error.response.data) {
                        if (Array.isArray(error.response.data[field])) {
                            fieldErrors.push(`${field}: ${error.response.data[field].join(', ')}`);
                        } else if (typeof error.response.data[field] === 'string') {
                             fieldErrors.push(`${field}: ${error.response.data[field]}`);
                        }
                    }
                    if (fieldErrors.length > 0) {
                        errorDetail = fieldErrors.join('\n');
                    } else if (typeof error.response.data === 'string') { // Non-field errors as plain string
                        errorDetail = error.response.data;
                    }
                }
                errorMsg = `Server Error (${error.response.status}): ${errorDetail}`;
            } else if (error.request) {
                errorMsg = "Could not connect to the server. Please check network or server status.";
                console.error("No response received:", error.request);
            } else {
                errorMsg = `Request Setup Error: ${error.message}`;
            }
            alert(errorMsg);
        }
    };

    const renderBpVisualization = (systolic, diastolic, status) => {
        const systolicValue = parseInt(systolic, 10); const diastolicValue = parseInt(diastolic, 10); if (isNaN(systolicValue) || isNaN(diastolicValue) || systolicValue <= 0 || diastolicValue <= 0 || systolicValue <= diastolicValue) { return <div className="text-center text-gray-500 italic text-sm p-4 h-full flex items-center justify-center">Enter valid BP values.</div>; } let meterColor = "gray"; let percentValue = 50; const meanBP = diastolicValue + (systolicValue - diastolicValue) / 3; if (status === 'Low BP (Hypotension)') { meterColor = "blue"; percentValue = 15; } else if (status === 'Normal') { meterColor = "green"; percentValue = 35; } else if (status === 'High Normal (Prehypertension)') { meterColor = "yellow"; percentValue = 55; } else if (status === 'Stage 1 Hypertension') { meterColor = "orange"; percentValue = 75; } else if (status === 'Stage 2 Hypertension') { meterColor = "red"; percentValue = 90; } else if (status === 'Hypertensive Urgency/Crisis') { meterColor = "red"; percentValue = 100; } const colorClass = `text-${meterColor}-600`; const svgColorClass = `text-${meterColor}-500`; return ( <div className="text-center p-3 border rounded-lg bg-gray-50 shadow-inner h-full flex flex-col justify-center min-h-[160px]"> <h4 className={`text-md font-semibold ${colorClass} mb-2 break-words`}>{status || 'Calculating...'}</h4> <div className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto"> <svg className="w-full h-full" viewBox="0 0 36 36" transform="rotate(-90)"> <circle className="text-gray-300" cx="18" cy="18" r="15.915" strokeWidth="2.5" fill="none" stroke="currentColor" /> <circle className={`${svgColorClass} transition-all duration-500 ease-in-out`} cx="18" cy="18" r="15.915" strokeWidth="2.5" strokeDasharray={`${percentValue.toFixed(1)}, 100`} strokeLinecap="round" fill="none" stroke="currentColor" /> </svg> <div className="absolute inset-0 flex flex-col items-center justify-center"> <p className="text-xs font-medium text-gray-600">BP</p> <p className={`text-lg font-bold ${colorClass}`}>{systolicValue}/{diastolicValue}</p> <p className="text-[10px] text-gray-500">(MAP: {meanBP.toFixed(0)})</p> </div> </div> </div> );
    };
    const renderBmiVisualization = (bmi, status) => {
        const bmiValue = parseFloat(bmi); if (isNaN(bmiValue) || bmiValue <= 0) { return <div className="text-center text-gray-500 italic text-sm p-4 h-full flex items-center justify-center">Enter valid H/W.</div>; } let meterColor = "gray"; let percentValue = 50; if (status === 'Underweight') { meterColor = "blue"; percentValue = 15; } else if (status === 'Normal weight') { meterColor = "green"; percentValue = 35; } else if (status === 'Overweight') { meterColor = "yellow"; percentValue = 55; } else if (status === 'Obesity') { meterColor = "orange"; percentValue = 75; } else if (status === 'Severe Obesity') { meterColor = "red"; percentValue = 90; } const colorClass = `text-${meterColor}-600`; const svgColorClass = `text-${meterColor}-500`; return ( <div className="text-center p-3 border rounded-lg bg-gray-50 shadow-inner h-full flex flex-col justify-center min-h-[160px]"> <h4 className={`text-md font-semibold ${colorClass} mb-2 break-words`}>{status || 'Calculating...'}</h4> <div className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto"> <svg className="w-full h-full" viewBox="0 0 36 36" transform="rotate(-90)"> <circle className="text-gray-300" cx="18" cy="18" r="15.915" strokeWidth="2.5" fill="none" stroke="currentColor" /> <circle className={`${svgColorClass} transition-all duration-500 ease-in-out`} cx="18" cy="18" r="15.915" strokeWidth="2.5" strokeDasharray={`${percentValue.toFixed(1)}, 100`} strokeLinecap="round" fill="none" stroke="currentColor" /> </svg> <div className="absolute inset-0 flex flex-col items-center justify-center"> <p className="text-xs font-medium text-gray-600">BMI</p> <p className={`text-xl font-bold ${colorClass}`}>{bmiValue.toFixed(1)}</p> </div> </div> </div> );
    };

    const fileInputsConfig = [
        { key: 'application_form', label: 'Application Form' },
        { key: 'self_declared', label: 'Self Declaration' },
        { key: 'consent', label: 'Consent' },
        { key: 'report', label: 'Lab Reports' },
        { key: 'fc', label: 'Fitness Certificate' },
        { key: 'manual', label: 'Confession' },
    ];

    return (
        <>
        
        {(!data || data.length === 0) && (
            <p className="text-center text-red-600 my-4">Please select an employee first to view vitals categories.</p>
        )}
        
            <BpStandardsModal isOpen={isBpModalOpen} onClose={() => setIsBpModalOpen(false)} />
            <BmiStandardsModal isOpen={isBmiModalOpen} onClose={() => setIsBmiModalOpen(false)} />
            <InfoModal isOpen={isPulseModalOpen} onClose={() => setIsPulseModalOpen(false)} title="Pulse Information"> <p><strong>Normal :</strong> 60 - 100 bpm</p> <p><strong>Bradycardia :</strong> &lt; 60 bpm</p> <p><strong>Tachycardia :</strong> &gt; 100 bpm</p> </InfoModal>
            <InfoModal isOpen={isTempModalOpen} onClose={() => setIsTempModalOpen(false)} title="Temperature Information (°F)"> <p><strong>Normal :</strong> &tl; 99.1°F </p> <p><strong>Low Grade Fever :</strong> 99.1°F - 100.4°F</p> <p><strong>Moderate Grade Fever :</strong> 100.5°F - 102.2°F</p> <p><strong>High Grade Fever :</strong> 102.3°F - 105.8°F</p> <p><strong>Hyperthermic :</strong> &gt; 105.8°F</p> </InfoModal>
            <InfoModal isOpen={isSpo2ModalOpen} onClose={() => setIsSpo2ModalOpen(false)} title="SpO₂ Information (%)"> <p><strong>Normal :</strong> 95% - 100%</p> <p><strong>Mild Hypoxemia :</strong> 91% - 94%</p> <p><strong>Moderate Hypoxemia :</strong> 86% - 90%</p> <p><strong>Severe Hypoxemia :</strong> &lt; 86%</p> </InfoModal>
            <InfoModal isOpen={isRespRateModalOpen} onClose={() => setIsRespRateModalOpen(false)} title="Respiratory Rate Information"> <p><strong>Normal :</strong> 12 - 20 breaths/min</p> <p><strong>Bradypnea :</strong> &lt; 12 breaths/min</p> <p><strong>Tachypnea :</strong> &gt; 20 breaths/min</p> </InfoModal>
        
            <div className="bg-white mt-8 p-4 sm:p-6 rounded-xl shadow-lg">

                
                {data &&(data.length > 0) && (
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                    <h2 className="text-xl font-semibold mb-6 text-gray-800 border-b pb-2">Vitals & Documents Form</h2>
                    <section className="p-4 border rounded-lg bg-slate-50 shadow-sm">
                        <div className="flex justify-between items-center mb-3"> <h3 className="text-lg font-semibold text-gray-700">Blood Pressure</h3> <button type="button" onClick={() => setIsBpModalOpen(true)} className="text-blue-500 hover:text-blue-700" title="View Blood Pressure Standards"> <FaInfoCircle size={18} /> </button> </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
                            <div className="md:col-span-2 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                     <div> <label htmlFor="systolic" className="block text-sm font-medium text-gray-700 mb-1">Systolic <span className='text-xs'>(mmHg)</span></label> <input id="systolic" name="systolic" onChange={handleInputChange} value={formData.systolic || ''} type="number" placeholder="e.g., 120" className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm" /> </div>
                                     <div> <label htmlFor="diastolic" className="block text-sm font-medium text-gray-700 mb-1">Diastolic <span className='text-xs'>(mmHg)</span></label> <input id="diastolic" name="diastolic" onChange={handleInputChange} value={formData.diastolic || ''} type="number" placeholder="e.g., 80" className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm" /> </div>
                                </div>
                                <div> <label htmlFor="bp_status" className="block text-sm font-medium text-gray-700">Overall BP Status</label> <input id="bp_status" name="bp_status" readOnly value={formData.bp_status || ''} type="text" placeholder="Auto-calculated" className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed focus:outline-none sm:text-sm" tabIndex={-1} /> </div>
                            </div>
                            <div className="md:col-span-1 flex items-center justify-center mt-4 md:mt-0"> {renderBpVisualization(formData.systolic, formData.diastolic, formData.bp_status)} </div>
                        </div>
                    </section>
                    <section className="p-4 border rounded-lg bg-slate-50 shadow-sm">
                        <div className="flex justify-between items-center mb-3"> <h3 className="text-md font-semibold text-gray-700">Pulse <span className='text-xs font-normal'>(/min)</span></h3> <button type="button" onClick={() => setIsPulseModalOpen(true)} className="text-blue-500 hover:text-blue-700" title="Pulse Information"> <FaInfoCircle size={16} /> </button> </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div> <label htmlFor="pulse" className="block text-sm font-medium text-gray-700 mb-1">Value</label> <input id="pulse" name="pulse" onChange={handleInputChange} value={formData.pulse || ''} type="number" placeholder="e.g., 72" className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm" /> </div>
                            <div> <label htmlFor="pulse_status" className="block text-sm font-medium text-gray-700 mb-1">Status</label> <input id="pulse_status" name="pulse_status" readOnly value={formData.pulse_status || ''} type="text" placeholder="Auto-calculated" className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed focus:outline-none sm:text-sm" tabIndex={-1} /> </div>
                            <div> <label htmlFor="pulse_comment" className="block text-sm font-medium text-gray-700 mb-1">Comment</label> <input id="pulse_comment" name="pulse_comment" onChange={handleInputChange} value={formData.pulse_comment || ''} type="text" placeholder="Optional" className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm" /> </div>
                        </div>
                    </section>
                    <section className="p-4 border rounded-lg bg-slate-50 shadow-sm">
                        <div className="flex justify-between items-center mb-3"> <h3 className="text-md font-semibold text-gray-700">Temperature <span className='text-xs font-normal'>(°F)</span></h3> <button type="button" onClick={() => setIsTempModalOpen(true)} className="text-blue-500 hover:text-blue-700" title="Temperature Information"> <FaInfoCircle size={16} /> </button> </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div> <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 mb-1">Value</label> <input id="temperature" name="temperature" onChange={handleInputChange} value={formData.temperature || ''} type="number" step="0.1" placeholder="e.g., 98.6" className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm" /> </div>
                            <div> <label htmlFor="temperature_status" className="block text-sm font-medium text-gray-700 mb-1">Status</label> <input id="temperature_status" name="temperature_status" readOnly value={formData.temperature_status || ''} type="text" placeholder="Auto-calculated" className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed focus:outline-none sm:text-sm" tabIndex={-1} /> </div>
                            <div> <label htmlFor="temperature_comment" className="block text-sm font-medium text-gray-700 mb-1">Comment</label> <input id="temperature_comment" name="temperature_comment" onChange={handleInputChange} value={formData.temperature_comment || ''} type="text" placeholder="Optional" className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm" /> </div>
                        </div>
                    </section>
                    <section className="p-4 border rounded-lg bg-slate-50 shadow-sm">
                        <div className="flex justify-between items-center mb-3"> <h3 className="text-md font-semibold text-gray-700">SpO₂ <span className='text-xs font-normal'>(%)</span></h3> <button type="button" onClick={() => setIsSpo2ModalOpen(true)} className="text-blue-500 hover:text-blue-700" title="SpO₂ Information"> <FaInfoCircle size={16} /> </button> </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div> <label htmlFor="spO2" className="block text-sm font-medium text-gray-700 mb-1">Value</label> <input id="spO2" name="spO2" onChange={handleInputChange} value={formData.spO2 || ''} type="number" placeholder="e.g., 98" className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm" /> </div>
                            <div> <label htmlFor="spO2_status" className="block text-sm font-medium text-gray-700 mb-1">Status</label> <input id="spO2_status" name="spO2_status" readOnly value={formData.spO2_status || ''} type="text" placeholder="Auto-calculated" className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed focus:outline-none sm:text-sm" tabIndex={-1} /> </div>
                            <div> <label htmlFor="spO2_comment" className="block text-sm font-medium text-gray-700 mb-1">Comment</label> <input id="spO2_comment" name="spO2_comment" onChange={handleInputChange} value={formData.spO2_comment || ''} type="text" placeholder="Optional" className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm" /> </div>
                        </div>
                    </section>
                    <section className="p-4 border rounded-lg bg-slate-50 shadow-sm">
                        <div className="flex justify-between items-center mb-3"> <h3 className="text-md font-semibold text-gray-700">Respiratory Rate <span className='text-xs font-normal'>(/min)</span></h3> <button type="button" onClick={() => setIsRespRateModalOpen(true)} className="text-blue-500 hover:text-blue-700" title="Respiratory Rate Information"> <FaInfoCircle size={16} /> </button> </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div> <label htmlFor="respiratory_rate" className="block text-sm font-medium text-gray-700 mb-1">Value</label> <input id="respiratory_rate" name="respiratory_rate" onChange={handleInputChange} value={formData.respiratory_rate || ''} type="number" placeholder="e.g., 16" className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm" /> </div>
                            <div> <label htmlFor="respiratory_rate_status" className="block text-sm font-medium text-gray-700 mb-1">Status</label> <input id="respiratory_rate_status" name="respiratory_rate_status" readOnly value={formData.respiratory_rate_status || ''} type="text" placeholder="Auto-calculated" className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed focus:outline-none sm:text-sm" tabIndex={-1} /> </div>
                            <div> <label htmlFor="respiratory_rate_comment" className="block text-sm font-medium text-gray-700 mb-1">Comment</label> <input id="respiratory_rate_comment" name="respiratory_rate_comment" onChange={handleInputChange} value={formData.respiratory_rate_comment || ''} type="text" placeholder="Optional" className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm" /> </div>
                        </div>
                    </section>
                    <section className="p-4 border rounded-lg bg-slate-50 shadow-sm space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                            <div className='space-y-4'>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                     <div> <label htmlFor="height" className="block text-sm font-medium text-gray-700 mb-1">Height <span className='text-xs font-normal'>(cm)</span></label> <input id="height" name="height" onChange={handleInputChange} value={formData.height || ''} type="number" placeholder="e.g., 175" className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm" /> </div>
                                    <div> <label htmlFor='weight' className="block text-sm font-medium text-gray-700 mb-1">Weight <span className='text-xs font-normal'>(Kg)</span></label> <input id='weight' name="weight" onChange={handleInputChange} value={formData.weight || ''} type="number" step="0.1" placeholder="e.g., 70.5" className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm" /> </div>
                                </div>
                                <div className="pt-4 border-t border-gray-200">
                                    <div className="flex justify-between items-center mb-1"> <h4 className="text-md font-semibold text-gray-700">BMI <span className='text-xs font-normal'>(kg/m²)</span></h4> <button type="button" onClick={() => setIsBmiModalOpen(true)} className="text-blue-500 hover:text-blue-700" title="View BMI Standards"> <FaInfoCircle size={16}/> </button> </div>
                                    <div className="space-y-3">
                                        <div> <label htmlFor="bmi" className="block text-sm font-medium text-gray-700 mb-1">Calculated BMI</label> <input id="bmi" name="bmi" readOnly value={formData.bmi || ''} type="text" placeholder="Enter H/W" className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed focus:outline-none sm:text-sm" tabIndex={-1} /> </div>
                                        <div> <label htmlFor="bmi_status" className="block text-sm font-medium text-gray-700 mb-1">BMI Status</label> <input id="bmi_status" name="bmi_status" readOnly value={formData.bmi_status || ''} type="text" placeholder="Auto-calculated" className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed focus:outline-none sm:text-sm" tabIndex={-1} /> </div>
                                        <div> <label htmlFor="bmi_comment" className="block text-sm font-medium text-gray-700 mb-1">Comment</label> <input id="bmi_comment" name="bmi_comment" onChange={handleInputChange} value={formData.bmi_comment || ''} type="text" placeholder="Optional" className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm" /> </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-center pt-5 md:pt-0"> {renderBmiVisualization(formData.bmi, formData.bmi_status)} </div>
                        </div>
                    </section>
<section className="pt-5 border-t border-gray-200">
  <h3 className="text-lg font-semibold text-gray-700 mb-3">Upload Documents</h3>
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
    {fileInputsConfig
      .filter((config) => {
        if (type === "Visitor") {
          const backendKey = fileFieldMapping[config.key];
          return ["report", "manual"].includes(backendKey);
        }
        return true;
      })
      .map((config) => {
        // Get access level
        const accessLevel = localStorage.getItem("accessLevel");
        const canViewFiles = accessLevel === "doctor" || accessLevel === "nurse";
        const canDeleteFile = accessLevel === "doctor";

        return (
          <div key={config.key}>
            <label className="block text-sm font-medium text-gray-600 mb-1">{config.label}</label>

            {/* UPLOAD UI */}
            <motion.div
              className={`relative border rounded-md mb-2 p-2 flex items-center justify-between text-sm cursor-pointer transition-colors ${
                selectedFiles[config.key]
                  ? "bg-blue-50 border-blue-300"
                  : "border-gray-300 bg-white hover:bg-gray-50"
              }`}
              onClick={() => handleBrowseClick(config.key)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span
                className={`truncate flex-1 ${
                  selectedFiles[config.key] ? "text-blue-800 font-medium" : "text-gray-400"
                }`}
              >
                {selectedFiles[config.key] ? selectedFiles[config.key].name : "Choose file..."}
              </span>

              <div className="flex items-center">
                {selectedFiles[config.key] && (
                  <button
                    onClick={(e) => handleRemoveSelectedFile(e, config.key)}
                    className="mr-2 p-1 rounded-full hover:bg-red-100 text-red-500 transition-colors z-10"
                    title="Remove selected file"
                  >
                    <MdClose size={18} />
                  </button>
                )}

                <FaFileUpload
                  className={`${
                    selectedFiles[config.key] ? "text-blue-600" : "text-blue-500"
                  } flex-shrink-0`}
                />
              </div>

              <input
                type="file"
                id={config.key}
                style={{ display: "none" }}
                onChange={(e) => handleFileChange(e, config.key)}
                accept=".pdf,.jpg,.jpeg,.png,image/*"
              />
            </motion.div>

            {/* VIEW & DELETE OPTIONS */}
            {canViewFiles && (
              <>
                {formData[config.key] ? (
                  <div className="flex items-center">
                    <a
                      href={`http://localhost:8000/media/${formData[config.key]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      View Uploaded File
                    </a>

                    {/* DELETE BUTTON ONLY FOR DOCTOR */}
                    {canDeleteFile && (
                      <button
                        className="ms-24 text-xl text-red-700"
                        onClick={(e) => handleDelete(e, config.key, mrdNo)}
                        title="Delete File"
                      >
                        <MdDelete />
                      </button>
                    )}
                  </div>
                ) : (
                  <span>No file uploaded yet</span>
                )}
              </>
            )}
          </div>
        );
      })}
  </div>
</section>

                    <div className="mt-8 flex">
                        <button
                        type="submit"
                        className={`px-6 py-2 rounded-md shadow text-base transition duration-300 
                            ${(!formData.aadhar || !isUpdated)
                                ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                                : "bg-blue-600 text-white hover:bg-blue-700"
                            }`}
                            disabled={!formData.aadhar || !isUpdated}
                            title={
                                !formData.aadhar 
                                    ? "Aadhar number is required to submit" 
                                    : !isUpdated 
                                        ? "Update any field to enable submit" 
                                        : "Submit Vitals & Documents"
                            }
                        >
                            Submit Vitals & Documents
                        </button>


                    </div>  
                    <p className="text-sm text-gray-600">
              * Press only if changes in the above details
            </p>
                </form>
                )}
            </div>

            <style jsx>{`
                .text-blue-600 { color: #2563eb; } .text-blue-500 { color: #3b82f6; }
                .text-green-600 { color: #16a34a; } .text-green-500 { color: #22c55e; }
                .text-yellow-600 { color: #ca8a04; } .text-yellow-500 { color: #eab308; }
                .text-orange-600 { color: #ea580c; } .text-orange-500 { color: #f97316; }
                .text-red-600 { color: #dc2626; } .text-red-500 { color: #ef4444; }
                .text-gray-600 { color: #4b5563; } .text-gray-500 { color: #6b7280; } .text-gray-300 { color: #d1d5db; }
                button:disabled { background-color: #93c5fd; cursor: not-allowed; opacity: 0.7; }
                button:disabled:hover { background-color: #93c5fd; }
                .min-h-\[160px\] { min-height: 160px; }
            `}</style>
    
        </>
    );
};

export default VitalsForm;