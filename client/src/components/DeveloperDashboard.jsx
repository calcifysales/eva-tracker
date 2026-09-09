import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  UploadCloud,
  FileSpreadsheet,
  Users,
  Sliders,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Play,
  Save,
  Eye,
  ArrowRight,
  Sparkles,
  Send,
  Search,
  Bot,
  UserCheck,
  DollarSign,
  TrendingUp,
  Award,
  Layers,
  HelpCircle,
  X,
  Calendar
} from "lucide-react";
import ZHDashboard from "./ZHDashboard.jsx";
import CMDashboard from "./CMDashboard.jsx";
import AgentDashboard from "./AgentDashboard.jsx";
import BulkUploadModal from "./BulkUploadModal.jsx";
import { dataService, standardizeDate, matchesDateFilter } from "../services/dataService.js";

export default function DeveloperDashboard({ user, onLogout }) {
  // Navigation: "studio" | "zh_view" | "cm_view" | "agent_view"
  const [activeView, setActiveView] = useState("studio");
  const [selectedCmName, setSelectedCmName] = useState("Sriteja Mallepalli");
  const [selectedAgentAce, setSelectedAgentAce] = useState("");

  // Data states
  const [users, setUsers] = useState({ cms: [], agents: [] });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kpiSettings, setKpiSettings] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Day and Month wise filter (defaults to Month wise)
  const todayStr = new Date().toISOString().split("T")[0];
  const thisMonthStr = todayStr.slice(0, 7);
  const [dateFilterType, setDateFilterType] = useState("month"); // "all", "month", "day"
  const [selectedMonth, setSelectedMonth] = useState(thisMonthStr);
  const [selectedDay, setSelectedDay] = useState(todayStr);

  // Submissions search & filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActivity, setFilterActivity] = useState("all");
  const [filterValid, setFilterValid] = useState("all");

  // Deletion modals
  const [deletingRow, setDeletingRow] = useState(null);
  const [deleteRowLoading, setDeleteRowLoading] = useState(false);
  const [deleteRowError, setDeleteRowError] = useState("");

  const [clearAllModalOpen, setClearAllModalOpen] = useState(false);
  const [clearAllLoading, setClearAllLoading] = useState(false);

  const [deletingUser, setDeletingUser] = useState(null);
  const [deleteUserLoading, setDeleteUserLoading] = useState(false);

  // Simple visual rates settings state
  const [configMonth, setConfigMonth] = useState(thisMonthStr);
  const [rateEva, setRateEva] = useState(82);
  const [pointsSO3499, setPointsSO3499] = useState(5);
  const [pointsSOPref, setPointsSOPref] = useState(3);
  const [pointsSOUntag, setPointsSOUntag] = useState(1);
  const [pointsPANonInd, setPointsPANonInd] = useState(4);
  const [pointsPAInd, setPointsPAInd] = useState(2);
  const [pointsRekycInd, setPointsRekycInd] = useState(2);
  const [pointsRekycNonInd, setPointsRekycNonInd] = useState(3);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Sample data generation
  const [genCount, setGenCount] = useState(15);
  const [generating, setGenerating] = useState(false);
  const [genNotice, setGenNotice] = useState("");

  // AI Insights
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);

  const loadRatesForMonth = (targetMonth) => {
    try {
      const mCfg = dataService.getSettingsForMonth(targetMonth);
      setRateEva(mCfg.evaRate || 82);
      if (mCfg.kpiPoints) {
        setPointsSO3499(mCfg.kpiPoints.soDone?.["3499"] ?? 5);
        setPointsSOPref(mCfg.kpiPoints.soDone?.["Preferred Base"] ?? 3);
        setPointsSOUntag(mCfg.kpiPoints.soDone?.["Untagged Base"] ?? 1);
        setPointsPANonInd(mCfg.kpiPoints.premiumAcquisition?.["Non-Individual"] ?? 4);
        setPointsPAInd(mCfg.kpiPoints.premiumAcquisition?.["Individual"] ?? 2);
        setPointsRekycInd(mCfg.kpiPoints.rekyc?.["Individual"] ?? mCfg.kpiPoints.rekyc?.["Done"] ?? 2);
        setPointsRekycNonInd(mCfg.kpiPoints.rekyc?.["Non-Individual"] ?? 3);
      }
    } catch (e) {
      console.error("Failed to load rates for month:", e);
    }
  };

  const loadData = () => {
    setLoading(true);
    try {
      const allUsers = dataService.getUsers();
      const uData = {
        cms: allUsers.filter((u) => u.role === "cm"),
        agents: allUsers.filter((u) => u.role === "agent")
      };

      setUsers(uData);
      if (uData.agents?.length > 0 && !selectedAgentAce) {
        setSelectedAgentAce(uData.agents[0].mobile);
      }

      const eData = dataService.getKpiData({ role: "developer" });
      setRows(eData.rows || []);
      if (eData.kpiSettings) {
        setKpiSettings(eData.kpiSettings);
      }
      loadRatesForMonth(configMonth);
    } catch (err) {
      console.error("Developer load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Auto-focus latest available month if no records match default month
  useEffect(() => {
    if (rows && rows.length > 0) {
      const hasCurrentMonth = rows.some((r) => matchesDateFilter(r.dateOfSale, "month", selectedMonth, ""));
      if (!hasCurrentMonth) {
        const dates = rows.map((r) => standardizeDate(r.dateOfSale)).filter(Boolean).sort().reverse();
        if (dates.length > 0) {
          const latestMonth = dates[0].slice(0, 7);
          setSelectedMonth(latestMonth);
          setSelectedDay(dates[0]);
          setConfigMonth(latestMonth);
          loadRatesForMonth(latestMonth);
        }
      }
    }
  }, [rows]);

  // Save settings (Rates & Points for specific month)
  const handleSaveRates = () => {
    setSavingSettings(true);
    setSettingsSuccess(false);
    try {
      const updatedPayload = {
        evaRate: Number(rateEva) || 82,
        kpiPoints: {
          soDone: {
            "3499": Number(pointsSO3499) || 5,
            "Preferred Base": Number(pointsSOPref) || 3,
            "Untagged Base": Number(pointsSOUntag) || 1
          },
          premiumAcquisition: {
            "Non-Individual": Number(pointsPANonInd) || 4,
            "Individual": Number(pointsPAInd) || 2
          },
          rekyc: {
            "Done": Number(pointsRekycInd) || 2,
            "Individual": Number(pointsRekycInd) || 2,
            "Non-Individual": Number(pointsRekycNonInd) || 3
          }
        }
      };

      dataService.updateSettings(updatedPayload, configMonth);
      setSettingsSuccess(true);
      loadData();
      setTimeout(() => setSettingsSuccess(false), 3500);
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setSavingSettings(false);
    }
  };

  // Delete single submission
  const handleConfirmDeleteRow = () => {
    if (!deletingRow) return;
    setDeleteRowLoading(true);
    setDeleteRowError("");
    try {
      dataService.deleteEntry(deletingRow.entryId, { role: "developer" });
      setDeletingRow(null);
      loadData();
    } catch (err) {
      setDeleteRowError(err.message || "Failed to delete submission.");
    } finally {
      setDeleteRowLoading(false);
    }
  };

  // Clear all submissions
  const handleConfirmClearAll = () => {
    setClearAllLoading(true);
    try {
      dataService.deleteAllEntries("developer");
      setClearAllModalOpen(false);
      loadData();
    } catch (err) {
      console.error("Failed to clear entries:", err);
    } finally {
      setClearAllLoading(false);
    }
  };

  // Delete user account
  const handleConfirmDeleteUser = () => {
    if (!deletingUser) return;
    setDeleteUserLoading(true);
    try {
      dataService.deleteUser(deletingUser.id, { role: "developer" });
      setDeletingUser(null);
      loadData();
    } catch (err) {
      console.error("Failed to delete user:", err);
    } finally {
      setDeleteUserLoading(false);
    }
  };

  // Toggle Valid (Yes/No)
  const handleToggleValid = (row) => {
    const newStatus = row.isValid === "Yes" ? "No" : "Yes";
    try {
      dataService.updateKpiRow(row.entryId, { kpiType: row.kpiType, isValid: newStatus });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Generate sample activities
  const handleGenerateSample = () => {
    setGenerating(true);
    setGenNotice("");
    try {
      const data = dataService.generateSampleActivities(genCount);
      setGenNotice(`✓ ${data.message}`);
      loadData();
      setTimeout(() => setGenNotice(""), 4000);
    } catch (err) {
      setGenNotice("Error: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  // AI Assistant runner
  const handleRunAiAssistant = (customPrompt) => {
    const query = customPrompt || aiPrompt;
    if (!query) return;
    setAiGenerating(true);
    try {
      const data = dataService.analyzeAI({ role: "developer", prompt: query });
      setAiResponse(data);
    } catch (err) {
      console.error(err);
    } finally {
      setAiGenerating(false);
    }
  };

  // Filter rows by date for metrics and submissions
  const dateFilteredRows = rows.filter((r) =>
    matchesDateFilter(r.dateOfSale, dateFilterType, selectedMonth, selectedDay)
  );

  const totalEntries = dateFilteredRows.length;
  const totalUsers = (users.cms?.length || 0) + (users.agents?.length || 0);
  const totalTpv = dateFilteredRows.reduce((s, r) => s + (r.tpv || 0), 0);
  const totalGrossEva = dateFilteredRows.reduce((s, r) => s + (r.grossEva || 0), 0);
  const totalValidEva = dateFilteredRows.reduce((s, r) => s + (r.validEva || 0), 0);
  const totalPayout = dateFilteredRows.reduce((s, r) => s + (r.tentativePay || 0), 0);

  // Filtered rows for Submissions Manager
  const filteredRows = dateFilteredRows.filter((r) => {
    const matchesSearch =
      (r.agentName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.merchantId || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.storeId || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.cbsName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.kpiValue || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.mobile || "").includes(searchTerm);

    const matchesActivity = filterActivity === "all" ? true : r.kpiType === filterActivity;
    const matchesValid = filterValid === "all" ? true : r.isValid === filterValid;

    return matchesSearch && matchesActivity && matchesValid;
  });

  // ==========================================
  // IMPERSONATED LIVE VIEWS
  // ==========================================
  if (activeView === "zh_view") {
    return (
      <div className="space-y-4">
        <div className="bg-phonepe-950 text-white px-4 py-2.5 rounded-2xl flex items-center justify-between shadow-md max-w-7xl mx-auto text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Developer Impersonation Mode: <strong>Zonal Head View</strong></span>
          </div>
          <button
            type="button"
            onClick={() => setActiveView("studio")}
            className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-900 rounded-lg font-bold cursor-pointer transition-colors"
          >
            ← Return to Developer Studio
          </button>
        </div>
        <ZHDashboard
          user={{
            id: "zh_dev_master",
            role: "zh",
            name: "Zonal Head (Dev Mode)",
            email: "calcify.sales@gmail.com"
          }}
          onLogout={onLogout}
        />
      </div>
    );
  }

  if (activeView === "cm_view") {
    return (
      <div className="space-y-4">
        <div className="bg-purple-950 text-white px-4 py-2.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md max-w-7xl mx-auto text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
            <span>Developer Impersonation: <strong>Cluster Manager View</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-purple-200">Select CM:</label>
            <select
              value={selectedCmName}
              onChange={(e) => setSelectedCmName(e.target.value)}
              className="bg-purple-900 border border-purple-700 text-white text-xs px-2.5 py-1 rounded-lg font-medium"
            >
              {[
                "Sriteja Mallepalli",
                "Mullapudi Sai",
                "Gireesh Pavalla",
                "Mohd Shafi",
                "Doppa Anil Kumar",
                "Chaitanya",
                "Sajja Vinay Kumar"
              ].map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setActiveView("studio")}
              className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-900 rounded-lg font-bold cursor-pointer transition-colors ml-2"
            >
              ← Return to Developer Studio
            </button>
          </div>
        </div>
        <CMDashboard
          user={{
            id: `cm_${selectedCmName.replace(/\s+/g, "_").toLowerCase()}`,
            role: "cm",
            name: selectedCmName,
            email: `${selectedCmName.toLowerCase().replace(/\s+/g, ".")}@phonepe.com`,
            cluster: selectedCmName
          }}
          onLogout={onLogout}
        />
      </div>
    );
  }

  if (activeView === "agent_view") {
    const currentAgent = users.agents.find((a) => a.mobile === selectedAgentAce) || {
      name: "Tharun Kumar",
      mobile: "9121067616",
      clusterManager: "Sriteja Mallepalli"
    };

    return (
      <div className="space-y-4">
        <div className="bg-slate-900 text-white px-4 py-2.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md max-w-7xl mx-auto text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Developer Impersonation: <strong>Sales User (Agent) View</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-slate-300">Select User:</label>
            <select
              value={selectedAgentAce}
              onChange={(e) => setSelectedAgentAce(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white text-xs px-2.5 py-1 rounded-lg font-medium"
            >
              {users.agents.length === 0 ? (
                <option value="9121067616">Tharun Kumar (ACE: 9121067616)</option>
              ) : (
                users.agents.map((ag) => (
                  <option key={ag.mobile} value={ag.mobile}>
                    {ag.name} (ACE: {ag.mobile}) - {ag.clusterManager}
                  </option>
                ))
              )}
            </select>
            <button
              type="button"
              onClick={() => setActiveView("studio")}
              className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-900 rounded-lg font-bold cursor-pointer transition-colors ml-2"
            >
              ← Return to Developer Studio
            </button>
          </div>
        </div>
        <AgentDashboard
          user={{
            id: `agent_${currentAgent.mobile}`,
            role: "agent",
            name: currentAgent.name,
            mobile: currentAgent.mobile,
            clusterManager: currentAgent.clusterManager
          }}
          onLogout={onLogout}
        />
      </div>
    );
  }

  // ==========================================
  // MAIN DEVELOPER STUDIO VIEW (CODE-FREE)
  // ==========================================
  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6">
      {/* 1. Master Developer Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-phonepe-700 flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                  Developer Control Center
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-phonepe-50 text-phonepe-800 border border-phonepe-200">
                  Master Access
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-100 text-slate-700">
                  calcify.sales@gmail.com
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Full platform controls • Visual rates & settings • Delete filled forms • Impersonate live portals
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => setUploadModalOpen(true)}
              className="px-3.5 py-2 bg-phonepe-700 hover:bg-phonepe-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Bulk Activity Upload</span>
            </button>

            <button
              type="button"
              onClick={() => setClearAllModalOpen(true)}
              className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Delete all submitted forms"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All Submissions</span>
            </button>

            <button
              type="button"
              onClick={loadData}
              className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 transition-colors cursor-pointer"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-phonepe-700" : ""}`} />
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="px-3.5 py-2 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Live View Switcher (Impersonation) */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <Eye className="w-4 h-4 text-phonepe-700" />
            <span>Switch Live View (Impersonate Portal):</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveView("zh_view")}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Zonal Head View</span>
              <ArrowRight className="w-3 h-3 text-phonepe-700" />
            </button>

            <button
              type="button"
              onClick={() => setActiveView("cm_view")}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Cluster Manager View</span>
              <ArrowRight className="w-3 h-3 text-purple-700" />
            </button>

            <button
              type="button"
              onClick={() => setActiveView("agent_view")}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Sales User (Agent) View</span>
              <ArrowRight className="w-3 h-3 text-amber-700" />
            </button>
          </div>
        </div>
      </div>

      {/* Date Filter Bar (Defaults to Month Wise) */}
      <div className="bg-white border border-slate-200 rounded-xl py-2 px-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mr-1">
            <Calendar className="w-3.5 h-3.5 text-phonepe-700" />
            Date Filter:
          </span>

          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setDateFilterType("all")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                dateFilterType === "all"
                  ? "bg-white text-phonepe-800 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => setDateFilterType("month")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                dateFilterType === "month"
                  ? "bg-white text-phonepe-800 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Month wise
            </button>
            <button
              type="button"
              onClick={() => setDateFilterType("day")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                dateFilterType === "day"
                  ? "bg-white text-phonepe-800 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Day wise
            </button>
          </div>

          {dateFilterType === "month" && (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-phonepe-500 cursor-pointer"
            />
          )}

          {dateFilterType === "day" && (
            <input
              type="date"
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-phonepe-500 cursor-pointer"
            />
          )}
        </div>

        <div className="text-xs text-slate-500">
          Showing: <strong className="text-slate-800">{filteredRows.length}</strong> of <strong className="text-slate-800">{rows.length}</strong> submissions
          {dateFilterType === "month" && <span className="text-phonepe-700 font-bold ml-1">({selectedMonth})</span>}
          {dateFilterType === "day" && <span className="text-phonepe-700 font-bold ml-1">({selectedDay})</span>}
        </div>
      </div>

      {/* 2. Platform Overview Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        <div className="bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 shadow-2xs">
          <p className="text-[11px] text-slate-500 uppercase font-semibold">Submissions</p>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{totalEntries}</p>
          <span className="text-[10px] text-slate-400">Total filled forms</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 shadow-2xs">
          <p className="text-[11px] text-slate-500 uppercase font-semibold">Registered Users</p>
          <p className="text-xl sm:text-2xl font-black text-phonepe-700 mt-0.5">{totalUsers}</p>
          <span className="text-[10px] text-slate-400">CMs & Agents</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 shadow-2xs">
          <p className="text-[11px] text-slate-500 uppercase font-semibold">Total TPV</p>
          <p className="text-lg sm:text-xl font-black text-slate-900 mt-0.5 truncate">
            ₹{totalTpv.toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-slate-400">Volume logged</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 shadow-2xs">
          <p className="text-[11px] text-slate-500 uppercase font-semibold">Gross EVA</p>
          <p className="text-xl sm:text-2xl font-black text-purple-700 mt-0.5">{totalGrossEva}</p>
          <span className="text-[10px] text-purple-600 font-medium">Platform total</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 shadow-2xs">
          <p className="text-[11px] text-slate-500 uppercase font-semibold">EVA Rate</p>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5">₹{rateEva}</p>
          <span className="text-[10px] text-emerald-600 font-medium">Per Valid EVA</span>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-phonepe-700 text-white rounded-xl py-2.5 px-3.5 shadow-xs">
          <p className="text-[11px] text-phonepe-100 uppercase font-bold tracking-wider">
            Total Payout
          </p>
          <p className="text-xl sm:text-2xl font-black text-white mt-0.5">
            ₹{totalPayout.toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-phonepe-200 font-medium block">
            Valid EVA × ₹{rateEva}
          </span>
        </div>
      </div>

      {/* 3. Graphical Platform Rates & Points Editor (NO CODE) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Sliders className="w-4 h-4 text-phonepe-700" />
              <h2 className="text-base font-bold text-slate-900">Platform Rates & EVA Points Configuration</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-phonepe-100 text-phonepe-800 border border-phonepe-200">
                Month: {configMonth}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Select month to configure. Saving applies changes to that month's EVA structure and automatically recalculates all submissions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
              <label className="text-xs font-bold text-slate-700">Target Month:</label>
              <input
                type="month"
                value={configMonth}
                onChange={(e) => {
                  if (e.target.value) {
                    setConfigMonth(e.target.value);
                    loadRatesForMonth(e.target.value);
                  }
                }}
                className="bg-white border border-slate-300 rounded-lg px-2 py-0.5 text-xs font-bold text-phonepe-800 focus:outline-none focus:ring-1 focus:ring-phonepe-500 cursor-pointer"
              />
            </div>

            <button
              type="button"
              disabled={savingSettings}
              onClick={handleSaveRates}
              className="px-4 py-2 bg-phonepe-700 hover:bg-phonepe-800 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60"
            >
              {savingSettings ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Rates for {configMonth}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {settingsSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Platform rates for month <strong>{configMonth}</strong> successfully updated and auto-applied to all submissions!</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Rate Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <span className="text-xs font-bold text-slate-700 block">Rate per Valid EVA (₹)</span>
            <p className="text-[11px] text-slate-500">Multiplier for Tentative Pay calculation</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-lg font-bold text-slate-900">₹</span>
              <input
                type="number"
                value={rateEva}
                onChange={(e) => setRateEva(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-phonepe-500"
              />
            </div>
          </div>

          {/* SO Points */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
            <span className="text-xs font-bold text-slate-700 block">SO Done EVA Points</span>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600">3499:</span>
                <input
                  type="number"
                  step="0.5"
                  value={pointsSO3499}
                  onChange={(e) => setPointsSO3499(e.target.value)}
                  className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg font-bold text-right text-xs"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600">Preferred Base:</span>
                <input
                  type="number"
                  step="0.5"
                  value={pointsSOPref}
                  onChange={(e) => setPointsSOPref(e.target.value)}
                  className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg font-bold text-right text-xs"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600">Untagged Base:</span>
                <input
                  type="number"
                  step="0.5"
                  value={pointsSOUntag}
                  onChange={(e) => setPointsSOUntag(e.target.value)}
                  className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg font-bold text-right text-xs"
                />
              </div>
            </div>
          </div>

          {/* PA Points */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
            <span className="text-xs font-bold text-slate-700 block">Premium Acquisition EVA</span>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600">Non-Individual:</span>
                <input
                  type="number"
                  step="0.5"
                  value={pointsPANonInd}
                  onChange={(e) => setPointsPANonInd(e.target.value)}
                  className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg font-bold text-right text-xs"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600">Individual:</span>
                <input
                  type="number"
                  step="0.5"
                  value={pointsPAInd}
                  onChange={(e) => setPointsPAInd(e.target.value)}
                  className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg font-bold text-right text-xs"
                />
              </div>
            </div>
          </div>

          {/* REKYC Points */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
            <span className="text-xs font-bold text-slate-700 block">REKYC EVA Points</span>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600">Individual:</span>
                <input
                  type="number"
                  step="0.5"
                  value={pointsRekycInd}
                  onChange={(e) => setPointsRekycInd(e.target.value)}
                  className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg font-bold text-right text-xs"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600">Non-Individual:</span>
                <input
                  type="number"
                  step="0.5"
                  value={pointsRekycNonInd}
                  onChange={(e) => setPointsRekycNonInd(e.target.value)}
                  className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg font-bold text-right text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Form Submissions Manager (Delete filled forms & toggle valid) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-phonepe-700" />
              <span>Form Submissions Manager (Filled Forms)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Developer master control: review, toggle validity, or delete individual filled form submissions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search M.id, S.id, User, ACE..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-phonepe-500"
              />
            </div>

            <select
              value={filterActivity}
              onChange={(e) => setFilterActivity(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-phonepe-500 cursor-pointer"
            >
              <option value="all">All Activities</option>
              <option value="SO Done">SO Done</option>
              <option value="Premium Acquisition">Premium Acquisition</option>
              <option value="Successfull REKYC">Successfull REKYC</option>
            </select>

            <select
              value={filterValid}
              onChange={(e) => setFilterValid(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-phonepe-500 cursor-pointer"
            >
              <option value="all">Valid & Invalid</option>
              <option value="Yes">Valid Only</option>
              <option value="No">Invalid Only</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left border-collapse min-w-[1080px]">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">User & ACE Number</th>
                <th className="py-2.5 px-3">Cluster Manager</th>
                <th className="py-2.5 px-3">Merchant / Store</th>
                <th className="py-2.5 px-3">CBS Name</th>
                <th className="py-2.5 px-3">Activity & Option</th>
                <th className="py-2.5 px-3 text-center">Valid</th>
                <th className="py-2.5 px-3 text-right">TPV (₹)</th>
                <th className="py-2.5 px-3 text-right">Gross EVA</th>
                <th className="py-2.5 px-3 text-right">Valid EVA</th>
                <th className="py-2.5 px-3 text-right">EVA Rate</th>
                <th className="py-2.5 px-3 text-right">Tentative Pay</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-8 text-center text-slate-400">
                    No form submissions found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.rowId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                      {row.dateOfSale}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{row.agentName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">ACE: {row.mobile}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">{row.clusterManager}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-mono uppercase font-bold text-slate-900">{row.merchantId}</div>
                      <div className="text-[11px] text-slate-500 font-mono">Store: {row.storeId}</div>
                    </td>
                    <td className="py-2.5 px-3 max-w-[140px] truncate text-slate-700" title={row.cbsName}>
                      {row.cbsName}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-phonepe-800 block text-xs">{row.kpiType}</span>
                      <span className="text-[11px] text-slate-500">{row.kpiValue}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleValid(row)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                          row.isValid === "Yes"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                            : "bg-red-50 text-red-700 border-red-300"
                        }`}
                      >
                        {row.isValid === "Yes" ? "Valid ✓" : "Invalid ✕"}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      ₹{(row.tpv || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-phonepe-700">
                      {row.grossEva}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                      {row.validEva}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      ₹{row.evaRate || 82}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                      ₹{(row.tentativePay || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setDeletingRow(row);
                          setDeleteRowError("");
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Form Submission"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Registered User & CM Manager + Sample Generator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Sample Generator (Friendly Card, No Code) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <Play className="w-4 h-4 text-phonepe-700" />
            <span>Sample Activity Batch Injector</span>
          </div>
          <p className="text-xs text-slate-500">
            Populate realistic SO, Premium Acquisition, and REKYC records across agent accounts with 1 click.
          </p>

          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Batch Size:
              </label>
              <select
                value={genCount}
                onChange={(e) => setGenCount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-phonepe-500"
              >
                <option value={5}>5 Activities</option>
                <option value={15}>15 Activities</option>
                <option value={30}>30 Activities</option>
                <option value={50}>50 Activities</option>
              </select>
            </div>

            {genNotice && (
              <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                {genNotice}
              </p>
            )}

            <button
              type="button"
              disabled={generating}
              onClick={handleGenerateSample}
              className="w-full py-2.5 bg-phonepe-700 hover:bg-phonepe-800 disabled:opacity-60 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              {generating ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>Inject {genCount} Sample Activities</span>
            </button>
          </div>
        </div>

        {/* Registered Users Roster (CMs & Agents) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Users className="w-4 h-4 text-phonepe-700" />
              <span>Registered Users & Cluster Managers</span>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              {users.cms?.length || 0} CMs • {users.agents?.length || 0} Agents
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl max-h-64">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Role</th>
                  <th className="py-2 px-3">Name</th>
                  <th className="py-2 px-3">Contact / ACE</th>
                  <th className="py-2 px-3">Cluster</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.cms?.map((cm) => (
                  <tr key={cm.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                        CM
                      </span>
                    </td>
                    <td className="py-2 px-3 font-bold text-slate-900">{cm.name}</td>
                    <td className="py-2 px-3 font-mono text-slate-600">{cm.email}</td>
                    <td className="py-2 px-3 text-slate-700">{cm.cluster || "All Clusters"}</td>
                    <td className="py-2 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => setDeletingUser(cm)}
                        className="text-red-600 hover:text-red-700 font-semibold text-xs hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}

                {users.agents?.map((ag) => (
                  <tr key={ag.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-phonepe-100 text-phonepe-800">
                        User
                      </span>
                    </td>
                    <td className="py-2 px-3 font-bold text-slate-900">{ag.name}</td>
                    <td className="py-2 px-3 font-mono text-slate-600">ACE: {ag.mobile}</td>
                    <td className="py-2 px-3 text-slate-700">{ag.clusterManager}</td>
                    <td className="py-2 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => setDeletingUser(ag)}
                        className="text-red-600 hover:text-red-700 font-semibold text-xs hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}

                {(users.cms?.length === 0 && users.agents?.length === 0) && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No registered users found. Database clean.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 6. AI Performance & Intelligence (Code-Free Cards) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-phonepe-50 text-phonepe-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">AI Platform Insights & Assistant</h2>
              <p className="text-xs text-slate-500">
                Natural language analysis of team validation, duplicate detection, and salary forecasts.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Quick Prompts:</span>
          {[
            "Analyze team validation rate and top clusters",
            "Identify duplicate merchant submission patterns",
            "Calculate tentative payout risk for current month",
            "Suggest optimal EVA rate and target revisions"
          ].map((promptText) => (
            <button
              type="button"
              key={promptText}
              onClick={() => {
                setAiPrompt(promptText);
                handleRunAiAssistant(promptText);
              }}
              className="px-2.5 py-1 bg-slate-50 hover:bg-phonepe-50 text-slate-700 hover:text-phonepe-800 border border-slate-200 rounded-lg text-xs transition-colors cursor-pointer"
            >
              {promptText}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Ask AI to analyze submissions, detect anomalies, or forecast team payouts..."
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRunAiAssistant()}
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-phonepe-500"
          />
          <button
            type="button"
            disabled={aiGenerating || !aiPrompt.trim()}
            onClick={() => handleRunAiAssistant()}
            className="px-4 py-2.5 bg-phonepe-700 hover:bg-phonepe-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            {aiGenerating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Analyze</span>
          </button>
        </div>

        {aiResponse && (
          <div className="p-4 bg-purple-50/50 border border-purple-200/80 rounded-xl space-y-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-phonepe-900">
              <Bot className="w-4 h-4 text-phonepe-700" />
              <span>AI Executive Summary</span>
            </div>
            <p className="text-slate-700 font-medium">{aiResponse.executiveSummary}</p>

            {aiResponse.insights && (
              <div className="space-y-1">
                <span className="font-bold text-slate-800 block">Key Observations:</span>
                <ul className="list-disc list-inside space-y-0.5 text-slate-600 pl-1">
                  {aiResponse.insights.map((ins, i) => (
                    <li key={i}>{ins}</li>
                  ))}
                </ul>
              </div>
            )}

            {aiResponse.recommendations && (
              <div className="space-y-1">
                <span className="font-bold text-slate-800 block">Recommendations:</span>
                <ul className="list-disc list-inside space-y-0.5 text-slate-600 pl-1">
                  {aiResponse.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* MODALS */}
      {/* ========================================== */}

      {/* Delete Single Form Submission Modal */}
      {deletingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete Form Submission?
                </h3>
                <p className="text-xs text-slate-500">
                  Entry #{deletingRow.entryId} • {deletingRow.kpiType}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5 text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">User:</span>
                <span className="font-bold text-slate-900">{deletingRow.agentName} (ACE: {deletingRow.mobile})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Merchant & Store:</span>
                <span className="font-mono text-slate-800">{deletingRow.merchantId} / {deletingRow.storeId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Date & Option:</span>
                <span>{deletingRow.dateOfSale} • {deletingRow.kpiValue}</span>
              </div>
            </div>

            {deleteRowError && (
              <p className="text-xs font-semibold text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                {deleteRowError}
              </p>
            )}

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                disabled={deleteRowLoading}
                onClick={() => setDeletingRow(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteRowLoading}
                onClick={handleConfirmDeleteRow}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
              >
                {deleteRowLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Submission</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Submissions Modal */}
      {clearAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 shadow-xl text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Clear All Submissions?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to permanently delete all <strong>{totalEntries}</strong> filled form submissions? This will completely reset the activity database.
              </p>
            </div>
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                disabled={clearAllLoading}
                onClick={() => setClearAllModalOpen(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={clearAllLoading}
                onClick={handleConfirmClearAll}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-sm"
              >
                {clearAllLoading ? "Clearing..." : "Yes, Clear All"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 shadow-xl text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Remove {deletingUser.role === "cm" ? "Cluster Manager" : "User"}?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove <strong>{deletingUser.name}</strong> ({deletingUser.email || (deletingUser.mobile ? `ACE: ${deletingUser.mobile}` : "")})?
              </p>
            </div>
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                disabled={deleteUserLoading}
                onClick={() => setDeletingUser(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteUserLoading}
                onClick={handleConfirmDeleteUser}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-sm"
              >
                {deleteUserLoading ? "Removing..." : "Confirm Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        role="developer"
        onUploadSuccess={() => loadData()}
      />
    </div>
  );
}
