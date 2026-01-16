import React, { useEffect, useState } from "react";
import leftlogin from "../../assets/login-left.png";
import jswlogo from "../../assets/logo.png";
import { IoIosEyeOff, IoIosEye } from "react-icons/io";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [scale, setScale] = useState(1);
  const [hovering, setHovering] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkState = () => {
      const accessLevel = localStorage.getItem("accessLevel");
      if (accessLevel) {
        localStorage.setItem("accessLevel", null);
      }
    };
    checkState();
  }, []);

  useEffect(() => {
    let growing = true;
    const interval = setInterval(() => {
      setScale((prevScale) => {
        const newScale = growing ? prevScale + 0.0025 : prevScale - 0.0025;
        if (newScale >= 1.08) growing = false;
        if (newScale <= 1) growing = true;
        return newScale;
      });
    }, 16); // 16ms for ultra-smooth 60fps animation
  
    return () => clearInterval(interval);
  }, []);
  

  const login = async (e) => {
    e.preventDefault();
    setErr(""); // Clear previous errors
    if (name.length === 0) setErr("Enter username");
    else if (pass.length === 0) setErr("Enter password");
    else {
      try {
        setLoading(true);
        const response = await axios.post("http://localhost:8000/login", {
          username: name,
          password: pass,
        });
        console.log(response.data)
        if (response.status === 200) {
          localStorage.setItem("accessLevel", response.data.accessLevel);
          localStorage.setItem("userData", response.data.username)
          navigate(
            response.data.accessLevel === "admin"
              ? "../admindashboard"
              : response.data.accessLevel === "pharmacy"
              ? "../viewprescription"
              : response.data.accessLevel === "doctor"
              ? "../appointments"
              : response.data.accessLevel === "nurse"  || response.data.accessLevel === "camp_nurse"
              ? "../dashboard"
              : response.data.accessLevel === "hr"
              ? "../searchemployee"
              : "../"
          );
        }
      } catch (error) {
        if (error.response && error.response.data && error.response.data.message) {
          setErr(error.response.data.message); // Use backend message
        } else {
          setErr("Something went wrong. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    }
  };
  
  return (
    <div className="flex flex-col md:flex-row h-screen">
      <div className="md:w-2/5 w-full h-1/3 md:h-full bg-center bg-cover" style={{ backgroundImage: `url(${leftlogin})` }}>
        <div className="flex items-end justify-center h-full pb-5 md:pb-10">
          <img src={jswlogo} alt="JSW Logo" className="w-40 md:w-96" />
        </div>
      </div>

      <div className="md:w-3/5 w-full h-full bg-[#e7f8f9] flex items-center justify-center overflow-hidden relative">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-in-out"
        ></div>

        <div className="relative z-10 w-full sm:w-4/5 md:w-3/4 max-w-md p-6 md:p-8 bg-white/30 backdrop-blur-md   border border-white border-opacity-30 rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.5)]">
          <h2 className="text-2xl md:text-4xl font-bold text-center mb-4">Login</h2>
          <p className="text-center text-gray-600 mb-6 text-sm md:text-base">Welcome to JSW OHC</p>
          <form onSubmit={login}>
            <div className="mb-4">
              <label htmlFor="username" className="block text-gray-700 mb-2 text-sm md:text-base">Username</label>
              <input type="text" id="username" className="w-full px-4 py-2 border rounded-lg bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400" onChange={(e) => setName(e.target.value)} value={name} />
            </div>
            <div className="mb-4">
              <label htmlFor="password" className="block text-gray-700 mb-2 text-sm md:text-base">Password</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} id="password" className="w-full px-4 py-2 border rounded-lg bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400" onChange={(e) => setPass(e.target.value)} value={pass} />
                <button type="button" className="absolute right-3 top-2/4 transform -translate-y-1/2 text-xl text-blue-900" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <IoIosEyeOff /> : <IoIosEye />}
                </button>
              </div>
            </div>
            <div className="flex justify-end mb-6">
              <Link to="../forgot-password" className="text-blue-900 text-sm md:text-base">Forgot Password?</Link>
            </div>
            <p className="text-red-600 font-medium text-sm md:text-base mb-4">{err}</p>
            <button type="submit" className="mt-4 bg-blue-500 w-full text-white px-6 py-2 rounded-lg hover:shadow-[0_0_10px_#3b82f6] hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300">
              {loading ? <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-white border-r-transparent"></div> : "Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
