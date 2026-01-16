import React, { useState } from "react";
import img from '../assets/logo.png'

const AlcoholPage = () => {
  const [formData, setFormData] = useState({
    employeeName: "",
    age: "",
    sex: "",
    empNo: "",
    department: "",
    natureOfWork: "",
    reportingTime: "",
    broughtToOHC: "",
    bp: "",
    pulseRate: "",
    respiratoryRate: "",
    spO2: "",
    alcoholBreathSmell: "",
    speech: "",
    drynessOfMouth: "",
    drynessOfLips: "",
    cnsPupilReaction: "",
    handTremors: "",
    alcoholAnalyzerStudy: "",
    remarks: "",
    advice: "",
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
        <img src={img} className="w-30 h-20" alt="logo" />
      </div>
      <h2 className="text-xl underline font-bold text-center mb-6">
        TO WHOMSOEVER IT MAY CONCERN
      </h2>
      <form onSubmit={handleSubmit} className="border-black border-2 p-6 rounded-lg space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <input type="text" name="employeeName" placeholder="Employee Name" value={formData.employeeName} onChange={handleChange} className="border p-2 rounded w-full" />
          <input type="text" name="age" placeholder="Age" value={formData.age} onChange={handleChange} className="border p-2 rounded w-full" />
          <input type="text" name="sex" placeholder="Sex" value={formData.sex} onChange={handleChange} className="border p-2 rounded w-full" />
          <input type="text" name="empNo" placeholder="Emp No" value={formData.empNo} onChange={handleChange} className="border p-2 rounded w-full" />
          <input type="text" name="department" placeholder="Department" value={formData.department} onChange={handleChange} className="border p-2 rounded w-full" />
          <input type="text" name="natureOfWork" placeholder="Nature of Work" value={formData.natureOfWork} onChange={handleChange} className="border p-2 rounded w-full" />
          <input type="text" name="reportingTime" placeholder="Reporting Time" value={formData.reportingTime} onChange={handleChange} className="border p-2 rounded w-full" />
          <input type="text" name="broughtToOHC" placeholder="Brought to OHC by" value={formData.broughtToOHC} onChange={handleChange} className="border p-2 rounded w-full" />
        </div>
        
        <h3 className="font-bold">Vital Signs</h3>
        <div className="grid grid-cols-2 gap-4">
          <input type="text" name="bp" placeholder="BP" value={formData.bp} onChange={handleChange} className="border p-2 rounded w-full" />
          <input type="text" name="pulseRate" placeholder="Pulse Rate" value={formData.pulseRate} onChange={handleChange} className="border p-2 rounded w-full" />
          <input type="text" name="respiratoryRate" placeholder="Respiratory Rate" value={formData.respiratoryRate} onChange={handleChange} className="border p-2 rounded w-full" />
          <input type="text" name="spO2" placeholder="SpO2" value={formData.spO2} onChange={handleChange} className="border p-2 rounded w-full" />
        </div>
        
        <h3 className="font-bold">Observations</h3>
        <div className="grid grid-cols-2 gap-4">
          <input type="text" name="alcoholBreathSmell" placeholder="Alcohol Breath Smell" value={formData.alcoholBreathSmell} onChange={handleChange} className="border p-2 rounded w-full" />
          <input type="text" name="speech" placeholder="Speech" value={formData.speech} onChange={handleChange} className="border p-2 rounded w-full" />
          <input type="text" name="drynessOfMouth" placeholder="Dryness of Mouth" value={formData.drynessOfMouth} onChange={handleChange} className="border p-2 rounded w-full" />
          <input type="text" name="drynessOfLips" placeholder="Dryness of Lips" value={formData.drynessOfLips} onChange={handleChange} className="border p-2 rounded w-full" />
          <input type="text" name="cnsPupilReaction" placeholder="CNS Pupil Reaction" value={formData.cnsPupilReaction} onChange={handleChange} className="border p-2 rounded w-full" />
          <input type="text" name="handTremors" placeholder="Hand Tremors" value={formData.handTremors} onChange={handleChange} className="border p-2 rounded w-full" />
          <input type="text" name="alcoholAnalyzerStudy" placeholder="Alcohol Analyzer Study" value={formData.alcoholAnalyzerStudy} onChange={handleChange} className="border p-2 rounded w-full" />
        </div>
        
        <textarea name="remarks" placeholder="Remarks" value={formData.remarks} onChange={handleChange} className="border p-2 rounded w-full"></textarea>
        <textarea name="advice" placeholder="Advice" value={formData.advice} onChange={handleChange} className="border p-2 rounded w-full"></textarea>
        
        <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600">Submit</button>
      </form>
    </div>
  );
};

export default AlcoholPage;
