import React, { useState } from "react";

const EyeFitnessCertificate = () => {
  const [formData, setFormData] = useState({
    dept: "",
    name: "",
    dob: "",
    ageSex: "",
    natureOfWork: "",
    dateOfEmployment: "",
    dateOfEyeExam: "",
    colorVision: "",
    result: "",
    remarks: "",
    ophthalmologistSign: ""
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <h2 className="text-xl font-bold text-center mb-4">
        EYE FITNESS CERTIFICATE
      </h2>
      <p className="text-center text-sm mb-4">
        For All Drivers & Locomotive Operators
        <br />(Crane, Forklift, Hydra, Boom Lift, Heavy Duty, Passenger Vehicle etc.)
      </p>
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Dept/Works", name: "dept" },
          { label: "Name", name: "name" },
          { label: "Date of Birth", name: "dob", type: "date" },
          { label: "Age/Sex", name: "ageSex" },
          { label: "Nature of Work", name: "natureOfWork" },
          { label: "Date of Employment", name: "dateOfEmployment", type: "date" },
          { label: "Date of Eye Examination", name: "dateOfEyeExam", type: "date" },
          { label: "Color Vision", name: "colorVision" }
        ].map((field, index) => (
          <div key={index}>
            <label className="block font-semibold">{field.label}</label>
            <input
              type={field.type || "text"}
              name={field.name}
              value={formData[field.name]}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
        ))}
      </div>

      <div className="mt-4">
        <label className="block font-semibold">Eye Exam Result</label>
        {[
          "FIT",
          "FIT WITH NEWLY PRESCRIBED GLASS",
          "FIT WITH EXISTING GLASS",
          "FIT WITH AN ADVICE TO CHANGE EXISTING GLASS WITH NEWLY PRESCRIBED GLASS",
          "UNFIT"
        ].map((option, index) => (
          <div key={index} className="flex items-center">
            <input
              type="radio"
              name="result"
              value={option}
              checked={formData.result === option}
              onChange={handleChange}
              className="mr-2"
            />
            <span>{option}</span>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <label className="block font-semibold">Remarks</label>
        <textarea
          name="remarks"
          value={formData.remarks}
          onChange={handleChange}
          className="w-full p-2 border rounded"
        />
      </div>

      <div className="mt-4">
        <label className="block font-semibold">Sign of Ophthalmologist with Registration Number & Seal</label>
        <input
          type="text"
          name="ophthalmologistSign"
          value={formData.ophthalmologistSign}
          onChange={handleChange}
          className="w-full p-2 border rounded"
        />
      </div>

      <button className="mt-6 w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
        Submit
      </button>
    </div>
  );
};

export default EyeFitnessCertificate;