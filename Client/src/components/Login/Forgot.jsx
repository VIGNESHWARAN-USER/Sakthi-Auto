import React, { useEffect, useState } from "react";
import leftlogin from "../../assets/login-left.png";
import jswlogo from "../../assets/logo.png";
import { IoIosEyeOff, IoIosEye } from "react-icons/io";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const Forgot = () => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1); // Step 1: Username, Step 2: OTP, Step 3: Password Reset
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [err, setErr] = useState("");
  const [otpSent, setOtpSent] = useState(false);
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

  const requestOtp = async (e) => {
    e.preventDefault();
    if (name.trim() === "") {
      setErr("Enter username");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post("http://localhost:8000/forgot_password/", {
        username: name,
      });

      if (response.status === 200) {
        setErr("")
        setOtpSent(true);
        setStep(2);
      } else {
        setErr("User not found");
      }
    } catch (error) {
      console.log(error)
      setErr("Error sending OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setErr("Enter a valid 6-digit OTP");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post("http://localhost:8000/verify_otp/", {
        username: name,
        otp,
      });

      if (response.status === 200) {
        setErr("");
        setStep(3);
      } else {
        setErr("Invalid OTP");
      }
    } catch (error) {
      setErr("OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    if (newPass.length < 6) {
      setErr("Password must be at least 6 characters");
      return;
    }
    if (newPass !== confirmPass) {
      setErr("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post("http://localhost:8000/reset_password/", {
        username: name,
        newPassword: newPass,
      });

      if (response.status === 200) {
        alert("Password successfully reset!");
        navigate("../");
      } else {
        setErr("Password reset failed");
      }
    } catch (error) {
      setErr("Error resetting password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen">
      <div
        className="md:w-2/5 w-full h-1/3 md:h-full bg-center bg-cover"
        style={{ backgroundImage: `url(${leftlogin})` }}
      >
        <div className="flex items-end justify-center h-full pb-5 md:pb-10">
          <img src={jswlogo} alt="JSW Logo" className="w-40 md:w-96" />
        </div>
      </div>

      <div className="md:w-3/5 w-full h-full flex items-center justify-center overflow-hidden relative">
        <div className="relative z-10 w-full sm:w-4/5 md:w-3/4 max-w-md p-6 md:p-8 bg-white border border-white border-opacity-30 rounded-lg shadow-2xl">
          <h2 className="text-2xl md:text-4xl font-bold text-center mb-4">
            {step === 1 ? "Request OTP" : step === 2 ? "Enter OTP" : "Reset Password"}
          </h2>
          <p className="text-center text-gray-600 mb-6 text-sm md:text-base">
            {step === 1
              ? "OTP will be received on email"
              : step === 2
              ? "Enter the OTP sent to your email"
              : "Enter your new password"}
          </p>

          {step === 1 && (
            <form onSubmit={requestOtp}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2 text-sm md:text-base">Username</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border rounded-lg bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  onChange={(e) => setName(e.target.value)}
                  value={name}
                />
              </div>
              <p className="text-red-600 font-medium text-sm md:text-base mb-4">{err}</p>
              <button
                type="submit"
                className="mt-4 bg-blue-500 w-full text-white px-6 py-2 rounded-lg hover:shadow-[0_0_10px_#3b82f6] transition-all duration-300"
              >
                {loading ? "Sending OTP..." : "Request OTP"}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={verifyOtp}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2 text-sm md:text-base">Enter OTP</label>
                <input
                  type="text"
                  className="w-full tracking-[54px] px-4 py-2 border rounded-lg bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  onChange={(e) => setOtp(e.target.value)}
                  value={otp}
                />
              </div>
              <p className="text-red-600 font-medium text-sm md:text-base mb-4">{err}</p>
              <button
                type="submit"
                className="mt-4 bg-blue-500 w-full text-white px-6 py-2 rounded-lg hover:shadow-[0_0_10px_#3b82f6] transition-all duration-300"
              >
                {loading ? "Verifying..." : "Submit OTP"}
              </button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={resetPassword}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2 text-sm md:text-base">New Password</label>
                <input
                  type="password"
                  className="w-full px-4 py-2 border rounded-lg bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  onChange={(e) => setNewPass(e.target.value)}
                  value={newPass}
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2 text-sm md:text-base">Confirm Password</label>
                <input
                  type="password"
                  className="w-full px-4 py-2 border rounded-lg bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  onChange={(e) => setConfirmPass(e.target.value)}
                  value={confirmPass}
                />
              </div>
              <p className="text-red-600 font-medium text-sm md:text-base mb-4">{err}</p>
              <button type="submit" className="mt-4 bg-blue-500 w-full text-white px-6 py-2 rounded-lg">
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Forgot;
