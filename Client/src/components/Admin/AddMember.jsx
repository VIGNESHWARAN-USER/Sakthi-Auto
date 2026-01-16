import React, { useState, useCallback } from "react";
import Select from 'react-select';
import Sidebar from "../Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import axios from 'axios';
import { 
    FiSearch, FiUserPlus, FiAlertCircle, FiCheckCircle, 
    FiRefreshCw, FiUser, FiHome, FiMail, FiPhone, 
    FiCalendar, FiBriefcase, FiShield, FiLock 
} from "react-icons/fi";

// --- Initial Form States (Aligned with New Member Model) ---
const initialFormState = {
    name: "", 
    emp_no: "", 
    designation: "", 
    mail_id_Office: "", 
    mail_id_Personal: "",
    phone_Office: "",
    phone_Personal: "",
    job_nature: "",
    doj: "",
    role: null, 
    date_exited: "",
    hospital_name: "",
    password: ""
};

const roleOptions = [
    { value: 'nurse', label: 'Nurse' },
    { value: 'doctor', label: 'Doctor' },
    { value: 'pharmacist', label: 'Pharmacist' },
    { value: 'camp_nurse', label: 'Camp Nurse' },
    { value: 'camp_doctor', label: 'Camp Doctor' },
    { value: 'hr', label: 'HR' },
];

const customSelectStyles = {
    control: (base, state) => ({
        ...base,
        backgroundColor: '#dbeafe', // bg-blue-100
        borderColor: '#d1d5db',
        borderRadius: '0.5rem',
        padding: '3px',
        boxShadow: state.isFocused ? '0 0 0 2px #3b82f6' : 'none',
        '&:hover': { borderColor: '#9ca3af' }
    })
};

// --- Reusable Components ---
const SectionHeader = ({ title, icon: Icon }) => (
    <div className="col-span-full border-b border-blue-100 pb-2 mt-4 flex items-center gap-2 text-blue-800 font-bold uppercase text-xs tracking-widest">
        <Icon size={16} /> {title}
    </div>
);

const CustomInput = ({ label, name, value, onChange, type = "text", placeholder, required = false, readOnly = false, icon: Icon }) => (
    <div className="flex flex-col gap-1">
        <label className="text-xs font-bold text-gray-600 ml-1">{label} {required && "*"}</label>
        <div className="relative">
            {Icon && <Icon className="absolute left-3 top-3 text-blue-500" size={16} />}
            <input
                name={name}
                value={value || ''}
                onChange={onChange}
                type={type}
                placeholder={placeholder}
                required={required}
                readOnly={readOnly}
                className={`pl-10 pr-4 py-2.5 w-full border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                    readOnly ? 'bg-gray-200 cursor-not-allowed text-gray-500' : 'bg-blue-100 hover:bg-blue-200 focus:bg-white'
                }`}
            />
        </div>
    </div>
);

function AddMember() {
    const accessLevel = localStorage.getItem('accessLevel');
    const navigate = useNavigate();

    const [searchAadhar, setSearchAadhar] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchStatus, setSearchStatus] = useState({ type: null, message: null });
    const [showForm, setShowForm] = useState(false);
    const [memberId, setMemberId] = useState(null);
    const [memberType, setMemberType] = useState(''); // 'ohc' or 'external'
    const [formData, setFormData] = useState(initialFormState);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState({ type: null, message: null });

    const handleReset = useCallback(() => {
        setSearchAadhar('');
        setSearchStatus({ type: null, message: null });
        setSubmitStatus({ type: null, message: null });
        setShowForm(false);
        setMemberId(null);
        setMemberType('');
        setFormData(initialFormState);
    }, []);

    const handleSearch = async () => {
        if (searchAadhar.length !== 12) {
            setSearchStatus({ type: 'error', message: "Enter a valid 12-digit Aadhar." });
            return;
        }
        setIsSearching(true);
        setSearchStatus({ type: null, message: null });

        try {
            const res = await axios.get(`http://localhost:8000/find_member_by_aadhar/?aadhar=${searchAadhar}`);
            const { member, mode, message } = res.data;

            setMemberId(member.id);
            setMemberType(member.memberTypeDetermined || 'ohc');
            
            // Map backend single role string back to select option
            const currentRole = roleOptions.find(opt => opt.value === member.role) || null;

            setFormData({
                ...member,
                role: currentRole,
                doj: member.doj || "",
                date_exited: member.date_exited || "",
            });

            setShowForm(true);
            setSearchStatus({ type: mode === 'update' ? 'success' : 'info', message });
        } catch (err) {
            setSearchStatus({ type: 'error', message: err.response?.data?.message || "Not found." });
            setShowForm(false);
        } finally {
            setIsSearching(false);
        }
    };

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleRoleChange = (selected) => setFormData(prev => ({ ...prev, role: selected }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        const payload = {
            ...formData,
            aadhar: searchAadhar,
            role: formData.role?.value || "", 
            type: memberType
        };

        try {
            const url = memberId ? `http://localhost:8000/members/update/${memberId}/` : "http://localhost:8000/members/add/";
            await axios({ method: 'post', url, data: payload });
            
            setSubmitStatus({ type: 'success', message: memberId ? "Record Updated!" : "Member Registered!" });
            if (!memberId) setTimeout(handleReset, 2000);
        } catch (err) {
            setSubmitStatus({ type: 'error', message: "Save failed. Check required fields." });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (accessLevel !== "admin") return <div className="p-20 text-center font-bold text-red-600">Admin Access Required</div>;

    return (
        <div className="h-screen w-full flex bg-gradient-to-br from-blue-300 to-blue-400">
            <Sidebar />
            <div className="flex-1 flex flex-col p-4 md:p-8 overflow-hidden">
                <div className="mb-6 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                            <FiUserPlus className="text-blue-600" /> {memberId ? 'Update Profile' : 'New Registration'}
                        </h1>
                        <p className="text-slate-500 text-sm font-medium">Verify via Aadhar to begin.</p>
                    </div>
                </div>

                {/* --- Search Bar --- */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6 flex items-end gap-4">
                    <div className="w-80">
                        <CustomInput 
                            label="Verification Aadhar" 
                            name="searchAadhar" 
                            value={searchAadhar} 
                            placeholder="12 Digit Number"
                            maxLength={12}
                            icon={FiShield}
                            onChange={(e) => setSearchAadhar(e.target.value.replace(/\D/g, ""))}
                        />
                    </div>
                    <button 
                        onClick={handleSearch} 
                        disabled={isSearching || searchAadhar.length !== 12}
                        className="bg-blue-600 text-white px-8 py-2.5 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSearching ? <FiRefreshCw className="animate-spin" /> : <FiSearch />} Search
                    </button>
                    <button onClick={handleReset} className="text-slate-400 hover:text-slate-600 font-bold px-4 py-2.5 transition-all">Reset</button>
                    
                    {searchStatus.message && (
                        <div className={`ml-4 mb-2 text-sm font-bold flex items-center gap-2 ${searchStatus.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>
                            {searchStatus.type === 'error' ? <FiAlertCircle /> : <FiCheckCircle />} {searchStatus.message}
                        </div>
                    )}
                </div>

                {/* --- Form Section --- */}
                <AnimatePresence>
                    {showForm && (
                        <motion.form 
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            onSubmit={handleSubmit}
                            className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col"
                        >
                            <div className="p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-6">
                                
                               

                                {/* --- Personal & Professional --- */}
                                <SectionHeader title="Professional Identity" icon={FiBriefcase} />
                                <CustomInput label="Full Name" name="name" value={formData.name} onChange={handleChange} icon={FiUser} required />
                                <CustomInput label="Employee No (Login ID)" name="emp_no" value={formData.emp_no} onChange={handleChange} icon={FiShield} required />
                                <CustomInput label="Designation" name="designation" value={formData.designation} onChange={handleChange} icon={FiBriefcase} required />
                                
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-bold text-gray-600 ml-1">Access Role *</label>
                                    <Select 
                                        options={roleOptions} 
                                        styles={customSelectStyles} 
                                        value={formData.role} 
                                        onChange={handleRoleChange} 
                                        placeholder="Choose Role..."
                                    />
                                </div>
                                <CustomInput label="Date of Joining" name="doj" type="date" value={formData.doj} onChange={handleChange} icon={FiCalendar} />
                                {memberType === 'external' && <CustomInput label="Hospital Name" name="hospital_name" value={formData.hospital_name} onChange={handleChange} icon={FiHome} required />}

                                {/* --- Contact Details --- */}
                                <SectionHeader title="Contact Information" icon={FiPhone} />
                                <CustomInput label="Office Email" name="mail_id_Office" type="email" value={formData.mail_id_Office} onChange={handleChange} icon={FiMail} />
                                <CustomInput label="Personal Email" name="mail_id_Personal" type="email" value={formData.mail_id_Personal} onChange={handleChange} icon={FiMail} required/>
                                <CustomInput label="Office Phone" name="phone_Office" type="tel" value={formData.phone_Office} onChange={handleChange} icon={FiPhone} />
                                <CustomInput label="Personal Phone" name="phone_Personal" type="tel" value={formData.phone_Personal} onChange={handleChange} icon={FiPhone} />
                                <CustomInput label="Nature of Job" name="job_nature" value={formData.job_nature} onChange={handleChange} icon={FiUser} />

                                
                            </div>

                            {/* --- Footer Action --- */}
                            <div className="bg-slate-50 p-6 border-t flex items-center justify-between">
                                <div>
                                    {submitStatus.message && (
                                        <div className={`font-black text-sm uppercase flex items-center gap-2 ${submitStatus.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                                            {submitStatus.type === 'success' ? <FiCheckCircle /> : <FiAlertCircle />} {submitStatus.message}
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !memberType}
                                    className="bg-green-600 hover:bg-green-700 text-white px-12 py-3 rounded-xl font-black shadow-lg shadow-green-200 transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isSubmitting ? <FiRefreshCw className="animate-spin" /> : <FiCheckCircle />}
                                    {memberId ? 'UPDATE PROFILE' : 'ADD PROFILE'}
                                </button>
                            </div>
                        </motion.form>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

export default AddMember;