import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { FileText, Download, Lock, AlertTriangle, Loader2, Unlock, ShieldCheck, Terminal, Copy, Check } from "lucide-react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

const View = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Password States
  const [isLocked, setIsLocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // --- CRITICAL: Prevent Double Fetch ---
  const dataFetched = useRef(false); 

  const fetchData = async (pwd = "") => {
    try {
      if (!pwd) setLoading(true); 

      const token = localStorage.getItem("token");
      const res = await axios.get(`http://localhost:5000/api/upload/${id}`, {
        params: pwd ? { password: pwd, ts: Date.now() } : { ts: Date.now() },
        headers: token ? { "x-auth-token": token } : {},
      });
      
      setData(res.data);
      setIsLocked(false);
      setError("");
      if (pwd) toast.success("Unlocked successfully!");
      
    } catch (err) {
      const status = err.response?.status;
      const apiError = err.response?.data?.error || "";
      const loweredError = apiError.toLowerCase();

      if (status === 401) {
        setIsLocked(true);
        setError("");
      } else if (status === 403) {
        const isPasswordError =
          loweredError.includes("incorrect password") ||
          loweredError.includes("wrong password");

        if (isPasswordError) {
          setIsLocked(true);
          toast.error("Incorrect password!");
        } else {
          setIsLocked(false);
          setError(apiError || "Access denied: link expired, invalid, or max views reached.");
        }
      } else {
        setError("Link expired or does not exist.");
      }
    } finally {
      setLoading(false);
      setUnlocking(false);
    }
  };

  const handleUnlock = () => {
    if (!passwordInput) return toast.error("Enter a password");
    setUnlocking(true);
    fetchData(passwordInput);
  };

  const copyText = async () => {
    if (!data?.textContent) return;
    await navigator.clipboard.writeText(data.textContent);
    setCopiedText(true);
    toast.success("Text copied!");
    setTimeout(() => setCopiedText(false), 1500);
  };

  useEffect(() => {
    if (dataFetched.current) return;
    dataFetched.current = true;
    fetchData();
  }, [id]);

  // 1. Loading State
  if (loading) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
      <Loader2 className="animate-spin w-12 h-12 text-blue-500" />
    </div>
  );

  // 2. Locked State
  if (isLocked) return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-gray-800 rounded-3xl p-8 shadow-2xl border border-gray-700 text-center"
      >
        <div className="bg-gray-700/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-gray-800">
          <Lock className="w-10 h-10 text-yellow-400" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Restricted Access</h2>
        <p className="text-gray-400 mb-8 text-sm">This content is password protected. Please authenticate to continue.</p>
        
        <input 
          type="password" 
          placeholder="Enter Password..." 
          className="w-full bg-gray-900 border border-gray-600 rounded-xl p-4 text-white mb-4 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-center tracking-widest"
          onChange={(e) => setPasswordInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
        />
        
        <button 
          onClick={handleUnlock}
          disabled={unlocking}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
        >
          {unlocking ? <Loader2 className="animate-spin w-5 h-5"/> : <Unlock className="w-5 h-5" />}
          {unlocking ? "Verifying..." : "Unlock Content"}
        </button>
      </motion.div>
    </div>
  );

  // 3. Error State
  if (error) return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white p-4">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center">
        <AlertTriangle className="w-20 h-20 text-red-500 mb-6 mx-auto" />
        <h1 className="text-3xl font-bold mb-3">Link Unavailable</h1>
        <p className="text-gray-400 bg-gray-800 px-6 py-2 rounded-full inline-block border border-gray-700">{error}</p>
      </motion.div>
    </div>
  );

  // 4. Success State
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 pt-20">
      <motion.div 
        initial={{ y: 20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-lg bg-gray-800 rounded-3xl p-8 shadow-2xl border border-gray-700/50 backdrop-blur-sm text-center"
      >
        
        <div className="flex items-center justify-center gap-2 mb-8">
            <ShieldCheck className="w-8 h-8 text-green-400" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent">
            Secure Content
            </h1>
        </div>

        {data.type === "text" ? (
          <div className="text-left">
            <div className="flex items-center justify-between gap-2 text-gray-400 mb-2 text-xs uppercase font-bold tracking-wider pl-2">
              <div className="flex items-center gap-2">
                <Terminal className="w-3 h-3" /> Decrypted Message
              </div>
              <button
                onClick={copyText}
                className="inline-flex items-center gap-1 rounded-md border border-gray-700 px-2 py-1 text-[11px] hover:text-white hover:border-gray-500 transition-colors"
              >
                {copiedText ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedText ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="bg-gray-950 p-6 rounded-2xl border border-gray-700 relative group overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
              <pre className="whitespace-pre-wrap text-gray-300 font-mono text-sm leading-relaxed">
                {data.textContent}
              </pre>
            </div>
          </div>
        ) : (
          <div className="py-6 bg-gray-900/50 rounded-2xl border border-gray-700/50 mb-6">
            <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                <FileText className="w-12 h-12 text-blue-400" />
            </div>
            <p className="text-lg font-medium text-gray-200 mb-1 px-4 truncate">{data.originalName}</p>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-6">Ready for Download</p>
            
            <a
              href={data.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-blue-500/25 active:scale-95"
            >
              <Download className="w-5 h-5" />
              Download File
            </a>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-700/50">
            <p className="text-xs text-gray-500 flex items-center justify-center gap-2">
            <Lock className="w-3 h-3" /> End-to-End Encryption • Auto-Expiry Active
            </p>
        </div>
      </motion.div>
    </div>
  );
};

export default View;
