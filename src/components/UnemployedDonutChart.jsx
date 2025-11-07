import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { db } from "../firebase";
import { getDoc, doc } from 'firebase/firestore';

const UnemployedDonutChart = ({ year }) => {
  const [unemployedData, setUnemployedData] = useState([]);
  const [selectedYearData, setSelectedYearData] = useState(null);
  const [totalCount, setTotalCount] = useState(0);  // New state for the total count

  const unemployedCategories = [
    'Housewives', 
    'Retirees', 
    'Students', 
    'Minors (Below 7 years old)', 
    'Out of School Youth', 
    'Refugees', 
    'No Occupation Reported'
  ];

  // Predefined colors for each category
  const categoryColors = [
    '#ff7300', // Housewives
    '#8884d8', // Retirees
    '#82ca9d', // Students
    '#ffc658', // Minors (Below 7 years old)
    '#d0ed57', // Out of School Youth
    '#a4de6c', // Refugees
    '#ff6347'  // No Occupation Reported
  ];

  useEffect(() => {
    const fetchData = async () => {
      const occuDocRef = doc(db, "filipinoEmigrantsFiles", "Occupation");
      const docSnap = await getDoc(occuDocRef);

      if (docSnap.exists()) {
        const docdata = docSnap.data();
        const yearsData = docdata.data;

        const yearData = yearsData.find((item) => String(item.year) === String(year));

        if (yearData) {
          // Calculate the total count for all categories in the selected year
          const total = unemployedCategories.reduce((total, category) => total + (yearData[category] || 0), 0);
          setTotalCount(total);  // Update totalCount state

          // Prepare the data for the pie chart, including the percentage
          const categoriesData = unemployedCategories.map((category, index) => {
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

          setUnemployedData(categoriesData);
          setSelectedYearData(yearData);
        }
      }
    };

    fetchData();
  }, [year]);

  if (!selectedYearData) return <p>Data is not available</p>;

  return (
    <div>
      {/* Display total number of unemployed people for the selected year */}
      <p>Total: {totalCount}</p>

      <ResponsiveContainer width="100%" height={530}>
        <PieChart>
          <Pie
            data={unemployedData}
            dataKey="value"
            nameKey="name"
            innerRadius="50%"
            outerRadius="80%"
            label
          >
            {unemployedData.map((entry, index) => (
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

export default UnemployedDonutChart;
