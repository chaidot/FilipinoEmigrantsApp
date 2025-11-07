import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { LineChart, Line } from "recharts";
import { db } from "../firebase";
import { getDoc, doc } from "firebase/firestore";
import 'bootstrap/dist/css/bootstrap.min.css';

const SexGroupBarChart = () => {
  const [data, setData] = useState([]);
  const [selectedGender, setSelectedGender] = useState("Both");
  const [loading, setLoading] = useState(true);
  const [dataAvailable, setDataAvailable] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sexDocRef = doc(db, "filipinoEmigrantsFiles", "Sex");
        const docSnap = await getDoc(sexDocRef);

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
              FEMALE: yearData.FEMALE || 0,
              MALE: yearData.MALE || 0,
              TOTAL: (yearData.MALE + yearData.FEMALE) || 0,
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

  const filteredData = data.map((entry) => ({
    year: entry.year,
    FEMALE: selectedGender === "Both" || selectedGender === "Female" ? entry.FEMALE : 0,
    MALE: selectedGender === "Both" || selectedGender === "Male" ? entry.MALE : 0,
  }));

  const renderBarAndLineChart = (gender) => (
    <div className="blueSectionChart">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={filteredData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" />
          <YAxis />
          <Tooltip />
          <Legend />
          {gender === "Female" && selectedGender !== "Male" && <Bar dataKey="FEMALE" fill="#8884d8" />}
          {gender === "Male" && selectedGender !== "Female" && <Bar dataKey="MALE" fill="#82ca9d" />}
          {gender === "Female" && selectedGender !== "Male" && <Line type="monotone" dataKey="FEMALE" stroke="#8884d8" />}
          {gender === "Male" && selectedGender !== "Female" && <Line type="monotone" dataKey="MALE" stroke="#82ca9d" />}
          <Line type="monotone" dataKey="TOTAL" stroke="#d3d3d3" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className="sexChartContainer">
      {!loading && !dataAvailable ? (
        <p>Data is not available</p>
      ) : (
        <div className="blueSectionChart chartContainer">
          {selectedGender === "Both" && (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip />
                <Legend />
                {selectedGender !== "Male" && <Bar dataKey="FEMALE" fill="#8884d8" />}
                {selectedGender !== "Female" && <Bar dataKey="MALE" fill="#82ca9d" />}
              </BarChart>
            </ResponsiveContainer>
          )}

          {selectedGender === "Female" && renderBarAndLineChart("Female")}
          {selectedGender === "Male" && renderBarAndLineChart("Male")}
        </div>
      )}

      <div className="sexRadioButtons">
        <div className="form-check">
          <input
            className="form-check-input"
            type="radio"
            id="femaleRadio"
            name="gender"
            value="Female"
            checked={selectedGender === "Female"}
            onChange={() => setSelectedGender("Female")}
          />
          <label className="form-check-label" htmlFor="femaleRadio">
            Female
          </label>
        </div>

        <div className="form-check">
          <input
            className="form-check-input"
            type="radio"
            id="maleRadio"
            name="gender"
            value="Male"
            checked={selectedGender === "Male"}
            onChange={() => setSelectedGender("Male")}
          />
          <label className="form-check-label" htmlFor="maleRadio">
            Male
          </label>
        </div>

        <div className="form-check">
          <input
            className="form-check-input"
            type="radio"
            id="bothRadio"
            name="gender"
            value="Both"
            checked={selectedGender === "Both"}
            onChange={() => setSelectedGender("Both")}
          />
          <label className="form-check-label" htmlFor="bothRadio">
            Both
          </label>
        </div>
      </div>
    </div>
  );
};

export default SexGroupBarChart;
