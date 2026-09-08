import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import * as XLSX from "xlsx";
import { v4 as uuidv4 } from "uuid";
import { storage, CLUSTER_MANAGERS_LIST } from "./storage.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());

// ----------------------------------------------------
// 1. PUBLIC METADATA & ENTRY FORM
// ----------------------------------------------------

// Metadata with 7 CM names and quota counts
app.get("/api/public/meta", (req, res) => {
  const users = storage.getUsers();
  const settings = storage.getSettings();

  const zhUsers = users.filter((u) => u.role === "zh");
  const cmUsers = users.filter((u) => u.role === "cm");

  res.json({
    clusterManagers: CLUSTER_MANAGERS_LIST.map((name) => ({
      name,
      designation: "Cluster Manager"
    })),
    evaRate: settings.evaRate || 82,
    currency: settings.currency || "₹",
    kpiPoints: settings.kpiPoints,
    formQuestions: settings.formQuestions || null,
    soDoneOptions: Object.keys(settings.kpiPoints?.soDone || {
      "3499": 5,
      "Preferred Base": 3,
      "Untagged Base": 1
    }),
    premiumAcquisitionOptions: Object.keys(settings.kpiPoints?.premiumAcquisition || {
      "Non-Individual": 4,
      "Individual": 2
    }),
    quotas: {
      zhCount: zhUsers.length,
      zhMax: 2,
      cmCount: cmUsers.length,
      cmMax: 20
    }
  });
});

// Real-time duplicate check SCOPED BY ACTIVITY: SO vs Premium Acquisition vs Successfull REKYC
app.get("/api/entries/check-duplicate", (req, res) => {
  const { merchantId, storeId, activity } = req.query;
  if (!merchantId || !storeId) {
    return res.json({ exists: false, count: 0 });
  }

  const cleanAct = (activity || "SO").trim().toLowerCase();
  const cleanM = merchantId.trim().toLowerCase();
  const cleanS = storeId.trim().toLowerCase();

  const entries = storage.getEntries();
  const matches = entries.filter((e) => {
    const eAct = (e.activity || (e.soDone ? "SO" : (e.premiumAcquisition ? "Premium Acquisition" : "Successfull REKYC"))).trim().toLowerCase();
    const eM = (e.merchantId || "").trim().toLowerCase();
    const eS = (e.storeId || "").trim().toLowerCase();
    return eAct === cleanAct && eM === cleanM && eS === cleanS;
  });

  res.json({
    exists: matches.length > 0,
    count: matches.length,
    matches: matches.map((m) => ({
      id: m.id,
      activity: m.activity,
      agentName: m.agentName || "Unknown",
      dateOfSale: m.dateOfSale,
      cbsName: m.cbsName
    }))
  });
});

// Submit entry with Activity (SO, Premium Acquisition, Successfull REKYC)
app.post("/api/entries", (req, res) => {
  const {
    activity, // "SO", "Premium Acquisition", "Successfull REKYC"
    mobile,
    dateOfSale,
    merchantId,
    storeId,
    cbsName,
    soDone,
    premiumAcquisition,
    rekycValue
  } = req.body;

  if (!activity || !mobile || !dateOfSale || !merchantId || !storeId || !cbsName) {
    return res.status(400).json({ error: "Please fill all required fields." });
  }

  if (activity === "SO" && !soDone) {
    return res.status(400).json({ error: "Please select SO Done option." });
  }

  if (activity === "Premium Acquisition" && !premiumAcquisition) {
    return res.status(400).json({ error: "Please select Premium Acquisition option." });
  }

  const users = storage.getUsers();
  const cleanMobile = mobile.trim().replace(/\D/g, "");
  const registeredAgent = users.find((u) => u.role === "agent" && u.mobile === cleanMobile);
  const agentName = registeredAgent ? registeredAgent.name : "Agent (" + cleanMobile.slice(-4) + ")";
  const clusterManager = registeredAgent ? registeredAgent.clusterManager : "Unassigned";

  const entries = storage.getEntries();
  const newEntry = {
    id: `ent_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    activity: activity.trim(), // "SO", "Premium Acquisition", "Successfull REKYC"
    mobile: cleanMobile,
    agentName,
    clusterManager,
    dateOfSale: dateOfSale.trim(),
    merchantId: merchantId.trim(),
    storeId: storeId.trim(),
    cbsName: cbsName.trim(),
    soDone: activity === "SO" ? soDone.trim() : null,
    premiumAcquisition: activity === "Premium Acquisition" ? premiumAcquisition.trim() : null,
    rekycValue: activity === "Successfull REKYC" ? ((rekycValue || "Individual").trim()) : null,
    soValid: "No",
    soTpv: 0,
    premValid: "No",
    premTpv: 0,
    isValid: activity === "Successfull REKYC" ? "Yes" : "No",
    tpv: 0,
    createdAt: new Date().toISOString()
  };

  entries.unshift(newEntry);
  storage.saveEntries(entries);

  // Pure response collection - returns confirmation
  res.status(201).json({
    message: "Response recorded successfully.",
    id: newEntry.id
  });
});

// ----------------------------------------------------
// 2. AUTHENTICATION & USER REGISTRATION
// ----------------------------------------------------

// Admin Registration: ZH (max 2) & CM (max 20)
app.post("/api/auth/admin/register", (req, res) => {
  const { role, name, email, password, cluster } = req.body;

  if (!role || !name || !email || !password) {
    return res.status(400).json({ error: "All fields are required." });
  }

  const cleanEmail = email.trim().toLowerCase();
  // Validate email domain without mentioning on site
  if (!cleanEmail.endsWith("@phonepe.com")) {
    return res.status(400).json({ error: "Please enter a valid official email address." });
  }

  const users = storage.getUsers();

  if (role === "zh") {
    const zhCount = users.filter((u) => u.role === "zh").length;
    if (zhCount >= 2) {
      return res.status(400).json({
        error: "Maximum registration limit reached. Only 2 Zonal Head (ZH) accounts are allowed."
      });
    }
  }

  if (role === "cm") {
    const cmCount = users.filter((u) => u.role === "cm").length;
    if (cmCount >= 20) {
      return res.status(400).json({
        error: "Maximum registration limit reached. Only 20 Cluster Manager (CM/CL) accounts are allowed."
      });
    }
  }

  const existing = users.find((u) => u.email && u.email.toLowerCase() === cleanEmail);
  if (existing) {
    return res.status(400).json({ error: "An account with this email is already registered." });
  }

  const newAdmin = {
    id: `${role}_${Date.now()}`,
    role,
    name: name.trim(),
    email: cleanEmail,
    password: password.trim(),
    cluster: (cluster || (role === "zh" ? "National" : "Assigned Cluster")).trim(),
    designation: role === "zh" ? "Zonal Head" : "Cluster Manager",
    createdAt: new Date().toISOString()
  };

  users.push(newAdmin);
  storage.saveUsers(users);

  res.status(201).json({
    message: `${role === "zh" ? "ZH" : "CM"} account registered successfully!`,
    user: {
      id: newAdmin.id,
      role: newAdmin.role,
      name: newAdmin.name,
      email: newAdmin.email,
      cluster: newAdmin.cluster,
      designation: newAdmin.designation
    }
  });
});

// Admin Login (Gmail + Password)
app.post("/api/auth/admin/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  // Secret Developer Login
  if (cleanEmail === "calcify.sales@gmail.com" && cleanPassword === "Phonepe@2026") {
    return res.json({
      message: "Developer Master Access Granted!",
      token: "dev_token_secret_2026",
      user: {
        id: "dev_super_master",
        role: "developer",
        name: "Developer (Premium Sales)",
        email: "calcify.sales@gmail.com",
        cluster: "All Clusters (Super Admin)",
        designation: "Lead Platform Developer & Super Admin"
      }
    });
  }

  const users = storage.getUsers();
  const adminUser = users.find(
    (u) => (u.role === "zh" || u.role === "cm") && u.email.toLowerCase() === cleanEmail && u.password === cleanPassword
  );

  if (!adminUser) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  res.json({
    message: "Login successful!",
    token: `admin_token_${adminUser.id}`,
    user: {
      id: adminUser.id,
      role: adminUser.role,
      name: adminUser.name,
      email: adminUser.email,
      cluster: adminUser.cluster,
      designation: adminUser.designation
    }
  });
});

// User Registration ("Register as New User" with 7 CM names)
app.post("/api/auth/agent/signup", (req, res) => {
  const { mobile, name, clusterManager, pin } = req.body;

  if (!mobile || !name || !pin) {
    return res.status(400).json({ error: "Mobile number, Name, and 4-digit PIN are required." });
  }

  const cleanMobile = mobile.trim().replace(/\D/g, "");
  if (cleanMobile.length !== 10) {
    return res.status(400).json({ error: "Mobile number must be exactly 10 digits." });
  }

  const cleanPin = pin.trim();
  if (cleanPin.length !== 4 || isNaN(cleanPin)) {
    return res.status(400).json({ error: "PIN must be exactly 4 digits." });
  }

  const users = storage.getUsers();
  const existing = users.find((u) => u.role === "agent" && u.mobile === cleanMobile);
  if (existing) {
    return res.status(400).json({ error: "An account already exists with this mobile number. Please login." });
  }

  const newAgent = {
    id: `agent_${Date.now()}`,
    role: "agent",
    mobile: cleanMobile,
    name: name.trim(),
    clusterManager: (clusterManager || CLUSTER_MANAGERS_LIST[0]).trim(),
    pin: cleanPin,
    createdAt: new Date().toISOString()
  };

  users.push(newAgent);
  storage.saveUsers(users);

  // Link previous entries
  const entries = storage.getEntries();
  let updatedEntries = false;
  entries.forEach((e) => {
    if (e.mobile === cleanMobile) {
      e.agentName = newAgent.name;
      e.clusterManager = newAgent.clusterManager;
      updatedEntries = true;
    }
  });
  if (updatedEntries) {
    storage.saveEntries(entries);
  }

  res.status(201).json({
    message: "User account created successfully!",
    token: `agent_token_${newAgent.id}`,
    user: {
      id: newAgent.id,
      role: newAgent.role,
      mobile: newAgent.mobile,
      name: newAgent.name,
      clusterManager: newAgent.clusterManager
    }
  });
});

// Agent Login (Mobile + 4-digit PIN)
app.post("/api/auth/agent/login", (req, res) => {
  const { mobile, pin } = req.body;
  if (!mobile || !pin) {
    return res.status(400).json({ error: "Mobile number and 4-digit PIN are required." });
  }

  const cleanMobile = mobile.trim().replace(/\D/g, "");
  const users = storage.getUsers();
  const agent = users.find((u) => u.role === "agent" && u.mobile === cleanMobile && u.pin === pin.trim());

  if (!agent) {
    return res.status(401).json({ error: "Invalid Mobile number or PIN. If new user, please register." });
  }

  res.json({
    message: "Login successful!",
    token: `agent_token_${agent.id}`,
    user: {
      id: agent.id,
      role: agent.role,
      mobile: agent.mobile,
      name: agent.name,
      clusterManager: agent.clusterManager
    }
  });
});

// ----------------------------------------------------
// 3. ROW-BASED KPI ENTRIES & AGENT RANK
// ----------------------------------------------------

// Fetch entries and calculate Rank Among All Agents
app.get("/api/entries", (req, res) => {
  const { role, mobile, clusterManager } = req.query;
  const rawEntries = storage.getEntries();
  const settings = storage.getSettings();

  const allRows = storage.computeEnrichedKpiRows(rawEntries, settings);

  // Calculate ranking stats across all agents
  const agentMap = {};
  allRows.forEach((r) => {
    const m = r.mobile || "unknown";
    if (!agentMap[m]) {
      agentMap[m] = {
        mobile: m,
        agentName: r.agentName,
        totalGrossEva: 0,
        totalOrders: 0,
        totalValidEva: 0
      };
    }
    agentMap[m].totalGrossEva += (r.grossEva || 0);
    agentMap[m].totalOrders += 1;
    agentMap[m].totalValidEva += (r.validEva || 0);
  });

  // Sort descending by totalGrossEva, then totalOrders
  const sortedAgents = Object.values(agentMap).sort((a, b) => {
    if (b.totalGrossEva !== a.totalGrossEva) return b.totalGrossEva - a.totalGrossEva;
    return b.totalOrders - a.totalOrders;
  });

  let agentRankInfo = null;
  if (role === "agent" && mobile) {
    const rankIdx = sortedAgents.findIndex((a) => a.mobile === mobile.trim());
    if (rankIdx !== -1) {
      agentRankInfo = {
        rank: rankIdx + 1,
        totalAgents: Math.max(sortedAgents.length, 1),
        totalGrossEva: sortedAgents[rankIdx].totalGrossEva,
        totalOrders: sortedAgents[rankIdx].totalOrders
      };
    } else {
      agentRankInfo = {
        rank: sortedAgents.length + 1,
        totalAgents: sortedAgents.length + 1,
        totalGrossEva: 0,
        totalOrders: 0
      };
    }
  }

  let filteredRows = allRows;
  if (role === "agent") {
    if (!mobile) return res.status(400).json({ error: "Mobile required." });
    filteredRows = allRows.filter((r) => r.mobile === mobile.trim());
  } else if (role === "cm") {
    if (clusterManager) {
      filteredRows = allRows.filter((r) => {
        return (r.clusterManager || "").toLowerCase() === clusterManager.toLowerCase() ||
               (r.clusterManager || "").toLowerCase().includes(clusterManager.toLowerCase());
      });
    }
  }

  res.json({
    count: filteredRows.length,
    rows: filteredRows,
    agentRank: agentRankInfo,
    kpiSettings: settings
  });
});

// Update an entry's KPI row (Valid and TPV editable)
app.patch("/api/entries/:entryId/row", (req, res) => {
  const { entryId } = req.params;
  const { kpiType, isValid, tpv } = req.body;

  const entries = storage.getEntries();
  const entryIndex = entries.findIndex((e) => e.id === entryId);

  if (entryIndex === -1) {
    return res.status(404).json({ error: "Entry not found." });
  }

  const entry = entries[entryIndex];

  if (entry.activity === "Successfull REKYC" || kpiType === "Successfull REKYC") {
    entry.isValid = "Yes"; // Valid for ReKYC is always Yes
    if (tpv !== undefined) entry.tpv = Number(tpv) || 0;
  } else if (kpiType === "SO Done") {
    if (isValid !== undefined) entry.soValid = isValid;
    if (tpv !== undefined) entry.soTpv = Number(tpv) || 0;
  } else if (kpiType === "Premium Acquisition") {
    if (isValid !== undefined) entry.premValid = isValid;
    if (tpv !== undefined) entry.premTpv = Number(tpv) || 0;
  } else {
    if (isValid !== undefined) {
      entry.soValid = isValid;
      entry.premValid = isValid;
    }
    if (tpv !== undefined) entry.soTpv = Number(tpv) || 0;
  }

  entry.updatedAt = new Date().toISOString();
  entries[entryIndex] = entry;
  storage.saveEntries(entries);

  const updatedRows = storage.computeEnrichedKpiRows([entry]);
  res.json({ message: "Updated successfully.", updatedRows });
});

// Delete entry (Agent can delete their own; CM can delete entries in their cluster; ZH & Developer can delete any)
app.delete("/api/entries/:id", (req, res) => {
  const { id } = req.params;
  const { role, mobile, cmName } = req.query;

  const entries = storage.getEntries();
  const entryIndex = entries.findIndex((e) => e.id === id);

  if (entryIndex === -1) {
    return res.status(404).json({ error: "Entry not found." });
  }

  const entry = entries[entryIndex];
  if (role === "agent") {
    if (!mobile || entry.mobile !== mobile.trim()) {
      return res.status(403).json({ error: "You can only delete your own submitted entries." });
    }
  } else if (role === "cm") {
    if (cmName && (entry.clusterManager || "").toLowerCase() !== cmName.trim().toLowerCase()) {
      return res.status(403).json({ error: "You can only delete entries from agents under your cluster." });
    }
  } else if (role === "zh" || role === "developer") {
    // ZH and Developer have full deletion privileges across all entries
  } else {
    return res.status(403).json({ error: "Unauthorized to delete entry." });
  }

  entries.splice(entryIndex, 1);
  storage.saveEntries(entries);

  res.json({ message: "Entry removed successfully." });
});

// Clear all entries (Developer / ZH only)
app.delete("/api/admin/entries/all", (req, res) => {
  const { role } = req.query;
  const authHeader = req.headers.authorization;
  const isAuth = role === "developer" || role === "zh" || (authHeader && authHeader.includes("Bearer"));

  if (!isAuth) {
    return res.status(403).json({ error: "Unauthorized. Super-admin access required." });
  }

  storage.saveEntries([]);
  res.json({ message: "All filled form submissions cleared successfully." });
});

// Update agent name
app.patch("/api/agents/:id", (req, res) => {
  const { id } = req.params;
  const { name, clusterManager } = req.body;

  const users = storage.getUsers();
  const agent = users.find((u) => u.id === id && u.role === "agent");

  if (!agent) {
    return res.status(404).json({ error: "Agent not found." });
  }

  if (name) agent.name = name.trim();
  if (clusterManager) agent.clusterManager = clusterManager.trim();
  storage.saveUsers(users);

  const entries = storage.getEntries();
  entries.forEach((e) => {
    if (e.mobile === agent.mobile) {
      if (name) e.agentName = agent.name;
      if (clusterManager) e.clusterManager = agent.clusterManager;
    }
  });
  storage.saveEntries(entries);

  res.json({ message: "Agent name updated.", agent });
});

// Fetch agents roster
app.get("/api/agents", (req, res) => {
  const { role, clusterManager } = req.query;
  const users = storage.getUsers();
  let agents = users.filter((u) => u.role === "agent");

  if (role === "cm" && clusterManager) {
    agents = agents.filter(
      (a) => (a.clusterManager || "").toLowerCase() === clusterManager.toLowerCase() ||
             (a.clusterManager || "").toLowerCase().includes(clusterManager.toLowerCase())
    );
  }

  const rows = storage.computeEnrichedKpiRows(storage.getEntries());

  const agentStats = agents.map((agent) => {
    const agentRows = rows.filter((r) => r.mobile === agent.mobile);
    const validRows = agentRows.filter((r) => r.isValid === "Yes");
    const totalTpv = agentRows.reduce((sum, r) => sum + (r.tpv || 0), 0);
    const totalGrossEva = agentRows.reduce((sum, r) => sum + (r.grossEva || 0), 0);
    const totalValidEva = agentRows.reduce((sum, r) => sum + (r.validEva || 0), 0);
    const totalTentativePay = agentRows.reduce((sum, r) => sum + (r.tentativePay || 0), 0);

    return {
      ...agent,
      totalRows: agentRows.length,
      validRows: validRows.length,
      validationRate: agentRows.length ? Math.round((validRows.length / agentRows.length) * 100) : 0,
      totalTpv,
      totalGrossEva,
      totalValidEva,
      totalTentativePay
    };
  });

  res.json({ agents: agentStats });
});

// ----------------------------------------------------
// 4. ZH SETTINGS & KPI MANAGER
// ----------------------------------------------------

app.get("/api/kpi-settings", (req, res) => {
  res.json(storage.getSettings());
});

app.put("/api/kpi-settings", (req, res) => {
  const { evaRate, kpiPoints, formQuestions } = req.body;
  const current = storage.getSettings();
  const updated = {
    ...current,
    evaRate: evaRate !== undefined ? Number(evaRate) : current.evaRate,
    kpiPoints: kpiPoints || current.kpiPoints,
    formQuestions: formQuestions || current.formQuestions
  };
  storage.updateSettings(updated);
  res.json({ message: "Settings updated.", settings: updated });
});

// ----------------------------------------------------
// 5. EXCEL EXPORT
// ----------------------------------------------------

app.get("/api/export/excel", (req, res) => {
  const rawEntries = storage.getEntries();
  const settings = storage.getSettings();
  const rows = storage.computeEnrichedKpiRows(rawEntries, settings);

  const excelRows = rows.map((r, idx) => ({
    "S.No": idx + 1,
    "Date of Sale": r.dateOfSale,
    "Agent Name": r.agentName,
    "ACE Number": r.mobile,
    "Cluster Manager": r.clusterManager,
    "Merchant ID": r.merchantId,
    "Store ID": r.storeId,
    "CBS Name": r.cbsName,
    "KPI Category": r.kpiType,
    "KPI Selected Option": r.kpiValue,
    "Duplicate Entry?": r.isDuplicate ? "YES (DUPLICATE)" : "NO",
    "Valid Status": r.isValid,
    "TPV (₹)": r.tpv,
    "Gross EVA": r.grossEva,
    "Valid EVA": r.validEva,
    "Rate/EVA (₹)": r.evaRate,
    "Tentative Pay (₹)": r.tentativePay
  }));

  const totalTpv = rows.reduce((sum, r) => sum + (r.tpv || 0), 0);
  const totalGrossEva = rows.reduce((sum, r) => sum + (r.grossEva || 0), 0);
  const totalValidEva = rows.reduce((sum, r) => sum + (r.validEva || 0), 0);
  const totalPayout = rows.reduce((sum, r) => sum + (r.tentativePay || 0), 0);

  excelRows.push({
    "S.No": "TOTALS",
    "Date of Sale": `${rows.length} KPI Rows`,
    "Agent Name": "",
    "ACE Number": "",
    "Cluster Manager": "",
    "Merchant ID": "",
    "Store ID": "",
    "CBS Name": "",
    "KPI Category": "",
    "KPI Selected Option": "",
    "Duplicate Entry?": "",
    "Valid Status": `${rows.filter((r) => r.isValid === "Yes").length} Valid`,
    "TPV (₹)": totalTpv,
    "Gross EVA": totalGrossEva,
    "Valid EVA": totalValidEva,
    "Rate/EVA (₹)": settings.evaRate,
    "Tentative Pay (₹)": totalPayout
  });

  const worksheet = XLSX.utils.json_to_sheet(excelRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Calcify_Suite Report");

  worksheet["!cols"] = [
    { wch: 6 },  { wch: 14 }, { wch: 18 }, { wch: 15 }, { wch: 18 },
    { wch: 16 }, { wch: 14 }, { wch: 24 }, { wch: 20 }, { wch: 22 },
    { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
    { wch: 14 }, { wch: 18 }
  ];

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  res.setHeader("Content-Disposition", `attachment; filename=Calcify_Suite_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.send(buffer);
});

// ----------------------------------------------------
// 5B. BULK ACTIVITY UPLOAD & TEMPLATES (ZH & Developer)
// ----------------------------------------------------

// Download Sample Template for Bulk Activity Upload (Excel)
app.get("/api/admin/template/excel", (req, res) => {
  const sampleData = [
    {
      "Date of Sale": "2026-09-08",
      "ACE Number": "9121067616",
      "Agent Name": "Tharun Kumar",
      "Cluster Manager": "Sriteja Mallepalli",
      "Merchant ID": "MERCH_1001",
      "Store ID": "STORE_2001",
      "CBS Name": "Apollo Pharmacy",
      "Activity": "SO",
      "Sub Activity": "3499",
      "Valid Status": "Yes",
      "TPV (₹)": 15000
    },
    {
      "Date of Sale": "2026-09-08",
      "ACE Number": "9121067616",
      "Agent Name": "Tharun Kumar",
      "Cluster Manager": "Sriteja Mallepalli",
      "Merchant ID": "MERCH_1002",
      "Store ID": "STORE_2002",
      "CBS Name": "Ratnadeep Supermarket",
      "Activity": "Premium Acquisition",
      "Sub Activity": "Non-Individual",
      "Valid Status": "Yes",
      "TPV (₹)": 28000
    },
    {
      "Date of Sale": "2026-09-08",
      "ACE Number": "9121067616",
      "Agent Name": "Tharun Kumar",
      "Cluster Manager": "Sriteja Mallepalli",
      "Merchant ID": "MERCH_1003",
      "Store ID": "STORE_2003",
      "CBS Name": "MedPlus Store",
      "Activity": "Successfull REKYC",
      "Sub Activity": "Individual",
      "Valid Status": "Yes",
      "TPV (₹)": 0
    },
    {
      "Date of Sale": "2026-09-08",
      "ACE Number": "9876543210",
      "Agent Name": "New Agent",
      "Cluster Manager": "Mullapudi Sai",
      "Merchant ID": "MERCH_1004",
      "Store ID": "STORE_2004",
      "CBS Name": "Sri Balaji Kirana",
      "Activity": "SO",
      "Sub Activity": "Preferred Base",
      "Valid Status": "No",
      "TPV (₹)": 5000
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Activity Upload Template");

  worksheet["!cols"] = [
    { wch: 14 }, { wch: 15 }, { wch: 18 }, { wch: 20 },
    { wch: 16 }, { wch: 16 }, { wch: 24 }, { wch: 20 },
    { wch: 18 }, { wch: 14 }, { wch: 12 }
  ];

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  res.setHeader("Content-Disposition", `attachment; filename=Calcify_Activity_Upload_Template.xlsx`);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.send(buffer);
});

// Download Sample Template for Bulk Activity Upload (CSV)
app.get("/api/admin/template/csv", (req, res) => {
  const csvContent =
`Date of Sale,ACE Number,Agent Name,Cluster Manager,Merchant ID,Store ID,CBS Name,Activity,Sub Activity,Valid Status,TPV (₹)
2026-09-08,9121067616,Tharun Kumar,Sriteja Mallepalli,MERCH_1001,STORE_2001,Apollo Pharmacy,SO,3499,Yes,15000
2026-09-08,9121067616,Tharun Kumar,Sriteja Mallepalli,MERCH_1002,STORE_2002,Ratnadeep Supermarket,Premium Acquisition,Non-Individual,Yes,28000
2026-09-08,9121067616,Tharun Kumar,Sriteja Mallepalli,MERCH_1003,STORE_2003,MedPlus Store,Successfull REKYC,Individual,Yes,0
2026-09-08,9876543210,New Agent,Mullapudi Sai,MERCH_1004,STORE_2004,Sri Balaji Kirana,SO,Preferred Base,No,5000`;

  res.setHeader("Content-Disposition", `attachment; filename=Calcify_Activity_Upload_Template.csv`);
  res.setHeader("Content-Type", "text/csv");
  res.send(csvContent);
});

// Ingest activities uploaded by ZH or Developer
app.post("/api/admin/upload-activities", (req, res) => {
  const { activities } = req.body;
  if (!activities || !Array.isArray(activities) || activities.length === 0) {
    return res.status(400).json({ error: "No activity records provided for upload." });
  }

  const users = storage.getUsers();
  const entries = storage.getEntries();

  let importedCount = 0;
  let skippedCount = 0;
  const newEntries = [];

  activities.forEach((item, index) => {
    // Extract ACE / mobile number (digits only, last 10 digits)
    const rawMobile = String(
      item.mobile || item.aceNumber || item["ACE Number"] || item["ACE"] || item["Ace Number"] || item["Mobile Number"] || item["Mobile"] || item["Agent Mobile"] || item["mobileNumber"] || ""
    ).replace(/\D/g, "");

    if (!rawMobile || rawMobile.length < 10) {
      skippedCount++;
      return;
    }
    const cleanMobile = rawMobile.slice(-10);

    const rawDate = item.dateOfSale || item["Date of Sale"] || item["Date"] || item["date"] || new Date().toISOString().slice(0, 10);
    const merchantId = String(item.merchantId || item["Merchant ID"] || item["Merchant Id"] || item["MID"] || `M_${Date.now()}_${index}`).trim();
    const storeId = String(item.storeId || item["Store ID"] || item["Store Id"] || item["SID"] || `S_${Date.now()}_${index}`).trim();
    const cbsName = String(item.cbsName || item["CBS Name"] || item["Store Name"] || item["CBS"] || "Uploaded CBS").trim();

    let activity = String(item.activity || item["Activity"] || item["KPI Category"] || "SO").trim();
    const actLower = activity.toLowerCase();
    if (actLower.includes("rekyc") || actLower.includes("kyc")) {
      activity = "Successfull REKYC";
    } else if (actLower.includes("prem") || actLower.includes("acquisition") || actLower.includes("pa")) {
      activity = "Premium Acquisition";
    } else {
      activity = "SO";
    }

    const subValue = String(
      item.rekycValue || item.subActivity || item.soDone || item.premiumAcquisition ||
      item["Sub Activity"] || item["KPI Selected Option"] || item["SO Done"] ||
      item["Premium Acquisition"] || item["Option"] || item["Type"] || item["rekycValue"] || ""
    ).trim();

    // Link agent details if registered user exists
    const registeredAgent = users.find((u) => u.role === "agent" && u.mobile === cleanMobile);
    const agentName = registeredAgent
      ? registeredAgent.name
      : String(item.agentName || item["Agent Name"] || `Agent (${cleanMobile.slice(-4)})`).trim();

    const clusterManager = registeredAgent
      ? registeredAgent.clusterManager
      : String(item.clusterManager || item["Cluster Manager"] || "Unassigned").trim();

    // Validity
    let isValid = "No";
    if (activity === "Successfull REKYC") {
      isValid = "Yes"; // REKYC is ALWAYS Yes
    } else {
      const rawValid = String(item.isValid || item["Valid Status"] || item["Valid"] || "No").trim().toLowerCase();
      isValid = (rawValid === "yes" || rawValid === "true" || rawValid === "1" || rawValid === "valid") ? "Yes" : "No";
    }

    const tpv = Number(item.tpv || item["TPV (₹)"] || item["TPV"] || item["tpv"] || 0) || 0;

    let soDone = null;
    let premiumAcquisition = null;
    let rekycValue = null;

    if (activity === "SO") {
      soDone = subValue || "3499";
    } else if (activity === "Premium Acquisition") {
      premiumAcquisition = subValue || "Non-Individual";
    } else if (activity === "Successfull REKYC") {
      rekycValue = subValue.toLowerCase().includes("non") ? "Non-Individual" : "Individual";
    }

    const newEntry = {
      id: `ent_${Date.now()}_${Math.floor(Math.random() * 10000)}_${index}`,
      activity,
      mobile: cleanMobile,
      agentName,
      clusterManager,
      dateOfSale: String(rawDate).slice(0, 10),
      merchantId,
      storeId,
      cbsName,
      soDone,
      premiumAcquisition,
      rekycValue,
      soValid: isValid,
      soTpv: tpv,
      premValid: isValid,
      premTpv: tpv,
      isValid,
      tpv,
      createdAt: new Date().toISOString()
    };

    newEntries.push(newEntry);
    importedCount++;
  });

  entries.unshift(...newEntries);
  storage.saveEntries(entries);

  res.json({
    message: `Successfully uploaded and added ${importedCount} activities to agent dashboards.`,
    importedCount,
    skippedCount,
    totalRecords: entries.length
  });
});

// Developer Raw Data Inspector & Editor
app.get("/api/admin/raw-data", (req, res) => {
  const { role } = req.query;
  if (role !== "developer") {
    return res.status(403).json({ error: "Developer access only." });
  }

  res.json({
    entries: storage.getEntries(),
    users: storage.getUsers(),
    settings: storage.getSettings()
  });
});

app.post("/api/admin/raw-data", (req, res) => {
  const { role, entity, data } = req.body;
  if (role !== "developer") {
    return res.status(403).json({ error: "Developer access only." });
  }

  if (entity === "entries" && Array.isArray(data)) {
    storage.saveEntries(data);
  } else if (entity === "users" && Array.isArray(data)) {
    storage.saveUsers(data);
  } else if (entity === "settings" && typeof data === "object") {
    storage.saveSettings(data);
  } else {
    return res.status(400).json({ error: "Invalid entity or payload format." });
  }

  res.json({ message: `Raw ${entity} successfully updated!` });
});

// Developer Batch Generator: generate sample activities
app.post("/api/admin/generate-sample-activities", (req, res) => {
  const { count = 10, role } = req.body;
  const authHeader = req.headers.authorization;
  const isAuth = role === "developer" || role === "zh" || (authHeader && authHeader.includes("Bearer"));
  if (!isAuth) {
    return res.status(403).json({ error: "Unauthorized." });
  }

  const entries = storage.getEntries();
  const sampleStores = [
    "Apollo Pharmacy", "MedPlus Chemist", "Ratnadeep Supermarket", "Sri Balaji Kirana",
    "Reliance Smart Bazaar", "D-Mart Express", "Karachi Bakery", "Vijetha Supermarket"
  ];

  const sampleMobiles = [
    { mobile: "9121067616", name: "Tharun Kumar", cm: "Sriteja Mallepalli" },
    { mobile: "9876543210", name: "Ramesh Sharma", cm: "Mullapudi Sai" },
    { mobile: "9849012345", name: "Priya Varma", cm: "Gireesh Pavalla" },
    { mobile: "9988776655", name: "Mohammed Irfan", cm: "Mohd Shafi" }
  ];

  const generated = [];
  const todayStr = new Date().toISOString().slice(0, 10);

  for (let i = 0; i < Number(count); i++) {
    const agent = sampleMobiles[i % sampleMobiles.length];
    const store = sampleStores[i % sampleStores.length];
    const actType = i % 3 === 0 ? "SO" : (i % 3 === 1 ? "Premium Acquisition" : "Successfull REKYC");
    const mNum = Math.floor(1000 + Math.random() * 9000);

    let soDone = null;
    let premiumAcquisition = null;
    let rekycValue = null;
    let isValid = "Yes";
    let tpv = Math.floor(Math.random() * 30) * 1000;

    if (actType === "SO") {
      soDone = i % 2 === 0 ? "3499" : "Preferred Base";
      isValid = i % 4 === 0 ? "No" : "Yes";
    } else if (actType === "Premium Acquisition") {
      premiumAcquisition = i % 2 === 0 ? "Non-Individual" : "Individual";
      isValid = i % 5 === 0 ? "No" : "Yes";
    } else {
      rekycValue = i % 2 === 0 ? "Individual" : "Non-Individual";
      isValid = "Yes";
      tpv = 0;
    }

    generated.push({
      id: `ent_${Date.now()}_gen_${i}`,
      activity: actType,
      mobile: agent.mobile,
      agentName: agent.name,
      clusterManager: agent.cm,
      dateOfSale: todayStr,
      merchantId: `MID_${mNum}`,
      storeId: `SID_${mNum + 50}`,
      cbsName: `${store} (${mNum})`,
      soDone,
      premiumAcquisition,
      rekycValue,
      soValid: isValid,
      soTpv: tpv,
      premValid: isValid,
      premTpv: tpv,
      isValid,
      tpv,
      createdAt: new Date().toISOString()
    });
  }

  entries.unshift(...generated);
  storage.saveEntries(entries);

  res.json({
    message: `Generated ${generated.length} sample activities across agent accounts.`,
    count: generated.length,
    totalRecords: entries.length
  });
});

// ----------------------------------------------------
// 6. AI ANALYTICS
// ----------------------------------------------------

app.post("/api/ai/analyze", async (req, res) => {
  const { role, clusterManager, prompt } = req.body;
  const rawEntries = storage.getEntries();
  const settings = storage.getSettings();
  const rows = storage.computeEnrichedKpiRows(rawEntries, settings);

  let targetRows = rows;
  if (role === "cm" && clusterManager) {
    targetRows = rows.filter(
      (r) => (r.clusterManager || "").toLowerCase() === clusterManager.toLowerCase() ||
             (r.clusterManager || "").toLowerCase().includes(clusterManager.toLowerCase())
    );
  }

  const total = targetRows.length;
  const validCount = targetRows.filter((r) => r.isValid === "Yes").length;
  const validRate = total ? Math.round((validCount / total) * 100) : 0;
  const duplicateCount = targetRows.filter((r) => r.isDuplicate).length;
  const totalTpv = targetRows.reduce((sum, r) => sum + (r.tpv || 0), 0);
  const totalValidEva = targetRows.reduce((sum, r) => sum + (r.validEva || 0), 0);
  const totalPayout = targetRows.reduce((sum, r) => sum + (r.tentativePay || 0), 0);

  let executiveSummary = role === "zh"
    ? `Analyzed ${total} KPI activity records across all clusters. Overall order validation rate is ${validRate}% with total projected salary payout of ₹${totalPayout.toLocaleString("en-IN")} at ₹${settings.evaRate}/EVA.`
    : `Cluster analysis for ${clusterManager || 'Assigned Cluster'}: ${total} KPI activity records analyzed. Team validation rate is ${validRate}% with ₹${totalPayout.toLocaleString("en-IN")} earned in tentative salary.`;

  let insights = [
    `Validation Rate: ${validRate}% (${validCount} valid out of ${total} total KPI entries).`,
    `Total Valid EVA earned: ${totalValidEva} points totaling ₹${totalPayout.toLocaleString("en-IN")}.`,
    duplicateCount > 0 ? `⚠️ ${duplicateCount} duplicate merchant/store rows detected.` : "No duplicate entries detected."
  ];

  let recommendations = [
    "Prioritize high-tier 3499 orders and non-individual premium accounts for maximum EVA payout.",
    "Verify store tags and physical CBS setups to ensure high order validation."
  ];

  res.json({
    executiveSummary,
    insights,
    recommendations,
    directAnswer: prompt ? `Based on ${total} records: ${validCount} are Valid (${validRate}%), generating ₹${totalPayout.toLocaleString("en-IN")} payout liability.` : null,
    stats: { total, validCount, validRate, duplicateCount, totalTpv, totalValidEva, totalPayout, evaRate: settings.evaRate }
  });
});

// ----------------------------------------------------
// USER & CM ROSTER MANAGEMENT (ZH can remove Users & CM; CM can remove Users under them)
// ----------------------------------------------------

app.get("/api/admin/users", (req, res) => {
  const { role, cmName } = req.query;
  const users = storage.getUsers();

  if (role === "zh" || role === "developer") {
    return res.json({
      cms: users.filter((u) => u.role === "cm"),
      agents: users.filter((u) => u.role === "agent")
    });
  }

  if (role === "cm" && cmName) {
    const myAgents = users.filter(
      (u) => u.role === "agent" && (u.clusterManager || "").toLowerCase() === cmName.toLowerCase()
    );
    return res.json({ agents: myAgents });
  }

  res.status(403).json({ error: "Unauthorized access." });
});

app.delete("/api/admin/users/:id", (req, res) => {
  const { id } = req.params;
  const { role, cmName } = req.query;

  const users = storage.getUsers();
  const targetIdx = users.findIndex((u) => u.id === id);

  if (targetIdx === -1) {
    return res.status(404).json({ error: "User account not found." });
  }

  const targetUser = users[targetIdx];

  if (role === "zh" || role === "developer") {
    // ZH and Developer have authority to remove registered Users and CM/CL
    users.splice(targetIdx, 1);
    storage.saveUsers(users);
    return res.json({ message: `Account for ${targetUser.name} removed successfully.` });
  }

  if (role === "cm" && cmName) {
    // CM can only remove users under their cluster
    if (targetUser.role !== "agent" || (targetUser.clusterManager || "").toLowerCase() !== cmName.toLowerCase()) {
      return res.status(403).json({ error: "You can only remove agents registered under your cluster." });
    }
    users.splice(targetIdx, 1);
    storage.saveUsers(users);
    return res.json({ message: `User ${targetUser.name} removed successfully.` });
  }

  res.status(403).json({ error: "Unauthorized operation." });
});

const clientDist = path.join(__dirname, "../client/dist");
app.use(express.static(clientDist));
app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "Endpoint not found" });
  }
  res.sendFile(path.join(clientDist, "index.html"), (err) => {
    if (err) res.send("Calcify_Suite backend running on port " + PORT);
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Calcify_Suite server running on http://0.0.0.0:${PORT}`);
});
