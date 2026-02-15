import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";

const Register = () => {
  const [formData, setFormData] = useState({ username: "", email: "", password: "" });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      username: formData.username.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
    };
    if (!payload.username || !payload.email || !payload.password) {
      toast.error("All fields are required");
      return;
    }
    try {
      await axios.post("http://localhost:5000/api/auth/register", payload);
      localStorage.removeItem("token");
      localStorage.removeItem("username");
      toast.success("Registered successfully. Please login.");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.error || "Registration Failed");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-gray-800 p-8 rounded-2xl w-full max-w-sm border border-gray-700">
        <h2 className="text-2xl font-bold mb-6 text-center">Create Account</h2>
        <input className="w-full bg-gray-900 border border-gray-600 p-3 rounded-lg mb-4 text-white" placeholder="Username" onChange={(e)=>setFormData({...formData, username:e.target.value})} required />
        <input className="w-full bg-gray-900 border border-gray-600 p-3 rounded-lg mb-4 text-white" placeholder="Email" type="email" onChange={(e)=>setFormData({...formData, email:e.target.value})} required />
        <input className="w-full bg-gray-900 border border-gray-600 p-3 rounded-lg mb-6 text-white" placeholder="Password" type="password" onChange={(e)=>setFormData({...formData, password:e.target.value})} required />
        <button className="w-full bg-blue-600 py-3 rounded-lg font-bold hover:bg-blue-500">Sign Up</button>
        <p className="mt-4 text-center text-sm text-gray-400">Already have an account? <Link to="/login" className="text-blue-400">Login</Link></p>
      </form>
    </div>
  );
};
export default Register;
