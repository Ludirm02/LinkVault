import React, { useState } from "react";
import axios from "axios";
import { Trash2, Key, FileDigit, Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

const ManualDelete = () => {
  const [uniqueId, setUniqueId] = useState("");
  const [deleteToken, setDeleteToken] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!uniqueId || !deleteToken) return toast.error("Please fill in both fields");
    
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      
      // We send the deleteToken in the body
      await axios.post(`http://localhost:5000/api/upload/delete/${uniqueId}`, 
        { deleteToken },
        { headers: token ? { "x-auth-token": token } : {} }
      );

      toast.success("File deleted permanently!");
      setUniqueId("");
      setDeleteToken("");
    } catch (err) {
      const msg = err.response?.data?.error || "Delete failed. Check your ID and Token.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        className="w-full max-w-md bg-gray-800 rounded-3xl p-8 shadow-2xl border border-gray-700/50 backdrop-blur-xl"
      >
        <div className="text-center mb-8">
          <div className="bg-red-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-3xl font-bold text-white">Manual Deletion</h1>
          <p className="text-gray-400 mt-2 text-sm">Permanently remove a file using its secure token.</p>
        </div>

        <div className="space-y-4">
          {/* File ID Input */}
          <div className="group">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">File Unique ID</label>
            <div className="flex items-center bg-gray-900/50 border border-gray-600 rounded-xl px-4 focus-within:border-red-500 transition-colors">
              <FileDigit className="w-5 h-5 text-gray-500 group-focus-within:text-red-500" />
              <input 
                type="text" 
                placeholder="e.g. a1b2c3d4" 
                value={uniqueId}
                onChange={(e) => setUniqueId(e.target.value)}
                className="w-full bg-transparent border-none text-white py-3 px-3 focus:ring-0 outline-none font-mono"
              />
            </div>
          </div>

          {/* Delete Token Input */}
          <div className="group">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">Secret Delete Token</label>
            <div className="flex items-center bg-gray-900/50 border border-gray-600 rounded-xl px-4 focus-within:border-red-500 transition-colors">
              <Key className="w-5 h-5 text-gray-500 group-focus-within:text-red-500" />
              <input 
                type="text" 
                placeholder="Paste token here..." 
                value={deleteToken}
                onChange={(e) => setDeleteToken(e.target.value)}
                className="w-full bg-transparent border-none text-white py-3 px-3 focus:ring-0 outline-none font-mono"
              />
            </div>
          </div>

          <button 
            onClick={handleDelete} 
            disabled={loading} 
            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-red-500/25 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
            {loading ? "Deleting..." : "Permanently Delete"}
          </button>
        </div>

        <div className="mt-6 bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex gap-3 items-start">
            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-200/80 leading-relaxed">
              <strong>Warning:</strong> This action cannot be undone. Once deleted, the file is removed from our servers and Cloudinary instantly.
            </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ManualDelete;