import React, { useState, useEffect } from "react";
import {
  Crown,
  FileSpreadsheet,
  Settings,
  AlertTriangle,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Save,
  RefreshCw,
  Bot,
  Sliders,
  PlusCircle,
  Trash2,
  Users,
  Calendar,
  Layers,
  HelpCircle,
  Plus,
  X,
  UploadCloud
} from "lucide-react";
import BulkUploadModal from "./BulkUploadModal.jsx";
import { dataService, standardizeDate, matchesDateFilter } from "../services/dataService.js";

export default function ZHDashboard({ user, onLogout }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kpiSettings, setKpiSettings] = useState(null);

  // Active Main Tab: "master" | "users" | "form_config"
  const [activeTab, setActiveTab] = useState("master");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCluster, setFilterCluster] = useState("all");
  const [filterValid, setFilterValid] = useState("all");
  const [filterKpi, setFilterKpi] = useState("all");
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);

  // Day and Month wise Filters (defaults to Month wise)
  const [dateFilterType, setDateFilterType] = useState("month"); // "all", "month", "day"
  const todayStr = new Date().toISOString().split("T")[0];
  const thisMonthStr = todayStr.slice(0, 7); // "YYYY-MM"
  const [selectedMonth, setSelectedMonth] = useState(thisMonthStr);
  const [selectedDay, setSelectedDay] = useState(todayStr);

  // Registered Users (ZH can remove Users and CMs)
  const [rosterData, setRosterData] = useState({ cms: [], agents: [] });
  const [rosterLoading, setRosterLoading] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);

  // Filled Form Row Deletion (ZH master delete)
  const [deletingRow, setDeletingRow] = useState(null);
  const [deleteRowLoading, setDeleteRowLoading] = useState(false);
  const [deleteRowError, setDeleteRowError] = useState("");

  // Form Questions & KPI Editing Modal/Tab
  const [formQuestions, setFormQuestions] = useState(null);
  const [editEvaRate, setEditEvaRate] = useState(82);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Inline TPV edit
  const [editingTpvRowId, setEditingTpvRowId] = useState(null);
  const [tempTpvValue, setTempTpvValue] = useState("");
  const [updatingRowId, setUpdatingRowId] = useState(null);

  // AI Assistant
  const [aiLoading, setAiLoading] = useState(false);
  const [aiData, setAiData] = useState(null);

  const fetchZHData = () => {
    setLoading(true);
    try {
      const data = dataService.getKpiData({ role: "zh" });
      setRows(data.rows || []);
      setKpiSettings(data.kpiSettings);
      setEditEvaRate(data.kpiSettings?.evaRate || 82);
      setFormQuestions(data.kpiSettings?.formQuestions || null);
    } catch (err) {
      console.error("Failed to load ZH entries:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoster = () => {
    setRosterLoading(true);
    try {
      const users = dataService.getUsers();
      setRosterData({
        cms: users.filter((u) => u.role === "cm"),
        agents: users.filter((u) => u.role === "agent")
      });
    } catch (err) {
      console.error("Failed to load user roster:", err);
    } finally {
      setRosterLoading(false);
    }
  };

  useEffect(() => {
    fetchZHData();
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
        }
      }
    }
  }, [rows]);

  useEffect(() => {
    if (activeTab === "users") {
      fetchRoster();
    }
  }, [activeTab]);

  const handleSaveFormAndKpiSettings = (e) => {
    e?.preventDefault();
    setSavingSettings(true);
    setSettingsSuccess(false);

    try {
      dataService.updateSettings({
        evaRate: Number(editEvaRate) || 82,
        formQuestions: formQuestions
      });

      setSettingsSuccess(true);
      fetchZHData();
      setTimeout(() => setSettingsSuccess(false), 2500);
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleConfirmDeleteUser = () => {
    if (!deletingUser) return;
    try {
      dataService.deleteUser(deletingUser.id, { role: "zh" });
      fetchRoster();
      fetchZHData();
      setDeletingUser(null);
    } catch (err) {
      console.error("Failed to delete user:", err);
    }
  };

  const handleConfirmDeleteRow = () => {
    if (!deletingRow) return;
    setDeleteRowLoading(true);
    setDeleteRowError("");
    try {
      dataService.deleteEntry(deletingRow.entryId, { role: "zh" });
      setDeletingRow(null);
      fetchZHData();
    } catch (err) {
      setDeleteRowError(err.message || "Failed to delete submission.");
    } finally {
      setDeleteRowLoading(false);
    }
  };

  const handleDownloadExcel = () => {
    try {
      dataService.exportToExcel();
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  const runAiAnalysis = () => {
    setAiLoading(true);
    try {
      const data = dataService.analyzeAI({ role: "zh" });
      setAiData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleToggleValid = (row) => {
    const newStatus = row.isValid === "Yes" ? "No" : "Yes";
    setUpdatingRowId(row.rowId);
    try {
      dataService.updateKpiRow(row.entryId, { kpiType: row.kpiType, isValid: newStatus });
      fetchZHData();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingRowId(null);
    }
  };

  const handleSaveTpv = (row) => {
    setUpdatingRowId(row.rowId);
    try {
      dataService.updateKpiRow(row.entryId, { kpiType: row.kpiType, tpv: Number(tempTpvValue) || 0 });
      fetchZHData();
      setEditingTpvRowId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingRowId(null);
    }
  };

  // ----------------------------------------------------
  // FILTER ROWS (INCLUDING DAY & MONTH WISE)
  // ----------------------------------------------------
  const filteredRows = rows.filter((r) => {
    const matchesDate = matchesDateFilter(r.dateOfSale, dateFilterType, selectedMonth, selectedDay);

    // 2. Cluster Filter
    const matchesCluster = filterCluster === "all" ? true : r.clusterManager === filterCluster;

    // 3. Search Term
    const matchesSearch =
      (r.agentName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.merchantId || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.storeId || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.cbsName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.kpiValue || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.mobile || "").includes(searchTerm);

    // 4. Valid Filter
    const matchesValid = filterValid === "all" ? true : r.isValid === filterValid;

    // 5. KPI Activity Filter
    const matchesKpi = filterKpi === "all" ? true : r.kpiType === filterKpi;

    // 6. Duplicates Filter
    const matchesDuplicate = showDuplicatesOnly ? r.isDuplicate : true;

    return matchesDate && matchesCluster && matchesSearch && matchesValid && matchesKpi && matchesDuplicate;
  });

  // ----------------------------------------------------
  // METRICS: TOTAL SUBMISSIONS, TOTAL SO, TOTAL PA, TOTAL TPV, TOTAL SO VALID
  // ----------------------------------------------------
  const totalSubmissions = filteredRows.length;
  const totalSO = filteredRows.filter((r) => r.kpiType === "SO Done").length;
  const totalPA = filteredRows.filter((r) => r.kpiType === "Premium Acquisition").length;
  const totalOrgTpv = filteredRows.reduce((sum, r) => sum + (r.tpv || 0), 0);
  const totalSOValid = filteredRows.filter((r) => r.kpiType === "SO Done" && r.isValid === "Yes").length;
  const totalOrgGrossEva = filteredRows.reduce((sum, r) => sum + (r.grossEva || 0), 0);
  const totalDuplicateCount = filteredRows.filter((r) => r.isDuplicate).length;
  const currentEvaRate = kpiSettings?.evaRate || 82;

  const clusters = Array.from(new Set(rows.map((r) => r.clusterManager).filter(Boolean)));

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-5 sm:space-y-6">
      {/* Top Super Admin Banner (PhonePe White & Violet) */}
      <div className="bg-white border border-phonepe-100 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 sm:w-12 h-11 sm:h-12 rounded-2xl bg-phonepe-700 flex items-center justify-center text-white font-bold text-xl shadow-sm flex-shrink-0">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                  {user.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-phonepe-50 text-phonepe-700 border border-phonepe-200">
                  Zonal Head
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Admin Control • Manage Form Questions • Remove Users & CM/CL • Excel Export
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab("master")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "master"
                  ? "bg-phonepe-700 text-white shadow-sm"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
              }`}
            >
              Master Data
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("users")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "users"
                  ? "bg-phonepe-700 text-white shadow-sm"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>User & CM Roster</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("form_config")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "form_config"
                  ? "bg-phonepe-700 text-white shadow-sm"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Form Questions & Rate</span>
            </button>

            <button
              type="button"
              onClick={() => setUploadModalOpen(true)}
              className="px-3 py-2 bg-phonepe-700 hover:bg-phonepe-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              title="Bulk Activity Upload (Excel/CSV)"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Upload File</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadExcel}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              title="Download Excel Report"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Excel</span>
            </button>

            <button
              type="button"
              onClick={fetchZHData}
              className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-phonepe-700" : ""}`} />
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="px-3.5 py-2 bg-slate-50 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-200 hover:border-red-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>

        {totalDuplicateCount > 0 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                <strong>{totalDuplicateCount} Duplicate entries flagged</strong> (same M.id & S.id within same Activity).
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowDuplicatesOnly(!showDuplicatesOnly)}
              className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
            >
              {showDuplicatesOnly ? "Show All Rows" : "View Duplicates Only"}
            </button>
          </div>
        )}
      </div>

      {/* ==================================================== */}
      {/* TAB 1: MASTER DATA VIEW                              */}
      {/* ==================================================== */}
      {activeTab === "master" && (
        <div className="space-y-5">
          {/* Day and Month wise Filter Bar */}
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
              Showing: <strong className="text-slate-800">{totalSubmissions}</strong> submissions
            </div>
          </div>

          {/* Org Metrics: Total submissions, Total SO, Total PA, Total TPV, Total SO Valid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
            <div className="bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 shadow-2xs">
              <p className="text-[11px] text-slate-500 uppercase font-semibold">Total submissions</p>
              <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{totalSubmissions}</p>
              <span className="text-[10px] text-slate-400">All activity records</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 shadow-2xs">
              <p className="text-[11px] text-slate-500 uppercase font-semibold">Total SO</p>
              <p className="text-xl sm:text-2xl font-black text-phonepe-700 mt-0.5">{totalSO}</p>
              <span className="text-[10px] text-slate-400">Sales orders</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 shadow-2xs">
              <p className="text-[11px] text-slate-500 uppercase font-semibold">Total PA</p>
              <p className="text-xl sm:text-2xl font-black text-purple-700 mt-0.5">{totalPA}</p>
              <span className="text-[10px] text-slate-400">Premium acquisition</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 shadow-2xs">
              <p className="text-[11px] text-slate-500 uppercase font-semibold">Total TPV</p>
              <p className="text-lg sm:text-xl font-black text-slate-900 mt-0.5 truncate">
                ₹{totalOrgTpv.toLocaleString("en-IN")}
              </p>
              <span className="text-[10px] text-slate-400">Transaction volume</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 shadow-2xs">
              <p className="text-[11px] text-slate-500 uppercase font-semibold">Total SO Valid</p>
              <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5">{totalSOValid}</p>
              <span className="text-[10px] text-emerald-600 font-medium">Approved SO</span>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-phonepe-700 text-white rounded-xl py-2.5 px-3.5 shadow-xs">
              <p className="text-[11px] text-phonepe-100 uppercase font-bold tracking-wider">
                Total Gross EVA
              </p>
              <p className="text-xl sm:text-2xl font-black text-white mt-0.5">
                {totalOrgGrossEva}
              </p>
              <span className="text-[10px] text-phonepe-200 font-medium block">
                Rate ₹{currentEvaRate}/EVA
              </span>
            </div>
          </div>

          {/* MASTER DATA Table Card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-4 sm:p-5 space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-wider">
                  MASTER DATA
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  ZH Super Admin view: edit <strong>Valid</strong> & <strong>TPV</strong> on any record.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search M.id, S.id, CBS, User..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-phonepe-500"
                  />
                </div>

                <select
                  value={filterCluster}
                  onChange={(e) => setFilterCluster(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-phonepe-500 cursor-pointer"
                >
                  <option value="all">All Clusters</option>
                  {clusters.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <select
                  value={filterKpi}
                  onChange={(e) => setFilterKpi(e.target.value)}
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

            {/* Mobile-Friendly Master Data Table */}
            <div className="overflow-x-auto -mx-4 sm:mx-0 border-t border-slate-100">
              <table className="w-full text-left border-collapse min-w-[950px]">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">User & ACE Number</th>
                    <th className="py-3 px-3">Cluster Manager</th>
                    <th className="py-3 px-3">Merchant & Store</th>
                    <th className="py-3 px-3">CBS Name</th>
                    <th className="py-3 px-3">Activity & Option</th>
                    <th className="py-3 px-3 text-center">Valid</th>
                    <th className="py-3 px-3 text-right">TPV (₹)</th>
                    <th className="py-3 px-3 text-right">Gross EVA</th>
                    <th className="py-3 px-3 text-right">Valid EVA</th>
                    <th className="py-3 px-3 text-right">Tentative Pay</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="text-center py-10 text-slate-400">
                        No records match the current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => (
                      <tr
                        key={row.rowId}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          row.isDuplicate ? "bg-amber-50/40" : ""
                        }`}
                      >
                        <td className="py-3 px-3 font-mono whitespace-nowrap">
                          {row.dateOfSale}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900">{row.agentName}</div>
                          <div className="text-[11px] text-slate-400 font-mono">ACE: {row.mobile}</div>
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-800">
                          {row.clusterManager}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 font-mono uppercase font-bold text-slate-900">
                            <span>{row.merchantId}</span>
                            {row.isDuplicate && (
                              <span
                                className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-200 text-amber-900"
                                title="Duplicate Merchant ID + Store ID within this Activity"
                              >
                                DUP
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono uppercase">
                            Store: {row.storeId}
                          </div>
                        </td>
                        <td className="py-3 px-3 max-w-[140px] truncate" title={row.cbsName}>
                          {row.cbsName}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-phonepe-800 block text-xs">
                            {row.kpiType}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {row.kpiValue}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {row.activity === "Successfull REKYC" ? (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-300">
                              Valid ✓
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleValid(row)}
                              disabled={updatingRowId === row.rowId}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                                row.isValid === "Yes"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                                  : "bg-red-50 text-red-700 border-red-300 hover:bg-red-100"
                              }`}
                            >
                              {row.isValid === "Yes" ? "Valid ✓" : "Invalid ✕"}
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {editingTpvRowId === row.rowId ? (
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="number"
                                value={tempTpvValue}
                                onChange={(e) => setTempTpvValue(e.target.value)}
                                className="w-20 px-2 py-0.5 border border-phonepe-300 rounded text-xs font-mono text-right"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveTpv(row)}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                              >
                                <Save className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => {
                                setEditingTpvRowId(row.rowId);
                                setTempTpvValue(row.tpv || 0);
                              }}
                              className="font-mono text-slate-900 cursor-pointer hover:underline"
                              title="Click to edit TPV"
                            >
                              ₹{(row.tpv || 0).toLocaleString("en-IN")}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-phonepe-700">
                          {row.grossEva}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-700">
                          {row.validEva}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                          ₹{(row.tentativePay || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-3 text-right">
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
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: USER & CM ROSTER (ZH CAN REMOVE USERS & CM)   */}
      {/* ==================================================== */}
      {activeTab === "users" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Registered Cluster Managers (CM / CL)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Zonal Head authority: remove registered Cluster Managers when required.
              </p>
            </div>

            <div className="overflow-x-auto border-t border-slate-100">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Assigned Cluster</th>
                    <th className="py-2.5 px-3">Registered Date</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {rosterData.cms.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        No Cluster Managers registered yet.
                      </td>
                    </tr>
                  ) : (
                    rosterData.cms.map((cm) => (
                      <tr key={cm.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-3 font-bold text-slate-900">{cm.name}</td>
                        <td className="py-3 px-3 font-mono text-slate-600">{cm.email}</td>
                        <td className="py-3 px-3 text-slate-700">{cm.cluster || "All Clusters"}</td>
                        <td className="py-3 px-3 text-slate-400 font-mono">
                          {cm.createdAt ? cm.createdAt.split("T")[0] : "—"}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => setDeletingUser(cm)}
                            className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 ml-auto transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove CM</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Registered Sales Users (Agents)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Zonal Head authority: remove registered Sales Users across all clusters.
              </p>
            </div>

            <div className="overflow-x-auto border-t border-slate-100">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                    <th className="py-2.5 px-3">User Name</th>
                    <th className="py-2.5 px-3">ACE Number</th>
                    <th className="py-2.5 px-3">Cluster Manager</th>
                    <th className="py-2.5 px-3">Registered Date</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {rosterData.agents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        No Sales Users registered yet.
                      </td>
                    </tr>
                  ) : (
                    rosterData.agents.map((ag) => (
                      <tr key={ag.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-3 font-bold text-slate-900">{ag.name}</td>
                        <td className="py-3 px-3 font-mono text-slate-600">ACE: {ag.mobile}</td>
                        <td className="py-3 px-3 text-slate-700">{ag.clusterManager || "Unassigned"}</td>
                        <td className="py-3 px-3 text-slate-400 font-mono">
                          {ag.createdAt ? ag.createdAt.split("T")[0] : "—"}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => setDeletingUser(ag)}
                            className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 ml-auto transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove User</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: FORM QUESTIONS & KPI CONFIGURATION            */}
      {/* ==================================================== */}
      {activeTab === "form_config" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Form Questions & EVA Configuration
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Make additions and corrections to Activities, questions, and EVA point values.
              </p>
            </div>
            {settingsSuccess && (
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold animate-in fade-in">
                Saved successfully!
              </span>
            )}
          </div>

          {/* Rate Setting */}
          <div className="p-4 bg-phonepe-50/60 border border-phonepe-100 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <label className="block text-xs font-bold text-phonepe-950">
                Payout Rate per Valid EVA (₹)
              </label>
              <p className="text-xs text-slate-500 mt-0.5">
                Multiplier used to calculate tentative pay from Valid EVA
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-600">₹</span>
              <input
                type="number"
                value={editEvaRate}
                onChange={(e) => setEditEvaRate(e.target.value)}
                className="w-24 px-3 py-1.5 bg-white border border-phonepe-300 rounded-xl text-sm font-bold font-mono text-phonepe-900 focus:outline-none focus:ring-2 focus:ring-phonepe-500 text-right"
              />
            </div>
          </div>

          {/* Activities List Configuration */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Configured Activities & Questions
            </h3>

            {(formQuestions?.activities || []).map((act, actIdx) => (
              <div
                key={act.id || actIdx}
                className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">
                      Activity Name
                    </label>
                    <input
                      type="text"
                      value={act.label || act.name}
                      onChange={(e) => {
                        const updated = { ...formQuestions };
                        updated.activities[actIdx].label = e.target.value;
                        setFormQuestions(updated);
                      }}
                      className="mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 w-full max-w-sm"
                    />
                  </div>

                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">
                      Question Text
                    </label>
                    <input
                      type="text"
                      value={act.question || act.name}
                      onChange={(e) => {
                        const updated = { ...formQuestions };
                        updated.activities[actIdx].question = e.target.value;
                        setFormQuestions(updated);
                      }}
                      className="mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 w-full max-w-sm"
                    />
                  </div>
                </div>

                {/* Options for this activity */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Options & EVA Points
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {(act.options || []).map((opt, optIdx) => (
                      <div
                        key={optIdx}
                        className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <input
                          type="text"
                          value={opt.label}
                          onChange={(e) => {
                            const updated = { ...formQuestions };
                            updated.activities[actIdx].options[optIdx].label = e.target.value;
                            setFormQuestions(updated);
                          }}
                          className="text-xs font-semibold text-slate-800 w-full border-none focus:outline-none"
                        />
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-[10px] text-slate-400 font-bold">EVA:</span>
                          <input
                            type="number"
                            value={opt.points !== undefined ? opt.points : 2}
                            onChange={(e) => {
                              const updated = { ...formQuestions };
                              updated.activities[actIdx].options[optIdx].points = Number(e.target.value) || 0;
                              setFormQuestions(updated);
                            }}
                            className="w-12 px-1 py-0.5 border border-slate-200 rounded text-xs font-bold font-mono text-center"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              disabled={savingSettings}
              onClick={handleSaveFormAndKpiSettings}
              className="py-2.5 px-6 bg-phonepe-700 hover:bg-phonepe-800 text-white font-bold rounded-xl text-xs shadow-sm transition-all cursor-pointer disabled:opacity-60 flex items-center gap-2"
            >
              {savingSettings ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Configuration...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Form & KPI Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal to Delete User / CM */}
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
                Are you sure you want to remove <strong>{deletingUser.name}</strong> ({deletingUser.email || (deletingUser.mobile ? `ACE: ${deletingUser.mobile}` : "")})? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-sm"
              >
                Confirm Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal to Delete Form Submission */}
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
                <span className="text-slate-400 font-medium">Date & Activity:</span>
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

      {/* Bulk Activity Upload Modal */}
      <BulkUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        role="zh"
        onUploadSuccess={() => fetchZHData()}
      />
    </div>
  );
}
