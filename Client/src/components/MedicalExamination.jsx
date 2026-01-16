  import React, { useState } from "react";

  const MedicalExaminationForm = () => {
    const [formData, setFormData] = useState({});

    const handleChange = (e) => {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
      <div className="p-4 max-w-4xl mx-auto bg-white shadow-md rounded-lg">
        <h2 className="text-xl font-bold mb-4">Medical Examination Report (Canteen Workers)</h2>
        <form className="grid grid-cols-2 gap-4">
          {[
            "Name",
            "Age",
            "Sex",
            "Date",
            "Height",
            "Weight",
            "EMP No",
            "Chest Inspiration",
            "Chest Expiration",
            "General Examination",
            "Surgical/Medical History",
            "Contagious Diseases",
            "Skin & Scalp",
            "Ears",
            "Oral Cavity",
            "Fingers",
            "Trunk",
            "UL/LL",
            "CVS (BP, PR)",
            "RS (RR)",
            "Abdomen",
            "CNS",
            "Others",
            "General Hygiene",
            "Investigations",
            "Immunisation Status",
            "Smoking",
            "Alcohol",
            "Pann Chewing",
            "Fit/Unfit",
            "Staff Signature",
            "Individual Signature",
          ].map((field) => (
            <div key={field} className="flex flex-col">
              <label className="font-semibold">{field}:</label>
              <input
                type="text"
                name={field}
                value={formData[field] || ""}
                onChange={handleChange}
                className="border rounded p-2 mt-1"
              />
            </div>
          ))}
        </form>
      </div>
    );
  };

  export default MedicalExaminationForm;