import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import axios from "axios";
import React, { useState, useEffect } from "react";

const Vaccination = ({ data }) => {
  const [vaccinationData, setVaccinationData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const aadhar = data?.aadhar;

  useEffect(() => {
    if (!aadhar) {
      setIsLoading(false);
      return;
    }

    const fetchVaccineData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await axios.get(`http://localhost:8000/getvaccinations/${aadhar}`);
        const visitRecords = response.data?.vaccinations; // This is an array of visits

        if (Array.isArray(visitRecords) && visitRecords.length > 0) {
          
          // *** THE KEY FIX IS HERE ***
          // We use flatMap to go through each visit record, get its 'vaccination' array,
          // and combine them all into a single, flat array of vaccine objects.
          const allVaccines = visitRecords.flatMap(record => record.vaccination || []);

          // Now we can set this flattened and complete list to our state.
          // The optional sanitization step is still good practice.
          const sanitizedData = allVaccines.map(vac => ({
            disease_name: vac?.disease_name || "",
            vaccine_name: vac?.vaccine_name || "",
            prophylaxis: vac?.prophylaxis || "",
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
          
        } else {
          // If there are no visit records, there are no vaccines.
          setVaccinationData([]);
        }
      } catch (err) {
        console.error("Error fetching vaccination data:", err);
        setError("Failed to load vaccination history.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchVaccineData();
  }, [aadhar]);
  

  // The rest of your component (the JSX) remains exactly the same,
  // as it's already correctly designed to display the data once it's in the right format.

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white/50 rounded-xl border border-dashed border-gray-300">
            <FontAwesomeIcon icon={faSpinner} spin className="text-5xl text-blue-500 mb-4" />
            <p className="text-gray-600 font-semibold text-lg animate-pulse">Loading Vaccination History...</p>
          </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 bg-white rounded-lg shadow-md p-4 text-center">
        <p className="text-red-500 font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="mt-4 bg-white rounded-lg shadow-md p-4">
      <h1 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
        Vaccination Information
      </h1>

      {vaccinationData.length === 0 ? (
        <p className="text-center text-gray-500 py-4">No vaccination records available.</p>
      ) : (
        <div className="space-y-4">
          {vaccinationData.map((vaccination, vIndex) => (
            <div key={vIndex} className="p-4 border rounded-md bg-gray-50">
              {/* Main Vaccine Details */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label htmlFor={`disease_name_${vIndex}`} className="block text-sm font-medium text-gray-700">Vaccine:</label>
                  <input
                    type="text"
                    id={`disease_name_${vIndex}`}
                    value={vaccination.disease_name}
                    readOnly
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-gray-100 rounded-md shadow-sm sm:text-sm cursor-not-allowed"
                  />
                </div>
                 <div>
                  <label htmlFor={`vaccine_name_${vIndex}`} className="block text-sm font-medium text-gray-700">Vaccine Name:</label>
                  <input
                    type="text"
                    id={`vaccine_name_${vIndex}`}
                    value={vaccination.vaccine_name}
                    readOnly
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-gray-100 rounded-md shadow-sm sm:text-sm cursor-not-allowed"
                  />
                </div>
                <div>
                  <label htmlFor={`status_${vIndex}`} className="block text-sm font-medium text-gray-700">Status:</label>
                  <input
                    type="text"
                    id={`status_${vIndex}`}
                    value={vaccination.status}
                    readOnly
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-gray-100 rounded-md shadow-sm sm:text-sm cursor-not-allowed"
                  />
                </div>
                 <div>
                  <label htmlFor={`prophylaxis_${vIndex}`} className="block text-sm font-medium text-gray-700">Prophylaxis:</label>
                  <input
                    type="text"
                    id={`prophylaxis_${vIndex}`}
                    value={vaccination.prophylaxis || "N/A"}
                    readOnly
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-gray-100 rounded-md shadow-sm sm:text-sm cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Doses and Boosters */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="block text-sm font-semibold text-gray-700 mb-2">Doses</h3>
                  {(vaccination.doses?.dates?.length ?? 0) === 0 ? (
                      <p className="text-xs text-gray-500 italic">No doses recorded.</p>
                  ) : (
                    vaccination.doses.dates.map((date, dIndex) => (
                      <div key={dIndex} className="flex items-center gap-2 mt-1">
                        <input
                          type="text"
                          value={vaccination.doses.dose_names[dIndex] || `Dose ${dIndex + 1}`}
                          readOnly
                          className="py-1 px-2 flex-grow bg-white border border-gray-300 rounded-md shadow-sm text-sm cursor-not-allowed"
                        />
                         <input
                          type="date"
                          value={date}
                          readOnly
                          className="py-1 px-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm cursor-not-allowed"
                        />
                      </div>
                    ))
                  )}
                </div>

                <div>
                  <h3 className="block text-sm font-semibold text-gray-700 mb-2">Boosters</h3>
                  {(vaccination.boosters?.dates?.length ?? 0) === 0 ? (
                      <p className="text-xs text-gray-500 italic">No boosters recorded.</p>
                  ) : (
                    vaccination.boosters.dates.map((date, bIndex) => (
                      <div key={bIndex} className="flex items-center gap-2 mt-1">
                        <input
                          type="text"
                          value={vaccination.boosters.dose_names[bIndex] || `Booster ${bIndex + 1}`}
                          readOnly
                          className="py-1 px-2 flex-grow bg-white border border-gray-300 rounded-md shadow-sm text-sm cursor-not-allowed"
                        />
                        <input
                          type="date"
                          value={date}
                          readOnly
                          className="py-1 px-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm cursor-not-allowed"
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Vaccination;