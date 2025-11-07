import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

const PlaceOfOriginMap = () => {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const legendRef = useRef(null);
  const [geoData, setGeoData] = useState(null);
  const [lookup, setLookup] = useState({});
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedYear, setSelectedYear] = useState(1988); // 🎚️ moved inside

  // Region label → GeoJSON ID
  const regionIdMap = {
    "region i - ilocos region": "PH01",
    "region ii - cagayan valley": "PH02",
    "region iii - central luzon": "PH03",
    "region iv a - calabarzon": "PH40",
    "region iv b - mimaropa": "PH41",
    "region v - bicol region": "PH05",
    "region vi - western visayas": "PH06",
    "region vii - central visayas": "PH07",
    "region viii - eastern visayas": "PH08",
    "region ix - zamboanga peninsula": "PH09",
    "region x - northern mindanao": "PH10",
    "region xi - davao region": "PH11",
    "region xii - soccsksargen": "PH12",
    "region xiii - caraga": "PH13",
    "autonomous region in muslim mindanao (armm)": "PH14",
    "cordillera administrative region (car)": "PH15",
    "national capital region (ncr)": "PH00",
  };

  const normalize = (str = "") => str.toLowerCase().replace(/\s+/g, " ").trim();

  // === FETCH GEOJSON + FIRESTORE ===
  useEffect(() => {
    (async () => {
      try {
        const geo = await d3.json(
          `${import.meta.env.BASE_URL}data/philippines-regions.geojson`
        );
        const geometries = geo.features.filter(
          (f) =>
            f.geometry &&
            f.geometry.coordinates &&
            f.geometry.coordinates.length
        );
        setGeoData({ ...geo, features: geometries });

        const ref = doc(db, "filipinoEmigrantsFiles", "PlaceOfOrigin");
        const snap = await getDoc(ref);
        if (!snap.exists())
          return console.error("Firestore PlaceOfOrigin doc not found");

        const docData = snap.data();
        const row = docData.data.find(
          (r) => parseInt(r.year, 10) === parseInt(selectedYear, 10)
        );
        if (!row) return console.warn(`No data for year ${selectedYear}`);

        const normLookup = {};
        for (const [key, val] of Object.entries(row)) {
          if (key === "year") continue;
          const cleanKey = normalize(key);
          const id = regionIdMap[cleanKey];
          if (!id) continue;
          const num =
            typeof val === "number"
              ? val
              : parseFloat(String(val).replace(/,/g, "")) || 0;
          normLookup[id] = num;
        }

        setLookup(normLookup);
        console.log("✅ lookup:", normLookup);
      } catch (err) {
        console.error("Error loading data:", err);
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

    const width = 720;
    const height = 720;
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

    // 🗺️ Draw map
    svg
      .selectAll("path")
      .data(geoData.features)
      .join("path")
      .attr("d", path)
      .attr("fill", (d) => {
        const id = d.properties.id;
        const val = lookup[id] || 0;
        return val > 0 ? colorScale(val) : "#e0e0e0";
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.8)
      .attr("cursor", "pointer")
      .on("mouseover", function (event, d) {
        const id = d.properties.id;
        const val = lookup[id] || 0;
        tooltip
          .style("opacity", 1)
          .html(
            `<strong>${d.properties.name}</strong><br/>Emigrants: ${val.toLocaleString()}`
          );
        d3.select(this).attr("stroke-width", 1.5);
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 30}px`);
      })
      .on("mouseout", function () {
        tooltip.style("opacity", 0);
        d3.select(this).attr("stroke-width", 0.8);
      })
      .on("click", (event, d) => {
        const id = d.properties.id;
        const val = lookup[id] || 0;
        setSelectedRegion({
          id,
          name: d.properties.name,
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
    const legendAxis = d3
      .axisBottom(legendScale)
      .ticks(6)
      .tickFormat(d3.format(".0s"));
    legendSvg
      .append("g")
      .attr("transform", `translate(0, ${20 + legendHeight})`)
      .call(legendAxis)
      .select(".domain")
      .remove();
  }, [geoData, lookup]);

  // === COMPUTE TOP 5 REGIONS ===
  const topRegions = geoData
    ? Object.entries(lookup)
        .map(([id, val]) => {
          const region = geoData.features.find((f) => f.properties.id === id);
          return { id, name: region?.properties.name || id, value: val };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
    : [];

  // === HANDLE SLIDER CHANGE ===
  const handleYearChange = (e) => {
    setSelectedYear(parseInt(e.target.value));
    setSelectedRegion(null); // clear selected region when year changes
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        textAlign: "center",
      }}
    >
      <svg ref={svgRef}></svg>

      {/* 🏆 Top 5 Regions Panel (Top Right) */}
      {geoData && topRegions.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "70px",
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
          <strong>🏆 Top 5 Regions ({selectedYear})</strong>
          <ol style={{ margin: "8px 0 0", paddingLeft: "20px" }}>
            {topRegions.map((r) => (
              <li key={r.id}>
                {r.name}: {r.value.toLocaleString()}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* 📊 Info Panel (Top Left when region clicked) */}
      {selectedRegion && (
        <div
          style={{
            position: "absolute",
            top: "200px",
            left: "50px",
            background: "#f0f8ff",
            borderRadius: "8px",
            boxShadow: "0 0 4px rgba(0,0,0,0.1)",
            padding: "10px 14px",
            fontSize: "13px",
            zIndex: 10,
          }}
        >
          <strong>{selectedRegion.name}</strong>
          <div>Emigrants: {selectedRegion.value.toLocaleString()}</div>
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
          min="1988"
          max="2020"
          step="1"
          value={selectedYear}
          onChange={handleYearChange}
          className="w-3/4 cursor-pointer accent-blue-600"
          style={{ width: "50%", cursor: "pointer" }}
        />
        <p style={{ marginBottom: "4px" }}>{selectedYear}</p>
      </div>
    </div>
  );
};

export default PlaceOfOriginMap;
