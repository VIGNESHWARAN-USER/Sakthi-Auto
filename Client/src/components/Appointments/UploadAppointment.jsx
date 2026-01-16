// Upload
import React, { useState } from "react";
import * as XLSX from "xlsx";
import { motion } from "framer-motion";
import { FaFileUpload, FaCloudUploadAlt, FaTrash } from "react-icons/fa"; // Import upload icon and trash icon

const UploadAppointmentPage = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [excelData, setExcelData] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null); // 'success', 'error', null
  const [isProcessing, setIsProcessing] = useState(false);
  const [tableData, setTableData] = useState(null); // Store data in table format

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
      setSelectedFile(file);
      processExcel(file);
    } else {
      alert("Please select a valid Excel file (XLSX).");
      setSelectedFile(null);
      setExcelData(null); // Clear previous data
      setTableData(null);
    }
  };

  const processExcel = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const binaryStr = e.target.result;
      const wb = XLSX.read(binaryStr, { type: "binary" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      setExcelData(jsonData);

      // Convert to table data (headers + rows)
      if (jsonData && jsonData.length > 0) {
        const headers = jsonData[0]; // First row is headers
        const rows = jsonData.slice(1); // Remaining rows are data
        setTableData({ headers, rows });
      } else {
        setTableData(null);
      }
    };
    reader.readAsBinaryString(file);
  };

  const sendToBackend = async () => {
    if (!excelData) {
      alert("Please select and process an Excel file first.");
      return;
    }

    setIsProcessing(true); 
    setUploadStatus(null); 
    try {
      const response = await fetch("http://localhost:8000/uploadAppointment/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointments: excelData, bookedBy: localStorage.getItem("userData") }),
      });

      const result = await response.json();

      if (response.ok) {
        setUploadStatus("success");
      } else {
        setUploadStatus("error");
      }
    } catch (error) {
      console.error("Error sending data to backend:", error);
      setUploadStatus("error");
    } finally {
      setIsProcessing(false); // Stop loading indicator
    }
  };

  const handleBrowseClick = () => {
    document.getElementById("fileInput").click();
  };

  const handleClear = () => {
    //reload the page
    window.location.reload();
  };

  const handleUploadAgain = async () => {
    // Retry with the existing excelData. No need to re-process the file.
    if (excelData) {
      await sendToBackend();
    } else {
      alert("No data to upload. Please select and process an Excel file first.");
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeInOut" },
    },
  };

  const dragAreaVariants = {
    initial: { scale: 1, backgroundColor: "rgba(226, 232, 240, 0.5)" },
    dragHover: {
      scale: 1.05,
      backgroundColor: "rgba(203, 213, 225, 0.7)",
      transition: { duration: 0.3 },
    },
  };

  return (
    <motion.div
      className="p-6 rounded-lg bg-gray-50 shadow-md"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="p-8 rounded-lg ">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
          Upload Contractors Appointments
        </h2>
        <motion.div
          className="border-2 border-dashed border-gray-400 rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer"
          id="drag-drop-area"
          variants={dragAreaVariants}
          initial="initial"
          whileHover="dragHover"
          whileTap="dragHover"
          onClick={handleBrowseClick}
          onDragEnter={(e) => e.preventDefault()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file && file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
              setSelectedFile(file);
              processExcel(file);
            } else {
              alert("Please upload a valid excel file");
            }
          }}
        >
          <FaFileUpload className="text-4xl text-gray-500 mb-4" />
          <p className="text-gray-700 mb-2">Drag and drop your XLSX file here</p>
          <p className="text-sm text-gray-500 mb-4">or</p>
          <input
            type="file"
            id="fileInput"
            accept=".xlsx"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <button
            className="px-5 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 transition duration-200"
            type="button"
          >
            Browse Files
          </button>
          {selectedFile && (
            <p className="mt-4 text-sm text-gray-600">
              Selected file: {selectedFile.name}
            </p>
          )}
        </motion.div>

        {/* Upload Button */}
        {selectedFile && (
          <div className="mt-4 flex justify-end gap-6">
            <button
              className={`px-5 py-2 rounded-md bg-green-500 text-white hover:bg-green-600 transition duration-200 flex items-center ${isProcessing ? 'cursor-not-allowed opacity-50' : ''}`}
              onClick={sendToBackend}
              disabled={isProcessing}
            >
              <FaCloudUploadAlt className="mr-2" />
              {isProcessing ? 'Uploading...' : 'Upload Appointments'}
            </button>
            <button
              className="px-4 py-2 bg-red-200 text-red-700 rounded-md hover:bg-red-300 transition flex items-center"
              onClick={()=>{handleClear()}}
            >
              <FaTrash className="mr-2" />
              Clear
            </button>
          </div>
        )}

        {uploadStatus === "success" && (
          <div className="mt-6 text-green-600 font-semibold">
            Appointments uploaded successfully!
          </div>
        )}

        {uploadStatus === "error" && (
          <div className="mt-6 text-red-600 font-semibold">
            Error uploading appointments. Please try again.
          </div>
        )}

        {(uploadStatus === "success" || uploadStatus === "error") && (
          <div className="mt-4 flex justify-end space-x-2">
            <button
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
              onClick={handleUploadAgain}
              disabled={isProcessing}
            >
              Upload Again
            </button>
            
          </div>
        )}

        {/* Table View */}
        {tableData && (
          <div className="mt-8 overflow-x-auto">
            <table className="min-w-full leading-normal">
              <thead>
                <tr>
                  {tableData.headers.map((header, index) => (
                    <th
                      key={index}
                      className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="px-5 py-5 border-b border-gray-200 bg-white text-sm"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default UploadAppointmentPage;