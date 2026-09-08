import * as XLSX from "xlsx";

export const CLUSTER_MANAGERS_LIST = [
  "Sriteja Mallepalli",
  "Mullapudi Sai",
  "Gireesh Pavalla",
  "Mohd Shafi",
  "Doppa Anil Kumar",
  "Chaitanya",
  "Sajja Vinay Kumar"
];

export const DEFAULT_FORM_QUESTIONS = {
  activities: [
    {
      id: "SO",
      name: "SO",
      label: "SO (Sales Order)",
      question: "SO Done",
      options: [
        { label: "3499", points: 5 },
        { label: "Preferred Base", points: 3 },
        { label: "Untagged Base", points: 1 }
      ]
    },
    {
      id: "Premium Acquisition",
      name: "Premium Acquisition",
      label: "Premium Acquisition",
      question: "Premium Acquisition",
      options: [
        { label: "Non-Individual", points: 4 },
        { label: "Individual", points: 2 }
      ]
    },
    {
      id: "Successfull REKYC",
      name: "Successfull REKYC",
      label: "Successfull REKYC",
      question: "REKYC Status",
      options: [
        { label: "Individual", points: 2 },
        { label: "Non-Individual", points: 3 }
      ]
    }
  ]
};

const DEFAULT_SETTINGS = {
  evaRate: 82,
  currency: "₹",
  kpiPoints: {
    soDone: {
      "3499": 5,
      "Preferred Base": 3,
      "Untagged Base": 1
    },
    premiumAcquisition: {
      "Non-Individual": 4,
      "Individual": 2
    },
    rekyc: {
      "Individual": 2,
      "Non-Individual": 3,
      "Done": 2
    },
    customKpis: []
  },
  formQuestions: DEFAULT_FORM_QUESTIONS,
  clusterManagers: CLUSTER_MANAGERS_LIST
};

const STORAGE_KEYS = {
  SETTINGS: "calcify_settings",
  USERS: "calcify_users",
  ENTRIES: "calcify_entries"
};

function getLocal(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Error reading ${key} from localStorage:`, e);
    return defaultValue;
  }
}

function setLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error(`Error saving ${key} to localStorage:`, e);
    return false;
  }
}

export const dataService = {
  // ----------------------------------------------------
  // SETTINGS & METADATA
  // ----------------------------------------------------
  getSettings() {
    const s = getLocal(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    return {
      ...DEFAULT_SETTINGS,
      ...s,
      formQuestions: s.formQuestions || DEFAULT_FORM_QUESTIONS,
      clusterManagers: CLUSTER_MANAGERS_LIST
    };
  },

  updateSettings(newSettings) {
    const current = this.getSettings();
    const updated = {
      ...current,
      ...newSettings,
      kpiPoints: {
        ...current.kpiPoints,
        ...(newSettings.kpiPoints || {})
      },
      formQuestions: newSettings.formQuestions || current.formQuestions || DEFAULT_FORM_QUESTIONS
    };
    setLocal(STORAGE_KEYS.SETTINGS, updated);
    return updated;
  },

  getMeta() {
    const users = this.getUsers();
    const settings = this.getSettings();
    const zhUsers = users.filter((u) => u.role === "zh");
    const cmUsers = users.filter((u) => u.role === "cm");

    return {
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
    };
  },

  // ----------------------------------------------------
  // USERS & ROSTER
  // ----------------------------------------------------
  getUsers() {
    return getLocal(STORAGE_KEYS.USERS, []);
  },

  saveUsers(users) {
    return setLocal(STORAGE_KEYS.USERS, users);
  },

  deleteUser(id, { role, cmName } = {}) {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error("User account not found.");

    const targetUser = users[idx];
    if (role === "zh" || role === "developer") {
      users.splice(idx, 1);
      this.saveUsers(users);
      return { message: `Account for ${targetUser.name} removed successfully.` };
    }

    if (role === "cm" && cmName) {
      if (targetUser.role !== "agent" || (targetUser.clusterManager || "").toLowerCase() !== cmName.toLowerCase()) {
        throw new Error("You can only remove agents registered under your cluster.");
      }
      users.splice(idx, 1);
      this.saveUsers(users);
      return { message: `User ${targetUser.name} removed successfully.` };
    }

    throw new Error("Unauthorized operation.");
  },

  // ----------------------------------------------------
  // AUTHENTICATION
  // ----------------------------------------------------
  auth: {
    agentSignup({ mobile, pin, name, clusterManager }) {
      if (!mobile || !pin || !name || !clusterManager) {
        throw new Error("All fields are required.");
      }
      const cleanMobile = mobile.trim().replace(/\D/g, "");
      if (cleanMobile.length !== 10) {
        throw new Error("Valid 10-digit ACE Number is required.");
      }
      if (pin.trim().length !== 4) {
        throw new Error("4-digit PIN is required.");
      }

      const users = dataService.getUsers();
      const existing = users.find((u) => u.role === "agent" && u.mobile === cleanMobile);
      if (existing) {
        throw new Error("ACE Number already registered. Please login.");
      }

      const newAgent = {
        id: `agent_${Date.now()}`,
        role: "agent",
        mobile: cleanMobile,
        pin: pin.trim(),
        name: name.trim(),
        clusterManager: clusterManager.trim(),
        createdAt: new Date().toISOString()
      };

      users.push(newAgent);
      dataService.saveUsers(users);

      // Link previously uploaded entries for this ACE number
      const entries = dataService.getEntries();
      let updatedEntries = false;
      entries.forEach((e) => {
        if (e.mobile === cleanMobile) {
          e.agentName = newAgent.name;
          e.clusterManager = newAgent.clusterManager;
          updatedEntries = true;
        }
      });
      if (updatedEntries) {
        dataService.saveEntries(entries);
      }

      return {
        message: "User account created successfully!",
        token: `agent_token_${newAgent.id}`,
        user: {
          id: newAgent.id,
          role: newAgent.role,
          mobile: newAgent.mobile,
          name: newAgent.name,
          clusterManager: newAgent.clusterManager
        }
      };
    },

    agentLogin({ mobile, pin }) {
      if (!mobile || !pin) {
        throw new Error("ACE Number and 4-digit PIN are required.");
      }
      const cleanMobile = mobile.trim().replace(/\D/g, "");
      const users = dataService.getUsers();
      const agent = users.find((u) => u.role === "agent" && u.mobile === cleanMobile && u.pin === pin.trim());

      if (!agent) {
        throw new Error("Invalid ACE Number or PIN. If new user, please register.");
      }

      return {
        message: "Login successful!",
        token: `agent_token_${agent.id}`,
        user: {
          id: agent.id,
          role: agent.role,
          mobile: agent.mobile,
          name: agent.name,
          clusterManager: agent.clusterManager
        }
      };
    },

    adminLogin({ email, password, role }) {
      if (!email || !password || !role) {
        throw new Error("Email, password, and portal role are required.");
      }

      const cleanEmail = email.trim().toLowerCase();

      // Secret Developer Login
      if (cleanEmail === "calcify.sales@gmail.com" && password === "Phonepe@2026") {
        return {
          message: "Welcome to Developer Studio!",
          token: "dev_secret_token",
          user: {
            id: "dev_calcify_sales",
            name: "Lead Developer",
            email: "calcify.sales@gmail.com",
            role: "developer",
            designation: "Platform Architect & Developer"
          }
        };
      }

      const users = dataService.getUsers();
      const admin = users.find((u) => u.role === role && u.email === cleanEmail && u.password === password);

      if (!admin) {
        throw new Error(`Invalid credentials for ${role.toUpperCase()} portal.`);
      }

      return {
        message: `${role.toUpperCase()} Login successful!`,
        token: `admin_token_${admin.id}`,
        user: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          clusterManager: admin.clusterManager,
          designation: admin.designation
        }
      };
    },

    adminRegister({ email, password, name, role, clusterManager }) {
      if (!email || !password || !name || !role) {
        throw new Error("All fields are required.");
      }

      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail.endsWith("@phonepe.com")) {
        throw new Error("Registration failed: Invalid email domain.");
      }

      const users = dataService.getUsers();
      const existing = users.find((u) => u.email === cleanEmail);
      if (existing) {
        throw new Error("Email address already registered. Please login.");
      }

      const newUser = {
        id: `admin_${Date.now()}`,
        email: cleanEmail,
        password,
        name: name.trim(),
        role,
        clusterManager: role === "cm" ? clusterManager : null,
        designation: role === "zh" ? "Zonal Head" : "Cluster Manager",
        createdAt: new Date().toISOString()
      };

      users.push(newUser);
      dataService.saveUsers(users);

      return {
        message: `${role.toUpperCase()} registered successfully!`,
        token: `admin_token_${newUser.id}`,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          clusterManager: newUser.clusterManager,
          designation: newUser.designation
        }
      };
    }
  },

  // ----------------------------------------------------
  // ENTRIES & FORM SUBMISSION
  // ----------------------------------------------------
  getEntries() {
    return getLocal(STORAGE_KEYS.ENTRIES, []);
  },

  saveEntries(entries) {
    return setLocal(STORAGE_KEYS.ENTRIES, entries);
  },

  checkDuplicate({ merchantId, storeId, activity }) {
    if (!merchantId || !storeId) {
      return { exists: false, count: 0, matches: [] };
    }

    const cleanAct = (activity || "SO").trim().toLowerCase();
    const cleanM = merchantId.trim().toLowerCase();
    const cleanS = storeId.trim().toLowerCase();

    const entries = this.getEntries();
    const matches = entries.filter((e) => {
      const eAct = (e.activity || (e.soDone ? "SO" : (e.premiumAcquisition ? "Premium Acquisition" : "Successfull REKYC"))).trim().toLowerCase();
      const eM = (e.merchantId || "").trim().toLowerCase();
      const eS = (e.storeId || "").trim().toLowerCase();
      return eAct === cleanAct && eM === cleanM && eS === cleanS;
    });

    return {
      exists: matches.length > 0,
      count: matches.length,
      matches: matches.map((m) => ({
        id: m.id,
        activity: m.activity,
        agentName: m.agentName || "Unknown",
        dateOfSale: m.dateOfSale,
        cbsName: m.cbsName
      }))
    };
  },

  submitEntry({
    activity,
    mobile,
    dateOfSale,
    merchantId,
    storeId,
    cbsName,
    soDone,
    premiumAcquisition,
    rekycValue,
    soValid,
    soTpv,
    premValid,
    premTpv,
    tpv
  }) {
    const cleanMobile = (mobile || "").trim().replace(/\D/g, "");
    if (!cleanMobile || cleanMobile.length !== 10) {
      throw new Error("Valid 10-digit ACE Number is required.");
    }
    if (!merchantId || !storeId || !cbsName) {
      throw new Error("Merchant ID, Store ID, and CBS Name are required.");
    }

    const users = this.getUsers();
    const registeredAgent = users.find((u) => u.role === "agent" && u.mobile === cleanMobile);
    const agentName = registeredAgent ? registeredAgent.name : `Agent (${cleanMobile.slice(-4)})`;
    const clusterManager = registeredAgent ? registeredAgent.clusterManager : "Unassigned";

    const actType = activity || (soDone ? "SO" : (premiumAcquisition ? "Premium Acquisition" : "Successfull REKYC"));

    let resolvedValid = "No";
    if (actType === "Successfull REKYC") {
      resolvedValid = "Yes";
    } else if (actType === "SO") {
      resolvedValid = (soValid === "Yes" || soValid === true) ? "Yes" : "No";
    } else if (actType === "Premium Acquisition") {
      resolvedValid = (premValid === "Yes" || premValid === true) ? "Yes" : "No";
    }

    const finalTpv = Number(actType === "SO" ? (soTpv || tpv || 0) : (actType === "Premium Acquisition" ? (premTpv || tpv || 0) : (tpv || 0))) || 0;

    const newEntry = {
      id: `ent_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      activity: actType,
      mobile: cleanMobile,
      agentName,
      clusterManager,
      dateOfSale: dateOfSale || new Date().toISOString().slice(0, 10),
      merchantId: merchantId.trim(),
      storeId: storeId.trim(),
      cbsName: cbsName.trim(),
      soDone: soDone || null,
      premiumAcquisition: premiumAcquisition || null,
      rekycValue: rekycValue || null,
      soValid: resolvedValid,
      soTpv: finalTpv,
      premValid: resolvedValid,
      premTpv: finalTpv,
      isValid: resolvedValid,
      tpv: finalTpv,
      createdAt: new Date().toISOString()
    };

    const entries = this.getEntries();
    entries.unshift(newEntry);
    this.saveEntries(entries);

    return {
      message: "Activity form submitted successfully!",
      entry: newEntry
    };
  },

  // ----------------------------------------------------
  // ENRICHED KPI ROWS & AGENT RANKINGS
  // ----------------------------------------------------
  computeEnrichedKpiRows(entries, settings = null) {
    const cfg = settings || this.getSettings();
    const evaRate = Number(cfg.evaRate) || 82;
    const soPoints = cfg.kpiPoints?.soDone || { "3499": 5, "Preferred Base": 3, "Untagged Base": 1 };
    const premPoints = cfg.kpiPoints?.premiumAcquisition || { "Non-Individual": 4, "Individual": 2 };
    const rekycPoints = cfg.kpiPoints?.rekyc || { "Individual": 2, "Non-Individual": 3, "Done": 2 };

    const countMap = {};
    entries.forEach((e) => {
      const act = (e.activity || (e.soDone ? "SO" : (e.premiumAcquisition ? "Premium Acquisition" : "Successfull REKYC"))).trim().toLowerCase();
      const mId = (e.merchantId || "").trim().toLowerCase();
      const sId = (e.storeId || "").trim().toLowerCase();
      if (mId && sId) {
        const key = `${act}||${mId}||${sId}`;
        countMap[key] = (countMap[key] || 0) + 1;
      }
    });

    const rows = [];

    entries.forEach((entry) => {
      const act = (entry.activity || (entry.soDone ? "SO" : (entry.premiumAcquisition ? "Premium Acquisition" : "Successfull REKYC"))).trim().toLowerCase();
      const mId = (entry.merchantId || "").trim().toLowerCase();
      const sId = (entry.storeId || "").trim().toLowerCase();
      const key = `${act}||${mId}||${sId}`;
      const isDuplicate = Boolean(mId && sId && countMap[key] > 1);
      const activity = entry.activity || (entry.soDone ? "SO" : (entry.premiumAcquisition ? "Premium Acquisition" : "Successfull REKYC"));

      if (activity === "SO") {
        const soVal = entry.soDone || entry.kpiValue || "3499";
        const soPts = Number(soPoints[soVal] !== undefined ? soPoints[soVal] : 3);
        const soValid = (entry.soValid === "Yes" || entry.isValid === "Yes") ? "Yes" : "No";
        const soValidEva = soValid === "Yes" ? soPts : 0;
        const soTentativePay = soValidEva * evaRate;
        const soTpv = Number(entry.soTpv !== undefined ? entry.soTpv : (entry.tpv || 0));

        rows.push({
          rowId: `${entry.id}_so`,
          entryId: entry.id,
          activity: "SO",
          kpiType: "SO Done",
          kpiValue: soVal,
          mobile: entry.mobile,
          agentName: entry.agentName || "Agent (" + (entry.mobile || "").slice(-4) + ")",
          clusterManager: entry.clusterManager || "Unassigned",
          dateOfSale: entry.dateOfSale,
          merchantId: entry.merchantId,
          storeId: entry.storeId,
          cbsName: entry.cbsName,
          isValid: soValid,
          tpv: soTpv,
          grossEva: soPts,
          validEva: soValidEva,
          tentativePay: soTentativePay,
          evaRate,
          isDuplicate,
          createdAt: entry.createdAt
        });
      } else if (activity === "Premium Acquisition") {
        const premVal = entry.premiumAcquisition || entry.kpiValue || "Non-Individual";
        const premPts = Number(premPoints[premVal] !== undefined ? premPoints[premVal] : 4);
        const premValid = (entry.premValid === "Yes" || entry.isValid === "Yes") ? "Yes" : "No";
        const premValidEva = premValid === "Yes" ? premPts : 0;
        const premTentativePay = premValidEva * evaRate;
        const premTpv = Number(entry.premTpv !== undefined ? entry.premTpv : (entry.tpv || 0));

        rows.push({
          rowId: `${entry.id}_prem`,
          entryId: entry.id,
          activity: "Premium Acquisition",
          kpiType: "Premium Acquisition",
          kpiValue: premVal,
          mobile: entry.mobile,
          agentName: entry.agentName || "Agent (" + (entry.mobile || "").slice(-4) + ")",
          clusterManager: entry.clusterManager || "Unassigned",
          dateOfSale: entry.dateOfSale,
          merchantId: entry.merchantId,
          storeId: entry.storeId,
          cbsName: entry.cbsName,
          isValid: premValid,
          tpv: premTpv,
          grossEva: premPts,
          validEva: premValidEva,
          tentativePay: premTentativePay,
          evaRate,
          isDuplicate,
          createdAt: entry.createdAt
        });
      } else if (activity === "Successfull REKYC") {
        const rekycVal = entry.rekycValue || entry.kpiValue || "Individual";
        const rekycPts = Number(rekycPoints[rekycVal] !== undefined ? rekycPoints[rekycVal] : (rekycVal === "Non-Individual" ? 3 : 2));
        const rekycValid = "Yes";
        const rekycValidEva = rekycPts;
        const rekycTentativePay = rekycValidEva * evaRate;
        const rekycTpv = Number(entry.tpv || 0);

        rows.push({
          rowId: `${entry.id}_rekyc`,
          entryId: entry.id,
          activity: "Successfull REKYC",
          kpiType: "Successfull REKYC",
          kpiValue: rekycVal,
          mobile: entry.mobile,
          agentName: entry.agentName || "Agent (" + (entry.mobile || "").slice(-4) + ")",
          clusterManager: entry.clusterManager || "Unassigned",
          dateOfSale: entry.dateOfSale,
          merchantId: entry.merchantId,
          storeId: entry.storeId,
          cbsName: entry.cbsName,
          isValid: "Yes",
          tpv: rekycTpv,
          grossEva: rekycPts,
          validEva: rekycValidEva,
          tentativePay: rekycTentativePay,
          evaRate,
          isDuplicate,
          createdAt: entry.createdAt
        });
      }
    });

    return rows;
  },

  getKpiData({ role, mobile, clusterManager } = {}) {
    const rawEntries = this.getEntries();
    const settings = this.getSettings();
    const allRows = this.computeEnrichedKpiRows(rawEntries, settings);

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
      if (!mobile) throw new Error("ACE Number required.");
      filteredRows = allRows.filter((r) => r.mobile === mobile.trim());
    } else if (role === "cm") {
      if (clusterManager) {
        filteredRows = allRows.filter((r) => {
          return (r.clusterManager || "").toLowerCase() === clusterManager.toLowerCase() ||
                 (r.clusterManager || "").toLowerCase().includes(clusterManager.toLowerCase());
        });
      }
    }

    return {
      count: filteredRows.length,
      rows: filteredRows,
      agentRank: agentRankInfo,
      kpiSettings: settings
    };
  },

  updateKpiRow(entryId, { isValid, tpv }) {
    const entries = this.getEntries();
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) throw new Error("Entry not found.");

    if (entry.activity === "Successfull REKYC") {
      entry.isValid = "Yes";
    } else if (isValid !== undefined) {
      entry.isValid = isValid;
      if (entry.activity === "SO") entry.soValid = isValid;
      if (entry.activity === "Premium Acquisition") entry.premValid = isValid;
    }

    if (tpv !== undefined) {
      const numTpv = Number(tpv) || 0;
      entry.tpv = numTpv;
      if (entry.activity === "SO") entry.soTpv = numTpv;
      if (entry.activity === "Premium Acquisition") entry.premTpv = numTpv;
    }

    this.saveEntries(entries);
    return { message: "KPI row updated successfully.", entry };
  },

  deleteEntry(entryId, { role, mobile, cmName } = {}) {
    const entries = this.getEntries();
    const idx = entries.findIndex((e) => e.id === entryId);
    if (idx === -1) throw new Error("Entry not found.");

    const entry = entries[idx];

    if (role === "agent") {
      if (!mobile || entry.mobile !== mobile.trim()) {
        throw new Error("You can only delete your own filled forms.");
      }
    } else if (role === "cm") {
      if (!cmName || (entry.clusterManager || "").toLowerCase() !== cmName.trim().toLowerCase()) {
        throw new Error("You can only delete filled forms submitted under your cluster.");
      }
    }

    entries.splice(idx, 1);
    this.saveEntries(entries);
    return { message: "Filled form submission successfully deleted." };
  },

  deleteAllEntries(role) {
    if (role !== "developer" && role !== "zh") {
      throw new Error("Only Developer or Zonal Head can perform this action.");
    }
    this.saveEntries([]);
    return { message: "All activity submissions have been wiped clean." };
  },

  // ----------------------------------------------------
  // BULK ACTIVITY UPLOAD & PARSING
  // ----------------------------------------------------
  uploadActivities(activities) {
    if (!activities || !Array.isArray(activities) || activities.length === 0) {
      throw new Error("No activity records provided for upload.");
    }

    const users = this.getUsers();
    const entries = this.getEntries();

    let importedCount = 0;
    let skippedCount = 0;
    const newEntries = [];

    activities.forEach((item, index) => {
      const rawMobile = String(
        item.mobile || item.aceNumber || item["ACE Number"] || item["ACE"] || item["Ace Number"] || item["Mobile Number"] || item["Mobile"] || item["Agent Mobile"] || item["mobileNumber"] || ""
      ).replace(/\D/g, "");

      if (!rawMobile || rawMobile.length < 10) {
        skippedCount++;
        return;
      }
      const cleanMobile = rawMobile.slice(-10);

      const rawDate = item.dateOfSale || item["Date of Sale"] || item["Date"] || item["date"] || new Date().toISOString().slice(0, 10);
      let parsedDate = String(rawDate).slice(0, 10);
      const numDate = Number(rawDate);
      if (!isNaN(numDate) && numDate > 30000 && numDate < 70000) {
        const d = new Date((numDate - 25569) * 86400 * 1000);
        parsedDate = d.toISOString().slice(0, 10);
      } else if (String(rawDate).includes("/")) {
        const parts = String(rawDate).trim().split("/");
        if (parts.length === 3) {
          const p0 = parts[0].padStart(2, "0");
          const p1 = parts[1].padStart(2, "0");
          const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
          parsedDate = `${y}-${p0}-${p1}`;
        }
      }

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
        item["Premium Acquisition"] || item["Option"] || item["Type"] || ""
      ).trim();

      const registeredAgent = users.find((u) => u.role === "agent" && u.mobile === cleanMobile);
      const agentName = registeredAgent ? registeredAgent.name : String(item.agentName || item["Agent Name"] || `Agent (${cleanMobile.slice(-4)})`).trim();
      const clusterManager = registeredAgent ? registeredAgent.clusterManager : String(item.clusterManager || item["Cluster Manager"] || "Unassigned").trim();

      let isValid = "No";
      if (activity === "Successfull REKYC") {
        isValid = "Yes";
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
        dateOfSale: parsedDate,
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
    this.saveEntries(entries);

    return {
      message: `Successfully uploaded and added ${importedCount} activities to agent dashboards.`,
      importedCount,
      skippedCount,
      totalRecords: entries.length
    };
  },

  // ----------------------------------------------------
  // SAMPLE BATCH GENERATOR
  // ----------------------------------------------------
  generateSampleActivities(count = 10) {
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

    const entries = this.getEntries();
    entries.unshift(...generated);
    this.saveEntries(entries);

    return {
      message: `Generated ${generated.length} sample activities across agent accounts.`,
      count: generated.length,
      totalRecords: entries.length
    };
  },

  // ----------------------------------------------------
  // RULE-BASED AI ANALYTICS
  // ----------------------------------------------------
  analyzeAI({ role, clusterManager, prompt } = {}) {
    const rawEntries = this.getEntries();
    const settings = this.getSettings();
    const rows = this.computeEnrichedKpiRows(rawEntries, settings);

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

    const executiveSummary = role === "zh"
      ? `Analyzed ${total} KPI activity records across all clusters. Overall order validation rate is ${validRate}% with total projected salary payout of ₹${totalPayout.toLocaleString("en-IN")} at ₹${settings.evaRate}/EVA.`
      : `Cluster analysis for ${clusterManager || 'Assigned Cluster'}: ${total} KPI activity records analyzed. Team validation rate is ${validRate}% with ₹${totalPayout.toLocaleString("en-IN")} earned in tentative salary.`;

    const insights = [
      `Validation Rate: ${validRate}% (${validCount} valid out of ${total} total KPI entries).`,
      `Total Valid EVA earned: ${totalValidEva} points totaling ₹${totalPayout.toLocaleString("en-IN")}.`,
      duplicateCount > 0 ? `⚠️ ${duplicateCount} duplicate merchant/store rows detected.` : "No duplicate entries detected."
    ];

    const recommendations = [
      "Prioritize high-tier 3499 orders and non-individual premium accounts for maximum EVA payout.",
      "Verify store tags and physical CBS setups to ensure high order validation."
    ];

    return {
      executiveSummary,
      insights,
      recommendations,
      directAnswer: prompt ? `Based on ${total} records: ${validCount} are Valid (${validRate}%), generating ₹${totalPayout.toLocaleString("en-IN")} payout liability.` : null,
      stats: { total, validCount, validRate, duplicateCount, totalTpv, totalValidEva, totalPayout, evaRate: settings.evaRate }
    };
  },

  // ----------------------------------------------------
  // CLIENT-SIDE EXCEL REPORT EXPORT
  // ----------------------------------------------------
  exportToExcel() {
    const rawEntries = this.getEntries();
    const settings = this.getSettings();
    const rows = this.computeEnrichedKpiRows(rawEntries, settings);

    let totalTpv = 0;
    let totalGrossEva = 0;
    let totalValidEva = 0;
    let totalPayout = 0;

    const excelRows = rows.map((r, idx) => {
      totalTpv += (r.tpv || 0);
      totalGrossEva += (r.grossEva || 0);
      totalValidEva += (r.validEva || 0);
      totalPayout += (r.tentativePay || 0);

      return {
        "S.No": idx + 1,
        "Date of Sale": r.dateOfSale || "—",
        "Agent Name": r.agentName,
        "ACE Number": r.mobile,
        "Cluster Manager": r.clusterManager,
        "Merchant ID": r.merchantId,
        "Store ID": r.storeId,
        "CBS Name": r.cbsName,
        "KPI Category": r.activity,
        "KPI Selected Option": r.kpiValue,
        "Duplicate Entry?": r.isDuplicate ? "DUPLICATE (Same Activity & MID/SID)" : "Unique",
        "Valid Status": r.isValid,
        "TPV (₹)": r.tpv,
        "Gross EVA": r.grossEva,
        "Valid EVA": r.validEva,
        "Rate/EVA (₹)": r.evaRate,
        "Tentative Pay (₹)": r.tentativePay
      };
    });

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

    const todayStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Calcify_Suite_Report_${todayStr}.xlsx`);
  },

  // ----------------------------------------------------
  // CLIENT-SIDE TEMPLATES DOWNLOAD
  // ----------------------------------------------------
  downloadTemplate(type = "excel") {
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

    if (type === "csv") {
      const csvContent =
`Date of Sale,ACE Number,Agent Name,Cluster Manager,Merchant ID,Store ID,CBS Name,Activity,Sub Activity,Valid Status,TPV (₹)
2026-09-08,9121067616,Tharun Kumar,Sriteja Mallepalli,MERCH_1001,STORE_2001,Apollo Pharmacy,SO,3499,Yes,15000
2026-09-08,9121067616,Tharun Kumar,Sriteja Mallepalli,MERCH_1002,STORE_2002,Ratnadeep Supermarket,Premium Acquisition,Non-Individual,Yes,28000
2026-09-08,9121067616,Tharun Kumar,Sriteja Mallepalli,MERCH_1003,STORE_2003,MedPlus Store,Successfull REKYC,Individual,Yes,0
2026-09-08,9876543210,New Agent,Mullapudi Sai,MERCH_1004,STORE_2004,Sri Balaji Kirana,SO,Preferred Base,No,5000`;

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "Calcify_Activity_Upload_Template.csv";
      link.click();
      URL.revokeObjectURL(link.href);
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Activity Upload Template");

    worksheet["!cols"] = [
      { wch: 14 }, { wch: 15 }, { wch: 18 }, { wch: 20 },
      { wch: 16 }, { wch: 16 }, { wch: 24 }, { wch: 20 },
      { wch: 18 }, { wch: 14 }, { wch: 12 }
    ];

    XLSX.writeFile(workbook, "Calcify_Activity_Upload_Template.xlsx");
  }
};
