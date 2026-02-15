import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Upload, Copy, Check, Link as LinkIcon, Loader2, Lock, Flame, Eye, EyeOff, Trash2, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion"; 

const Home = () => {
  // --- STATE MANAGEMENT ---
  const [type, setType] = useState("file");
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); 
  
  // UI States
  const [isDragging, setIsDragging] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [username, setUsername] = useState(""); 

  // Response Data
  const [generatedLink, setGeneratedLink] = useState("");
  const [deleteToken, setDeleteToken] = useState(""); 

  // Feature Inputs
  const [password, setPassword] = useState("");
  const [oneTimeView, setOneTimeView] = useState(false);
  const [maxDownloads, setMaxDownloads] = useState(""); 
  const [expiresIn, setExpiresIn] = useState("10"); 
  const [expiryDateTime, setExpiryDateTime] = useState("");

  // Check user on load
  useEffect(() => {
    const storedUser = localStorage.getItem("username");
    if (storedUser) setUsername(storedUser);
  }, []);

  const handleUpload = async () => {
    // 1. Strict Validation
    if (type === "file" && !file) return toast.error("Please select a file!");
    if (type === "text" && !text.trim()) return toast.error("Please add some text!");

    // 2. Clear Old Results
    setGeneratedLink("");
    setDeleteToken("");
    setLoading(true);
    setUploadProgress(0);

    const formData = new FormData();
    if (type === "file") formData.append("file", file);
    else formData.append("text", text);
    
    formData.append("type", type);
    formData.append("expiresIn", expiresIn); 
    formData.append("password", password);
    formData.append("oneTimeView", oneTimeView);
    formData.append("maxDownloads", maxDownloads);

    // --- SAFETY FIX: Handle "undefined" string tokens ---
    const rawToken = localStorage.getItem("token");
    const token = rawToken && rawToken !== "undefined" && rawToken !== "null" ? rawToken : null;
    // ----------------------------------------------------

    try {
      const res = await axios.post("http://localhost:5000/api/upload", formData, {
        headers: token ? { "x-auth-token": token } : {},
        onUploadProgress: (progressEvent) => {
          if (!progressEvent.total) return;
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(Number.isFinite(percent) ? percent : 0);
        }
      });

      setGeneratedLink(res.data.link || "");
      setDeleteToken(res.data.deleteToken || ""); 
      toast.success("Secure link generated!");

      if (type === "file") setFile(null);
      else setText("");
      
      setPassword(""); 
      setOneTimeView(false); 
      setMaxDownloads(""); 
      setExpiresIn("10");
      setExpiryDateTime("");

    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 401) {
        // Auto-cleanup bad sessions
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        toast.error("Session expired. Please login again.");
        setTimeout(() => window.location.reload(), 1500); 
        return; 
      }
      if (err.response && err.response.data && err.response.data.error) {
        toast.error(`Upload failed: ${err.response.data.error}`);
      } else {
        toast.error("Upload failed. Is the backend running?");
      }
    } finally {
      setLoading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const copyToClipboard = async (txt, isToken = false) => {
    if (!txt) return;
    try {
      await navigator.clipboard.writeText(txt);
      toast.success("Copied!");
      if (isToken) { setCopiedToken(true); setTimeout(() => setCopiedToken(false), 2000); } 
      else { setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); }
    } catch (_err) {
      toast.error("Clipboard permission denied.");
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]); setType("file");
    }
  };

  const getMinDateTimeLocal = () => {
    const now = new Date();
    now.setSeconds(0, 0);
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-gray-800 rounded-3xl p-8 shadow-2xl border border-gray-700/50 backdrop-blur-xl">
        
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">LinkVault</h1>
          <p className="text-gray-400 mt-2 text-sm font-medium">Secure, Anonymous, Ephemeral.</p>
          
          {/* USER BADGE */}
          {username && (
             <motion.div 
               initial={{ opacity: 0, scale: 0.8 }}
               animate={{ opacity: 1, scale: 1 }}
               className="mt-4 inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 shadow-sm shadow-blue-500/10"
             >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-xs font-semibold text-blue-300 tracking-wide uppercase">
                  Logged in as <span className="text-white ml-1">{username}</span>
                </span>
             </motion.div>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-gray-900/50 p-1 rounded-xl mb-6 border border-gray-700">
          <button onClick={() => setType("file")} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${type === "file" ? "bg-gray-700 text-white shadow-md" : "text-gray-400 hover:text-white"}`}>Upload File</button>
          <button onClick={() => setType("text")} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${type === "text" ? "bg-gray-700 text-white shadow-md" : "text-gray-400 hover:text-white"}`}>Secure Text</button>
        </div>

        {/* Upload Area */}
        <div className="mb-6 relative">
          {type === "file" ? (
            <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 relative overflow-hidden ${isDragging ? "border-blue-500 bg-blue-500/10 scale-[1.02]" : "border-gray-600 hover:border-gray-500 hover:bg-gray-700/30"}`}>
              <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => setFile(e.target.files[0])} />
              <div className="flex flex-col items-center pointer-events-none">
                <div className={`p-4 rounded-full mb-3 transition-colors ${isDragging ? "bg-blue-500 text-white" : "bg-gray-700 text-gray-400"}`}><Upload className="w-8 h-8" /></div>
                <p className="text-sm font-medium text-gray-300">{file ? <span className="text-blue-400 break-all">{file.name}</span> : isDragging ? "Drop it here!" : "Click or Drag file"}</p>
              </div>
            </div>
          ) : (
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste your secret text here..." className="w-full h-40 bg-gray-900/50 border border-gray-600 rounded-2xl p-4 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none transition-all placeholder-gray-500" />
          )}
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="col-span-2 group flex items-center bg-gray-900/50 border border-gray-600 rounded-xl px-4 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                <Lock className="w-4 h-4 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                <input type={showPassword ? "text" : "password"} placeholder="Optional password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-transparent border-none text-white py-3 px-3 focus:ring-0 outline-none text-sm" />
                <button onClick={() => setShowPassword(!showPassword)} className="text-gray-500 hover:text-white">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            </div>
            <div className="group flex items-center bg-gray-900/50 border border-gray-600 rounded-xl px-4 focus-within:border-blue-500">
                <Eye className="w-4 h-4 text-gray-500" />
                <input type="number" placeholder="Max access" value={maxDownloads} onChange={(e) => setMaxDownloads(e.target.value)} className="w-full bg-transparent border-none text-white py-3 px-3 focus:ring-0 outline-none text-sm" />
            </div>
            <div className="group flex items-center bg-gray-900/50 border border-gray-600 rounded-xl px-4 focus-within:border-blue-500 relative">
                <Clock className="w-4 h-4 text-gray-500" />
                <input
                  type="datetime-local"
                  value={expiryDateTime}
                  min={getMinDateTimeLocal()}
                  onChange={(e) => {
                    setExpiryDateTime(e.target.value);
                    const selected = new Date(e.target.value);
                    const now = new Date();
                    const diffMins = Math.ceil((selected.getTime() - now.getTime()) / 60000);
                    setExpiresIn(diffMins > 0 ? String(diffMins) : "10");
                  }}
                  className="w-full bg-transparent border-none text-white py-3 px-3 focus:ring-0 outline-none text-sm"
                />
            </div>
            <div onClick={() => setOneTimeView(!oneTimeView)} className={`col-span-2 flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${oneTimeView ? "bg-red-500/10 border-red-500/50" : "bg-gray-900/50 border-gray-600"}`}>
                <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${oneTimeView ? "bg-red-500 text-white" : "bg-gray-700 text-gray-400"}`}><Flame className="w-4 h-4" /></div>
                    <span className={`text-sm font-medium ${oneTimeView ? "text-red-400" : "text-gray-400"}`}>Burn after reading</span>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${oneTimeView ? "border-red-500 bg-red-500" : "border-gray-500"}`}>{oneTimeView && <Check className="w-3 h-3 text-white" />}</div>
            </div>
        </div>

        {/* Progress Bar */}
        {loading && uploadProgress > 0 && uploadProgress < 100 && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1"><span>Uploading...</span><span>{uploadProgress}%</span></div>
            <div className="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden"><div className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div></div>
          </div>
        )}

        <button onClick={handleUpload} disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-blue-500/25 disabled:opacity-70">
          {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
          {loading ? "Securing Data..." : "Generate Secure Link"}
        </button>

        {/* Results Area */}
        <AnimatePresence>
          {generatedLink && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-6 space-y-3 overflow-hidden">
              <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/20 group hover:border-green-500/40 transition-colors">
                <p className="text-xs text-green-400 mb-1.5 uppercase font-bold tracking-wider">Shareable Link</p>
                <div className="flex items-center gap-2">
                  <input type="text" readOnly value={generatedLink} className="bg-transparent text-green-300 text-sm flex-1 outline-none truncate font-mono" />
                  <button onClick={() => copyToClipboard(generatedLink)} className="text-green-400 hover:text-white transition-colors">{copiedLink ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}</button>
                </div>
              </div>
              <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20 group hover:border-red-500/40 transition-colors">
                <div className="flex items-center gap-2 mb-1.5"><Trash2 className="w-3 h-3 text-red-400" /><p className="text-xs text-red-400 uppercase font-bold tracking-wider">Delete Token (Save This!)</p></div>
                <div className="flex items-center gap-2">
                  <input type="text" readOnly value={deleteToken} className="bg-transparent text-red-300 text-sm flex-1 outline-none font-mono" />
                  <button onClick={() => copyToClipboard(deleteToken, true)} className="text-red-400 hover:text-white transition-colors">{copiedToken ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
export default Home;
