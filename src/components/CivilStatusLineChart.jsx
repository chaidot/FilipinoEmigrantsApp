import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { db } from "../firebase";
import { getDoc, doc } from "firebase/firestore";
import 'bootstrap/dist/css/bootstrap.min.css';

const CivilStatusLineChart = () => {
  const [data, setData] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("Married");
  const [categories, setCategories] = useState([
    "Divorced",
    "Married",
    "Separated",
    "Single",
    "Widower",
    "Not Reported",
  ]);
  const [loading, setLoading] = useState(true);
  const [dataAvailable, setDataAvailable] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const civilStatusDocRef = doc(db, "filipinoEmigrantsFiles", "CivilStatus");
        const docSnap = await getDoc(civilStatusDocRef);

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
            const divorced = yearData["Divorced"] || 0;
            const married = yearData["Married"] || 0;
            const notReported = yearData["Not Reported"] || 0;
            const separated = yearData["Separated"] || 0;
            const single = yearData["Single"] || 0;
            const widower = yearData["Widower"] || 0;

            return {
              year: yearData.year,
              Divorced: divorced,
              Married: married,
              "Not Reported": notReported,
              Separated: separated,
              Single: single,
              Widower: widower,
              Total: divorced + married + notReported + separated + single + widower,
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
        <select
          className="form-select"
          id="inputGroupSelect01"
          value={selectedCategory}
          onChange={handleCategoryChange}
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div className="blueSectionChart">
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
                stroke="#8e44ad"
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default CivilStatusLineChart;