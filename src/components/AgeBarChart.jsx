import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { db } from "../firebase"; // Import Firebase config
import { getDoc, doc } from "firebase/firestore";
import { Modal, Button } from 'react-bootstrap'; // Bootstrap imports
import 'bootstrap/dist/css/bootstrap.min.css'; // Import Bootstrap CSS

const AgeBarChart = () => {
  const [data, setData] = useState([]); // Store the fetched data here
  const [filteredData, setFilteredData] = useState([]); // Store the filtered data after applying age range
  const [modalShow, setModalShow] = useState(false); // To toggle modal visibility
  const [fromAge, setFromAge] = useState("14 - Below");
  const [toAge, setToAge] = useState("15 - 19");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true); // Track loading state
  const [year, setYear] = useState(1981); // Default year is 1981
  const [ageDistribution, setAgeDistribution] = useState([]);

  const [dataAvailable, setDataAvailable] = useState(true);

  const ageRanges = [
    "14 - Below", "15 - 19", "20 - 24", "25 - 29", "30 - 34", "35 - 39", "40 - 44", "45 - 49", "50 - 54", "55 - 59", "60 - 64", "65 - 69", "70 - Above"
  ];

  // Function to get the last number in a given range
  const getLastAge = (range) => {
    if (range === "14 - Below") return "Below";
    const parts = range.split(" - ");
    return parts[1];
  };

  // Fetch the data when the component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        const ageDocRef = doc(db, "filipinoEmigrantsFiles", "Age");
        const docSnap = await getDoc(ageDocRef);

        if (!docSnap.exists()) {
          console.log("No such document in Firestore.");
          setData([]); 
          setDataAvailable(false);            
          setLoading(false);
          return;
        }

        const docdata = docSnap.data();

        if (docdata && docdata.data) {
          const yearsData = docdata.data;
          const formattedData = yearsData.map((yearData) => {
            const year = yearData.year;
            const dataEntry = { year };
            Object.keys(yearData).forEach((key) => {
              if (key !== "year") {
                dataEntry[key] = yearData[key];
              }
            });
            return dataEntry;
          });

          setData(formattedData);
          setLoading(false);

          // If there is at least one entry, mark available; else not
          if (formattedData.length > 0) {
            setDataAvailable(true);           
            updateAgeDistribution(formattedData, year);
          } else {
            setDataAvailable(false);          
          }
        } else {
          console.log("No data found for Age document");
          setData([]);
          setDataAvailable(false);            
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setData([]);
        setDataAvailable(false);              
        setLoading(false);
      }
    };
    fetchData();
  }, []); // Fetch data on mount

  const updateAgeDistribution = (data, selectedYear) => {
    // Filter data to get the specific year data
    const yearData = data.find((item) => item.year === selectedYear);
    if (yearData) {
      const distribution = ageRanges.map((range) => {
        return {
          ageRange: range,
          count: yearData[range] || 0, // Default to 0 if the range is not present
        };
      });
      setAgeDistribution(distribution);
      setDataAvailable(true);                 
    } else {
      setAgeDistribution([]);                 
      setDataAvailable(false);                
    }
  };

  // Handle slider change
  const handleYearChange = (event) => {
    const selectedYear = parseInt(event.target.value);
    setYear(selectedYear);
    updateAgeDistribution(data, selectedYear);
  };

  return (
    <div>
      {/* Bar Chart showing the distribution for the selected year */}
      <div className="blueSectionChart">
        {/* Year Slider */}
        <div className="yearSlider">
            <span id="yearSliderLabel">Select Year: </span>
            <input
            type="range"
            id="yearSlider"
            min="1981"
            max="2020"
            step="1"
            value={year}
            onChange={handleYearChange}
            />
            <span>{year}</span>
        </div>

        {!loading && !dataAvailable ? (
          <p>Data is not available</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={loading ? [] : ageDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="ageRange" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default AgeBarChart;