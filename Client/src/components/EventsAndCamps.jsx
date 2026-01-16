    import React, { useState, useEffect, useCallback } from "react";
    import Sidebar from "./Sidebar";
    import { motion } from "framer-motion";
    import { useNavigate } from "react-router-dom";
    import * as XLSX from 'xlsx';
    import axios from 'axios'; // Import axios

    const EventsAndCamps = () => {
        const accessLevel = localStorage.getItem("accessLevel");
        const navigate = useNavigate();
        const [campData, setCampData] = useState([]);
        const [loading, setLoading] = useState(false);
        const [error, setError] = useState(null);
        const [searchTerm, setSearchTerm] = useState("");
        const [filterStatus, setFilterStatus] = useState("");
        const [filteredCampData, setFilteredCampData] = useState([]);
        const [tempSearchTerm, setTempSearchTerm] = useState("");
        const [tempFilterStatus, setTempFilterStatus] = useState("");
        const [selectedFiles, setSelectedFiles] = useState({}); // track individual file selection
        const [dateFrom, setDateFrom] = useState("");
        const [dateTo, setDateTo] = useState(""); // Added missing state
        const [tempDateFrom, setTempDateFrom] = useState("");
        const [tempDateTo, setTempDateTo] = useState(""); // Added missing state
        const [uploadedFileNames, setUploadedFileNames] = useState({}); // Names of the files on DB
        const fileTypes = ["report1", "report2", "photos", "ppt"]; // Define file types
        const [dbFiles, setDbFiles] = useState({});  // store file URLs from the database
        
        // Nurse Role Functionality
        if (accessLevel === "nurse" || accessLevel === "doctor") {
            const [formDatas, setFormDatas] = useState({
                camp_name: "",
                start_date: "",
                end_date: "",
                camp_details: "",
                hospital_name: "" // Added hospital_name
            });

            const [isSubmitting, setIsSubmitting] = useState(false);
            const [formVal, setformVal] = useState("");

            const handleChange = (e) => {
                const { name, value } = e.target;
                setFormDatas({ ...formDatas, [name]: value });
            };

            const handleSubmit = async (e) => {
                e.preventDefault();
                setIsSubmitting(true);
                setError(null);

                if (
                    !formDatas.camp_name ||
                    !formDatas.start_date ||
                    !formDatas.end_date ||
                    !formDatas.camp_details ||
                    !formDatas.hospital_name // added hospital_name validation
                ) {
                    setError("Please fill in all required fields.");
                    setIsSubmitting(false);
                    return;
                }

                try {
                    const response = await fetch("http://localhost:8000/add-camp/", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(formDatas),
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(
                            `Error saving data: ${response.status} - ${errorData.error || "Unknown error"
                            }`
                        );
                    }

                    alert("Event & Camp data saved successfully");

                    setFormDatas({
                        camp_name: "",
                        start_date: "",
                        end_date: "",
                        camp_details: "",
                        hospital_name: ""  // reset hospital_name
                    });
                } catch (err) {
                    setError(err.message);
                    console.error("Error saving camp data:", err);
                } finally {
                    setIsSubmitting(false);
                }
            };

            // Fetch Camp Data (useCallback for optimization)
            const fetchCampData = useCallback(async () => {
                setLoading(true);
                setError(null);

                try {
                    const params = new URLSearchParams();
                    if (searchTerm) {
                        params.append("searchTerm", searchTerm);
                    }
                    if (filterStatus) {
                        params.append("filterStatus", filterStatus);
                    }
                    if (dateFrom) {
                        params.append("dateFrom", dateFrom);
                    }
                    if (dateTo) {
                        params.append("dateTo", dateTo);
                    }

                    const url = `http://localhost:8000/get-camps/?${params.toString()}`; // corrected URL formation
                    const response = await fetch(url);

                    if (!response.ok) {
                        throw new Error("Failed to fetch camp data");
                    }

                    const data = await response.json();
                    console.log("Fetched camp data:", data); // Debugging log
                    setCampData(data);
                    setFilteredCampData(data);

                    // Initialize dbFiles state with the existing files
                    const initialDbFiles = {};
                    data.forEach(camp => {
                        initialDbFiles[camp.id] = {
                            report1: camp.report1,
                            report2: camp.report2,
                            photos: camp.photos,
                            ppt: camp.ppt
                        };
                    });
                    console.log("Initial dbFiles state:", initialDbFiles); // Debugging log
                    setDbFiles(initialDbFiles);

                } catch (err) {
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            }, [searchTerm, filterStatus, dateFrom, dateTo]); // Dependency array

            useEffect(() => {
                if (formVal === "View Camps") {
                    fetchCampData();
                }
            }, [formVal, fetchCampData]); //  fetchCampData is a dependency


            const handleFilter = () => {
                setSearchTerm(tempSearchTerm);
                setFilterStatus(tempFilterStatus);
                setDateFrom(tempDateFrom);
                setDateTo(tempDateTo);
            };

            const handleFileChange = (e, campId, fileType) => {
                console.log("upload sucessfully",e);
                console.log(campId);
                console.log(fileType);
                const files = Array.from(e.target.files);   
                console.log("Selected files:", files);
                setSelectedFiles((prevSelectedFiles) => ({
                    ...prevSelectedFiles,
                    [campId]: {
                        ...prevSelectedFiles[campId],
                        [fileType]: files[0],  // Only store the first file
                    },
                    
                }));


                // Update displayed file names
                setUploadedFileNames((prevNames) => ({
                    ...prevNames,
                    [campId]: {
                        ...prevNames[campId],
                        [fileType]: files.map((file) => file.name).join(", "),
                    },
                }));
            };

            const handleRemoveFile = async (campId, fileType) => {
                setError(null);
                setLoading(true);

                try {
                    const response = await fetch("http://localhost:8000/delete-file/", {  // Backend API endpoint
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ campId: campId, fileType: fileType }),
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(`File deletion failed: ${response.status} - ${errorData.error || "Unknown error"}`);
                    }

                    // Update the frontend states:
                    setDbFiles((prevDbFiles) => {
                        const updatedDbFiles = { ...prevDbFiles };
                        if (updatedDbFiles[campId]) {
                            updatedDbFiles[campId][fileType] = null;  // Set to null instead of deleting
                        }
                        return updatedDbFiles;
                    });
                    setUploadedFileNames((prevUploadedFileNames) => {
                        const updatedUploadedFileNames = { ...prevUploadedFileNames };
                        if (updatedUploadedFileNames[campId]) {
                            updatedUploadedFileNames[campId][fileType] = undefined;
                        }
                        return updatedUploadedFileNames;
                    });
                    setSelectedFiles((prevSelectedFiles) => {
                        const updatedSelectedFiles = { ...prevSelectedFiles };
                        if (updatedSelectedFiles[campId]) {
                            updatedSelectedFiles[campId][fileType] = undefined;
                        }
                        return updatedSelectedFiles;
                    });

                    alert(`${fileType} removed successfully!`);
                } catch (err) {
                    setError(err.message);
                    console.error(`File deletion error for ${fileType}:`, err);
                } finally {
                    setLoading(false);
                }
            };

            const handleFileUpload = async (campId, fileType) => {
                setError(null);
                setLoading(true);
                const fileToUpload = selectedFiles[campId]?.[fileType];

                if (!fileToUpload) {
                    setError(`No file selected for ${fileType}`);
                    setLoading(false);
                    return;
                }

                const formData = new FormData();
                formData.append("files", fileToUpload);
                console.log("Form Data File:", fileToUpload);
                formData.append("campId", campId);
                formData.append("fileType", fileType);

                try {
                    const response = await fetch("http://localhost:8000/upload-files/", {
                        method: "POST",
                        body: formData,
                    });


                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(`File upload failed: ${response.status} - ${errorData.error || "Unknown error"}`);
                    }

                    const responseData = await response.json();
                    console.log("File upload response:", responseData); // Debugging log

                    // Update the dbFiles state with the new file URL
                    setDbFiles(prevDbFiles => ({
                        ...prevDbFiles,
                        [campId]: {
                            ...prevDbFiles[campId],
                            [fileType]: responseData.file_url, // Assuming the backend returns the file URL
                        },
                    }));
                    // Clear selected file and its name
                    setSelectedFiles((prevSelectedFiles) => ({
                        ...prevSelectedFiles,
                        [campId]: {
                            ...prevSelectedFiles[campId],
                            [fileType]: undefined, // Clear selected files for this type
                        },
                    }));
                    setUploadedFileNames((prevNames) => ({
                        ...prevNames,
                        [campId]: {
                            ...prevNames[campId],
                            [fileType]: undefined, // Clear the displayed name
                        },
                    }));


                    alert(`${fileType} uploaded successfully!`);
                } catch (err) {
                    setError(err.message);
                    console.error(`File upload error for ${fileType}:`, err);
                } finally {
                    setLoading(false);
                }
            };

            const getLabelStyle = (campId, fileType) => {
                const hasFilesSelected = uploadedFileNames[campId]?.[fileType];
                return {
                    backgroundColor: hasFilesSelected ? "green" : "blue",
                    color: "white",
                };
            };

            const handleExportToExcel = () => {
                // Map the data to the desired format for Excel
                const excelData = filteredCampData.map(camp => ({
                    "Camp Name": camp.camp_name,
                    "Hospital Name": camp.hospital_name, // Added missing hospital_name
                    "Start Date": camp.start_date,
                    "End Date": camp.end_date,
                    "Camp Details": camp.camp_details,
                    "Status": camp.camp_type,
                    // Add other fields here if you want them in the Excel sheet
                }));

                // Create a new workbook
                const wb = XLSX.utils.book_new();
                // Convert the data to a worksheet
                const ws = XLSX.utils.json_to_sheet(excelData);
                // Add the worksheet to the workbook
                XLSX.utils.book_append_sheet(wb, ws, "CampData");
                // Generate the Excel file
                XLSX.writeFile(wb, "CampData.xlsx");
            };

            const getDownloadLink = (campId, fileType) => {
                // Construct the URL to download the file from your backend
                // Replace with your actual API endpoint and parameters
                return `http://localhost:8000/download-file?campId=${campId}&fileType=${fileType}`;
            };


            return (
                <div className="h-screen w-full flex bg-gradient-to-br from-blue-300 to-blue-400">
                    <Sidebar />
                    <div className="w-4/5 p-8 overflow-y-auto">
                        <div className="mb-8 flex justify-between items-center">
                            <h1 className="text-4xl font-bold mb-8 text-gray-800">Camps</h1>
                        <div>
                                {["View Camps", "Add Camps"].map((btnText, index) => (
                                    <button
                                    key={index}
                                    className={`px-4 py-2 rounded-lg me-4 text-white hover:opacity-90 ${
                                        index === 0 ? "bg-blue-500 hover:bg-blue-600" : "bg-green-500 hover:bg-green-600"
                                    }`}
                                    onClick={() => {
                                        setformVal(btnText);
                                    }}
                                    >
                                    {btnText}
                                    </button>
                                ))}
                                </div>

                                

                        </div>

                        {formVal === "View Camps" ? (
                            <motion.div
                                className="bg-white
                                p-8 rounded-lg shadow-lg"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                            >
                                <h2 className="text-2xl font-semibold mb-6 text-gray-700">
                                    Camp Details
                                </h2>

                                <div className="mb-4 flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4 items-center">
                                    {/* Search by Camp Name */}
                                    <div className="flex flex-col md:items-start">
                                        <label className="block text-gray-700 text-sm font-bold mb-2">
                                            Camp Name
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Search by Camp Name"
                                            value={tempSearchTerm}
                                            onChange={(e) => setTempSearchTerm(e.target.value)}
                                            className="w-full md:w-auto p-2 border border-gray-300 rounded-md"
                                        />
                                    </div>

                                    {/* Filter by Status */}
                                    <div className="flex flex-col md:items-start">
                                        <label className="block text-gray-700 text-sm font-bold mb-2">
                                            Camp Type
                                        </label>
                                        <select
                                            value={tempFilterStatus}
                                            onChange={(e) => setTempFilterStatus(e.target.value)}
                                            className="w-full md:w-auto p-2 border border-gray-300 rounded-md"
                                        >
                                            <option value="">All Statuses</option>
                                            <option value="Previous">Previous</option>
                                            <option value="Live">Live</option>
                                            <option value="Upcoming">Upcoming</option>
                                        </select>
                                    </div>

                                    {/* Date From Filter */}
                                    <div className="flex flex-col md:items-start">
                                        <label className="block text-gray-700 text-sm font-bold mb-2">
                                            Date From
                                        </label>
                                        <input
                                            type="date"
                                            value={tempDateFrom}
                                            onChange={(e) => setTempDateFrom(e.target.value)}
                                            className="w-full md:w-auto p-2 border border-gray-300 rounded-md"
                                        />
                                    </div>

                                    {/* Date To Filter */}
                                    <div className="flex flex-col md:items-start">
                                        <label className="block text-gray-700 text-sm font-bold mb-2">
                                            Date To
                                        </label>
                                        <input
                                            type="date"
                                            value={tempDateTo}
                                            onChange={(e) => setTempDateTo(e.target.value)}
                                            className="w-full md:w-auto p-2 border border-gray-300 rounded-md"
                                        />
                                    </div>

                                    {/* Get Button */}
                                    <div className="flex flex-col md:items-start">
                                        <button
                                            onClick={handleFilter}
                                            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
                                        >
                                            Get
                                        </button>
                                    </div>

                                    {/* Export to Excel Button */}
                                    <div className="flex flex-col md:items-start">
                                        <button
                                            onClick={handleExportToExcel}
                                            className="bg-blue-700 text-white px-4 py-2 rounded-md hover:bg-blue-800"
                                        >
                                            Export to Excel
                                        </button>
                                    </div>
                                    
                                </div>

                                {loading ? (
                                    <div className="w-full text-center py-4">
                                        <div className="inline-block h-8 w-8 text-blue-500 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em]"></div>
                                    </div>
                                ) : error ? (
                                    <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                                        {error}
                                    </div>
                                ) : filteredCampData.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full table-auto font-sans">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Camp Name
                                                    </th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Hospital Name
                                                    </th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Start Date
                                                        (YYYY-MM-DD)
                                                    </th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        End Date
                                                        (YYYY-MM-DD)
                                                    </th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Camp Details
                                                    </th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Status
                                                    </th>
                                                    {fileTypes.map((fileType) => (
                                                        <th
                                                            key={fileType}
                                                            className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                        >
                                                            {fileType}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {filteredCampData.map((camp) => (
                                                    <tr key={camp.id} className="hover:bg-gray-100">
                                                        <td className="px-4 py-2 whitespace-nowrap">{camp.camp_name}</td>
                                                        <td className="px-4 py-2 whitespace-nowrap">{camp.hospital_name}</td>
                                                        <td className="px-4 py-2 whitespace-nowrap">{camp.start_date}</td>
                                                        <td className="px-4 py-2 whitespace-nowrap">{camp.end_date}</td>
                                                        <td className="px-4 py-2">{camp.camp_details}</td>
                                                        <td className="px-4 py-2 whitespace-nowrap">{camp.camp_type}</td>
                                                        {fileTypes.map((fileType) => (
                                                            <td key={fileType} className="px-4 py-2 whitespace-nowrap">
                                                                {camp.camp_type === "Previous" && (
                                                                    <div className="flex flex-col items-start">
                                                                        {dbFiles[camp.id]?.[fileType] ? (
                                                                            <div className="flex items-center space-x-2">
                                                                                <a
                                                                                    href={getDownloadLink(camp.id, fileType)}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="inline-block bg-green-500 hover:bg-green-700 text-white py-1 px-2 rounded text-xs"
                                                                                    download // Add the download attribute
                                                                                >
                                                                                    View
                                                                                </a>
                                                                                <input
                                                                                    type="file"
                                                                                    multiple
                                                                                    onChange={(e) => handleFileChange(e, camp.id, fileType)}
                                                                                    id={`fileUpload-${camp.id}-${fileType}`}
                                                                                    className="hidden"
                                                                                />
                                                                                <label
                                                                                    htmlFor={`fileUpload-${camp.id}-${fileType}`}
                                                                                    className="inline-block bg-yellow-500 hover:bg-yellow-700 text-white py-1 px-2 rounded text-xs cursor-pointer"
                                                                                >
                                                                                    Change
                                                                                </label>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleRemoveFile(camp.id, fileType)}
                                                                                    className="inline-block bg-red-500 hover:bg-red-700 text-white py-1 px-2 rounded text-xs"
                                                                                >
                                                                                    Remove
                                                                                </button>
                                                                            </div>
                                                                        ) : (
                                                                            <>
                                                                                <input
                                                                                    type="file"
                                                                                    multiple
                                                                                    onChange={(e) => handleFileChange(e, camp.id, fileType)}
                                                                                    id={`fileUpload-${camp.id}-${fileType}`}
                                                                                    className="hidden"
                                                                                />
                                                                                <label
                                                                                    htmlFor={`fileUpload-${camp.id}-${fileType}`}
                                                                                    className="inline-block bg-blue-500 hover:bg-blue-700 text-white py-1 px-2 rounded text-xs cursor-pointer"
                                                                                >
                                                                                    Choose Files
                                                                                </label>
                                                                            </>
                                                                        )}
                                                                        <button
                                                                            onClick={() => handleFileUpload(camp.id, fileType)}
                                                                            className="bg-green-500 text-white px-3 py-1 rounded-md text-sm hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 mt-2"
                                                                            disabled={loading}
                                                                        >
                                                                            {loading ? (
                                                                                <div className="w-full text-center py-4">
                                                                                    <div className="inline-block h-8 w-8 text-blue-500 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em]"></div>
                                                                                </div>
                                                                            ) : "Upload"}
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p>No camp data available.</p>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                className="bg-white p-8 rounded-lg shadow-lg"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                            >
                                <h2 className="text-2xl font-semibold mb-6 text-gray-700">
                                    Add a New Camp
                                </h2>
                                {error && (
                                    <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                                        {error}
                                    </div>
                                )}
                                <form onSubmit={handleSubmit}>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                                        <div>
                                            <label className="block text-gray-700 text-sm font-bold mb-2">
                                                Camp Name
                                            </label>
                                            <input
                                                type="text"
                                                name="camp_name"
                                                value={formDatas.camp_name}
                                                onChange={handleChange}
                                                className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 text-sm font-bold mb-2">
                                                Hospital Name
                                            </label>
                                            <input
                                                type="text"
                                                name="hospital_name"
                                                value={formDatas.hospital_name}
                                                onChange={handleChange}
                                                className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 text-sm font-bold mb-2">
                                                Start Date
                                            </label>
                                            <input
                                                type="date"
                                                name="start_date"
                                                value={formDatas.start_date}
                                                onChange={handleChange}
                                                className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 text-sm font-bold mb-2">
                                                End Date
                                            </label>
                                            <input
                                                type="date"
                                                name="end_date"
                                                value={formDatas.end_date}
                                                onChange={handleChange}
                                                className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="mb-6">
                                        <label className="block text-gray-700 text-sm font-bold mb-2">
                                            Camp Details
                                        </label>
                                        <textarea
                                            name="camp_details"
                                            value={formDatas.camp_details}
                                            onChange={handleChange}
                                            className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
                                            required
                                        ></textarea>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                                        <div className="mt-6 md:mt-0">
                                            <button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-300"
                                            >
                                                {isSubmitting ? "Submitting..." : "Submitdata"}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </motion.div>
                        )}
                    </div>
                </div>
            );
        } else {
            return (
                <section className="bg-white h-full flex items-center dark:bg-gray-900">
                    <div className="py-8 px-4 mx-auto max-w-screen-xl lg:py-16 lg:px-6">
                        <div className="mx-auto max-w-screen-sm text-center">
                            <h1 className="mb-4 text-7xl tracking-tight font-extrabold lg:text-9xl text-gray-900 md:text-4xl dark:text-white">
                                404
                            </h1>
                            <p className="mb-4 text-3xl tracking-tight font-bold text-gray-900 md:text-4xl dark:text-white">
                                Something's missing.
                            </p>
                            <p className="mb-4 text-lg font-light text-gray-500 dark:text-gray-400">
                                Sorry, we can't find that page. You'll find lots to explore on
                                the home page.{" "}
                            </p>
                            <button
                                onClick={() => navigate(-1)}
                                className="inline-flex text-white bg-primary-600 hover:cursor-pointer hover:bg-primary-800 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:focus:ring-primary-900 my-4"
                            >
                                Back
                            </button>
                        </div>
                    </div>
                </section>
            );
        }
    };

    export default EventsAndCamps;