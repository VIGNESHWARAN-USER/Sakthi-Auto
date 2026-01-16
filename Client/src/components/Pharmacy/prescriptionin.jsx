import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from "../Sidebar";
import * as XLSX from 'xlsx';
import { FaDownload, FaSave, FaChevronLeft, FaChevronRight, FaSearch, FaCalendarDay } from "react-icons/fa";
import { motion } from "framer-motion";

// --- Helper Functions (Preserved) ---
const getDaysInMonth = (year, month) => {
  if (isNaN(year) || isNaN(month) || month < 0 || month > 11) return 0;
  return new Date(year, month + 1, 0).getDate();
};

const parseDate = (dateInput) => {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return !isNaN(dateInput.getTime()) ? dateInput : null;
  if (typeof dateInput === 'string') {
    try {
      const isoDate = new Date(dateInput);
      if (!isNaN(isoDate.getTime()) && dateInput.includes('-')) {
          if (dateInput.length === 10 && !isNaN(Date.parse(dateInput))) {
               const [year, month, day] = dateInput.split('-').map(Number);
               if (year && month && day && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                   return new Date(Date.UTC(year, month - 1, day));
               }
          }
          return isoDate;
      }
      return null;
    } catch (error) { return null; }
  }
  return null;
};

const formatDateForAPI = (dateObj) => {
  if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) return null;
  try {
      const year = dateObj.getUTCFullYear();
      const month = (dateObj.getUTCMonth() + 1).toString().padStart(2, '0');
      const day = dateObj.getUTCDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
  } catch (error) { return null; }
};

const PrescriptionIn = () => {
  const [prescriptionData, setPrescriptionData] = useState([]);
  const [displayedMonthInfo, setDisplayedMonthInfo] = useState({
    monthName: '', year: 0, daysInMonth: 0, dayHeaders: [], monthIndex: 0
  });
  const [actualTodayInfo, setActualTodayInfo] = useState({
      day: null, monthIndex: null, year: null
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [updateStatus, setUpdateStatus] = useState('');

  const fetchDataForMonth = useCallback(async (year, monthZeroIndexed) => {
    setError(null); setUpdateStatus('');
    const monthOneIndexed = monthZeroIndexed + 1;
    try {
      const response = await fetch(`http://localhost:8000/api/prescription-in-data/?year=${year}&month=${monthOneIndexed}`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      
      const days = getDaysInMonth(year, monthZeroIndexed);
      const processedData = data.map((chem, index) => ({
          s_no: index + 1,
          ...chem,
          brands: Array.isArray(chem.brands) ? chem.brands.map(brand => {
              const backendDailyQuantities = brand.daily_quantities || {};
              const completeDailyQuantities = {};
              let calculatedTotal = 0;
              for (let i = 1; i <= days; i++) {
                  const dayKey = `day_${i}`;
                  const qtyValue = backendDailyQuantities[dayKey] ?? '';
                  completeDailyQuantities[dayKey] = qtyValue;
                  const numQty = parseInt(qtyValue, 10);
                  if (!isNaN(numQty)) calculatedTotal += numQty;
              }
              return {
                  ...brand,
                  daily_quantities: completeDailyQuantities,
                  monthly_total: calculatedTotal,
                  expiry_date: parseDate(brand.expiry_date),
              };
          }) : [],
      }));
      setPrescriptionData(processedData);
    } catch (err) {
      setError(`Failed to load data: ${err.message}`);
      setPrescriptionData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateDisplayedMonth = useCallback((newYear, newMonthIndex) => {
    setIsLoading(true);
    setError(null);
    setUpdateStatus('');
    const days = getDaysInMonth(newYear, newMonthIndex);
    const dateForMonthName = new Date(newYear, newMonthIndex, 1);
    const monthName = dateForMonthName.toLocaleString('default', { month: 'long' });
    const dayHeadersArray = Array.from({ length: days }, (_, i) => i + 1);

    setDisplayedMonthInfo({
        monthName: monthName, year: newYear,
        daysInMonth: days, dayHeaders: dayHeadersArray,
        monthIndex: newMonthIndex,
    });
    fetchDataForMonth(newYear, newMonthIndex);
  }, [fetchDataForMonth]);

  useEffect(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentDayOfMonth = today.getDate();
    setActualTodayInfo({ day: currentDayOfMonth, monthIndex: currentMonth, year: currentYear });
    updateDisplayedMonth(currentYear, currentMonth);
  }, [updateDisplayedMonth]);

  const handleQuantityChange = (chemIndex, brandIndex, day, value) => {
    const numericValue = value === '' ? '' : Math.max(0, parseInt(value, 10) || 0);
    setPrescriptionData(prevData =>
        prevData.map((chem, cIndex) =>
            cIndex !== chemIndex ? chem : {
                ...chem,
                brands: chem.brands.map((brand, bIndex) => {
                    if (bIndex !== brandIndex) return brand;
                    const updatedDailyQuantities = { ...brand.daily_quantities, [`day_${day}`]: numericValue };
                    const total = Object.values(updatedDailyQuantities).reduce((sum, qty) => sum + (parseInt(qty, 10) || 0), 0);
                    return { ...brand, daily_quantities: updatedDailyQuantities, monthly_total: total };
                })
            }
        )
    );
  };

  const handleUpdateDatabase = async () => {
    setIsUpdating(true); setUpdateStatus(''); setError(null);
    const { day: currentDay, monthIndex: actualMonthIndex, year: actualYear } = actualTodayInfo;
    const payload = [];
    const dayKey = `day_${currentDay}`;

    prescriptionData.forEach((chemical) => {
        chemical.brands.forEach((brand) => {
            const quantityStr = brand.daily_quantities?.[dayKey] ?? '';
            const quantity = quantityStr === '' ? 0 : parseInt(quantityStr, 10);
            payload.push({
                chemical_name: chemical.chemical_name, brand_name: brand.brand_name,
                dose_volume: brand.dosage, expiry_date: formatDateForAPI(brand.expiry_date),
                year: actualYear, month: actualMonthIndex + 1, day: currentDay, quantity: quantity
            });
        });
    });

    try {
        const response = await fetch('http://localhost:8000/api/update-daily-quantities/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Update failed');
        setUpdateStatus('Today\'s usage updated successfully!');
        fetchDataForMonth(displayedMonthInfo.year, displayedMonthInfo.monthIndex);
    } catch (err) {
        setError(err.message);
    } finally { setIsUpdating(false); }
  };

  const handleExportToExcel = () => {
    const wb = XLSX.utils.book_new();
    let ws_data = [["S.No", "Chemical Name", "Brand Name", "Expiry Date", "Dosage", "Monthly Total", ...displayedMonthInfo.dayHeaders.map(day => `D${day}`)]];

    prescriptionData.filter(chemical =>
        chemical?.chemical_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chemical.brands.some(brand => brand?.brand_name?.toLowerCase().includes(searchTerm.toLowerCase()))
    ).forEach(chemical => {
        chemical.brands.forEach(brand => {
            ws_data.push([
                chemical.s_no, chemical.chemical_name, brand.brand_name,
                formatDateForAPI(brand.expiry_date) || 'N/A', brand.dosage, brand.monthly_total,
                ...displayedMonthInfo.dayHeaders.map(day => brand.daily_quantities?.[`day_${day}`] ?? '')
            ]);
        });
    });

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, "Daily Usage");
    XLSX.writeFile(wb, `DailyUsage_${displayedMonthInfo.monthName}_${displayedMonthInfo.year}.xlsx`);
  };

  return (
    <div className="h-screen w-full flex bg-gradient-to-br from-blue-300 to-blue-400">
      <Sidebar />
      <div className="w-4/5 p-8 overflow-y-auto">
        
        {/* Header & Month Nav */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-4xl font-bold text-gray-800">Daily Usage Tracker</h1>
          
          <div className="flex items-center bg-white p-2 rounded-xl shadow-md border border-blue-200">
            <button onClick={() => updateDisplayedMonth(displayedMonthInfo.year, displayedMonthInfo.monthIndex - 1)} className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition">
              <FaChevronLeft />
            </button>
            <div className="px-6 text-center min-w-[160px]">
              <span className="block text-sm font-bold text-blue-500 uppercase tracking-widest">{displayedMonthInfo.year}</span>
              <span className="text-xl font-bold text-gray-800">{displayedMonthInfo.monthName}</span>
            </div>
            <button 
              disabled={displayedMonthInfo.year === actualTodayInfo.year && displayedMonthInfo.monthIndex === actualTodayInfo.monthIndex}
              onClick={() => updateDisplayedMonth(displayedMonthInfo.year, displayedMonthInfo.monthIndex + 1)} 
              className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition disabled:opacity-30"
            >
              <FaChevronRight />
            </button>
            <button onClick={() => updateDisplayedMonth(actualTodayInfo.year, actualTodayInfo.monthIndex)} className="ml-2 p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition shadow-sm" title="Go to Current Month">
              <FaCalendarDay />
            </button>
          </div>
        </div>

        <motion.div 
          className="bg-white p-8 rounded-lg shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Action Row */}
          <div className="flex flex-col lg:flex-row justify-between items-end gap-4 mb-6">
            <div className="w-full lg:w-1/3">
              <label className="block text-gray-700 text-sm font-bold mb-2">Search Items</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400"><FaSearch size={14} /></span>
                <input type="text" placeholder="Chemical or Brand..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handleExportToExcel} className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-2.5 px-5 rounded-lg flex items-center gap-2 transition shadow-md">
                <FaDownload /> Export Excel
              </button>
            </div>
          </div>

          {/* Alert Messages */}
          {error && <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">{error}</div>}
          {updateStatus && <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg font-bold">{updateStatus}</div>}

          {/* Table Container */}
          <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-inner bg-gray-50">
            {isLoading ? (
              <div className="py-20 text-center"><div className="inline-block h-10 w-10 text-blue-500 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div></div>
            ) : (
              <table className="min-w-full border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="sticky left-0 z-20 bg-gray-100 px-3 py-3 border-b text-left text-xs font-bold text-gray-500 uppercase">S.No</th>
                    <th className="sticky left-[50px] z-20 bg-gray-100 px-4 py-3 border-b text-left text-xs font-bold text-gray-500 uppercase">Chemical Name</th>
                    <th className="px-4 py-3 border-b text-left text-xs font-bold text-gray-500 uppercase min-w-[150px]">Brand Name</th>
                    <th className="px-4 py-3 border-b text-center text-xs font-bold text-gray-500 uppercase">Expiry</th>
                    <th className="px-4 py-3 border-b text-left text-xs font-bold text-gray-500 uppercase">Dosage</th>
                    <th className="px-4 py-3 border-b text-center text-xs font-bold text-blue-600 uppercase">Total</th>
                    {displayedMonthInfo.dayHeaders.map(day => (
                      <th key={day} className={`px-2 py-3 border-b text-center text-[10px] font-bold min-w-[45px] ${displayedMonthInfo.monthIndex === actualTodayInfo.monthIndex && day === actualTodayInfo.day ? 'bg-yellow-200 text-yellow-800 border-x-2 border-yellow-400' : 'text-gray-500'}`}>
                        D{day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {prescriptionData.filter(chemical => 
                    chemical.chemical_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    chemical.brands.some(b => b.brand_name.toLowerCase().includes(searchTerm.toLowerCase()))
                  ).map((chemical, chemIdx) => (
                    chemical.brands.map((brand, brandIdx) => (
                      <tr key={`${chemIdx}-${brandIdx}`} className="hover:bg-blue-50 transition duration-150">
                        {brandIdx === 0 && (
                          <>
                            <td className="sticky left-0 z-10 bg-white px-3 py-4 border-b text-sm text-gray-500 font-medium" rowSpan={chemical.brands.length}>{chemical.s_no}</td>
                            <td className="sticky left-[50px] z-10 bg-white px-4 py-4 border-b text-sm font-bold text-gray-800" rowSpan={chemical.brands.length}>{chemical.chemical_name}</td>
                          </>
                        )}
                        <td className="px-4 py-4 border-b text-sm text-gray-700">{brand.brand_name}</td>
                        <td className="px-4 py-4 border-b text-xs text-center text-gray-500">{formatDateForAPI(brand.expiry_date)}</td>
                        <td className="px-4 py-4 border-b text-sm text-gray-600">{brand.dosage}</td>
                        <td className="px-4 py-4 border-b text-sm font-bold text-center text-blue-700 bg-blue-50/50">{brand.monthly_total}</td>
                        {displayedMonthInfo.dayHeaders.map(day => (
                          <td key={day} className={`p-1 border-b ${displayedMonthInfo.monthIndex === actualTodayInfo.monthIndex && day === actualTodayInfo.day ? 'bg-yellow-50 border-x-2 border-yellow-200' : ''}`}>
                            <input 
                              type="number" 
                              value={brand.daily_quantities[`day_${day}`]} 
                              onChange={(e) => handleQuantityChange(chemIdx, brandIdx, day, e.target.value)}
                              className={`w-full text-center text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400 rounded p-1 bg-transparent ${brand.daily_quantities[`day_${day}`] > 0 ? 'text-gray-900' : 'text-gray-300'}`}
                            />
                          </td>
                        ))}
                      </tr>
                    ))
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PrescriptionIn;