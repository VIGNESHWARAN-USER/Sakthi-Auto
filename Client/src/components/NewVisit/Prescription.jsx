import React, { useState, useEffect, useCallback } from "react";
import Select from "react-select";
import { FaTrash } from "react-icons/fa";
import axios from "axios";
import { debounce } from "lodash";
import jsPDF from "jspdf";

const Prescription = ({ data, onPrescriptionUpdate, condition, register, mrdNo }) => {
  
  
  console.log(data)
  let aadhar = data?.[0]?.aadhar || "";
  const emp_no = data?.[0]?.emp_no;
  const existingPrescription = data?.[0]?.prescription || data?.[0];  // Assuming 'data' prop might contain an existing prescription
  console.log(existingPrescription, condition)
  // State for different medicine types
  const [tablets, setTablets] = useState([]);
  const [injections, setInjections] = useState([]);
  const [syrups, setSyrups] = useState([]);
  const [drops, setDrops] = useState([]);
  const [creams, setCreams] = useState([]);
  const [respules, setRespules] = useState([]);
  const [lotions, setLotions] = useState([]);
  const [fluids, setFluids] = useState([]);
  const [powder, setPowder] = useState([]);
  const [sutureProcedureItems, setSutureProcedureItems] = useState([]);
  const [dressingItems, setDressingItems] = useState([]);
  const [others, setOthers] = useState([]);
  const [nurseNotes, setNurseNotes] = useState("");
  const [consultedDoctor, setConsultedDoctor] = useState("");
  const [error, setError] = useState("");

  // State for suggestions
  const [chemicalSuggestions, setChemicalSuggestions] = useState({}); // New state for chemical suggestions
  const [brandSuggestions, setBrandSuggestions] = useState({});
  const [doseSuggestions, setDoseSuggestions] = useState({});
  const [qtySuggestions, setQtySuggestions] = useState({});
  const [expiryDateSuggestions, setExpiryDateSuggestions] = useState({});
  const [doctorSuggestions, setDoctorSuggestions] = useState([]);

  const [showChemicalSuggestions, setShowChemicalSuggestions] = useState({}); // New state for visibility
  const [showBrandSuggestions, setShowBrandSuggestions] = useState({});
  const [showDoseSuggestions, setShowDoseSuggestions] = useState({});
  const [showQtySuggestions, setShowQtySuggestions] = useState({});
  const [showExpiryDateSuggestions, setShowExpiryDateSuggestions] = useState({});
  const [showDoctorSuggestions, setShowDoctorSuggestions] = useState(false);

  const [doseManuallyEntered, setDoseManuallyEntered] = useState({});
  const [qtyManuallyEntered, setQtyManuallyEntered] = useState({});
  const [expandedSections, setExpandedSections] = useState([]);
  
  // Mappings and constants
  const medicineForms = {
    tablets: "Tablet",
    injections: "Injection",
    syrups: "Syrup",
    drops: "Drops",
    creams: "Creams",
    respules: "Respules",
    lotions: "Lotions",
    fluids: "Fluids",
    powder: "Powder",
    sutureProcedureItems: "SutureAndProcedureItems",
    dressingItems: "DressingItems",
    others: "Other",
  };

  const timingOptions = [
    { value: "Morning", label: "Morning" },
    { value: "AN", label: "AN" },
    { value: "Night", label: "Night" },
    { value: "6h/d", label: "6hrly" },
  ];
  const foodOptions = ["BF", "AF", "WF", "Well Anyways"];

  // Role-based access control
  const accessLevel = localStorage.getItem("accessLevel");
  const isDoctor = accessLevel === "doctor";
  const isNurse = accessLevel === "nurse";
  const isPharmacy = accessLevel === "pharmacist";
  const isNurseWithOverride = "nurse"
    isNurse &&
    register &&
    typeof register === "string" &&
    register.toUpperCase().startsWith("OVER");

  // Default row structure
  const getDefaultRow = useCallback(
    () => ({
      chemicalName: "",
      brandName: "",
      doseVolume: "",
      qty: "",
      timing: [],
      food: "",
      days: "",
      serving: "",
      issuedIn: "",
      issuedOut: "",
      prescriptionOut: "",
      expiryDate: "",
      indicator: ""
    }),
    []
  );

  // Initialize prescription data
  useEffect(() => {
    const initializePrescription = () => {
      const initialData = {
        tablets: [getDefaultRow()],
        injections: [getDefaultRow()],
        syrups: [getDefaultRow()],
        drops: [getDefaultRow()],
        creams: [getDefaultRow()],
        respules: [getDefaultRow()],
        lotions: [getDefaultRow()],
        fluids: [getDefaultRow()],
        powder: [getDefaultRow()],
        sutureProcedureItems: [getDefaultRow()],
        dressingItems: [getDefaultRow()],
        others: [getDefaultRow()],
        nurse_notes: "",
        consulted_doctor: "",
      };

      if (existingPrescription) {
        const mapTiming = (timing) => {
          if (!timing) return [];
          if (Array.isArray(timing))
            return timing.map((t) => ({ value: t, label: t }));
          return String(timing)
            .split(",")
            .map((t) => {
              const val = t.trim();
              if (val === "M") return { value: "Morning", label: "Morning" };
              if (val === "A" || val === "AN")
                return { value: "AN", label: "AN" };
              if (val === "N") return { value: "Night", label: "Night" };
              return { value: val, label: val };
            });
        };

        const createItem = (item) => ({
          chemicalName: item.chemicalName || "",
          brandName: item.brandName || "",
          doseVolume: item.doseVolume || "",
          serving: item.serving || "",
          qty: item.qty || "",
          timing: mapTiming(item.timing),
          food: item.food || "",
          days: item.days || "",
          expiryDate: item.expiryDate || "",
          issuedIn: item.issuedIn || "",
          issuedOut: item.issuedOut || "",
          prescriptionOut: item.prescriptionOut || "",
          indicator: '*'
        });

        initialData.tablets =
          existingPrescription.tablets?.length > 0
            ? existingPrescription.tablets.map(createItem)
            : [getDefaultRow()];
        initialData.injections =
          existingPrescription.injections?.length > 0
            ? existingPrescription.injections.map(createItem)
            : [getDefaultRow()];
        initialData.syrups =
          existingPrescription.syrups?.length > 0
            ? existingPrescription.syrups.map(createItem)
            : [getDefaultRow()];
        initialData.drops =
          existingPrescription.drops?.length > 0
            ? existingPrescription.drops.map(createItem)
            : [getDefaultRow()];
        initialData.creams =
          existingPrescription.creams?.length > 0
            ? existingPrescription.creams.map(createItem)
            : [getDefaultRow()];
        initialData.respules =
          existingPrescription.respules?.length > 0
            ? existingPrescription.respules.map(createItem)
            : [getDefaultRow()];
        initialData.lotions =
          existingPrescription.lotions?.length > 0
            ? existingPrescription.lotions.map(createItem)
            : [getDefaultRow()];
        initialData.fluids =
          existingPrescription.fluids?.length > 0
            ? existingPrescription.fluids.map(createItem)
            : [getDefaultRow()];
        initialData.powder =
          existingPrescription.powder?.length > 0
            ? existingPrescription.powder.map(createItem)
            : [getDefaultRow()];
        initialData.sutureProcedureItems =
          existingPrescription.suture_procedure?.length > 0
            ? existingPrescription.suture_procedure.map(createItem)
            : [getDefaultRow()];
        initialData.dressingItems =
          existingPrescription.dressing?.length > 0
            ? existingPrescription.dressing.map(createItem)
            : [getDefaultRow()];
        initialData.others =
          existingPrescription.others?.length > 0
            ? existingPrescription.others.map(createItem)
            : [getDefaultRow()];
        initialData.nurse_notes = existingPrescription.nurse_notes || "";
        initialData.consulted_doctor =
          existingPrescription.consulted_doctor || "";
      }

      setTablets(initialData.tablets);
      setInjections(initialData.injections);
      setSyrups(initialData.syrups);
      setDrops(initialData.drops);
      setCreams(initialData.creams);
      setRespules(initialData.respules);
      setLotions(initialData.lotions);
      setFluids(initialData.fluids);
      setPowder(initialData.powder);
      setSutureProcedureItems(initialData.sutureProcedureItems);
      setDressingItems(initialData.dressingItems);
      setOthers(initialData.others);
      setNurseNotes(initialData.nurse_notes);
      setConsultedDoctor(initialData.consulted_doctor);
    };

    initializePrescription();
  }, [emp_no, existingPrescription, getDefaultRow, condition]);

  // Function to add a new row
  const addRow = (type) => {
    if (!isDoctor && !isNurseWithOverride || isPharmacy) return;
    const newRow = getDefaultRow(type);
    const setState = (setter) => setter((prev) => [...prev, newRow]);
    const typeMap = {
      tablets: setTablets,
      injections: setInjections,
      syrups: setSyrups,
      drops: setDrops,
      creams: setCreams,
      respules: setRespules,
      lotions: setLotions,
      fluids: setFluids,
      powder: setPowder,
      sutureProcedureItems: setSutureProcedureItems,
      dressingItems: setDressingItems,
      others: setOthers,
    };
    if (typeMap[type]) {
      setState(typeMap[type]);
      if (!expandedSections.includes(type)) {
        setExpandedSections((prev) => [...prev, type]);
      }
    } else {
      console.warn("Attempted to add row for unknown type:", type);
    }
  };

  // NEW: Fetch suggestions for Chemical Name
  const fetchChemicalSuggestions = useCallback(
    debounce(async (partialName, medicineForm, type, index) => {
      // if (["sutureProcedureItems", "dressingItems"].includes(type)) {
      //   setShowChemicalSuggestions((prev) => ({
      //     ...prev,
      //     [type]: { ...prev[type], [index]: false },
      //   }));
      //   return;
      // }
      if (partialName?.length < 3 || !medicineForm) {
        setShowChemicalSuggestions((prev) => ({
          ...prev,
          [type]: { ...prev[type], [index]: false },
        }));
        return;
      }
      try {
        const response = await axios.get(
          `http://localhost:8000/get-chemical-names/?chemical_Name=${encodeURIComponent(
            partialName
          )}&medicine_form=${encodeURIComponent(medicineForm)}`
        );
        setChemicalSuggestions((prev) => ({
          ...prev,
          [type]: { ...prev[type], [index]: response.data.suggestions },
        }));
        setShowChemicalSuggestions((prev) => ({
          ...prev,
          [type]: { ...prev[type], [index]: true },
        }));
      } catch (error) {
        console.error("Error fetching chemical suggestions:", error);
        setShowChemicalSuggestions((prev) => ({
          ...prev,
          [type]: { ...prev[type], [index]: false },
        }));
      }
    }, 500),
    []
  );

  const fetchBrandSuggestions = useCallback(
    debounce(async (chemicalName, medicineForm, type, index) => {
      if (chemicalName?.length < 3
         || !medicineForm) {
        setShowBrandSuggestions((prev) => ({
          ...prev,
          [type]: { ...prev[type], [index]: false },
        }));
        return;
      }
      try {
        const response = await axios.get(
          `http://localhost:8000/get-brand-names/?chemical_name=${encodeURIComponent(
            chemicalName
          )}&medicine_form=${encodeURIComponent(medicineForm)}`
        );
        setBrandSuggestions((prev) => ({
          ...prev,
          [type]: { ...prev[type], [index]: response.data.suggestions },
        }));
        setShowBrandSuggestions((prev) => ({
          ...prev,
          [type]: { ...prev[type], [index]: true },
        }));
      } catch (error) {
        console.error("Error fetching brand suggestions:", error);
        setShowBrandSuggestions((prev) => ({
          ...prev,
          [type]: { ...prev[type], [index]: false },
        }));
      }
    }, 500),
    []
  );

  const fetchDoseSuggestions = useCallback(
    debounce(async (brandName, chemicalName, medicineForm, type, index) => {
      const requiresDoseFetch = [
        "tablets",
        "syrups",
        "drops",
        "creams",
        "lotions",
        "powder",
        "others",
        "injections",
        "respules",
        "sutureProcedureItems",
        "dressingItems",
        "fluids",
      ].includes(type);
      if (!requiresDoseFetch || !brandName || !chemicalName || !medicineForm) {
        return;
      }
      try {
        const response = await axios.get(
          `http://localhost:8000/get-dose-volume/?brand_name=${encodeURIComponent(
            brandName
          )}&chemical_name=${encodeURIComponent(
            chemicalName
          )}&medicine_form=${encodeURIComponent(medicineForm)}`
        );
        const suggestions = response.data.suggestions;
        setDoseSuggestions((prev) => ({
          ...prev,
          [type]: { ...prev[type], [index]: suggestions },
        }));
        if (!doseManuallyEntered?.[type]?.[index]) {
          setShowDoseSuggestions((prev) => ({
            ...prev,
            [type]: { ...prev[type], [index]: suggestions.length > 0 },
          }));
        } else {
          setShowDoseSuggestions((prev) => ({
            ...prev,
            [type]: { ...prev[type], [index]: false },
          }));
        }
      } catch (error) {}
    }, 500),
    [doseManuallyEntered]
  );

  const fetchQtySuggestions = useCallback(
    debounce(async (chemicalName, brandName, expiryDate, type, index) => {
      if (!chemicalName || !brandName || !expiryDate) {
        return;
      }
      try {
        const response = await axios.get(
          `http://localhost:8000/get-quantity-suggestions/?chemical_name=${encodeURIComponent(
            chemicalName
          )}&brand_name=${encodeURIComponent(
            brandName
          )}&expiry_date=${encodeURIComponent(expiryDate)}`
        );
        setQtySuggestions((prev) => ({
          ...prev,
          [type]: { ...prev[type], [index]: response.data.suggestions },
        }));
        setShowQtySuggestions((prev) => ({
          ...prev,
          [type]: {
            ...prev[type],
            [index]: response.data.suggestions.length > 0,
          },
        }));
      } catch (error) {}
    }, 500),
    []
  );

  const fetchExpiryDateSuggestions = useCallback(
    debounce(async (chemicalName, brandName, doseVolume, type, index) => {
      if (!chemicalName || !brandName || !doseVolume) {
        return;
      }
      try {
        const response = await axios.get(
          `http://localhost:8000/get-expiry-dates/?chemical_name=${encodeURIComponent(
            chemicalName
          )}&brand_name=${encodeURIComponent(
            brandName
          )}&dose_volume=${encodeURIComponent(doseVolume)}`
        );
        setExpiryDateSuggestions((prev) => ({
          ...prev,
          [type]: { ...prev[type], [index]: response.data.suggestions },
        }));
        setShowExpiryDateSuggestions((prev) => ({
          ...prev,
          [type]: {
            ...prev[type],
            [index]: response.data.suggestions.length > 0,
          },
        }));
      } catch (error) {}
    }, 500),
    []
  );

  const fetchDoctorSuggestions = useCallback(
    debounce(async (searchTerm) => {
      if (searchTerm.length < 2) {
        setDoctorSuggestions([]);
        setShowDoctorSuggestions(false);
        return;
      }
      try {
        const response = await axios.get(
          `http://localhost:8000/get-doctor-names/?name=${encodeURIComponent(
            searchTerm
          )}`
        );
        setDoctorSuggestions(response.data.suggestions || []);
        setShowDoctorSuggestions(
          response.data.suggestions &&
            response.data.suggestions.length > 0
        );
      } catch (error) {
        console.error("Error fetching doctor suggestions:", error);
        setDoctorSuggestions([]);
        setShowDoctorSuggestions(false);
      }
    }, 500),
    []
  );

  const updateRowState = (type, index, field, value) => {
    const getUpdater = (setter) => (prevState) =>
      prevState.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      );
    const typeMap = {
      tablets: setTablets,
      injections: setInjections,
      syrups: setSyrups,
      drops: setDrops,
      creams: setCreams,
      respules: setRespules,
      lotions: setLotions,
      fluids: setFluids,
      powder: setPowder,
      sutureProcedureItems: setSutureProcedureItems,
      dressingItems: setDressingItems,
      others: setOthers,
    };
    if (typeMap[type]) typeMap[type](getUpdater(typeMap[type]));
    else console.warn(`Attempted to update state for unknown type: ${type}`);
  };

  const handleInputChange = (e, type, index, field) => {
    
    
    if (type === "nurseNotes") {
      setNurseNotes(e?.target?.value ?? "");
      return;
    }
    if (type === "consultedDoctor") {
      if (!isNurseWithOverride) return;
      const value = e?.target?.value ?? "";
      setConsultedDoctor(value);
      if (value.length >= 2) {
        fetchDoctorSuggestions(value);
      } else {
        setShowDoctorSuggestions(false);
        setDoctorSuggestions([]);
      }
      return;
    }
    
    const isPharmacyField = ["issuedIn", "issuedOut", "prescriptionOut"].includes(
      field
    );
    const isMedicineType = Object.keys(medicineForms).includes(type);
    if (!isMedicineType) return;
    
    if (isPharmacyField && !isPharmacy) return;
    

    let value =
      field === "timing" ? e : e && e.target ? e.target.value : e;

    if (field === "qty" && (isDoctor || isNurseWithOverride)) {
      setQtyManuallyEntered((prev) => ({
        ...prev,
        [type]: { ...prev[type], [index]: true },
      }));
      setShowQtySuggestions((prev) => ({
        ...prev,
        [type]: { ...prev[type], [index]: false },
      }));
    }
    if (field === "doseVolume" && (isDoctor || isNurseWithOverride)) {
      setDoseManuallyEntered((prev) => ({
        ...prev,
        [type]: { ...prev[type], [index]: true },
      }));
      setShowDoseSuggestions((prev) => ({
        ...prev,
        [type]: { ...prev[type], [index]: false },
      }));
    }

    console.log(
      `Updating ${type} row ${index}, field ${field} with value:`,
      value
    );

    updateRowState(type, index, field, value);
    
    if (isDoctor || isNurseWithOverride) {
      setTimeout(() => {
        const currentStateMap = {
          tablets,
          injections,
          syrups,
          drops,
          creams,
          respules,
          lotions,
          fluids,
          powder,
          sutureProcedureItems,
          dressingItems,
          others,
        };
        const currentItem = currentStateMap[type]?.[index];
        if (!currentItem) return;

        const medicineFormValue = medicineForms[type];
        const { chemicalName, brandName, doseVolume, expiryDate } =
          currentItem;
        const standardSuggestionTypes = [
          "tablets",
          "syrups",
          "drops",
          "creams",
          "lotions",
          "powder",
          "others",
          "injections",
          "respules",
          "fluids",
          "sutureProcedureItems",
          "dressingItems",
          "others",
        ];

        if (standardSuggestionTypes.includes(type)) {
            if (field === "chemicalName") {
            fetchChemicalSuggestions(
              value,
              medicineFormValue,
              type,
              index
            );
            fetchBrandSuggestions(
              value,
              medicineFormValue,
              type,
              index
            );
            if (brandName)
              fetchDoseSuggestions(
                brandName,
                value,
                medicineFormValue,
                type,
                index
              );
            setDoseManuallyEntered((prev) => ({
              ...prev,
              [type]: { ...prev[type], [index]: false },
            }));
          } else if (field === "brandName") {
            // if(type == "sutureProcedureItems"){fetchBrandSuggestions(
            //   None,
            //   medicineFormValue,
            //   type,
            //   index
            // );}
            fetchBrandSuggestions(
              chemicalName,
              medicineFormValue,
              type,
              index
            );
            if (chemicalName)
              fetchDoseSuggestions(
                value,
                chemicalName,
                medicineFormValue,
                type,
                index
              );
            setDoseManuallyEntered((prev) => ({
              ...prev,
              [type]: { ...prev[type], [index]: false },
            }));
          } else if (field !== "doseVolume") {
            if (chemicalName && brandName)
              fetchDoseSuggestions(
                brandName,
                chemicalName,
                medicineFormValue,
                type,
                index
              );
          }

          if (["chemicalName", "brandName", "doseVolume"].includes(field)) {
            fetchExpiryDateSuggestions(
              chemicalName,
              brandName,
              doseVolume,
              type,
              index
            );
          }
          if (["chemicalName", "brandName", "expiryDate"].includes(field)) {
            fetchQtySuggestions(
              chemicalName,
              brandName,
              expiryDate,
              type,
              index
            );
          }
        }
      }, 0);
    }
  };

  const removeRow = (type, index) => {
    if (!isDoctor && !isNurseWithOverride ) return;
    const setState = (setter) =>
      setter((prev) =>
        prev.length <= 1
          ? prev.map((item, i) =>
              i === index ? getDefaultRow(type) : item
            )
          : prev.filter((_, i) => i !== index)
      );
    const typeMap = {
      tablets: setTablets,
      injections: setInjections,
      syrups: setSyrups,
      drops: setDrops,
      creams: setCreams,
      respules: setRespules,
      lotions: setLotions,
      fluids: setFluids,
      powder: setPowder,
      sutureProcedureItems: setSutureProcedureItems,
      dressingItems: setDressingItems,
      others: setOthers,
    };
    if (typeMap[type]) setState(typeMap[type]);
    else console.warn("Attempted to remove row for unknown type:", type);
  };

  const getCurrentItemState = (type, index) => {
    const stateMap = {
      tablets,
      injections,
      syrups,
      drops,
      creams,
      respules,
      lotions,
      fluids,
      powder,
      sutureProcedureItems,
      dressingItems,
      others,
    };
    return stateMap[type]?.[index];
  };

  const handleSuggestionClick = (suggestion, type, index, field) => {
    if (!isDoctor && !isNurseWithOverride) return;
    updateRowState(type, index, field, suggestion);
    setDoseManuallyEntered((prev) => ({
      ...prev,
      [type]: { ...prev[type], [index]: false },
    }));
    setQtyManuallyEntered((prev) => ({
      ...prev,
      [type]: { ...prev[type], [index]: false },
    }));

    const medicineFormValue = medicineForms[type];
    if (!medicineFormValue) return;

    setTimeout(() => {
      const updatedItem = getCurrentItemState(type, index);
      if (!updatedItem) return;
      const { chemicalName, brandName, expiryDate } = updatedItem;
      const standardSuggestionTypes = [
        "tablets",
        "syrups",
        "drops",
        "creams",
        "lotions",
        "powder",
        "others",
        "injections",
        "respules",
        "sutureProcedureItems",
        "dressingItems",
        "fluids",
      ];

      if (standardSuggestionTypes.includes(type)) {
        if (field === "brandName" && chemicalName) {
          fetchDoseSuggestions(
            suggestion,
            chemicalName,
            medicineFormValue,
            type,
            index
          );
        } else if (field === "chemicalName") {
          fetchBrandSuggestions(
            suggestion,
            medicineFormValue,
            type,
            index
          );
          if (brandName)
            fetchDoseSuggestions(
              brandName,
              suggestion,
              medicineFormValue,
              type,
              index
            );
        }
        if (["chemicalName", "brandName", "expiryDate"].includes(field)) {
          fetchQtySuggestions(
            chemicalName,
            brandName,
            expiryDate,
            type,
            index
          );
        }
      }
      const hideMap = {
        brandName: setShowBrandSuggestions,
        chemicalName: setShowChemicalSuggestions,
      };
      if (hideMap[field]) {
        hideMap[field]((prev) => ({
          ...prev,
          [type]: { ...prev[type], [index]: false },
        }));
      }
    }, 150);
  };

  const handleDoseSuggestionClick = (suggestion, type, index) => {
   
    if (!isDoctor && !isNurseWithOverride) return;
    setDoseManuallyEntered((prev) => ({
      ...prev,
      [type]: { ...prev[type], [index]: false },
    }));
    updateRowState(type, index, "doseVolume", suggestion);
    setShowDoseSuggestions((prev) => ({
      ...prev,
      [type]: { ...prev[type], [index]: false },
    }));
  };

  const handleQtySuggestionClick = (suggestion, type, index) => {
    if (!isDoctor && !isNurseWithOverride) return;
    setQtyManuallyEntered((prev) => ({
      ...prev,
      [type]: { ...prev[type], [index]: false },
    }));
    updateRowState(type, index, "qty", suggestion);
    setShowQtySuggestions((prev) => ({
      ...prev,
      [type]: { ...prev[type], [index]: false },
    }));
  };

  const handleExpiryDateSuggestionClick = (suggestion, type, index) => {
    if (!isDoctor && !isNurseWithOverride) return;
    updateRowState(type, index, "expiryDate", suggestion);
    const updatedItem = getCurrentItemState(type, index);
    if (updatedItem)
      fetchQtySuggestions(
        updatedItem.chemicalName,
        updatedItem.brandName,
        suggestion,
        type,
        index
      );
    setShowExpiryDateSuggestions((prev) => ({
      ...prev,
      [type]: { ...prev[type], [index]: false },
    }));
  };

  const handleDoctorSuggestionClick = (doctorName) => {
    setConsultedDoctor(doctorName);
    setShowDoctorSuggestions(false);
  };

  const renderChemicalSuggestions = (type, index) => {
    const suggestions = chemicalSuggestions?.[type]?.[index] || [];
    const show = showChemicalSuggestions?.[type]?.[index] || false;
    if ((isDoctor || isNurseWithOverride) && show && suggestions.length > 0) {
      return (
        <div className="absolute z-20 bg-white border border-gray-300 rounded-md shadow-lg mt-1 w-full max-h-48 overflow-y-auto">
          {suggestions.map((suggestion, i) => (
            <div
              key={`${type}-${index}-chem-sugg-${i}`}
              className="px-4 py-2 hover:bg-blue-100 cursor-pointer text-sm"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSuggestionClick(suggestion, type, index, "chemicalName");
              }}
            >
              {suggestion}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderBrandSuggestions = (type, index) => {
    const hasBrandSuggestions = [
      "tablets",
      "syrups",
      "drops",
      "creams",
      "lotions",
      "powder",
      "others",
      "injections",
      "respules",
      "sutureProcedureItems",
      "dressingItems",
      "fluids",
    ].includes(type);
    if (!hasBrandSuggestions) return null;

    const suggestions = brandSuggestions?.[type]?.[index] || [];
    const show = showBrandSuggestions?.[type]?.[index] || false;

    if ((isDoctor || isNurseWithOverride) && show && suggestions.length > 0) {
      return (
        <div className="absolute z-20 bg-white border border-gray-300 rounded-md shadow-lg mt-1 w-full max-h-48 overflow-y-auto">
          {suggestions.map((suggestion, i) => (
            <div
              key={`${type}-${index}-brand-sugg-${i}`}
              className="px-4 py-2 hover:bg-blue-100 cursor-pointer text-sm"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSuggestionClick(suggestion, type, index, "brandName");
              }}
            >
              {suggestion}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderDoseVolumeSuggestions = (type, index) => {
    const requiresDose = [
      "tablets",
      "syrups",
      "drops",
      "creams",
      "lotions",
      "powder",
      "others",
      "injections",
      "respules",
      "sutureProcedureItems",
      "dressingItems",
      "fluids",
    ].includes(type);
    if (!requiresDose) return null;
    const suggestions = doseSuggestions?.[type]?.[index] || [];
    const show = showDoseSuggestions?.[type]?.[index] || false;
    if (
      (isDoctor || isNurseWithOverride) &&
      show &&
      suggestions.length > 0 &&
      !doseManuallyEntered?.[type]?.[index]
    ) {
      return (
        <div className="absolute z-20 bg-white border border-gray-300 rounded-md shadow-lg mt-1 w-full max-h-48 overflow-y-auto">
          {suggestions.map((suggestion, i) => (
            <div
              key={`${type}-${index}-dose-sugg-${i}`}
              className="px-4 py-2 hover:bg-blue-100 cursor-pointer text-sm"
              onMouseDown={(e) => {
                e.preventDefault();
                handleDoseSuggestionClick(suggestion, type, index);
              }}
            >
              {suggestion}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderQtySuggestions = (type, index) => {
    const suggestions = qtySuggestions?.[type]?.[index] || [];
    const show = showQtySuggestions?.[type]?.[index] || false;
    if (
      (isDoctor || isNurseWithOverride) &&
      show &&
      suggestions.length > 0 &&
      !qtyManuallyEntered?.[type]?.[index]
    ) {
      return (
        <div className="absolute z-20 bg-white border border-gray-300 rounded-md shadow-lg mt-1 w-full max-h-48 overflow-y-auto">
          {suggestions.map((suggestion, i) => (
            <div
              key={`${type}-${index}-qty-sugg-${i}`}
              className="px-4 py-2 hover:bg-blue-100 cursor-pointer text-sm"
              onMouseDown={(e) => {
                e.preventDefault();
                handleQtySuggestionClick(suggestion, type, index);
              }}
            >
              {suggestion}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderExpiryDateSuggestions = (type, index) => {
    const suggestions = expiryDateSuggestions?.[type]?.[index] || [];
    const show = showExpiryDateSuggestions?.[type]?.[index] || false;
    if ((isDoctor || isNurseWithOverride) && show && suggestions.length > 0) {
      return (
        <div className="absolute z-20 bg-white border border-gray-300 rounded-md shadow-lg mt-1 w-full max-h-48 overflow-y-auto">
          {suggestions.map((suggestion, i) => (
            <div
              key={`${type}-${index}-expiry-sugg-${i}`}
              className="px-4 py-2 hover:bg-blue-100 cursor-pointer text-sm"
              onMouseDown={(e) => {
                e.preventDefault();
                handleExpiryDateSuggestionClick(suggestion, type, index);
              }}
            >
              {suggestion}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderInputFields = (type, items, index) => {
    const item = items[index];
    if (!item) return null;
    const inputBaseClass =
      "px-3 py-1.5 w-full border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 text-sm bg-white focus:ring-blue-500";
    const selectBaseClass =
      "w-full border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 text-sm bg-white focus:ring-blue-500";
    const nativeSelectBaseClass =
      "px-3 py-1.5 w-full border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 text-sm bg-white focus:ring-blue-500 appearance-none";
    const textareaBaseClass =
      "px-3 py-1.5 w-full border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 text-sm bg-white focus:ring-blue-500 resize-none";
    const disabledClass = "bg-gray-100 cursor-not-allowed opacity-70";
    const pharmacyEnabledClass = "bg-yellow-50";

    // UPDATED PERMISSION LOGIC
    const isSutureDressingOthers = [
      "sutureProcedureItems",
      "dressingItems",
      "others",
    ].includes(type);

    const isFieldDisabledForCurrentUser = isSutureDressingOthers
      ? !(isNurse || isDoctor  )
      : !isDoctor && isNurse || isPharmacy;

    const isPharmacyFieldDisabledForCurrentUser = !isPharmacy;
    const fieldDisabledClass = isFieldDisabledForCurrentUser
      ? disabledClass
      : "";
    const pharmacyFieldDisabledClass = isPharmacyFieldDisabledForCurrentUser
      ? disabledClass
      : "";

    const reactSelectStyles = {
      control: (provided, state) => ({
        ...provided,
        minHeight: "38px",
        height: "auto",
        borderColor: state.isFocused ? "#3b82f6" : "#d1d5db",
        boxShadow: state.isFocused ? "0 0 0 1px #3b82f6" : provided.boxShadow,
        borderRadius: "0.375rem",
        fontSize: "0.875rem",
        backgroundColor: isFieldDisabledForCurrentUser ? "#f3f4f6" : "white",
        opacity: isFieldDisabledForCurrentUser ? 0.7 : 1,
        cursor: isFieldDisabledForCurrentUser ? "not-allowed" : "default",
        "&:hover": {
          borderColor: state.isFocused ? "#3b82f6" : "#9ca3af",
        },
      }),
      valueContainer: (provided) => ({
        ...provided,
        padding: "1px 6px",
        alignItems: "center",
      }),
      input: (provided) => ({
        ...provided,
        margin: "0px",
        padding: "0px",
        alignSelf: "stretch",
      }),
      indicatorSeparator: () => ({ display: "none" }),
      indicatorsContainer: (provided) => ({
        ...provided,
        alignSelf: "stretch",
      }),
      menu: (provided) => ({
        ...provided,
        fontSize: "0.875rem",
        zIndex: 30,
      }),
      multiValue: (provided) => ({
        ...provided,
        backgroundColor: "#e0e7ff",
        margin: "2px",
        alignItems: "center",
      }),
      multiValueLabel: (provided) => ({
        ...provided,
        padding: "2px",
        paddingLeft: "4px",
        whiteSpace: "normal",
      }),
      multiValueRemove: (provided) => ({
        ...provided,
        "&:hover": { backgroundColor: "#be123c", color: "white" },
        alignSelf: "center",
      }),
      placeholder: (provided) => ({
        ...provided,
        color: "#9ca3af",
      }),
    };

    const renderChemicalInput = () => (
      <div className="relative">
        <input
          type="text"
          placeholder="Chemical Name"
          value={item.chemicalName || ""}
          onChange={(e) =>
            handleInputChange(e, type, index, "chemicalName")
          }
          onFocus={() => {
            if (
              item.chemicalName?.length >= 2 &&
              (isDoctor || isNurseWithOverride)
            ) {
              fetchChemicalSuggestions(
                item.chemicalName,
                medicineForms[type],
                type,
                index
              );
            }
          }}
          onBlur={() =>
            setTimeout(
              () =>
                setShowChemicalSuggestions((prev) => ({
                  ...prev,
                  [type]: { ...prev[type], [index]: false },
                })),
              200
            )
          }
          className={`${inputBaseClass} ${fieldDisabledClass}`}
          disabled={isFieldDisabledForCurrentUser}
          autoComplete="off"
        />
        {renderChemicalSuggestions(type, index)}
      </div>
    );

    const renderBrandInput = () => {
      const showField = [
        "tablets",
        "syrups",
        "drops",
        "creams",
        "lotions",
        "powder",
        "others",
        "injections",
        "respules",
        "dressingItems",
        "sutureProcedureItems",
        "fluids",
      ].includes(type);
      if (!showField) return null;
      return (
        <div className="relative">
          <input
            type="text"
            placeholder="Brand Name"
            value={item.brandName || ""}
            onChange={(e) =>
              handleInputChange(e, type, index, "brandName")
            }
            onFocus={() => {
              if (item.chemicalName && (isDoctor || isNurseWithOverride)) {
                fetchBrandSuggestions(
                  item.chemicalName,
                  medicineForms[type],
                  type,
                  index
                );
              }
            }}
            onBlur={() =>
              setTimeout(
                () =>
                  setShowBrandSuggestions((prev) => ({
                    ...prev,
                    [type]: { ...prev[type], [index]: false },
                  })),
                200
              )
            }
            className={`${inputBaseClass} ${fieldDisabledClass}`}
            disabled={isFieldDisabledForCurrentUser}
            autoComplete="off"
          />
          {renderBrandSuggestions(type, index)}
        </div>
      );
    };

    const renderDoseInput = () => {
      const showField = [
        "tablets",
        "syrups",
        "drops",
        "creams",
        "lotions",
        "powder",
        "others",
        "injections",
        "respules",
        "dressingItems",
        "sutureProcedureItems",
        "fluids",
      ].includes(type);
      if (!showField) return null;
      return (
        <div className="relative">
          <input
            type="text"
            placeholder="Dose/Vol"
            value={item.doseVolume || ""}
            onChange={(e) =>
              handleInputChange(e, type, index, "doseVolume")
            }
            onFocus={() => {
              if (
                item.brandName &&
                item.chemicalName &&
                (isDoctor || isNurseWithOverride)
              ) {
                fetchDoseSuggestions(
                  item.brandName,
                  item.chemicalName,
                  medicineForms[type],
                  type,
                  index
                );
              }
            }}
            onBlur={() =>
              setTimeout(
                () =>
                  setShowDoseSuggestions((prev) => ({
                    ...prev,
                    [type]: { ...prev[type], [index]: false },
                  })),
                200
              )
            }
            className={`${inputBaseClass} ${fieldDisabledClass}`}
            disabled={isFieldDisabledForCurrentUser}
            autoComplete="off"
          />
          {renderDoseVolumeSuggestions(type, index)}
        </div>
      );
    };

    const renderQtyInput = () => (
      <div className="relative">
        <input
          type="text"
          placeholder="Qty"
          value={item.qty || ""}
          onChange={(e) => handleInputChange(e, type, index, "qty")}
          onFocus={() => {
            if (
              item.chemicalName &&
              item.brandName &&
              item.expiryDate &&
              (isDoctor || isNurseWithOverride)
            ) {
              fetchQtySuggestions(
                item.chemicalName,
                item.brandName,
                item.expiryDate,
                type,
                index
              );
            }
          }}
          onBlur={() =>
            setTimeout(
              () =>
                setShowQtySuggestions((prev) => ({
                  ...prev,
                  [type]: { ...prev[type], [index]: false },
                })),
              200
            )
          }
          className={`${inputBaseClass} ${fieldDisabledClass}`}
          disabled={isFieldDisabledForCurrentUser}
          autoComplete="off"
        />
        {renderQtySuggestions(type, index)}
      </div>
    );

    const renderServingInput = () => {
      const showField = ["tablets", "syrups", "drops", "lotions"].includes(
        type
      );
      if (!showField) return null;
      let placeholder = "Serving";
      if (type === "tablets") placeholder = "(eg. 200mg)";
      else if (type === "syrups") placeholder = "(e.g., 5ml)";
      else if (type === "drops") placeholder = "(e.g., 1 drop)";
      else if (type === "lotions") placeholder = "Application";
      return (
        <input
          type="text"
          placeholder={placeholder}
          value={item.serving || ""}
          onChange={(e) =>
            handleInputChange(e, type, index, "serving")
          }
          className={`${inputBaseClass} ${fieldDisabledClass}`}
          disabled={isFieldDisabledForCurrentUser}
        />
      );
    };

    const renderTimingSelect = () => {
      const showField = ["tablets", "syrups", "drops", "creams", "powder"].includes(
        type
      );
      if (!showField) return null;
      return (
        <Select
          name="timing"
          isMulti
          options={timingOptions}
          value={item.timing || []}
          onChange={(selectedOptions) =>
            handleInputChange(selectedOptions, type, index, "timing")
          }
          className={`${selectBaseClass} ${fieldDisabledClass}`}
          styles={reactSelectStyles}
          isDisabled={isFieldDisabledForCurrentUser}
          placeholder="Timing"
          closeMenuOnSelect={false}
          isClearable={false}
        />
      );
    };

    const renderFoodSelect = () => {
      const showField = ["tablets", "syrups", "drops", "creams"].includes(
        type
      );
      if (!showField) return null;
      return (
        <div className="relative">
          <select
            value={item.food || ""}
            onChange={(e) =>
              handleInputChange(e, type, index, "food")
            }
            className={`${nativeSelectBaseClass} ${fieldDisabledClass}`}
            disabled={isFieldDisabledForCurrentUser}
          >
            <option value="">Food</option>
            {foodOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <svg
              className="fill-current h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
            >
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
            </svg>
          </div>
        </div>
      );
    };

    const renderDaysInput = () => {
      const showField = [
        "tablets",
        "syrups",
        "drops",
        "creams",
        "respules",
        "lotions",
        "powder",
      ].includes(type);
      if (!showField) return null;
      return (
        <input
          type="text"
          placeholder="Days"
          value={item.days || ""}
          onChange={(e) => handleInputChange(e, type, index, "days")}
          className={`${inputBaseClass} ${fieldDisabledClass}`}
          disabled={isFieldDisabledForCurrentUser}
        />
      );
    };

    const renderExpiryDateInput = () => (
      <div className="relative">
        <input
          type="text"
          placeholder="Expiry Date"
          value={item.expiryDate || ""}
          onChange={(e) =>
            handleInputChange(e, type, index, "expiryDate")
          }
          onFocus={() => {
            if (
              item.chemicalName &&
              item.brandName &&
              item.doseVolume &&
              (isDoctor || isNurseWithOverride)
            ) {
              fetchExpiryDateSuggestions(
                item.chemicalName,
                item.brandName,
                item.doseVolume,
                type,
                index
              );
            }
          }}
          onBlur={() =>
            setTimeout(
              () =>
                setShowExpiryDateSuggestions((prev) => ({
                  ...prev,
                  [type]: { ...prev[type], [index]: false },
                })),
              200
            )
          }
          className={`${inputBaseClass} ${fieldDisabledClass}`}
          disabled={isFieldDisabledForCurrentUser}
          autoComplete="off"
        />
        {renderExpiryDateSuggestions(type, index)}
      </div>
    );

    const renderPharmacyFields = () => (
      <>
        <textarea
          placeholder="Issued In"
          value={item.issuedIn || ""}
          onChange={(e) =>
            handleInputChange(e, type, index, "issuedIn")
          }
          className={`${textareaBaseClass} ${pharmacyFieldDisabledClass} ${
            isPharmacy ? pharmacyEnabledClass : ""
          }`}
          disabled={isPharmacyFieldDisabledForCurrentUser}
          rows="1"
          title="Pharmacy Use Only: Issued In Details"
        />
        <textarea
          placeholder="Issued Out"
          value={item.issuedOut || ""}
          onChange={(e) =>
            handleInputChange(e, type, index, "issuedOut")
          }
          className={`${textareaBaseClass} ${pharmacyFieldDisabledClass} ${
            isPharmacy ? pharmacyEnabledClass : ""
          }`}
          disabled={isPharmacyFieldDisabledForCurrentUser}
          rows="1"
          title="Pharmacy Use Only: Issued Out Details"
        />
        <textarea
          placeholder="Presc. Out"
          value={item.prescriptionOut || ""}
          onChange={(e) =>
            handleInputChange(e, type, index, "prescriptionOut")
          }
          className={`${textareaBaseClass} ${pharmacyFieldDisabledClass} ${
            isPharmacy ? pharmacyEnabledClass : ""
          }`}
          disabled={isPharmacyFieldDisabledForCurrentUser}
          rows="1"
          title="Pharmacy Use Only: Prescription Out Details"
        />
      </>
    );

    switch (type) {
      case "tablets":
      case "syrups":
      case "drops":
        return (
          <>
            {renderChemicalInput()}
            {renderBrandInput()}
            {renderDoseInput()}
            {renderExpiryDateInput()}
            {renderQtyInput()}
            {renderServingInput()}
            {renderTimingSelect()}
            {renderFoodSelect()}
            {renderDaysInput()}
            {renderPharmacyFields()}
          </>
        );
      case "creams":
      case "powder":
        return (
          <>
            {renderChemicalInput()}
            {renderBrandInput()}
            {renderDoseInput()}
            {renderExpiryDateInput()}
            {renderQtyInput()}
            {renderTimingSelect()}
            {type === "creams" && renderFoodSelect()}
            {renderDaysInput()}
            {renderPharmacyFields()}
          </>
        );
      case "injections":
      case "fluids":
      case "others":
      case "sutureProcedureItems":
      case "dressingItems":
        return (
          <>
            {renderChemicalInput()}
            {renderBrandInput()}
            {renderDoseInput()}
            {renderExpiryDateInput()}
            {renderQtyInput()}
            {renderPharmacyFields()}
          </>
        );
      case "respules":
        return (
          <>
            {renderChemicalInput()}
            {renderBrandInput()}
            {renderDoseInput()}
            {renderExpiryDateInput()}
            {renderQtyInput()}
            {renderDaysInput()}
            {renderPharmacyFields()}
          </>
        );
      case "lotions":
        return (
          <>
            {renderChemicalInput()}
            {renderBrandInput()}
            {renderDoseInput()}
            {renderExpiryDateInput()}
            {renderQtyInput()}
            {renderServingInput()}
            {renderDaysInput()}
            {renderPharmacyFields()}
          </>
        );
      // case "sutureProcedureItems":
      // case "dressingItems":
      //   return (
      //     <>
      //       <div className="relative">
      //         <input
      //           type="text"
      //           placeholder="Item Name"
      //           value={item.chemicalName || ""}
      //           onChange={(e) =>
      //             handleInputChange(e, type, index, "chemicalName")
      //           }
      //           className={`${inputBaseClass} ${fieldDisabledClass}`}
      //           disabled={isFieldDisabledForCurrentUser}
      //           autoComplete="off"
      //         />
      //       </div>
      //       {renderExpiryDateInput()}
      //       {renderQtyInput()}
      //       {renderPharmacyFields()}
      //     </>
      //   );
      default:
        return null;
    }
  };

  const filterEmptyRows = (items) => {
    if (!Array.isArray(items) || items.length === 0) return [];
    return items.filter(
      (item) =>
        item?.chemicalName?.trim() !== "" ||
        (item?.qty != null && String(item.qty).trim() !== "") ||
        item?.expiryDate?.trim() !== "" ||
        item?.issuedIn?.trim() !== "" ||
        item?.issuedOut?.trim() !== "" ||
        item?.prescriptionOut?.trim() !== ""
    );
  };

  const handleSubmit = async (mrdNo) => {
    try {
      
      if (mrdNo === "") {
        alert("Please submit the entries first to get MRD Number");
        return;
      }
      if (mrdNo === "" || mrdNo === undefined) {
        setError("MRD number is required");
        alert("Please ensure MRD number is available.");
        return;
      }

      const allMedicineTypes = {
        tablets,
        injections,
        syrups,
        drops,
        creams,
        respules,
        lotions,
        fluids,
        powder,
        suture_procedure: sutureProcedureItems,
        dressing: dressingItems,
        others,
      };
      const prescriptionData = {
        emp_no,
        name: data?.[0]?.name || "",
        aadhar,
        mrdNo,
        nurse_notes: nurseNotes,
        consulted_doctor:
          isDoctor || isNurseWithOverride
            ? consultedDoctor
            : existingPrescription?.consulted_doctor || "",
        submitted_by: localStorage.getItem("username") || "Unknown",
        issued_by: localStorage.getItem("username") || "Unknown",
        issued_status: condition ? 1 : 0,
      };
      
      const formatTimingForSubmit = (timingArray) =>
        Array.isArray(timingArray)
          ? timingArray.map((t) => t.value)
          : [];

      for (const key in allMedicineTypes) {
        const items = allMedicineTypes[key];
        prescriptionData[key] = filterEmptyRows(items).map((item) => ({
          ...item,
          timing: formatTimingForSubmit(item.timing),
        }));
      }

      const response = await axios.post(
        `http://localhost:8000/prescriptions/add/`,
        prescriptionData
      );
      if (response.status !== 201 && response.status !== 200)
        throw new Error(response.data.message || "Failed to save prescription");

      const allItemsForStock = Object.values(allMedicineTypes)
        .flat()
        .map((item) => ({
          ...item,
          type:
            Object.keys(medicineForms).find(
              (k) =>
                medicineForms[k] ===
                medicineForms[
                  Object.keys(allMedicineTypes).find(
                    (typeKey) =>
                      allMedicineTypes[typeKey] ===
                      Object.values(allMedicineTypes).find((arr) =>
                        arr.includes(item)
                      )
                  )
                ]
            ) || "Other",
        }));
      const issuedItemsForStock = filterEmptyRows(allItemsForStock).filter(
        (item) => item.issuedIn && parseInt(item.issuedIn) > 0
      );

      if (response.data) {
        alert("Prescription saved successfully!");
        if (onPrescriptionUpdate) onPrescriptionUpdate(issuedItemsForStock);
      }
    } catch (error) {
      console.error("Error saving prescription:", error);
      setError(
        error.response?.data?.error || "Error saving prescription"
      );
      alert(
        error.response?.data?.error || "Error saving prescription"
      );
    }
  };

  const handleGeneratePrescription = () => {
    if (!emp_no || !data?.[0]?.name) {
      alert("Cannot generate: Employee details missing.");
      return;
    }
    const allSections = {
      Tablets: tablets,
      Injections: injections,
      Syrups: syrups,
      Drops: drops,
      "Creams & Ointments": creams,
      Respules: respules,
      Lotions: lotions,
      Fluids: fluids,
      Powders: powder,
      "SutureAndProcedureItems": sutureProcedureItems,
      "DressingItems": dressingItems,
      Others: others,
    };
    const filteredSections = {};
    Object.entries(allSections).forEach(([title, items]) => {
      const filtered = filterEmptyRows(items);
      if (filtered.length > 0) filteredSections[title] = filtered;
    });

    if (
      Object.keys(filteredSections).length === 0 &&
      !nurseNotes.trim() &&
      (!isNurseWithOverride || !consultedDoctor.trim())
    ) {
      alert(
        "Cannot generate an empty prescription. Please add medication, notes, or consultation details."
      );
      return;
    }

    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const lineHeight = 7;
    const sectionSpacing = 10;
    let y = margin;

    const addText = (text, x, currentY, options = {}) => {
      const {
        isBold = false,
        isTitle = false,
        fontSize = 10,
        isCentered = false,
        maxWidth,
      } = options;
      const textString = String(text ?? "");
      const lines = maxWidth
        ? doc.splitTextToSize(textString, maxWidth)
        : [textString];
      const textHeight =
        lines.length * lineHeight * 0.8 +
        (isTitle ? lineHeight * 0.5 : 0);
      if (currentY + textHeight > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        currentY = margin;
        doc.setFontSize(8);
        doc.setFont(undefined, "italic");
        doc.text(
          `Prescription for ${data[0].name} (${emp_no}) - Page ${doc.internal.getNumberOfPages()}`,
          pageWidth - margin,
          margin / 2,
          { align: "right" }
        );
        doc.setFont(undefined, "normal");
        currentY += lineHeight / 2;
      }
      doc.setFontSize(fontSize);
      doc.setFont(undefined, isBold || isTitle ? "bold" : "normal");
      let textX = x;
      let textAlign = "left";
      if (isCentered) {
        textX = pageWidth / 2;
        textAlign = "center";
      }
      const textOptions = { align: textAlign };
      if (maxWidth) {
        doc.text(lines, textX, currentY, textOptions);
        currentY += lines.length * lineHeight * 0.8;
      } else {
        doc.text(textString, textX, currentY, textOptions);
        currentY += isTitle ? lineHeight * 1.5 : lineHeight;
      }
      return currentY;
    };

    y = addText("PRESCRIPTION", margin, y, {
      isTitle: true,
      fontSize: 16,
      isCentered: true,
    });
    y += lineHeight / 2;
    const patientBoxStartY = y;
    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    y = addText("Patient Information", margin, y);
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    y = addText(`Employee No: ${emp_no}`, margin + 5, y);
    y = addText(`Patient Name: ${data[0].name}`, margin + 5, y);
    y = addText(
      `Date: ${new Date().toLocaleDateString("en-GB")}`,
      margin + 5,
      y
    );
    const patientBoxEndY = y;
    doc.setDrawColor(150, 150, 150);
    doc.rect(
      margin - 2,
      patientBoxStartY - lineHeight * 0.8,
      pageWidth - (margin - 2) * 2,
      patientBoxEndY - patientBoxStartY + lineHeight * 0.5
    );
    y += sectionSpacing / 1.5;
    if (isNurseWithOverride && consultedDoctor.trim()) {
      const consultBoxStartY = y;
      doc.setFontSize(11);
      doc.setFont(undefined, "bold");
      y = addText("Consultation Details", margin, y);
      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      y = addText(`Consulted Doctor: ${consultedDoctor}`, margin + 5, y);
      const consultBoxEndY = y;
      doc.setDrawColor(150, 150, 150);
      doc.rect(
        margin - 2,
        consultBoxStartY - lineHeight * 0.8,
        pageWidth - (margin - 2) * 2,
        consultBoxEndY - consultBoxStartY + lineHeight * 0.5
      );
      y += sectionSpacing / 1.5;
    }
    doc.setFontSize(24);
    doc.setFont(undefined, "bold");
    y = addText("Rx", margin, y);
    y += lineHeight / 2;

    const formatTimingForPDF = (timing) =>
      Array.isArray(timing)
        ? timing.map((t) => t.label || t.value).join(", ") || "N/A"
        : "N/A";

    for (const [title, items] of Object.entries(filteredSections)) {
      y = addText(title, margin, y, { isBold: true, fontSize: 12 });
      items.forEach((item, index) => {
        const estimatedItemHeight = lineHeight * 3;
        if (
          y + estimatedItemHeight >
          doc.internal.pageSize.getHeight() - margin
        ) {
          doc.addPage();
          y = margin;
          doc.setFontSize(8);
          doc.setFont(undefined, "italic");
          doc.text(
            `Prescription for ${data[0].name} (${emp_no}) - Page ${doc.internal.getNumberOfPages()}`,
            pageWidth - margin,
            margin / 2,
            { align: "right" }
          );
          doc.setFont(undefined, "normal");
          y += lineHeight / 2;
          y = addText(title + " (cont.)", margin, y, {
            isBold: true,
            fontSize: 12,
          });
        }
        let mainLine = `${index + 1}. ${
          item.chemicalName || "N/A"
        }`;
        if (item.brandName) mainLine += ` (${item.brandName})`;
        if (item.doseVolume) mainLine += ` - ${item.doseVolume}`;
        y = addText(mainLine, margin + 5, y);
        let qtyServingLineParts = [];
        if (item.qty) qtyServingLineParts.push(`Qty: ${item.qty}`);
        if (item.serving)
          qtyServingLineParts.push(`Serving: ${item.serving}`);
        if (qtyServingLineParts.length > 0)
          y = addText(
            `   ${qtyServingLineParts.join(" | ")}`,
            margin + 10,
            y,
            { fontSize: 9 }
          );
        let sigLineParts = [];
        const formattedTiming = formatTimingForPDF(item.timing);
        if (formattedTiming && formattedTiming !== "N/A")
          sigLineParts.push(`Timing: ${formattedTiming}`);
        if (item.food) sigLineParts.push(`Food: ${item.food}`);
        if (item.days) sigLineParts.push(`Days: ${item.days}`);
        if (sigLineParts.length > 0)
          y = addText(
            `   Sig: ${sigLineParts.join(" | ")}`,
            margin + 10,
            y,
            { fontSize: 9 }
          );
        if (item.expiryDate)
          y = addText(
            `   Expiry: ${item.expiryDate}`,
            margin + 10,
            y,
            { fontSize: 9 }
          );
        y += lineHeight * 0.4;
      });
      y += sectionSpacing / 1.5;
    }
    doc.setDrawColor(150, 150, 150);
    doc.line(
      margin,
      y - lineHeight / 2,
      pageWidth - margin,
      y - lineHeight / 2
    );
    y += lineHeight / 2;
    if (nurseNotes && nurseNotes.trim()) {
      y = addText("Nurse Notes:", margin, y, {
        isBold: true,
        fontSize: 11,
      });
      y = addText(nurseNotes, margin, y, {
        fontSize: 10,
        maxWidth: pageWidth - margin * 2,
      });
      y += sectionSpacing / 2;
    }
    const footerStartY = y;
    const footerHeightEstimate = lineHeight * 4;
    if (
      footerStartY + footerHeightEstimate >
      doc.internal.pageSize.getHeight() - margin
    ) {
      doc.addPage();
      y = margin;
      doc.setFontSize(8);
      doc.setFont(undefined, "italic");
      doc.text(
        `Prescription for ${data[0].name} (${emp_no}) - Page ${doc.internal.getNumberOfPages()}`,
        pageWidth - margin,
        margin / 2,
        { align: "right" }
      );
      doc.setFont(undefined, "normal");
      y += lineHeight;
    } else {
      y = footerStartY;
    }
    const signatureX = pageWidth / 2 + 10;
    const signatureY = y + lineHeight * 1.5;
    doc.setDrawColor(0, 0, 0);
    doc.line(signatureX, signatureY, pageWidth - margin, signatureY);
    addText("Doctor's Signature", signatureX, signatureY + lineHeight / 2, {
      fontSize: 9,
    });
    const filename = `prescription-${emp_no}-${new Date()
      .toISOString()
      .split("T")[0]}.pdf`;
    doc.save(filename);
  };

  const ActionButton = ({
    onClick,
    disabled = false,
    children,
    color = "blue",
    title = "",
    className = "",
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`bg-${color}-600 hover:bg-${color}-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out text-sm focus:outline-none focus:ring-2 focus:ring-${color}-500 focus:ring-opacity-50 ${
        disabled ? "cursor-not-allowed opacity-50" : ""
      } ${className}`}
    >
      {children}
    </button>
  );

  const RemoveButton = ({ onClick, disabled = false, type, index }) => (
    <button
      type="button"
      onClick={() => onClick(type, index)}
      disabled={disabled}
      title={`Remove this row`}
      className={`bg-red-500 hover:bg-red-700 text-white font-bold p-1 rounded w-8 h-8 flex items-center justify-center transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 ${
        disabled ? "cursor-not-allowed opacity-50" : ""
      }`}
    >
      <FaTrash size={12} />
    </button>
  );

  const toggleSection = (section) =>
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  const isSectionExpanded = (section) => expandedSections.includes(section);

  const gridTemplateColumns = {
    tablets:
      "repeat(4, minmax(140px, 1.5fr)) repeat(2, minmax(80px, 0.8fr)) repeat(3, minmax(100px, 1fr)) minmax(100px, 1.2fr) repeat(3, minmax(120px, 1fr)) minmax(40px, auto)",
    syrups:
      "repeat(4, minmax(140px, 1.5fr)) repeat(2, minmax(80px, 0.8fr)) repeat(3, minmax(100px, 1fr)) minmax(100px, 1.2fr) repeat(3, minmax(120px, 1fr)) minmax(40px, auto)",
    drops:
      "repeat(4, minmax(140px, 1.5fr)) repeat(2, minmax(80px, 0.8fr)) repeat(3, minmax(100px, 1fr)) minmax(100px, 1.2fr) repeat(3, minmax(120px, 1fr)) minmax(40px, auto)",
    creams:
      "repeat(4, minmax(140px, 1.5fr)) minmax(80px, 0.8fr) repeat(3, minmax(100px, 1fr)) minmax(100px, 1.2fr) repeat(3, minmax(120px, 1fr)) minmax(40px, auto)",
    powder:
      "repeat(4, minmax(140px, 1.5fr)) minmax(80px, 0.8fr) repeat(2, minmax(100px, 1fr)) minmax(100px, 1.2fr) repeat(3, minmax(120px, 1fr)) minmax(40px, auto)",
    injections:
      "repeat(4, minmax(140px, 1.5fr)) minmax(80px, 0.8fr) minmax(100px, 1.2fr) repeat(3, minmax(120px, 1fr)) minmax(40px, auto)",
    fluids:
      "repeat(4, minmax(140px, 1.5fr)) minmax(80px, 0.8fr) minmax(100px, 1.2fr) repeat(3, minmax(120px, 1fr)) minmax(40px, auto)",
    others:
      "repeat(4, minmax(140px, 1.5fr)) minmax(80px, 0.8fr) minmax(100px, 1.2fr) repeat(3, minmax(120px, 1fr)) minmax(40px, auto)",
    respules:
      "repeat(4, minmax(140px, 1.5fr)) minmax(80px, 0.8fr) minmax(100px, 1fr) minmax(100px, 1.2fr) repeat(3, minmax(120px, 1fr)) minmax(40px, auto)",
    lotions:
      "repeat(4, minmax(140px, 1.5fr)) repeat(2, minmax(80px, 0.8fr)) minmax(100px, 1fr) minmax(100px, 1.2fr) repeat(3, minmax(120px, 1fr)) minmax(40px, auto)",
    sutureProcedureItems:
      "repeat(4, minmax(140px, 1.5fr)) minmax(80px, 0.8fr) minmax(100px, 1.2fr) repeat(3, minmax(120px, 1fr)) minmax(40px, auto)",
    dressingItems:
      "repeat(4, minmax(140px, 1.5fr)) minmax(80px, 0.8fr) minmax(100px, 1.2fr) repeat(3, minmax(120px, 1fr)) minmax(40px, auto)",
  };

  const renderSection = (
    type,
    title,
    color,
    children,
    addItemButtonText,
    indicator
    
  ) => {
    
    const isExpanded = isSectionExpanded(type);
    const headerColor = color || "gray";
    const buttonColor = "blue";
    const getHeaders = () => {
      const baseHeaders = [
        {
          title: "Chemical Name",
          gridSpan: "span 1",
          tooltip: "Generic name",
        },
      ];
      const brandDoseHeaders = [
        {
          title: "Brand Name",
          gridSpan: "span 1",
          tooltip: "Brand name",
        },
        { title: "Dose/Vol", gridSpan: "span 1", tooltip: "Dosage" },
      ];
      const expiryHeader = {
        title: "Expiry Date",
        gridSpan: "span 1",
        tooltip: "Expiration date",
      };
      const qtyHeader = {
        title: "Qty",
        gridSpan: "span 1",
        tooltip: "Quantity",
      };
      const servingHeader = {
        title: "Serving",
        gridSpan: "span 1",
        tooltip: "Dosage per administration",
      };
      const timingHeader = {
        title: "Timing",
        gridSpan: "span 1",
        tooltip: "When to take",
      };
      const foodHeader = {
        title: "Food",
        gridSpan: "span 1",
        tooltip: "Relation to food",
      };
      const daysHeader = {
        title: "Days",
        gridSpan: "span 1",
        tooltip: "Duration",
      };
      const pharmacyHeaders = [
        {
          title: "Issued In",
          gridSpan: "span 1",
          tooltip: "Pharmacy: Arrival",
        },
        {
          title: "Issued Out",
          gridSpan: "span 1",
          tooltip: "Pharmacy: Dispensing",
        },
        {
          title: "Presc. Out",
          gridSpan: "span 1",
          tooltip: "Pharmacy: Status",
        },
      ];
      const actionHeader = {
        title: "Action",
        gridSpan: "span 1",
        tooltip: "Remove row",
      };
      let headers = [];
      switch (type) {
        case "tablets":
        case "syrups":
        case "drops":
          headers = [
            ...baseHeaders,
            ...brandDoseHeaders,
            expiryHeader,
            qtyHeader,
            servingHeader,
            timingHeader,
            foodHeader,
            daysHeader,
            ...pharmacyHeaders,
            actionHeader,
          ];
          break;
        case "creams":
          headers = [
            ...baseHeaders,
            ...brandDoseHeaders,
            expiryHeader,
            qtyHeader,
            timingHeader,
            foodHeader,
            daysHeader,
            ...pharmacyHeaders,
            actionHeader,
          ];
          break;
        case "powder":
          headers = [
            ...baseHeaders,
            ...brandDoseHeaders,
            expiryHeader,
            qtyHeader,
            timingHeader,
            daysHeader,
            ...pharmacyHeaders,
            actionHeader,
          ];
          break;
        case "injections":
        case "fluids":
        case "others":
        case "sutureProcedureItems":
        case "dressingItems":
          headers = [
            ...baseHeaders,
            ...brandDoseHeaders,
            expiryHeader,
            qtyHeader,
            ...pharmacyHeaders,
            actionHeader,
          ];
          break;
        case "respules":
          headers = [
            ...baseHeaders,
            ...brandDoseHeaders,
            expiryHeader,
            qtyHeader,
            daysHeader,
            ...pharmacyHeaders,
            actionHeader,
          ];
          break;
        case "lotions":
          headers = [
            ...baseHeaders,
            ...brandDoseHeaders,
            expiryHeader,
            qtyHeader,
            servingHeader,
            daysHeader,
            ...pharmacyHeaders,
            actionHeader,
          ];
          break;
        // case "sutureProcedureItems":
        // case "dressingItems":
        //   headers = [
        //     {
        //       title: "Item Name",
        //       gridSpan: "span 1",
        //       tooltip: "Item name",
        //     },
        //     expiryHeader,
        //     qtyHeader,
        //     ...pharmacyHeaders,
        //     actionHeader,
        //   ];
        //   break;
        default:
          return null;
      }
      return headers
        .filter((h) => h)
        .map((h, i) => (
          <div
            key={`${type}-header-${i}`}
            className="font-medium text-xs text-gray-600 truncate uppercase tracking-wider"
            title={h.tooltip}
            style={{ gridColumn: h.gridSpan }}
          >
            {h.title}
          </div>
        ));
    };

    return (
      <section className="border border-gray-200 rounded-lg shadow-sm mb-6 overflow-hidden bg-white">
        <h2
          className={`text-lg font-semibold p-3 bg-${headerColor}-50 border-b border-gray-200 text-${headerColor}-700 flex justify-between items-center cursor-pointer hover:bg-${headerColor}-100 transition-colors duration-150`}
          onClick={() => toggleSection(type)}
          aria-expanded={isExpanded}
          aria-controls={`section-content-${type}`}
        >
          
          {title} {indicator}
          
          <span
            className={`text-sm text-gray-500 transition-transform duration-200 transform ${
              isExpanded ? "rotate-180" : "rotate-0"
            }`}
          >
            ▼
          </span>
        </h2>
        {isExpanded && (
          <div id={`section-content-${type}`} className="p-4">
            <div className="overflow-x-auto pb-2">
              <div
                className="grid gap-x-4 items-center mb-3 pb-2 border-b border-gray-200 px-1"
                style={{ gridTemplateColumns: gridTemplateColumns[type] }}
              >
                {getHeaders()}
              </div>
              <div>{children}</div>
            </div>
            <div className="mt-4">
              <ActionButton
                onClick={() => addRow(type)}
                disabled={!isDoctor && !isNurseWithOverride}
                color={buttonColor}
                title={
                  isDoctor || isNurseWithOverride
                    ? addItemButtonText
                    : "Only doctors or authorized nurses can add items"
                }
              >
                + {addItemButtonText}
              </ActionButton>
            </div>
          </div>
        )}
      </section>
    );
  };

  const sectionOrder = [
    "tablets",
    "injections",
    "syrups",
    "drops",
    "creams",
    "respules",
    "lotions",
    "fluids",
    "powder",
    "sutureProcedureItems",
    "dressingItems",
    "others",
  ];

  if (!aadhar && !existingPrescription) {
    return (
      <div className="p-6 text-center text-red-600">
        Please select an employee to view or create a Prescription.
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen p-4 md:p-6 space-y-6">
      <h1 className="text-xl md:text-2xl font-bold text-gray-800 border-b pb-2 mb-6">
        Prescription Details{" "}
        {emp_no && `for Emp #${emp_no}`}{" "}
        {data?.[0]?.name && `(${data[0].name})`}
        {existingPrescription?.id && (
          <span className="text-sm text-gray-500 font-normal ml-2">
            (ID: {existingPrescription.id})
          </span>
        )}
      </h1>

      {/* {isNurseWithOverride && (
        <section className="border border-gray-200 rounded-lg shadow-sm mb-6 overflow-hidden bg-white">
          <h2 className="text-lg font-semibold p-3 bg-yellow-50 border-b border-gray-200 text-yellow-700">
            Consultation Details
          </h2>
          <div className="p-4">
            <label
              htmlFor="consultedDoctor"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Consulted Doctor Name
            </label>
            <div className="relative">
              <input
                type="text"
                id="consultedDoctor"
                name="consultedDoctor"
                placeholder="Enter doctor's name"
                value={consultedDoctor}
                onChange={(e) => handleInputChange(e, "consultedDoctor")}
                className="px-3 py-1.5 w-full border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 text-sm bg-white focus:ring-blue-500"
                autoComplete="off"
                disabled={(accessLevel === "pharmacist" )}
              />
              {showDoctorSuggestions && doctorSuggestions.length > 0 && (
                <div className="absolute z-30 bg-white border border-gray-300 rounded-md shadow-lg mt-1 w-full max-h-48 overflow-y-auto">
                  {doctorSuggestions.map((doctor, i) => (
                    <div
                      key={`doc-sugg-${i}`}
                      className="px-4 py-2 hover:bg-blue-100 cursor-pointer text-sm"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleDoctorSuggestionClick(doctor.name || doctor);
                      }}
                    >
                      {doctor.name || doctor}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )} */}

      {sectionOrder.map((type) => {
        const stateMap = {
          tablets,
          injections,
          syrups,
          drops,
          creams,
          respules,
          lotions,
          fluids,
          powder,
          sutureProcedureItems,
          dressingItems,
          others,
        };
        const items = stateMap[type] || [];
        let title, color, addItemButtonText;
        switch (type) {
          case "tablets":
            title = "Tablets";
            color = "blue";
            addItemButtonText = "Add Tablet";
            break;
          case "injections":
            title = "Injections";
            color = "purple";
            addItemButtonText = "Add Injection";
            break;
          case "syrups":
            title = "Syrups";
            color = "green";
            addItemButtonText = "Add Syrup";
            break;
          case "drops":
            title = "Drops";
            color = "teal";
            addItemButtonText = "Add Drop";
            break;
          case "creams":
            title = "Creams & Ointments";
            color = "orange";
            addItemButtonText = "Add Cream/Ointment";
            break;
          case "respules":
            title = "Respules";
            color = "cyan";
            addItemButtonText = "Add Respule";
            break;
          case "lotions":
            title = "Lotions";
            color = "pink";
            addItemButtonText = "Add Lotion";
            break;
          case "fluids":
            title = "Fluids";
            color = "indigo";
            addItemButtonText = "Add Fluid";
            break;
          case "powder":
            title = "Powders";
            color = "lime";
            addItemButtonText = "Add Powder";
            break;
          case "sutureProcedureItems":
            title = "SutureAndProcedureItems";
            color = "gray";
            addItemButtonText = "Add Suture/Procedure Item";
            break;
          case "dressingItems":
            title = "DressingItems";
            color = "gray";
            addItemButtonText = "Add Dressing Item";
            break;
          case "others":
            title = "Others";
            color = "gray";
            addItemButtonText = "Add Other Item";
            break;
          default:
            return null;
        }
        const children = items.map((_, index) => (
          <div
            key={`${type}-${index}`}
            className="grid gap-x-4 mb-3 items-start px-1"
            style={{ gridTemplateColumns: gridTemplateColumns[type] }}
            
          >
            
            {renderInputFields(type, items, index)}
            <div className="flex justify-center items-center h-full pt-1">
              {isDoctor || isNurseWithOverride ? (
                <RemoveButton
                  onClick={removeRow}
                  type={type}
                  index={index}
                  disabled={!isDoctor && !isNurseWithOverride || isPharmacy}
                />
              ) : (
                <div className="w-8 h-8"></div>
              )}
            </div>
          </div>
        ));
        return (
          <React.Fragment key={type}>
            {renderSection(type, title, color, children, addItemButtonText, items?.[0]?.indicator)}
          </React.Fragment>
        );
      })}

      <section className="border border-gray-200 rounded-lg shadow-sm mb-6 overflow-hidden bg-white">
        <h2 className="text-lg font-semibold p-3 bg-yellow-50 border-b border-gray-200 text-yellow-700 flex justify-between items-center cursor-pointer hover:bg-yellow-100 transition-colors duration-150">
          Pharma Notes
        </h2>
        <div className="p-4">
          <textarea
            placeholder="Enter Pharma notes here..."
            value={nurseNotes}
            onChange={(e) => handleInputChange(e, "nurseNotes")}
            className="px-3 py-2 w-full border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-vertical min-h-[80px]"
          />
        </div>
      </section>

      <div className="flex justify-end space-x-4 mt-8">
        {(!isPharmacy || isNurseWithOverride) && (
          <ActionButton onClick={handleGeneratePrescription} color="green">
            Generate Prescription
          </ActionButton>
        )}
        {(isDoctor || isNurseWithOverride || isPharmacy) && (
          <ActionButton
            onClick={() => handleSubmit(mrdNo)}
            color="blue"
          >
            {condition ? "Update Prescription" : "Submit Prescription"}
          </ActionButton>
        )}
      </div>
      {error && (
        <p className="text-red-500 text-center mt-4">{error}</p>
      )}
    </div>
  );
};

export default Prescription;
