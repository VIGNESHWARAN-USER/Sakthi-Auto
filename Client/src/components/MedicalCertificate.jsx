import React, { useState } from "react";
import img from '../assets/logo.png'
const MedicalCertificate = () => {
  const [formData, setFormData] = useState({
    employeeName: "",
    age: "",
    sex: "",
    date: "",
    empNo: "",
    department: "",
    natureOfWork: "",
    covidVaccination: "",
    diagnosis: "",
    leaveFrom: "",
    leaveUpTo: "",
    daysLeave: "",
    rejoiningDate: "",
    shift: "",
    pr: "",
    sp02: "",
    temp: "",
    certificateFrom: "",
    note: "",
    ohcStaffSignature: "",
    individualSignature: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Submitted Data:", formData);
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-6 m-6 shadow-lg rounded-lg">
        <div className="w-full flex justify-end mb-4">
        <img src = {img} className="w-30 h-20"></img>
        </div>
      <h2 className="text-xl underline font-bold text-center mb-6">
        Medical Certificate of Fitness to Return Duty
      </h2>
      <form onSubmit={handleSubmit} className=" border-black border-2 p-6 rounded-lg space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <input type="text" name="employeeName" placeholder="Employee Name" value={formData.employeeName} onChange={handleChange} className="border p-2 rounded w-full" />
          <input type="text" name="age" placeholder="Age" value={formData.age} onChange={handleChange} className="border p-2 rounded w-full" />
          <input type="text" name="sex" placeholder="Sex" value={formData.sex} onChange={handleChange} className="border p-2 rounded w-full" />
          <input type="date" name="date" value={formData.date} onChange={handleChange} className="border p-2 rounded w-full" />
          <input type="text" name="empNo" placeholder="Emp No" value={formData.empNo} onChange={handleChange} className="border p-2 rounded w-full" />
          <input type="text" name="department" placeholder="Department" value={formData.department} onChange={handleChange} className="border p-2 rounded w-full" />
          <input type="text" name="JswContract" placeholder="Jsw Contract" value={formData.jswcontract} onChange={handleChange} className="border p-2 rounded w-full" />
          <input type="text" name="natureOfWork" placeholder="Nature of Work" value={formData.natureOfWork} onChange={handleChange} className="border p-2 rounded w-full" />
          
        </div>
        <select name="covidVaccination" value={formData.covidVaccination} onChange={handleChange} className="border p-2 rounded w-full">
            <option value="">Covid Vaccination</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        <textarea name="diagnosis" placeholder="Diagnosis (Disease/Condition)" value={formData.diagnosis} onChange={handleChange} className="border p-2 rounded w-full"></textarea>

        <div className="grid grid-cols-2 gap-4">
          <input type="date" name="leaveFrom" value={formData.leaveFrom} onChange={handleChange} className="border p-2 rounded w-full" />
          <input type="date" name="leaveUpTo" value={formData.leaveUpTo} onChange={handleChange} className="border p-2 rounded w-full" />
          <input type="number" name="daysLeave" placeholder="Number of Days Leave" value={formData.daysLeave} onChange={handleChange} className="border p-2 rounded w-full" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <input type="date" name="rejoiningDate" placeholder="Rejoining Duty On" value={formData.rejoiningDate} onChange={handleChange} className="border p-2 rounded w-full" />
          <select name="shift" value={formData.shift} onChange={handleChange} className="border p-2 rounded w-full">
            <option value="">Select Shift</option>
            <option value="G">G</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <input type="text" name="pr" placeholder="PR" value={formData.pr} onChange={handleChange} className="border p-2 rounded w-full" />
          <input type="text" name="sp02" placeholder="SPO2" value={formData.sp02} onChange={handleChange} className="border p-2 rounded w-full" />
          <input type="text" name="temp" placeholder="Temp" value={formData.temp} onChange={handleChange} className="border p-2 rounded w-full" />
        </div>

        <div>
          <label className="font-bold">Certificate Issued From:</label>
          <div className="flex gap-4 mt-2">
            <label><input type="radio" name="certificateFrom" value="Govt Hospital" onChange={handleChange} /> Govt Hospital</label>
            <label><input type="radio" name="certificateFrom" value="ESI Hospital" onChange={handleChange} /> ESI Hospital</label>
            <label><input type="radio" name="certificateFrom" value="Private Hospital" onChange={handleChange} /> Private Hospital</label>
          </div>
        </div>

        <textarea name="note" placeholder="Note" value={formData.note} onChange={handleChange} className="border p-2 rounded w-full"></textarea>

        <div className="grid grid-cols-2 gap-4">
          <input type="text" name="ohcStaffSignature" placeholder="OHC Staff Signature" value={formData.ohcStaffSignature} onChange={handleChange} className="border p-2 rounded w-full" />
          <input type="text" name="individualSignature" placeholder="Individual Signature" value={formData.individualSignature} onChange={handleChange} className="border p-2 rounded w-full" />
        </div>

        <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600">Submit</button>
      </form>
    </div>
  );
};


export default MedicalCertificate