import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";

const dataMapping = {
  Employee: {
    Preventive: {
      "Pre employment": "Medical Examination",
      "Pre employment (Food Handler)": "Medical Examination",
      "Pre Placement": "Medical Examination",
      "Annual / Periodical": "Medical Examination",
      "Periodical (Food Handler)": "Medical Examination",
      "Retirement medical examination": "Medical Examination",
      "Camps (Mandatory)": "Medical Examination",
      "Camps (Optional)": "Medical Examination",
      "Special Work Fitness": "Periodic Work Fitness",
      "Special Work Fitness (Renewal)": "Periodic Work Fitness",
      "Fitness After Medical Leave": "Fitness After Medical Leave",
      "Fitness After Personal Long Leave": "Fitness After Personal Long Leave",
      "Mock Drill": "Mock Drill",
      "BP Sugar Check  ( Normal Value)": "BP Sugar Check  ( Normal Value)",
      "Preventive - Follow Up Visits": "Follow Up Visits",
      "Preventive Other": "Other",
    },
    Curative: {
      "Illness": "Outpatient",
      "Over Counter Illness": "Outpatient",
      "Injury": "Outpatient",
      "Over Counter Injury": "Outpatient",
      "Curative - Follow Up Visits": "Follow Up Visits",
      "BP Sugar Chart": "Outpatient",
      "Injury Outside the Premises": "Outpatient",
      "Over Counter Injury Outside the Premises": "Outpatient",
      "Alcohol Abuse": "Alcohol Abuse",
      "Curative Other": "Other",
    },
  },
  Contractor: {
    Preventive: {
      "Pre employment": "Medical Examination",
      "Pre employment (Food Handler)": "Medical Examination",
      "Pre Placement (Same Contract)": "Medical Examination",
      "Pre Placement (Contract change)": "Medical Examination",
      "Annual / Periodical": "Medical Examination",
      "Periodical (Food Handler)": "Medical Examination",
      "Camps (Mandatory)": "Medical Examination",
      "Camps (Optional)": "Medical Examination",
      "Special Work Fitness": "Periodic Work Fitness",
      "Special Work Fitness (Renewal)": "Periodic Work Fitness",
      "Fitness After Medical Leave": "Fitness After Medical Leave",
      "Fitness After Personal Long Leave": "Fitness After Personal Long Leave",
      "Mock Drill": "Mock Drill",
      "BP Sugar Check  ( Normal Value)": "BP Sugar Check  ( Normal Value)",
      "Preventive - Follow Up Visits": "Follow Up Visits",
      "Preventive Other": "Other",
    },
    Curative: {
      "Illness": "Outpatient",
      "Over Counter Illness": "Outpatient",
      "Injury": "Outpatient",
      "Over Counter Injury": "Outpatient",
      "Curative - Follow Up Visits": "Outpatient",
      "BP Sugar ( Abnormal Value)": "BP Sugar Check  ( Abnormal Value)",
      "Injury Outside the Premises": "Outpatient",
      "Over Counter Injury Outside the Premises": "Outpatient",
      "Alcohol Abuse": "Alcohol Abuse",
      "Curative Other": "Other",
    },
  },
  Visitor: {
    Preventive: {
      "Fitness": "Fitness",
      "BP Sugar ( Normal Value)": "BP Sugar Check  ( Normal Value)",
      "Preventive - Follow Up Visits": "Follow Up Visits",
    },
    Curative: {
      "Illness": "Outpatient",
      "Over Counter Illness": "Outpatient",
      "Injury": "Outpatient",
      "Over Counter Injury": "Outpatient",
      "Curative - Follow Up Visits": "Outpatient",
      "BP Sugar ( Abnormal Value)": "BP Sugar Check  ( Abnormal Value)",
      "Injury Outside the Premises": "Outpatient",
      "Over Counter Injury Outside the Premises": "Outpatient",
      "Curative Other": "Other",
    },
  },
};

 const BookAppointment = () => {
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState("Employee"); 
  const [visitType, setVisitType] = useState(""); 
  const [register, setRegister] = useState(""); 
  const [broadCategory, setBroadCategory] = useState(""); 

  const [employees, setEmployees] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [isAutoFilled, setIsAutoFilled] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    
    // Core Identity
    aadharNo: "",
    employeeId: "",
    name: "",
    organization: "",
    contractorName: "",
    
    // Classification (Matching JSON keys)
    role: "Employee",         // Matches "type"
    type_of_visit: "",        // Matches "type_of_visit"
    register: "",             // Matches "register" (Specific)
    purpose: "",              // Matches "purpose" (Broad Category)
    
    appointmentDate: new Date().toISOString().slice(0, 10),
    time: "",
    bookedBy: "",
    
    // Conditional Fields
    year: "",
    batch: "",
    hospitalName: "",
    campName: "",
    contractName: "",
    prevcontractName: "",
    old_emp_no: "",
    bp_sugar_status: "",
    bp_sugar_chart_reason: "",
    followupConsultationReason: "",
    otherfollowupConsultationReason: "",
    otherPurpose: "",
  });


  // --- Dynamic Field Definitions for Person Details ---
  const employeeFields = [
    { label: "Aadhar No:", name: "aadharNo", type: "text", placeholder: "Enter Aadhar No", disabled: false },
    { label: "Enter ID:", name: "employeeId", type: "text", placeholder: "Enter employee ID", disabled: isAutoFilled },
    { label: "Name:", name: "name", type: "text", placeholder: "Enter employee name", disabled: isAutoFilled },
    { label: "Name of Organization:", name: "organization", type: "text", placeholder: "Enter name of organization", disabled: isAutoFilled },
    { label: "Date of the appointment:", name: "appointmentDate", type: "date", disabled: false },
    { label: "Time:", name: "time", type: "time", disabled: false }
  ];

  const contractorFields = [
    { label: "Aadhar No:", name: "aadharNo", type: "text", placeholder: "Enter Aadhar No", disabled: false },
    { label: "Enter ID:", name: "employeeId", type: "text", placeholder: "Enter employee ID", disabled: isAutoFilled },
    { label: "Name:", name: "name", type: "text", placeholder: "Enter employee name", disabled: isAutoFilled },
    { label: "Contractor Name:", name: "contractorName", type: "text", placeholder: "Enter contractor name", disabled: isAutoFilled },
    { label: "Appointment Date:", name: "appointmentDate", type: "date" },
    { label: "Time:", name: "time", type: "time" },
    
  ];

  const visitorFields = [
    { label: "Aadhar No:", name: "aadharNo", type: "text", placeholder: "Enter Aadhar No", disabled: false },
    { label: "Name:", name: "name", type: "text", placeholder: "Enter name", disabled: isAutoFilled },
    { label: "Name of Institute / Organization:", name: "organization", type: "text", placeholder: "Enter name of organization", disabled: isAutoFilled },
    { label: "Appointment Date:", name: "appointmentDate", type: "date" },
    { label: "Time:", name: "time", type: "time" }
  ];

  // --- Helper to get current Person fields (excluding purpose logic) ---
  const getCurrentFields = () => {
    switch (role) {
      case "Employee": return employeeFields;
      case "Contractor": return contractorFields;
      case "Visitor": return visitorFields;
      default: return employeeFields;
    }
  };

  // --- Get Options for "Register" Dropdown ---
  const getRegisterOptions = () => {
    if (!role || !visitType) return [];
    const options = dataMapping[role]?.[visitType];
    return options ? Object.keys(options) : [];
  };

  // --- Handle Changes ---
  
  // 1. Handle Visit Type Change


  // 3. General Form Change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === "aadharNo") {
        const numericValue = value.replace(/\D/g, '');
        setFormData(prev => ({ ...prev, [name]: numericValue }));

      if (numericValue.length === 12) {
        handleAadharLookup(numericValue);
      } else {
        if (isAutoFilled) {
          setIsAutoFilled(false);
          setFormData(prev => ({
            ...prev,
            [name]: numericValue,
            name: "",
            employeeId: "",
            organization: "",
            contractorName: ""
          }));
        }
      }
    }
  };

  // --- Form Validity Check ---
  useEffect(() => {
    const checkValidity = () => {
      // 1. Check Person Fields
      const activeFields = getCurrentFields();
      for (let field of activeFields) {
        const value = formData[field.name];
        if ((!value || value.trim() === "") && !isAutoFilled) {
          setIsFormValid(false);
          return;
        }
        if (field.name === "aadharNo" && value.length !== 12) {
            setIsFormValid(false);
            return;
        }
      }

      // 2. Check Purpose Logic
      if (!visitType || !register) {
        setIsFormValid(false);
        return;
      }

      setIsFormValid(true);
    };

    checkValidity();
  }, [formData, role, visitType, register]); 


  const handleAadharLookup = async (aadhar) => {
    if (aadhar.length !== 12) return;
    try {
      const response = await axios.post("http://localhost:8000/get_worker_by_aadhar/", { aadhar: aadhar });
      if (response.data.success) {
        const worker = response.data.data;
        setFormData(prev => ({
          ...prev,
          name: worker.name || "",
          employeeId: worker.employeeId || "",
          organization: worker.organization || "",
          contractorName: worker.contractorName || "",
        }));
        setIsAutoFilled(true);
      }
    } catch (error) {
      console.log("Worker not found or error fetching", error);
      setIsAutoFilled(false);
    }
  };
  const handleVisitChange = (e) => {
    const val = e.target.value;
    setVisitType(val);
    setRegister("");
    setBroadCategory("");
    
    // Update formData with visit type
    setFormData(prev => ({ 
        ...prev, 
        type_of_visit: val,
        register: "",
        purpose: ""
    }));
  };

  const handleRegisterChange = (e) => {
    const selectedRegister = e.target.value;
    setRegister(selectedRegister);
    
    // Determine the Broad Category (Purpose) based on mapping
    let derivedCategory = "";
    if (role && visitType && selectedRegister) {
        derivedCategory = dataMapping[role][visitType][selectedRegister] || "";
    }
    setBroadCategory(derivedCategory);

    // Update formData: 
    // register = Specific Selection (e.g., "Preventive - Follow Up Visits")
    // purpose = Broad Category (e.g., "Follow Up Visits")
    setFormData(prev => ({ 
        ...prev, 
        register: selectedRegister,
        purpose: derivedCategory 
    }));
  };

  const handleRoleChange = (e) => {
    const newRole = e.target.value;
    setRole(newRole);
    setVisitType("");
    setRegister("");
    setBroadCategory("");
    setIsAutoFilled(false);
    
    // Reset form with new Role
    setFormData({
      date: new Date().toISOString().slice(0, 10),
      role: newRole,
      type_of_visit: "",
      register: "",
      purpose: "",
      employeeId: "",
      aadharNo: "",
      name: "",
      organization: "",
      contractorName: "",
      appointmentDate: new Date().toISOString().slice(0, 10),
      time: "",
      bookedBy: localStorage.getItem("userData") || "",
      // Reset conditionals
      year: "", batch: "", hospitalName: "", campName: "", contractName: "",
      prevcontractName: "", old_emp_no: "", bp_sugar_status: "", 
      bp_sugar_chart_reason: "", followupConsultationReason: "", 
      otherfollowupConsultationReason: "", otherPurpose: ""
    });
  };

  // --- Fetch Admin Data ---
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const response = await axios.post("http://localhost:8000/adminData");
        const fetchedEmployees = response.data.data;
        setEmployees(fetchedEmployees);

        const nurseNames = fetchedEmployees.filter(emp => emp.role === "nurse").map(emp => emp.name);
        const doctorNames = fetchedEmployees.filter(emp => emp.role === "doctor").map(emp => emp.name);

        setNurses(nurseNames);
        setDoctors(doctorNames);
        setFormData(prev => ({ ...prev, bookedBy: localStorage.getItem("userData") || "" }));
      } catch (error) {
        console.error("Error fetching employee data:", error);
      }
    };
    fetchDetails();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Ensure default Nurse/Doc if empty
    if (formData.bookedBy === "") formData.bookedBy = localStorage.getItem("userData") || "";

    try {
      const response = await fetch("http://localhost:8000/bookAppointment/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        data = { message: "Appointment booked." };
      }

      if (response.ok) {
        alert(data.message || "Appointment booked successfully!");
        window.location.reload(); // Simple reload to clear everything strictly
      } else {
        alert(`${data.message || `Failed. Status: ${response.status}`}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fieldVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeInOut" } },
  };

  const displayedFields = getCurrentFields();

  return (
    <motion.div
      className="p-6 rounded-lg bg-gray-50 shadow-md"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Book Appointment</h2>
        {/* Role/Type is now part of the Purpose Logic Block */}
      </div>

      <form className="mt-5" onSubmit={handleSubmit}>
        
        {/* --- PURPOSE & TYPE SELECTION LOGIC --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 bg-white rounded shadow-sm border border-gray-200">
             {/* 1. Role Selection */}
             <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Select Type</label>
                <select
                required
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  value={role}
                  onChange={handleRoleChange}
                >
                  <option value="Employee">Employee</option>
                  <option value="Contractor">Contractor</option>
                  <option value="Visitor">Visitor</option>
                </select>
            </div>

            {/* 2. Visit Type Selection */}
            <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Select Type of Visit</label>
                <select
                  required
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  value={visitType}
                  onChange={handleVisitChange}
                >
                  <option value="">Select Visit Type</option>
                  <option value="Preventive">Preventive</option>
                  <option value="Curative">Curative</option>
                </select>
            </div>

            {/* 3. Register (Purpose) Selection */}
            <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Select Register</label>
                <select
                  required
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  value={register}
                  onChange={handleRegisterChange}
                  disabled={!visitType}
                >
                  <option value="">Select Register</option>
                  {getRegisterOptions().map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
            </div>

            {/* 4. Auto-filled Purpose Category */}
            <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Purpose (Category)</label>
                <input
                  required
                  type="text"
                  value={broadCategory}
                  readOnly
                  placeholder="Auto-filled"
                  className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm text-sm text-gray-600 cursor-not-allowed"
                />
            </div>
        </div>

        {/* --- CONDITIONAL FIELDS BASED ON REGISTER --- */}
        <div className="mb-6">
            {register === "Other" && (
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Other Purpose</label>
                  <input
                    required
                    type="text"
                    name="otherPurpose"
                    value={formData.otherPurpose}
                    onChange={handleChange}
                    placeholder="Specify other purpose"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
            )}

            {(register === "Annual / Periodical" || register === "Periodical (Food Handler)") && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">Year</label>
                      <input required type="text" name="year" value={formData.year} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm" />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">Batch</label>
                      <input required type="text" name="batch" value={formData.batch} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm" />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">Hospital Name</label>
                      <input required type="text" name="hospitalName" value={formData.hospitalName} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm" />
                    </div>
                  </div>
            )}

            {register.startsWith("Camps") && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">Camp Name</label>
                      <input required type="text" name="campName" value={formData.campName} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm" />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">Hospital Name</label>
                      <input required type="text" name="hospitalName" value={formData.hospitalName} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm" />
                    </div>
                  </div>
            )}

            {register.startsWith("Pre Placement Same Contract") && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">Contract Name</label>
                      <input required type="text" name="contractName" value={formData.contractName} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm" />
                    </div>
                  </div>
            )}

            {register.startsWith("Pre Placement Contract change") && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">Previous Contract Name</label>
                      <input required type="text" name="prevcontractName" value={formData.prevcontractName} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm" />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">Old Employee Number</label>
                      <input required type="text" name="old_emp_no" value={formData.old_emp_no} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm" />
                    </div>
                  </div>
            )}

            {register.startsWith("BP Sugar Check") && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">Patient Status</label>
                      <select name="bp_sugar_status" value={formData.bp_sugar_status} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm">
                        <option value="">Select</option>
                        <option value="Normal People">Normal People</option>
                        <option value="Patient under control">Patient under control</option>
                      </select>
                    </div>
                  </div>
            )}

            {register.startsWith("BP Sugar Chart") && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">Job Nature (Reason)</label>
                      <select name="bp_sugar_chart_reason" value={formData.bp_sugar_chart_reason} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm">
                        <option value="">Select</option>
                        <option value="Newly detected">Newly detected</option>
                        <option value="Patient <150 <100">Patient &lt;150 &lt;100</option>
                      </select>
                    </div>
                  </div>
            )}

            {(register.startsWith("Curative - Follow Up Visits") || register.startsWith("Preventive - Follow Up Visits")) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">Followup Consultation</label>
                      <select 
                        name="followupConsultationReason"
                        value={formData.followupConsultationReason}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="">Select Reason</option>
                        {/* Logic based on Role and Visit Type for Follow up options */}
                        {role === "Visitor" && visitType === "Curative" && (
                           <>
                              <option>Illness</option><option>Over Counter illness</option><option>Injury</option>
                              <option>Over Counter Injury</option><option>BP Sugar Chart</option><option>Injury Outside the Premises</option>
                              <option>Over Counter Injury Outside the Premises</option><option>Cure Others</option><option>Fitness</option><option>Prev Others</option>
                           </>
                        )}
                        {role === "Employee" && visitType === "Curative" && (
                           <>
                              <option>Illness</option><option>Over Counter illness</option><option>Injury</option>
                              <option>Over Counter Injury</option><option>BP Sugar Chart</option><option>Injury Outside the Premises</option>
                              <option>Over Counter Injury Outside the Premises</option><option>Cure Others</option><option>Alcohol Abuse</option>
                              <option>Pre Employment</option><option>Pre Employment(Food Handler)</option><option>Pre Placement (Dept/job change)</option>
                              <option>Pre Employment Contract change</option><option>Annual/Periodical</option><option>Periodical (Food Handler)</option>
                              <option>Retirement medical examination</option><option>Camps(Mandatory)</option><option>Camps(Optional)</option>
                              <option>Special Work Fitness</option><option>Special Work Fitness(Renewal)</option><option>Fitness After Medical Leave</option>
                              <option>Fitness After Personal Long Leave</option><option>Mock Drill</option><option>Prev Others</option>
                           </>
                        )}
                        {role === "Contractor" && visitType === "Curative" && (
                           <>
                              <option>Illness</option><option>Over Counter illness</option><option>Injury</option>
                              <option>Over Counter Injury</option><option>BP Sugar Chart</option><option>Injury Outside the Premises</option>
                              <option>Over Counter Injury Outside the Premises</option><option>Cure Others</option><option>Alcohol Abuse</option>
                              <option>Pre Employment</option><option>Pre Employment(Food Handler)</option><option>Pre Placement (Same Contract)</option>
                              <option>Pre Employment Contract change</option><option>Annual/Periodical</option><option>Periodical (Food Handler)</option>
                              <option>Camps(Mandatory)</option><option>Camps(Optional)</option><option>Special Work Fitness</option>
                              <option>Special Work Fitness(Renewal)</option><option>Fitness After Medical Leave</option><option>Fitness After Personal Long Leave</option>
                              <option>Mock Drill</option><option>Prev Others</option>
                           </>
                        )}
                        {(visitType === "Preventive") && (
                           <>
                              <option>Annual/Periodical</option><option>Periodical (Food Handler)</option>
                              <option>Camps(Mandatory)</option><option>Camps(Optional)</option><option>Others</option>
                           </>
                        )}
                        {/* Default Fallback */}
                        {visitType === "" && <option>Others</option>}
                      </select>
                    </div>

                    {formData.followupConsultationReason && formData.followupConsultationReason.endsWith("Others") && (
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Other Consultation Reason</label>
                            <input 
                                type="text" 
                                name="otherfollowupConsultationReason" 
                                value={formData.otherfollowupConsultationReason} 
                                onChange={handleChange} 
                                className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm" 
                            />
                        </div>
                    )}
                  </div>
            )}
        </div>

        {/* --- PERSONAL DETAILS & APPOINTMENT INFO --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedFields.map((field, index) => (
            <motion.div
              key={`${role}-${field.name}-${index}`}
              className="flex flex-col"
              variants={fieldVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: index * 0.07 }}
            >
              <label className="text-gray-700 font-medium mb-2 text-sm">
                {field.label} {field.name === "aadharNo" && "(12 Digits)"}
              </label>
              {field.type === "select" ? (
                <select
                  name={field.name}
                  className={`px-4 py-2 w-full bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${field.disabled ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''}`}
                  value={formData[field.name]}
                  onChange={handleChange}
                  disabled={field.disabled}
                >
                  <option value="">Select {field.label.replace(':', '')}</option>
                  {field.options && field.options.map((option, idx) => (
                    <option key={idx} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type}
                  name={field.name}
                  className={`px-4 py-2 w-full bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${field.disabled ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''}`}
                  placeholder={field.placeholder || ""}
                  value={formData[field.name]}
                  onChange={handleChange}
                  disabled={field.disabled}
                  maxLength={field.name === "aadharNo" ? 12 : undefined}
                />
              )}
            </motion.div>
          ))}
        </div>

        <div className="col-span-1 sm:col-span-2 lg:col-span-3 flex justify-end mt-8">
          <button
            type="submit"
            disabled={loading || !isFormValid}
            className={`px-6 py-2 text-white rounded-lg shadow-md transition focus:outline-none focus:ring-2 focus:ring-offset-2 
                ${loading || !isFormValid 
                    ? 'bg-gray-400 cursor-not-allowed opacity-60' 
                    : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' 
                }`}
          >
            {loading ? "Booking appointment..." : "Book appointment"}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default BookAppointment;