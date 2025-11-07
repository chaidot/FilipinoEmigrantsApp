import Papa from "papaparse";
import * as XLSX from "xlsx";

const cleanValue = (val) => {
  if (val === undefined || val === null) return null;
  const str = String(val).replace(/["',\s]/g, "").trim();
  if (str === "" || str === "NaN") return null;
  if (!isNaN(Number(str))) return Number(str);
  return str;
};

const hasYearsInFirstRow = (data) => {
  const firstRow = data[0] || [];
  return firstRow.some((cell) => /^\d{4}$/.test(String(cell).trim()));
};

const hasYearsInFirstColumn = (data) => {
  return data.slice(1).some((row) => /^\d{4}$/.test(String(row[0]).trim()));
};

export async function parseFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  let data = [];

  // --- Read file ---
  if (ext === "csv") {
    const text = await file.text();
    data = Papa.parse(text, { header: false }).data;
  } else if (ext === "xlsx") {
    const buf = await file.arrayBuffer();
    const workbook = XLSX.read(buf, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
  } else {
    throw new Error("Unsupported file type. Only CSV or XLSX allowed.");
  }

  // Remove empty rows
  data = data.filter((r) => r.some((v) => v !== null && v !== ""));

  if (data.length === 0) throw new Error("File appears empty.");

  // --- Detect layout ---
  if (hasYearsInFirstRow(data)) {
    const header = data[0].slice(1).map((h) => String(h).trim());
    const rows = data.slice(1);

    const result = header
      .filter((y) => /^\d{4}$/.test(y)) // keep only valid years
      .map((year, i) => {
        const rowObj = { year: cleanValue(year) };
        rows.forEach((r) => {
          const label = String(r[0] || "").trim();
          if (label && label.toLowerCase() !== "total" && label !== "%") {
            rowObj[label] = cleanValue(r[i + 1]);
          }
        });
        return rowObj;
      });

    return result;
  } else if (hasYearsInFirstColumn(data)) {
    const header = data[0].slice(1).map((h) => String(h).trim());
    const rows = data.slice(1);

    const result = rows
      .filter((r) => /^\d{4}$/.test(String(r[0]).trim()))
      .map((r) => {
        const rowObj = { year: cleanValue(r[0]) };
        header.forEach((h, i) => {
          if (h && h.toLowerCase() !== "total" && h !== "%") {
            rowObj[h] = cleanValue(r[i + 1]);
          }
        });
        return rowObj;
      });

    return result;
  } else {
    throw new Error("File format not supported (year not in row/column).");
  }
}
