import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { db } from "../firebase"; // Import Firebase config
import { getDoc, doc } from "firebase/firestore";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'bootstrap-icons/font/bootstrap-icons.css';

const EmployedLineChart = () => {
  const [data, setData] = useState([]); // Store the fetched data here
  const [selectedCategory, setSelectedCategory] = useState("Prof'l, Tech'l, & Related Workers"); // Default category

  const employedCategories = [
    "Prof'l, Tech'l, & Related Workers",
    "Managerial, Executive, and Administrative Workers",
    "Clerical Workers",
    "Sales Workers",
    "Service Workers",
    "Agri, Animal Husbandry, Forestry Workers & Fishermen",
    "Production Process, Transport Equipment Operators, & Laborers",
    "Members of the Armed Forces",
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const occuDocRef = doc(db, "filipinoEmigrantsFiles", "Occupation");
        const docSnap = await getDoc(occuDocRef);

        if (!docSnap.exists()) {
          console.log("No such document in Firestore.");
          setData([]);
          return;
        }

        const docdata = docSnap.data();

        if (docdata && docdata.data) {
          const yearsData = docdata.data;

          // Filter data based on the selected category
          const formattedData = yearsData.map((yearData) => {
            const year = yearData.year;
            const categoryCount = yearData[selectedCategory] || 0;

            return { year, [selectedCategory]: categoryCount };
          });

          setData(formattedData);
        } else {
          console.log("No data found for Occupation document");
          setData([]);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setData([]);
      }
    };

    fetchData();
  }, [selectedCategory]); // Re-fetch data when the selected category changes

  if (data.length === 0) {
    return <p>Data is not available</p>;
  }

  return (
    <div>
      <div className="input-group mb-3 dropdownOptions">
        <select className="form-select" id="inputGroupSelect01" value={selectedCategory}
        onChange={(e) => setSelectedCategory(e.target.value)}>
            {employedCategories.map((category) => (
                <option key={category} value={category}>
                    {category}
                </option>
            ))}
        </select>
      </div>

      <ResponsiveContainer width="100%" height={400} className="linechart">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey={selectedCategory} stroke="#8884d8" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default EmployedLineChart;
