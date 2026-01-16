import React, { useState } from 'react';

// --- Reusable Helper Components ---

/**
 * A component to display a label and its corresponding value in a consistent format.
 * It gracefully handles empty or null values.
 */
const DataRow = ({ label, value, isTextArea = false }) => {
  if (value === null || value === undefined || value === '') {
    return null; // Don't render the row if there's no data
  }

  return (
    <div className="flex flex-col sm:flex-row py-2 border-b border-gray-200 last:border-b-0">
      <dt className="w-full sm:w-1/3 lg:w-1/4 font-semibold text-gray-600 pr-4">{label}</dt>
      <dd className="w-full sm:w-2/3 lg:w-3/4 text-gray-800 mt-1 sm:mt-0">
        {isTextArea ? (
          <pre className="whitespace-pre-wrap bg-gray-50 p-2 rounded-md font-sans">{value}</pre>
        ) : (
          value
        )}
      </dd>
    </div>
  );
};

/**
 * A component to render the table for family members (Spouses/Children).
 * Includes a fix for "members.map is not a function" error.
 */
const FamilyMemberTable = ({ title, members, tableStyle, headerStyle, cellStyle }) => {
  
  // FIX: Ensure 'members' is always an array before trying to map it.
  let safeMembers = [];
  
  if (Array.isArray(members)) {
    // It's already an array
    safeMembers = members;
  } else if (members && typeof members === 'object') {
    // It's an object (single record), wrap it in an array to prevent crash
    safeMembers = [members];
  }
  // If null/undefined, safeMembers remains []

  if (safeMembers.length === 0) {
    return (
      <div className="mt-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
        <p className="text-gray-500 italic">No data recorded.</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{title} ({safeMembers.length})</h3>
      <div className="overflow-x-auto">
        <table style={tableStyle}>
          <thead>
            <tr style={headerStyle}>
              <th style={cellStyle}>Sex</th>
              <th style={cellStyle}>DOB</th>
              <th style={cellStyle}>Age</th>
              <th style={cellStyle}>Status</th>
              <th style={cellStyle}>Reason (If Expired)</th>
              <th style={cellStyle}>Remarks (Health)</th>
            </tr>
          </thead>
          <tbody>
            {safeMembers.map((member, index) => (
              <tr key={index}>
                <td style={cellStyle}>{member?.sex || 'N/A'}</td>
                <td style={cellStyle}>{member?.dob || 'N/A'}</td>
                <td style={cellStyle}>{member?.age || 'N/A'}</td>
                <td style={cellStyle}>{member?.status || 'N/A'}</td>
                <td style={cellStyle}>{member?.reason || 'N/A'}</td>
                <td style={cellStyle}>{member?.remarks || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};


// --- Main Component ---

const MedicalHistory1 = ({ data }) => {
  // console.log(data.medicalhistory) 
  // Check for valid data, otherwise show a message
  if (!data || !data?.medicalhistory) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-700">Medical History</h2>
        <p className="mt-4 text-gray-500">No medical history data available for this patient.</p>
      </div>
    );
  }

  const patient = data;
  const history = patient.medicalhistory;
  const patientSex = patient.sex || "";

  // State for collapsible sections
  const [showMedicalHistory, setShowMedicalHistory] = useState(true);
  const [showFamilyHistory, setShowFamilyHistory] = useState(true);

  // --- Styles (copied for consistency) ---
  const cardStyle = { backgroundColor: "#f8f9fa", borderRadius: "8px", padding: "1rem", marginBottom: "1rem", boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" };
  const headerStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", cursor: "pointer" };
  const titleStyle = { fontSize: "1.25rem", fontWeight: "600" };
  const tableContainerStyle = { overflowX: "auto" };
  const tableStyle = { width: "100%", borderCollapse: "collapse", backgroundColor: "white", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)", borderRadius: "0.5rem" };
  const tableHeaderStyle = { backgroundColor: "#e9ecef", textAlign: "left" };
  const cellStyle = { padding: "0.75rem", borderBottom: "1px solid #dee2e6", verticalAlign: 'top' };
  
  // Helper function to format habit details
  const formatHabit = (habit) => {
    if (!habit || !habit.yesNo || habit.yesNo === 'no') return 'No';
    let details = habit.yesNo.charAt(0).toUpperCase() + habit.yesNo.slice(1);
    if (habit.yesNo === 'yes') {
      const parts = [];
      if (habit.years) parts.push(`${habit.years} years`);
      if (habit.perDay) parts.push(`${habit.perDay}/day`);
      if (habit.frequency) parts.push(`${habit.frequency}/day`);
      if (parts.length > 0) details += ` (${parts.join(', ')})`;
    }
    return details;
  };

  const getHistoryText = (item) => {
    const history = item?.children || [];
    return history.length > 0 ? history.join('\n') : <span className="text-gray-500 italic">None reported</span>;
  };

  return (
    <div className="p-4 md:p-6 bg-gray-100 font-sans">

      {/* Personal History Section */}
      <div className="mb-6 p-4 border rounded-lg bg-white shadow-sm">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Personal History</h2>
        <dl>
          <DataRow label="Diet" value={history.personal_history?.diet} />
          <DataRow label="Smoking" value={formatHabit(history.personal_history?.smoking)} />
          <DataRow label="Alcohol" value={formatHabit(history.personal_history?.alcohol)} />
          <DataRow label="Paan/Beetle" value={formatHabit(history.personal_history?.paan)} />
        </dl>
      </div>
      
      {/* Patient's Medical History Section */}
      <div style={cardStyle}>
        <div style={headerStyle} onClick={() => setShowMedicalHistory(!showMedicalHistory)}>
          <h2 style={titleStyle}>Patient Medical History</h2>
          <span className="text-lg font-semibold">{showMedicalHistory ? "[-]" : "[+]"}</span>
        </div>
        {showMedicalHistory && (
          <div style={tableContainerStyle}>
            <table style={tableStyle}>
              <thead>
                <tr style={tableHeaderStyle}>
                  <th style={{...cellStyle, width: '30%'}}>Condition</th>
                  <th style={cellStyle}>History Details</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { key: 'HTN', label: 'HTN' }, { key: 'DM', label: 'DM' },
                  { key: 'Hyper_Thyroid', label: 'Hyper Thyroid' }, { key: 'Hypo_Thyroid', label: 'Hypo Thyroid' },
                  { key: 'Epileptic', label: 'Epileptic' }, { key: 'Vertigo', label: 'Vertigo' },
                  { key: 'Asthma', label: 'Asthma' }, { key: 'Mental_Illness', label: 'Mental Illness' },
                  { key: 'CNS', label: 'CNS' }, { key: 'CVS', label: 'CVS' }, { key: 'RS', label: 'RS' },
                  { key: 'ENT', label: 'ENT' }, { key: 'GIT', label: 'GIT' }, { key: 'KUB', label: 'KUB' },
                  { key: 'Musculo_Skeletal', label: 'Musculo Skeletal' }, { key: 'Skin', label: 'Skin' },
                  { key: 'Dental_Oral', label: 'Dental/Oral' }, { key: 'Cancer', label: 'Cancer' },
                  { key: 'Defective_Colour_Vision', label: 'Defective Colour Vision' },
                ].map(({ key, label }) => (
                  <tr key={key}>
                    <td style={cellStyle}>{label}</td>
                    <td style={cellStyle}><pre className="whitespace-pre-wrap font-sans">{getHistoryText(history.medical_data?.[key])}</pre></td>
                  </tr>
                ))}
                
                {patientSex === 'Male' && (
                  <tr>
                    <td style={cellStyle}>Prostate & Genital</td>
                    <td style={cellStyle}><pre className="whitespace-pre-wrap font-sans">{getHistoryText(history.medical_data?.Prostate_Genital)}</pre></td>
                  </tr>
                )}

                {(patientSex === 'Female' || patientSex === 'Other') && (
                  <>
                    <tr>
                      <td style={cellStyle}>Obstetric History</td>
                      <td style={cellStyle}><pre className="whitespace-pre-wrap font-sans">{getHistoryText(history.medical_data?.Obstetric)}</pre></td>
                    </tr>
                    <tr>
                      <td style={cellStyle}>Gynaecological History</td>
                      <td style={cellStyle}><pre className="whitespace-pre-wrap font-sans">{getHistoryText(history.medical_data?.Gynaec)}</pre></td>
                    </tr>
                  </>
                )}

                <tr>
                  <td style={cellStyle}>Others</td>
                  <td style={cellStyle}><pre className="whitespace-pre-wrap font-sans">{getHistoryText(history.medical_data?.Others)}</pre></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Surgical & Allergy History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-6">
        <div className="p-4 border rounded-lg bg-white shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Surgical History</h2>
          <DataRow label="Details" value={getHistoryText(history.surgical_history)} isTextArea={true} />
        </div>
        <div className="p-4 border rounded-lg bg-white shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Allergy History</h2>
          <dl>
            <DataRow label="Drug Allergy" value={`${history.allergy_fields?.drug?.yesNo === 'yes' ? 'Yes' : 'No'}${history.allergy_fields?.drug?.yesNo === 'yes' ? `: ${history.allergy_comments?.drug || ''}` : ''}`} />
            <DataRow label="Food Allergy" value={`${history.allergy_fields?.food?.yesNo === 'yes' ? 'Yes' : 'No'}${history.allergy_fields?.food?.yesNo === 'yes' ? `: ${history.allergy_comments?.food || ''}` : ''}`} />
            <DataRow label="Other Allergies" value={`${history.allergy_fields?.others?.yesNo === 'yes' ? 'Yes' : 'No'}${history.allergy_fields?.others?.yesNo === 'yes' ? `: ${history.allergy_comments?.others || ''}` : ''}`} />
          </dl>
        </div>
      </div>

      {/* Family History Card */}
      <div style={cardStyle}>
        <div style={headerStyle} onClick={() => setShowFamilyHistory(!showFamilyHistory)}>
          <h2 style={titleStyle}>Family History</h2>
          <span className="text-lg font-semibold">{showFamilyHistory ? "[-]" : "[+]"}</span>
        </div>
        {showFamilyHistory && (
          <div className="p-2 md:p-4">
            <h3 className="text-lg font-semibold mt-2 mb-3 text-gray-800">Parents & Grandparents</h3>
            <div className="overflow-x-auto">
              <table style={tableStyle}>
                <thead><tr style={tableHeaderStyle}>
                  <th style={cellStyle}>Relative</th><th style={cellStyle}>Status</th><th style={cellStyle}>Reason (If Expired)</th><th style={cellStyle}>Remarks (Health)</th>
                </tr></thead>
                <tbody>
                  {[
                    { label: "Father", key: "father" }, { label: "Mother", key: "mother" },
                    { label: "Paternal Grand Father", key: "paternalGrandFather" }, { label: "Paternal Grand Mother", key: "paternalGrandMother" },
                    { label: "Maternal Grand Father", key: "maternalGrandFather" }, { label: "Maternal Grand Mother", key: "maternalGrandMother" },
                  ].map(({ label, key }) => (
                    <tr key={key}>
                      <td style={cellStyle}>{label}</td>
                      <td style={cellStyle}>{history.family_history?.[key]?.status || 'N/A'}</td>
                      <td style={cellStyle}>{history.family_history?.[key]?.reason || 'N/A'}</td>
                      <td style={cellStyle}>{history.family_history?.[key]?.remarks || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="text-lg font-semibold mt-6 mb-3 text-gray-800">Family Medical Conditions</h3>
             <div style={tableContainerStyle}>
              <table style={tableStyle}>
                <thead style={tableHeaderStyle}>
                  <tr><th style={{...cellStyle, width: '30%'}}>Condition</th><th style={cellStyle}>Details / Comments</th></tr>
                </thead>
                <tbody>
                   {[
                    { key: 'HTN', label: 'HTN' }, { key: 'DM', label: 'DM' }, { key: 'Hyper_Thyroid', label: 'Hyper thyroid' },
                    { key: 'Hypo_Thyroid', label: 'Hypo thyroid' }, { key: 'Epileptic', label: 'Epileptic' },
                    { key: 'Vertigo', label: 'Vertigo' }, { key: 'Asthma', label: 'Asthma' }, { key: 'Mental_Illness', label: 'Mental Illness' },
                    { key: 'CNS', label: 'CNS' }, { key: 'CVS', label: 'CVS' }, { key: 'RS', label: 'RS' }, { key: 'ENT', label: 'ENT' },
                    { key: 'GIT', label: 'GIT' }, { key: 'KUB', label: 'KUB' }, { key: 'Musculo_Skeletal', label: 'Musculo Skeletal' },
                    { key: 'Skin', label: 'Skin' }, { key: 'Dental_Oral', label: 'Dental /Oral' }, { key: 'Cancer', label: 'CANCER' },
                    { key: 'Defective_Colour_Vision', label: 'Defective Colour Vision' }, { key: 'Others', label: 'OTHERS' },
                  ].concat(
                    (patientSex === 'Male') ? [{ key: 'Prostate_Genital', label: 'Prostate & Genital' }] : []
                  ).concat(
                    (patientSex === 'Female' || patientSex === 'Other') ? [
                      { key: 'Obstetric', label: 'Obstetric' }, { key: 'Gynaec', label: 'Gynaec' }
                    ] : []
                  ).map(({ key, label }) => (
                    <tr key={key}>
                        <td style={cellStyle}>{label}</td>
                        <td style={cellStyle}>{history.family_history?.[key]?.comment || <span className="text-gray-500 italic">None reported</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <FamilyMemberTable title="Spouse(s)" members={history.spouse_data} tableStyle={tableStyle} headerStyle={tableHeaderStyle} cellStyle={cellStyle} />
            <FamilyMemberTable title="Children" members={history.children_data} tableStyle={tableStyle} headerStyle={tableHeaderStyle} cellStyle={cellStyle} />
          </div>
        )}
      </div>
    </div>
  );
};

export default MedicalHistory1;