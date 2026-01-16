import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Filter, Download, User, Activity, FileText, PlusCircle, Search } from "lucide-react";
import Sidebar from "./Sidebar"; 
import { useNavigate } from "react-router-dom";
import axios from "axios";
import * as XLSX from "xlsx"; 
import { saveAs } from "file-saver"; 

// --- UI Constants for Consistency ---
const uiStyles = {
    card: "bg-white p-6 rounded-xl shadow-sm border border-gray-100 transition-all hover:shadow-md",
    label: "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5",
    input: "w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all",
    select: "w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all cursor-pointer",
    buttonPrimary: "w-full py-2.5 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-blue-200",
    buttonSecondary: "px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-all focus:ring-2 focus:ring-gray-200",
    sectionTitle: "text-lg font-bold text-gray-800 flex items-center gap-2 mb-4",
};

// --- Filter Section Definitions ---
const filterSections = [
    { id: "employementstatus", label: "Employment Status",  roles: ["Employee", "Contractor"]},
    { id: "personaldetails", label: "Personal Details", roles: ["Employee", "Contractor", "Visitor"] },
    { id: "employementdetails", label: "Employment Details", roles: ["Employee", "Contractor"] },
    { id: "medicalhistory", label: "Medical History", roles: ["Employee", "Contractor", "Visitor"] },
    { id: "vaccination", label: "Vaccination", roles: ["Employee","Contractor", "Visitor"] },
    { id: "purpose", label: "Purpose", roles: ["Employee","Contractor", "Visitor"] },
    { id: "vitals", label: "Vitals", roles: ["Employee","Contractor", "Visitor"] },
    { id: "investigations", label: "Investigations", roles: ["Employee","Contractor", "Visitor"] },
    { id: "fitness", label: "Fitness", roles: ["Employee","Contractor", "Visitor"] },
    { id: "significantnotes", label: "Significant Notes", roles: ["Employee","Contractor", "Visitor"] },
    { id: "shiftingambulance", label: "Shifting Ambulance", roles: ["Employee","Contractor", "Visitor"] },
    { id: "consultationreview", label: "Consultation Review", roles: ["Employee","Contractor", "Visitor"] },
    { id: "referrals", label: "Referrals", roles: ["Employee","Contractor", "Visitor"] },
    { id: "statutoryforms", label: "Statutory Forms", roles: ["Employee","Contractor", "Visitor"] },
];

// --- Helper function to calculate age ---
const calculateAge = (dobString) => {
    if (!dobString) return '-';
    try {
        const birthDate = new Date(dobString);
        if (isNaN(birthDate.getTime())) { return '-'; }
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; }
        return age >= 0 ? age : '-';
    } catch (error) {
        console.error("Error calculating age from DOB:", dobString, error);
        return '-';
    }
};

// --- Main Component ---
const RecordsFilters = () => {
    const navigate = useNavigate();
    const [selectedFilters, setSelectedFilters] = useState([]);
    const [selectedSection, setSelectedSection] = useState(null);
    const [employees, setEmployees] = useState([]); 
    const [filteredEmployees, setFilteredEmployees] = useState([]); 
    const [loading, setLoading] = useState(false);
    const [selectedRole, setSelectedRole] = useState(""); 
    
    // Referral options state
    const [specialityOptions, setSpecialityOptions] = useState([]);
    const [doctorOptions, setDoctorOptions] = useState([]);
    const [includeContact, setIncludeContact] = useState(false);
    const [hospitalOptions, setHospitalOptions] = useState([]);

    

   
    const handleRoleChange = (e) => setSelectedRole(e.target.value);
    const handleFilterClick = (sectionId) => setSelectedSection(sectionId);

    // --- Filter Management Functions ---
    const removeFilter = (filterToRemove) => {
        setSelectedFilters((prevFilters) =>
            prevFilters.filter((item) => JSON.stringify(item) !== JSON.stringify(filterToRemove))
        );
    };

    const addFilter = (formData) => {
        setSelectedFilters((prevFilters) => {
            const updatedFilters = [...prevFilters];
            Object.entries(formData).forEach(([key, value]) => {
                if (value === "" || value === null || value === undefined || (typeof value === 'object' && !Array.isArray(value) && value !== null && Object.keys(value).length === 0)) return;

                let filterKey = key;
                let filterObject = { [key]: value };
                console.log(filterKey, filterObject)
                
                if (key === "param" && typeof value === 'object' && value.param) {
                    filterKey = `param_${value.param}`; filterObject = { [filterKey]: value };
                } else if (key === "investigation" && typeof value === 'object' && value.form && value.param) {
                    filterKey = `investigation_${value.form}_${value.param}`; filterObject = { [filterKey]: value };
                } else if (key === "familyCondition" && typeof value === 'object' && value.condition && value.relation) {
                    filterKey = `family_${value.condition}_${value.relation}`; filterObject = { [filterKey]: value };
                } else if (key === "referrals" && typeof value === 'object') { 
                    filterKey = `referrals_${JSON.stringify(value)}`; filterObject = { [filterKey]: value };
                } else if (key === "purpose" && typeof value === 'object') { 
                    filterKey = `purpose_${JSON.stringify(value)}`; filterObject = { [filterKey]: value };
                } else if (key === "fitness" && typeof value === 'object') { 
                    filterKey = `fitness_${JSON.stringify(value)}`; filterObject = { [filterKey]: value };
                } else if (key === "significantNotes" && typeof value === 'object') {
                    filterKey = `significant_${JSON.stringify(value)}`; filterObject = { [filterKey]: value };
                } else if (key === "statutoryFormFilter" && typeof value === 'object') { 
                    filterKey = `statutory_${value.formType}_${value.from}_${value.to}`; filterObject = { [filterKey]: value };
                } else if (key.startsWith('personal_')) { 
                    filterKey = key; filterObject = { [filterKey]: value };
                } else if (key.startsWith("shiftingAmbulance")) {
                    filterKey = key; filterObject = { [filterKey]: value};
                }

                const existingIndex = updatedFilters.findIndex( f => Object.keys(f)[0] === filterKey );
                if (existingIndex !== -1) { updatedFilters[existingIndex] = filterObject; }
                else { updatedFilters.push(filterObject); }
            });
            return updatedFilters;
        });
    };
    
    const [dateRange, setDateRange] = useState({ fromDate: "", toDate: "" });
    const { fromDate, toDate } = dateRange;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setDateRange(prev => ({ ...prev, [name]: value }));
    };

    
    const applyFiltersToData = async () => {
        let results = [...employees];

        
        
        
        const filtersMap = selectedFilters.reduce((acc, filter) => {
            const key = Object.keys(filter)[0];
            acc[key] = Object.values(filter)[0];
            return acc;
        }, {});
        filtersMap.role = selectedRole
        console.log(filtersMap)
        const response = await axios.post("http://localhost:8000/get_filtered_data", filtersMap);
        results = results.filter(employee => {
            for (const key in filtersMap) {
                const value = filtersMap[key];
                console.log("Filtering Key:", key, "Value:", value, "Employee ID:", employee.id, employee.nationality);
                
                
                if (key === 'sex') { if (!employee.sex || employee.sex?.toLowerCase() !== value.toLowerCase()) return false; }
                else if (key === 'bloodgrp') { if (employee.bloodgrp !== value) return false; }
                else if (key === 'marital_status') { if (!employee.marital_status || employee.marital_status?.toLowerCase() !== value.toLowerCase()) return false; }
                else if (key === 'ageFrom') { const age = calculateAge(employee.dob); if (age === '-' || age < parseInt(value, 10)) return false; }
                else if (key === 'ageTo') { const age = calculateAge(employee.dob); if (age === '-' || age > parseInt(value, 10)) return false; }
                else if (key === 'nationality') {if (!employee.nationality || employee.nationality?.toLowerCase() !== value.toLowerCase()) return false; }
                else if (key === 'designation') { if (!employee.designation || employee.designation?.toLowerCase() !== value.toLowerCase()) return false; }
                else if (key === 'department') { if (!employee.department || employee.department?.toLowerCase() !== value.toLowerCase()) return false; }
                else if (key === 'employer') { if (!employee.employer || employee.employer?.toLowerCase() !== value.toLowerCase()) return false; }
                else if (key === 'moj') { if (!employee.moj || employee.moj?.toLowerCase() !== value.toLowerCase()) return false; }
                else if (key === 'job_nature') { if (!employee.job_nature || employee.job_nature?.toLowerCase() !== value.toLowerCase()) return false; }
                else if (key === 'previousEmployer') { if (!employee.previousEmployer || employee.previousEmployer?.toLowerCase() !== value.toLowerCase()) return false; }
                else if (key === 'preiousLocation') { if (!employee.previousLocation || employee.previousLocation?.toLowerCase() !== value.toLowerCase()) return false; }
                
                // --- Date Ranges ---
                else if (key === 'dojFrom') {
                    if (!employee.doj) return false; 
                    try {
                        const employeeDoj = new Date(employee.doj); const filterFromDate = new Date(value);
                        employeeDoj.setHours(0, 0, 0, 0); filterFromDate.setHours(0, 0, 0, 0);
                        if (isNaN(employeeDoj) || isNaN(filterFromDate) || employeeDoj < filterFromDate) return false;
                    } catch (e) { return false; } 
                }
                else if (key === 'dojTo') {
                    if (!employee.doj) return false;
                    try {
                        const employeeDoj = new Date(employee.doj); const filterToDate = new Date(value);
                        employeeDoj.setHours(0, 0, 0, 0); filterToDate.setHours(0, 0, 0, 0);
                        if (isNaN(employeeDoj) || isNaN(filterToDate) || employeeDoj > filterToDate) return false;
                    } catch (e) { return false; }
                }
                // --- Status ---
                else if (key === 'status') {
                     if (!employee.status || employee.status.toLowerCase() !== value.toLowerCase()) return false;
                     if (value.toLowerCase() === 'transferred to' && filtersMap.transferred_to) {
                         if (!employee.transfer_details || employee.transfer_details.toLowerCase() !== filtersMap.transferred_to.toLowerCase()) return false;
                     }
                     else if (value.toLowerCase() !== 'transferred to' && (filtersMap.from || filtersMap.to)) {
                         if (!employee.since_date) return false;
                         try {
                             const employeeStatusDate = new Date(employee.since_date); employeeStatusDate.setHours(0,0,0,0);
                             if (isNaN(employeeStatusDate.getTime())) return false;
                             let dateMatch = true;
                             if (filtersMap.from) { const filterFrom = new Date(filtersMap.from); filterFrom.setHours(0,0,0,0); if (isNaN(filterFrom.getTime()) || employeeStatusDate < filterFrom) dateMatch = false; }
                             if (dateMatch && filtersMap.to) { const filterTo = new Date(filtersMap.to); filterTo.setHours(0,0,0,0); if (isNaN(filterTo.getTime()) || employeeStatusDate > filterTo) dateMatch = false; }
                              if (!dateMatch) return false;
                         } catch(e) { return false; }
                     }
                 }
                
                else if (key.startsWith('param_')) {
                    const filterData = value; const vitalParam = filterData.param;
                    if (!employee.vitals || employee.vitals[vitalParam] === undefined || employee.vitals[vitalParam] === null || employee.vitals[vitalParam] === '') return false;
                    if (filterData.value) { 
                         const bmiValue = parseFloat(employee.vitals.bmi); if (isNaN(bmiValue)) return false;
                         let empCategory = '';
                         if (bmiValue < 18.5) empCategory = 'Under weight'; else if (bmiValue < 25) empCategory = 'Normal'; else if (bmiValue < 30) empCategory = 'Over weight'; else if (bmiValue < 35) empCategory = 'Obese'; else empCategory = 'Extremely Obese';
                         if(empCategory.toLowerCase() !== filterData.value.toLowerCase()) return false;
                    } else { 
                        const vitalValue = parseFloat(employee.vitals[vitalParam]); const fromValue = parseFloat(filterData.from); const toValue = parseFloat(filterData.to);
                        if (isNaN(vitalValue) || isNaN(fromValue) || isNaN(toValue) || vitalValue < fromValue || vitalValue > toValue) return false;
                    }
                }
                
                else if (key.startsWith('investigation_')) {
                    const filterData = value;
                    const investigationCategory = employee[filterData.form];
                    if (!investigationCategory) return false;
                    const dataAccessKey = filterData.param;

                    if (filterData.from && filterData.to) {
                        const valueToTestStr = investigationCategory[`${dataAccessKey}_comments`];
                        if (valueToTestStr === undefined || valueToTestStr === null || String(valueToTestStr).trim() === '') return false;
                        const numVal = parseFloat(valueToTestStr); const fromVal = parseFloat(filterData.from); const toVal = parseFloat(filterData.to);
                        if (isNaN(numVal) || numVal < fromVal || numVal > toVal) return false;
                    }
                    if (filterData.status) {
                        const statusToTest = investigationCategory[dataAccessKey];
                        const statusInComments = investigationCategory[`${dataAccessKey}_comments`];
                        const statusMatch = (statusToTest && statusToTest.toLowerCase() === filterData.status.toLowerCase()) || (statusInComments && statusInComments.toLowerCase() === filterData.status.toLowerCase());
                        if (!statusMatch) return false;
                    }
                }
                
                else if (key.startsWith('fitness_')) { 
                    const filterData = value; if (!employee.fitnessassessment) return false;
                    const fitnessMatch = Object.entries(filterData).every(([fitnessKey, fitnessValue]) => employee.fitnessassessment[fitnessKey]?.toLowerCase() === fitnessValue?.toLowerCase());
                    if (!fitnessMatch) return false;
                }
                // --- Special Cases & Ambulance ---
                else if (key === 'specialCase') {
                    const hasCase = !!(employee.fitnessassessment?.special_cases?.trim() || employee.consultation?.special_cases?.trim());
                    if ((value === 'Yes' && !hasCase) || (value !== 'Yes' && hasCase)) return false;
                }
               else if (key === 'shiftingAmbulance') {
                    const ambulanceShiftRequired = employee.consultation?.shifting_required?.toLowerCase() === 'yes'; 
                    if ((value === 'Yes' && !ambulanceShiftRequired) || (value === 'No' && ambulanceShiftRequired)) return false;
                }
                else if (key === 'consultationReview') {
                    const hasReviewDate = !!employee.consultation?.follow_up_date; 
                    if ((value === 'Yes' && !hasReviewDate) || (value === 'No' && hasReviewDate)) return false;
                }
                // --- Medical History ---
                 else if (['smoking', 'alcohol', 'paan/beetle'].includes(key)) {
                     const habitData = employee.medicalhistory?.personal_history?.[key]; if (!habitData || habitData.yesNo?.toLowerCase() !== value.toLowerCase()) return false;
                 }
                 else if (key === 'diet') {
                    const dietData = employee.medicalhistory?.personal_history?.diet; if (!dietData || !value.toLowerCase().includes(dietData.toLowerCase())) return false;
                 }
                 else if (key.startsWith('personal_')) {
                     const condition = key.substring('personal_'.length); const conditionData = employee.medicalhistory?.medical_data?.[condition];
                     const hasCond = conditionData && Array.isArray(conditionData.children) && conditionData.children.length > 0;
                     if ((value === 'Yes' && !hasCond) || (value === 'No' && hasCond)) return false;
                 }
                else if (key.startsWith('family_')) {
                    const filterData = value; const medicalData = employee.medicalhistory?.medical_data;
                    let employeeHasCondition = false; let commentsToCheck = "";
                    if (filterData.condition) {
                        const conditionData = medicalData?.[filterData.condition];
                        employeeHasCondition = conditionData && conditionData.comment && conditionData.comment.trim() !== "";
                        if (employeeHasCondition) commentsToCheck = conditionData.comment;
                    } else {
                        if (medicalData) {
                            employeeHasCondition = Object.values(medicalData).some(cond => cond && cond.comment && cond.comment.trim() !== "");
                            if (employeeHasCondition) commentsToCheck = Object.values(medicalData).map(c => c.comment || "").join(" ");
                        }
                    }
                    if (filterData.status) { if ((filterData.status === 'Yes' && !employeeHasCondition) || (filterData.status === 'No' && employeeHasCondition)) return false; }
                    if (filterData.relation && employeeHasCondition) { if (!new RegExp(`\\b${filterData.relation}\\b`, 'i').test(commentsToCheck)) return false; }
                }   
                 else if (['drugAllergy', 'foodAllergy', 'otherAllergies'].includes(key)) {
                     let allergyType = key === 'drugAllergy' ? 'drug' : key === 'foodAllergy' ? 'food' : 'others';
                     const allergyData = employee.medicalhistory?.allergy_fields?.[allergyType]; if (!allergyData || allergyData.yesNo?.toLowerCase() !== value.toLowerCase()) return false;
                }
                 else if (key === 'surgicalHistory') {
                     const hasSurg = employee.medicalhistory?.surgical_history && Array.isArray(employee.medicalhistory.surgical_history.children) && employee.medicalhistory.surgical_history.children.length > 0;
                     if ((value === 'Yes' && !hasSurg) || (value === 'No' && hasSurg)) return false;
                 }
                // --- Vaccination ---
                else if (['disease', 'vaccine', 'vaccine_status'].includes(key)) {
                     if (!employee.vaccinationrecord?.vaccination || !Array.isArray(employee.vaccinationrecord?.vaccination)) return false;
                     const match = employee.vaccinationrecord.vaccination.some(vac => {
                         if (key === 'disease') return vac.disease_name?.toLowerCase() === value.toLowerCase();
                         if (key === 'vaccine') return vac.vaccine_name?.toLowerCase() === value.toLowerCase();
                         if (key === 'vaccine_status') return vac.status?.toLowerCase() === value.toLowerCase();
                         return false;
                     });
                     if (!match) return false;
                 }
                // --- Purpose ---
                else if (key.startsWith('purpose_')) {
                    const filterData = value; 
                    if (filterData.type_of_visit && (employee.type_of_visit?.toLowerCase() !== filterData.type_of_visit.toLowerCase())) return false;
                    if (filterData.register && (employee.register?.toLowerCase() !== filterData.register.toLowerCase())) return false;
                    if (filterData.specificCategory && (employee.purpose?.toLowerCase() !== filterData.specificCategory.toLowerCase())) return false;
                    if (filterData.fromDate || filterData.toDate) {
                        if (!employee.entry_date) return false;
                        try {
                            const entryDate = new Date(employee.entry_date); entryDate.setHours(0,0,0,0);
                            if (isNaN(entryDate.getTime())) return false;
                            let dateCheck = true;
                            if (filterData.fromDate) { const from = new Date(filterData.fromDate); from.setHours(0,0,0,0); if (isNaN(from.getTime()) || entryDate < from) dateCheck = false; }
                            if (dateCheck && filterData.toDate) { const to = new Date(filterData.toDate); to.setHours(0,0,0,0); if (isNaN(to.getTime()) || entryDate > to) dateCheck = false; }
                             if (!dateCheck) return false;
                        } catch (e) { return false; }
                    }
                }
                // --- Significant Notes ---
                else if (key.startsWith('significant_')) {
                    const filterData = value; const notes = employee.significantnotes; 
                    if (!notes) return false; 
                    const notesMatch = Object.entries(filterData).every(([noteKey, filterValue]) => {
                        const employeeValue = notes[noteKey];
                        return employeeValue && employeeValue.toLowerCase() === filterValue.toLowerCase();
                    });
                    if (!notesMatch) return false;
                }
                // --- Referrals ---
                 else if (key.startsWith('referrals_')) {
                    const filterData = value; const consultationData = employee.consultation;
                    if (filterData.referred === 'No') {
                        if (consultationData && consultationData.referral?.toLowerCase() === 'yes') return false;
                    } else {
                        if (!consultationData || consultationData.referral?.toLowerCase() !== 'yes') return false;
                        if (filterData.speciality && consultationData.speciality?.toLowerCase() !== filterData.speciality.toLowerCase()) return false;
                        if (filterData.hospital_name && consultationData.hospital_name?.toLowerCase() !== filterData.hospitalName.toLowerCase()) return false;
                        if (filterData.doctor_name && consultationData.doctor_name?.toLowerCase() !== filterData.doctorName.toLowerCase()) return false;
                    }
                }
                // --- Statutory Forms ---
                else if (key.startsWith('statutory_')) {
                    const filterData = value; const formKey = filterData.formType.toLowerCase();
                    if (!filterData.formType || !employee[formKey]?.id) return false; 
                    if (filterData.from || filterData.to) {
                        const formDateStr = employee[formKey]?.entry_date; if (!formDateStr) return false;
                        if (filterData.from && formDateStr < filterData.from) return false;
                        if (filterData.to && formDateStr > filterData.to) return false;
                    }
                }
            } 
            return true;
        });
        setFilteredEmployees(response.data.data);
    };

    useEffect(() => {
        applyFiltersToData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedFilters, selectedRole, employees]);

    // --- Helper to Format Filter Display String (Unchanged) ---
    const getFilterDisplayString = (filter) => {
        const key = Object.keys(filter)[0];
        const value = Object.values(filter)[0];

         if (key === 'status') {
             let display = `Status: ${value}`;
             const relatedTransfer = selectedFilters.find(f => Object.keys(f)[0] === 'transferred_to');
             const relatedFrom = selectedFilters.find(f => Object.keys(f)[0] === 'from');
             const relatedTo = selectedFilters.find(f => Object.keys(f)[0] === 'to');
             if (value.toLowerCase() === 'transferred to' && relatedTransfer) { display += ` (To: ${Object.values(relatedTransfer)[0]})`; }
             else if (value.toLowerCase() !== 'transferred to' && (relatedFrom || relatedTo)) { display += ` (Since: ${relatedFrom ? Object.values(relatedFrom)[0] : '...'} - ${relatedTo ? Object.values(relatedTo)[0] : '...'})`; }
             return display;
         }
         if ((key === 'transferred_to' || key === 'from' || key === 'to') && selectedFilters.some(f => Object.keys(f)[0] === 'status')) return null;
         if (key.startsWith("param_") && typeof value === 'object') { return `Vitals: ${value.param.toUpperCase()} ${value.value ? `(${value.value})` : `[${value.from} - ${value.to}]`}`; }
         else if (key.startsWith("investigation_") && typeof value === 'object') { let d = `Invest: ${value.form.toUpperCase()} > ${value.param.toUpperCase()}`; if (value.from && value.to) d += ` [${value.from}-${value.to}]`; if (value.status) d += ` (${value.status.toUpperCase()})`; return d; }
         else if (key.startsWith("fitness_") && typeof value === 'object') { return `Fitness: ${Object.entries(value).map(([k, v]) => `${k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${v}`).join(", ")}`; }
         else if (key === 'specialCase') { return `Special Cases: ${value}`; } 
         else if (key.startsWith("purpose_") && typeof value === 'object') { let p = []; if(value.type_of_visit) p.push(`Type:${value.type_of_visit}`); if(value.register) p.push(`Reg:${value.register}`); if(value.specificCategory) p.push(`Cat:${value.specificCategory}`); if(value.fromDate || value.toDate) p.push(`Date:[${value.fromDate||'..'} to ${value.toDate||'..'}]`); return `Purpose: ${p.join('|')}`; }
         else if (key.startsWith("referrals_") && typeof value === 'object') { let p=[]; if (value.referred) p.push(`Referred:${value.referred}`); if (value.speciality) p.push(`Spec:${value.speciality}`); if (value.hospitalName) p.push(`Hosp:${value.hospitalName}`); if (value.doctorName) p.push(`Doc:${value.doctorName}`); return `Referral:${p.join(', ')}`; }
         else if (key.startsWith("family_") && typeof value === 'object') { return `FamilyHx: ${value.relation}-${value.condition}(${value.status})`; }
         else if (key.startsWith("personal_")) { return `PersonalHx: ${key.substring('personal_'.length)}(${value})`; }
         else if (['smoking', 'alcohol', 'paan/beetle', 'diet', 'drugAllergy', 'foodAllergy', 'otherAllergies', 'surgicalHistory'].includes(key)) { return `MedHx: ${key.replace(/([A-Z])/g,' $1').replace(/^./, s => s.toUpperCase())}(${value})`; }
         else if (key === 'vaccine_status') { return `Vaccine Status: ${value}`; }
         else if (key.startsWith("significant_") && typeof value === 'object') {
            const entries = Object.entries(value).map(([k, v]) => {
                    const label = k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    return `${label}: ${v}`;
                });
            return `Sig. Notes: ${entries.join(', ')}`;
        }
         else if (key.startsWith('statutory_')) { const { formType, from, to } = value; let d = `Statutory: ${formType}`; if(from || to) d += ` [${from || '..'} - ${to || '..'}]`; return d; }
         else if (key === 'shiftingAmbulance') { return `Shifting in Ambulance : ${value.val}, From Date: ${value.from}, To Date: ${value.to}`; }
         else if (key === 'consultationReview') { return `Consultation Review: ${value}`; }
         else {
              const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              if (typeof value === 'object' && value !== null && !Array.isArray(value)) { return `${formattedKey}: Complex`; }
              return `${formattedKey}: ${value}`;
         }
    };

    const handleDownload = () => {
        if (filteredEmployees.length === 0) { alert("No data to download."); return; }
        const wb = XLSX.utils.book_new();
        const filterDetails = selectedFilters.map(getFilterDisplayString).filter(Boolean).join("\n");
        const filterHeader = ["Filter Criteria:"]; filterHeader.push(filterDetails || "No filters applied.");
        const employeeDataForExcel = filteredEmployees.map(emp => {
            const baseData = { "Emp ID": emp.emp_no || "-", "Name": emp.name || "-", "Age": calculateAge(emp.dob), "Gender": emp.sex || "-", "Role": emp.type || "-", "Status": emp.status || "-" };
            if (includeContact) {
                baseData["Phone"] = emp.phone || "-"; baseData["Email"] = emp.email || "-"; baseData["Address"] = emp.address || "-"; 
                baseData["Emergency Contact"] = emp.emergency_contact || "-"; baseData["Emergency Phone"] = emp.emergency_phone || "-"; baseData["Emergency Relation"] = emp.emergency_relation || "-";
            }
            return baseData;
        });
        const ws = XLSX.utils.json_to_sheet([]);
        XLSX.utils.sheet_add_aoa(ws, [filterHeader], { origin: "A1" });
        XLSX.utils.sheet_add_json(ws, employeeDataForExcel, { origin: "A3", skipHeader: false, });
        XLSX.utils.book_append_sheet(wb, ws, "Filtered Employees");
        const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        saveAs(new Blob([wbout], { type: "application/octet-stream" }), "filtered_employee_records.xlsx");
    };

    // --- JSX Render ---
    return (
        <div className="h-screen w-full flex bg-gradient-to-br from-blue-300 to-blue-400">
            <Sidebar />
            
            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                
                {/* --- 1. Top Header & Active Filters --- */}
                <div className="bg-white border-b border-gray-200 z-10 shadow-sm">
                    <div className="px-6 py-4">
                        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-2">
                           <Filter size={20} className="text-blue-600"/> Records Filter
                        </h1>
                        
                        {/* Active Filters Area */}
                        <div className="flex flex-wrap gap-2 min-h-[32px]">
                            <AnimatePresence>
                                {selectedFilters.length > 0 ? (
                                    selectedFilters.map((filter) => {
                                        const displayString = getFilterDisplayString(filter);
                                        const filterKey = Object.keys(filter)[0]; 
                                        return displayString ? (
                                            <motion.div
                                                key={filterKey} 
                                                initial={{ opacity: 0, scale: 0.8 }} 
                                                animate={{ opacity: 1, scale: 1 }} 
                                                exit={{ opacity: 0, scale: 0.8 }} 
                                                className="flex items-center pl-3 pr-1 py-1 bg-blue-50 border border-blue-100 text-blue-700 rounded-full text-xs font-medium shadow-sm"
                                            >
                                                <span>{displayString}</span>
                                                <button onClick={() => removeFilter(filter)} className="ml-1 p-1 hover:bg-blue-100 rounded-full text-blue-500 hover:text-red-500 transition-colors">
                                                    <X size={14} />
                                                </button>
                                            </motion.div>
                                        ) : null;
                                    })
                                ) : (
                                    <span className="text-sm text-gray-400 italic flex items-center gap-1">
                                        <Search size={14}/> No active filters. Start by selecting criteria below.
                                    </span>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-6 space-y-6">
                    
                    {/* --- 2. Filter Controls (Card) --- */}
                    <div className={uiStyles.card}>
                        <div className="flex flex-col xl:flex-row items-start xl:items-end gap-5">
                            
                            {/* Role Select */}
                            <div className="w-full xl:w-1/2">
                                <label className={uiStyles.label}>User Role</label>
                                <div className="relative">
                                    <select 
                                        className={uiStyles.select}
                                        onChange={handleRoleChange} 
                                        value={selectedRole} 
                                    >
                                        <option value="">All Roles</option> 
                                        <option value="Employee">Employee</option> 
                                        <option value="Contractor">Contractor</option> 
                                        <option value="Visitor">Visitor</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                        <User size={16}/>
                                    </div>
                                </div>
                            </div>

                            {/* Add Specific Filter Dropdown */}
                            <div className="w-full xl:w-1/2">
                                <label className={uiStyles.label}>Add Criteria</label>
                                <div className="relative">
                                    <select 
                                        className={`${uiStyles.select} bg-blue-50 border-blue-200 text-blue-800 font-medium`}
                                        onChange={(e) => { 
                                            const v = e.target.value; 
                                            if (v) handleFilterClick(v); 
                                            e.target.value = ""; 
                                        }} 
                                        value=""
                                        disabled={!selectedRole}
                                    >
                                        <option value="" disabled>
                                            {selectedRole ? "+ Add Specific Filter..." : "Select Role First"}
                                        </option>
                                        {filterSections
                                            .filter((s) => !selectedRole || s.roles.includes(selectedRole))
                                            .map((s) => (
                                                <option key={s.id} value={s.id}>{s.label}</option>
                                            ))
                                        }
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-blue-500">
                                        <PlusCircle size={16}/>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- 3. Dynamic Form Section (Slides In) --- */}
                    <AnimatePresence>
                        {selectedSection && (
                            <motion.div 
                                key={selectedSection} 
                                initial={{ opacity: 0, height: 0, overflow: 'hidden' }} 
                                animate={{ opacity: 1, height: 'auto' }} 
                                exit={{ opacity: 0, height: 0 }} 
                                className="overflow-hidden"
                            >
                                <div className={`${uiStyles.card} border-l-4 border-l-blue-500`}>
                                    <div className="flex justify-between items-start mb-6 border-b pb-2">
                                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                            {filterSections.find((f) => f.id === selectedSection)?.label}
                                        </h2>
                                        <button onClick={() => setSelectedSection(null)} className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-gray-100"> 
                                            <X size={20} /> 
                                        </button>
                                    </div>
                                    
                                    {/* Component Rendering */}
                                    <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                                        {selectedSection === "employementstatus" && selectedRole !== "Visitor" && <EmployementStatus addFilter={addFilter} />}
                                        {selectedSection === "personaldetails" && <PersonalDetails addFilter={addFilter} />}
                                        {selectedSection === "employementdetails" && selectedRole !== "Visitor" && <EmploymentDetails addFilter={addFilter} selectedRole={selectedRole} />}
                                        {selectedSection === "vitals" && <Vitals addFilter={addFilter} />}
                                        {selectedSection === "fitness" && <Fitness addFilter={addFilter} />}
                                        {selectedSection === "significantnotes" &&  <SignificantNotesFilter addFilter={addFilter} />}
                                        {selectedSection === "specialcases" && <SpecialCasesFilter addFilter={addFilter} />}
                                        {selectedSection === "medicalhistory" && <MedicalHistoryForm addFilter={addFilter} />}
                                        {selectedSection === "investigations" && <Investigations addFilter={addFilter} />}
                                        {selectedSection === "vaccination" && <VaccinationForm addFilter={addFilter} />}
                                        {selectedSection === "purpose" && <PurposeFilter addFilter={addFilter} />}
                                        {selectedSection === "referrals" && <Referrals addFilter={addFilter} specialityOptions={specialityOptions} hospitalOptions={hospitalOptions} doctorOptions={doctorOptions} />}
                                        {selectedSection === "statutoryforms" && <StatutoryForms addFilter={addFilter} />}
                                        {selectedSection === "shiftingambulance" && <ShiftingAmbulanceFilter addFilter={addFilter} />}
                                        {selectedSection === "consultationreview" && <ConsultationReviewFilter addFilter={addFilter} />}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* --- 4. Results Table (Card) --- */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col flex-1 min-h-[400px]">
                        
                        {/* Table Header / Toolbar */}
                        <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <FileText size={20} className="text-gray-500"/>
                                Records Found <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-sm">{filteredEmployees.length}</span>
                            </h2>
                            
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-600 cursor-pointer hover:text-gray-900 transition-colors">
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        checked={includeContact}
                                        onChange={(e) => setIncludeContact(e.target.checked)}
                                    />
                                    Include Contact Info
                                </label>

                                <button
                                    onClick={handleDownload}
                                    className={`${uiStyles.buttonSecondary} border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:border-green-300 flex items-center gap-2`}
                                    disabled={filteredEmployees.length === 0}
                                >
                                    <Download size={16}/> Export Excel
                                </button>
                            </div>
                        </div>

                        {/* Table Content */}
                        <div className="overflow-auto flex-1">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        {["Aadhar", "Emp ID", "Name", "Age", "Role", "Status", "Actions"].map((head) => (
                                            <th key={head} className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                {head}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {loading ? (
                                        <tr><td colSpan="9" className="text-center py-20 text-gray-500">
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                <span className="text-sm font-medium">Fetching records...</span>
                                            </div>
                                        </td></tr>
                                    ) : filteredEmployees.length > 0 ? (
                                        filteredEmployees.map((employee) => (
                                            <tr key={employee.id || employee.emp_no} className="hover:bg-blue-50/50 transition-colors duration-150 group">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{employee.aadhar || '-'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{employee.emp_no || '-'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center gap-2">
                                                    {employee.name || '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{calculateAge(employee.dob)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${employee.type === 'Employee' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                                                        {employee.type || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{employee.status || '-'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <button onClick={() => navigate("../employeeprofile", { state: { data: employee } })}
                                                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded-md transition-colors text-xs font-semibold border border-blue-100 hover:border-blue-200">
                                                        View Profile
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="9" className="text-center py-20 text-gray-400">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Search size={32} className="text-gray-300 mb-2"/>
                                                <p>No employee records match your criteria.</p>
                                            </div>
                                        </td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


// ========================================================================
// --- Filter Sub-Components (Styled with uiStyles) ---
// ========================================================================

const SignificantNotesFilter = ({ addFilter }) => {
    const [formData, setFormData] = useState({ communicable_disease: "", incident_type: "", incident: "", illness_type: "", special_case: "", });
    const communicableDiseaseOptions = [ { value: "", label: "Any" }, { value: "Notification 0", label: "Notification 0" }, { value: "Notification 1", label: "Notification 1" }, { value: "Notification 2", label: "Notification 2" }, { value: "Notification 3", label: "Notification 3" }, ];
    const incidentTypeOptions = [ { value: "", label: "Any" }, { value: "FAC", label: "FAC" }, { value: "LTI", label: "LTI" }, { value: "MTC", label: "MTC" }, { value: "FATAL", label: "FATAL" }, { value: "RWC", label: "RWC" }, ];
    const incidentOptions = [ { value: "", label: "Any" }, { value: "Work Related Injury", label: "Work Related Injury" }, { value: "Domestic Injury", label: "Domestic Injury" }, { value: "Commutation Injury", label: "Commutation Injury" }, { value: "Others", label: "Others" }, ];
    const illnessTypeOptions = [ { value: "", label: "Any" }, { value: "Work Related Illness", label: "Work Related Illness" }, { value: "Notifiable Disease", label: "Notifiable Disease" }, ];

    const handleChange = (e) => { setFormData(prev => ({ ...prev, [e.target.name]: e.target.value, })); };
    const handleSubmit = () => {
        const activeFilters = Object.fromEntries(Object.entries(formData).filter(([_, v]) => v !== ""));
        if (Object.keys(activeFilters).length > 0) { addFilter({ significantNotes: activeFilters }); } else { alert("Please select at least one filter criterion."); }
        setFormData({ communicable_disease: "", incident_type: "", incident: "", illness_type: "", special_case: "", });
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                    <label className={uiStyles.label}>Notification</label>
                    <select name="communicable_disease" value={formData.communicable_disease} onChange={handleChange} className={uiStyles.select}>
                        {communicableDiseaseOptions.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
                    </select>
                </div>
                <div>
                    <label className={uiStyles.label}>Additional Illness Register</label>
                    <select name="illness_type" value={formData.illness_type} onChange={handleChange} className={uiStyles.select}>
                        {illnessTypeOptions.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
                    </select>
                </div>
                <div>
                    <label className={uiStyles.label}>Incident Category</label>
                    <select name="incident_type" value={formData.incident_type} onChange={handleChange} className={uiStyles.select}>
                        {incidentTypeOptions.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
                    </select>
                </div>
                <div>
                    <label className={uiStyles.label}>Incident Nature</label>
                    <select name="incident" value={formData.incident} onChange={handleChange} className={uiStyles.select}>
                        {incidentOptions.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
                    </select>
                </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <p className={`${uiStyles.label} mb-3`}>Special Case in Fitness/Consultation Notes?</p>
                <div className="flex gap-4">
                    {["Yes", "No", "NA"].map(val => (
                        <label key={val} className="flex items-center space-x-2 cursor-pointer bg-white px-4 py-2 rounded-md border border-gray-200 hover:border-blue-400 transition-colors">
                            <input type="radio" name="special_case" value={val} checked={formData.special_case === val} onChange={handleChange} className="w-4 h-4 text-blue-600 focus:ring-blue-500"/>
                            <span className="text-sm font-medium text-gray-700">{val}</span>
                        </label>
                    ))}
                </div>
            </div>

            <button onClick={handleSubmit} disabled={Object.values(formData).every(v => v === "")} className={uiStyles.buttonPrimary}>
                Apply Significant Notes Filter
            </button>
        </div>
    );
};

const EmployementStatus = ({ addFilter }) => {
    const [formData, setFormData] = useState({ status: "", from: "", to: "", transferred_to: "", });
    const handleChange = (e) => { setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value })); };
    const handleSubmit = () => {
        const { status, from, to, transferred_to } = formData; 
        let filteredData = {}; 
        if (!status) { alert("Please select status."); return; }
        filteredData.status = status; 
        if (status === 'Transferred To' && transferred_to) { filteredData.transferred_to = transferred_to; }
        else if (status !== 'Transferred To') { if (from && to && new Date(from) > new Date(to)) { alert("'From Date' > 'To Date'."); return; } if (from) filteredData.from = from; if (to) filteredData.to = to; }
        else if (status === 'Transferred To' && !transferred_to) { alert("Enter location for 'Transferred To'."); return; }
        if (Object.keys(filteredData).length > 0 && filteredData.status) { addFilter(filteredData); } else { alert("Provide valid criteria."); }
        setFormData({ status: "", from: "", to: "", transferred_to: "" });
    };
    const showTransferredTo = formData.status === "Transferred To"; const showDateRange = formData.status && !showTransferredTo;
    return (
        <div className="space-y-5"> 
            <div> 
                <label htmlFor="status-filter" className={uiStyles.label}>Status</label> 
                <select name="status" id="status-filter" value={formData.status} onChange={handleChange} className={uiStyles.select}> 
                    <option value="">Select Status</option> <option value="Active">Active</option> <option value="Transferred To">Transferred To</option> <option value="Resigned">Resigned</option> <option value="Retired">Retired</option> <option value="Deceased">Deceased</option> <option value="Unauthorised Absence">Unauthorised Absence</option> <option value="Other">Other</option> 
                </select> 
            </div> 
            {showTransferredTo && (<div> <label htmlFor="transferred_to-filter" className={uiStyles.label}>Transferred To Dept/Location</label> <input type="text" id="transferred_to-filter" name="transferred_to" value={formData.transferred_to} onChange={handleChange} className={uiStyles.input} placeholder="Enter Department/Location"/> </div>)} 
            {showDateRange && (<div className="grid grid-cols-2 gap-5"> <div> <label htmlFor="from-date-filter" className={uiStyles.label}>Date Since From</label> <input type="date" id="from-date-filter" name="from" value={formData.from} onChange={handleChange} className={uiStyles.input}/> </div> <div> <label htmlFor="to-date-filter" className={uiStyles.label}>Date Since To</label> <input type="date" id="to-date-filter" name="to" value={formData.to} onChange={handleChange} className={uiStyles.input} min={formData.from || undefined}/> </div> </div>)} 
            <button onClick={handleSubmit} className={uiStyles.buttonPrimary} disabled={!formData.status || (showTransferredTo && !formData.transferred_to)}>Add Filter</button> 
        </div>
    );
};

const PersonalDetails = ({ addFilter }) => {
    const [formData, setFormData] = useState({ ageFrom: "", ageTo: "", sex: "", bloodgrp: "", marital_status: "", nationality: "" });
    const handleChange = (e) => { setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value })); };
    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        const filteredData = Object.fromEntries(Object.entries(formData).filter(([_, v]) => v !== "" && v !== null));
        if (filteredData.ageFrom && filteredData.ageTo && parseInt(filteredData.ageFrom, 10) > parseInt(filteredData.ageTo, 10)) { alert("'Age From' > 'Age To'."); return; }
        if (Object.keys(filteredData).length > 0) { addFilter(filteredData); } else { alert("Enter at least one detail."); }
        setFormData({ ageFrom: "", ageTo: "", sex: "", bloodgrp: "", marital_status: "", nationality: "" });
    };
    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 gap-5">
                <div><label className={uiStyles.label}>Age From</label><input type="number" name="ageFrom" value={formData.ageFrom} onChange={handleChange} min="0" className={uiStyles.input} placeholder="Min Age" /></div>
                <div><label className={uiStyles.label}>Age To</label><input type="number" name="ageTo" value={formData.ageTo} onChange={handleChange} min="0" className={uiStyles.input} placeholder="Max Age" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <div><label className={uiStyles.label}>Sex</label><select name="sex" value={formData.sex} onChange={handleChange} className={uiStyles.select}><option value="">Any Sex</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></div>
                <div><label className={uiStyles.label}>Blood Group</label><select name="bloodgrp" value={formData.bloodgrp} onChange={handleChange} className={uiStyles.select}><option value="">Any</option><option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option><option value="AB+">AB+</option><option value="AB-">AB-</option><option value="O+">O+</option><option value="O-">O-</option></select></div>
                <div><label className={uiStyles.label}>Marital Status</label><select name="marital_status" value={formData.marital_status} onChange={handleChange} className={uiStyles.select}><option value="">Any</option><option value="Single">Single</option><option value="Married">Married</option><option value="Separated">Separated</option><option value="Divorced">Divorced</option><option value="Widowed">Widowed</option></select></div>
                <div><label className={uiStyles.label}>nationality</label><select name="nationality" value={formData.nationality} onChange={handleChange} className={uiStyles.select}><option value="">Any</option><option value="indian">Indian</option><option value="foreign">Foreign</option></select></div>
            </div>
            <button type="button" onClick={handleSubmit} className={uiStyles.buttonPrimary} disabled={Object.values(formData).every(v => v === "")}>Add Filter</button>
        </div>
    );
};

const EmploymentDetails = ({ addFilter, selectedRole }) => {
    const [formData, setFormData] = useState({ designation: "", department: "", moj: "", division: "", workarea: "", employer: "", job_nature: "", previousEmployer: "", previousLocation: "", dojFrom: "", dojTo: "", });
    const employerOptions = { "JSW Steel Limited": "JSW Steel Limited", "JSW Cement": "JSW Cement", "JSW Foundation": "JSW Foundation" };
    const mojOptions = { "New Joinee": "New Joinee", "Transfer": "Transfer" };
    const jobNatureOptions = { "Contract": "Contract", "Permanent": "Permanent", "Consultant": "Consultant", "Painter": "Painter", "Driver": "Driver", "Manager":"Manager" };
    const jobStatusOptions = { "JBC": "JBC", "SSC": "SSC", "JBN":"JBN", "TBC":"TBC", "GGBS":"GGBS", "JBI":"JBI", "JBA":"JBA", "Support Staff": "Support Staff", "MBC":"MBC", "Propreitor":"Propreitor", "CSR Foundation": "CSR Foundation", "Transporter":"Transporter", "JSW Society":"JSW Society", "Shut Down":"Shut Down", "ITI Apprentice":"ITI Apprentice", "Supplier":"Supplier"}
    const handleChange = (e) => { setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value })); };
    const handleSubmit = () => {
        const filteredData = Object.fromEntries(Object.entries(formData).filter(([_, v]) => v !== "" && v !== null));
        if (filteredData.dojFrom && filteredData.dojTo && new Date(filteredData.dojFrom) > new Date(filteredData.dojTo)) { alert("'From Date' cannot be after 'To Date'."); return; }
        if (Object.keys(filteredData).length > 0) { addFilter(filteredData); } else { alert("Enter at least one detail."); }
        setFormData({ designation: "", department: "", moj: "", employer: "", job_nature: "", previousEmployer: "", previousLocation: "", dojFrom: "", dojTo: "" });
    };

    return (
        <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5">
                    <div><label className={uiStyles.label}>Employer</label><select name="employer" value={formData.employer} onChange={handleChange} className={uiStyles.select}><option value="">Any</option>{Object.entries(employerOptions).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}</select></div>
                    <div><label className={uiStyles.label}>Mode of Joining</label><select name="moj" value={formData.moj} onChange={handleChange} className={uiStyles.select}><option value="">Any</option>{Object.entries(mojOptions).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}</select></div>
                    <div><label className={uiStyles.label}>Job Nature</label><select name="job_nature" value={formData.job_nature} onChange={handleChange} className={uiStyles.select}><option value="">Any</option>{Object.entries(jobNatureOptions).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}</select></div>
                    {selectedRole === "Contractor" && (<div><label className={uiStyles.label}>Job Status</label><select name="job_status" value={formData.job_status} onChange={handleChange} className={uiStyles.select}><option value="">Any</option>{Object.entries(jobStatusOptions).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}</select></div>)}
                </div>
                {formData.moj === "Transfer" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <div><label className={uiStyles.label}>Previous Employer</label><input type="text" name="previousEmployer" value={formData.previousEmployer || ''} onChange={handleChange} className={uiStyles.input} placeholder="Previous Co." /></div>
                        <div><label className={uiStyles.label}>Previous Location</label><input type="text" name="previousLocation" value={formData.previousLocation || ''} onChange={handleChange} className={uiStyles.input} placeholder="e.g., Chennai" /></div>
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    <div><label className={uiStyles.label}>Designation</label><input type="text" name="designation" value={formData.designation} onChange={handleChange} className={uiStyles.input} placeholder="Engineer" /></div>
                    <div><label className={uiStyles.label}>Department</label><input type="text" name="department" value={formData.department} onChange={handleChange} className={uiStyles.input} placeholder="IT" /></div>
                    <div><label className={uiStyles.label}>Division</label><input type="text" name="division" value={formData.division} onChange={handleChange} className={uiStyles.input} placeholder="Cement" /></div>
                    <div><label className={uiStyles.label}>Work Area</label><input type="text" name="workarea" value={formData.workarea} onChange={handleChange} className={uiStyles.input} placeholder="Mills" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-gray-100">
                    <div><label className={uiStyles.label}>Date of Joining (From)</label><input type="date" name="dojFrom" value={formData.dojFrom} onChange={handleChange} className={uiStyles.input} /></div>
                    <div><label className={uiStyles.label}>Date of Joining (To)</label><input type="date" name="dojTo" value={formData.dojTo} onChange={handleChange} className={uiStyles.input} /></div>
                </div>
                <button onClick={handleSubmit} className={uiStyles.buttonPrimary} disabled={Object.values(formData).every(v => v === "")}>Add Filter</button>
            </div>
    );
};

const Vitals = ({ addFilter }) => {
    const [formData, setFormData] = useState({ param: "systolic", bmiCategory: "", from: "", to: "", });
    const vitalParams = [ { value: "systolic", label: "Systolic BP", type: "range" }, { value: "diastolic", label: "Diastolic BP", type: "range" }, { value: "pulse", label: "Pulse Rate", type: "range" }, { value: "respiratory_rate", label: "Resp Rate", type: "range" }, { value: "temperature", label: "Temp", type: "range" }, { value: "spo2", label: "SpO2", type: "range" }, { value: "height", label: "Height", type: "range" }, { value: "weight", label: "Weight", type: "range" }, { value: "bmi", label: "BMI", type: "category" }, ];
    const bmiOptions = { "Under weight": "Under weight", "Normal weight": "Normal weight", "Over weight": "Over weight", "Obesity": "Obesity", "Extremely Obesity": "Extremely Obesity" };
    const selectedParamConfig = vitalParams.find(p => p.value === formData.param);
    const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => { const ns = { ...prev, [name]: value }; if (name === 'param') { ns.bmiCategory = ""; ns.from = ""; ns.to = ""; } return ns; }); };
    const handleSubmit = () => { const { param, bmiCategory, from, to } = formData; const config = vitalParams.find(p => p.value === param); if (!config) return; let fp = {}; if (config.type === "category" && param === "bmi" && bmiCategory) { fp = { param: param, value: bmiCategory }; } else if (config.type === "range" && from !== "" && to !== "") { if (parseFloat(from) > parseFloat(to)) { alert("'From' > 'To'."); return; } fp = { param: param, from: from, to: to }; } else { alert("Provide valid inputs."); return; } addFilter({ param: fp }); setFormData({ param: "systolic", bmiCategory: "", from: "", to: "" }); };
    
    return (
        <div className="space-y-5"> 
            <div> 
                <label className={uiStyles.label}>Parameter</label> 
                <select name="param" value={formData.param} onChange={handleChange} className={uiStyles.select}> {vitalParams.map(p => (<option key={p.value} value={p.value}>{p.label}</option>))} </select> 
            </div> 
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-5"> 
                {selectedParamConfig?.type === "category" && selectedParamConfig?.value === "bmi" && (<div className="md:col-span-2"> <label className={uiStyles.label}>BMI Category</label> <select name="bmiCategory" value={formData.bmiCategory} onChange={handleChange} className={uiStyles.select}> <option value="">Select</option> {Object.entries(bmiOptions).map(([k, v]) => (<option key={k} value={k}>{v}</option>))} </select> </div>)} 
                {selectedParamConfig?.type === "range" && (<><div> <label className={uiStyles.label}>Range From</label> <input type="number" name="from" value={formData.from} onChange={handleChange} step="any" className={uiStyles.input} placeholder="Min"/> </div> <div> <label className={uiStyles.label}>Range To</label> <input type="number" name="to" value={formData.to} onChange={handleChange} step="any" className={uiStyles.input} placeholder="Max"/> </div> </>)} 
            </div> 
            <button onClick={handleSubmit} className={uiStyles.buttonPrimary} disabled={!selectedParamConfig || (selectedParamConfig?.type === "category" && !formData.bmiCategory) || (selectedParamConfig?.type === "range" && (formData.from === "" || formData.to === ""))}> Add Vital Filter </button> 
        </div>
    );
};

const Investigations = ({ addFilter }) => {
    const formOptions = { heamatalogy: ["hemoglobin", "total_rbc", "total_wbc", "Haemotocrit", "neutrophil", "monocyte", "pcv", "mcv", "mch", "lymphocyte", "esr", "mchc", "platelet_count", "rdw", "eosinophil", "basophil", "peripheral_blood_smear_rbc_morphology" ], routinesugartests: ["glucose_f", "glucose_pp", "random_blood_sugar", "estimated_average_glucose", "hba1c"], lipidprofile: ["Total_Cholesterol", "triglycerides", "hdl_cholesterol", "vldl_cholesterol", "ldl_cholesterol", "chol_hdl_ratio", "ldl_chol_hdl_chol_ratio" ], liverfunctiontest: ["bilirubin_total", "bilirubin_direct", "bilirubin_indirect", "sgot_ast", "sgpt_alt", "alkaline_phosphatase", "total_protein", "albumin_serum", "globulin_serum", "alb_glob_ratio", "gamma_glutamyl_transferase" ], thyroidfunctiontest: ["t3_triiodothyronine", "t4_thyroxine", "tsh_thyroid_stimulating_hormone"], autoimmunetest: ["ANA", "Anti_ds_dna", "Anticardiolipin_Antibodies", "Rheumatoid_factor"], renalfunctiontests_and_electrolytes: ["urea", "bun", "serum_creatinine", "eGFR", "uric_acid", "sodium", "potassium", "calcium", "phosphorus", "chloride", "bicarbonate"], coagulationtest: ["prothrombin_time", "pt_inr", "bleeding_time", "clotting_time"], enzymescardiacprofile: ["acid_phosphatase", "adenosine_deaminase", "amylase", "lipase", "troponin_t", "troponin_i", "cpk_total", "cpk_mb", "ecg", "echo", "tmt","angiogram"], urineroutinetest: ["colour", "appearance", "reaction_ph", "specific_gravity", "protein_albumin", "glucose_urine", "ketone_bodies", "urobilinogen", "bile_salts", "bile_pigments", "wbc_pus_cells", "red_blood_cells", "epithelial_cells", "casts", "crystals", "bacteria"], serologytest: ["screening_hiv","screening_hiv2","HBsAG", "HCV", "WIDAL", "VDRL", "Dengue_NS1Ag", "Dengue_IgG", "Dengue_IgM"], motiontest: ["colour_motion","appearance_motion", "occult_blood", "ova", "cyst", "mucus", "pus_cells", "rbcs", "others"], culturesensitivitytest: ["urine", "motion", "sputum", "blood"], menspack: ["psa"], womenspack: ["Mammogaram", "PAP_Smear"], occupationalprofile: ["Audiometry", "PFT"], otherstest: ["Bone_Densitometry","Vit_D","Vit_B12","Serum_Ferritin","Dental", "Pathology","Endoscopy","Clonoscopy","Urethroscopy","Bronchoscopy","Cystoscopy","Hysteroscopy","Ureteroscopy"], ophthalmicreport: ["vision", "color_vision", "cataract_glaucoma"], xray: ["xray_chest", "xray_spine", "xray_abdomen", "xray_kub", "xray_pelvis","Skull","Upper_limb","Lower_limb"], ctreport: ["CT_brain","CT_Head","CT_Neck","CT_Chest","CT_lungs","CT_abdomen", "CT_spine","CT_pelvis","CT_Upper_limb","CT_Lower_limb"], mrireport: ["mri_brain","mri_Head","mri_Neck","mri_lungs","mri_abdomen","mri_spine","mri_pelvis","mri_Chest","mri_Upper_limb","mri_Lower_limb"], usgreport: ["usg_abdomen", "usg_pelvis", "usg_neck", "usg_kub"], };
    const formatLabel = (k) => k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); const [formData, setFormData] = useState({ form: "", param: "", from: "", to: "", status: "", }); const selectedFormParams = formData.form ? formOptions[formData.form] || [] : [];
    useEffect(() => { setFormData((prev) => ({ ...prev, param: "", from: "", to: "", status: "" })); }, [formData.form]); const handleChange = (e) => { setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value })); };
    const handleSubmit = () => { const { form, param, from, to, status } = formData; if (!form || !param) { alert("Select Form and Parameter."); return; } let fp = { form, param }; let hv = false; if (from !== "" && to !== "") { if (parseFloat(from) > parseFloat(to)) { alert("'From' > 'To'."); return; } fp.from = from; fp.to = to; hv = true; } if (status !== "") { fp.status = status; hv = true; } if (!hv) { alert("Provide Range or Status."); return; } addFilter({ investigation: fp }); setFormData({ form: "", param: "", from: "", to: "", status: "" }); };
    
    return (
        <div className="space-y-5"> 
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5"> 
                <div> <label className={uiStyles.label}>Form</label> <select name="form" value={formData.form} onChange={handleChange} className={uiStyles.select}> <option value="">-- Select --</option> {Object.keys(formOptions).map((k) => (<option key={k} value={k}>{formatLabel(k)}</option>))} </select> </div> 
                <div> <label className={uiStyles.label}>Parameter</label> <select name="param" value={formData.param} onChange={handleChange} disabled={!formData.form} className={`${uiStyles.select} disabled:bg-gray-100 disabled:cursor-not-allowed`}> <option value="">-- Select --</option> {selectedFormParams.map((p) => (<option key={p} value={p}>{formatLabel(p)}</option>))} </select> </div> 
            </div> 
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-5"> 
                <div> <label className={uiStyles.label}>From (Value)</label> <input type="number" name="from" value={formData.from} onChange={handleChange} step="any" className={uiStyles.input} placeholder="Min"/> </div> 
                <div> <label className={uiStyles.label}>To (Value)</label> <input type="number" name="to" value={formData.to} onChange={handleChange} step="any" className={uiStyles.input} placeholder="Max"/> </div> 
                <div> <label className={uiStyles.label}>Status</label> <select name="status" value={formData.status} onChange={handleChange} className={uiStyles.select}> <option value="">-- Select --</option> <option value="normal">Normal</option> <option value="abnormal">Abnormal</option> </select> </div> 
            </div> 
            <button onClick={handleSubmit} className={uiStyles.buttonPrimary} disabled={!formData.form || !formData.param}> Add Filter </button> 
        </div>
    );
};

const Fitness = ({ addFilter }) => {
    const initialFormData = { tremors: "", romberg_test: "", acrophobia: "", trendelenberg_test: "", CO_dizziness: "", MusculoSkeletal_Movements: "", Claustrophobia: "", Tandem: "", Nystagmus_Test: "", Dysdiadochokinesia: "", Finger_nose_test: "", Psychological_PMK: "", Psychological_zollingar: "", eye_exam_fit_status: "", job_nature: "", overall_fitness: "", };
    const [formData, setFormData] = useState(initialFormData);
    const NormalorAbnormal = { "": "Any", Normal: "Normal", Abnormal: "Abnormal" }; const yesNoOptions = { "": "Any", Yes: "Yes", No: "No" }; const Positiveoptions = { "": "Any", Positive: "Positive", Negative: "Negative" }; const jobNatureOptions = { "": "Any", "Height": "Height", "Gas Line" : "Gas Line", "Confined Space" : "Confined Space", "SCBA Rescue" : "SCBA Rescue", "Fire Rescue" : "Fire Rescue", "Lone Work": "Lone Work", "Fisher Man" : "Fisher Man", "Snake Catch": "Snake Catch", "Pest Control":"Pest Control","Others":"Others" }; const fitnessStatusOptions = { "": "Any", Fit: "Fit", "Conditionally Fit": "Conditionally Fit", Unfit: "Unfit" }; const eyeExamFitStatusOptions = { "": "Any", Fit: "Fit", Fit_when_newly_prescribed_glass: "Fit when newly prescribed glass", Fit_with_existing_glass: "Fit With Existing Glass" ,Fit_with_an_advice_to_change_existing_glass_with_newly_prescribed_glass : "Fit with an advice to change existing glass with newly prescribed glass", Unfit: "Unfit" };
    const handleChange = (e) => { setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value })); };
    const handleSubmit = () => { const activeFilters = Object.fromEntries(Object.entries(formData).filter(([_, v]) => v !== "")); if (Object.keys(activeFilters).length > 0) { addFilter({ fitness: activeFilters }); } else { alert("Please select at least one filter criterion."); } setFormData(initialFormData); };

    return (
        <div className="space-y-6">
            <h3 className="text-sm font-bold text-gray-500 uppercase border-b pb-2 mb-4">Neurological & Physical Tests</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {[
                    { l: "Tremors", n: "tremors", o: Positiveoptions }, { l: "Romberg Test", n: "romberg_test", o: Positiveoptions },
                    { l: "Trendelenberg", n: "trendelenberg_test", o: Positiveoptions }, { l: "Tandem Walking", n: "Tandem", o: NormalorAbnormal },
                    { l: "Nystagmus", n: "Nystagmus_Test", o: NormalorAbnormal }, { l: "Dysdiadochokinesia", n: "Dysdiadochokinesia", o: NormalorAbnormal },
                    { l: "Finger-Nose", n: "Finger_nose_test", o: NormalorAbnormal }, { l: "C/O Dizziness", n: "CO_dizziness", o: yesNoOptions }
                ].map(f => (
                    <div key={f.n}><label className={uiStyles.label}>{f.l}</label><select name={f.n} value={formData[f.n]} onChange={handleChange} className={uiStyles.select}>{Object.entries(f.o).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                ))}
            </div>

            <h3 className="text-sm font-bold text-gray-500 uppercase border-b pb-2 mb-4 mt-6">Phobias & Psychological</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {[
                    { l: "Acrophobia", n: "acrophobia", o: yesNoOptions }, { l: "Claustrophobia", n: "Claustrophobia", o: yesNoOptions },
                    { l: "Psych-PMK", n: "Psychological_PMK", o: NormalorAbnormal }, { l: "Psych-Zollingar", n: "Psychological_zollingar", o: NormalorAbnormal }
                ].map(f => (
                    <div key={f.n}><label className={uiStyles.label}>{f.l}</label><select name={f.n} value={formData[f.n]} onChange={handleChange} className={uiStyles.select}>{Object.entries(f.o).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                ))}
            </div>

            <h3 className="text-sm font-bold text-gray-500 uppercase border-b pb-2 mb-4 mt-6">Overall Assessment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="col-span-1 md:col-span-2"><label className={uiStyles.label}>Eye Exam Fitness</label><select name="eye_exam_fit_status" value={formData.eye_exam_fit_status} onChange={handleChange} className={uiStyles.select}>{Object.entries(eyeExamFitStatusOptions).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                <div><label className={uiStyles.label}>Job Nature</label><select name="job_nature" value={formData.job_nature} onChange={handleChange} className={uiStyles.select}>{Object.entries(jobNatureOptions).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                <div><label className={uiStyles.label}>Overall Fitness</label><select name="overall_fitness" value={formData.overall_fitness} onChange={handleChange} className={uiStyles.select}>{Object.entries(fitnessStatusOptions).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            </div>
            
            <button onClick={handleSubmit} className={uiStyles.buttonPrimary} disabled={Object.values(formData).every(v => v === "")}>Add Fitness Filter</button>
        </div>
    );
};

const SpecialCasesFilter = ({ addFilter }) => {
    const [selectedValue, setSelectedValue] = useState(""); 
    const handleChange = (e) => setSelectedValue(e.target.value);
    const handleSubmit = () => { if (!selectedValue) { alert("Please select an option."); return; } addFilter({ specialCase: selectedValue }); setSelectedValue(""); };
    return (
        <div className="space-y-4">
            <p className="text-gray-700 font-medium">Does the record contain any special cases in Fitness or Consultation notes?</p>
            <div className="flex gap-4">
                {["Yes", "No", "NA"].map(val => (
                    <label key={val} className="flex items-center space-x-2 cursor-pointer bg-gray-50 px-4 py-2 rounded-lg border border-gray-200 hover:bg-white hover:border-blue-400 hover:shadow-sm transition-all">
                        <input type="radio" name="specialCaseOption" value={val} checked={selectedValue === val} onChange={handleChange} className="w-4 h-4 text-blue-600 focus:ring-blue-500"/>
                        <span className="text-sm font-medium">{val}</span>
                    </label>
                ))}
            </div>
            <button onClick={handleSubmit} className={uiStyles.buttonPrimary} disabled={!selectedValue}>Add Special Cases Filter</button>
        </div>
    );
};

const ShiftingAmbulanceFilter = ({ addFilter }) => {
    const [formData, setFormData] = useState({ val: "", from: "", to: "" });
    const handleChange = (e) => { console.log(e.target.name, e.target.value); setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value })); };
    const handleSubmit = () => { if (!formData.val) { alert("Select option."); return; } addFilter({ shiftingAmbulance: formData }); setFormData({ val: "", from: "", to: "" }); };
    return (
        <div className="space-y-4">
            <div className="mb-4">
                <div className="flex gap-4 mb-4">
                    {["Yes", "No"].map(val => (
                    <label key={val} className="flex items-center space-x-2 cursor-pointer bg-gray-50 px-5 py-2 rounded-lg border border-gray-200 hover:bg-white hover:border-blue-400 hover:shadow-sm transition-all">
                        <input type="radio" name="val" value={val} checked={formData.val === val} onChange={handleChange} className="w-4 h-4 text-blue-600 focus:ring-blue-500"/>
                        <span className="text-sm font-medium">{val}</span>
                    </label>
                ))}
                </div>
                <div className="grid grid-cols-2 gap-5"> <div> <label className={uiStyles.label}>From Date</label> <input type="date" name="from" value={formData.from} onChange={handleChange} className={uiStyles.input}/> </div> <div> <label className={uiStyles.label}>To Date</label> <input type="date" name="to" value={formData.to} onChange={handleChange} className={uiStyles.input}/> </div> </div>
            </div>
            
            <button onClick={handleSubmit} className={uiStyles.buttonPrimary} disabled={!formData.val}>Apply Filter</button>
        </div>
    );
};

const ConsultationReviewFilter = ({ addFilter }) => {
    const [reviewValue, setReviewValue] = useState("");
    const [diagnosedValue, setDiagnosedValue] = useState("");
    const handleSubmit = () => { if (!reviewValue || !diagnosedValue) { alert("Please answer both questions."); return; } addFilter({ consultationReview: reviewValue, diagnosed: diagnosedValue, }); setReviewValue(""); setDiagnosedValue(""); };
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <p className="text-gray-700 font-medium mb-3">Was the consultation reviewed?</p>
                    <div className="flex gap-4">
                        {["Yes", "No"].map(val => (
                            <label key={val} className="flex items-center space-x-2 cursor-pointer bg-gray-50 px-5 py-2 rounded-lg border border-gray-200 hover:bg-white hover:border-blue-400 transition-all">
                                <input type="radio" name="consultationReview" value={val} checked={reviewValue === val} onChange={(e) => setReviewValue(e.target.value)} className="w-4 h-4 text-blue-600"/>
                                <span className="text-sm font-medium">{val}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <div>
                    <p className="text-gray-700 font-medium mb-3">Was Diagnosed?</p>
                    <div className="flex gap-4">
                        {["Yes", "No"].map(val => (
                            <label key={val} className="flex items-center space-x-2 cursor-pointer bg-gray-50 px-5 py-2 rounded-lg border border-gray-200 hover:bg-white hover:border-blue-400 transition-all">
                                <input type="radio" name="diagnosed" value={val} checked={diagnosedValue === val} onChange={(e) => setDiagnosedValue(e.target.value)} className="w-4 h-4 text-blue-600"/>
                                <span className="text-sm font-medium">{val}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>
            <button onClick={handleSubmit} className={uiStyles.buttonPrimary} disabled={!reviewValue || !diagnosedValue}>Add Review Filter</button>
        </div>
    );
};

const MedicalHistoryForm = ({ addFilter }) => {
    const [ph, setPh] = useState({ smoking: "", alcohol: "", paan: "", diet: "", });
    const [pc, setPc] = useState({ condition: "", status: "", });
    const [fc, setFc] = useState({ condition: "", status: "", relation: "", });
    const [al, setAl] = useState({ drugAllergy: "", foodAllergy: "", otherAllergies: "", });
    const [sh, setSh] = useState({ status: "", });
    const hOpts={"":"Any",yes:"Yes",no:"No",cessased:"Cessased"}; const yOpts={"":"Any",yes:"Yes",no:"No"}; const dOpts={"":"Any","Pure Veg":"Pure Veg","Mixed Diet":"Mixed Diet",Eggetarian:"Eggetarian"}; const cParams=["","HTN","DM","Epileptic","Vertigo", "Hyper thyroid","Hypo thyroid","Asthma","Mental Illness", "CVS","CNS","RS","ENT", "GIT","KUB","Musculo Skeletal (Fractures, etc.)","Skin", "Oral/Dental", "Cancer","Defective Colour Vision","OTHERS","Obstetric","Gynaec"];
    const hhc=(e)=>{setPh(p=>({...p,[e.target.name]:e.target.value}))}; const hpc=(e)=>{setPc(p=>({...p,[e.target.name]:e.target.value}))}; const hfc=(e)=>{setFc(p=>({...p,[e.target.name]:e.target.value}))}; const hal=(e)=>{setAl(p=>({...p,[e.target.name]:e.target.value}))}; const hsh=(e)=>{setSh(p=>({...p,[e.target.name]:e.target.value}))};
    const handleSubmit = () => {
        let cf={}; Object.entries(ph).forEach(([k,v])=>{if(v)cf[k]=v}); Object.entries(al).forEach(([k,v])=>{if(v)cf[k]=v}); if(sh.status){cf.surgicalHistory=sh.status} if(pc.condition&&pc.status){cf[`personal_${pc.condition}`]=pc.status} const { condition, status, relation } = fc; if (condition || status || relation) { const familyFilter = {}; if (condition) familyFilter.condition = condition; if (status) familyFilter.status = status; if (relation) familyFilter.relation = relation; cf.familyCondition = familyFilter; }
        if(Object.keys(cf).length > 0){ addFilter(cf); } else { alert("Select at least one criterion.") } setPh({smoking:"",alcohol:"",paan:"",diet:""}); setPc({condition:"",status:""}); setFc({condition:"",status:"",relation:""}); setAl({drugAllergy:"",foodAllergy:"",otherAllergies:""}); setSh({status:""});
    };
    return (
    <div className="space-y-6">
        <div className="border border-gray-200 p-4 rounded-xl bg-gray-50"><h4 className="text-gray-700 font-bold mb-3">Personal Habits</h4><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Object.keys(ph).map((k)=>(<div key={k}><label className={uiStyles.label}>{k}</label><select name={k} value={ph[k]} onChange={hhc} className={uiStyles.select}>{Object.entries(k==='diet'?dOpts:hOpts).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>))}</div></div>
        <div className="border border-gray-200 p-4 rounded-xl bg-gray-50"><h4 className="text-gray-700 font-bold mb-3">Condition History</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className={uiStyles.label}>Condition</label><select name="condition" value={pc.condition} onChange={hpc} className={uiStyles.select}>{cParams.map(c=><option key={c} value={c}>{c||'--Select--'}</option>)}</select></div><div><label className={uiStyles.label}>Status</label><select name="status" value={pc.status} onChange={hpc} disabled={!pc.condition} className={`${uiStyles.select} disabled:bg-gray-200`}>{Object.entries(yOpts).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div></div></div>
        <div className="border border-gray-200 p-4 rounded-xl bg-gray-50"><h4 className="text-gray-700 font-bold mb-3">Allergies</h4><div className="grid grid-cols-1 md:grid-cols-3 gap-4">{Object.keys(al).map((k)=>(<div key={k}><label className={uiStyles.label}>{k==='drugAllergy'?'Drug':k==='foodAllergy'?'Food':'Other'}</label><select name={k} value={al[k]} onChange={hal} className={uiStyles.select}>{Object.entries(yOpts).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>))}</div></div>
        <button onClick={handleSubmit} className={uiStyles.buttonPrimary}> Add Medical History Filter </button>
    </div>
    );
};

const VaccinationForm = ({ addFilter }) => {
  const [formData, setFormData] = useState({ disease: "", vaccine: "", vaccine_status: "", });
  const dOpts = [ "", "Covid-19", "Hepatitis B", "Influenza", "Tetanus", "MMR", "Rabies", "Chickenpox", "HPV", "Pneumococcal" ];
  const pOpts = [ "", "Pre exposure prophylaxis", "Post exposure prophylaxis" ]; const sOpts = { "": "Any", Completed: "Completed", Partial: "Partial" };
  const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
  const handleSubmit = () => { const filtered = Object.fromEntries(Object.entries(formData).filter(([_, v]) => v !== "")); if (Object.keys(filtered).length === 0) { return alert("Select at least one criterion."); } addFilter(filtered); setFormData({ disease: "", vaccine: "", vaccine_status: "" }); };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div><label className={uiStyles.label}>Vaccine Against</label><select name="disease" value={formData.disease} onChange={handleChange} className={uiStyles.select}>{dOpts.map(d => (<option key={d} value={d}>{d || "--Select--"}</option>))}</select></div>
        <div><label className={uiStyles.label}>Prophylaxis</label><select name="vaccine" value={formData.vaccine} onChange={handleChange} className={uiStyles.select}>{pOpts.map(v => (<option key={v} value={v}>{v || "--Select--"}</option>))}</select></div>
        <div><label className={uiStyles.label}>Status</label><select name="vaccine_status" value={formData.vaccine_status} onChange={handleChange} className={uiStyles.select}>{Object.entries(sOpts).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}</select></div>
      </div>
      <button onClick={handleSubmit} disabled={!formData.disease && !formData.vaccine && !formData.vaccine_status} className={uiStyles.buttonPrimary}>Add Vaccination Filter</button>
    </div>
  );
};

const PurposeFilter = ({ addFilter }) => {
    const PurposeData = { "Preventive": { "Pre employment": "Medical Examination", "Pre employment (Food Handler)": "Medical Examination", "Pre Placement": "Medical Examination", "Annual / Periodical": "Medical Examination", "Periodical (Food Handler)": "Medical Examination", "Retirement medical examination": "Medical Examination", "Camps (Mandatory)": "Medical Examination", "Camps (Optional)": "Medical Examination", "Special Work Fitness": "Periodic Work Fitness", "Special Work Fitness (Renewal)": "Periodic Work Fitness", "Fitness After Medical Leave": "Fitness After Medical Leave", "Fitness After Personal Long Leave": "Fitness After Personal Long Leave", "Mock Drill": "Mock Drill", "BP Sugar Check  ( Normal Value)": "BP Sugar Check  ( Normal Value)", "Follow Up Visits":"Follow Up Visits", "Other": "Other", }, "Curative": { "Illness": "Outpatient", "Over Counter Illness": "Outpatient", "Injury": "Outpatient", "Over Counter Injury": "Outpatient", "Follow Up Visits": "Follow Up Visits", "BP Sugar Chart": "Outpatient", "Injury Outside the Premises": "Outpatient", "Over Counter Injury Outside the Premises": "Outpatient", "Alcohol Abuse": "Alcohol Abuse", "Other": "Other", } };
    const [formData, setFormData] = useState({ fromDate: "", toDate: "", type_of_visit: "", register: "", specificCategory: "", }); const { fromDate, toDate, type_of_visit, register, specificCategory } = formData;
    const subcategories = type_of_visit ? Object.keys(PurposeData[type_of_visit] || {}) : [];
    const rawSpecific = type_of_visit && register ? PurposeData[type_of_visit]?.[register] : [];
    const specificOpts = Array.isArray(rawSpecific) ? rawSpecific : (rawSpecific ? [rawSpecific] : []);
    const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => { const ns = { ...prev, [name]: value }; if (name === 'type_of_visit') { ns.register = ""; ns.specificCategory = ""; } else if (name === 'register') { ns.specificCategory = ""; } return ns; }); };
    const handleSubmit = () => { const pf = {}; if (fromDate) pf.fromDate = fromDate; if (toDate) pf.toDate = toDate; if (type_of_visit) pf.type_of_visit = type_of_visit; if (register) pf.register = register; if (specificCategory) pf.specificCategory = specificCategory; if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) { alert("'From' > 'To'."); return; } if (Object.keys(pf).length > 0) { addFilter({ purpose: pf }); } else { alert("Select criterion or date range."); } setFormData({ fromDate: "", toDate: "", type_of_visit: "", register: "", specificCategory: "" }); };
    return (<div className="space-y-6"> <div className="p-4 rounded-xl bg-gray-50 border border-gray-200"><h5 className="font-bold text-gray-700 mb-3">Visit Dates</h5><div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <div><label className={uiStyles.label}>From</label><input type="date" name="fromDate" value={fromDate} onChange={handleChange} className={uiStyles.input}/></div> <div><label className={uiStyles.label}>To</label><input type="date" name="toDate" value={toDate} onChange={handleChange} min={fromDate || undefined} className={uiStyles.input}/></div> </div></div> <div className="p-4 rounded-xl bg-gray-50 border border-gray-200"><h5 className="font-bold text-gray-700 mb-3">Visit Type</h5><div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <div><label className={uiStyles.label}>Type</label><select name="type_of_visit" value={type_of_visit} onChange={handleChange} className={uiStyles.select}><option value="">--Select--</option>{Object.keys(PurposeData).map((k)=>(<option key={k} value={k}>{k}</option>))}</select></div> <div><label className={uiStyles.label}>Register</label><select name="register" value={register} onChange={handleChange} disabled={!type_of_visit} className={`${uiStyles.select} disabled:bg-gray-200`}><option value="">--Select--</option>{subcategories.map((k)=>(<option key={k} value={k}>{k}</option>))}</select></div></div></div> <button onClick={handleSubmit} className={uiStyles.buttonPrimary}>Add Purpose Filter</button> </div>);
}

const Referrals = ({ addFilter, specialityOptions = [], hospitalOptions = [], doctorOptions = [] }) => {
    const [formData, setFormData] = useState({ referred: "", speciality: "", hospitalName: "", doctorName: "" });
    const handleChange = (e) => { setFormData(prev => ({ ...prev, [e.target.name]: e.target.value })); };
    const handleSubmit = (e) => { e.preventDefault(); const fd=Object.fromEntries(Object.entries(formData).filter(([_,v])=>v!==""&&v!==null)); if(Object.keys(fd).length>0){addFilter({referrals:fd})}else{alert("Select criterion.")} setFormData({referred:"",speciality:"",hospitalName:"",doctorName:""}); }; 
    return (<form onSubmit={handleSubmit} className="space-y-5"> <div> <label className={uiStyles.label}>Referral Made?</label> <select name="referred" value={formData.referred} onChange={handleChange} className={uiStyles.select}><option value="">Any</option><option value="Yes">Yes</option><option value="No">No</option></select> </div> <div className="grid grid-cols-1 md:grid-cols-2 gap-5"> <div> <label className={uiStyles.label}>Speciality</label> <input name="speciality" value={formData.speciality} onChange={handleChange} className={uiStyles.select}></input></div> <div> <label className={uiStyles.label}>Hospital</label> <input name="hospitalName" value={formData.hospitalName} onChange={handleChange} className={uiStyles.select}></input> </div> </div> <div> <label className={uiStyles.label}>Doctor</label> <input name="doctorName" value={formData.doctorName} onChange={handleChange} className={uiStyles.select}></input> </div> <button type="submit" className={uiStyles.buttonPrimary}>Add Referral Filter</button> </form>);
};

const StatutoryForms = ({ addFilter }) => {
    const [formData, setFormData] = useState({ formType: "", from: "", to: "", });
    const formOptions = ["Form27", "Form17", "Form38", "Form39", "Form40"];
    const handleChange = (e) => { setFormData(prev => ({ ...prev, [e.target.name]: e.target.value })); };
    const handleSubmit = () => { if (!formData.formType) { alert("Select form type."); return; } if (formData.from && formData.to && formData.from > formData.to) { alert("'From' > 'To'."); return; } addFilter({ statutoryFormFilter: formData }); setFormData({ formType: "", from: "", to: "" }); };
    return (<div className="space-y-5"> <div> <label className={uiStyles.label}>Form Type *</label> <select name="formType" value={formData.formType} onChange={handleChange} className={uiStyles.select} required><option value="">--Select--</option>{formOptions.map(f => <option key={f} value={f}>{f}</option>)}</select> </div> <div className="grid grid-cols-2 gap-5"> <div> <label className={uiStyles.label}>From Date</label> <input type="date" name="from" value={formData.from} onChange={handleChange} className={uiStyles.input}/> </div> <div> <label className={uiStyles.label}>To Date</label> <input type="date" name="to" value={formData.to} onChange={handleChange} className={uiStyles.input}/> </div> </div> <button onClick={handleSubmit} className={uiStyles.buttonPrimary} disabled={!formData.formType}>Add Statutory Filter</button> </div>);
}

export default RecordsFilters;