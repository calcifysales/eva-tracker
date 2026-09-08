import React, { useState, useEffect } from "react";
import {
  Users,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Edit3,
  Save,
  Search,
  RefreshCw,
  Bot,
  Send,
  Trash2,
  Edit2
} from "lucide-react";

export default function CMDashboard({ user, onLogout }) {
  const [rows, setRows] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kpiSettings, setKpiSettings] = useState(null);

  // Day and Month wise filter
  const todayStr = new Date().toISOString().split("T")[0];
  const thisMonthStr = todayStr.slice(0, 7);
  const [dateFilterType, setDateFilterType] = useState("all"); // "all", "month", "day"
  const [selectedMonth, setSelectedMonth] = useState(thisMonthStr);
  const [selectedDay, setSelectedDay] = useState(todayStr);

  // Filters
  const [selectedAgentMobile, setSelectedAgentMobile] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterValid, setFilterValid] = useState("all");
  const [filterKpi, setFilterKpi] = useState("all");
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);

  // Agent Name Editing
  const [editingAgent, setEditingAgent] = useState(null);
  const [editAgentNameVal, setEditAgentNameVal] = useState("");
  const [agentSaving, setAgentSaving] = useState(false);

  // User Removal (CM can remove users under them)
  const [deletingAgent, setDeletingAgent] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Form Submission Deletion
  const [deletingRow, setDeletingRow] = useState(null);
  const [deleteRowLoading, setDeleteRowLoading] = useState(false);
  const [deleteRowError, setDeleteRowError] = useState("");

  // Entry updates (Valid and TPV)
  const [editingTpvRowId, setEditingTpvRowId] = useState(null);
  const [tempTpvValue, setTempTpvValue] = useState("");
  const [updatingRowId, setUpdatingRowId] = useState(null);

  // AI Assistant
  const [aiLoading, setAiLoading] = useState(false);
  const [aiData, setAiData] = useState(null);
  const [aiCustomPrompt, setAiCustomPrompt] = useState("");
  const [aiDirectAnswer, setAiDirectAnswer] = useState(null);

  const fetchCMData = async () => {
    setLoading(true);
    try {
      const resRows = await fetch(
        `/api/entries?role=cm&clusterManager=${encodeURIComponent(user.name)}`
      );
      const dataRows = await resRows.json();
      if (resRows.ok) {
        setRows(dataRows.rows || []);
        setKpiSettings(dataRows.kpiSettings);
      }

      const resAgents = await fetch(
        `/api/agents?role=cm&clusterManager=${encodeURIComponent(user.name)}`
      );
      const dataAgents = await resAgents.json();
      if (resAgents.ok) {
        setAgents(dataAgents.agents || []);
      }
    } catch (err) {
      console.error("Failed to load CM data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.name) {
      fetchCMData();
    }
  }, [user?.name]);

  const runAiAnalysis = async (customQ = null) => {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "cm",
          clusterManager: user.name,
          prompt: customQ || aiCustomPrompt
        })
      });
      const data = await res.json();
      if (res.ok) {
        setAiData(data);
        if (customQ || aiCustomPrompt) setAiDirectAnswer(data.directAnswer);
      }
    } catch (err) {
      console.error("AI failed:", err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleToggleValid = async (row) => {
    const newStatus = row.isValid === "Yes" ? "No" : "Yes";
    setUpdatingRowId(row.rowId);
    try {
      const res = await fetch(`/api/entries/${row.entryId}/row`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kpiType: row.kpiType, isValid: newStatus })
      });
      if (res.ok) fetchCMData();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingRowId(null);
    }
  };

  const handleSaveTpv = async (row) => {
    setUpdatingRowId(row.rowId);
    try {
      const res = await fetch(`/api/entries/${row.entryId}/row`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kpiType: row.kpiType, tpv: Number(tempTpvValue) || 0 })
      });
      if (res.ok) {
        fetchCMData();
        setEditingTpvRowId(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingRowId(null);
    }
  };

  const handleSaveAgentName = async (e) => {
    e.preventDefault();
    if (!editingAgent || !editAgentNameVal.trim()) return;
    setAgentSaving(true);
    try {
      const res = await fetch(`/api/agents/${editingAgent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editAgentNameVal.trim() })
      });
      if (res.ok) {
        setEditingAgent(null);
        fetchCMData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAgentSaving(false);
    }
  };

  // CM user removal handler
  const handleConfirmDeleteAgent = async () => {
    if (!deletingAgent) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(
        `/api/admin/users/${deletingAgent.id}?role=cm&cmName=${encodeURIComponent(user.name)}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setDeletingAgent(null);
        fetchCMData();
      }
    } catch (err) {
      console.error("Failed to remove agent:", err);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Form submission deletion handler
  const handleConfirmDeleteRow = async () => {
    if (!deletingRow) return;
    setDeleteRowLoading(true);
    setDeleteRowError("");
    try {
      const res = await fetch(
        `/api/entries/${deletingRow.entryId}?role=cm&cmName=${encodeURIComponent(user.name)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete submission.");
      }
      setRows((prev) => prev.filter((r) => r.entryId !== deletingRow.entryId));
      setDeletingRow(null);
      fetchCMData();
    } catch (err) {
      setDeleteRowError(err.message || "Failed to delete form.");
    } finally {
      setDeleteRowLoading(false);
    }
  };

  // Filter rows (including Day & Month wise)
  const filteredRows = rows.filter((r) => {
    const matchesDate =
      dateFilterType === "month"
        ? (r.dateOfSale || "").startsWith(selectedMonth)
        : dateFilterType === "day"
        ? r.dateOfSale === selectedDay
        : true;

    const matchesAgent = selectedAgentMobile === "all" ? true : r.mobile === selectedAgentMobile;
    const matchesSearch =
      (r.agentName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.merchantId || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.storeId || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.cbsName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.kpiValue || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.mobile || "").includes(searchTerm);
    const matchesValid = filterValid === "all" ? true : r.isValid === filterValid;
    const matchesKpi = filterKpi === "all" ? true : r.kpiType === filterKpi;
    const matchesDuplicate = showDuplicatesOnly ? r.isDuplicate : true;

    return matchesDate && matchesAgent && matchesSearch && matchesValid && matchesKpi && matchesDuplicate;
  });

  const totalClusterRows = filteredRows.length;
  const validClusterRows = filteredRows.filter((r) => r.isValid === "Yes").length;
  const clusterValidationRate = totalClusterRows ? Math.round((validClusterRows / totalClusterRows) * 100) : 0;
  const totalClusterTpv = filteredRows.reduce((sum, r) => sum + (r.tpv || 0), 0);
  const totalClusterValidEva = filteredRows.reduce((sum, r) => sum + (r.validEva || 0), 0);
  const totalClusterPayout = filteredRows.reduce((sum, r) => sum + (r.tentativePay || 0), 0);
  const clusterDuplicateCount = filteredRows.filter((r) => r.isDuplicate).length;
  const currentRate = kpiSettings?.evaRate || 82;

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-5 sm:space-y-6">
      {/* Top Banner (PhonePe White & Violet) */}
      <div className="bg-white border border-phonepe-100 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 sm:w-12 h-11 sm:h-12 rounded-2xl bg-phonepe-700 flex items-center justify-center text-white font-bold text-lg shadow-sm flex-shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                  {user.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-phonepe-50 text-phonepe-700 border border-phonepe-200">
                  Cluster Manager
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Cluster: <span className="text-slate-800 font-semibold">{user.cluster || user.designation}</span> • Filtered strictly to your agents.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => runAiAnalysis()}
              className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Bot className="w-4 h-4 text-purple-600" />
              <span>AI Coach</span>
            </button>
            <button
              type="button"
              onClick={fetchCMData}
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

        {clusterDuplicateCount > 0 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                <strong>{clusterDuplicateCount} Duplicate entries flagged</strong> (same M.id & S.id within same Activity).
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowDuplicatesOnly(!showDuplicatesOnly)}
              className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
            >
              {showDuplicatesOnly ? "Show All Rows" : "View Duplicates"}
            </button>
          </div>
        )}
      </div>

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
          Showing: <strong className="text-slate-800">{totalClusterRows}</strong> entries
        </div>
      </div>

      {/* Cluster Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        <div className="bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 shadow-2xs">
          <p className="text-[11px] text-slate-500 uppercase font-semibold">Active Agents</p>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{agents.length}</p>
          <span className="text-[10px] text-slate-400">Assigned team</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 shadow-2xs">
          <p className="text-[11px] text-slate-500 uppercase font-semibold">Total Submissions</p>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{totalClusterRows}</p>
          <span className="text-[10px] text-slate-400">Filtered entries</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 shadow-2xs">
          <p className="text-[11px] text-slate-500 uppercase font-semibold">Validation Rate</p>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5">{clusterValidationRate}%</p>
          <span className="text-[10px] text-emerald-600 font-medium">
            {validClusterRows} Valid
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 shadow-2xs">
          <p className="text-[11px] text-slate-500 uppercase font-semibold">Cluster TPV</p>
          <p className="text-lg sm:text-xl font-black text-slate-900 mt-0.5 truncate">
            ₹{totalClusterTpv.toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-slate-400">Total volume</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 shadow-2xs">
          <p className="text-[11px] text-slate-500 uppercase font-semibold">Valid EVA</p>
          <p className="text-xl sm:text-2xl font-black text-phonepe-900 mt-0.5">{totalClusterValidEva}</p>
          <span className="text-[10px] text-slate-400">Approved points</span>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-phonepe-700 text-white rounded-xl py-2.5 px-3.5 shadow-xs">
          <p className="text-[11px] text-phonepe-100 uppercase font-bold tracking-wider">
            Team Payout (₹)
          </p>
          <p className="text-xl sm:text-2xl font-black text-white mt-0.5">
            ₹{totalClusterPayout.toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-phonepe-200 font-medium block">
            At ₹{currentRate}/EVA
          </span>
        </div>
      </div>

      {/* Cluster Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-900 uppercase tracking-wider">
              CLUSTER DATA
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review and edit <strong>Valid</strong> & <strong>TPV</strong> for agents in your cluster.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="relative w-full sm:w-52">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search M.id, S.id, CBS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-phonepe-500"
              />
            </div>

            <select
              value={selectedAgentMobile}
              onChange={(e) => setSelectedAgentMobile(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-phonepe-500 cursor-pointer"
            >
              <option value="all">All Agents</option>
              {agents.map((ag) => (
                <option key={ag.mobile} value={ag.mobile}>
                  {ag.name} (ACE: {ag.mobile})
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

        {/* Mobile-Friendly Table */}
        <div className="overflow-x-auto -mx-4 sm:mx-0 border-t border-slate-100">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Agent & ACE</th>
                <th className="py-3 px-3">Merchant & Store</th>
                <th className="py-3 px-3">CBS Name</th>
                <th className="py-3 px-3">Activity & Option</th>
                <th className="py-3 px-3 text-center">Valid</th>
                <th className="py-3 px-3 text-right">TPV (₹)</th>
                <th className="py-3 px-3 text-right">Gross EVA</th>
                <th className="py-3 px-3 text-right">Valid EVA</th>
                <th className="py-3 px-3 text-right">Tentative Pay</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-10 text-slate-400">
                    No records found for the selected filters.
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
                    <td className="py-3 px-3 font-mono whitespace-nowrap">{row.dateOfSale}</td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{row.agentName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">ACE: {row.mobile}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 font-mono uppercase font-bold text-slate-900">
                        <span>{row.merchantId}</span>
                        {row.isDuplicate && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-200 text-amber-900">
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
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setDeletingRow(row)}
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

      {/* Assigned Team Section with Remove Agent Option */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Agents Assigned to {user.name}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cluster Manager authority: rename or remove sales users registered under your cluster.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {agents.map((ag) => (
            <div
              key={ag.id}
              className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs"
            >
              <div>
                <p className="text-xs font-bold text-slate-900">{ag.name}</p>
                <p className="text-[11px] text-slate-500 font-mono">ACE: {ag.mobile}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setEditingAgent(ag);
                    setEditAgentNameVal(ag.name);
                  }}
                  className="p-1.5 text-slate-400 hover:text-phonepe-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
                  title="Edit Name"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingAgent(ag)}
                  className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Remove User Under Me"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Agent Name Modal */}
      {editingAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 shadow-xl space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-bold text-slate-900">Rename Agent</h3>
            <form onSubmit={handleSaveAgentName} className="space-y-3">
              <input
                type="text"
                required
                value={editAgentNameVal}
                onChange={(e) => setEditAgentNameVal(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-phonepe-500"
              />
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingAgent(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={agentSaving}
                  className="px-3 py-1.5 bg-phonepe-700 hover:bg-phonepe-800 text-white text-xs font-bold rounded-xl"
                >
                  {agentSaving ? "Saving..." : "Save Name"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal to Delete Agent */}
      {deletingAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 shadow-xl text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Remove Agent?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove <strong>{deletingAgent.name}</strong> from your cluster?
              </p>
            </div>
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingAgent(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleConfirmDeleteAgent}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-sm"
              >
                {deleteLoading ? "Removing..." : "Confirm Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal to Delete Filled Form Submission */}
      {deletingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 shadow-xl text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Form Submission?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete this filled form for <strong>{deletingRow.cbsName}</strong> ({deletingRow.activity} - {deletingRow.kpiValue}) submitted by <strong>{deletingRow.agentName}</strong>?
              </p>
              {deleteRowError && (
                <p className="text-xs text-red-600 font-medium mt-2">{deleteRowError}</p>
              )}
            </div>
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingRow(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteRowLoading}
                onClick={handleConfirmDeleteRow}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-sm"
              >
                {deleteRowLoading ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
