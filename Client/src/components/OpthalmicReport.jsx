import React, { useState } from "react";

const OphthalmicReport = () => {
  const [formData, setFormData] = useState({
    contName: "",
    designation: "",
    patientName: "",
    age: "",
    date: "",
    rightEyeDistance: "",
    leftEyeDistance: "",
    rightEyeNear: "",
    leftEyeNear: "",
    anteriorSegment: "",
    fundus: "",
    colourVision: "",
    advice: "",
    ophthalmologistName: "",
    signature: ""
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white shadow-lg rounded-lg">
      <h2 className="text-xl font-bold text-center mb-4">Ophthalmic Report</h2>
      <div className="grid grid-cols-2 gap-4">
        <input name="contName" placeholder="Cont Name" className="border p-2" onChange={handleChange} />
        <input name="designation" placeholder="Designation" className="border p-2" onChange={handleChange} />
        <input name="patientName" placeholder="Name of Patient" className="border p-2" onChange={handleChange} />
        <input name="age" placeholder="Age" className="border p-2" onChange={handleChange} />
        <input name="date" placeholder="Date" type="date" className="border p-2" onChange={handleChange} />
      </div>
      <h3 className="font-semibold mt-4">Vision</h3>
      <div className="grid grid-cols-2 gap-4">
        <input name="rightEyeDistance" placeholder="Right Eye Distance" className="border p-2" onChange={handleChange} />
        <input name="leftEyeDistance" placeholder="Left Eye Distance" className="border p-2" onChange={handleChange} />
        <input name="rightEyeNear" placeholder="Right Eye Near" className="border p-2" onChange={handleChange} />
        <input name="leftEyeNear" placeholder="Left Eye Near" className="border p-2" onChange={handleChange} />
      </div>
      <h3 className="font-semibold mt-4">Other Tests</h3>
      <input name="anteriorSegment" placeholder="Anterior Segment" className="border p-2 w-full mt-2" onChange={handleChange} />
      <input name="fundus" placeholder="Fundus" className="border p-2 w-full mt-2" onChange={handleChange} />
      <input name="colourVision" placeholder="Colour Vision" className="border p-2 w-full mt-2" onChange={handleChange} />
      <input name="advice" placeholder="Advice" className="border p-2 w-full mt-2" onChange={handleChange} />
      <h3 className="font-semibold mt-4">Doctor Details</h3>
      <input name="ophthalmologistName" placeholder="Ophthalmologist Name" className="border p-2 w-full" onChange={handleChange} />
      <input name="signature" placeholder="Signature" className="border p-2 w-full mt-2" onChange={handleChange} />
      <button className="mt-4 bg-blue-500 text-white px-4 py-2 rounded">Submit</button>
    </div>
  );
};

export default OphthalmicReport;