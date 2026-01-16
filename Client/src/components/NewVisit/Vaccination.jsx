import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";

// Define a default empty structure for clarity and reuse
const defaultVaccineRecord = {
  disease_name: "",
  vaccine_name: "",
  prophylaxis: "",
  status: "",
  doses: { dates: [], dose_names: [] },
  boosters: { dates: [], dose_names: [] },
};

const Vaccination = ({ data, mrdNo }) => {
  const [vaccinationData, setVaccinationData] = useState([]);
  const [isLoading, setIsLoading] = useState(false); // Changed to false initially for form interaction
  const [isHistoryLoading, setIsHistoryLoading] = useState(true); // Specific state for initial load
  const [error, setError] = useState(null);

  // Safely extract aadhar
  const aadhar = data?.[0]?.aadhar;
  const emp_no = data?.[0]?.emp_no;

  // --- Effect to Load Initial Data ---
  useEffect(() => {
    // If there's no aadhar, don't fetch.
    if (!aadhar) {
      setIsHistoryLoading(false);
      return;
    }
    
    // Reset state when data prop changes fundamentally
    setVaccinationData([]);

    const fetchVacccineData = async () => {
      setIsHistoryLoading(true);
      setError(null);
      try {
        const response = await axios.get(`http://localhost:8000/getvaccinations/${aadhar}`);
        const visitRecords = response.data?.vaccinations; // This is the array of visit records

        if (Array.isArray(visitRecords) && visitRecords.length > 0) {
          
          // *** THE KEY FIX IS HERE: Use flatMap to combine all vaccine arrays from all visits ***
          const allVaccines = visitRecords.flatMap(record => record.vaccination || []);

          if (allVaccines.length > 0) {
            // Sanitize the flattened list to ensure full structure
            const sanitizedData = allVaccines.map((vac) => ({
              disease_name: vac?.disease_name || "",
              vaccine_name: vac?.vaccine_name || "",
              prophylaxis: vac.prophylaxis || "",
              status: vac?.status || "",
              doses: {
                dates: Array.isArray(vac?.doses?.dates) ? vac.doses.dates : [],
                dose_names: Array.isArray(vac?.doses?.dose_names) ? vac.doses.dose_names : [],
              },
              boosters: {
                dates: Array.isArray(vac?.boosters?.dates) ? vac.boosters.dates : [],
                dose_names: Array.isArray(vac?.boosters?.dose_names) ? vac.boosters.dose_names : [],
              },
            }));
            setVaccinationData(sanitizedData);
          }
        }
      } catch (err) {
        console.error("Failed to fetch vaccination history:", err);
        setError("Could not load previous vaccination history.");
      } finally {
        setIsHistoryLoading(false);
      }
    };

    fetchVacccineData();

  }, [aadhar]); // Re-run ONLY when aadhar changes

  const VACCINE_OPTIONS = [
  {
    category: "Routine & Childhood (UIP India)",
    vaccines: [
      "BCG (Tuberculosis)",
      "OPV (Oral Polio Vaccine)",
      "Hepatitis B",
      "Pentavalent (Diphtheria, Pertussis, Tetanus, HepB, Hib)",
      "Rotavirus (RVV)",
      "PCV (Pneumococcal Conjugate)",
      "fIPV / IPV (Inactivated Polio)",
      "Measles & Rubella (MR)",
      "MMR (Measles, Mumps, Rubella)",
      "DPT / DTP Booster",
      "Tetanus Toxoid (TT / Td)",
      "Japanese Encephalitis (JE)"
    ]
  },
  {
    category: "COVID-19",
    vaccines: [
      "Covishield (AstraZeneca)",
      "Covaxin (Bharat Biotech)",
      "Pfizer-BioNTech (Comirnaty)",
      "Moderna (Spikevax)",
      "Sputnik V",
      "Corbevax",
      "Novavax / Covovax"
    ]
  },
  {
    category: "Travel, Adult & Special",
    vaccines: [
      "Yellow Fever",
      "Rabies (Post-exposure)",
      "Typhoid Conjugate",
      "Hepatitis A",
      "HPV (Cervical Cancer / Gardasil)",
      "Influenza (Flu Shot)",
      "Varicella (Chickenpox)",
      "Cholera",
      "Meningococcal (Meningitis)",
      "Pneumococcal Polysaccharide (PPSV23)"
    ]
  }
];


  // --- State Update Handlers (Memoized) ---
  // No changes needed in these handlers
  const addVaccine = useCallback(() => {
    setVaccinationData((prevData) => [
      ...prevData,
      { ...defaultVaccineRecord }, // Use the default structure
    ]);
  }, []);

  const removeVaccine = useCallback((indexToRemove) => {
    setVaccinationData((prevData) =>
      prevData.filter((_, index) => index !== indexToRemove)
    );
  }, []);

  const handleChange = useCallback((index, field, value) => {
    setVaccinationData((prevData) =>
      prevData.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  }, []);

  const addDoseOrBooster = useCallback((vIndex, type) => {
    setVaccinationData((prevData) => {
      const updatedData = [...prevData];
      const target = updatedData[vIndex];

      if (target && target[type]) {
          target[type].dates.push("");
          target[type].dose_names.push("");
      }
      return updatedData;
    });
  }, []);

  const removeDoseOrBooster = useCallback((vIndex, dIndex, type) => {
    setVaccinationData((prevData) => {
      const updatedData = [...prevData];
      const target = updatedData[vIndex];
      if (
        target?.[type]?.dates &&
        target?.[type]?.dose_names
      ) {
        target[type].dates.splice(dIndex, 1);
        target[type].dose_names.splice(dIndex, 1);
      }
      return updatedData;
    });
  }, []);

  const handleDoseOrBoosterChange = useCallback(
    (vIndex, dIndex, type, field, value) => {
      setVaccinationData((prevData) => {
        const updatedData = [...prevData];
        const target = updatedData[vIndex];

        if (target?.[type]?.[field]?.[dIndex] !== undefined) {
          target[type][field][dIndex] = value;
        }
        return updatedData;
      });
    },
    []
  );

  // --- Submission Handler ---
  // No changes needed here
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (mrdNo === "") {
      alert("Please submit the entries first to get MRD Number");
      return;
    }

    if (!aadhar) {
      const errorMsg = "Employee Aadhar number is missing. Cannot submit.";
      setError(errorMsg);
      alert(errorMsg);
      return;
    }
    
    // Filter out historical records that haven't been touched to only submit new/modified ones
    // This is an advanced step, for now we will submit all. If you want to change this,
    // you would need to track which records are new.

    if (vaccinationData.length === 0) {
      // If history was loaded, this might not be an error, maybe they just didn't add a new one.
      // But for simplicity, we'll keep the validation.
      const errorMsg =
        "Please add at least one vaccine record for this visit before submitting.";
      setError(errorMsg);
      alert(errorMsg);
      return;
    }

    const isValid = vaccinationData.every(
      (vac) => vac.disease_name && vac.vaccine_name && vac.status
    );
    if (!isValid) {
      const errorMsg =
        "Please ensure Vaccine, Vaccine Name, and Status are filled for all records.";
      setError(errorMsg);
      alert(errorMsg);
      return;
    }

    setIsLoading(true);
    try {
      await axios.post("http://localhost:8000/vaccination/", {
        aadhar: aadhar,
        mrdNo: mrdNo,
        emp_no: emp_no,
        vaccination: vaccinationData,
      });
      alert("Vaccination data submitted successfully!");
    } catch (err) {
      console.error("Error submitting vaccination data:", err);
      const errorMsg =
        err.response?.data?.detail || "Failed to submit vaccination data.";
      setError(`Submission Error: ${errorMsg}`);
      alert(`Error: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Render Logic ---
  if (!aadhar) {
    return (
      <div className="mt-4 bg-white rounded-lg shadow-md p-4">
        
        <p className="text-center text-red-600 my-4">Please select an employee first to view Vaccination categories.</p>
      </div>
    );
  }

  // Display a loading message only for the initial history fetch
  if(isHistoryLoading){
     return (
       <div className="mt-4 bg-white rounded-lg shadow-md p-6 text-center">
         <p className="text-gray-500">Loading vaccination history...</p>
       </div>
    );
  }

  // The rest of the JSX is identical and will now work correctly
  return (
    <div className="mt-4 bg-white rounded-lg shadow-md p-6">
      <h1 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
        Vaccination
      </h1>
      <p className="text-sm text-gray-500 mb-4 -mt-2">
        Complete vaccination history is shown. Add new records for the current visit.
      </p>

      {error && (
        <p className="text-red-600 mb-4 text-center font-medium">{error}</p>
      )}

      {vaccinationData.length === 0 && !isHistoryLoading ? (
        <div className="text-center py-4">
          <p className="text-gray-500 mb-3">
            No previous vaccination history found.
          </p>
          <button
            onClick={addVaccine}
            className="px-4 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition duration-200 disabled:opacity-50"
            disabled={isLoading}
          >
            Add First Vaccine Record
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {vaccinationData.map((vaccination, vIndex) => (
            <div
              key={`vaccine-${vIndex}`}
              className="mb-6 p-4 border rounded-md bg-gray-50 relative"
            >
              <button
                type="button"
                onClick={() => removeVaccine(vIndex)}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full text-xs leading-none w-5 h-5 flex items-center justify-center hover:bg-red-600 transition duration-200 disabled:opacity-50"
                aria-label="Remove this vaccine record"
                disabled={isLoading}
              >
                ×
              </button>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label
                    htmlFor={`disease_name_${vIndex}`}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Vaccine against<span className="text-red-500">*</span>
                  </label>

                  <select
                    id={`disease_name_${vIndex}`}
                    value={vaccination.disease_name}
                    onChange={(e) =>
                      handleChange(vIndex, "disease_name", e.target.value)
                    }
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
                    required
                    disabled={isLoading}
                  >
                    <option value="">Select a vaccine</option>

                    {/* Common Vaccines */}
                    <option value="COVID-19">COVID-19</option>
                    <option value="Hepatitis B">Hepatitis B</option>
                    <option value="DTP (Diphtheria, Tetanus, Pertussis)">DTP (Diphtheria, Tetanus, Pertussis)</option>
                    <option value="MMR (Measles, Mumps, Rubella)">MMR (Measles, Mumps, Rubella)</option>
                    <option value="Polio (OPV/IPV)">Polio (OPV/IPV)</option>
                    <option value="BCG">BCG (Tuberculosis)</option>
                    <option value="Rotavirus">Rotavirus</option>
                    <option value="Hib">Hib (Haemophilus Influenzae Type B)</option>
                    <option value="Influenza">Influenza</option>

                    {/* Additional Vaccines */}
                    <option value="HPV">HPV (Human Papillomavirus)</option>
                    <option value="Hepatitis A">Hepatitis A</option>
                    <option value="Pneumococcal (PCV)">Pneumococcal (PCV)</option>
                    <option value="Varicella (Chickenpox)">Varicella (Chickenpox)</option>
                    <option value="Typhoid">Typhoid</option>
                    <option value="Rabies">Rabies</option>
                    <option value="Japanese Encephalitis">Japanese Encephalitis</option>
                    <option value="Meningococcal">Meningococcal</option>
                    <option value="Cholera">Cholera</option>
                    <option value="Yellow Fever">Yellow Fever</option>
                    <option value="Shingles">Shingles</option>
                    <option value="Malaria Vaccine">Malaria Vaccine</option>

                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`vaccine_name_${vIndex}`}
                    className="block text-[13px] font-medium text-gray-700 mb-1"
                  >
                    Vaccine (Chemical/Brand) Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id={`vaccine_name_${vIndex}`}
                    value={vaccination.vaccine_name}
                    onChange={(e) =>
                      handleChange(vIndex, "vaccine_name", e.target.value)
                    }
                    placeholder="e.g., Pfizer, Covaxin"
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label
                    htmlFor={`status_${vIndex}`}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    id={`status_${vIndex}`}
                    value={vaccination.status}
                    onChange={(e) =>
                      handleChange(vIndex, "status", e.target.value)
                    }
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
                    required
                    disabled={isLoading}
                  >
                    <option value="" disabled>
                      Select status...
                    </option>
                    <option value="Completed">Completed</option>
                    <option value="Partial">Partial</option>
                    <option value="Not Taken">Not Taken</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor={`prophylaxis_${vIndex}`}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Prophylaxis
                  </label>
                  <select
                    id={`prophylaxis_${vIndex}`}
                    value={vaccination.prophylaxis || ""}
                    onChange={(e) =>
                      handleChange(vIndex, "prophylaxis", e.target.value)
                    }
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    disabled={isLoading}
                  >
                    <option value="" disabled>
                      Select prophylaxis...
                    </option>
                    <option value="Pre exposure prophylaxis">
                      Pre exposure prophylaxis
                    </option>
                    <option value="Post exposure prophylaxis">
                      Post exposure prophylaxis
                    </option>
                  </select>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="block text-sm font-semibold text-gray-700 mb-2">
                    Doses
                  </h3>
                  {(vaccination.doses?.dates?.length ?? 0) === 0 ? (
                    <p className="text-xs text-gray-500 italic">
                      No doses added.
                    </p>
                  ) : (
                    vaccination.doses.dates.map((date, dIndex) => (
                      <div
                        key={`dose-${vIndex}-${dIndex}`}
                        className="flex items-center gap-2 mt-1"
                      >
                        <input
                          type="date"
                          value={date}
                          onChange={(e) =>
                            handleDoseOrBoosterChange(
                              vIndex,
                              dIndex,
                              "doses",
                              "dates",
                              e.target.value
                            )
                          }
                          className="py-1 px-2 flex-grow bg-white border border-gray-300 rounded-md shadow-sm text-sm disabled:bg-gray-100"
                          aria-label={`Dose ${dIndex + 1} Date`}
                          disabled={isLoading}
                        />
                        <input
                          type="text"
                          value={vaccination.doses.dose_names[dIndex]}
                          onChange={(e) =>
                            handleDoseOrBoosterChange(
                              vIndex,
                              dIndex,
                              "doses",
                              "dose_names",
                              e.target.value
                            )
                          }
                          placeholder={`Dose ${dIndex + 1} Name`}
                          className="py-1 px-2 flex-grow bg-white border border-gray-300 rounded-md shadow-sm text-sm disabled:bg-gray-100"
                          aria-label={`Dose ${dIndex + 1} Name`}
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            removeDoseOrBooster(vIndex, dIndex, "doses")
                          }
                          className="p-1 bg-red-100 text-red-600 rounded-full text-xs w-5 h-5 flex items-center justify-center hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label={`Remove Dose ${dIndex + 1}`}
                          disabled={isLoading}
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                  <button
                    type="button"
                    onClick={() => addDoseOrBooster(vIndex, "doses")}
                    className="mt-2 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition duration-200 disabled:opacity-50"
                    disabled={isLoading}
                  >
                    + Add Dose
                  </button>
                </div>

                <div>
                  <h3 className="block text-sm font-semibold text-gray-700 mb-2">
                    Boosters
                  </h3>
                  {(vaccination.boosters?.dates?.length ?? 0) === 0 ? (
                    <p className="text-xs text-gray-500 italic">
                      No boosters added.
                    </p>
                  ) : (
                    vaccination.boosters.dates.map((date, bIndex) => (
                      <div
                        key={`booster-${vIndex}-${bIndex}`}
                        className="flex items-center gap-2 mt-1"
                      >
                        <input
                          type="date"
                          value={date}
                          onChange={(e) =>
                            handleDoseOrBoosterChange(
                              vIndex,
                              bIndex,
                              "boosters",
                              "dates",
                              e.target.value
                            )
                          }
                          className="py-1 px-2 flex-grow bg-white border border-gray-300 rounded-md shadow-sm text-sm disabled:bg-gray-100"
                          aria-label={`Booster ${bIndex + 1} Date`}
                          disabled={isLoading}
                        />
                        <input
                          type="text"
                          value={vaccination.boosters.dose_names[bIndex]}
                          onChange={(e) =>
                            handleDoseOrBoosterChange(
                              vIndex,
                              bIndex,
                              "boosters",
                              "dose_names",
                              e.target.value
                            )
                          }
                          placeholder={`Booster ${bIndex + 1} Name`}
                          className="py-1 px-2 flex-grow bg-white border border-gray-300 rounded-md shadow-sm text-sm disabled:bg-gray-100"
                          aria-label={`Booster ${bIndex + 1} Name`}
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            removeDoseOrBooster(vIndex, bIndex, "boosters")
                          }
                          className="p-1 bg-red-100 text-red-600 rounded-full text-xs w-5 h-5 flex items-center justify-center hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label={`Remove Booster ${bIndex + 1}`}
                          disabled={isLoading}
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                  <button
                    type="button"
                    onClick={() => addDoseOrBooster(vIndex, "boosters")}
                    className="mt-2 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition duration-200 disabled:opacity-50"
                    disabled={isLoading}
                  >
                    + Add Booster
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-end items-center mt-6 pt-4 border-t">
            {isLoading && (
              <span className="text-sm text-gray-500 mr-4">Submitting...</span>
            )}
            <button
              type="button"
              onClick={addVaccine}
              className="px-4 py-2 bg-blue-500 text-white rounded text-sm mr-3 hover:bg-blue-600 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              Add Another Vaccine
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? "Submitting..." : "Submit All Vaccination Data"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default Vaccination;