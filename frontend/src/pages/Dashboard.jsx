import React, { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  FileText, Trash2, Eye, Clock, Copy, Check, 
  BarChart3, Shield, Activity, Calendar 
} from "lucide-react";
import toast from "react-hot-toast";

const Dashboard = () => {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [stats, setStats] = useState({ totalFiles: 0, totalViews: 0, activeLinks: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Get Username
    const storedUser = localStorage.getItem("username");
    if (storedUser) setUsername(storedUser);

    // 2. Fetch Data
    fetchUploads();
  }, []);

  const fetchUploads = async () => {
    try {
      const rawToken = localStorage.getItem("token");
      const token = rawToken && rawToken !== "undefined" && rawToken !== "null" ? rawToken : null;
      if (!token) {
        toast.error("Please login first.");
        navigate("/login");
        return;
      }
      const res = await axios.get("http://localhost:5000/api/upload/my/list", {
        headers: { "x-auth-token": token }
      });
      setUploads(res.data);
      calculateStats(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        toast.error("Session expired. Please login again.");
        navigate("/login");
        return;
      }
      toast.error("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const totalFiles = data.length;
    const totalViews = data.reduce((acc, curr) => acc + (curr.currentDownloads || 0), 0);
    const activeLinks = data.filter(item => new Date(item.expiresAt) > new Date()).length;
    setStats({ totalFiles, totalViews, activeLinks });
  };

  const handleDelete = async (id) => {
    if(!window.confirm("Are you sure you want to delete this file?")) return;
    try {
      const token = localStorage.getItem("token");
      // We use the 'deleteToken' from the item to authorize the delete, 
      // OR since we are the owner, the backend might handle it with just the ID + Auth Token.
      // Based on your backend, authenticated owners can delete by ID.
      // We need to fetch the specific item to get its deleteToken if required, 
      // but usually Owners can delete via ID. Let's assume the backend handles Owner check.
      
      // Actually, your backend delete route expects a 'deleteToken' in the body OR owner check.
      // Let's find the item first.
      const item = uploads.find(u => u.uniqueId === id);
      
      await axios.post(`http://localhost:5000/api/upload/delete/${id}`, 
        { deleteToken: item.deleteToken }, 
        { headers: { "x-auth-token": token } }
      );
      
      toast.success("File deleted!");
      fetchUploads(); // Refresh list
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        toast.error("Session expired. Please login again.");
        navigate("/login");
        return;
      }
      toast.error("Delete failed.");
    }
  };

  const copyLink = (id) => {
    const link = `http://localhost:5173/view/${id}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copied!");
  };

  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading Dashboard...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 pt-24">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
            Hi, {username || "User"} 👋
          </h1>
          <p className="text-gray-400">Welcome back to your LinkVault command center.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-gray-800 p-6 rounded-2xl border border-gray-700/50 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-xl"><FileText className="w-8 h-8 text-blue-400" /></div>
              <div>
                <p className="text-gray-400 text-sm">Total Uploads</p>
                <h3 className="text-3xl font-bold">{stats.totalFiles}</h3>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="bg-gray-800 p-6 rounded-2xl border border-gray-700/50 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-xl"><BarChart3 className="w-8 h-8 text-purple-400" /></div>
              <div>
                <p className="text-gray-400 text-sm">Total Views</p>
                <h3 className="text-3xl font-bold">{stats.totalViews}</h3>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="bg-gray-800 p-6 rounded-2xl border border-gray-700/50 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-xl"><Activity className="w-8 h-8 text-green-400" /></div>
              <div>
                <p className="text-gray-400 text-sm">Active Links</p>
                <h3 className="text-3xl font-bold">{stats.activeLinks}</h3>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Files Table */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="bg-gray-800 rounded-2xl border border-gray-700/50 shadow-xl overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-500" /> Your Secure Files
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-700/50 text-gray-400 text-sm uppercase font-semibold">
                <tr>
                  <th className="p-6">File Name</th>
                  <th className="p-6">Type</th>
                  <th className="p-6">Views</th>
                  <th className="p-6">Expires</th>
                  <th className="p-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {uploads.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-500">No uploads yet. Go create one!</td>
                  </tr>
                ) : (
                  uploads.map((file) => (
                    <tr key={file.uniqueId} className="hover:bg-gray-700/30 transition-colors">
                      <td className="p-6 font-medium">
                        <div className="flex items-center gap-3">
                          {file.type === 'text' ? <FileText className="w-5 h-5 text-gray-400" /> : <FileText className="w-5 h-5 text-blue-400" />}
                          <span className="truncate max-w-[200px]">{file.originalName || "Secure Text Note"}</span>
                        </div>
                      </td>
                      <td className="p-6">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${file.type === 'file' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                          {file.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-gray-500" />
                          <span>{file.currentDownloads}</span>
                          {file.maxDownloads && <span className="text-gray-500">/ {file.maxDownloads}</span>}
                        </div>
                      </td>
                      <td className="p-6 text-sm text-gray-400">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {new Date(file.expiresAt).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex justify-end gap-3">
                          <button onClick={() => copyLink(file.uniqueId)} className="p-2 hover:bg-gray-600 rounded-lg text-gray-400 hover:text-white transition-colors" title="Copy Link">
                            <Copy className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(file.uniqueId)} className="p-2 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default Dashboard;
