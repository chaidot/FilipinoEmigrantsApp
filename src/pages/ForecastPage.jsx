import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

import { db } from "../firebase";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";

import "../components/components.css"; // hero + card styles

const API_BASE_URL = "http://127.0.0.1:5000"; // Flask backend URL
const FIRESTORE_COLLECTION = "filipinoEmigrantsFiles";
const SEX_DOC_ID = "Sex"; // this matches your upload category

const attributeOptions = [
  { value: "total", label: "Total emigrants" },
  { value: "male", label: "Male emigrants" },
  { value: "female", label: "Female emigrants" },
];

// Custom tooltip for nicer CI display
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const point = payload[0].payload;

  return (
    <div
      style={{
        background: "white",
        border: "1px solid #ccc",
        padding: "0.5rem 0.75rem",
        fontSize: "0.85rem",
      }}
    >
      <div>
        <strong>{label}</strong>
      </div>
      {point.historical != null && (
        <div>Historical: {Math.round(point.historical).toLocaleString()}</div>
      )}
      {point.forecast != null && (
        <div>Forecast: {Math.round(point.forecast).toLocaleString()}</div>
      )}
      {point.ciLower != null && point.ciUpper != null && (
        <div>
          Approx. 95% CI:{" "}
          {Math.round(point.ciLower).toLocaleString()} –{" "}
          {Math.round(point.ciUpper).toLocaleString()}
        </div>
      )}
    </div>
  );
};

const ForecastPage = () => {
  const [attribute, setAttribute] = useState("total");
  const [yearsToForecast, setYearsToForecast] = useState(5);

  const [historical, setHistorical] = useState([]);
  const [forecast, setForecast] = useState([]);
  const [chartData, setChartData] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [metrics, setMetrics] = useState(null);

  // Firestore series
  const [fbYears, setFbYears] = useState(null);
  const [fbSeries, setFbSeries] = useState(null);

  const attributeLabel =
    attributeOptions.find((a) => a.value === attribute)?.label || attribute;

  // ---- Load metrics when attribute changes ----
  useEffect(() => {
    async function fetchMetrics() {
      try {
        const res = await axios.get(`${API_BASE_URL}/metrics`, {
          params: { attribute },
        });
        setMetrics(res.data);
      } catch (err) {
        console.warn("Unable to load metrics for", attribute, err);
        setMetrics(null);
      }
    }
    fetchMetrics();
  }, [attribute]);

  // ---- Helper: load series from Firestore ("Sex" doc) ----
  const loadSeriesFromFirestore = async (attrValue) => {
    const ref = doc(db, FIRESTORE_COLLECTION, SEX_DOC_ID);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      throw new Error(
        `No document found at ${FIRESTORE_COLLECTION}/${SEX_DOC_ID}. Upload the Sex CSV first.`
      );
    }

    const data = snap.data();
    const rawRows = Array.isArray(data.data) ? data.data : [];

    if (!rawRows.length) {
      throw new Error("The Firestore 'data' array is empty for Sex file.");
    }

    // 🧹 Clean keys: build rows that use TRIMMED header names
    const rows = rawRows.map((r) => {
      const clean = {};
      Object.keys(r).forEach((k) => {
        const key = String(k).trim();
        clean[key] = r[k];
      });
      return clean;
    });

    const first = rows[0];
    const keys = Object.keys(first);

    console.log("Detected columns in Sex file:", keys);

    // ---- Detect year column ----
    let yearKey =
      keys.find((k) => /^year$/i.test(k)) ||
      keys.find((k) => /year|yr/i.test(k)) ||
      keys[0];

    // ---- Detect value column based on attribute ----
    let valueKey;
    if (attrValue === "total") {
      valueKey =
        keys.find((k) => /^total$/i.test(k)) ||
        keys.find((k) => /total/i.test(k));
    } else if (attrValue === "male") {
      valueKey =
        keys.find((k) => /^male$/i.test(k)) ||
        keys.find((k) => /male/i.test(k));
    } else {
      // female
      valueKey =
        keys.find((k) => /^female$/i.test(k)) ||
        keys.find((k) => /female/i.test(k));
    }

    // 🔁 Fallback for "total": pick the numeric column with the largest average value
    if (!valueKey && attrValue === "total") {
      const stats = {};

      rows.forEach((row) => {
        keys.forEach((k) => {
          if (k === yearKey) return;
          const rawVal = row[k];
          if (rawVal == null) return;

          const vStr = String(rawVal).replace(/,/g, "").trim();
          const v = parseFloat(vStr);
          if (Number.isNaN(v)) return;

          if (!stats[k]) stats[k] = { sum: 0, count: 0 };
          stats[k].sum += v;
          stats[k].count += 1;
        });
      });

      const numericKeys = Object.keys(stats);
      if (numericKeys.length) {
        valueKey = numericKeys.reduce((best, k) => {
          const avg = stats[k].sum / stats[k].count;
          if (!best) return k;
          const bestAvg = stats[best].sum / stats[best].count;
          return avg > bestAvg ? k : best;
        }, null);

        console.warn(
          `Falling back to numeric column "${valueKey}" as 'total' for forecasting.`
        );
      }
    }

    if (!valueKey) {
      throw new Error(
        `Could not detect a numeric column for "${attrValue}" in the uploaded Sex file.`
      );
    }

    console.log("Using yearKey:", yearKey, "valueKey:", valueKey);

    // ---- Build years + series arrays ----
    const years = [];
    const series = [];

    rows.forEach((row) => {
      const rawYear = row[yearKey];
      const rawVal = row[valueKey];

      if (rawYear == null || rawVal == null) return;

      const y = parseInt(String(rawYear).trim(), 10);
      if (Number.isNaN(y)) return;

      const vStr = String(rawVal).replace(/,/g, "").trim();
      const v = parseFloat(vStr);
      if (Number.isNaN(v)) return;

      years.push(y);
      series.push(v);
    });

    // Sort by year ascending just in case
    const combined = years.map((y, i) => ({ year: y, value: series[i] }));
    combined.sort((a, b) => a.year - b.year);

    const sortedYears = combined.map((r) => r.year);
    const sortedSeries = combined.map((r) => r.value);

    setFbYears(sortedYears);
    setFbSeries(sortedSeries);

    return { years: sortedYears, series: sortedSeries };
  };

  // ---- Handle forecast generation ----
  const handleGenerateForecast = async () => {
    setLoading(true);
    setError("");

    try {
      // 1) Ensure we have Firestore series
      let years = fbYears;
      let series = fbSeries;

      if (!series || !years) {
        const loaded = await loadSeriesFromFirestore(attribute);
        years = loaded.years;
        series = loaded.series;
      }

      if (!series || series.length < 5) {
        throw new Error(
          "Not enough data points in Firestore to use a 5-year input window."
        );
      }

      // 2) Call backend with Firestore series (CSV uploaded via the app)
      const response = await axios.post(`${API_BASE_URL}/forecast`, {
        attribute,
        model_type: "mlp", // we’re using MLP as the chosen model
        years: yearsToForecast,
        series,
        years_array: years,
      });

      const { historical, forecast } = response.data;

      setHistorical(historical);
      setForecast(forecast);

      // 3) Prepare Recharts data
      const combined = [
        ...historical.map((d) => ({
          year: d.year,
          historical: d.value,
          forecast: null,
          ciLower: null,
          ciUpper: null,
          ciRange: null,
        })),
        ...forecast.map((d) => ({
          year: d.year,
          historical: null,
          forecast: d.value,
          ciLower: d.lower,
          ciUpper: d.upper,
          ciRange: d.upper - d.lower,
        })),
      ];

      setChartData(combined);

      // 4) Optional: log this forecast in Firestore
      try {
        await addDoc(collection(db, "forecastLogs"), {
          attribute,
          yearsToForecast,
          createdAt: serverTimestamp(),
        });
      } catch (logErr) {
        console.warn("Failed to log forecast in Firestore:", logErr);
      }
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Something went wrong while generating the forecast."
      );
    } finally {
      setLoading(false);
    }
  };

  // ---- Export CSV ----
  const handleExportCSV = () => {
    if (!historical.length && !forecast.length) return;

    const rows = [
      ["Year", "Type", "Value", "Lower_CI", "Upper_CI"],
      ...historical.map((d) => [d.year, "historical", d.value, "", ""]),
      ...forecast.map((d) => [d.year, "forecast", d.value, d.lower, d.upper]),
    ];

    const csvContent = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `forecast_${attribute}_${yearsToForecast}yrs.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: "1.5rem" }}>
      {/* Hero / header panel */}
      <div className="forecast-hero">
        <div className="forecast-hero-main">
          <div className="forecast-hero-text">
            <h1 className="forecast-hero-title">Forecast Filipino Emigrants</h1>

            <p className="forecast-hero-subtitle">
              This page uses a pre-trained{" "}
              <strong>MLP (Multi-Layer Perceptron)</strong> time-series model to
              forecast <strong>{attributeLabel.toLowerCase()}</strong> up to{" "}
              <strong>10 years</strong> into the future. The model is trained
              offline on historical POEA emigrant statistics (local CSV), and
              this page loads the cleaned{" "}
              <strong>Sex CSV stored in Firebase/Firestore</strong> as the live
              data source.
            </p>
          </div>
        </div>
      </div>

      {/* Model cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        {/* Model overview */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "12px",
            padding: "1rem 1.2rem",
            boxShadow: "0 8px 20px rgba(15,23,42,0.06)",
            border: "1px solid #e5e7eb",
          }}
        >
          <h3 style={{ margin: 0, marginBottom: "0.5rem", fontSize: "1rem" }}>
            Model overview
          </h3>
          <p
            style={{
              fontSize: "0.85rem",
              color: "#4b5563",
              marginBottom: "0.75rem",
            }}
          >
            The forecasting model is a <strong>Multi-Layer Perceptron</strong>{" "}
            that uses the last <strong>5 years</strong> of emigrant counts to
            predict the next year.
          </p>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              fontSize: "0.85rem",
              color: "#374151",
            }}
          >
            <li>• Input window: 5 years</li>
            <li>• Hidden layer: 16 neurons</li>
            <li>• Output: 1-year ahead forecast</li>
          </ul>
        </div>

        {/* Model performance */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "12px",
            padding: "1rem 1.2rem",
            boxShadow: "0 8px 20px rgba(15,23,42,0.06)",
            border: "1px solid #e5e7eb",
          }}
        >
          <h3 style={{ margin: 0, marginBottom: "0.5rem", fontSize: "1rem" }}>
            Model performance (validation)
          </h3>
          {metrics ? (
            <>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "#6b7280",
                  marginBottom: "0.5rem",
                }}
              >
                Metrics based on the last part of the historical series
                (validation set).
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  rowGap: "0.25rem",
                  columnGap: "0.75rem",
                  fontSize: "0.85rem",
                }}
              >
                <div>
                  <div style={{ color: "#6b7280" }}>RMSE</div>
                  <div style={{ fontWeight: 600 }}>
                    {Math.round(metrics.rmse).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ color: "#6b7280" }}>MAE</div>
                  <div style={{ fontWeight: 600 }}>
                    {Math.round(metrics.mae).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ color: "#6b7280" }}>R²</div>
                  <div style={{ fontWeight: 600 }}>
                    {metrics.r2.toFixed(3)}
                  </div>
                </div>
              </div>
              {metrics.notes && (
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "#6b7280",
                    marginTop: "0.5rem",
                  }}
                >
                  {metrics.notes}
                </p>
              )}
            </>
          ) : (
            <p
              style={{
                fontSize: "0.8rem",
                color: "#b91c1c",
                marginBottom: 0,
              }}
            >
              Unable to load model metrics for this attribute.
            </p>
          )}
        </div>

        {/* Forecast details */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "12px",
            padding: "1rem 1.2rem",
            boxShadow: "0 8px 20px rgba(15,23,42,0.06)",
            border: "1px solid #e5e7eb",
          }}
        >
          <h3 style={{ margin: 0, marginBottom: "0.5rem", fontSize: "1rem" }}>
            Forecast details
          </h3>
          {historical.length > 0 ? (
            <>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "#6b7280",
                  marginBottom: "0.5rem",
                }}
              >
                Latest available data and forecast summary.
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  rowGap: "0.25rem",
                  columnGap: "0.75rem",
                  fontSize: "0.85rem",
                }}
              >
                <div>
                  <div style={{ color: "#6b7280" }}>Last actual year</div>
                  <div style={{ fontWeight: 600 }}>
                    {historical[historical.length - 1].year}
                  </div>
                </div>
                <div>
                  <div style={{ color: "#6b7280" }}>Last actual value</div>
                  <div style={{ fontWeight: 600 }}>
                    {Math.round(
                      historical[historical.length - 1].value
                    ).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ color: "#6b7280" }}>Horizon</div>
                  <div style={{ fontWeight: 600 }}>
                    {yearsToForecast} year(s)
                  </div>
                </div>
                {forecast.length > 0 && (
                  <div>
                    <div style={{ color: "#6b7280" }}>Last forecast year</div>
                    <div style={{ fontWeight: 600 }}>
                      {forecast[forecast.length - 1].year} –{" "}
                      {Math.round(
                        forecast[forecast.length - 1].value
                      ).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p
              style={{
                fontSize: "0.8rem",
                color: "#6b7280",
                marginBottom: 0,
              }}
            >
              Generate a forecast to see the summary here.
            </p>
          )}
        </div>
      </div>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.5rem",
          alignItems: "flex-end",
        }}
      >
        <div>
          <label
            style={{
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "#374151",
            }}
          >
            Attribute
            <br />
            <select
              value={attribute}
              onChange={(e) => {
                setAttribute(e.target.value);
                setHistorical([]);
                setForecast([]);
                setChartData([]);
              }}
              style={{
                padding: "0.35rem 0.5rem",
                minWidth: "180px",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
              }}
            >
              {attributeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ minWidth: "260px" }}>
          <label
            style={{
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "#374151",
            }}
          >
            Years to forecast: <strong>{yearsToForecast}</strong>
          </label>
          <input
            type="range"
            min={1}
            max={10}
            value={yearsToForecast}
            onChange={(e) => setYearsToForecast(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={handleGenerateForecast}
            disabled={loading}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "999px",
              border: "none",
              background: loading ? "#9ca3af" : "#2563eb",
              color: "white",
              cursor: loading ? "default" : "pointer",
              fontSize: "0.9rem",
              fontWeight: 600,
            }}
          >
            {loading ? "Generating..." : "Generate Forecast"}
          </button>

          <button
            onClick={handleExportCSV}
            disabled={!forecast.length}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "999px",
              border: "1px solid #d1d5db",
              background: "white",
              color: forecast.length ? "#111827" : "#9ca3af",
              cursor: forecast.length ? "pointer" : "default",
              fontSize: "0.9rem",
              fontWeight: 500,
            }}
          >
            Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.75rem 1rem",
            backgroundColor: "#fee2e2",
            color: "#b91c1c",
            borderRadius: "6px",
            fontSize: "0.85rem",
          }}
        >
          {error}
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <div style={{ width: "100%", height: 400, marginBottom: "2rem" }}>
          <ResponsiveContainer>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />

              <Line
                type="monotone"
                dataKey="historical"
                name="Historical"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="forecast"
                name="Forecast"
                strokeDasharray="5 5"
                dot={{ r: 3 }}
              />

              <Area
                type="monotone"
                dataKey="ciLower"
                stackId="ciBand"
                legendType="none"
                stroke="none"
                fill="transparent"
              />
              <Area
                type="monotone"
                dataKey="ciRange"
                stackId="ciBand"
                name="Approx. 95% CI"
                stroke="none"
                fillOpacity={0.15}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Forecast table */}
      {forecast.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>
            Forecast values
          </h2>
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              maxWidth: 650,
              fontSize: "0.9rem",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    borderBottom: "1px solid #d1d5db",
                    padding: "0.5rem",
                    textAlign: "center",
                  }}
                >
                  Year
                </th>
                <th
                  style={{
                    borderBottom: "1px solid #d1d5db",
                    padding: "0.5rem",
                    textAlign: "right",
                  }}
                >
                  Forecast
                </th>
                <th
                  style={{
                    borderBottom: "1px solid #d1d5db",
                    padding: "0.5rem",
                    textAlign: "right",
                  }}
                >
                  Lower (approx. 95% CI)
                </th>
                <th
                  style={{
                    borderBottom: "1px solid #d1d5db",
                    padding: "0.5rem",
                    textAlign: "right",
                  }}
                >
                  Upper (approx. 95% CI)
                </th>
              </tr>
            </thead>
            <tbody>
              {forecast.map((row) => (
                <tr key={row.year}>
                  <td
                    style={{
                      borderBottom: "1px solid #f3f4f6",
                      padding: "0.5rem",
                      textAlign: "center",
                    }}
                  >
                    {row.year}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #f3f4f6",
                      padding: "0.5rem",
                      textAlign: "right",
                    }}
                  >
                    {Math.round(row.value).toLocaleString()}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #f3f4f6",
                      padding: "0.5rem",
                      textAlign: "right",
                    }}
                  >
                    {Math.round(row.lower).toLocaleString()}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #f3f4f6",
                      padding: "0.5rem",
                      textAlign: "right",
                    }}
                  >
                    {Math.round(row.upper).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!chartData.length && !loading && (
        <p style={{ marginTop: "1rem", color: "#6b7280", fontSize: "0.9rem" }}>
          Choose an attribute, select the number of years, then click{" "}
          <strong>Generate Forecast</strong>. Data will be loaded from the Sex
          CSV that you uploaded and stored in Firestore.
        </p>
      )}
    </div>
  );
};

export default ForecastPage;
