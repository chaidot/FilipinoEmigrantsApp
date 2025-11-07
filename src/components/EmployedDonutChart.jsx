import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { db } from "../firebase";
import { getDoc, doc } from 'firebase/firestore';

const EmployedDonutChart = ({ year }) => {
  const [employedData, setEmployedData] = useState([]);
  const [selectedYearData, setSelectedYearData] = useState(null);  
  const [totalCount, setTotalCount] = useState(0);  // New state for the total count

  const employedCategories = [
    'Prof\'l, Tech\'l, & Related Workers', 
    'Managerial, Executive, and Administrative Workers', 
    'Clerical Workers', 
    'Sales Workers', 
    'Service Workers', 
    'Agri, Animal Husbandry, Forestry Workers & Fishermen', 
    'Production Process, Transport Equipment Operators, & Laborers', 
    'Members of the Armed Forces'
  ];

  // Predefined colors for each category
  const categoryColors = [
    '#8884d8', // Prof'l, Tech'l, & Related Workers
    '#82ca9d', // Managerial, Executive, and Administrative Workers
    '#ff7300', // Clerical Workers
    '#ffc658', // Sales Workers
    '#d0ed57', // Service Workers
    '#a4de6c', // Agri, Animal Husbandry, Forestry Workers & Fishermen
    '#8a2be2', // Production Process, Transport Equipment Operators, & Laborers
    '#ff6347'  // Members of the Armed Forces
  ];

  useEffect(() => {
  const fetchData = async () => {
    try {
      const occuDocRef = doc(db, "filipinoEmigrantsFiles", "Occupation");
      const docSnap = await getDoc(occuDocRef);

      if (docSnap.exists()) {
        const docdata = docSnap.data();
        const yearsData = docdata.data;

        if (!year) {
          console.error("No valid year provided.");
          return;
        }

        // Log the yearsData to verify its structure

        // Convert year and compare as strings
        const yearData = yearsData.find((item) => String(item.year) === String(year));


        if (yearData) {
          // Calculate the total count for all categories in the selected year
          const total = employedCategories.reduce((total, category) => total + (yearData[category] || 0), 0);
          setTotalCount(total);  // Update totalCount state

          // Prepare the data for the pie chart, including the percentage
          const categoriesData = employedCategories.map((category, index) => {
            const count = yearData[category] || 0;
            const percentage = total > 0 ? ((count / total) * 100).toFixed(2) : 0;
            return {
              name: `${category} (${percentage}%)`, // Show both count and percentage
              value: count,
              percentage: percentage,
              count: count
            };
          });

          // Sort the categories by percentage in descending order
          categoriesData.sort((a, b) => b.percentage - a.percentage);

          setEmployedData(categoriesData);
          setSelectedYearData(yearData);
        } else {
          console.log("No data found for the selected year.");
        }
      } else {
        console.log("No such document in Firestore.");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  fetchData();
}, [year]);


  if (!selectedYearData) return <p>Data is not available</p>;

  return (
    <div>
      {/* Display total number of employed people for the selected year */}
      <p>Total: {totalCount}</p>

      <ResponsiveContainer width="100%" height={600}>
        <PieChart>
          <Pie
            data={employedData}
            dataKey="value"
            nameKey="name"
            innerRadius="50%"
            outerRadius="80%"
            label
          >
            {employedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={categoryColors[index]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value, name, props) => {
              // Custom formatter for the tooltip
              return [`(${props.payload.count})`, name];
            }}
          />
          <Legend 
            content={({ payload }) => (
              <ol className="donutChartLabel">
                {payload
                  .sort((a, b) => b.payload.percentage - a.payload.percentage)  // Sort by percentage
                  .map((entry, index) => (
                    <li  key={`legend-item-${index}`} style={{ color: categoryColors[index]}}>
                      {entry.payload.name}
                    </li>
                  ))}
              </ol>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default EmployedDonutChart;
