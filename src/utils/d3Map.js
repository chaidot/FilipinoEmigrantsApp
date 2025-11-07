// src/utils/d3Map.js
import * as d3 from "d3";

/**
 * Draws or updates a choropleth map of the Philippines.
 * @param {SVGElement} svgEl - Reference to the <svg> element.
 * @param {HTMLElement} tooltipEl - Reference to the tooltip div.
 * @param {Object} geoData - GeoJSON data for Philippine regions.
 * @param {Object} yearData - Object mapping "Region I", "Region II", etc. -> value/count.
 */
export const drawChoroplethMap = (svgEl, tooltipEl, geoData, yearData) => {
  const svg = d3.select(svgEl);
  const tooltip = d3.select(tooltipEl);

  svg.selectAll("*").remove(); // clear previous render

  const width = 600;
  const height = 600;

  // Projection setup — auto fits map to SVG
  const projection = d3.geoMercator().fitSize([width, height], geoData);
  const path = d3.geoPath().projection(projection);

  // Blue gradient scale
  const colorScale = d3
    .scaleSequential()
    .domain([0, 30000]) // adjust range if needed
    .interpolator(d3.interpolateBlues);

  // SVG container
  svg.attr("viewBox", `0 0 ${width} ${height}`).style("cursor", "pointer");

  // Draw regions
  svg
    .selectAll("path")
    .data(geoData.features)
    .join("path")
    .attr("d", path)
    .attr("fill", (d) => {
      const region = d.properties.designation;
      const count = yearData[region] || 0;
      return colorScale(count);
    })
    .attr("stroke", "#fff")
    .attr("stroke-width", 0.5)
    .on("mouseover", function (event, d) {
      const region = d.properties.designation;
      const regionName = d.properties.REGION_NAME;
      const count = yearData[region] || 0;

      tooltip
        .style("opacity", 1)
        .html(
          `<strong>${regionName}</strong><br/>Count: ${count.toLocaleString()}`
        );
      d3.select(this).attr("stroke-width", 1.5);
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", event.pageX + 15 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", function () {
      tooltip.style("opacity", 0);
      d3.select(this).attr("stroke-width", 0.5);
    });
};
