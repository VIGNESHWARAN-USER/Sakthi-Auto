import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import axios from 'axios';
import React, { useEffect, useState } from 'react';

// DetailItem component remains the same - used for the initially passed data
const DetailItem = ({ label, value, isTextArea = false }) => (
    <div className={`mb-4 ${isTextArea ? 'col-span-1 md:col-span-2 lg:col-span-3' : 'col-span-1'}`}> {/* Adjusted colspan */}
        <label className="block text-sm font-medium text-gray-500 mb-1">{label}</label>
        {isTextArea ? (
            <p className="w-full p-2 border rounded-md bg-gray-50 text-gray-800 text-sm min-h-[60px] whitespace-pre-wrap"> {/* Added whitespace-pre-wrap */}
                {value || <span className="text-gray-400 italic">Not specified</span>}
            </p>
        ) : (
            <p className="w-full p-2 border rounded-md bg-gray-50 text-gray-800 text-sm">
                {value || <span className="text-gray-400 italic">Not specified</span>}
            </p>
        )}
    </div>
);

const SignificantNotesDetails = ({ data }) => {
    // notesData holds the specific record passed via props (likely the latest or selected one)
    const notesData = Array.isArray(data) ? data[0] : data;
    // employeeData holds basic employee info if needed elsewhere (currently not used in render but kept for structure)
    const [employeeData, setEmployeeData] = useState(null);
    // notes state holds the *array* of all fetched historical notes/visits
    const [notes, setNotes] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const initialData = notesData;

        if (initialData && initialData.emp_no) {
            setEmployeeData(initialData);
            // Fetch notes/visit data based on emp_no
            const fetchNotes = async (empNo) => {
                 setIsLoading(true);
                 setError(null);
                try {
                    // Use GET request if just fetching data, or POST if required by backend
                    const response = await axios.get(`http://localhost:8000/get_notes/${empNo}`);
                    console.log("Fetched Notes/Visit Data:", response.data);

                    // Handle potential nesting like { data: [...] }
                    const fetchedNotesArray = response.data && Array.isArray(response.data.data)
                        ? response.data.data
                        : Array.isArray(response.data)
                            ? response.data
                            : [];

                     if (fetchedNotesArray.length === 0 && !Array.isArray(response.data) && !(response.data && Array.isArray(response.data.data))) {
                         console.warn("Fetched notes data is not in expected array format:", response.data);
                     }

                    // Sort notes by date descending (most recent first) - Optional
                    fetchedNotesArray.sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date));

                    setNotes(fetchedNotesArray);

                } catch (err) {
                    console.error("Error fetching notes:", err);
                    setError(err.response?.data?.detail || err.message || "Failed to fetch visit history.");
                    setNotes([]);
                } finally {
                     setIsLoading(false);
                }
            };
            fetchNotes(initialData.emp_no);
        } else {
            console.error("Employee data or emp_no missing in props data.");
            setError("Employee details (emp_no) needed to fetch history are missing.");
            setIsLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data]); // Re-fetch if the initial data prop changes


    // Display fields for the *initially passed* notesData record
    const displayFields = [
        { label: "Health Summary", key: "healthsummary", isTextArea: true },
        { label: "Remarks / Defaults", key: "remarks", isTextArea: true },
        { label: "Communicable Disease", key: "communicable_disease" },
        { label: "Incident Type", key: "incident_type" },
        { label: "Incident", key: "incident" },
        { label: "Illness Type", key: "illness_type" },
        { label: "Entry Date", key: "entry_date" }, 
    ];

    return (
        <div className="space-y-6"> {/* Add spacing between sections */}
            {/* Section 1: Details of the record passed via props */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-6 text-gray-700 border-b pb-2">Details of Selected Record</h2>
                 {!notesData || Object.keys(notesData).length === 0 ? (
                     <p className="text-gray-500 italic">No specific record data provided.</p>
                 ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6"> {/* Adjusted grid columns */}
                        {displayFields.map(field => (
                            <DetailItem
                                key={field.key}
                                label={field.label}
                                value={field.key === 'entry_date' && notesData[field.key] // Format date nicely
                                    ? new Date(notesData[field.key]).toLocaleDateString()
                                    : notesData[field.key]}
                                isTextArea={field.isTextArea}
                            />
                        ))}
                    </div>
                 )}
            </div>

            {/* Section 2: Historical Visit Notes Table */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">Visit History</h2>
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white/50 rounded-xl border border-dashed border-gray-300">
                          <FontAwesomeIcon icon={faSpinner} spin className="text-5xl text-blue-500 mb-4" />
                          <p className="text-gray-600 font-semibold text-lg animate-pulse">Loading history...</p>
                        </div>
                ) : error ? (
                    <p className="text-red-500">Error loading history: {error}</p>
                ) : notes.length === 0 ? (
                    <p className="text-gray-500 italic">No previous visit history found for this employee.</p>
                ) : (
                    <div className="overflow-x-auto"> {/* Make table scrollable on small screens */}
                        <table className="min-w-full divide-y divide-gray-200 border">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                                        Date
                                    </th>
                                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                                        Health Summary
                                    </th>
                                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Remarks
                                    </th>
                                    {/* Add other relevant columns if needed */}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {notes.map((note, index) => (
                                    <tr key={note.id || index} className="hover:bg-gray-50"> {/* Use note.id if available and unique */}
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 border-r w-1/6">
                                             {note.entry_date ? new Date(note.entry_date).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-700 border-r w-2/5 break-words"> {/* Allow breaking words */}
                                            {note.healthsummary || <span className="text-gray-400 italic">N/A</span>}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-700 w-2/5 break-words"> {/* Allow breaking words */}
                                             {note.remarks || <span className="text-gray-400 italic">N/A</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SignificantNotesDetails;