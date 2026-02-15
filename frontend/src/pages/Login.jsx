import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useNavigate, Link } from "react-router-dom";
import { LogIn, Mail, Lock } from "lucide-react";
import { motion } from "framer-motion";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const navigate = useNavigate();

  const { email, password } = formData;

  const onChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Normalize Input
    const payload = {
        email: email.trim().toLowerCase(),
        password: password
    };

    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", payload);
      
      // Save Token & Username
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("username", res.data.username);
      
      toast.success(`Welcome back, ${res.data.username}!`);
      navigate("/");
    } catch (err) {
      // Clear bad data on error
      localStorage.removeItem("token");
      localStorage.removeItem("username");
      
      const errorMsg = err.response?.data?.error || "Invalid Credentials";
      toast.error(errorMsg);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700/50">
        <h2 className="text-3xl font-bold text-center text-white mb-2">Welcome Back</h2>
        <p className="text-center text-gray-400 mb-8">Login to access your secure vault.</p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
            <input type="email" name="email" value={email} onChange={onChange} placeholder="Email Address" required className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors" />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
            <input type="password" name="password" value={password} onChange={onChange} placeholder="Password" required className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors" />
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-blue-500/25 flex items-center justify-center gap-2">
            <LogIn className="w-5 h-5" /> Login
          </button>
        </form>
        <p className="mt-6 text-center text-gray-400 text-sm">
          Don't have an account? <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium">Register</Link>
        </p>
      </motion.div>
    </div>
  );
};
export default Login;