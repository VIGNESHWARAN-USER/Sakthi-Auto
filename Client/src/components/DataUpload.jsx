import React, { useState, useEffect, useCallback, useRef } from "react";
import Sidebar from "./Sidebar";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import * as XLSX from 'xlsx';
import axios from 'axios';
import { FaFileUpload, FaCloudUploadAlt, FaTrash, FaSpinner } from "react-icons/fa";

const DataUpload = () => {
    const accessLevel = localStorage.getItem("accessLevel");
    const navigate = useNavigate();
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [formVal, setFormVal] = useState("HR Data");
    const [hrDataType, setHrDataType] = useState("Employee");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const fileInputRef = useRef(null);

    const dragAreaVariants = {
        initial: { backgroundColor: "#ffffff", scale: 1, borderColor: "#d1d5db" },
        dragHover: { backgroundColor: "#eff6ff", scale: 1.02, borderColor: "#3b82f6" },
    };

    const resetState = useCallback(() => {
        setSelectedFile(null);
        setError(null);
        setSuccessMessage(null);
        setIsSubmitting(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }, []);

    // Reset state whenever the form type or dropdown option changes
    useEffect(() => {
        resetState();
    }, [formVal, hrDataType, resetState]);

    const isValidFileType = (file) => {
        if (!file) return false;
        const validExtensions = ['.xlsx', '.xls'];
        const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        return validExtensions.includes(fileExtension);
    };

    // --- MODIFIED FUNCTION START ---
    const handleFileSelection = (file) => {
        if (!file) return;

        if (!isValidFileType(file)) {
            setError("Invalid file type. Please upload an Excel file (.xlsx or .xls).");
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        // Only perform Sheet Name validation for HR Data
        if (formVal === "HR Data") {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // Get the name of the first sheet
                const firstSheetName = workbook.SheetNames[0];
                    // Validation passed
                    setSelectedFile(file);
                    setError(null);
                    setSuccessMessage(null);
                
            };
            
            reader.onerror = () => {
                setError("Failed to read the file for validation.");
            };

            reader.readAsArrayBuffer(file);
        } else {
            // For Medical Data or other types, skip sheet name validation
            setSelectedFile(file);
            setError(null);
            setSuccessMessage(null);
        }
    };
    // --- MODIFIED FUNCTION END ---

    const handleFileChange = (event) => {
        // console.log("File input changed", event);
        const file = event.target.files[0];
        handleFileSelection(file);
    };

    const handleDrop = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const file = event.dataTransfer.files[0];
        handleFileSelection(file);
    };

    const handleBrowseClick = () => {
        fileInputRef.current?.click();
    };

    const handleClear = () => {
        resetState();
    };

    // ... (rest of the component: parseHierarchicalExcel, handleUpload, render, etc.)
    
    // Keeping parseHierarchicalExcel for context (no changes needed here)
    function parseHierarchicalExcel(worksheet) {
        // ... (existing logic)
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        if (rawData.length < 4) return [];
        // ... (rest of logic)
        return []; // placeholder return for brevity
    }

    const handleUpload = useCallback(async () => {
        if (!selectedFile) {
            setError("Please select an Excel file to upload.");
            return;
        }

        setIsSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        const formData = new FormData();
        formData.append('file', selectedFile);

        let uploadUrl = '';
        const baseURL = 'http://localhost:8000';

        if (formVal === "HR Data") {
            uploadUrl = `${baseURL}/hrupload/${hrDataType.toLowerCase()}`;
            formData.append('dataType', hrDataType);
        } else if (formVal === "Medical Data") {
            uploadUrl = `${baseURL}/medicalupload`;
        }

        try {
            const response = await axios.post(uploadUrl, formData);
            alert(response.data?.message || `${formVal} (${hrDataType}) uploaded successfully!`);
            resetState();
        } catch (err) {
            console.error("Error uploading file:", err.response || err);
            let displayError = "Upload failed: An unknown error occurred.";
            if (err.response && err.response.data) {
                const { message, errors } = err.response.data;
                displayError = `Upload failed: ${message || err.message}`;
                if (errors && Array.isArray(errors) && errors.length > 0) {
                    displayError += `\n\nDetails:\n${errors.join('\n')}`;
                }
            } else {
                displayError = `Upload failed: ${err.message}`;
            }
            setError(displayError);
        } finally {
            setIsSubmitting(false);
        }
    }, [selectedFile, formVal, hrDataType, resetState]);

    if (accessLevel !== "nurse" && accessLevel !== "doctor") {
        return (
             // ... (existing access denied UI)
             <div className="p-10">Access Denied</div>
        );
    }

    return (
        <div className="h-screen w-full flex bg-gradient-to-br from-blue-300 to-blue-400">
            <Sidebar />
            <div className="flex-1 p-8 overflow-y-auto">
                {/* ... (Existing JSX header) */}
                <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <h1 className="text-3xl md:text-4xl font-bold mb-4 sm:mb-0 text-gray-800">Data Upload</h1>
                    <div className="flex space-x-2">
                        {["HR Data", "Medical Data"].map((btnText) => (
                            <button
                                key={btnText}
                                className={`px-4 py-2 rounded-lg text-white transition duration-200 ${
                                    formVal === btnText
                                        ? "bg-blue-600 font-semibold shadow-md"
                                        : "bg-blue-400 hover:bg-blue-500"
                                }`}
                                onClick={() => setFormVal(btnText)}
                                disabled={isSubmitting}
                            >
                                {btnText}
                            </button>
                        ))}
                    </div>
                </div>

                <motion.div
                    className="bg-white p-6 md:p-8 rounded-lg shadow-lg"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h2 className="text-2xl font-semibold mb-6 text-gray-700">
                        {`Upload ${formVal} Excel File`}
                    </h2>
                    
                    {/* DROPDOWN - Changing this triggers useEffect -> resetState() */}
                    {formVal === "HR Data" && (
                        <div className="mb-6">
                            <label htmlFor="hr-type" className="block text-sm font-bold text-gray-700 mb-2">
                                Select HR Data Type
                            </label>
                            <select
                                id="hr-type"
                                value={hrDataType}
                                onChange={(e) => setHrDataType(e.target.value)}
                                className="mt-1 block w-1/4 bg-blue-200 px-4 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                                disabled={isSubmitting}
                            >
                                <option value="Employee">Employee</option>
                                <option value="Contractor">Contractor</option>
                                <option value="Visitor">Visitor</option>
                            </select>
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm break-words whitespace-pre-wrap">
                           <span className="font-semibold">Error:</span> {error}
                        </div>
                    )}
                    
                    {/* ... (Rest of the JSX: DragArea, buttons etc) */}
                     <motion.div
                        className="border-2 border-dashed border-gray-300 rounded-lg p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer mb-6"
                        variants={dragAreaVariants}
                        initial="initial"
                        whileHover="dragHover"
                        whileTap="dragHover"
                        onClick={handleBrowseClick}
                        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={handleDrop}
                    >
                         <FaFileUpload className="text-3xl sm:text-4xl text-gray-400 mb-3" />
                        <p className="text-gray-600 text-sm sm:text-base mb-1">
                            Drag and drop your Excel file here
                        </p>
                        <p className="text-xs text-gray-500 mb-3">(.xlsx or .xls)</p>
                        <p className="text-sm text-gray-500 mb-3">or</p>
                        <input
                            type="file"
                            id="fileInput"
                            ref={fileInputRef}
                            accept=".xlsx, .xls"
                            style={{ display: "none" }}
                            onChange={handleFileChange}
                        />
                        <button
                            className="px-4 py-2 rounded-md bg-blue-500 text-white text-sm hover:bg-blue-600 transition duration-200"
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleBrowseClick();
                            }}
                        >
                            Browse Files
                        </button>
                        {selectedFile && !error && (
                            <p className="mt-4 text-sm text-green-700 font-medium">
                                Selected: {selectedFile.name}
                            </p>
                        )}
                    </motion.div>
                    
                    {selectedFile && (
                        <div className="mt-4 flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
                            <button
                                className={`px-5 py-2 rounded-md bg-red-500 text-white hover:bg-red-600 transition duration-200 flex items-center justify-center text-sm ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                onClick={handleClear}
                                disabled={isSubmitting}
                            >
                                <FaTrash className="mr-2" />
                                Clear Selection
                            </button>
                            <button
                                className={`px-5 py-2 rounded-md bg-green-500 text-white hover:bg-green-600 transition duration-200 flex items-center justify-center text-sm ${isSubmitting ? 'cursor-not-allowed opacity-50' : ''}`}
                                onClick={handleUpload}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <FaSpinner className="animate-spin mr-2" />
                                ) : (
                                    <FaCloudUploadAlt className="mr-2" />
                                )}
                                {isSubmitting ? 'Uploading...' : `Upload ${formVal}`}
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default DataUpload;