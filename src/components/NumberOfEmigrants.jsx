import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getDoc, doc } from 'firebase/firestore';
import { db } from "../firebase";  // Correctly import your Firestore instance

const NumberOfEmigrants = () => {
  const [data, setData] = useState([]);
  const [dataAvailable, setDataAvailable] = useState(true); // To track data availability

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Reference to the 'Age' document in 'filipinoEmigrantsFiles' collection
        const ageDocRef = doc(db, "filipinoEmigrantsFiles", "Age"); // Use the correct category here
        // Get the document from Firestore
        const docSnap = await getDoc(ageDocRef);

        if (!docSnap.exists()) {
          setDataAvailable(false);  // Set to false if the document does not exist
          console.log("No such document in Firestore.");
          return;
        }

        const docData = docSnap.data();
        
        // Check if 'data' exists in the document
        if (docData && docData.data) {
          const yearData = [];

          // Process the data field (which is an array of year-wise emigrant data)
          docData.data.forEach((entry) => {
            const year = entry.year;
            const emigrantData = entry; // The entire document is emigrant data

            // Sum the emigrants data for the year, excluding the "year" field
            const totalEmigrants = Object.keys(emigrantData)
              .filter((key) => key !== "year")  // Exclude the year field
              .reduce((acc, curr) => acc + emigrantData[curr], 0);

            yearData.push({ year: parseInt(year), totalEmigrants });
          });

          if (yearData.length > 0) {
            setData(yearData);  // Set the data if available
          } else {
            setDataAvailable(false);  // Set to false if no valid data is found
          }
        } else {
          setDataAvailable(false);
          console.log("No 'data' field found in the document.");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setDataAvailable(false);  // In case of error, set data availability to false
      }
    };

    fetchData();
  }, []);

  return (
    <div className="numberOfEmigrants">
      {dataAvailable ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="totalEmigrants" stroke="#8884d8" />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p>Data is not available</p>  // Show message when no data is available
      )}
    </div>
  );
};

export default NumberOfEmigrants;