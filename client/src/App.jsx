import React, { useState, useEffect } from "react";
import {
  Menu,
  X,
  FileText,
  User,
  Crown,
  Building2,
  LogOut,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Layers,
  ShieldCheck
} from "lucide-react";
import PublicEntryForm from "./components/PublicEntryForm.jsx";
import AgentDashboard from "./components/AgentDashboard.jsx";
import CMDashboard from "./components/CMDashboard.jsx";
import ZHDashboard from "./components/ZHDashboard.jsx";
import DeveloperDashboard from "./components/DeveloperDashboard.jsx";
import { AgentAuthModal, AdminAuthModal } from "./components/AuthModals.jsx";
import { dataService } from "./services/dataService.js";

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem("calcify_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Views: "landing", "form", "agent_dash", "cm_dash", "zh_dash", "developer_dash"
  const [currentView, setCurrentView] = useState(() => {
    try {
      const savedUser = localStorage.getItem("calcify_user");
      if (savedUser) {
        const u = JSON.parse(savedUser);
        if (u.role === "agent") return "agent_dash";
        if (u.role === "cm") return "cm_dash";
        if (u.role === "zh") return "zh_dash";
        if (u.role === "developer") return "developer_dash";
      }
      return "landing";
    } catch {
      return "landing";
    }
  });

  const [meta, setMeta] = useState(null);

  // Modals
  const [agentAuthOpen, setAgentAuthOpen] = useState(false);
  const [adminAuthOpen, setAdminAuthOpen] = useState(false);
  const [adminRoleToOpen, setAdminRoleToOpen] = useState("zh"); // "zh" or "cm"

  // 3 Horizontal lines menu drawer
  const [menuDrawerOpen, setMenuDrawerOpen] = useState(false);

  const fetchMeta = () => {
    try {
      const data = dataService.getMeta();
      setMeta(data);
    } catch (err) {
      console.error("Failed to load metadata:", err);
    }
  };

  useEffect(() => {
    fetchMeta();
  }, []);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    localStorage.setItem("calcify_user", JSON.stringify(user));
    if (user.role === "agent") setCurrentView("agent_dash");
    else if (user.role === "cm") setCurrentView("cm_dash");
    else if (user.role === "zh") setCurrentView("zh_dash");
    else if (user.role === "developer") setCurrentView("developer_dash");
    setMenuDrawerOpen(false);
    fetchMeta();
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("calcify_user");
    setCurrentView("landing");
    setMenuDrawerOpen(false);
  };

  const openAdminModal = (role) => {
    setAdminRoleToOpen(role);
    setAdminAuthOpen(true);
    setMenuDrawerOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f8f6fc] text-slate-800 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* 1. Header (PhonePe White with Violet Accent) */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <button
            type="button"
            onClick={() => setCurrentView(currentUser ? `${currentUser.role}_dash` : "landing")}
            className="flex items-center cursor-pointer group"
          >
            <img
              src="/logo.png"
              alt="Calcify Logo"
              className="h-10 w-auto object-contain rounded-lg"
            />
          </button>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3">
            {/* If Logged In, Show User Badge */}
            {currentUser && (
              <div className="hidden sm:flex items-center gap-2 pr-3 border-r border-slate-200">
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-900 block leading-tight">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-phonepe-700 uppercase font-semibold">
                    {currentUser.role === "developer" ? "Developer Studio" : currentUser.role === "zh" ? "Zonal Head" : currentUser.role === "cm" ? "Cluster Manager" : "Agent"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* 3 Horizontal Lines (Menu Icon) */}
            <button
              type="button"
              onClick={() => setMenuDrawerOpen(true)}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-phonepe-50 text-phonepe-900 border border-slate-200 hover:border-phonepe-200 transition-all cursor-pointer shadow-2xs"
              title="Open Menu"
            >
              {/* 3 Horizontal lines */}
              <div className="w-5 h-4 flex flex-col justify-between items-center">
                <span className="w-full h-0.5 bg-phonepe-700 rounded-full"></span>
                <span className="w-full h-0.5 bg-phonepe-700 rounded-full"></span>
                <span className="w-full h-0.5 bg-phonepe-700 rounded-full"></span>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Slide-out 3 Horizontal Lines Menu Drawer */}
      {menuDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-80 max-w-full h-full shadow-2xl p-6 flex flex-col justify-between animate-in slide-in-from-right duration-200">
            <div>
              {/* Drawer Top */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Menu</h3>
                  <p className="text-xs text-slate-400">Administrative Logins & Actions</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMenuDrawerOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Menu Links */}
              <div className="space-y-3">
                {/* 1. ZH Login (Max 2 registrations) */}
                <button
                  type="button"
                  onClick={() => openAdminModal("zh")}
                  className="w-full text-left p-3.5 bg-slate-50 hover:bg-phonepe-50/70 border border-slate-200 hover:border-phonepe-200 rounded-xl transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-phonepe-100 text-phonepe-700 flex items-center justify-center font-bold">
                        <Crown className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-xs text-slate-900 block group-hover:text-phonepe-900">
                          ZH Login / Registration
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Zonal Head Portal
                        </span>
                      </div>
                    </div>

                  </div>
                </button>

                {/* 2. CM/CL Login (Max 20 registrations) */}
                <button
                  type="button"
                  onClick={() => openAdminModal("cm")}
                  className="w-full text-left p-3.5 bg-slate-50 hover:bg-phonepe-50/70 border border-slate-200 hover:border-phonepe-200 rounded-xl transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-phonepe-100 text-phonepe-700 flex items-center justify-center font-bold">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-xs text-slate-900 block group-hover:text-phonepe-900">
                          CM / CL Login / Registration
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Cluster Manager Portal
                        </span>
                      </div>
                    </div>

                  </div>
                </button>

                <div className="border-t border-slate-100 my-4"></div>

                {/* Agent Portal Quick Action */}
                <button
                  type="button"
                  onClick={() => {
                    setMenuDrawerOpen(false);
                    setAgentAuthOpen(true);
                  }}
                  className="w-full text-left p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-2.5 cursor-pointer"
                >
                  <User className="w-4 h-4 text-phonepe-700" />
                  <span>User Login & Registration</span>
                </button>

                {/* Fill Form Quick Action */}
                <button
                  type="button"
                  onClick={() => {
                    setMenuDrawerOpen(false);
                    setCurrentView("form");
                  }}
                  className="w-full text-left p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-2.5 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-phonepe-700" />
                  <span>Fill Daily Sales Form</span>
                </button>
              </div>
            </div>

            {currentUser && (
              <div className="pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout Current Session</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Main Views */}
      <main className="flex-1 flex flex-col">
        {/* VIEW 1: Plain Landing Page */}
        {currentView === "landing" && (
          <div className="flex-1 flex flex-col items-center justify-start px-4 pt-6 pb-12 sm:pt-8 sm:pb-16">
            <div className="w-full max-w-md text-center space-y-4">
              {/* Subtitle / Title banner */}
              <div>
                <img
                  src="/logo.png"
                  alt="Calcify Logo"
                  className="h-20 w-auto mx-auto object-contain mb-2 drop-shadow-sm"
                />
                <p className="text-phonepe-700 font-bold text-base sm:text-lg">
                  SO Tracker with Tentative Salary Calculator
                </p>
                <p className="text-slate-500 text-xs mt-1">
                  Sales made easy • Daily order recording and salary tracking
                </p>
              </div>

              {/* Main Landing Action Options */}
              <div className="space-y-4 pt-4">
                {/* Primary Option 1: Fill Form */}
                <button
                  type="button"
                  onClick={() => setCurrentView("form")}
                  className="w-full p-5 bg-white hover:bg-phonepe-50/50 border-2 border-phonepe-700 rounded-2xl shadow-xs text-left flex items-center justify-between group transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-phonepe-700 flex items-center justify-center text-white font-bold shadow-sm">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-base font-bold text-slate-900 block group-hover:text-phonepe-900">
                        Fill Form
                      </span>
                      <span className="text-xs text-slate-500">
                        Click to open questionnaire & enter sales
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-phonepe-700 group-hover:translate-x-1 transition-transform" />
                </button>

                {/* Primary Option 2: Agent Login (with registration inside) */}
                <button
                  type="button"
                  onClick={() => setAgentAuthOpen(true)}
                  className="w-full p-5 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl shadow-xs text-left flex items-center justify-between group transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-base font-bold text-slate-900 block group-hover:text-phonepe-700">
                        User Login
                      </span>
                      <span className="text-xs text-slate-500">
                        Access data & salary (Registration included)
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>


            </div>
          </div>
        )}

        {/* VIEW 2: Form questionnaire (Only appears when Fill Form clicked) */}
        {currentView === "form" && (
          <PublicEntryForm
            onBackToLanding={() => setCurrentView("landing")}
          />
        )}

        {/* VIEW 3: Agent Dashboard */}
        {currentView === "agent_dash" && currentUser?.role === "agent" && (
          <AgentDashboard user={currentUser} onLogout={handleLogout} />
        )}

        {/* VIEW 4: CM Dashboard */}
        {currentView === "cm_dash" && currentUser?.role === "cm" && (
          <CMDashboard user={currentUser} onLogout={handleLogout} />
        )}

        {/* VIEW 5: ZH Dashboard */}
        {currentView === "zh_dash" && currentUser?.role === "zh" && (
          <ZHDashboard user={currentUser} onLogout={handleLogout} />
        )}

        {/* VIEW 6: Developer Dashboard */}
        {currentView === "developer_dash" && currentUser?.role === "developer" && (
          <DeveloperDashboard user={currentUser} onLogout={handleLogout} />
        )}
      </main>

      {/* Universal Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs font-medium text-slate-600">
        <div className="max-w-6xl mx-auto px-4 flex flex-col items-center justify-center text-center gap-1">
          <p className="text-phonepe-900 font-bold text-xs sm:text-sm">
            Created By- Premium Sales (Hyderabad Team)
          </p>
          <p className="text-phonepe-700 text-xs font-semibold">
            mail:- <a href="mailto:calcify.sales@gmail.com" className="text-phonepe-600 underline hover:text-phonepe-800">calcify.sales@gmail.com</a>
          </p>
        </div>
      </footer>

      {/* Auth Modals */}
      <AgentAuthModal
        isOpen={agentAuthOpen}
        onClose={() => setAgentAuthOpen(false)}
        meta={meta}
        onLoginSuccess={handleLoginSuccess}
      />

      <AdminAuthModal
        isOpen={adminAuthOpen}
        onClose={() => setAdminAuthOpen(false)}
        role={adminRoleToOpen}
        quotas={meta?.quotas}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
