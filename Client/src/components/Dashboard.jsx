import React, { useState, useEffect } from 'react';
import Sidebar from "./Sidebar";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    LabelList,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import moment from 'moment';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartBar, faExclamationTriangle, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { faCalendar } from '@fortawesome/free-regular-svg-icons';
import { GrRun } from "react-icons/gr";

// --- Animation variants ---
const chartVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: 20, transition: { duration: 0.2 } },
};

// --- Helper Components ---
const renderCustomizedLabel = (props) => {
    const { x, y, width, value } = props;
    const radius = 10;
    return (
        <g>
            <text
                x={x + width / 2}
                y={y - radius}
                fill="#444"
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="0.8em"
            >
                {value}
            </text>
        </g>
    );
};

const LoadingSpinner = () => (
    <div className="flex flex-col items-center justify-center h-full w-full">
        <FontAwesomeIcon icon={faSpinner} spin className="text-4xl text-blue-500 mb-4" />
        <p className="text-gray-600 font-semibold">Loading Dashboard Data...</p>
    </div>
);

const ErrorMessage = ({ message, onRetry }) => (
    <div className="flex flex-col items-center justify-center h-full w-full bg-red-50 p-6 rounded-lg border border-red-200">
        <FontAwesomeIcon icon={faExclamationTriangle} className="text-4xl text-red-500 mb-4" />
        <p className="text-red-700 font-semibold text-lg mb-4">{message}</p>
        <button 
            onClick={onRetry}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition"
        >
            Retry Fetching
        </button>
    </div>
);

const MyBarChart = ({ data, title, color, onItemClick, visible }) => {
    return (
        <motion.div
            className="bg-white p-4 rounded-lg shadow w-full overflow-hidden"
            variants={chartVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{ display: visible ? 'block' : 'none' }}
        >
            <h4 className="text-lg font-semibold text-gray-800 mb-3">{title}</h4>
            <ResponsiveContainer width="100%" height={360}>
                <BarChart data={data} onClick={onItemClick}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Legend />
                    <Bar dataKey="count" fill={color} isAnimationActive={true}>
                        <LabelList dataKey="count" content={renderCustomizedLabel} />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </motion.div>
    );
};

const footFallOptions = [
    { value: "", label: "Select Footfall Type" },
    { value: "Staff", label: "Staff" },
    { value: "Workman", label: "Workman" },
    { value: "Apprentice", label: "Apprentice" },
    { value: "Contract Labour", label: "Contract Labour" },
    { value: "Security", label: "Security" },
    { value: "Others", label: "Others" },
];

const OverAllFootFallDropdown = ({ value, onChange }) => {
    const variants = {
        hidden: { opacity: 0, x: -20 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
    };

    return (
        <motion.div
            variants={variants}
            initial="hidden"
            animate="visible"
            className="flex items-center"
        >
            <select
                id="over-all-footfall"
                value={value}
                onChange={onChange}
                className="shadow border rounded px-3 py-2 w-[300px] text-gray-700 whitespace-nowrap focus:outline-none focus:shadow-outline"
            >
                {footFallOptions.map(option => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </motion.div>
    );
};


const App = () => {
    // UI States
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeAnalysis, setActiveAnalysis] = useState("footfall");
    
    // Data States
    const [barChartData, setBarChartData] = useState([]);
    const [secondBarChartData, setSecondBarChartData] = useState([]);
    const [thirdBarChartData, setThirdBarChartData] = useState([]);
    
    // Selection States
    const [selectedBar, setSelectedBar] = useState(null);
    const [selectedSubBar, setSelectedSubBar] = useState(null);
    const [overAllFootFall, setOverAllFootFall] = useState("");
    const [currentChartLevel, setCurrentChartLevel] = useState(1);

    // Date Filters
    //default : today's date
    const today = new Date();
    const formattedDate = today.toLocaleDateString();
    const [fromDate, setFromDate] = useState(today);
    const [toDate, setToDate] = useState(today);

    // Raw Data Storage
    const [visitData, setVisitData] = useState([]);
    const [originalVisitData, setOriginalVisitData] = useState([]); // Stores everything from DB
    
    const [fitnessChartData, setFitnessChartData] = useState([]);
    const [fitnessVisitData, setFitnessVisitData] = useState([]);
    const [originalFitnessData, setOriginalFitnessData] = useState([]); // Stores everything from DB

    // --- 1. Initial Data Fetch ---
    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Fetch both endpoints concurrently
            const [fitnessResp, visitResp] = await Promise.all([
                axios.post("http://localhost:8000/fitnessData/"),
                axios.post("http://localhost:8000/visitData/")
            ]);

            const rawFitness = fitnessResp.data.data || [];
            const rawVisit = visitResp.data.data || [];

            // Store original full data
            setOriginalFitnessData(rawFitness);
            setOriginalVisitData(rawVisit);

            // Calculate Today's Date
            const today = moment().format('YYYY-MM-DD');
            setFromDate(today);
            setToDate(today);

            // Filter Visit Data for Today
            const todayVisits = rawVisit.filter(item => 
                moment(item.date).isSame(today, 'day')
            );
            setVisitData(todayVisits);

            // Filter Fitness Data for Today
            const todayFitness = rawFitness.filter(item => 
                moment(item.entry_date).isSame(today, 'day')
            );
            setFitnessVisitData(todayFitness);

        } catch (err) {
            console.error("Error fetching data:", err);
            setError("Failed to load data from the server. Please check your connection or try again.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- 2. Filter Logic (Apply Button) ---
    useEffect(() => {
        if (!fromDate || !toDate) {
            alert("Please select both 'From' and 'To' dates.");
            return;
        }

        const from = moment(fromDate);
        const to = moment(toDate);

        // Filter from Original Visit Data
        const filteredVisitData = originalVisitData.filter(item => {
            const visitDate = moment(item.date);
            return visitDate.isSameOrAfter(from, 'day') && visitDate.isSameOrBefore(to, 'day');
        });
        setVisitData(filteredVisitData);

        // Filter from Original Fitness Data
        const filteredFitnessData = originalFitnessData.filter(item => {
            const entryDate = moment(item.entry_date);
            return entryDate.isSameOrAfter(from, 'day') && entryDate.isSameOrBefore(to, 'day');
        });
        setFitnessVisitData(filteredFitnessData);
        
        // Reset Drilldowns when filter changes
        setSelectedBar(null);
        setSelectedSubBar(null);
        setCurrentChartLevel(1);
    }, [fromDate, toDate]);

    const clearDateFilter = () => {
        // Reset dates to empty or stay as is, but show ALL data
        setFromDate('');
        setToDate('');
        setVisitData(originalVisitData);
        setFitnessVisitData(originalFitnessData);
    };

    // --- 3. Chart Data Processing Effects ---

    const handleOverAllFootFallChange = (event) => {
        setOverAllFootFall(event.target.value);
        setSelectedBar(null);
        setSelectedSubBar(null);
        setSecondBarChartData([]);
        setThirdBarChartData([]);
        setCurrentChartLevel(1);
    };

    const handleBarClick = (event) => {
        if (!event || !event.activePayload || !event.activePayload[0] || event.activePayload[0].payload.name == "Eye Incident" || event.activePayload[0].payload.name == "New Arrivals Medical Examination") return;
        if (event && event.activePayload && event.activePayload[0]) {
            const clickedBarName = event.activePayload[0].payload.name;
            setSelectedBar(clickedBarName);
            setSelectedSubBar(null);
            setSecondBarChartData([]);
            setThirdBarChartData([]);
            setCurrentChartLevel(2);
        }
    };

    const handleSubBarClick = (event) => {
        if(!event || !event.activePayload || !event.activePayload[0] || event.activePayload[0].payload.name !== "Other") return;
        if (event && event.activePayload && event.activePayload[0]) {
            const clickedBarName = event.activePayload[0].payload.name;
            setSelectedSubBar(clickedBarName);
            setCurrentChartLevel(3);
        }
    };

    const goBack = () => {
        if (currentChartLevel === 2) {
            setCurrentChartLevel(1);
            setSelectedBar(null);
            setSecondBarChartData([]);
        } else if (currentChartLevel === 3) {
            setCurrentChartLevel(2);
            setSelectedSubBar(null);
            setThirdBarChartData([]);
        }
    };

    // Level 1: Main Footfall Chart
    useEffect(() => {
        if (!visitData) {
            setBarChartData([]);
            return;
        }

        let filteredData = visitData;

        if (overAllFootFall === "Employee+Contractor") {
            filteredData = visitData.filter(item => item.type === "Employee" || item.type === "Contractor");
        } else if (overAllFootFall && overAllFootFall !== "Total") {
            filteredData = visitData.filter(item => item.type === overAllFootFall);
        }

        const groupedData = {};
        filteredData.forEach(item => {
            const key = item.type_of_visit;
            groupedData[key] = (groupedData[key] || 0) + 1;
        });

        const mainData = Object.keys(groupedData).map(key => ({
            name: key,
            count: groupedData[key],
        }));

        setBarChartData(mainData);
    }, [overAllFootFall, visitData]);

    // Level 2: Purpose Breakdown
    useEffect(() => {
        let detailData = [];
        if (selectedBar) {
            let filteredData = visitData;
            if (overAllFootFall === "Employee+Contractor") {
                filteredData = visitData.filter(item => item.type === "Employee" || item.type === "Contractor");
            } else if (overAllFootFall && overAllFootFall !== "Total") {
                filteredData = visitData.filter(item => item.type === overAllFootFall);
            }
            const subFilteredData = filteredData.filter(item => item.type_of_visit === selectedBar);
            console.log("Sub Filtered Data for Level 2:", subFilteredData);
            const groupedData = {};
            if(selectedBar === "Follow Up")
            {
                subFilteredData.forEach(item => {
                const key = item.followup_type;
                groupedData[key] = (groupedData[key] || 0) + 1;
            });
            }
            else{
                subFilteredData.forEach(item => {
                const key = item.register;
                groupedData[key] = (groupedData[key] || 0) + 1;
            });
            }
            detailData = Object.keys(groupedData).map(key => ({
                name: key,
                count: groupedData[key],
            }));
        }
        setSecondBarChartData(detailData);
    }, [selectedBar, overAllFootFall, visitData]);

    // Level 3: Register Breakdown
    useEffect(() => {
        let thirdData = [];
        if (selectedSubBar && selectedBar) {
            console.log("Selected Sub Bar for Level 3:", selectedSubBar, selectedBar);
            const filteredVisitData = visitData.filter(item => 
                item.register === selectedSubBar && item.type_of_visit === selectedBar
            );
            console.log("Filtered Data for Level 3:", filteredVisitData);
            const groupedData = {};
            filteredVisitData.forEach(item => {
                const key = item.other_register;
                groupedData[key] = (groupedData[key] || 0) + 1;
            });
            thirdData = Object.keys(groupedData).map(key => ({
                name: key,
                count: groupedData[key],
            }));
        }
        setThirdBarChartData(thirdData);
    }, [selectedSubBar, selectedBar, visitData]);

    // Fitness Data Processing
    useEffect(() => {
        if (!fitnessVisitData) return;

        const employerTypes = ['Overall', 'Staff', 'Workman', 'Apprentice', 'Contract Labour', 'Security', 'Others'];
        
        const fitnessData = employerTypes.map(employer => {
            let filteredData = fitnessVisitData;
            if (employer !== 'Overall') {
                filteredData = fitnessVisitData.filter(item => item.employer === employer);
            }

            const fitCount = filteredData.filter(item => item.overall_fitness === "fit").length;
            const unfitCount = filteredData.filter(item => item.overall_fitness === "unfit").length;
            const conditionalCount = filteredData.filter(item => item.overall_fitness === "conditional").length;
            const pendingCount = filteredData.filter(item => item.overall_fitness === "pending").length;

            return {
                name: employer,
                Fit: fitCount,
                Unfit: unfitCount,
                Conditional: conditionalCount,
                Pending: pendingCount
            };
        });

        setFitnessChartData(fitnessData);
    }, [fitnessVisitData]);

    const toggleAnalysis = (analysisType) => {
        setActiveAnalysis(analysisType);
    };

    // --- Render ---

    return (
        <div className="h-screen w-full flex bg-gradient-to-br from-blue-300 to-blue-400">
            <Sidebar />
            <div className="p-8 w-4/5 overflow-y-auto">

                {/* Top Section with Date Filters */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h2 className="text-4xl font-bold mb-8 text-gray-800">
                        Dashboard Statistics
                    </h2>
                    
                </motion.div>                
                    <>
                        {activeAnalysis === 'footfall' && (
                            <motion.div
                                className="bg-white rounded-lg shadow-md p-6"
                                variants={chartVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                            >
                                <div className="flex items-center gap-4 mb-4 w-full">

  {/* Title */}
  <h2 className="text-2xl font-semibold text-gray-800 whitespace-nowrap">
    Footfall Analysis
  </h2>

    <div className="flex-1" />
  {/* From Date */}
  <input
    type="date"
    value={fromDate}
    onChange={(e) => setFromDate(e.target.value)}
    className="shadow border rounded px-3 py-2 text-gray-700"
  />

  {/* To Date */}
  <input
    type="date"
    value={toDate}
    onChange={(e) => setToDate(e.target.value)}
    className="shadow border rounded px-3 py-2 text-gray-700"
  />

  {/* Dropdown */}
  <div className="min-w-[180px]">
    <OverAllFootFallDropdown
      value={overAllFootFall}
      onChange={handleOverAllFootFallChange}
    />
  </div>

  
  

  {/* Back Button */}
  <button
    disabled={currentChartLevel === 1}
    onClick={goBack}
    className={`px-4 py-2 rounded font-semibold bg-gray-300 hover:bg-gray-400 whitespace-nowrap
      ${currentChartLevel === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    Back
  </button>

</div>

                                {isLoading ? (
                    <div className="bg-white rounded-lg shadow-md p-10 h-64">
                        <LoadingSpinner />
                    </div>
                ) : error ? (
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <ErrorMessage message={error} onRetry={fetchData} />
                    </div>
                ) : (
                    <>
                                <AnimatePresence mode="wait">
                                    {currentChartLevel === 1 && (
                                        <MyBarChart
                                            key="chart1"
                                            title="Overall Data Distribution"
                                            data={barChartData}
                                            color="#3182CB"
                                            onItemClick={handleBarClick}
                                            visible={true}
                                        />
                                    )}

                                    {currentChartLevel === 2 && (
                                        <MyBarChart
                                            key="chart2"
                                            title={`Breakdown by Purpose (${selectedBar})`}
                                            data={secondBarChartData}
                                            color="#82ca9d"
                                            onItemClick={handleSubBarClick}
                                            visible={true}
                                        />
                                    )}

                                    {currentChartLevel === 3 && (
                                        <MyBarChart
                                            key="thirdHierarchy"
                                            title={`Breakdown by Register (${selectedSubBar})`}
                                            data={thirdBarChartData}
                                            color="#a855f7"
                                            visible={true}
                                        />
                                    )}
                                </AnimatePresence>
                                {barChartData.length === 0 && (
                                    <div className="text-center text-gray-500 py-10">
                                        No footfall data found for the selected dates.
                                    </div>
                                )}
                                </>
                            )}
                            </motion.div>
                        )}
                    </>
                
            </div>
        </div>
    );
};

export default App;