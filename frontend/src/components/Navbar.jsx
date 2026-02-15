import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
// 1. Added BarChart3 for the Dashboard icon
import { LogOut, Trash2, Home, LogIn, UserPlus, Shield, BarChart3 } from "lucide-react";
import toast from "react-hot-toast";

const Navbar = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Check auth state whenever the route changes
  useEffect(() => {
    const token = localStorage.getItem("token");
    const hasValidToken = token && token !== "undefined" && token !== "null";
    setIsAuthenticated(!!hasValidToken); 
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username"); // Clear username on logout too
    setIsAuthenticated(false);
    toast.success("Logged out successfully");
    navigate("/login");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        
        {/* Brand / Logo */}
        <Link to="/" className="flex items-center gap-2 group">
           <div className="bg-blue-600/20 p-2 rounded-lg group-hover:bg-blue-600/30 transition-colors">
             <Shield className="w-6 h-6 text-blue-500" />
           </div>
           <span className="text-xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
             LinkVault
           </span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-6">
          
          {/* Common Links */}
          <Link to="/" className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">
            <Home className="w-4 h-4" /> <span className="hidden sm:inline">Home</span>
          </Link>
          
          <Link to="/delete" className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-red-400 transition-colors">
            <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">Delete File</span>
          </Link>

          <div className="h-6 w-px bg-gray-800 mx-2 hidden sm:block"></div>

          {isAuthenticated ? (
            // LOGGED IN STATE
            <>
              {/* --- NEW DASHBOARD LINK --- */}
              <Link to="/dashboard" className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-blue-400 transition-colors group">
                 <div className="bg-gray-800 p-1.5 rounded-lg group-hover:bg-blue-500/10 transition-colors">
                   <BarChart3 className="w-4 h-4" />
                 </div>
                 <span className="hidden sm:inline">Dashboard</span>
              </Link>
              
              <div className="h-6 w-px bg-gray-800 mx-2 hidden sm:block"></div>
              
              <button 
                onClick={handleLogout} 
                className="flex items-center gap-2 text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-lg hover:bg-red-500 hover:text-white transition-all"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </>
          ) : (
            // GUEST STATE
            <>
              <Link to="/login" className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white transition-colors">
                <LogIn className="w-4 h-4" /> Login
              </Link>
              <Link 
                to="/register" 
                className="flex items-center gap-2 text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2 rounded-lg shadow-lg hover:shadow-blue-500/25 transition-all"
              >
                <UserPlus className="w-4 h-4" /> Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
