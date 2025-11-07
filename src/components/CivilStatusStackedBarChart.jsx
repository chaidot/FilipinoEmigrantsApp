import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { db } from "../firebase";
import { getDoc, doc } from "firebase/firestore";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'bootstrap-icons/font/bootstrap-icons.css';

const CivilStatusStackedBarChart = () => {
  const [data, setData] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState({
    "Divorced": true,
    "Married": true,
    "Not Reported": true,
    "Separated": true,
    "Single": true,
    "Widower": true,
    "Others": true,
  });
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dataAvailable, setDataAvailable] = useState(true);

  const allCategories = [
    "Divorced",
    "Married",
    "Not Reported",
    "Separated",
    "Single",
    "Widower",
  ];

  const categoryColors = {
    "Divorced": "#8884d8",
    "Married": "#82ca9d",
    "Not Reported": "#ffc658",
    "Separated": "#ff7300",
    "Single": "#3498db",
    "Widower": "#8e44ad",
    "Others": "#A9A9A9",
  };

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
                Divorced: 0,
                Married: 0,
                "Not Reported": 0,
                Separated: 0,
                Single: 0,
                Widower: 0,
                Others: 0,
              };
            }

            return {
              year,
              Divorced: ((yearData["Divorced"] || 0) / total) * 100,
              Married: ((yearData["Married"] || 0) / total) * 100,
              "Not Reported": ((yearData["Not Reported"] || 0) / total) * 100,
              Separated: ((yearData["Separated"] || 0) / total) * 100,
              Single: ((yearData["Single"] || 0) / total) * 100,
              Widower: ((yearData["Widower"] || 0) / total) * 100,
              Others: (othersCount / total) * 100,
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
    setSelectedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
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

  const CustomTooltip = ({ payload, label }) => {
    if (payload && payload.length) {
      return (
        <div className="custom-tooltip tooltipCustom">
          <p>{`Year: ${label}`}</p>
          {payload.map((entry, index) => (
            <p key={`item-${index}`} style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value.toFixed(2)}%`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <p className="modifyCategoriesButton blueSectionButtons" onClick={handleShowModal}>
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

      <div className="blueSectionChart">
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
              <Tooltip content={<CustomTooltip />} />
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
    </div>
  );
};

export default CivilStatusStackedBarChart;
