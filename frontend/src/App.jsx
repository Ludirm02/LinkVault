import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import View from "./pages/View";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ManualDelete from "./pages/ManualDelete"; // <--- 1. IMPORT THIS

function App() {
  return (
    <Router>
      <Toaster position="bottom-center" toastOptions={{ style: { background: '#333', color: '#fff' } }} />
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/view/:id" element={<View />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* <--- 2. ADD THIS ROUTE */}
        <Route path="/delete" element={<ManualDelete />} /> 
      </Routes>
    </Router>
  );
}

export default App;