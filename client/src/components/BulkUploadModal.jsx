import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  RefreshCw,
  FileText,
  HelpCircle
} from "lucide-react";
import * as XLSX from "xlsx";

export default function BulkUploadModal({ isOpen, onClose, role = "zh", onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    processFile(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const processFile = (selectedFile) => {
    setErrorMsg("");
    setSuccessMsg("");
    setFile(selectedFile);
    setParsing(true);

    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = evt.target.result;
        let workbook;

        if (selectedFile.name.endsWith(".csv")) {
          workbook = XLSX.read(data, { type: "binary" });
        } else {
          workbook = XLSX.read(data, { type: "array" });
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (!json || json.length === 0) {
          throw new Error("No data rows found in the uploaded file.");
        }

        setParsedRows(json);
      } catch (err) {
        console.error("Error parsing file:", err);
        setErrorMsg(err.message || "Failed to parse file. Please check format.");
        setParsedRows([]);
      } finally {
        setParsing(false);
      }
    };

    reader.onerror = () => {
      setErrorMsg("Failed to read file.");
      setParsing(false);
    };

    if (selectedFile.name.endsWith(".csv")) {
      reader.readAsBinaryString(selectedFile);
    } else {
      reader.readAsArrayBuffer(selectedFile);
    }
  };

  const handleConfirmUpload = async () => {
    if (parsedRows.length === 0) {
      setErrorMsg("No valid records to upload.");
      return;
    }

    setUploading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const CHUNK_SIZE = 200;
    let totalImported = 0;
    let totalSkipped = 0;

    try {
      for (let i = 0; i < parsedRows.length; i += CHUNK_SIZE) {
        const chunk = parsedRows.slice(i, i + CHUNK_SIZE);
        const progressPercent = Math.min(100, Math.round(((i + chunk.length) / parsedRows.length) * 100));
        setSuccessMsg(`Importing rows ${i + 1} to ${i + chunk.length} of ${parsedRows.length} (${progressPercent}%)...`);

        const res = await fetch("/api/admin/upload-activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activities: chunk, role })
        });

        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (parseErr) {
          if (res.status === 413) {
            throw new Error("File payload too large for the hosting server. Try uploading in smaller batches.");
          }
          throw new Error(`Server returned status ${res.status}. Please check server connection.`);
        }

        if (!res.ok) {
          throw new Error(data?.error || `Upload failed with status ${res.status}.`);
        }

        totalImported += (data.importedCount || 0);
        totalSkipped += (data.skippedCount || 0);
      }

      setSuccessMsg(`Successfully imported ${totalImported} activities!`);
      if (onUploadSuccess) {
        onUploadSuccess({ importedCount: totalImported, skippedCount: totalSkipped });
      }

      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err) {
      setErrorMsg(err.message || "Failed to upload activities.");
    } finally {
      setUploading(false);
    }
  };

  const resetSelection = () => {
    setFile(null);
    setParsedRows([]);
    setErrorMsg("");
    setSuccessMsg("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 w-full max-w-3xl rounded-2xl shadow-xl p-5 sm:p-6 relative max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-phonepe-50 border border-phonepe-200 flex items-center justify-center text-phonepe-700 flex-shrink-0">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>Bulk Activity File Upload</span>
              <span className="text-[11px] font-semibold bg-phonepe-50 text-phonepe-800 px-2 py-0.5 rounded-md border border-phonepe-200">
                Excel & CSV
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload activities in bulk for all agents and CMs. Data will appear automatically in agent dashboards by ACE Number.
            </p>
          </div>
        </div>

        {/* Template Downloads bar */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <HelpCircle className="w-4 h-4 text-phonepe-700 flex-shrink-0" />
            <span>Need the official format? Download standard templates:</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <a
              href="/api/admin/template/excel"
              download="Calcify_Activity_Upload_Template.xlsx"
              className="px-2.5 py-1.5 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-lg font-semibold flex items-center gap-1.5 shadow-2xs transition-colors text-[11px]"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel Template (.xlsx)</span>
            </a>
            <a
              href="/api/admin/template/csv"
              download="Calcify_Activity_Upload_Template.csv"
              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-semibold flex items-center gap-1.5 shadow-2xs transition-colors text-[11px]"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>CSV Template (.csv)</span>
            </a>
          </div>
        </div>

        {/* Error / Success messages */}
        {errorMsg && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Drop zone / File selector */}
        {!file && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-slate-300 hover:border-phonepe-500 rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-phonepe-50/20"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-white shadow-2xs border border-slate-200 flex items-center justify-center mx-auto mb-3 text-phonepe-700">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">
              Click to select an Excel (.xlsx) or CSV file
            </p>
            <p className="text-xs text-slate-500 mt-1">
              or drag and drop your spreadsheet here
            </p>
            <span className="inline-block mt-3 text-[11px] font-semibold text-slate-400 bg-white border border-slate-200 px-2.5 py-1 rounded-full">
              Columns: Date of Sale, ACE Number, Merchant ID, Store ID, CBS Name, Activity, Sub Activity, Valid, TPV
            </span>
          </div>
        )}

        {/* File preview & rows table */}
        {file && (
          <div className="flex-1 overflow-hidden flex flex-col space-y-3">
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-xs font-bold text-slate-900">{file.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {(file.size / 1024).toFixed(1)} KB • {parsedRows.length} rows parsed
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={resetSelection}
                className="text-xs text-red-600 hover:text-red-700 font-semibold px-2 py-1 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              >
                Change File
              </button>
            </div>

            {parsing ? (
              <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-phonepe-700" />
                <span>Parsing spreadsheet...</span>
              </div>
            ) : (
              <div className="flex-1 overflow-auto border border-slate-200 rounded-xl max-h-56">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="sticky top-0 bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2.5">#</th>
                      <th className="py-2 px-2.5">Date</th>
                      <th className="py-2 px-2.5">ACE Number</th>
                      <th className="py-2 px-2.5">Merchant ID</th>
                      <th className="py-2 px-2.5">Store ID</th>
                      <th className="py-2 px-2.5">CBS</th>
                      <th className="py-2 px-2.5">Activity</th>
                      <th className="py-2 px-2.5">Sub Activity</th>
                      <th className="py-2 px-2.5">Valid</th>
                      <th className="py-2 px-2.5 text-right">TPV</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.slice(0, 15).map((row, idx) => {
                      const mob = String(row.mobile || row["ACE Number"] || row["ACE"] || row["aceNumber"] || row["Mobile Number"] || row["Mobile"] || row["Agent Mobile"] || "");
                      const act = String(row.activity || row["Activity"] || row["KPI Category"] || "SO");
                      const sub = String(
                        row.subActivity || row["Sub Activity"] || row["Option"] || row["SO Done"] ||
                        row["KPI Selected Option"] || row["Premium Acquisition"] || row["rekycValue"] || ""
                      );

                      let v = String(row.isValid || row["Valid Status"] || row["Valid"] || "No");
                      if (act.toLowerCase().includes("rekyc") || act.toLowerCase().includes("kyc")) {
                        v = "Yes";
                      }

                      const tpv = row.tpv || row["TPV (₹)"] || row["TPV"] || 0;

                      const rawDate = row.dateOfSale || row["Date of Sale"] || row["Date"] || "—";
                      let displayDate = String(rawDate).slice(0, 10);
                      const numDate = Number(rawDate);
                      if (!isNaN(numDate) && numDate > 30000 && numDate < 70000) {
                        try {
                          displayDate = new Date((numDate - 25569) * 86400 * 1000).toISOString().slice(0, 10);
                        } catch (e) {
                          displayDate = String(rawDate);
                        }
                      }

                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-1.5 px-2.5 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-1.5 px-2.5 font-mono">{displayDate}</td>
                          <td className="py-1.5 px-2.5 font-mono font-semibold text-slate-800">{mob}</td>
                          <td className="py-1.5 px-2.5 uppercase font-mono">{row.merchantId || row["Merchant ID"] || "—"}</td>
                          <td className="py-1.5 px-2.5 uppercase font-mono">{row.storeId || row["Store ID"] || "—"}</td>
                          <td className="py-1.5 px-2.5 truncate max-w-[100px]">{row.cbsName || row["CBS Name"] || "—"}</td>
                          <td className="py-1.5 px-2.5 font-semibold text-phonepe-800">{act}</td>
                          <td className="py-1.5 px-2.5 text-slate-600">{sub}</td>
                          <td className="py-1.5 px-2.5">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${v.toLowerCase() === 'yes' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                              {v}
                            </span>
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-mono">₹{Number(tpv || 0).toLocaleString("en-IN")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {parsedRows.length > 15 && (
                  <div className="p-2 text-center text-[10px] text-slate-400 bg-slate-50 border-t border-slate-100">
                    Showing first 15 of {parsedRows.length} rows. All {parsedRows.length} rows will be imported.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs border border-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!file || parsedRows.length === 0 || uploading || parsing}
            onClick={handleConfirmUpload}
            className="px-5 py-2.5 bg-phonepe-700 hover:bg-phonepe-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            {uploading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Importing Activities...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                <span>Confirm & Ingest {parsedRows.length > 0 ? `(${parsedRows.length} Rows)` : ""}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
