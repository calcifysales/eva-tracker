import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Phone,
  Store,
  Building2,
  Layers,
  ArrowLeft,
  RefreshCw,
  Send,
  Briefcase,
  TrendingUp,
  ShieldCheck
} from "lucide-react";
import { dataService } from "../services/dataService.js";

export default function PublicEntryForm({ onBackToLanding }) {
  const today = new Date().toISOString().split("T")[0];

  const [meta, setMeta] = useState(null);
  const [formData, setFormData] = useState({
    activity: "SO", // "SO", "Premium Acquisition", "Successfull REKYC"
    mobile: "",
    dateOfSale: today,
    merchantId: "",
    storeId: "",
    cbsName: "",
    soDone: "3499",
    premiumAcquisition: "Non-Individual",
    rekycValue: "Individual"
  });

  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Fetch dynamic formQuestions configured by ZH
  useEffect(() => {
    try {
      const data = dataService.getMeta();
      if (data) setMeta(data);
    } catch (err) {
      console.error("Could not load form config:", err);
    }
  }, []);

  // Live duplicate check SCOPED BY ACTIVITY (Merchant ID + Store ID + Activity)
  useEffect(() => {
    if (!formData.merchantId.trim() || !formData.storeId.trim()) {
      setDuplicateWarning(null);
      return;
    }

    const timer = setTimeout(() => {
      try {
        const data = dataService.checkDuplicate({
          merchantId: formData.merchantId.trim(),
          storeId: formData.storeId.trim(),
          activity: formData.activity
        });
        if (data.exists) {
          setDuplicateWarning(data);
        } else {
          setDuplicateWarning(null);
        }
      } catch (err) {
        console.error("Duplicate check failed:", err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [formData.merchantId, formData.storeId, formData.activity]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!formData.mobile.trim() || formData.mobile.trim().length !== 10) {
      setErrorMsg("Please enter a valid 10-digit ACE Number.");
      return;
    }
    if (!formData.merchantId.trim() || !formData.storeId.trim() || !formData.cbsName.trim()) {
      setErrorMsg("Please complete all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      dataService.submitEntry(formData);
      setSubmitSuccess(true);
    } catch (err) {
      setErrorMsg(err.message || "Failed to submit form.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForAnotherForm = () => {
    setFormData({
      activity: formData.activity,
      mobile: formData.mobile, // retain mobile for convenience
      dateOfSale: today,
      merchantId: "",
      storeId: "",
      cbsName: "",
      soDone: "3499",
      premiumAcquisition: "Non-Individual",
      rekycValue: "Individual"
    });
    setDuplicateWarning(null);
    setSubmitSuccess(false);
    setErrorMsg("");
  };

  // Dynamic activities from ZH configuration or default fallback
  const activities = meta?.formQuestions?.activities || [
    {
      id: "SO",
      name: "SO",
      label: "SO (Sales Order)",
      question: "SO Done",
      options: [{ label: "3499" }, { label: "Preferred Base" }, { label: "Untagged Base" }]
    },
    {
      id: "Premium Acquisition",
      name: "Premium Acquisition",
      label: "Premium Acquisition",
      question: "Premium Acquisition",
      options: [{ label: "Non-Individual" }, { label: "Individual" }]
    },
    {
      id: "Successfull REKYC",
      name: "Successfull REKYC",
      label: "Successfull REKYC",
      question: "Type",
      options: [{ label: "Individual" }, { label: "Non-Individual" }]
    }
  ];

  const currentActivityObj = activities.find(
    (a) => a.id === formData.activity || a.name === formData.activity
  ) || activities[0];

  return (
    <div className="w-full max-w-xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      {/* Top back button */}
      <div className="mb-4 sm:mb-6">
        <button
          type="button"
          onClick={onBackToLanding}
          className="inline-flex items-center gap-2 text-xs font-semibold text-phonepe-700 hover:text-phonepe-900 bg-white px-3 py-2 rounded-xl border border-phonepe-200 shadow-xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </button>
      </div>

      {submitSuccess ? (
        /* Prompt question after submission: "Would you like to fill another form?" */
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm text-center animate-in fade-in zoom-in-95 duration-150">
          <div className="w-12 sm:w-14 h-12 sm:h-14 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
            <CheckCircle2 className="w-7 sm:w-8 h-7 sm:h-8" />
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            Form Submitted Successfully!
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm mt-1">
            Your sales response has been recorded.
          </p>

          <div className="my-5 p-4 bg-phonepe-50/60 border border-phonepe-100 rounded-xl text-center">
            <p className="text-sm font-bold text-phonepe-900">
              Would you like to fill another form?
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              You can record another SO, Premium Acquisition, or Successfull REKYC now.
            </p>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={resetForAnotherForm}
              className="w-full py-3 px-4 bg-phonepe-700 hover:bg-phonepe-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Yes, Fill Another Form</span>
            </button>

            <button
              type="button"
              onClick={onBackToLanding}
              className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl border border-slate-200 transition-all cursor-pointer text-xs sm:text-sm"
            >
              <span>No, Return to Home</span>
            </button>
          </div>
        </div>
      ) : (
        /* Form Card with Activity Dropdown */
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-sm">
          <div className="mb-5 border-b border-slate-100 pb-4 flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Calcify Logo"
              className="h-9 sm:h-10 w-auto object-contain rounded-lg"
            />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-phonepe-900 leading-tight">
                Daily Sales Entry Form
              </h1>
              <p className="text-slate-500 text-xs mt-0.5">
                Select the activity and enter the details below.
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-red-700 text-xs font-medium">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Activity Dropdown bar Question */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-phonepe-700" />
                <span>Activity</span>
                <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.activity}
                onChange={(e) => {
                  const newAct = e.target.value;
                  const actObj = activities.find((a) => a.id === newAct || a.name === newAct);
                  const firstOpt = actObj?.options?.[0]?.label || "Done";
                  setFormData({
                    ...formData,
                    activity: newAct,
                    ...(newAct === "SO" ? { soDone: firstOpt || "3499" } : {}),
                    ...(newAct === "Premium Acquisition" ? { premiumAcquisition: firstOpt || "Non-Individual" } : {}),
                    ...(newAct === "Successfull REKYC" ? { rekycValue: firstOpt || "Done" } : {})
                  });
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-phonepe-500 cursor-pointer"
              >
                {activities.map((act) => (
                  <option key={act.id || act.name} value={act.id || act.name}>
                    {act.label || act.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. ACE Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-phonepe-700" />
                <span>ACE Number</span>
                <span className="text-red-500">*</span>
              </label>
              <div>
                <input
                  type="text"
                  maxLength={10}
                  required
                  placeholder="Enter 10-digit ACE Number"
                  value={formData.mobile}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      mobile: e.target.value.replace(/\D/g, "")
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-phonepe-500 text-sm font-mono"
                />
              </div>
            </div>

            {/* 3. Date of Sale */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-phonepe-700" />
                <span>Date of Sale</span>
                <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.dateOfSale}
                onChange={(e) =>
                  setFormData({ ...formData, dateOfSale: e.target.value })
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-phonepe-500 text-sm cursor-pointer"
              />
            </div>

            {/* 4 & 5. Merchant ID & Store ID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Store className="w-3.5 h-3.5 text-phonepe-700" />
                  <span>Merchant ID</span>
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ENTER MERCHANT ID"
                  value={formData.merchantId}
                  onChange={(e) =>
                    setFormData({ ...formData, merchantId: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-phonepe-500 text-sm uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-phonepe-700" />
                  <span>Store ID</span>
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ENTER STORE ID"
                  value={formData.storeId}
                  onChange={(e) =>
                    setFormData({ ...formData, storeId: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-phonepe-500 text-sm uppercase"
                />
              </div>
            </div>

            {/* Activity-Scoped Duplicate Warning */}
            {duplicateWarning && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-900 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">
                    Duplicate {formData.activity} entry detected
                  </p>
                  <p className="mt-0.5 text-amber-700">
                    A record with Merchant ID "{formData.merchantId.toUpperCase()}" and Store ID "{formData.storeId.toUpperCase()}" for <strong>{formData.activity}</strong> already exists.
                  </p>
                  <p className="mt-0.5 text-[11px] text-amber-600 italic">
                    (Note: M.id & S.id can be same when Activity is different)
                  </p>
                </div>
              </div>
            )}

            {/* 6. CBS Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-phonepe-700" />
                <span>CBS Name</span>
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Enter CBS / Store name"
                value={formData.cbsName}
                onChange={(e) =>
                  setFormData({ ...formData, cbsName: e.target.value })
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-phonepe-500 text-sm"
              />
            </div>

            {/* CONDITIONAL QUESTIONS BASED ON ACTIVITY */}

            {/* 7. If Activity == "SO" -> Show SO Done */}
            {formData.activity === "SO" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  <span>{currentActivityObj?.question || "SO Done"}</span>
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(currentActivityObj?.options || [{ label: "3499" }, { label: "Preferred Base" }, { label: "Untagged Base" }]).map((opt) => {
                    const label = typeof opt === "string" ? opt : opt.label;
                    const isSelected = formData.soDone === label;
                    return (
                      <button
                        type="button"
                        key={label}
                        onClick={() => setFormData({ ...formData, soDone: label })}
                        className={`py-2.5 px-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-phonepe-700 text-white border-phonepe-700 shadow-sm"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 8. If Activity == "Premium Acquisition" -> Show Premium Acquisition */}
            {formData.activity === "Premium Acquisition" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  <span>{currentActivityObj?.question || "Premium Acquisition"}</span>
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {(currentActivityObj?.options || [{ label: "Non-Individual" }, { label: "Individual" }]).map((opt) => {
                    const label = typeof opt === "string" ? opt : opt.label;
                    const isSelected = formData.premiumAcquisition === label;
                    return (
                      <button
                        type="button"
                        key={label}
                        onClick={() =>
                          setFormData({ ...formData, premiumAcquisition: label })
                        }
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-phonepe-700 text-white border-phonepe-700 shadow-sm"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 9. If Activity == "Successfull REKYC" -> Show Individual / Non-Individual */}
            {formData.activity === "Successfull REKYC" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  <span>{currentActivityObj?.question || "Type"}</span>
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {(currentActivityObj?.options || [{ label: "Individual" }, { label: "Non-Individual" }]).map((opt) => {
                    const label = typeof opt === "string" ? opt : opt.label;
                    const isSelected = (formData.rekycValue || "Individual") === label;
                    return (
                      <button
                        type="button"
                        key={label}
                        onClick={() =>
                          setFormData({ ...formData, rekycValue: label })
                        }
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-phonepe-700 text-white border-phonepe-700 shadow-sm"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 bg-phonepe-700 hover:bg-phonepe-800 text-white font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer text-sm disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Form</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
