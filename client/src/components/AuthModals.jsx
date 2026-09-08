import React, { useState } from "react";
import {
  X,
  Lock,
  Phone,
  User,
  Building2,
  Mail,
  KeyRound,
  AlertCircle,
  Crown,
  UserCheck
} from "lucide-react";
import { dataService } from "../services/dataService.js";

export const CM_PRESET_NAMES = [
  "Sriteja Mallepalli",
  "Mullapudi Sai",
  "Gireesh Pavalla",
  "Mohd Shafi",
  "Doppa Anil Kumar",
  "Chaitanya",
  "Sajja Vinay Kumar"
];

export function AgentAuthModal({ isOpen, onClose, onLoginSuccess, meta }) {
  const [isSignup, setIsSignup] = useState(false);
  const [mobile, setMobile] = useState("");
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [clusterManager, setClusterManager] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  // Available CM names: Combine preset names with any dynamically loaded from server
  const cmList = Array.from(
    new Set([
      ...CM_PRESET_NAMES,
      ...(meta?.clusterManagers || []).map((c) => (typeof c === "string" ? c : c.name))
    ].filter(Boolean))
  );

  const handleUserAuth = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (isSignup && !clusterManager.trim()) {
      setErrorMsg("Please select a Cluster Manager.");
      return;
    }

    setLoading(true);

    try {
      const res = isSignup
        ? dataService.auth.agentSignup({
            mobile: mobile.trim(),
            name: name.trim(),
            clusterManager: clusterManager.trim(),
            pin: pin.trim()
          })
        : dataService.auth.agentLogin({
            mobile: mobile.trim(),
            pin: pin.trim()
          });

      onLoginSuccess(res.user);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || "Failed to authenticate.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-xl p-6 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-phonepe-50 border border-phonepe-200 flex items-center justify-center text-phonepe-700">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {isSignup ? "User Registration" : "User Login"}
            </h2>
            <p className="text-xs text-slate-500">
              {isSignup
                ? "Register a new user account"
                : "Sign in with your registered ACE Number and 4-digit PIN"}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleUserAuth} className="space-y-4">
          {/* ACE Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-phonepe-700" />
              <span>ACE Number</span>
            </label>
            <div>
              <input
                type="text"
                required
                maxLength={10}
                placeholder="Enter 10-digit ACE Number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-sm placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-phonepe-500"
              />
            </div>
          </div>

          {/* Signup Specific Fields */}
          {isSignup && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-phonepe-700" />
                  <span>User Name</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-phonepe-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-phonepe-700" />
                  <span>Cluster Manager (CM)</span>
                </label>
                <select
                  required
                  value={clusterManager}
                  onChange={(e) => setClusterManager(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-phonepe-500 cursor-pointer"
                >
                  <option value="">Select Cluster Manager</option>
                  {cmList.map((cmName) => (
                    <option key={cmName} value={cmName}>
                      {cmName}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* 4-Digit PIN */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-phonepe-700" />
              <span>4-Digit PIN</span>
            </label>
            <input
              type="password"
              required
              maxLength={4}
              placeholder="Enter 4-digit PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-sm placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-phonepe-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-phonepe-700 hover:bg-phonepe-800 text-white font-semibold rounded-xl text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-2"
          >
            {loading ? "Please wait..." : isSignup ? "Register as New User" : "Login"}
          </button>
        </form>

        {/* Option under Login to Register */}
        <div className="mt-5 pt-4 border-t border-slate-100 text-center">
          {isSignup ? (
            <p className="text-xs text-slate-600">
              Already registered?{" "}
              <button
                type="button"
                onClick={() => {
                  setIsSignup(false);
                  setErrorMsg("");
                }}
                className="text-phonepe-700 font-bold hover:underline cursor-pointer ml-1"
              >
                Login with PIN
              </button>
            </p>
          ) : (
            <p className="text-xs text-slate-600">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setIsSignup(true);
                  setErrorMsg("");
                }}
                className="text-phonepe-700 font-bold hover:underline cursor-pointer ml-1"
              >
                Register as New User
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function AdminAuthModal({ isOpen, onClose, role = "zh", quotas, onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const isZh = role === "zh";
  const title = isZh ? "Zonal Head (ZH)" : "Cluster Manager (CM / CL)";
  const maxLimit = isZh ? 2 : 20;
  const currentCount = isZh ? (quotas?.zhCount || 0) : (quotas?.cmCount || 0);
  const isQuotaFull = currentCount >= maxLimit;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    // Validate email domain silently without mentioning on site
    if (isRegister) {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail.endsWith("@phonepe.com")) {
        setErrorMsg("Please enter a valid official email address.");
        return;
      }
    }

    setLoading(true);

    try {
      const res = isRegister
        ? dataService.auth.adminRegister({
            role,
            name: name.trim(),
            email: email.trim(),
            password: password.trim()
          })
        : dataService.auth.adminLogin({
            email: email.trim(),
            password: password.trim(),
            role
          });

      onLoginSuccess(res.user);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || "Operation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-xl p-6 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-phonepe-50 border border-phonepe-200 flex items-center justify-center text-phonepe-700">
            {isZh ? <Crown className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          </div>
        </div>

        {/* Toggle Login vs Register */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-4 border border-slate-200">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setErrorMsg("");
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              !isRegister
                ? "bg-white text-phonepe-800 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Login
          </button>
          <button
            type="button"
            disabled={isQuotaFull}
            onClick={() => {
              if (!isQuotaFull) {
                setIsRegister(true);
                setErrorMsg("");
              }
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              isRegister
                ? "bg-white text-phonepe-800 shadow-sm"
                : isQuotaFull
                ? "text-slate-400 cursor-not-allowed"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Register
          </button>
        </div>

        {isRegister && isQuotaFull && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
            Registration limit has been reached. Please log in with an existing account.
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-phonepe-700" />
                <span>Full Name</span>
              </label>
              <input
                type="text"
                required
                placeholder="Enter full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-phonepe-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-phonepe-700" />
              <span>Email</span>
            </label>
            <input
              type="email"
              required
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-phonepe-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5 text-phonepe-700" />
              <span>Password</span>
            </label>
            <input
              type="password"
              required
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-phonepe-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading || (isRegister && isQuotaFull)}
            className="w-full py-2.5 bg-phonepe-700 hover:bg-phonepe-800 text-white font-semibold rounded-xl text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-3"
          >
            {loading ? "Please wait..." : isRegister ? `Register ${isZh ? "ZH" : "CM"}` : `Login as ${isZh ? "ZH" : "CM"}`}
          </button>
        </form>
      </div>
    </div>
  );
}
