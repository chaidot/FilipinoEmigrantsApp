import React, { useState, useEffect, useRef } from "react";
import "./files.css"; // import the CSS file
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'bootstrap-icons/font/bootstrap-icons.css';
import SignInControls  from './SignInControls.jsx';
import { useAuth } from "../AuthContext";

import { db } from "../firebase";
import {collection, doc, setDoc, getDocs, deleteDoc, getDoc} from "firebase/firestore";
import { parseFile } from "../services/parseFile";
export default function Files() {

  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [files, setFiles] = useState([]);
  // viewRows = array of objects; viewHeaders = ordered array of header names
  const [viewRows, setViewRows] = useState(null);
  const [viewHeaders, setViewHeaders] = useState(null);
  const [viewedFileName, setViewedFileName] = useState(null);

  // Toast state
  const [toast, setToast] = useState({ text: "", type: "" });
  const toastTimerRef = useRef(null);

  // File input ref + key to force re-mount
  const fileInputRef = useRef(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  // fetch all files from Firestore
  const fetchFiles = async () => {
    try {
      const snapshot = await getDocs(collection(db, "filipinoEmigrantsFiles"));
      const fileList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setFiles(fileList);
    } catch (err) {
      showToast("Failed to load files: " + err.message, "error");
    }
  };

  useEffect(() => {
    fetchFiles();
    // cleanup toast timer on unmount
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // centralized toast helper
  const showToast = (text, type = "info") => {
    setToast({ text, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToast({ text: "", type: "" });
      toastTimerRef.current = null;
    }, 5000);
  };

  // Upload handler
  const handleUpload = async () => {
    if (!selectedFile || !selectedCategory) {
      return showToast("Please choose a file and category first.", "error");
    }

    try {
      // Check if a file with the same category already exists
      const fileRef = doc(db, "filipinoEmigrantsFiles", selectedCategory);
      const fileDoc = await getDoc(fileRef); // Use getDoc instead of getDocs

      if (fileDoc.exists()) {
        // Category already exists
        return showToast("This type of file already exists.", "error");
      }

      // Proceed with the file upload if no duplicate category
      const parsed = await parseFile(selectedFile);
      await setDoc(fileRef, {
        fileName: selectedFile.name,
        data: parsed,
        uploadedAt: new Date().toISOString(),
      });

      // Reset input reliably
      setSelectedFile(null);
      setSelectedCategory("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setFileInputKey((k) => k + 1);

      await fetchFiles();
      showToast("File uploaded successfully!", "success");
    } catch (err) {
      console.error(err);
      showToast("" + err.message, "error");
    }
  };

  const [selectedFileToDelete, setSelectedFileToDelete] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Handle delete click - open the confirmation modal
  const handleDelete = (fileId, fileName) => {
    setSelectedFileToDelete({ fileId, fileName });
    setShowModal(true);  // Show modal
  };

  // Delete doc
  const confirmDelete = async () => {
    try {
      await deleteDoc(doc(db, "filipinoEmigrantsFiles", selectedFileToDelete.fileId));
      await fetchFiles();
      // if deleted file is currently viewed, clear viewer
      if (viewedFileName === selectedFileToDelete.fileName || viewedFileName === selectedFileToDelete.fileName) {
        setViewRows(null);
        setViewHeaders(null);
        setViewedFileName(null);
      }
      setShowModal(false);
      showToast("File deleted successfully.", "info");
    } catch (err) {
      console.error(err);
      showToast("Failed to delete: " + err.message, "error");
    }
  };

  // When viewing a file: compute deterministic headers (year first, others alphabetically)
  const handleView = (file) => {
    if (!file || !Array.isArray(file.data) || file.data.length === 0) {
      showToast("No data to display.", "error");
      return;
    }

    const rows = file.data.map((r) => {
      // ensure keys are trimmed and consistent strings
      const clean = {};
      Object.keys(r).forEach((k) => {
        const key = String(k).trim();
        clean[key] = r[k];
      });
      return clean;
    });

    // union of keys across all rows
    const headerSet = new Set();
    rows.forEach((r) => Object.keys(r).forEach((k) => headerSet.add(k)));

    let headers = Array.from(headerSet).map((h) => String(h).trim());

    // detect a 'year' key case-insensitively (common expectation)
    const yearKeyIndex = headers.findIndex((h) => /^year$/i.test(h));
    let yearKey;
    if (yearKeyIndex !== -1) {
      yearKey = headers.splice(yearKeyIndex, 1)[0]; // remove it from headers
    } else {
      // fallback: prefer a header that looks like "Year" or is the first header that contains 'year' or 'yr'
      const idx = headers.findIndex((h) => /year|yr/i.test(h));
      if (idx !== -1) {
        yearKey = headers.splice(idx, 1)[0];
      } else {
        // last fallback: if any header name is numeric-ish (rare), pick that; else fall back to first header
        const numericHeaderIdx = headers.findIndex((h) => /^\d{4}$/.test(h));
        if (numericHeaderIdx !== -1) {
          yearKey = headers.splice(numericHeaderIdx, 1)[0];
        } else {
          yearKey = headers.shift(); // take first available header
        }
      }
    }

    // sort remaining headers alphabetically (case-insensitive)
    headers.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

    // final ordered headers: year first
    const orderedHeaders = [yearKey, ...headers];

    // build rows that follow the same ordered headers (missing values become empty string)
    const orderedRows = rows.map((r) => {
      const newRow = {};
      orderedHeaders.forEach((h) => {
        let v = r.hasOwnProperty(h) ? r[h] : null;
        // normalize null/undefined to empty string for display
        if (v === undefined || v === null) v = "";
        newRow[h] = v;
      });
      return newRow;
    });

    // store in state
    setViewHeaders(orderedHeaders);
    setViewRows(orderedRows);
    setViewedFileName(file.id || file.fileName || file.fileName);
    // force re-render of table by using headers+name as key in markup (done below)
  };


  //Authentication
  const { role, loading } = useAuth();

  // while loading auth state, you can show a small placeholder
  if (loading) return <div>Loading…</div>;

  // Only admins see upload/delete UI
  const canWrite = role === "admin";

  return (
    <div className="container1">

      <div className="toast-container-ct">
        {toast.text && (
          <div className={`app-toast ${toast.type === "error" ? "toast-error" : toast.type === "success" ? "toast-success" : "toast-info"}`}>
            <div className="toast-body">
              <span>{toast.text}</span>
              <button className="toast-close" onClick={() => setToast({ text: "", type: "" })}>✕</button>
            </div>
          </div>
        )}
      </div>

      <SignInControls />

      <div className="uploadFileContainer">
  <h3>Upload File</h3>

  {canWrite ? (
    <>
      <div className="input-group mb-3">
        <select
          className="form-select"
          id="inputGroupSelect02"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="">Choose File Content or Category...</option>
          <option value="Age">Age</option>
          <option value="Countries">Countries</option>
          <option value="Occupation">Occupation</option>
          <option value="Sex">Sex</option>
          <option value="CivilStatus">Civil Status</option>
          <option value="Education">Education</option>
          <option value="PlaceOfOrigin">Place of Origin</option>
        </select>
      </div>

      <div className="input-group">
        <input
          type="file"
          className="form-control"
          id="inputGroupFile04"
          aria-describedby="inputGroupFileAddon04"
          aria-label="Upload"
          ref={fileInputRef}
          key={fileInputKey}
          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
        />
        <button
          className="btn btn-outline-secondary"
          type="button"
          id="inputGroupFileAddon04"
          onClick={handleUpload}
          disabled={!selectedCategory || !selectedFile}
        >
          Upload
        </button>
      </div>
    </>
  ) : (
    <div
      className="alert alert-info mt-2"
      role="status"
      aria-live="polite"
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
    >
      <p>
        Admin access required to upload, replace, or delete files.
      </p>
    </div>
  )}
</div>

      <div className="listOfFilesContainer">
        <div className="tableScrollContainer">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Files</th>
              <th scope="col"></th>
            </tr>
          </thead>
          <tbody>
            {files.map((f) => (
              <tr key={f.id}>
                <td>{f.fileName}</td>
                <td>
                  <div className="fileActions">
                    <p className="viewFileButton" onClick={() => handleView(f)}>View</p>
                    {canWrite && (
                      <>
                        <p className="deleteFileButton" onClick={() => handleDelete(f.id, f.fileName)}>Delete</p>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {viewRows && viewHeaders && (
        <div className="fileViewerContainer">
          <h3>File Contents: {viewedFileName}</h3>
          <div className="tableScrollContainer">
          <table className="table table-bordered"  key={`${viewedFileName}-${viewHeaders.join("|")}`}>
            <thead>
              <tr>
                {viewHeaders.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {viewRows.map((row, i) => (
                <tr key={`${row[viewHeaders[0]] || i}-${i}`}>
                  {viewHeaders.map((h) => (
                    <td key={h + "-" + i}>{String(row[h] ?? "")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showModal && (
        <>
          {/* Backdrop (Dimmed Background) */}
          <div className="modal-backdrop fade show" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1040 }}></div>

          {/* Modal */}
          <div className="modal" tabindex="-1" style={{ display: "block", zIndex: 1050 }}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Confirm Deletion</h5>
                  <button type="button" className="btn-close" aria-label="Close" onClick={() => setShowModal(false)}></button>
                </div>
                <div className="modal-body">
                  <p>Are you sure you want to delete {selectedFileToDelete?.fileName}?</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Close</button>
                  <button type="button" className="btn btn-danger" onClick={confirmDelete}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

 
    </div>
  )
  
  
}
