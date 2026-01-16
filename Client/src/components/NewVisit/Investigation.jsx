import axios from "axios";
import React, { useState, useEffect } from "react";

// --- Helper: Icon for expand/collapse ---
const ChevronDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block ml-2" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block ml-2" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
  </svg>
);


function InvestigationForm({ data, mrdNo }) {
  console.log("Received data prop:", data);
  console.log("Received mrdNo prop:", mrdNo);

  const [formData, setFormData] = useState({});
  const [processedData, setProcessedData] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [activeCategoryForForm, setActiveCategoryForForm] = useState("");

  const accessLevel = localStorage.getItem('accessLevel');

  const getNestedData = (obj, path) => {
    if (!obj) return null;
    return path.split('.').reduce((acc, part) => acc && acc[part] !== undefined ? acc[part] : null, obj);
  };

  const categoryMap = {
    "HAEMATALOGY": "heamatalogy",
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
    "USG": "usgreport",
    "MRI": "mrireport",
    "X-RAY": "xray",
    "CT": "ctreport",
  };

  const allInvFormOptions = Object.keys(categoryMap);

  useEffect(() => {
    if (data && data.length > 0 && data[0]) {
      const initialData = data[0];
      setProcessedData(initialData);
      setExpandedCategories({});
      setActiveCategoryForForm("");
      setFormData({});
    } else {
      setProcessedData(null);
      setExpandedCategories({});
      setActiveCategoryForForm("");
      setFormData({});
    }
  }, [data]);
  
  useEffect(() => {
    if (mrdNo && activeCategoryForForm) {
      setFormData(prevData => ({ ...prevData, mrdNo: mrdNo }));
    }
  }, [mrdNo, activeCategoryForForm]);


  const toggleCategory = (categoryName) => {
    const isCurrentlyExpanded = expandedCategories[categoryName];
    let newActiveCategory = "";
    const newExpandedState = {};

    if (!isCurrentlyExpanded) {
      allInvFormOptions.forEach(opt => {
        newExpandedState[opt] = (opt === categoryName);
      });
      newActiveCategory = categoryName;

      if (processedData) {
        const categoryKey = categoryMap[categoryName];
        const categoryData = categoryKey ? getNestedData(processedData, categoryKey) : null;
        
        if (categoryData && typeof categoryData === 'object') {
          // Exclude internal fields and set form data
          const { id, latest_id, aadhar, checked, entry_date, emp_no, mrdNo: oldMrdNo, ...initialFields } = categoryData;
          setFormData({ ...initialFields, mrdNo: mrdNo || "" });
        } else {
          setFormData({ mrdNo: mrdNo || "" });
        }
      }
    } else {
      allInvFormOptions.forEach(opt => {
        newExpandedState[opt] = false;
      });
      newActiveCategory = "";
      setFormData({});
    }

    setExpandedCategories(newExpandedState);
    setActiveCategoryForForm(newActiveCategory);
  };


  const handleChange = (e) => {
    const { id, value } = e.target;
    // Simply update state. 
    // We removed the automatic Normal/Abnormal calculation because
    // reference ranges are now raw strings (e.g., "70-110") and hard to parse mathematically.
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleClear = (e, category) => {
    e.preventDefault();
    const categoryKey = categoryMap[category];
    if (!processedData || !categoryKey) return;
  
    const updatedData = { ...processedData };
    const categoryData = { ...updatedData[categoryKey] };
  
    for (const key in categoryData) {
      categoryData[key] = null;
    }
  
    updatedData[categoryKey] = categoryData;
    setProcessedData(updatedData);
    setFormData({ mrdNo: mrdNo || "" });
  };
  


  const handleSubmit = async (e, categoryNameToSubmit) => {
    e.preventDefault();

    if (!processedData || !processedData.aadhar) {
      alert("Employee details not loaded. Cannot submit.");
      return;
    }
    
    if (!mrdNo) {
      alert("MRD Number for this visit is missing. Please click 'Add Entry' first.");
      return;
    }

    if (!categoryNameToSubmit) {
        alert("Internal error: Category to submit is not defined.");
        return;
    }

    // Endpoint map matches your URL structure
    const endpointMap = {
        "HAEMATALOGY": "addInvestigation",
        "ROUTINE SUGAR TESTS": "addRoutineSugarTest",
        "RENAL FUNCTION TEST & ELECTROLYTES": "addRenalFunctionTest",
        "LIPID PROFILE": "addLipidProfile",
        "LIVER FUNCTION TEST": "addLiverFunctionTest",
        "THYROID FUNCTION TEST": "addThyroidFunctionTest",
        "AUTOIMMUNE TEST": "addAutoimmuneFunctionTest",
        "COAGULATION TEST": "addCoagulationTest",
        "ENZYMES & CARDIAC Profile": "addEnzymesAndCardiacProfile",
        "URINE ROUTINE": "addUrineRoutine",
        "SEROLOGY": "addSerology",
        "MOTION": "addMotion",
        "ROUTINE CULTURE & SENSITIVITY TEST": "addCultureSensitivityTest",
        "Men's Pack": "addMensPack",
        "Women's Pack": "addWomensPack",
        "Occupational Profile": "addOccupationalprofile",
        "Others TEST": "addOtherstest",
        "OPHTHALMIC REPORT": "addOpthalmicReport",
        "USG": "addUSG",
        "MRI": "addMRI",
        "X-RAY": "addXRay",
        "CT": "addCT",
    };

    const endpoint = endpointMap[categoryNameToSubmit];
    if (!endpoint) {
        alert(`No submission endpoint configured for "${categoryNameToSubmit}".`);
        return;
    }
    const url = `http://localhost:8000/${endpoint}`;

    try {
      const { emp_no, ...formDataToSend } = formData;
      const finalPayload = { 
        ...formDataToSend, 
        aadhar: processedData.aadhar,
        mrdNo: mrdNo,
        accessLevel: accessLevel
      };
      
      console.log(`Submitting Data for ${categoryNameToSubmit}:`, finalPayload);

      const response = await axios.post(url, finalPayload, {
        headers: { "Content-Type": "application/json" },
      });

      if (response.status === 200 || response.status === 201) {
        alert(`${categoryNameToSubmit} data submitted successfully!`);
      } else {
        alert(`Submission for ${categoryNameToSubmit} failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error(`Error submitting ${categoryNameToSubmit} form:`, error);
      const errorMsg = error.response?.data?.detail || error.message || "An unknown error occurred.";
      alert(`Error submitting data for ${categoryNameToSubmit}: ${errorMsg}`);
    }
  };

  const getDoctorOptions = () => {
    if (!processedData) return [];
    return allInvFormOptions.filter(option => {
        const categoryKey = categoryMap[option];
        if (!categoryKey) return false;
        const categoryData = getNestedData(processedData, categoryKey);
        // Display if checked is true
        return categoryData && categoryData.checked === true;
    });
  };

  const renderFields = (category) => {
    if (!processedData || !category) return null;

    const categoryKey = categoryMap[category];
    const categoryData = categoryKey ? getNestedData(processedData, categoryKey) : null;

    if (!categoryData || typeof categoryData !== 'object') {
        return <p className="text-gray-500 italic p-4">No data available or structure defined for {category}.</p>;
    }

    const { id, latest_id, aadhar, checked, entry_date, emp_no, ...filteredCategoryData } = categoryData;
    const allKeys = Object.keys(filteredCategoryData);

    // Filter to get the "Base" keys (e.g., 'hemoglobin' instead of 'hemoglobin_unit')
    const baseKeys = allKeys.filter(key =>
        !key.endsWith('_unit') &&
        !key.endsWith('_reference_range') && // Changed: Now looking for the single range key
        !key.endsWith('_comments') &&
        key !== 'emp_no' && 
        key !== 'mrdNo'
    );

    // Fallback if specific structure isn't found (e.g. simple lists)
    if (baseKeys.length === 0 && allKeys.length > 0) {
        const relevantKeys = allKeys.filter(key => key !== 'emp_no' && key !== 'mrdNo');
        return (
            <div className="p-4 border-t grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {relevantKeys.map((key) => (
                    <div key={key}>
                        <label htmlFor={key} className="block text-sm font-medium text-gray-700 capitalize">
                            {key.replace(/_/g, ' ')}
                        </label>
                        <input
                            type="text" id={key} name={key}
                            value={formData[key] !== undefined ? formData[key] : ''}
                            onChange={handleChange}
                            className="mt-1 py-2 px-3 block w-full rounded-md border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                    </div>
                ))}
            </div>
        );
    }

    // Main Rendering for Complex Structures
    return (
      <div className="space-y-4 p-4 border-t">
        {baseKeys.map((baseKey) => {
          const valueKey = baseKey;
          const unitKey = `${baseKey}_unit`;
          // CHANGED: Single reference range key
          const rangeKey = `${baseKey}_reference_range`; 
          const commentKey = `${baseKey}_comments`;

          const hasUnit = allKeys.includes(unitKey);
          const hasRange = allKeys.includes(rangeKey);
          const hasComment = allKeys.includes(commentKey);

          const label = baseKey.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

          return (
            <div key={baseKey} className="grid grid-cols-1 md:grid-cols-5 gap-x-3 gap-y-2 p-3 border rounded bg-gray-50 items-end">
              
              {/* Value Field */}
              <div className="md:col-span-1">
                <label htmlFor={valueKey} className="block text-xs font-medium text-gray-600 mb-1">
                  {label}
                </label>
                <input
                  type="text" id={valueKey} name={valueKey}
                  className="py-2 px-3 block w-full rounded-md border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  value={formData[valueKey] !== undefined ? formData[valueKey] : ""}
                  onChange={handleChange}
                  placeholder="Result"
                />
              </div>

              {/* Unit Field */}
              {hasUnit ? (
                <div className="md:col-span-1">
                  <label htmlFor={unitKey} className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
                  <input type="text" id={unitKey} name={unitKey}
                    className="py-2 px-3 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm text-sm "
                    value={formData[unitKey] !== undefined ? formData[unitKey] : ""}
                    onChange={handleChange} tabIndex={-1} />
                </div>
              ) : (
                <div className="md:col-span-1"></div>
              )}

              {/* Reference Range Field (Single Field) */}
              {hasRange ? (
                 <div className="md:col-span-1">
                    <label htmlFor={rangeKey} className="block text-xs font-medium text-gray-600 mb-1">Ref. Range</label>
                    <input type="text" id={rangeKey} name={rangeKey}
                        className="py-2 px-3 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm text-sm "
                        value={formData[rangeKey] !== undefined ? formData[rangeKey] : ""}
                        onChange={handleChange} tabIndex={-1} />
                </div>
              ) : (
                <div className="md:col-span-1"></div>
              )}

              {/* Comments Field */}
              {hasComment ? (
                <div className="md:col-span-2">
                  <label htmlFor={commentKey} className="block text-xs font-medium text-gray-600 mb-1">Comments</label>
                  <textarea id={commentKey} name={commentKey} rows="1"
                    className="py-2 px-3 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm text-sm "
                    value={formData[commentKey] !== undefined ? formData[commentKey] : ""}
                    onChange={handleChange} tabIndex={-1} />
                </div>
              ) : (
                <div className="md:col-span-2"></div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  let displayOptions = [];
  if (processedData) {
    if (accessLevel === "doctor") {
      displayOptions = getDoctorOptions();
    } else if (accessLevel === "nurse") {
      displayOptions = allInvFormOptions;
    }
  }

  return (
    <div className="bg-white p-6 md:p-8 rounded-lg shadow-md">

      {!processedData && data && data.length > 0 && (
        <p className="text-center text-orange-600 my-4">Processing employee data...</p>
      )}
       {(!data || data.length === 0) && (
         <p className="text-center text-red-600 my-4">Please select an employee first to view investigation categories.</p>
        )}

      {processedData && (
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-800 mb-6 border-b pb-2">Investigation Entry</h2>
            {displayOptions.length > 0 ? displayOptions.map((optionName) => (
              <div key={optionName} className="border rounded-md overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleCategory(optionName)}
                  className="w-full flex justify-between items-center text-left px-4 py-3 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:bg-gray-200 transition duration-150 ease-in-out"
                >
                  <span className="font-medium text-gray-700">{optionName}</span>
                  {expandedCategories[optionName] ? <ChevronUpIcon /> : <ChevronDownIcon />}
                </button>
                {expandedCategories[optionName] && (
                  <div className="bg-white">
                    {renderFields(optionName)}
                    <div className="px-4 py-4 border-t flex justify-end">
                        <button
                            type="button"
                            onClick={(e) => handleClear(e, optionName)}
                            className="bg-red-600 text-white px-5 py-2 me-4 rounded-md shadow hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-300 text-sm"
                        >
                            Clear {optionName} Data
                        </button>
                        <button
                            type="button"
                            onClick={(e) => handleSubmit(e, optionName)}
                            className="bg-blue-600 text-white px-5 py-2 rounded-md shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-300 text-sm"
                        >
                            Submit {optionName} Data
                        </button>
                    </div>
                  </div>
                )}
              </div>
            )) : (
                (accessLevel === "doctor" && <p className="text-sm text-gray-500 mt-2 italic p-4 text-center">No investigation records found with today's date for this employee.</p>) ||
                (accessLevel !== "doctor" && accessLevel !== "nurse" && <p className="text-sm text-gray-500 mt-2 italic p-4 text-center">No investigation categories available for your role.</p>)
            )}
        </div>
      )}
    </div>
  );
}

export default InvestigationForm;