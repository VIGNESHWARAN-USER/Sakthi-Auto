  import React, { useState, useEffect } from 'react';
  import Select from 'react-select';

  // This is the combined component for the "New Visit" page.
  const MedicalHistory1 = ({ data, mrdNo }) => {
    const emp_no = data && data[0] ? data[0]?.emp_no : null;
    const aadhar = data && data[0] ? data[0]?.aadhar : null;
    const initialSex = data && data[0] ? data[0]?.sex || "" : "";

    const [isEditMode, setIsEditMode] = useState(true);
    const [sex, setSex] = useState(initialSex);

    // --- Styles ---
    const cardStyle = {
      backgroundColor: "#f8f9fa", borderRadius: "8px", padding: "1rem", marginBottom: "1rem", boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
    };
    const headerStyle = {
      display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", cursor: "pointer",
    };
    const titleStyle = { fontSize: "1.25rem", fontWeight: "600" };
    const tableContainerStyle = { overflowX: "auto" };
    const tableStyle = {
      width: "100%", borderCollapse: "collapse", backgroundColor: "white", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)", borderRadius: "0.5rem",
    };
    const tableHeaderStyle = { backgroundColor: "#e9ecef", textAlign: "left" };
    const cellStyle = { padding: "0.5rem", borderBottom: "1px solid #dee2e6" };
    const inputStyle = {
      width: "100%", padding: "0.375rem 0.75rem", border: "1px solid #ced4da", borderRadius: "0.25rem", boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.075)", backgroundColor: "#e5f3ff",
    };
    const selectStyle = {
      width: "100%", padding: "0.375rem 0.75rem", border: "1px solid #ced4da", borderRadius: "0.25rem", backgroundColor: "#e5f3ff", boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.075)", appearance: 'none', minHeight: 'calc(1.5em + 0.75rem + 2px)', display: 'block',
    };
    const textareaStyle = {
      width: "100%", padding: "0.375rem 0.75rem", border: "1px solid #ced4da", borderRadius: "0.25rem", boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.075)", backgroundColor: "#e5f3ff", resize: 'vertical', minHeight: '3rem',
    };
    const buttonStyle = {
      backgroundColor: "#007bff", color: "white", padding: "0.5rem 1rem", borderRadius: "0.25rem", border: "none", cursor: "pointer",
    };
    const removeButtonStyle = {
      backgroundColor: "#dc3545", color: "white", padding: "0.375rem 0.75rem", borderRadius: "0.25rem", border: "none", cursor: "pointer",
    };
    // --- End Styles ---

    const [showForm, setShowForm] = useState(false); // Medical History collapsed by default
    const [showFamilyHistory, setShowFamilyHistory] = useState(false); // Family History collapsed by default

    const toggleFormVisibility = () => setShowForm(!showForm);
    const toggleFamilyVisibility = () => setShowFamilyHistory(!showFamilyHistory);

    // --- State Variables ---
    // Initial state structures
    const initialMedicalData = {
      HTN: { detail: "", comment: "", children: [] },
      DM: { detail: "", comment: "", children: [] },
      Hyper_Thyroid: { detail: "", comment: "", children: [] },
      Hypo_Thyroid: { detail: "", comment: "", children: [] },
      Epileptic: { detail: "", comment: "", children: [] },
      Vertigo: { detail: "", comment: "", children: [] },
      Asthma: { detail: "", comment: "", children: [] },
      Mental_Illness: { detail: "", comment: "", children: [] },
      CNS: { detail: "", comment: "", children: [] },
      CVS: { detail: "", comment: "", children: [] },
      RS: { detail: "", comment: "", children: [] },
      ENT: { detail: "", comment: "", children: [] },
      GIT: { detail: "", comment: "", children: [] },
      KUB: { detail: "", comment: "", children: [] },
      Musculo_Skeletal: { detail: "", comment: "", children: [] },
      Skin: { detail: "", comment: "", children: [] },
      Dental_Oral: { detail: "", comment: "", children: [] },
      Cancer: { detail: "", comment: "", children: [] },
      Defective_Colour_Vision: { detail: "", comment: "", children: [] },
      Others: { detail: "", comment: "", children: [] },
      Prostate_Genital: { detail: "", comment: "", children: [] },
      Obstetric: { detail: [], comment: "", children: [] },
      Gynaec: { detail: [], comment: "", children: [] }
    };
    const initialFamilyHistory = {
      father: { status: "", reason: "", remarks: "" }, mother: { status: "", reason: "", remarks: "" }, maternalGrandFather: { status: "", reason: "", remarks: "" }, maternalGrandMother: { status: "", reason: "", remarks: "" }, paternalGrandFather: { status: "", reason: "", remarks: "" }, paternalGrandMother: { status: "", reason: "", remarks: "" },
      HTN: { detail: [], comment: "", children: [] },
      DM: { detail: [], comment: "", children: [] },
      Hyper_Thyroid: { detail: [], comment: "", children: [] },
      Hypo_Thyroid: { detail: [], comment: "", children: [] },
      Epileptic: { detail: [], comment: "", children: [] },
      Vertigo: { detail: [], comment: "", children: [] },
      Asthma: { detail: [], comment: "", children: [] },
      Mental_Illness: { detail: [], comment: "", children: [] },
      CNS: { detail: [], comment: "", children: [] },
      CVS: { detail: [], comment: "", children: [] },
      RS: { detail: [], comment: "", children: [] },
      ENT: { detail: [], comment: "", children: [] },
      GIT: { detail: [], comment: "", children: [] },
      KUB: { detail: [], comment: "", children: [] },
      Musculo_Skeletal: { detail: [], comment: "", children: [] },
      Skin: { detail: [], comment: "", children: [] },
      Dental_Oral: { detail: [], comment: "", children: [] },
      Cancer: { detail: [], comment: "", children: [] },
      Defective_Colour_Vision: { detail: [], comment: "", children: [] },
      Others: { detail: [], comment: "", children: [] },
      Prostate_Genital: { detail: [], comment: "", children: [] },
      Obstetric: { detail: [], comment: "", children: [] },
      Gynaec: { detail: [], comment: "", children: [] }
    };
    const initialConditions = {
      DM: [], RS: [], CNS: [], CVS: [], GIT: [], KUB: [], HTN: [], Epileptic: [], Hyper_Thyroid: [], Hypo_Thyroid: [], Asthma: [], Cancer: [], Defective_Colour_Vision: [], Others: [],
      Obstetric: [], Gynaec: [], Prostate_Genital: [], Mental_Illness: [], ENT: [], Musculo_Skeletal: [], Skin: [], Dental_Oral: [], Vertigo: []
    };

    // State hooks
    const [isHistoryUpdated, setIsHistoryUpdated] = useState(false);
    const [personalHistory, setPersonalHistory] = useState({ diet: "", paan: { yesNo: "", years: "" }, alcohol: { yesNo: "", years: "", frequency: "" }, smoking: { yesNo: "", years: "", perDay: "" } });
    const [medicalData, setMedicalData] = useState(initialMedicalData);
    const [femaleWorker, setFemaleWorker] = useState({ obstetricHistory: "", gynecologicalHistory: "" });
    const [surgicalHistory, setSurgicalHistory] = useState({ comments: "", history: "", children: [] });
    const [familyHistory, setFamilyHistory] = useState(initialFamilyHistory);
    const [allergyFields, setAllergyFields] = useState({ drug: { yesNo: "" }, food: { yesNo: "" }, others: { yesNo: "" } });
    const [allergyComments, setAllergyComments] = useState({ drug: "", food: "", others: "" });
    const [childrenData, setChildrenData] = useState([]);
    const [spousesData, setSpousesData] = useState([]);
    const [conditions, setConditions] = useState(initialConditions);

    const defaultPerson = { sex: "", dob: "", age: "", status: "", reason: "", remarks: "" };

    // --- Options ---
    const familyConditionRelationshipOptions = [
      { value: "brother", label: "Brother" },
      { value: "sister", label: "Sister" },
      { value: "father", label: "Father" },
      { value: "mother", label: "Mother" },
      { value: "spouse", label: "Spouse" },
      { value: "paternalGrandFather", label: "Paternal Grand Father" },
      { value: "paternalGrandMother", label: "Paternal Grand Mother" },
      { value: "maternalGrandFather", label: "Maternal Grand Father" },
      { value: "maternalGrandMother", label: "Maternal Grand Mother" },
    ];

    const maleRelativeOptions = [
      { value: "brother", label: "Brother" },
      { value: "father", label: "Father" },
      { value: "paternalGrandFather", label: "Paternal Grand Father" },
      { value: "maternalGrandFather", label: "Maternal Grand Father" },
    ];

    const femaleRelativeOptions = [
      { value: "sister", label: "Sister" },
      { value: "mother", label: "Mother" },
      { value: "spouse", label: "Spouse" },
      { value: "paternalGrandMother", label: "Paternal Grand Mother" },
      { value: "maternalGrandMother", label: "Maternal Grand Mother" },
    ];
    const obstetricGynaecOptions = [
      { value: "G1 P1 L1 A1", label: "G1 P1 L1 A1" },
      { value: "G2 P1 L1 A1", label: "G2 P1 L1 A1" },
      { value: "G3 P1 L1 A1", label: "G3 P1 L1 A1" },
      { value: "P2 L1 A1", label: "P2 L1 A1" },
    ];
    const customStyles = { // Styles for react-select
      control: (provided, state) => ({
        ...provided, backgroundColor: "#e5f3ff", border: "1px solid #ced4da", borderRadius: "0.25rem", padding: "2px", boxShadow: state.isFocused ? "0 0 0 1px #007bff" : "inset 0 1px 2px rgba(0, 0, 0, 0.075)", "&:hover": { border: "1px solid #aaa", }, minHeight: 'calc(1.5em + 0.75rem + 2px)',
      }),
      valueContainer: (provided) => ({ ...provided, padding: '0 0.5rem' }),
      input: (provided) => ({ ...provided, margin: '0', padding: '0', }),
      indicatorSeparator: () => ({ display: 'none' }),
      indicatorsContainer: (provided) => ({ ...provided, paddingRight: '0.25rem', }),
      menu: (provided) => ({ ...provided, marginTop: '1px', marginBottom: 'auto', zIndex: 10, backgroundColor: 'white', border: "1px solid #aaa", borderRadius: "0.25rem", boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)", }),
      menuList: (provided) => ({ ...provided, paddingTop: 0, paddingBottom: 0, maxHeight: '200px', overflowY: 'auto' }),
      option: (provided, state) => ({ ...provided, padding: '0.5rem 0.75rem', color: state.isSelected ? 'white' : 'black', backgroundColor: state.isSelected ? "#007bff" : state.isFocused ? "#e9ecef" : "white", "&:hover": { backgroundColor: "#e9ecef", cursor: 'pointer', }, }),
      multiValue: (provided) => ({ ...provided, backgroundColor: '#cce5ff', borderRadius: '0.25rem', margin: '2px', }),
      multiValueLabel: (provided) => ({ ...provided, color: '#004085', padding: '2px 4px', }),
      multiValueRemove: (provided) => ({ ...provided, color: '#004085', cursor: 'pointer', ':hover': { backgroundColor: '#0056b3', color: 'white', }, }),
    };

    // --- useEffect for Data Loading ---
    useEffect(() => {
      if (data && data[0]) {
        const currentData = data[0];
        const currentInitialSex = currentData?.sex || "";
        setSex(currentInitialSex);

        const medical = currentData.medicalhistory || {};
        console.log("Extracted medical history data:", medical);

        const defaultPersonalHistory = { diet: "", paan: { yesNo: "", years: "" }, alcohol: { yesNo: "", years: "", frequency: "" }, smoking: { yesNo: "", years: "", perDay: "" } };
        const loadedPersonalHistory = medical.personal_history || {};
        setPersonalHistory({
          ...defaultPersonalHistory, ...loadedPersonalHistory,
          paan: { ...defaultPersonalHistory.paan, ...(loadedPersonalHistory.paan || {}) },
          alcohol: { ...defaultPersonalHistory.alcohol, ...(loadedPersonalHistory.alcohol || {}) },
          smoking: { ...defaultPersonalHistory.smoking, ...(loadedPersonalHistory.smoking || {}) },
        });

        const loadedMedicalData = medical.medical_data || {};
        const completeMedicalData = Object.keys(initialMedicalData).reduce((acc, key) => {
          const loadedItem = loadedMedicalData[key] || {};
          acc[key] = {
            ...initialMedicalData[key], ...loadedItem,
            detail: (key === 'Obstetric' || key === 'Gynaec')
              ? (Array.isArray(loadedItem.detail) ? loadedItem.detail : (typeof loadedItem.detail === 'string' && loadedItem.detail ? loadedItem.detail.split(',').map(s => s.trim()).filter(Boolean) : initialMedicalData[key].detail))
              : (loadedItem.detail !== undefined && loadedItem.detail !== null ? loadedItem.detail : initialMedicalData[key].detail),
            children: Array.isArray(loadedItem.children) ? loadedItem.children : initialMedicalData[key].children
          };
          return acc;
        }, {});
        setMedicalData(completeMedicalData);

        setFemaleWorker(medical.female_worker || { obstetricHistory: "", gynecologicalHistory: "" });

        const loadedSurgical = medical.surgical_history || {};
        setSurgicalHistory({
          comments: loadedSurgical.comments || "",
          history: loadedSurgical.history || "",
          children: Array.isArray(loadedSurgical.children) ? loadedSurgical.children : []
        });

        const defaultAllergyFields = { drug: { yesNo: "" }, food: { yesNo: "" }, others: { yesNo: "" } };
        const loadedAllergyFields = medical.allergy_fields || {};
        setAllergyFields({
          ...defaultAllergyFields,
          drug: { ...defaultAllergyFields.drug, ...(loadedAllergyFields.drug || {}) },
          food: { ...defaultAllergyFields.food, ...(loadedAllergyFields.food || {}) },
          others: { ...defaultAllergyFields.others, ...(loadedAllergyFields.others || {}) },
        });
        setAllergyComments(medical.allergy_comments || { drug: "", food: "", others: "" });

        setChildrenData(Array.isArray(medical.children_data) ? medical.children_data.map(c => ({ ...defaultPerson, ...c })) : []);

        const loadedFamilyHistoryRaw = medical.family_history || {};
        const { spouse, ...familyHistoryRest } = loadedFamilyHistoryRaw;
        const completeFamilyHistory = Object.keys(initialFamilyHistory).reduce((acc, key) => {
          if (['father', 'mother', 'maternalGrandFather', 'maternalGrandMother', 'paternalGrandFather', 'paternalGrandMother'].includes(key)) {
            acc[key] = { ...initialFamilyHistory[key], ...(familyHistoryRest[key] || {}) };
          } else {
            const loadedItem = familyHistoryRest[key] || {};
            acc[key] = {
              ...initialFamilyHistory[key], ...loadedItem,
              children: Array.isArray(loadedItem.children) ? loadedItem.children : []
            };
          }
          return acc;
        }, {});
        setFamilyHistory(completeFamilyHistory);

        if (Array.isArray(medical.spouse_data)) {
          setSpousesData(medical.spouse_data.map(sp => ({ ...defaultPerson, ...sp })));
        } else if (spouse && typeof spouse === 'object' && !Array.isArray(spouse)) {
          console.warn("Loading spouse data from legacy 'family_history.spouse' field.");
          setSpousesData([{ ...defaultPerson, ...spouse }]);
        } else {
          setSpousesData([]);
        }

        setConditions({ ...initialConditions, ...(medical.conditions || {}) });
      } else {
        console.log("No valid data received, resetting medical history form state.");
        setSex("");
        setPersonalHistory({ diet: "", paan: { yesNo: "", years: "" }, alcohol: { yesNo: "", years: "", frequency: "" }, smoking: { yesNo: "", years: "", perDay: "" } });
        setMedicalData(initialMedicalData);
        setFemaleWorker({ obstetricHistory: "", gynecologicalHistory: "" });
        setSurgicalHistory({ comments: "", history: "", children: [] });
        setFamilyHistory(initialFamilyHistory);
        setAllergyFields({ drug: { yesNo: "" }, food: { yesNo: "" }, others: { yesNo: "" } });
        setAllergyComments({ drug: "", food: "", others: "" });
        setChildrenData([]);
        setSpousesData([]);
        setConditions(initialConditions);
      }
    }, [data]);

    // --- Handlers ---

    const markHistoryAsUpdated = () => {
      if (!isHistoryUpdated) setIsHistoryUpdated(true);
    };


    const handlePersonalHistoryChange = (e) => {
      markHistoryAsUpdated();
      const { name, value } = e.target;
      const keys = name.split('-');
      if (keys.length === 1) {
        if (['smoking', 'alcohol', 'paan'].includes(name)) {
          setPersonalHistory(prev => ({ ...prev, [name]: { ...(prev[name] || {}), yesNo: value } }));
        } else {
          setPersonalHistory(prev => ({ ...prev, [name]: value }));
        }
      } else if (keys.length === 2) {
        const [group, field] = keys;
        setPersonalHistory(prev => ({ ...prev, [group]: { ...(prev[group] || {}), [field]: value } }));
      }
    };

    const handleAllergySelect = (allergyType) => {
      markHistoryAsUpdated();
      const currentSelection = allergyFields[allergyType]?.yesNo;
      const newSelection = currentSelection === "yes" ? "no" : "yes";
      setAllergyFields((prev) => ({ ...prev, [allergyType]: { ...(prev[allergyType] || {}), yesNo: newSelection } }));
      if (newSelection === "no") { handleAllergyCommentChange(allergyType, ""); }
    };
    const handleAllergyCommentChange = (allergyType, comment) => {
      markHistoryAsUpdated();
      setAllergyComments((prev) => ({ ...prev, [allergyType]: comment }));
    };

    const handleMedicalInputChange = (conditionKey, field, value) => {
      markHistoryAsUpdated();
      setMedicalData((prev) => ({ ...prev, [conditionKey]: { ...(prev[conditionKey] || initialMedicalData[conditionKey]), [field]: value } }));
    };

    const handleSurgicalHistoryCommentChange = (comment) => {
      markHistoryAsUpdated();
      setSurgicalHistory((prev) => ({ ...prev, comments: comment }));
    };

    const handleFamilyHistoryChange = (relativeKey, field, value) => {
      markHistoryAsUpdated();
      setFamilyHistory((prev) => ({ ...prev, [relativeKey]: { ...(prev[relativeKey] || {}), [field]: value } }));
    };

    const handleFamilyMedicalConditionChange = (conditionKey, field, value) => {
      markHistoryAsUpdated();
      setFamilyHistory(prev => ({ ...prev, [conditionKey]: { ...(prev[conditionKey] || initialFamilyHistory[conditionKey]), [field]: value } }));
    };
    const handleSelectionChange = (conditionKey, selectedOptions) => {
      markHistoryAsUpdated();
      const selectedValues = selectedOptions ? selectedOptions.map(option => option.value) : [];
      setConditions(prev => ({ ...prev, [conditionKey]: selectedValues }));
    };

    const handleChildInputChange = (index, field, value) => {
      markHistoryAsUpdated();
      setChildrenData((prev) => {
        const updatedData = [...prev];
        updatedData[index] = { ...(updatedData[index] || defaultPerson), [field]: value };
        return updatedData;
      });
    };
    const addChild = () => setChildrenData((prev) => [...(Array.isArray(prev) ? prev : []), { ...defaultPerson }]);
    const removeChild = (index) => setChildrenData((prev) => prev.filter((_, i) => i !== index));

    const handleSpouseInputChange = (index, field, value) => {
      markHistoryAsUpdated();
      setSpousesData((prev) => {
        const updatedData = [...prev];
        updatedData[index] = { ...(updatedData[index] || defaultPerson), [field]: value };
        return updatedData;
      });
    };
    const addSpouse = () => setSpousesData((prev) => [...(Array.isArray(prev) ? prev : []), { ...defaultPerson }]);
    const removeSpouse = (index) => setSpousesData((prev) => prev.filter((_, i) => i !== index));

    const handleFemaleWorkerChange = (field, value) => setFemaleWorker((prev) => ({ ...prev, [field]: value }));

    // --- Submit Handler ---
    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!mrdNo) {
        alert("Please submit the initial entries first to get an MRD Number.");
        return;
      }
      const processHistoryItem = (item, fieldKey) => {
        if (!item) return { detail: '', comment: '', children: [] };
        const newItem = { ...item };
        const textValue = newItem[fieldKey];
        if ((fieldKey === 'detail' || fieldKey === 'comments') && typeof textValue === 'string' && textValue.trim().length > 0) {
          if (!Array.isArray(newItem.children)) { newItem.children = []; }
          if (!newItem.children.includes(textValue.trim())) {
            newItem.children.push(textValue.trim());
          }
          newItem[fieldKey] = "";
        }
        if (!Array.isArray(newItem.children)) { newItem.children = []; }
        return newItem;
      };

      const processFamilyHistoryConditions = (currentFamilyHistory, currentConditions) => {
        const updatedFamilyHistory = JSON.parse(JSON.stringify(currentFamilyHistory));
        Object.keys(currentConditions).forEach(conditionKey => {
          const isConditionKey = initialFamilyHistory[conditionKey] && typeof initialFamilyHistory[conditionKey] === 'object' && !['father', 'mother', 'maternalGrandFather', 'maternalGrandMother', 'paternalGrandFather', 'paternalGrandMother'].includes(conditionKey);
          const hasSelections = Array.isArray(currentConditions[conditionKey]) && currentConditions[conditionKey].length > 0;
          if (isConditionKey && hasSelections) {
            const relations = currentConditions[conditionKey].map(value => familyConditionRelationshipOptions.find(opt => opt.value === value)?.label || value).join(', ');
            const relationString = `Affected Relatives: ${relations}`;
            if (!updatedFamilyHistory[conditionKey]) {
              updatedFamilyHistory[conditionKey] = { ...initialFamilyHistory[conditionKey] };
            }
            let existingComment = updatedFamilyHistory[conditionKey].comment || '';
            if (!existingComment.includes(relationString)) {
              updatedFamilyHistory[conditionKey].comment = existingComment ? `${existingComment.trim()}; ${relationString}` : relationString;
            }
          }
        });
        return updatedFamilyHistory;
      };

      const processedMedicalData = Object.keys(medicalData).reduce((acc, key) => {
        if (key === 'Obstetric' || key === 'Gynaec') {
          acc[key] = { ...medicalData[key], children: Array.isArray(medicalData[key]?.children) ? medicalData[key].children : [] };
        } else {
          acc[key] = processHistoryItem(medicalData[key], 'detail');
        }
        return acc;
      }, {});
      const processedSurgicalHistory = processHistoryItem({ ...surgicalHistory }, 'comments');
      const processedFamilyHistory = processFamilyHistoryConditions(familyHistory, conditions);

      const formData = {
        mrdNo: mrdNo, // Use MRD from props
        emp_no: emp_no, // Use emp_no from props
        aadhar: aadhar,
        personal_history: personalHistory,
        medical_data: processedMedicalData,
        surgical_history: processedSurgicalHistory,
        family_history: processedFamilyHistory,
        allergy_fields: allergyFields,
        allergy_comments: allergyComments,
        children_data: childrenData,
        spouse_data: spousesData,
      };

      if (!aadhar) {
        console.error("Aadhar number is missing. Cannot submit.");
        alert("Error: Aadhar number is missing. Please ensure patient data includes Aadhar.");
        return;
      }

      if (sex === 'Female' || sex === 'Other') {
        formData.female_worker = femaleWorker;
        if (formData.medical_data.Obstetric && Array.isArray(formData.medical_data.Obstetric.detail)) {
          formData.medical_data.Obstetric.detail = formData.medical_data.Obstetric.detail.join(', ');
        } else {
          formData.medical_data.Obstetric = { ...(formData.medical_data.Obstetric || {}), detail: "" };
        }
        if (formData.medical_data.Gynaec && Array.isArray(formData.medical_data.Gynaec.detail)) {
          formData.medical_data.Gynaec.detail = formData.medical_data.Gynaec.detail.join(', ');
        } else {
          formData.medical_data.Gynaec = { ...(formData.medical_data.Gynaec || {}), detail: "" };
        }
        formData.family_history.Obstetric = formData.family_history.Obstetric || { detail: "", comment: "", children: [] };
        formData.family_history.Gynaec = formData.family_history.Gynaec || { detail: "", comment: "", children: [] };
      } else {
        delete formData.female_worker;
        if (formData.medical_data) {
          delete formData.medical_data.Obstetric;
          delete formData.medical_data.Gynaec;
        }
        if (formData.family_history) {
          delete formData.family_history.Obstetric;
          delete formData.family_history.Gynaec;
        }
      }

      console.log("Submitting Data:", JSON.stringify(formData, null, 2));

      try {
        const response = await fetch("http://localhost:8000/medical-history/", {
          method: "POST",
          headers: { "Content-Type": "application/json", },
          body: JSON.stringify(formData),
        });
        if (response.ok) {
          const result = await response.json();
          console.log("Data submitted successfully!", result);
          alert("Form submitted successfully!");
          setMedicalData(processedMedicalData);
          setSurgicalHistory(processedSurgicalHistory);
          setFamilyHistory(processedFamilyHistory);
        } else {
          const errorData = await response.text();
          console.error("Error submitting data:", response.status, response.statusText, errorData);
          alert(`Error: ${response.status} ${response.statusText}. ${errorData || 'No additional error details.'}`);
        }
      } catch (error) {
        console.error("Network or fetch error:", error);
        alert("Network error. Please check connection.");
      }
    }; // --- End Submit Handler ---

    // --- Rendered JSX ---
    return (
      <div className="p-4 md:p-6 bg-gray-100">
        {(!data || data.length === 0) && (
          <p className="text-center text-red-600 my-4">Please select an employee first to view Medical History categories.</p>
        )}

        {/* Personal History Section */}

        {data &&(data.length > 0) && (
          <div>
        <div className="mb-6 p-4 border rounded-lg bg-white shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Personal History</h2>
          {/* Smoking */}
          <div className="mb-4">
            <label className="block font-medium mb-2 text-gray-700">Smoking</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-4 gap-y-2 items-center">
              {['yes', 'no', 'cessased'].map(val => (
                <div key={val} className="flex items-center space-x-2">
                  <input type="radio" name="smoking" value={val} id={`smoking-${val}`} className="form-radio h-5 w-5 text-blue-600 focus:ring-blue-500"
                    onChange={handlePersonalHistoryChange} checked={personalHistory?.smoking?.yesNo === val} disabled={!isEditMode} />
                  <label htmlFor={`smoking-${val}`} className="text-sm text-gray-700">{val.charAt(0).toUpperCase() + val.slice(1)}</label>
                </div>
              ))}
              <input type="text" name="smoking-years" placeholder="Years" style={inputStyle}
                onChange={handlePersonalHistoryChange} value={personalHistory?.smoking?.years || ""} disabled={!isEditMode || personalHistory?.smoking?.yesNo !== 'yes'} />
              <input type="text" name="smoking-perDay" placeholder="Freq/day" style={inputStyle}
                onChange={handlePersonalHistoryChange} value={personalHistory?.smoking?.perDay || ""} disabled={!isEditMode || personalHistory?.smoking?.yesNo !== 'yes'} />
            </div>
          </div>
          {/* Alcohol */}
          <div className="mb-4">
            <label className="block font-medium mb-2 text-gray-700">Alcohol</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-4 gap-y-2 items-center">
              {['yes', 'no', 'cessased'].map(val => (
                <div key={val} className="flex items-center space-x-2">
                  <input type="radio" name="alcohol" value={val} id={`alcohol-${val}`} className="form-radio h-5 w-5 text-blue-600 focus:ring-blue-500"
                    onChange={handlePersonalHistoryChange} checked={personalHistory?.alcohol?.yesNo === val} disabled={!isEditMode} />
                  <label htmlFor={`alcohol-${val}`} className="text-sm text-gray-700">{val.charAt(0).toUpperCase() + val.slice(1)}</label>
                </div>
              ))}
              <input type="text" name="alcohol-years" placeholder="Years" style={inputStyle}
                onChange={handlePersonalHistoryChange} value={personalHistory?.alcohol?.years || ""} disabled={!isEditMode || personalHistory?.alcohol?.yesNo !== 'yes'} />
              <input type="text" name="alcohol-frequency" placeholder="Freq/day" style={inputStyle}
                onChange={handlePersonalHistoryChange} value={personalHistory?.alcohol?.frequency || ""} disabled={!isEditMode || personalHistory?.alcohol?.yesNo !== 'yes'} />
            </div>
          </div>
          {/* Paan */}
          <div className="mb-4">
            <label className="block font-medium mb-2 text-gray-700">Paan/Beetle</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-4 gap-y-2 items-center">
              {['yes', 'no', 'cessased'].map(val => (
                <div key={val} className="flex items-center space-x-2">
                  <input type="radio" name="paan" value={val} id={`paan-${val}`} className="form-radio h-5 w-5 text-blue-600 focus:ring-blue-500"
                    onChange={handlePersonalHistoryChange} checked={personalHistory?.paan?.yesNo === val} disabled={!isEditMode} />
                  <label htmlFor={`paan-${val}`} className="text-sm text-gray-700">{val.charAt(0).toUpperCase() + val.slice(1)}</label>
                </div>
              ))}
              <div className="md:col-span-2">
                <input type="text" name="paan-years" placeholder="Years" style={inputStyle}
                  onChange={handlePersonalHistoryChange} value={personalHistory?.paan?.years || ""} disabled={!isEditMode || personalHistory?.paan?.yesNo !== 'yes'} />
              </div>
            </div>
          </div>
          {/* Diet */}
          <div className="mb-4">
            <label htmlFor="diet-select" className="block font-medium mb-2 text-gray-700">Diet</label>
            <select id="diet-select" style={{ ...selectStyle, width: "auto", minWidth: "150px" }} name="diet"
              onChange={handlePersonalHistoryChange} value={personalHistory?.diet || ""} disabled={!isEditMode}>
              <option value="">Select Diet</option>
              <option value="mixed diet">Mixed</option>
              <option value="pure veg">Pure Veg</option>
              <option value="eggetarian">Eggetarian</option>
            </select>
          </div>
        </div>

         {/* --- PATIENT'S MEDICAL HISTORY TABLE (INTEGRATED) --- */}
        <div style={cardStyle}>
          <div style={headerStyle} onClick={toggleFormVisibility}>
            <h2 style={titleStyle}>Medical History</h2>
            <span className="text-lg font-semibold">{showForm ? "[-]" : "[+]"}</span>
          </div>

          {showForm && (
            <div style={tableContainerStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr style={tableHeaderStyle}>
                    <th style={cellStyle}>Condition</th>
                    <th style={cellStyle}>Enter New Detail</th>
                    <th style={cellStyle}>Saved History</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                      { key: 'HTN', label: 'HTN' },
                      { key: 'DM', label: 'DM' },
                      { key: 'Hyper_Thyroid', label: 'Hyper Thyroid' },
                      { key: 'Hypo_Thyroid', label: 'Hypo Thyroid' },
                      { key: 'Epileptic', label: 'Epileptic' },
                      { key: 'Vertigo', label: 'Vertigo' },
                      { key: 'Asthma', label: 'Asthma' },
                      { key: 'Mental_Illness', label: 'Mental Illness' },
                      { key: 'CNS', label: 'CNS' },
                      { key: 'CVS', label: 'CVS' },
                      { key: 'RS', label: 'RS' },
                      { key: 'ENT', label: 'ENT' },
                      { key: 'GIT', label: 'GIT' },
                      { key: 'KUB', label: 'KUB' },
                      { key: 'Musculo_Skeletal', label: 'Musculo Skeletal (Fractures, etc.)' },
                      { key: 'Skin', label: 'Skin' },
                      { key: 'Dental_Oral', label: 'Dental/Oral' },
                      { key: 'Cancer', label: 'Cancer' },
                      { key: 'Defective_Colour_Vision', label: 'Defective Colour Vision' },
                  ].map(({ key, label }) => (
                    <tr key={key}>
                      <td style={cellStyle}>{label}</td>
                      <td style={cellStyle}>
                        <input type="text" style={inputStyle} placeholder="Enter details..."
                          value={medicalData[key]?.detail || ""}
                          onChange={(e) => handleMedicalInputChange(key, "detail", e.target.value)}
                          disabled={!isEditMode} />
                      </td>
                      <td style={cellStyle}>
                        <textarea style={{...textareaStyle, backgroundColor: '#e9ecef'}} readOnly disabled={true}
                          value={Array.isArray(medicalData[key]?.children) ? medicalData[key].children.join('\n') : ''}
                          placeholder="Previous history..." rows={2}/>
                      </td>
                    </tr>
                  ))}
                  
                  {/* Conditionally render Male specific history */}
                  {sex === 'Male' && (
                      <tr>
                          <td style={cellStyle}>Prostate & Genital</td>
                          <td style={cellStyle}>
                              <input type="text" style={inputStyle} placeholder="Enter details..."
                                  value={medicalData.Prostate_Genital?.detail || ""}
                                  onChange={(e) => handleMedicalInputChange('Prostate_Genital', 'detail', e.target.value)}
                                  disabled={!isEditMode}
                              />
                          </td>
                          <td style={cellStyle}>
                              <textarea style={{...textareaStyle, backgroundColor: '#e9ecef'}} readOnly disabled={true}
                                  value={Array.isArray(medicalData.Prostate_Genital?.children) ? medicalData.Prostate_Genital.children.join('\n') : ''}
                                  placeholder="Previous history..." rows={2}/>
                          </td>
                      </tr>
                  )}
                  
                  {/* Conditionally render Female specific history */}
                  {(sex === 'Female' || sex === 'Other') && (
                    <>
                      <tr>
                        <td style={cellStyle}>Obstetric</td>
                        <td style={cellStyle}>
                          <Select isMulti options={obstetricGynaecOptions} styles={customStyles} menuPlacement="top"
                            placeholder="Select Obstetric history..." isDisabled={!isEditMode}
                            value={obstetricGynaecOptions.filter(option => Array.isArray(medicalData.Obstetric?.detail) && medicalData.Obstetric.detail.includes(option.value))}
                            onChange={(selected) => handleMedicalInputChange('Obstetric', 'detail', selected ? selected.map(opt => opt.value) : [])}
                          />
                        </td>
                        <td style={cellStyle}>
                          <textarea style={{...textareaStyle, backgroundColor: '#e9ecef'}} readOnly disabled={true}
                              value={Array.isArray(medicalData.Obstetric?.children) ? medicalData.Obstetric.children.join('\n') : ''}
                              placeholder="Previous history..." rows={2}/>
                        </td>
                      </tr>
                      <tr>
                        <td style={cellStyle}>Gynaec</td>
                        <td style={cellStyle}>
                          <Select isMulti options={obstetricGynaecOptions} styles={customStyles} menuPlacement="top"
                            placeholder="Select Gynaec history..." isDisabled={!isEditMode}
                            value={obstetricGynaecOptions.filter(option => Array.isArray(medicalData.Gynaec?.detail) && medicalData.Gynaec.detail.includes(option.value))}
                            onChange={(selected) => handleMedicalInputChange('Gynaec', 'detail', selected ? selected.map(opt => opt.value) : [])}
                          />
                        </td>
                        <td style={cellStyle}>
                          <textarea style={{...textareaStyle, backgroundColor: '#e9ecef'}} readOnly disabled={true}
                              value={Array.isArray(medicalData.Gynaec?.children) ? medicalData.Gynaec.children.join('\n') : ''}
                              placeholder="Previous history..." rows={2}/>
                        </td>
                      </tr>
                    </>
                  )}

                  {/* Others Row */}
                  <tr>
                      <td style={cellStyle}>Others</td>
                      <td style={cellStyle}>
                          <input type="text" style={inputStyle} placeholder="Enter other details..."
                              value={medicalData.Others?.detail || ""}
                              onChange={(e) => handleMedicalInputChange('Others', 'detail', e.target.value)}
                              disabled={!isEditMode}
                          />
                      </td>
                      <td style={cellStyle}>
                          <textarea style={{...textareaStyle, backgroundColor: '#e9ecef'}} readOnly disabled={true}
                              value={Array.isArray(medicalData.Others?.children) ? medicalData.Others.children.join('\n') : ''}
                              placeholder="Previous history..." rows={2}/>
                      </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
        {/* --- END OF INTEGRATED SECTION --- */}


        {/* Surgical History Section */}
        <div className="mt-6 mb-6 p-4 border rounded-lg bg-white shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Surgical History</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="surgicalHistoryComments" className="block text-sm font-medium text-gray-700 mb-1">
                Enter New Surgical History/Comments:
              </label>
              <textarea id="surgicalHistoryComments" placeholder="Add new surgical event details..." style={textareaStyle}
                value={surgicalHistory.comments || ""} onChange={(e) => handleSurgicalHistoryCommentChange(e.target.value)} disabled={!isEditMode} rows={3} />
            </div>
            <div>
              <label htmlFor="surgicalHistoryDisplay" className="block text-sm font-medium text-gray-700 mb-1">
                Previous Surgical History:
              </label>
              <textarea id="surgicalHistoryDisplay" style={{ ...textareaStyle, backgroundColor: '#e9ecef' }}
                value={Array.isArray(surgicalHistory.children) ? surgicalHistory.children.join('\n') : (surgicalHistory.history || '')}
                readOnly disabled={true} placeholder="Previous surgical history..." rows={3} />
            </div>
          </div>
        </div>

        {/* Allergy History Section */}
        <div className="mb-6 p-4 border rounded-lg bg-white shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Allergy History</h2>
          <div className="grid grid-cols-1 md:grid-cols-[auto_auto_1fr] gap-x-4 gap-y-3 items-center">

            <div className="col-span-1 md:col-span-3 border-t my-1"></div>
            {['drug', 'food', 'others'].map(type => (
              <React.Fragment key={type}>
                <div className="flex items-center pl-2">
                  <label className="text-sm font-medium text-gray-600">{type.charAt(0).toUpperCase() + type.slice(1)} Allergy</label>
                </div>
                <div className="flex items-center justify-center space-x-4">
                  <label className="inline-flex items-center cursor-pointer">
                    <input type="radio" className="form-radio h-5 w-5 text-blue-600 focus:ring-blue-500" name={`${type}AllergyResponse`} value="yes"
                      checked={allergyFields[type]?.yesNo === "yes"} onChange={() => handleAllergySelect(type)} disabled={!isEditMode} />
                    <span className="ml-1 text-sm text-gray-700">Yes</span>
                  </label>
                  <label className="inline-flex items-center cursor-pointer">
                    <input type="radio" className="form-radio h-5 w-5 text-blue-600 focus:ring-blue-500" name={`${type}AllergyResponse`} value="no"
                      checked={!allergyFields[type]?.yesNo || allergyFields[type]?.yesNo === "no"}
                      onChange={() => handleAllergySelect(type)} disabled={!isEditMode} />
                    <span className="ml-1 text-sm text-gray-700">No</span>
                  </label>
                </div>
                <div>
                  <textarea placeholder={`Details if Yes...`} style={textareaStyle} value={allergyComments[type] || ""}
                    onChange={(e) => handleAllergyCommentChange(type, e.target.value)} disabled={!isEditMode || allergyFields[type]?.yesNo !== 'yes'} rows={2} />
                </div>
                <div className="col-span-1 md:col-span-3 border-t my-1 last:border-0"></div>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Family History Card */}
        <div style={cardStyle}>
          <div style={headerStyle} onClick={toggleFamilyVisibility}>
            <h2 style={titleStyle}>Family History</h2>
            <span className="text-lg font-semibold">{showFamilyHistory ? "[-]" : "[+]"}</span>
          </div>
          {showFamilyHistory && (
            <div className="p-2 md:p-4">
              <h3 className="text-lg font-semibold mt-2 mb-3 text-gray-800">Parents & Grandparents</h3>
              {[
                { label: "Father", key: "father" }, { label: "Paternal Grand Father", key: "paternalGrandFather" }, { label: "Paternal Grand Mother", key: "paternalGrandMother" },
                { label: "Mother", key: "mother" }, { label: "Maternal Grand Father", key: "maternalGrandFather" }, { label: "Maternal Grand Mother", key: "maternalGrandMother" },
              ].map(({ label, key }) => (
                <div key={key} className="mb-4 p-3 border rounded-md bg-gray-50 shadow-sm">
                  <label className="block mb-2 font-medium text-gray-700">{label}</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <select style={selectStyle} value={familyHistory[key]?.status || ""} onChange={(e) => handleFamilyHistoryChange(key, "status", e.target.value)} disabled={!isEditMode}>
                      <option value="">Select Status</option> <option value="Alive">Alive</option> <option value="Expired">Expired</option>
                    </select>
                    <input type="text" placeholder="Reason (if expired)" style={inputStyle} value={familyHistory[key]?.reason || ""} onChange={(e) => handleFamilyHistoryChange(key, "reason", e.target.value)} disabled={!isEditMode || familyHistory[key]?.status !== 'Expired'} />
                    <input type="text" placeholder="Remarks (Health Condition)" style={inputStyle} value={familyHistory[key]?.remarks || ""} onChange={(e) => handleFamilyHistoryChange(key, "remarks", e.target.value)} disabled={!isEditMode} />
                  </div>
                </div>
              ))}

              <h3 className="text-lg font-semibold mt-6 mb-3 text-gray-800">Family Medical Conditions</h3>
              <div style={tableContainerStyle}>
                <table style={tableStyle}>
                  <thead style={tableHeaderStyle}>
                    <tr>
                      <th style={cellStyle}>Condition</th>
                      <th style={{ ...cellStyle, width: '40%' }}>Affected Relatives (Select)</th>
                      <th style={cellStyle}>Comments / Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: 'HTN', label: 'HTN' },
                      { key: 'DM', label: 'DM' },
                      { key: 'Hyper_Thyroid', label: 'Hyper thyroid' },
                      { key: 'Hypo_Thyroid', label: 'Hypo thyroid' },
                      { key: 'Epileptic', label: 'Epileptic' },
                      { key: 'Vertigo', label: 'Vertigo' },
                      { key: 'Asthma', label: 'Asthma' },
                      { key: 'Mental_Illness', label: 'Mental Illness' },
                      { key: 'CNS', label: 'CNS' },
                      { key: 'CVS', label: 'CVS' },
                      { key: 'RS', label: 'RS' },
                      { key: 'ENT', label: 'ENT' },
                      { key: 'GIT', label: 'GIT' },
                      { key: 'KUB', label: 'KUB' },
                      { key: 'Musculo_Skeletal', label: 'Musculo Skeletal (Bone, Muscle,Tendon)' },
                      { key: 'Skin', label: 'Skin' },
                      { key: 'Dental_Oral', label: 'Dental /Oral' },
                      { key: 'Cancer', label: 'CANCER' },
                      { key: 'Defective_Colour_Vision', label: 'Defective Colour Vision' },
                      { key: 'Others', label: 'OTHERS' },
                    ].concat(
                      (sex === 'Male') ? [{ key: 'Prostate_Genital', label: 'Prostate & Genital', dropdownOptions: maleRelativeOptions }] : []
                    ).concat(
                      (sex === 'Female' || sex === 'Other') ? [
                        { key: 'Obstetric', label: 'Obstetric', dropdownOptions: femaleRelativeOptions },
                        { key: 'Gynaec', label: 'Gynaec', dropdownOptions: femaleRelativeOptions }
                      ] : []
                    ).map(({ key, label, dropdownOptions }) => {
                      const currentOptions = dropdownOptions || familyConditionRelationshipOptions;
                      return (
                        <tr key={key}>
                          <td style={{ ...cellStyle, verticalAlign: 'top', paddingTop: '0.75rem' }}>{label}</td>
                          <td style={cellStyle}>
                            <Select isMulti options={currentOptions} styles={customStyles} placeholder="Select affected relatives..." menuPlacement="auto" isDisabled={!isEditMode}
                              value={currentOptions.filter(option => Array.isArray(conditions[key]) && conditions[key].includes(option.value))}
                              onChange={(selected) => handleSelectionChange(key, selected)} />
                          </td>
                          <td style={cellStyle}>
                            <textarea value={familyHistory[key]?.comment || ''} style={textareaStyle} placeholder="Add comments about condition in family..." disabled={!isEditMode}
                              onChange={(e) => handleFamilyMedicalConditionChange(key, "comment", e.target.value)} rows={2} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mb-6 mt-6 border-t border-gray-300 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <label className="block font-semibold text-lg text-gray-800">Spouse ({spousesData.length})</label>
                  <button type="button" onClick={addSpouse} style={buttonStyle} disabled={!isEditMode}>+ Add Spouse</button>
                </div>
                {spousesData.length > 0 && (
                  <div className="overflow-x-auto mt-2">
                    <table className="w-full border-collapse border border-gray-300 bg-white shadow-sm rounded-lg" style={tableStyle}>
                      <thead>
                        <tr className="bg-gray-200 text-left text-sm" style={tableHeaderStyle}>
                          <th className="p-2 border border-gray-300" style={cellStyle}>Sex</th>
                          <th className="p-2 border border-gray-300" style={cellStyle}>DOB</th>
                          <th className="p-2 border border-gray-300" style={cellStyle}>Age</th>
                          <th className="p-2 border border-gray-300" style={cellStyle}>Status</th>
                          <th className="p-2 border border-gray-300" style={cellStyle}>Reason (Expired)</th>
                          <th className="p-2 border border-gray-300" style={cellStyle}>Remarks (Health)</th>
                          <th className="p-2 border border-gray-300" style={cellStyle}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {spousesData.map((spouse, index) => (
                          <tr key={index} className="border-b border-gray-300 text-sm hover:bg-gray-50" style={cellStyle}>
                            <td className="p-1 border-r border-gray-300" style={cellStyle}><select value={spouse.sex || ""} style={{ ...selectStyle, padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} disabled={!isEditMode} onChange={(e) => handleSpouseInputChange(index, "sex", e.target.value)}><option value="">Select</option> <option value="Male">Male</option> <option value="Female">Female</option> <option value="Other">Other</option></select></td>
                            <td className="p-1 border-r border-gray-300" style={cellStyle}><input type="date" value={spouse.dob || ""} style={{ ...inputStyle, padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} disabled={!isEditMode} onChange={(e) => handleSpouseInputChange(index, "dob", e.target.value)} /></td>
                            <td className="p-1 border-r border-gray-300" style={cellStyle}><input type="number" value={spouse.age || ""} placeholder="Age" style={{ ...inputStyle, padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} disabled={!isEditMode} onChange={(e) => handleSpouseInputChange(index, "age", e.target.value)} /></td>
                            <td className="p-1 border-r border-gray-300" style={cellStyle}><select value={spouse.status || ""} style={{ ...selectStyle, padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} disabled={!isEditMode} onChange={(e) => handleSpouseInputChange(index, "status", e.target.value)}><option value="">Status</option> <option value="Alive">Alive</option> <option value="Expired">Expired</option></select></td>
                            <td className="p-1 border-r border-gray-300" style={cellStyle}><input type="text" value={spouse.reason || ""} placeholder="Reason" style={{ ...inputStyle, padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} disabled={!isEditMode || spouse.status !== 'Expired'} onChange={(e) => handleSpouseInputChange(index, "reason", e.target.value)} /></td>
                            <td className="p-1 border-r border-gray-300" style={cellStyle}><input type="text" value={spouse.remarks || ""} placeholder="Health condition" style={{ ...inputStyle, padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} disabled={!isEditMode} onChange={(e) => handleSpouseInputChange(index, "remarks", e.target.value)} /></td>
                            <td className="p-1 text-center" style={cellStyle}><button type="button" onClick={() => removeSpouse(index)} style={removeButtonStyle} disabled={!isEditMode}>Remove</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="mb-6 mt-6 border-t border-gray-300 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <label className="block font-semibold text-lg text-gray-800">Children ({childrenData.length})</label>
                  <button type="button" onClick={addChild} style={buttonStyle} disabled={!isEditMode}>+ Add Child</button>
                </div>
                {childrenData.length > 0 && (
                  <div className="overflow-x-auto mt-2">
                    <table className="w-full border-collapse border border-gray-300 bg-white shadow-sm rounded-lg" style={tableStyle}>
                      <thead>
                        <tr className="bg-gray-200 text-left text-sm" style={tableHeaderStyle}>
                          <th className="p-2 border border-gray-300" style={cellStyle}>Sex</th><th className="p-2 border border-gray-300" style={cellStyle}>DOB</th><th className="p-2 border border-gray-300" style={cellStyle}>Age</th><th className="p-2 border border-gray-300" style={cellStyle}>Status</th><th className="p-2 border border-gray-300" style={cellStyle}>Reason (Expired)</th><th className="p-2 border border-gray-300" style={cellStyle}>Remarks (Health)</th><th className="p-2 border border-gray-300" style={cellStyle}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {childrenData.map((child, index) => (
                          <tr key={index} className="border-b border-gray-300 text-sm hover:bg-gray-50" style={cellStyle}>
                            <td className="p-1 border-r border-gray-300" style={cellStyle}><select value={child.sex || ""} style={{ ...selectStyle, padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} disabled={!isEditMode} onChange={(e) => handleChildInputChange(index, "sex", e.target.value)}><option value="">Select</option> <option value="Male">Male</option> <option value="Female">Female</option> <option value="Other">Other</option></select></td>
                            <td className="p-1 border-r border-gray-300" style={cellStyle}><input type="date" value={child.dob || ""} style={{ ...inputStyle, padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} disabled={!isEditMode} onChange={(e) => handleChildInputChange(index, "dob", e.target.value)} /></td>
                            <td className="p-1 border-r border-gray-300" style={cellStyle}><input type="number" value={child.age || ""} placeholder="Age" style={{ ...inputStyle, padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} disabled={!isEditMode} onChange={(e) => handleChildInputChange(index, "age", e.target.value)} /></td>
                            <td className="p-1 border-r border-gray-300" style={cellStyle}><select value={child.status || ""} style={{ ...selectStyle, padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} disabled={!isEditMode} onChange={(e) => handleChildInputChange(index, "status", e.target.value)}><option value="">Status</option> <option value="Alive">Alive</option> <option value="Expired">Expired</option></select></td>
                            <td className="p-1 border-r border-gray-300" style={cellStyle}><input type="text" value={child.reason || ""} placeholder="Reason" style={{ ...inputStyle, padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} disabled={!isEditMode || child.status !== 'Expired'} onChange={(e) => handleChildInputChange(index, "reason", e.target.value)} /></td>
                            <td className="p-1 border-r border-gray-300" style={cellStyle}><input type="text" value={child.remarks || ""} placeholder="Health condition" style={{ ...inputStyle, padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} disabled={!isEditMode} onChange={(e) => handleChildInputChange(index, "remarks", e.target.value)} /></td>
                            <td className="p-1 text-center" style={cellStyle}><button type="button" onClick={() => removeChild(index)} style={removeButtonStyle} disabled={!isEditMode}>Remove</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            style={buttonStyle}
            disabled={!isHistoryUpdated}
            className={`
              px-6 py-2 rounded-md transition
              ${isHistoryUpdated 
                ? "bg-blue-600 text-white hover:bg-blue-700" 
                : "bg-gray-400 text-gray-200 cursor-not-allowed"
              }
            `}
          >
            Submit Medical History
          </button>

        </div>
        <p className="text-sm text-gray-600 ">
              * Press only if changes in the above details
            </p>
      </div>)}
      </div>
    );
  };

  export default MedicalHistory1;