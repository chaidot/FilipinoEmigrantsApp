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

  // ✅ Known mismatches
  const countryNameMap = {
    "CHINA PROC": "CHINA",
    "HONGKONG": "HONG KONG",
    "HONG KONG SAR": "HONG KONG",
    "TAIWAN ROC": "TAIWAN",
    "BRUNEI DARUSSALAM": "BRUNEI",
    "MYANMAR BURMA": "MYANMAR",
    "CZECH REPUBLIC": "CZECHIA",
    "SLOVAK REPUBLIC": "SLOVAKIA",
    "RUSSIAN FEDERATION / USSR": "RUSSIA",
    "YUGOSLAVIA (SERBIA & MONTENEGRO)": "MONTENEGRO",
    "LEICHTENSTEIN": "LIECHTENSTEIN",
    "COCOS (KEELING) ISLAND": "COCOS (KEELING) ISLANDS",
    "MACEDONIA": "NORTH MACEDONIA",
    "BRITISH VIRGIN ISLANDS": "VIRGIN ISLANDS BRITISH",
    "DEMOCRATIC REPUBLIC OF THE CONGO (ZAIRE)":
      "DEMOCRATIC REPUBLIC OF THE CONGO",
    "VIETNAM": "VIET NAM",
    "SOUTH KOREA": "SOUTH KOREA",
    "NORTH KOREA": "NORTH KOREA",
    "SYRIA": "SYRIAN ARAB REPUBLIC",
    "IRAN": "IRAN",
    "MACAU": "MACAO",
    "TANZANIA": "UNITED REPUBLIC OF TANZANIA",
    "BOLIVIA": "BOLIVIA (PLURINATIONAL STATE OF)",
    "UNITED KINGDOM": "UNITED KINGDOM",
    "UNITED STATES OF AMERICA": "UNITED STATES OF AMERICA",
  };

  // 🧭 Static fallback
  const fallbackCountryMap = {
    "HONGKONG": "CHINA",
    "HONG KONG": "CHINA",
    "MACAU": "CHINA",
    "SINGAPORE": "MALAYSIA",
  };

  // 🔍 Levenshtein Distance
  const stringDistance = (a, b) => {
    const dp = Array.from({ length: a.length + 1 }, () =>
      Array(b.length + 1).fill(0)
    );
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }
    return dp[a.length][b.length];
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

        const normLookup = {};
        const allGeoNames = geometries.map((f) =>
          normalize(f.properties[countryProp])
        );

        let matchCount = 0;
        let missCount = 0;
        let fallbackCount = 0;

        for (const [key, val] of Object.entries(yearData)) {
          if (key === "year") continue;

          const numericValue =
            val == null || val === ""
              ? 0
              : typeof val === "number"
              ? val
              : parseFloat(String(val).replace(/,/g, "")) || 0;
          if (numericValue <= 0) continue;

          let cleanKey = normalize(key);
          if (countryNameMap[cleanKey]) {
            cleanKey = normalize(countryNameMap[cleanKey]);
          }

          // Try direct match
          const match = geometries.find((f) => {
            const admin = normalize(f.properties.ADMIN || f.properties.admin || "");
            const name = normalize(f.properties.NAME || f.properties.name || "");
            return admin === cleanKey || name === cleanKey;
          });

          if (match) {
            const iso = match.properties.ISO_A3 || match.properties.iso_a3;
            normLookup[iso] = (normLookup[iso] || 0) + numericValue;
            matchCount++;
            continue;
          }

          // Try static fallback
          const fallback = fallbackCountryMap[key] || fallbackCountryMap[cleanKey];
          if (fallback) {
            console.log(`↩️ Redirecting ${key} → ${fallback}`);
            const fbClean = normalize(fallback);
            const fbMatch = geometries.find((f) => {
              const admin = normalize(f.properties.ADMIN || f.properties.admin || "");
              const name = normalize(f.properties.NAME || f.properties.name || "");
              return admin === fbClean || name === fbClean;
            });
            if (fbMatch) {
              const iso = fbMatch.properties.ISO_A3 || fbMatch.properties.iso_a3;
              normLookup[iso] = (normLookup[iso] || 0) + numericValue;
              fallbackCount++;
              continue;
            }
          }

          // Try auto-redirect via fuzzy match
          const closest = allGeoNames
            .map((n) => ({ n, dist: stringDistance(cleanKey, n) }))
            .sort((a, b) => a.dist - b.dist)[0];

          if (closest && closest.dist <= 10) {
            console.log(`🔁 Auto-redirected ${key} → ${closest.n} (dist=${closest.dist})`);
            const matchClosest = geometries.find((f) => {
              const admin = normalize(f.properties.ADMIN || f.properties.admin || "");
              const name = normalize(f.properties.NAME || f.properties.name || "");
              return admin === closest.n || name === closest.n;
            });
            if (matchClosest) {
              const iso = matchClosest.properties.ISO_A3 || matchClosest.properties.iso_a3;
              normLookup[iso] = (normLookup[iso] || 0) + numericValue;
              fallbackCount++;
              continue;
            }
          }

          missCount++;
          console.warn(`⚠️ No match for ${key} → ${cleanKey}. Closest: ${closest?.n} (dist=${closest?.dist})`);
        }

        console.log(`✅ Matches: ${matchCount} / ↩️ Redirects: ${fallbackCount} / ❌ Misses: ${missCount}`);
        setLookup(normLookup);
      } catch (err) {
        console.error("💥 Error loading data:", err);
      }
    })();
  }, [selectedYear]);

  // === DRAW MAP ===
  useEffect(() => {
    if (!geoData || !Object.keys(lookup).length) return;

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
    const colorScale = d3
      .scaleSequential()
      .domain([minVal, maxVal])
      .interpolator(d3.interpolateRgb("#adccfaff", "#08306b"));

    svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .style("background", "#ffffff");

    svg
      .selectAll("path")
      .data(geoData.features)
      .join("path")
      .attr("d", path)
      .attr("fill", (d) => {
        const iso = d.properties.ISO_A3 || d.properties.iso_a3;
        const val = lookup[iso] || 0;
        return val > 0 ? colorScale(val) : "#e0e0e0";
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.5)
      .attr("cursor", "pointer")
      .on("mouseover", function (event, d) {
        const iso = d.properties.ISO_A3 || d.properties.iso_a3;
        const val = lookup[iso] || 0;
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
        const iso = d.properties.ISO_A3 || d.properties.iso_a3;
        const val = lookup[iso] || 0;
        setSelectedCountry({
          id: iso,
          name: d.properties[geoData._countryProp],
          value: val,
        });
      });

    // === LEGEND ===
    const legendWidth = 300;
    const legendHeight = 12;
    const legendSvg = legend
      .append("svg")
      .attr("width", legendWidth + 80)
      .attr("height", 60);

    legendSvg
      .append("text")
      .attr("x", (legendWidth + 80) / 2)
      .attr("y", 12)
      .attr("text-anchor", "middle")
      .style("font", "12px sans-serif")
      .text("Number of Emigrants — Low → High");

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
    const legendAxis = d3.axisBottom(legendScale).ticks(6).tickFormat(d3.format(".0s"));
    legendSvg
      .append("g")
      .attr("transform", `translate(0, ${20 + legendHeight})`)
      .call(legendAxis)
      .select(".domain")
      .remove();
  }, [geoData, lookup]);

  // 🏆 Top 5 Countries
  const topCountries = geoData
    ? Object.entries(lookup)
        .map(([iso, val]) => {
          const country = geoData.features.find(
            (f) =>
              f.properties.ISO_A3 === iso ||
              f.properties.iso_a3 === iso
          );
          return {
            id: iso,
            name: country?.properties[geoData._countryProp] || iso,
            value: val,
          };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
    : [];

  const handleYearChange = (e) => {
    setSelectedYear(parseInt(e.target.value));
    setSelectedCountry(null);
  };

  return (
    <div style={{ position: "relative", width: "100%", textAlign: "center", paddingTop: "50px" }}>
      <svg ref={svgRef}></svg>

      {/* 🏆 Top 5 Panel */}
      {geoData && topCountries.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "1px",
            right: "10px",
            background: "#ffffffcc",
            borderRadius: "8px",
            boxShadow: "0 0 4px rgba(0,0,0,0.1)",
            padding: "10px 14px",
            fontSize: "13px",
            textAlign: "left",
            zIndex: 10,
          }}
        >
          <strong>🏆 Top 5 Destinations ({selectedYear})</strong>
          <ol style={{ margin: "8px 0 0", paddingLeft: "20px" }}>
            {topCountries.map((c) => (
              <li key={c.id}>
                {c.name}: {c.value.toLocaleString()}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* 📊 Info Panel */}
      {selectedCountry && (
        <div
          style={{
            position: "absolute",
            bottom: "200px",
            left: "50px",
            background: "#f0f8ff",
            borderRadius: "8px",
            boxShadow: "0 0 4px rgba(0,0,0,0.1)",
            padding: "10px 14px",
            fontSize: "13px",
            zIndex: 10,
          }}
        >
          <strong>{selectedCountry.name}</strong>
          <div>Emigrants: {selectedCountry.value.toLocaleString()}</div>
        </div>
      )}

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

      {/* Legend */}
      <div ref={legendRef} style={{ marginTop: "10px" }}></div>

      {/* 🎚️ Year Slider */}
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
