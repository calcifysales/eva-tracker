import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "data");

const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const ENTRIES_FILE = path.join(DATA_DIR, "entries.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

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
        { label: "Done", points: 2 }
      ]
    }
  ]
};

const defaultSettings = {
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
      "Done": 2
    },
    customKpis: []
  },
  formQuestions: DEFAULT_FORM_QUESTIONS,
  clusterManagers: CLUSTER_MANAGERS_LIST
};

const defaultUsers = [];

function readJsonFile(filePath, defaultValue) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), "utf8");
      return defaultValue;
    }
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return defaultValue;
  }
}

function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    return false;
  }
}

readJsonFile(SETTINGS_FILE, defaultSettings);
readJsonFile(USERS_FILE, defaultUsers);

export const storage = {
  getSettings() {
    const s = readJsonFile(SETTINGS_FILE, defaultSettings);
    return {
      ...defaultSettings,
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
    writeJsonFile(SETTINGS_FILE, updated);
    return updated;
  },
  getUsers() {
    return readJsonFile(USERS_FILE, defaultUsers);
  },
  saveUsers(users) {
    return writeJsonFile(USERS_FILE, users);
  },
  getEntries() {
    return readJsonFile(ENTRIES_FILE, []);
  },
  saveEntries(entries) {
    return writeJsonFile(ENTRIES_FILE, entries);
  },

  // Expands entries into KPI rows based on activity (SO, Premium Acquisition, Successfull REKYC)
  computeEnrichedKpiRows(entries, settings = null) {
    const cfg = settings || this.getSettings();
    const evaRate = Number(cfg.evaRate) || 82;
    const soPoints = cfg.kpiPoints?.soDone || { "3499": 5, "Preferred Base": 3, "Untagged Base": 1 };
    const premPoints = cfg.kpiPoints?.premiumAcquisition || { "Non-Individual": 4, "Individual": 2 };
    const rekycPoints = cfg.kpiPoints?.rekyc || { "Individual": 2, "Non-Individual": 3, "Done": 2 };

    // Duplicate detection map SCOPED BY ACTIVITY: (activity + merchantId + storeId)
    // SO - same M.id & S.id highlighted; Premium Acquisition - same M.id & S.id highlighted;
    // M.id & S.id can be same when Activity is different.
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

      // 1. SO Done KPI Row
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
      }

      // 2. Premium Acquisition KPI Row
      else if (activity === "Premium Acquisition") {
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
      }

      // 3. Successfull REKYC KPI Row (Valid is ALWAYS Yes)
      else if (activity === "Successfull REKYC") {
        const rekycVal = entry.rekycValue || entry.kpiValue || "Individual";
        const rekycPts = Number(rekycPoints[rekycVal] !== undefined ? rekycPoints[rekycVal] : (rekycVal === "Non-Individual" ? 3 : 2));
        const rekycValid = "Yes"; // Valid for ReKYC is ALWAYS Yes
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
  }
};
