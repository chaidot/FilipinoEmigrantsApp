import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { db } from "../firebase";
import { getDoc, doc } from "firebase/firestore";
import { Modal, Button } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

const AgeLineChart = () => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [modalShow, setModalShow] = useState(false);
  const [fromAge, setFromAge] = useState("14 - Below");
  const [toAge, setToAge] = useState("15 - 19");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [dataAvailable, setDataAvailable] = useState(true);

  const ageRanges = [
    "14 - Below", "15 - 19", "20 - 24", "25 - 29", "30 - 34", "35 - 39", "40 - 44", "45 - 49", "50 - 54", "55 - 59", "60 - 64", "65 - 69", "70 - Above"
  ];

  const getLastAge = (range) => {
    if (range === "14 - Below") return "Below";
    const parts = range.split(" - ");
    return parts[1];
  };
  const getFirstAge = (range) => {
    const parts = range.split(" - ");
    return parts[0];
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const ageDocRef = doc(db, "filipinoEmigrantsFiles", "Age");
        const docSnap = await getDoc(ageDocRef);

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
            const dataEntry = { year };
            Object.keys(yearData).forEach((key) => {
              if (key !== "year") {
                dataEntry[key] = yearData[key];
              }
            });
            return dataEntry;
          });

          setData(formattedData);

          if (formattedData.length > 0) {
            setDataAvailable(true);
            filterData(formattedData, "14 - Below", "15 - 19");
          } else {
            setDataAvailable(false);
            setLoading(false);
          }
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

  const filterData = (data, from, to) => {
    const fromIndex = ageRanges.indexOf(from);
    const toIndex = ageRanges.indexOf(to);

    const filtered = data.map((yearData) => {
      const newData = { year: yearData.year };
      let total = 0;
      let yearTotal = 0;

      Object.keys(yearData).forEach((key) => {
        if (key !== "year") {
          if (ageRanges.indexOf(key) >= fromIndex && ageRanges.indexOf(key) <= toIndex) {
            total += yearData[key];
          }
          yearTotal += yearData[key];
        }
      });

      newData["total"] = total;
      newData["yearTotal"] = yearTotal;
      return newData;
    });

    setFilteredData(filtered);
    setDataAvailable(filtered.length > 0);
    setLoading(false);
  };

  const handleApplyChanges = () => {
    if (ageRanges.indexOf(fromAge) > ageRanges.indexOf(toAge)) {
      setError("Invalid Input.");
    } else {
      setError("");
      filterData(data, fromAge, toAge);
      setModalShow(false);
    }
  };

  const getAgeRangeLabel = (from, to) => {
    if (from === "14 - Below" && to === "70 - Above") {
      return "All";
    } else if (from === "14 - Below") {
      const lastAge = getLastAge(to);
      return `${lastAge} - Below`;
    } else {
      const fromLastAge = getFirstAge(from);
      const toLastAge = getLastAge(to);
      return `${fromLastAge} - ${toLastAge}`;
    }
  };

  return (
    <div>
      <p className="modifyCategoriesButton blueSectionButtons" onClick={() => setModalShow(true)}>Modify Age Range</p>

      <Modal show={modalShow} onHide={() => setModalShow(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Select Age Range</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="input-group mb-3">
            <label className="input-group-text" htmlFor="inputGroupSelectFrom">From:</label>
            <select
              className="form-select"
              id="inputGroupSelectFrom"
              value={fromAge}
              onChange={(e) => setFromAge(e.target.value)}
            >
              {ageRanges.map((range) => (
                <option key={range} value={range}>{range}</option>
              ))}
            </select>

            <label className="input-group-text" htmlFor="inputGroupSelectTo">To:</label>
            <select
              className="form-select"
              id="inputGroupSelectTo"
              value={toAge}
              onChange={(e) => setToAge(e.target.value)}
            >
              {ageRanges.map((range) => (
                <option key={range} value={range}>{range}</option>
              ))}
            </select>
          </div>
          {error && <p style={{ color: "red" }}>{error}</p>}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setModalShow(false)}>Close</Button>
          <Button variant="primary" onClick={handleApplyChanges}>Apply Changes</Button>
        </Modal.Footer>
      </Modal>

      <div className="blueSectionChart">
        {!loading && !dataAvailable ? (
          <p>Data is not available</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={loading ? [] : filteredData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#8884d8"
                activeDot={{ r: 8 }}
                name={getAgeRangeLabel(fromAge, toAge)}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default AgeLineChart;
