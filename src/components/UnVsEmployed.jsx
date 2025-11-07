import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { db } from "../firebase"; // Import Firebase config
import { getDoc, doc } from 'firebase/firestore';

const UnVsEmployed = () => {
  const [data, setData] = useState([]); // Store the fetched data here

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

  const unemployedCategories = [
    'Housewives', 
    'Retirees', 
    'Students', 
    'Minors (Below 7 years old)', 
    'Out of School Youth', 
    'Refugees', 
    'No Occupation Reported'
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const occuDocRef = doc(db, "filipinoEmigrantsFiles", "Occupation"); // Correct Firestore doc reference
        // Get the document from Firestore
        const docSnap = await getDoc(occuDocRef);

        if (!docSnap.exists()) {
          console.log("No such document in Firestore.");
          setData([]); // Set to empty if document doesn't exist
          return;
        }
        
        const docdata = docSnap.data();
        
        if (docdata && docdata.data) {  // Check for 'data' field inside docdata

          // Extract the array of year data from docdata.data
          const yearsData = docdata.data;

          // Process the year data
          const formattedData = yearsData.map((yearData) => {
            const year = yearData.year; // Get the year
            
            // Calculate Employed and Unemployed totals for each year
            const employedCount = employedCategories.reduce(
              (sum, category) => sum + (yearData[category] || 0),
              0
            );
            const unemployedCount = unemployedCategories.reduce(
              (sum, category) => sum + (yearData[category] || 0),
              0
            );

            return { year, employed: employedCount, unemployed: unemployedCount };
          });

          setData(formattedData); // Set formatted data to state
        } else {
          console.log("No data found for Occupation document");
          setData([]); // Set empty data if no data found
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setData([]); // Set empty data if an error occurs
      }
    };

    fetchData();
  }, []);

  // Check if data is available or not
  if (data.length === 0) {
    return <p>Data is not available</p>; // Display message if no data is available
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="year" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="employed" stroke="#8884d8" />
        <Line type="monotone" dataKey="unemployed" stroke="#82ca9d" />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default UnVsEmployed;
