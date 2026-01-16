import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import axios from "axios";
import React, { useState, useEffect } from "react";

// This map links the user-friendly display names to the API keys.
const categoryDisplayMap = {
    "HAEMATOLOGY": "heamatalogy",
    "ROUTINE SUGAR TESTS": "routinesugartests",
    "RENAL FUNCTION TEST & ELECTROLYTES": "renalfunctiontests_and_electrolytes",
    "LIPID PROFILE": "lipidprofile",
    "LIVER FUNCTION TEST": "liverfunctiontest",
    "THYROID FUNCTION TEST": "thyroidfunctiontest",
    "AUTOIMMUNE TEST": "autoimmunetest",
    "COAGULATION TEST": "coagulationtest",
    "ENZYMES & CARDIAC Profile": "enzymescardiacprofile",
    "URINE ROUTINE": "urineroutinetest",
    "SEROLOGY": "serologytest",
    "MOTION": "motiontest",
    "ROUTINE CULTURE & SENSITIVITY TEST": "culturesensitivitytest",
    "Men's Pack": "menspack",
    "Women's Pack": "womenspack",
    "Occupational Profile": "occupationalprofile",
    "Others TEST": "otherstest",
    "OPHTHALMIC REPORT": "ophthalmicreport",
    "X-RAY": "xray",
    "USG": "usgreport",
    "CT": "ctreport",
    "MRI": "mrireport",
};

// This object is now fully populated based on your models.py file.
const parameterOptions = {
    heamatalogy: ["hemoglobin", "total_rbc", "total_wbc", "Haemotocrit", "neutrophil", "monocyte", "pcv", "mcv", "mch", "lymphocyte", "esr", "mchc", "platelet_count", "rdw", "eosinophil", "basophil", "peripheral_blood_smear_rbc_morphology", "peripheral_blood_smear_parasites", "peripheral_blood_smear_others"],
    routinesugartests: ["glucose_f", "glucose_pp", "random_blood_sugar", "estimated_average_glucose", "hba1c"],
    renalfunctiontests_and_electrolytes: ["urea", "bun", "calcium", "sodium", "potassium", "phosphorus", "serum_creatinine", "uric_acid", "chloride", "bicarbonate", "eGFR"],
    lipidprofile: ["Total_Cholesterol", "triglycerides", "hdl_cholesterol", "ldl_cholesterol", "chol_hdl_ratio", "vldl_cholesterol", "ldl_hdl_ratio"],
    liverfunctiontest: ["bilirubin_total", "bilirubin_direct", "bilirubin_indirect", "sgot_ast", "sgpt_alt", "alkaline_phosphatase", "total_protein", "albumin_serum", "globulin_serum", "alb_glob_ratio", "gamma_glutamyl_transferase", "C Reactive Protien"],
    thyroidfunctiontest: ["t3_triiodothyronine", "t4_thyroxine", "tsh_thyroid_stimulating_hormone"],
    autoimmunetest: ["ANA", "Anti_ds_dna", "Anticardiolipin_Antibodies", "Rheumatoid_factor"],
    coagulationtest: ["prothrombin_time", "pt_inr", "clotting_time", "bleeding_time"],
    enzymescardiacprofile: ["acid_phosphatase", "adenosine_deaminase", "amylase", "ecg", "troponin_t", "troponin_i", "cpk_total", "echo", "lipase", "cpk_mb", "tmt_normal", "Angiogram"],
    urineroutinetest: ["colour", "appearance", "reaction_ph", "specific_gravity", "crystals", "bacteria", "protein_albumin", "glucose_urine", "ketone_bodies", "urobilinogen", "casts", "bile_salts", "bile_pigments", "wbc_pus_cells", "red_blood_cells", "epithelial_cells"],
    serologytest: ["screening_hiv", "screening_hiv2", "HBsAG", "HCV", "WIDAL", "VDRL", "Dengue_NS1Ag", "Dengue_IgG", "Dengue_IgM"],
    motiontest: ["colour_motion", "appearance_motion", "occult_blood", "cyst", "mucus", "pus_cells", "ova", "rbcs", "others"],
    culturesensitivitytest: ["urine", "motion", "sputum", "blood"],
    menspack: ["psa"],
    womenspack: ["Mammogaram", "PAP_Smear"],
    occupationalprofile: ["Audiometry", "PFT"],
    otherstest: ["Bone_Densitometry","Vit D", "Vit B12", "Serum Ferritin", "Endoscopy", "Dental", "Pathology", "Clonoscopy", "Urethroscopy", "Bronchoscopy", "Cystoscopy", "Hysteroscopy", "Ureteroscopy"],
    ophthalmicreport: ["vision", "color_vision", "Cataract_glaucoma"],
    xray: ["Chest", "Spine", "Abdomen", "KUB", "Pelvis", "Skull", "Upper Limb", "Lower Limb"],
    usgreport: ["usg_abdomen", "usg_kub", "usg_pelvis", "usg_neck"],
    ctreport: ["CT_brain","CT_Head","CT_Neck", "CT_Chest", "CT_lungs", "CT_abdomen", "CT_spine", "CT_pelvis", "CT_Upper_Limb", "CT_Lower_Limb"],
    mrireport: ["mri_brain","mri_head", "mri_neck","mri_chest", "mri_lungs", "mri_abdomen", "mri_spine", "mri_pelvis", "mri_upper_limb", "mri_lower_limb"],
};


const Investigation = ({ data }) => {
  // =================================================================
  // == DATA & STATE MANAGEMENT
  // =================================================================
  const [investigationData, setInvestigationData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFiltered, setIsFiltered] = useState(false);

  // State for the filter controls
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedParameter, setSelectedParameter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // =================================================================
  // == DATA FETCHING & FILTERING
  // =================================================================
  const fetchInvestigationDetails = async (filterPayload = null) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.post(
        `http://localhost:8000/get_investigation_details/${data.aadhar}`,
        filterPayload
      );
      setInvestigationData(response.data);
      setIsFiltered(!!filterPayload);
    } catch (err) {
      setError("Failed to fetch investigation details. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (data?.aadhar) {
      fetchInvestigationDetails();
    }
  }, [data?.aadhar]);

  const handleApplyFilter = () => {
    if (!fromDate || !toDate) {
      alert("Please select both a 'From Date' and a 'To Date' to filter.");
      return;
    }
    if (new Date(fromDate) > new Date(toDate)) {
      alert("'From Date' cannot be after 'To Date'.");
      return;
    }
    fetchInvestigationDetails({ fromDate, toDate });
  };

  const handleResetFilter = () => {
    fetchInvestigationDetails(null);
    setFromDate("");
    setToDate("");
  };

  // =================================================================
  // == RENDERING LOGIC
  // =================================================================
  const formatLabel = (k) => k.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

  const renderResults = () => {
    if (isLoading) return <div className="flex flex-col items-center justify-center py-20 bg-white/50 rounded-xl border border-dashed border-gray-300">
          <FontAwesomeIcon icon={faSpinner} spin className="text-5xl text-blue-500 mb-4" />
          <p className="text-gray-600 font-semibold text-lg animate-pulse">Searching Investigation...</p>
        </div>;
    if (error) return <p className="text-center text-red-500 mt-8">{error}</p>;
    if (!selectedCategory || !selectedParameter) {
      return <p className="text-center text-gray-500 mt-8">Please select a category and parameter to view data.</p>;
    }
    
    const categoryData = investigationData?.[selectedCategory];

    if (!categoryData || categoryData.length === 0) {
      return <p className="text-center text-gray-500 mt-8">No data available for this selection {isFiltered && "in the specified date range"}.</p>;
    }

    const relevantRecords = categoryData.filter(record => record[selectedParameter] !== null && record[selectedParameter] !== '');

    if (relevantRecords.length === 0) {
        return <p className="text-center text-gray-500 mt-8">No records found with a value for "{formatLabel(selectedParameter)}".</p>;
    }

    return (
        <div className="mt-6 overflow-x-auto">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
                Results for: <span className="text-indigo-600">{formatLabel(selectedParameter)}</span>
            </h3>
            <table className="min-w-full divide-y divide-gray-200 border">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entry Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference Range</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comments</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {relevantRecords.map(record => {
                        const range_from = record[`${selectedParameter}_reference_range_from`];
                        const range_to = record[`${selectedParameter}_reference_range_to`];
                        const referenceRange = (range_from != null && range_to != null) ? `${range_from} - ${range_to}` : 'N/A';

                        return (
                            <tr key={record.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {record.entry_date ? new Date(record.entry_date).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{record[selectedParameter] || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record[`${selectedParameter}_unit`] || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{referenceRange}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record[`${selectedParameter}_comments`] || 'N/A'}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg mt-6">
      {/* --- CONTROLS SECTION --- */}
      <h2 className="text-xl font-semibold mb-4 text-gray-800">
        Investigation History & Filters
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-end">
        {/* Category Dropdown */}
        <div>
          <label htmlFor="category-select" className="block text-sm font-medium text-gray-700">Category</label>
          <select
            id="category-select"
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setSelectedParameter(""); // Reset parameter on category change
            }}
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">-- Select --</option>
            {Object.entries(categoryDisplayMap).map(([displayName, apiKey]) => (
                <option key={apiKey} value={apiKey}>{displayName}</option>
            ))}
          </select>
        </div>

        {/* Parameter Dropdown */}
        <div>
          <label htmlFor="parameter-select" className="block text-sm font-medium text-gray-700">Parameter</label>
          <select
            id="parameter-select"
            value={selectedParameter}
            onChange={(e) => setSelectedParameter(e.target.value)}
            disabled={!selectedCategory}
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
          >
            <option value="">-- Select --</option>
            {selectedCategory && parameterOptions[selectedCategory]?.map(param => (
              <option key={param} value={param}>{formatLabel(param)}</option>
            ))}
          </select>
        </div>

        {/* From Date */}
        <div>
          <label htmlFor="from-date" className="block text-sm font-medium text-gray-700">From Date</label>
          <input
            type="date"
            id="from-date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* To Date */}
        <div>
          <label htmlFor="to-date" className="block text-sm font-medium text-gray-700">To Date</label>
          <input
            type="date"
            id="to-date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        
        {/* Buttons */}
        <div className="flex space-x-2">
            <button
                onClick={handleApplyFilter}
                disabled={!fromDate || !toDate}
                className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Filter
            </button>
            {isFiltered && (
                <button
                    onClick={handleResetFilter}
                    className="w-full py-2 px-4 bg-red-500 text-white rounded-md hover:bg-red-600"
                >
                    Reset
                </button>
            )}
        </div>
      </div>
      
      {/* --- RESULTS SECTION --- */}
      <div className="mt-6 border-t border-gray-200">
        {renderResults()}
      </div>
    </div>
  );
};

export default Investigation;