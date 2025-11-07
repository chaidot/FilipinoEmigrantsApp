import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

const DestinationMap = () => {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const legendRef = useRef(null);
  const [geoData, setGeoData] = useState(null);
  const [lookup, setLookup] = useState({});
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedYear, setSelectedYear] = useState(1981);

  // ✅ Normalize helper
  const normalize = (str = "") =>
    str
      .toString()
      .toUpperCase()
      .replace(/[().,'’]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  // ✅ Fix country name mismatches between Firestore and GeoJSON
  const countryNameMap = {
  "CHINA PROC": "CHINA",
  "HONGKONG": "HONG KONG SAR CHINA",
  "HONG KONG": "HONG KONG SAR CHINA",
  "HONG KONG SAR": "HONG KONG SAR CHINA",
  "TAIWAN ROC": "TAIWAN",
  "BRUNEI DARUSSALAM": "BRUNEI",
  "MYANMAR BURMA": "MYANMAR",
  "CZECH REPUBLIC": "CZECHIA",
  "SLOVAK REPUBLIC": "SLOVAKIA",
  "RUSSIAN FEDERATION / USSR": "RUSSIA",
  "YUGOSLAVIA (SERBIA & MONTENEGRO)": "SERBIA",
  "LEICHTENSTEIN": "LIECHTENSTEIN",
  "COCOS (KEELING) ISLAND": "COCOS (KEELING) ISLANDS",
  "FALKLAND ISLANDS (MALVINAS)": "FALKLAND ISLANDS ISLAS MALVINAS",
  "MACEDONIA": "NORTH MACEDONIA",
  "BRITISH VIRGIN ISLANDS": "VIRGIN ISLANDS BRITISH",
  "DEMOCRATIC REPUBLIC OF THE CONGO (ZAIRE)":
    "DEMOCRATIC REPUBLIC OF THE CONGO",
  "MIDWAY ISLAND": "UNITED STATES MINOR OUTLYING ISLANDS",
  "CHANNEL ISLAND": "GUERNSEY",
  "PACIFIC ISLANDS": "MICRONESIA FEDERATED STATES OF",
  "VIETNAM": "VIET NAM",
  "SOUTH KOREA": "KOREA REPUBLIC OF",
  "NORTH KOREA": "KOREA DEMOCRATIC PEOPLES REPUBLIC OF",
  "SYRIA": "SYRIAN ARAB REPUBLIC",
  "IRAN": "IRAN ISLAMIC REPUBLIC OF",
  "DEMOCRATIC KAMPUCHEA": "CAMBODIA",
  "MACAU": "MACAO",
  "TANZANIA": "UNITED REPUBLIC OF TANZANIA",
  "BOLIVIA": "BOLIVIA PLURINATIONAL STATE OF",
  "UNITED STATES OF AMERICA": "UNITED STATES OF AMERICA",
  "UNITED KINGDOM": "UNITED KINGDOM",
};

  // === FETCH GEOJSON + FIRESTORE ===
  useEffect(() => {
    (async () => {
      try {
        console.log("🌍 Loading world GeoJSON...");
        const geo = await d3.json(
          `${import.meta.env.BASE_URL}data/world_countries.geojson.json`
        );
        

        if (!geo || !geo.features) {
          console.error("❌ GeoJSON not loaded properly");
          return;
        }

        const geometries = geo.features.filter(
          (f) =>
            f.geometry &&
            f.geometry.coordinates &&
            f.geometry.coordinates.length
        );

        const sampleProps = geometries[0]?.properties || {};
        const possibleKeys = Object.keys(sampleProps);
        const countryProp =
          possibleKeys.find((k) =>
            ["ADMIN", "NAME", "name", "Country", "admin"].includes(k)
          ) || possibleKeys[0];

        console.log("🧭 Detected country property:", countryProp);
        setGeoData({ ...geo, features: geometries, _countryProp: countryProp });

        // 🔥 Load Firestore
        const ref = doc(db, "filipinoEmigrantsFiles", "Countries");
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          console.error("❌ Firestore 'Countries' doc not found");
          return;
        }

        const docData = snap.data();

        let yearData;
        if (Array.isArray(docData.data)) {
          yearData = docData.data.find(
            (r) => parseInt(r.year, 10) === parseInt(selectedYear, 10)
          );
        } else if (docData[selectedYear]) {
          yearData = docData[selectedYear];
        } else {
          yearData = docData;
        }

        if (!yearData) {
          console.warn(`⚠️ No data for year ${selectedYear}`);
          return;
        }

        console.log(`📅 Year ${selectedYear} data sample:`, yearData);

        const normLookup = {};
        let matchCount = 0;
        let missCount = 0;

        for (const [key, val] of Object.entries(yearData)) {
          if (key === "year") continue;

          const numericValue =
            val === null || val === undefined || val === ""
              ? 0
              : typeof val === "number"
              ? val
              : parseFloat(String(val).replace(/,/g, "")) || 0;

          if (numericValue <= 0) continue;

          let cleanKey = normalize(key);
          if (countryNameMap[cleanKey]) {
            cleanKey = normalize(countryNameMap[cleanKey]);
          }

          // ✅ Try matching using both ADMIN and NAME
          const match = geometries.find((f) => {
            const admin = normalize(f.properties.ADMIN || f.properties.admin || "");
            const name = normalize(f.properties.NAME || f.properties.name || "");
            return admin === cleanKey || name === cleanKey;
          });

          if (match) {
            const isoCode =
              match.properties.ISO_A3 ||
              match.properties.iso_a3 ||
              match.properties.ISO3 ||
              match.properties.iso3;

            if (isoCode) {
              normLookup[isoCode] = numericValue;
              matchCount++;
            }
          } else {
            missCount++;
            console.warn(`⚠️ No match for ${key} → ${cleanKey}`);
          }
        }

        console.log(`✅ Matches: ${matchCount} / ❌ Misses: ${missCount}`);
        console.log("🎯 Lookup sample:", Object.entries(normLookup).slice(0, 10));

        setLookup(normLookup);
      } catch (err) {
        console.error("💥 Error loading data:", err);
      }
    })();
  }, [selectedYear]);

  // === DRAW MAP ===
  useEffect(() => {
    if (!geoData || !Object.keys(lookup).length) {
      console.warn("⚠️ Skipping draw: missing geoData or lookup");
      return;
    }

    console.log("🖌️ Drawing world map...");
    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);
    const legend = d3.select(legendRef.current);
    svg.selectAll("*").remove();
    legend.selectAll("*").remove();

    const width = 960;
    const height = 540;
    const projection = d3.geoMercator().fitSize([width, height], geoData);
    const path = d3.geoPath().projection(projection);

    const values = Object.values(lookup);
    const [minVal, maxVal] = d3.extent(values);
    console.log("🎨 Actual draw range:", minVal, "to", maxVal);

    const colorScale = d3
      .scaleSequential()
      .domain([minVal, maxVal])
      .interpolator(d3.interpolateRgb("#adccfaff", "#08306b"));

    svg.attr("viewBox", `0 0 ${width} ${height}`).style("background", "#ffffff");

    // 🏆 Determine Top 5
    const top5 = geoData.features
      .map((f) => {
        const iso =
          f.properties.ISO_A3 ||
          f.properties.iso_a3 ||
          f.properties.ISO3 ||
          f.properties.iso3;
        return {
          name: f.properties[geoData._countryProp],
          iso,
          value: lookup[iso] || 0,
        };
      })
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    const top5Set = new Set(top5.map((d) => d.iso));

    // === DRAW COUNTRIES ===
    svg
      .selectAll("path")
      .data(geoData.features)
      .join("path")
      .attr("d", path)
      .attr("fill", (d) => {
        const id =
          d.properties.ISO_A3 ||
          d.properties.iso_a3 ||
          d.properties.ISO3 ||
          d.properties.iso3;
        const val = lookup[id] || 0;
        return val > 0 ? colorScale(val) : "#e0e0e0";
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.5)
      .attr("cursor", "pointer")
      .on("mouseover", function (event, d) {
        const id =
          d.properties.ISO_A3 ||
          d.properties.iso_a3 ||
          d.properties.ISO3 ||
          d.properties.iso3;
        const val = lookup[id] || 0;
        tooltip
          .style("opacity", 1)
          .html(
            `<strong>${d.properties[geoData._countryProp]}</strong><br/>Emigrants: ${val.toLocaleString()}`
          );
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 30}px`);
      })
      .on("mouseout", () => tooltip.style("opacity", 0))
      .on("click", (event, d) => {
        const id =
          d.properties.ISO_A3 ||
          d.properties.iso_a3 ||
          d.properties.ISO3 ||
          d.properties.iso3;
        const val = lookup[id] || 0;
        setSelectedCountry({
          id,
          name: d.properties[geoData._countryProp],
          value: val,
        });
      });

    // ✨ Highlight Top 5
    svg
      .selectAll(".top5-highlight")
      .data(geoData.features.filter((f) => {
        const iso =
          f.properties.ISO_A3 ||
          f.properties.iso_a3 ||
          f.properties.ISO3 ||
          f.properties.iso3;
        return top5Set.has(iso);
      }))
      .join("path")
      .attr("class", "top5-highlight")
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", "#FFD700")
      .attr("stroke-width", 2.5)
      .attr("opacity", 0.9)
      .attr("pointer-events", "none");

    // === LEGEND ===
    const legendWidth = 300;
    const legendHeight = 12;
    const legendSvg = legend
      .append("svg")
      .attr("width", legendWidth + 80)
      .attr("height", 60);

    const defs = legendSvg.append("defs");
    const grad = defs.append("linearGradient").attr("id", "legendGradient");
    for (let i = 0; i <= 50; i++) {
      const t = i / 50;
      grad
        .append("stop")
        .attr("offset", `${t * 100}%`)
        .attr("stop-color", colorScale(minVal + t * (maxVal - minVal)));
    }

    legendSvg
      .append("rect")
      .attr("x", 40)
      .attr("y", 20)
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#legendGradient)")
      .attr("stroke", "#ccc");

    const legendScale = d3
      .scaleLinear()
      .domain([minVal, maxVal])
      .range([40, 40 + legendWidth]);
    const legendAxis = d3.axisBottom(legendScale).ticks(6);
    legendSvg
      .append("g")
      .attr("transform", `translate(0, ${20 + legendHeight})`)
      .call(legendAxis);
  }, [geoData, lookup]);

  const handleYearChange = (e) => {
    setSelectedYear(parseInt(e.target.value));
    setSelectedCountry(null);
  };

  return (
    <div style={{ position: "relative", width: "100%", textAlign: "center" }}>
      <h3 style={{ marginBottom: "8px" }}>Country of Destination</h3>
      <svg ref={svgRef}></svg>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        style={{
          position: "absolute",
          background: "rgba(0, 0, 0, 0.8)",
          color: "#fff",
          padding: "6px 10px",
          borderRadius: "4px",
          pointerEvents: "none",
          fontSize: "13px",
          opacity: 0,
          transition: "opacity 0.2s",
          zIndex: 9999,
        }}
      ></div>

      {/* === TOP 5 COUNTRIES === */}
      {Object.keys(lookup).length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "40px",
            right: "40px",
            background: "#fff",
            borderRadius: "8px",
            boxShadow: "0 0 8px rgba(0,0,0,0.15)",
            padding: "10px 16px",
            fontSize: "13px",
            zIndex: 10,
            textAlign: "left",
          }}
        >
          <h4 style={{ margin: "4px 0 6px 0", fontSize: "14px" }}>
            Top 5 Destinations ({selectedYear})
          </h4>
          {geoData &&
            geoData.features
              .map((f) => {
                const iso =
                  f.properties.ISO_A3 ||
                  f.properties.iso_a3 ||
                  f.properties.ISO3 ||
                  f.properties.iso3;
                return {
                  name: f.properties[geoData._countryProp],
                  value: lookup[iso] || 0,
                };
              })
              .filter((d) => d.value > 0)
              .sort((a, b) => b.value - a.value)
              .slice(0, 5)
              .map((d, i) => (
                <div key={i}>
                  {i + 1}. {d.name}: {d.value.toLocaleString()}
                </div>
              ))}
        </div>
      )}

      <div ref={legendRef} style={{ marginTop: "10px" }}></div>

      <div style={{ marginTop: "20px" }}>
        <input
          type="range"
          min="1981"
          max="2020"
          step="1"
          value={selectedYear}
          onChange={handleYearChange}
          style={{ width: "50%", cursor: "pointer" }}
        />
        <p>{selectedYear}</p>
      </div>
    </div>
  );
};

export default DestinationMap;
