// src/pages/ForecastPage.jsx
import React, { useState } from "react";
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

const API_BASE_URL = "http://127.0.0.1:5000"; // Flask backend URL

const attributeOptions = [
  { value: "total", label: "Total emigrants" },
  { value: "male", label: "Male emigrants" },
  { value: "female", label: "Female emigrants" },
];

const modelOptions = [
  { value: "lstm", label: "LSTM (Neural network)" },
  { value: "mlp", label: "MLP (Neural network)" },
];

// Custom tooltip for nicer CI display
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const point = payload[0].payload; // our combined data row

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
        <div>
          Historical: {Math.round(point.historical).toLocaleString()}
        </div>
      )}
      {point.forecast != null && (
        <div>
          Forecast: {Math.round(point.forecast).toLocaleString()}
        </div>
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
  const [modelType, setModelType] = useState("lstm");
  const [yearsToForecast, setYearsToForecast] = useState(5);
  const [historical, setHistorical] = useState([]);
  const [forecast, setForecast] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerateForecast = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.post(`${API_BASE_URL}/forecast`, {
        attribute,
        model_type: modelType,
        years: yearsToForecast,
      });

      const { historical, forecast } = response.data;

      setHistorical(historical);
      setForecast(forecast);

      // Combined dataset for Recharts
      const combined = [
        // Historical segment (no CI)
        ...historical.map((d) => ({
          year: d.year,
          historical: d.value,
          forecast: null,
          ciLower: null,
          ciUpper: null,
          ciRange: null,
        })),
        // Forecast segment (with CI)
        ...forecast.map((d) => {
          const lower = d.lower;
          const upper = d.upper;
          return {
            year: d.year,
            historical: null,
            forecast: d.value,
            ciLower: lower,
            ciUpper: upper,
            ciRange: upper - lower, // band thickness
          };
        }),
      ];

      setChartData(combined);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          "Something went wrong while generating the forecast."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!historical.length && !forecast.length) return;

    const rows = [
      ["Year", "Type", "Value", "Lower_CI", "Upper_CI"],
      ...historical.map((d) => [
        d.year,
        "historical",
        d.value,
        "",
        "",
      ]),
      ...forecast.map((d) => [
        d.year,
        "forecast",
        d.value,
        d.lower,
        d.upper,
      ]),
    ];

    const csvContent = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `forecast_${attribute}_${modelType}_${yearsToForecast}yrs.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: "1.5rem" }}>
      <h1 style={{ marginBottom: "0.5rem" }}>Forecast Filipino Emigrants</h1>
      <p style={{ maxWidth: 700, marginBottom: "1.5rem", color: "#444" }}>
        This page uses pre-trained machine learning models (LSTM / MLP) to
        forecast Filipino emigrant trends up to 10 years into the future.
      </p>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <label>
            Attribute
            <br />
            <select
              value={attribute}
              onChange={(e) => setAttribute(e.target.value)}
              style={{ padding: "0.25rem 0.5rem", minWidth: "180px" }}
            >
              {attributeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <label>
            Model
            <br />
            <select
              value={modelType}
              onChange={(e) => setModelType(e.target.value)}
              style={{ padding: "0.25rem 0.5rem", minWidth: "180px" }}
            >
              {modelOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ minWidth: "250px" }}>
          <label>
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

        <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem" }}>
          <button
            onClick={handleGenerateForecast}
            disabled={loading}
            style={{
              padding: "0.5rem 1rem",
              cursor: loading ? "default" : "pointer",
            }}
          >
            {loading ? "Generating..." : "Generate Forecast"}
          </button>

          <button
            onClick={handleExportCSV}
            disabled={!forecast.length}
            style={{
              padding: "0.5rem 1rem",
              cursor: forecast.length ? "pointer" : "default",
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
            backgroundColor: "#ffe6e6",
            color: "#b30000",
            borderRadius: "4px",
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

              {/* Historical and forecast lines */}
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

              {/* CI band between lower & upper */}
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
          <h2>Forecast values</h2>
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              maxWidth: 600,
            }}
          >
            <thead>
              <tr>
                <th style={{ borderBottom: "1px solid #ccc", padding: "0.5rem" }}>
                  Year
                </th>
                <th style={{ borderBottom: "1px solid #ccc", padding: "0.5rem" }}>
                  Forecast
                </th>
                <th style={{ borderBottom: "1px solid #ccc", padding: "0.5rem" }}>
                  Lower (approx. 95% CI)
                </th>
                <th style={{ borderBottom: "1px solid #ccc", padding: "0.5rem" }}>
                  Upper (approx. 95% CI)
                </th>
              </tr>
            </thead>
            <tbody>
              {forecast.map((row) => (
                <tr key={row.year}>
                  <td
                    style={{
                      borderBottom: "1px solid #eee",
                      padding: "0.5rem",
                      textAlign: "center",
                    }}
                  >
                    {row.year}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #eee",
                      padding: "0.5rem",
                      textAlign: "right",
                    }}
                  >
                    {Math.round(row.value).toLocaleString()}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #eee",
                      padding: "0.5rem",
                      textAlign: "right",
                    }}
                  >
                    {Math.round(row.lower).toLocaleString()}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #eee",
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
        <p style={{ marginTop: "1rem", color: "#666" }}>
          Choose an attribute, a model, select the number of years, then click{" "}
          <strong>Generate Forecast</strong>.
        </p>
      )}
    </div>
  );
};

export default ForecastPage;
