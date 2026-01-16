import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Sidebar from "../Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { 
    FiTrash2, FiSearch, FiUser, FiMail, 
    FiShield, FiFilter, FiRefreshCw, FiAlertCircle, 
    FiPhone,
    FiCheckCircle
} from "react-icons/fi";

const AdminDashboard = () => {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusMsg, setStatusMsg] = useState({ type: null, message: null });

    // --- Fetch Members ---
    const fetchMembers = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get("http://localhost:8000/members/list/");
            setMembers(response.data);
        } catch (error) {
            setStatusMsg({ type: "error", message: "Failed to load members." });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMembers();
    }, [fetchMembers]);

    // --- Delete Member ---
    const handleDelete = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;

        try {
            const response = await axios.post(`http://localhost:8000/members/delete/${id}/`);
            if (response.data.success) {
                // Remove from local state
                setMembers(prev => prev.filter(m => m.id !== id));
                setStatusMsg({ type: "success", message: `${name} deleted successfully.` });
            }
        } catch (error) {
            setStatusMsg({ type: "error", message: "Error deleting member." });
        }
        // Clear message after 3 seconds
        setTimeout(() => setStatusMsg({ type: null, message: null }), 3000);
    };

    // --- Filter Logic ---
    const filteredMembers = members.filter(m => 
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.aadhar.includes(searchTerm) ||
        (m.emp_no && m.emp_no.includes(searchTerm))
    );

    // Helper for role badges
    const getRoleStyle = (role) => {
        const roles = {
            admin: "bg-purple-100 text-purple-700 border-purple-200",
            doctor: "bg-red-100 text-red-700 border-red-200",
            nurse: "bg-blue-100 text-blue-700 border-blue-200",
            pharmacist: "bg-green-100 text-green-700 border-green-200",
            registration: "bg-amber-100 text-amber-700 border-amber-200"
        };
        return roles[role.toLowerCase()] || "bg-gray-100 text-gray-700 border-gray-200";
    };

    return (
        <div className="h-screen w-full flex bg-gradient-to-br from-blue-300 to-blue-400">
            <Sidebar />
            
            <div className="flex-1 flex flex-col p-4 md:p-10 overflow-hidden">
                <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Admin Dashboard</h1>
                        <p className="text-slate-500 font-medium">Manage existing OHC and External staff records.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={fetchMembers}
                            className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
                            title="Refresh Data"
                        >
                            <FiRefreshCw className={loading ? "animate-spin" : ""} />
                        </button>
                    </div>
                </header>

                {/* --- Stats & Search --- */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="md:col-span-3 relative">
                        <FiSearch className="absolute left-4 top-3.5 text-slate-400" size={20} />
                        <input 
                            type="text"
                            placeholder="Search by Name, Aadhar, or Employee Number..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                        />
                    </div>
                    <div className="bg-blue-600 rounded-xl p-4 text-white shadow-lg shadow-blue-200 flex items-center justify-evenly">
                        <span className="text-m font-bold uppercase tracking-wider opacity-80">Total Members</span>
                        <span className="text-2xl font-black">{filteredMembers.length}</span>
                    </div>
                </div>

                {/* --- Status Message --- */}
                <AnimatePresence>
                    {statusMsg.message && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className={`mb-6 p-4 rounded-xl flex items-center gap-3 border font-bold text-sm ${
                                statusMsg.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                            }`}
                        >
                            {statusMsg.type === 'success' ? <FiCheckCircle /> : <FiAlertCircle />}
                            {statusMsg.message}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* --- Members Table --- */}
                <div className="flex-1 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Member Info</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Professional</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Type</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Role</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Contact</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-20 text-center text-slate-400 font-bold">
                                            <FiRefreshCw className="animate-spin inline mr-2" /> Loading records...
                                        </td>
                                    </tr>
                                ) : filteredMembers.length > 0 ? (
                                    filteredMembers.map((member) => (
                                        <tr key={member.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold shadow-inner">
                                                        {member.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-black text-slate-800">{member.name}</div>
                                                        <div className="text-xs text-slate-500 font-mono">{member.aadhar}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-bold text-slate-700">{member.designation}</div>
                                                <div className="text-xs text-slate-400 font-medium">ID: {member.emp_no || 'N/A'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${
                                                    member.type === 'ohc' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-orange-50 text-orange-600 border-orange-100'
                                                }`}>
                                                    {member.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getRoleStyle(member.role)}`}>
                                                    {member.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                                                        <FiMail className="text-blue-500" /> {member.mail_id_Office}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                                                        <FiPhone className="text-blue-500" /> {member.phone_Office}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button 
                                                    onClick={() => handleDelete(member.id, member.name)}
                                                    className="p-2.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-sm flex items-center justify-center mx-auto"
                                                    title="Delete Member"
                                                >
                                                    <FiTrash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-20 text-center text-slate-400 font-bold">
                                            No members found matching your search.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;