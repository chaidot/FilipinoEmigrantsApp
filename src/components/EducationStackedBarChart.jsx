import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { db } from "../firebase";
import { getDoc, doc } from "firebase/firestore";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'bootstrap-icons/font/bootstrap-icons.css';

const EducationStackedBarChart = () => {
  const [data, setData] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState({
    "College Graduate": true,
    "High School Graduate": true,
    "Elementary Graduate": false,
    "Vocational Graduate": true,
    "Post Graduate": true,
    "Post Graduate Level": true,
    "College Level": true,
    "High School Level": false,
    "Elementary Level": false,
    "No Formal Education": false,
    "Non-Formal Education": false,
    "Not Reported / No Response": false,
    "Not of Schooling Age": false,
    "Others": true,
  });
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dataAvailable, setDataAvailable] = useState(true);

  const allCategories = [
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
  ];

  const categoryColors = {
    "College Graduate": "#8884d8",
    "High School Graduate": "#82ca9d",
    "Elementary Graduate": "#ffc658",
    "Vocational Graduate": "#ff7300",
    "Post Graduate": "#ff0000",
    "College Level": "#8e44ad",
    "High School Level": "#3498db",
    "Elementary Level": "#2ecc71",
    "Vocational Level": "#00ff00",
    "Post Graduate Level": "#0000ff",
    "No Formal Education": "#f39c12",
    "Non-Formal Education": "#e74c3c",
    "Not Reported / No Response": "#9b59b6",
    "Not of Schooling Age": "#16a085",
    "Others": "#d3d3d3",
  };

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

            const othersCount = allCategories.slice(0).reduce((sum, category) => {
              if (!selectedCategories[category]) {
                sum += yearData[category] || 0;
              }
              return sum;
            }, 0);

            const total = Object.keys(yearData).reduce((sum, category) => {
              if (allCategories.includes(category)) {
                sum += yearData[category] || 0;
              }
              return sum;
            }, 0);

            if (total === 0) {
              return {
                year,
                "College Graduate": 0,
                "High School Graduate": 0,
                "Elementary Graduate": 0,
                "Vocational Graduate": 0,
                "Post Graduate": 0,
                "College Level": 0,
                "High School Level": 0,
                "Elementary Level": 0,
                "Vocational Level": 0,
                "Post Graduate Level": 0,
                "No Formal Education": 0,
                "Non-Formal Education": 0,
                "Not Reported / No Response": 0,
                "Not of Schooling Age": 0,
                Others: 0,
              };
            }

            return {
              year,
              "College Graduate": (yearData["College Graduate"] || 0) / total * 100,
              "High School Graduate": (yearData["High School Graduate"] || 0) / total * 100,
              "Elementary Graduate": (yearData["Elementary Graduate"] || 0) / total * 100,
              "Vocational Graduate": (yearData["Vocational Graduate"] || 0) / total * 100,
              "Post Graduate": (yearData["Post Graduate"] || 0) / total * 100,
              "College Level": (yearData["College Level"] || 0) / total * 100,
              "High School Level": (yearData["High School Level"] || 0) / total * 100,
              "Elementary Level": (yearData["Elementary Level"] || 0) / total * 100,
              "Vocational Level": (yearData["Vocational Level"] || 0) / total * 100,
              "Post Graduate Level": (yearData["Post Graduate Level"] || 0) / total * 100,
              "No Formal Education": (yearData["No Formal Education"] || 0) / total * 100,
              "Non-Formal Education": (yearData["Non-Formal Education"] || 0) / total * 100,
              "Not Reported / No Response": (yearData["Not Reported / No Response"] || 0) / total * 100,
              "Not of Schooling Age": (yearData["Not of Schooling Age"] || 0) / total * 100,
              Others: othersCount / total * 100,
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
  }, [selectedCategories]);

  const handleCategoryToggle = (category) => {
    setSelectedCategories((prev) => {
      const newSelectedCategories = {
        ...prev,
        [category]: !prev[category],
      };
      return newSelectedCategories;
    });
  };

  const getFilteredData = () => {
    return data.map((entry) => {
      const filteredEntry = { year: entry.year };
      for (const category in selectedCategories) {
        if (selectedCategories[category]) {
          filteredEntry[category] = entry[category];
        }
      }
      return filteredEntry;
    });
  };

  const handleShowModal = () => setShowModal(true);
  const handleCloseModal = () => setShowModal(false);

  return (
    <div>
      <p className="modifyCategoriesButton" onClick={handleShowModal}>
        Modify Categories Shown
      </p>

      {showModal && (
        <div
          className="modal fade show"
          id="categoryModal"
          tabIndex="-1"
          aria-labelledby="categoryModalLabel"
          aria-hidden="false"
          style={{ display: "block" }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="categoryModalLabel">
                  Select Categories to Display
                </h5>
              </div>
              <div className="modal-body">
                <div className="row">
                  {allCategories.map((category) => (
                    <div key={category} className="col-md-6 mb-2">
                      <div className="d-flex justify-content-start">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={category}
                          checked={selectedCategories[category] !== undefined ? selectedCategories[category] : false}
                          onChange={() => handleCategoryToggle(category)}
                        />
                        <label className="form-check-label labelCategoriesModal" htmlFor={category}>
                          {category}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseModal}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && !dataAvailable ? (
        <p>Data is not available</p>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={loading ? [] : getFilteredData()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(value) => value.toFixed(2)}
              label={{ value: 'Percentage', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              formatter={(value) => Number.isFinite(value) ? value.toFixed(2) : "0.00"}
              contentStyle={{ zIndex: 9999 }}
              wrapperStyle={{ zIndex: 9999 }}
            />
            <Legend />
            {Object.keys(selectedCategories).map((category) =>
              selectedCategories[category] && category !== "Others" ? (
                <Bar
                  key={category}
                  dataKey={category}
                  stackId="a"
                  fill={categoryColors[category]}
                />
              ) : null
            )}
            <Bar dataKey="Others" stackId="a" fill={categoryColors["Others"]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default EducationStackedBarChart;
