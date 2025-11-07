import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { db } from "../firebase";
import { getDoc, doc } from "firebase/firestore";
import 'bootstrap/dist/css/bootstrap.min.css';

const EducationLineChart = () => {
  const [data, setData] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("College Graduate");
  const [categories, setCategories] = useState([
    "College Graduate",
    "High School Graduate",
    "Elementary Graduate",
    "Vocational Graduate",
    "Post Graduate",
    "College Level",
    "High School Level",
    "Elementary Level",
    "Vocational Level",
    "Post Graduate Level",
    "No Formal Education",
    "Non-Formal Education",
    "Not Reported / No Response",
    "Not of Schooling Age",
    "Others",
  ]);
  const [loading, setLoading] = useState(true);
  const [dataAvailable, setDataAvailable] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const educationDocRef = doc(db, "filipinoEmigrantsFiles", "Education");
        const docSnap = await getDoc(educationDocRef);

        if (!docSnap.exists()) {
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
            return {
              year,
              "College Graduate": yearData["College Graduate"] || 0,
              "High School Graduate": yearData["High School Graduate"] || 0,
              "Elementary Graduate": yearData["Elementary Graduate"] || 0,
              "Vocational Graduate": yearData["Vocational Graduate"] || 0,
              "Post Graduate": yearData["Post Graduate"] || 0,
              "College Level": yearData["College Level"] || 0,
              "High School Level": yearData["High School Level"] || 0,
              "Elementary Level": yearData["Elementary Level"] || 0,
              "Vocational Level": yearData["Vocational Level"] || 0,
              "Post Graduate Level": yearData["Post Graduate Level"] || 0,
              "No Formal Education": yearData["No Formal Education"] || 0,
              "Non-Formal Education": yearData["Non-Formal Education"] || 0,
              "Not Reported / No Response": yearData["Not Reported / No Response"] || 0,
              "Not of Schooling Age": yearData["Not of Schooling Age"] || 0,
              Others: yearData["Others"] || 0,
            };
          });

          setData(formattedData);
          setDataAvailable(formattedData.length > 0);
          setLoading(false);
        } else {
          setData([]);
          setDataAvailable(false);
          setLoading(false);
        }
      } catch (error) {
        setData([]);
        setDataAvailable(false);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleCategoryChange = (event) => {
    setSelectedCategory(event.target.value);
  };

  const getCategoryData = () => {
    return data.map((entry) => ({
      year: entry.year,
      value: entry[selectedCategory],
    }));
  };

  const renderLegend = () => {
    return `${selectedCategory}`;
  };

  return (
    <div>
      <div className="input-group mb-3 dropdownOptions">
        <select className="form-select" id="inputGroupSelect01" value={selectedCategory} onChange={handleCategoryChange}>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {!loading && !dataAvailable ? (
        <p>Data is not available</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={loading ? [] : getCategoryData()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis />
            <Tooltip />
            <Legend formatter={renderLegend} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#8884d8"
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default EducationLineChart;
