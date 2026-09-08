import React, { useState, useEffect } from "react";
import {
  User,
  Trophy,
  TrendingUp,
  Phone,
  Building2,
  Calendar,
  AlertTriangle,
  Trash2,
  CheckCircle2,
  XCircle,
  Edit2,
  Save,
  Search,
  RefreshCw,
  Award
} from "lucide-react";
import { dataService } from "../services/dataService.js";

export default function AgentDashboard({ user, onLogout }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [agentRank, setAgentRank] = useState(null);
  const [kpiSettings, setKpiSettings] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterKpi, setFilterKpi] = useState("all"); // "all", "SO Done", "Premium Acquisition"
  const [filterValid, setFilterValid] = useState("all"); // "all", "Yes", "No"
  const [filterDuplicate, setFilterDuplicate] = useState(false);

  // Day and Month wise date filter
  const todayStr = new Date().toISOString().split("T")[0];
  const thisMonthStr = todayStr.slice(0, 7);
  const [dateFilterType, setDateFilterType] = useState("all"); // "all", "month", "day"
  const [selectedMonth, setSelectedMonth] = useState(thisMonthStr);
  const [selectedDay, setSelectedDay] = useState(todayStr);

  // Inline TPV edit
  const [editingTpvRowId, setEditingTpvRowId] = useState(null);
  const [tempTpvValue, setTempTpvValue] = useState("");
  const [updatingRowId, setUpdatingRowId] = useState(null);

  // Caution Delete Modal State
  const [deletingRow, setDeletingRow] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const fetchAgentRows = () => {
    setLoading(true);
    try {
      const data = dataService.getKpiData({ role: "agent", mobile: user.mobile });
      setRows(data.rows || []);
      setKpiSettings(data.kpiSettings);
      if (data.agentRank) {
        setAgentRank(data.agentRank);
      }
    } catch (err) {
      console.error("Failed to load agent entries:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.mobile) {
      fetchAgentRows();
    }
  }, [user?.mobile]);

  // Toggle Valid (Yes / No) - Editable by Agent
  const handleToggleValid = (row) => {
    const newStatus = row.isValid === "Yes" ? "No" : "Yes";
    setUpdatingRowId(row.rowId);
    try {
      dataService.updateKpiRow(row.entryId, {
        kpiType: row.kpiType,
        isValid: newStatus
      });
      fetchAgentRows();
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setUpdatingRowId(null);
    }
  };

  // Save TPV - Editable by Agent
  const handleSaveTpv = (row) => {
    setUpdatingRowId(row.rowId);
    try {
      dataService.updateKpiRow(row.entryId, {
        kpiType: row.kpiType,
        tpv: Number(tempTpvValue) || 0
      });
      fetchAgentRows();
      setEditingTpvRowId(null);
    } catch (err) {
      console.error("Failed to save TPV:", err);
    } finally {
      setUpdatingRowId(null);
    }
  };

  // Delete entry with caution modal
  const confirmDelete = () => {
    if (!deletingRow) return;
    setDeleteLoading(true);
    setDeleteError("");

    try {
      dataService.deleteEntry(deletingRow.entryId, { role: "agent", mobile: user.mobile });
      setRows((prev) => prev.filter((r) => r.entryId !== deletingRow.entryId));
      setDeletingRow(null);
      fetchAgentRows();
    } catch (err) {
      setDeleteError(err.message || "Failed to delete.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filtered rows (including Day & Month wise)
  const filteredRows = rows.filter((r) => {
    const matchesDate =
      dateFilterType === "month"
        ? (r.dateOfSale || "").startsWith(selectedMonth)
        : dateFilterType === "day"
        ? r.dateOfSale === selectedDay
        : true;

    const matchesSearch =
      (r.merchantId || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.storeId || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.cbsName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.dateOfSale || "").includes(searchTerm) ||
      (r.kpiValue || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesKpi =
      filterKpi === "all" ? true : r.kpiType === filterKpi;

    const matchesValid =
      filterValid === "all" ? true : r.isValid === filterValid;

    const matchesDuplicate = filterDuplicate ? r.isDuplicate : true;

    return matchesDate && matchesSearch && matchesKpi && matchesValid && matchesDuplicate;
  });

  // Summary Metrics calculated on filteredRows
  const totalKpiRows = filteredRows.length;
  const validKpiRows = filteredRows.filter((r) => r.isValid === "Yes").length;
  const validationRate = totalKpiRows ? Math.round((validKpiRows / totalKpiRows) * 100) : 0;
  const totalTpv = filteredRows.reduce((sum, r) => sum + (r.tpv || 0), 0);
  const totalGrossEva = filteredRows.reduce((sum, r) => sum + (r.grossEva || 0), 0);
  const totalValidEva = filteredRows.reduce((sum, r) => sum + (r.validEva || 0), 0);
  const totalTentativePay = filteredRows.reduce((sum, r) => sum + (r.tentativePay || 0), 0);
  const duplicateCount = filteredRows.filter((r) => r.isDuplicate).length;
  const currentRate = kpiSettings?.evaRate || 82;

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-5 sm:space-y-6">
      {/* Top Profile Banner (PhonePe Violet) */}
      <div className="bg-white border border-phonepe-100 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-phonepe-700 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              {user.name ? user.name.charAt(0).toUpperCase() : "A"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                  {user.name}
                </h1>
              </div>

              {/* Rank Among all Agents with total Gross EVA Scored and Total Orders done */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="px-3 py-1 rounded-lg text-xs font-bold bg-phonepe-50 text-phonepe-800 border border-phonepe-200 flex items-center gap-1.5 shadow-2xs">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  Rank Among all Agents: #{agentRank?.rank || 1} of {agentRank?.totalAgents || 1}
                </span>
                <span className="px-3 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-purple-600" />
                  Total Gross EVA Scored: {agentRank?.totalGrossEva ?? totalGrossEva}
                </span>
                <span className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  Total Orders Done: {agentRank?.totalOrders ?? totalKpiRows}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-2">
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="w-3.5 h-3.5 text-phonepe-700" />
                  ACE: {user.mobile}
                </span>
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-phonepe-700" />
                  Cluster Manager: <strong className="text-slate-800">{user.clusterManager}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchAgentRows}
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

        {duplicateCount > 0 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                <strong>{duplicateCount} Duplicate merchant records</strong> highlighted in your sheet.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setFilterDuplicate(!filterDuplicate)}
              className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
            >
              {filterDuplicate ? "Show All" : "Filter Duplicates"}
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
          Showing: <strong className="text-slate-800">{totalKpiRows}</strong> rows
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2.5 sm:gap-3">
        <div className="bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 shadow-2xs">
          <p className="text-[11px] text-slate-500 uppercase font-semibold">Total KPI Items</p>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{totalKpiRows}</p>
          <span className="text-[10px] text-slate-400">All activity rows</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 shadow-2xs">
          <p className="text-[11px] text-slate-500 uppercase font-semibold">Valid Rows</p>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5">{validKpiRows}</p>
          <span className="text-[10px] text-emerald-600 font-medium">
            {validationRate}% Validation Rate
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 shadow-2xs">
          <p className="text-[11px] text-slate-500 uppercase font-semibold">Total TPV</p>
          <p className="text-lg sm:text-xl font-black text-slate-900 mt-0.5 truncate">
            ₹{totalTpv.toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-slate-400">Transaction volume</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 shadow-2xs">
          <p className="text-[11px] text-slate-500 uppercase font-semibold">Gross EVA</p>
          <p className="text-xl sm:text-2xl font-black text-phonepe-700 mt-0.5">{totalGrossEva}</p>
          <span className="text-[10px] text-phonepe-700/80">Total points</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 shadow-2xs">
          <p className="text-[11px] text-slate-500 uppercase font-semibold">Valid EVA</p>
          <p className="text-xl sm:text-2xl font-black text-phonepe-900 mt-0.5">{totalValidEva}</p>
          <span className="text-[10px] text-slate-500">Approved points</span>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-phonepe-700 text-white rounded-xl py-2.5 px-3.5 shadow-xs">
          <p className="text-[11px] text-phonepe-100 uppercase font-bold tracking-wider">
            Tentative Pay
          </p>
          <p className="text-xl sm:text-2xl font-black text-white mt-0.5">
            ₹{totalTentativePay.toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-phonepe-200 font-medium block">
            Calculated from Valid EVA
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl py-2 px-3.5 flex flex-col sm:flex-row items-center justify-between gap-2.5 shadow-2xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Merchant ID, Store ID, CBS..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-phonepe-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          {/* Filter by KPI Type */}
          <select
            value={filterKpi}
            onChange={(e) => setFilterKpi(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-phonepe-500 cursor-pointer"
          >
            <option value="all">All Activities</option>
            <option value="SO Done">SO Done Only</option>
            <option value="Premium Acquisition">Premium Acquisition Only</option>
            <option value="Successfull REKYC">Successfull REKYC Only</option>
          </select>

          {/* Filter by Valid */}
          <select
            value={filterValid}
            onChange={(e) => setFilterValid(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-phonepe-500 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="Yes">Valid Only (Yes)</option>
            <option value="No">Pending Only (No)</option>
          </select>
        </div>
      </div>

      {/* Analysis Table: Premium Acquisition & SO Done visible in Rows */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Performance Analysis Grid
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              *Only <strong className="text-phonepe-700">Valid</strong> & <strong className="text-phonepe-700">TPV</strong> are editable by Agent. Rest all automated based on ZH inputs.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
            {filteredRows.length} Rows
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200 text-[11px]">
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">KPI Activity</th>
                <th className="py-3 px-3">Merchant ID</th>
                <th className="py-3 px-3">Store ID</th>
                <th className="py-3 px-3">CBS Name</th>
                <th className="py-3 px-3 text-center">Valid (Editable)</th>
                <th className="py-3 px-3 text-right">TPV (Editable)</th>
                <th className="py-3 px-3 text-center">Gross EVA</th>
                <th className="py-3 px-3 text-center">Valid EVA</th>
                <th className="py-3 px-3 text-right">Tentative Pay</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400">
                    No matching sales records found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const isUpdating = updatingRowId === row.rowId;
                  const isSo = row.kpiType === "SO Done";
                  return (
                    <tr
                      key={row.rowId}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        row.isDuplicate ? "bg-amber-50/40" : ""
                      }`}
                    >
                      {/* Date */}
                      <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {row.dateOfSale}
                      </td>

                      {/* KPI Activity Type & Selected Option */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              isSo
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}
                          >
                            {row.kpiType}
                          </span>
                        </div>
                        <div className="text-slate-900 font-bold text-xs mt-0.5">
                          {row.kpiValue}
                        </div>
                      </td>

                      {/* Merchant ID */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        {row.merchantId}
                        {row.isDuplicate && (
                          <span className="block text-[9px] font-bold text-amber-700 uppercase mt-0.5">
                            Duplicate
                          </span>
                        )}
                      </td>

                      {/* Store ID */}
                      <td className="py-3 px-3 font-mono text-slate-600">
                        {row.storeId}
                      </td>

                      {/* CBS Name */}
                      <td className="py-3 px-3 text-slate-800 font-medium max-w-xs truncate">
                        {row.cbsName}
                      </td>

                      {/* Valid (Yes/No) - EDITABLE BY AGENT */}
                      <td className="py-3 px-3 text-center">
                        {row.activity === "Successfull REKYC" ? (
                          <span
                            className="px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 text-emerald-700"
                            title="Valid for ReKYC is always Yes"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Yes</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleToggleValid(row)}
                            className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer border ${
                              row.isValid === "Yes"
                                ? "bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                                : "bg-red-50 border-red-300 text-red-700 hover:bg-red-100"
                            }`}
                            title="Click to toggle Valid (Yes / No)"
                          >
                            {row.isValid === "Yes" ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5" />
                            )}
                            <span>{row.isValid}</span>
                          </button>
                        )}
                      </td>

                      {/* TPV - EDITABLE BY AGENT */}
                      <td className="py-3 px-3 text-right">
                        {editingTpvRowId === row.rowId ? (
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              autoFocus
                              value={tempTpvValue}
                              onChange={(e) => setTempTpvValue(e.target.value)}
                              className="w-20 px-1.5 py-0.5 bg-white border border-phonepe-500 rounded text-xs text-slate-900 text-right"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveTpv(row)}
                              className="p-1 bg-phonepe-700 hover:bg-phonepe-800 text-white rounded cursor-pointer"
                            >
                              <Save className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTpvRowId(row.rowId);
                              setTempTpvValue(String(row.tpv || 0));
                            }}
                            className="group inline-flex items-center gap-1 font-mono text-slate-800 hover:text-phonepe-700 cursor-pointer"
                            title="Click to edit TPV"
                          >
                            <span>₹{(row.tpv || 0).toLocaleString("en-IN")}</span>
                            <Edit2 className="w-3 h-3 text-slate-400 group-hover:text-phonepe-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        )}
                      </td>

                      {/* Gross EVA */}
                      <td className="py-3 px-3 text-center font-bold text-phonepe-700">
                        {row.grossEva}
                      </td>

                      {/* Valid EVA */}
                      <td className="py-3 px-3 text-center font-bold">
                        <span
                          className={
                            row.validEva > 0
                              ? "text-purple-700 font-bold"
                              : "text-slate-400 font-normal"
                          }
                        >
                          {row.validEva}
                        </span>
                      </td>

                      {/* Tentative Pay */}
                      <td className="py-3 px-3 text-right font-mono font-black">
                        <span
                          className={
                            row.tentativePay > 0
                              ? "text-emerald-600 text-sm"
                              : "text-slate-400"
                          }
                        >
                          ₹{row.tentativePay.toLocaleString("en-IN")}
                        </span>
                      </td>

                      {/* Delete Action with Caution */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setDeletingRow(row)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Remove this submission"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Caution Delete Confirmation Modal */}
      {deletingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white border border-red-200 w-full max-w-md rounded-2xl p-6 shadow-xl space-y-4">
            <div className="w-12 h-12 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-center text-red-600 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900">
                Caution: Delete Form Entry?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete this submission? This will remove both the SO Done and Premium Acquisition rows for this merchant.
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Merchant ID:</span>
                <strong className="font-mono text-slate-900">{deletingRow.merchantId}</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Store ID:</span>
                <strong className="font-mono text-slate-900">{deletingRow.storeId}</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>CBS Name:</span>
                <span className="text-phonepe-700 font-medium truncate">{deletingRow.cbsName}</span>
              </div>
            </div>

            {deleteError && (
              <p className="text-xs text-red-600 text-center font-medium">
                {deleteError}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingRow(null)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel / Keep
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={confirmDelete}
                className="py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-sm transition-colors cursor-pointer"
              >
                {deleteLoading ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
