import React, { useState, useEffect, useRef } from "react";
import "./dataVisualization.css"; // import the CSS file
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'bootstrap-icons/font/bootstrap-icons.css';
import NumberOfEmigrants from '../components/NumberOfEmigrants'; 
import UnVsEmployed  from '../components/UnVsEmployed.jsx';
import EmployedDonutChart  from '../components/EmployedDonutChart.jsx'; 
import UnemployedDonutChart  from '../components/UnemployedDonutChart.jsx';
import EmployedLineChart  from '../components/EmployedLineChart.jsx';
import UnemployedLineChart  from '../components/UnemployedLineChart.jsx';
import EducationStackedBarChart  from '../components/EducationStackedBarChart.jsx'; 
import EducationLineChart  from '../components/EducationLineChart.jsx';
import CivilStatusStackedBarChart  from '../components/CivilStatusStackedBarChart.jsx';
import CivilStatusLineChart  from '../components/CivilStatusLineChart.jsx';
import SexGroupBarChart  from '../components/SexGroupBarChart.jsx'; 
import AgeLineChart  from '../components/AgeLineChart.jsx';
import AgeBarChart  from '../components/AgeBarChart.jsx';
//import PlaceOfOriginMap  from '../components/PlaceOfOriginMap.jsx'; 

export default function DataVisualization() {

  const [showModifyAgeRangeModal, setShowModifyAgeRangeModal] = useState(false);

  //DONUT CHART FOR OCCUPATION
  const [year, setYear] = useState(1981); // Default value of the slider

  const handleSliderChange = (event) => {
    setYear(event.target.value);
  };

  const handleInputChange = (event) => {
    const inputValue = event.target.value;
    if (!isNaN(inputValue) && inputValue >= 1981 && inputValue <= 2020) {
      setYear(inputValue);
    }
  };

  return (
    <>
      <div className="mainContainer">
        <div className="titleContainer">
          <h1 id="dataVisTitle">Pinoy Emigration Trends</h1>
          <p id="source">File Source: <a href="https://data.gov.ph/index/public/resource/commission-of-filipino-overseas:-statistical-profile-of-registered-filipino-emigrants-%5B1981-2020%5D-/number-of-registered-filipino-emigrants-by-place-of-origin-in-the-philippines:-1988-2020/w3fgcanp-4ci6-36uv-ny9r-pvq0dwlyxl9x" target="_blank">Open Data Philippines</a></p>
        </div>

        <div className="numberOfEmigrants">
          <p className="tableTitle">Number of Filipino Emigrants</p>
          <NumberOfEmigrants />
        </div>

        <p className="sectionDescription">This section highlights the provinces and regions that send the most Filipinos abroad and thier destinations showing how patterns have shifted over time.</p>

        <div className="originDestination">
          <div className="origin">
            <p className="tableTitle">Place of Origin in the Philippines</p>
            <div>
              {/*<PlaceOfOriginMap />*/}
            </div>
          </div>
          <div className="destination">
            <p className="tableTitle">Country of Destination</p>
          </div>
        </div>


        <div className="blueSection">
          <p className="sectionDescription pBlueSection" >Looking at the age, sex, and civil status of emigrants helps us understand who is leaving. This section breaks down the demographics of migration.</p>

          <div className="demographics">
            <div className="age">
              <p className="tableTitle pBlueSection">Age Group</p>
              
              <div className="age2">
                <div className="ageLineGraph">
                  <p className="tableTitle pBlueSection">Age Trend</p>
                  <AgeLineChart />
                </div>

                <div className="ageBarChart">
                  <p className="tableTitle pBlueSection">Distribution of Age per Year</p>
                  <AgeBarChart />
                </div>
              </div>
            </div>

            <div className="sex">
              <p className="tableTitle pBlueSection">Sex</p>
              <SexGroupBarChart />
            </div>

            <div className="civilStatus">
              <p className="tableTitle pBlueSection">Civil Status</p>
              <div className="age2">
                <div className="biggerChart">
                  <p className="tableTitle pBlueSection">Distribution of Civil Status Category</p>
                  <CivilStatusStackedBarChart />
                </div>

                <div className="smallerChart">
                  <p className="tableTitle pBlueSection">Trend of a Specific Civil Category</p>
                  <CivilStatusLineChart />
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="sectionDescription">Examining their education levels and occupations, helps us see what kind of talent the Philippines is sending abroad and what roles Filipinos fill in their host countries.</p>

        <div className="educationOccupation">
          <div className="education">
            <p className="tableTitle">Educational Attainment</p>
            <div className="age2">
              <div className="biggerChart">
                <p className="tableTitle">Distribution of Education Categories</p>
                <EducationStackedBarChart />
              </div>

              <div className="smallerChart">
                <p className="tableTitle">Trend of a Specific Education Category</p>
                <EducationLineChart />
              </div>
            </div>
          </div>
          <div className="occupation">
            <p className="tableTitle">Occupation</p>
            <p className="tableTitle">Employed vs Unemployed</p>
            <div className="UnVsEmployed">
              <UnVsEmployed />
            </div>
            <div className="age2">
              <div className="ageLineGraph">
                <p className="tableTitle">Distribution of Employed Emigrants</p>
                <span>Year: {year}</span> {/* Display the selected year */}
                <EmployedDonutChart year={year} />            
              </div>

              <div className="ageBarChart">
                <p className="tableTitle">Distribution of Unemployed Emigrants</p>
                <span>Year: {year}</span> {/* Display the selected year */}
                <UnemployedDonutChart year={year} />
              </div>
            </div>

            <div className="slider-container">
              <div className="slider-wrapper">
                <input
                  id="yearSlider"
                  type="range"
                  min={1981}
                  max={2020}
                  step={1}
                  value={year}
                  onChange={handleSliderChange}
                />
                <input
                  type="number"
                  value={year}
                  min={1981}
                  max={2020}
                  onChange={handleInputChange}
                  className="slider-input"
                />
              </div>
              <label htmlFor="yearSlider">Modify Year for the Donut Charts</label>
            </div>

            <div className="age2">
              <div className="ageLineGraph">
                <p className="tableTitle">Trend of a Specfic Employed Category</p>
                <EmployedLineChart />
              </div>

              <div className="ageBarChart">
                <p className="tableTitle">Trend of a Specfic Unemployed Category</p>
                <UnemployedLineChart />
              </div>
            </div>
          </div>
        </div>
      </div>

      {showModifyAgeRangeModal && (
        <>
          {/* Backdrop (Dimmed Background) */}
          <div className="modal-backdrop fade show" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1040 }}></div>

          {/* Modal */}
          <div className="modal" tabindex="-1" style={{ display: "block", zIndex: 1050 }}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Modify Age Range</h5>
                  <button type="button" className="btn-close" aria-label="Close" onClick={() => setShowModifyAgeRangeModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div class="input-group mb-3">
                    <label class="input-group-text" for="inputGroupSelect01">No. of Category</label>
                    <select class="form-select" id="inputGroupSelect01">
                      <option selected>Choose...</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                      <option value="6">6</option>
                      <option value="7">7</option>
                      <option value="8">8</option>
                      <option value="9">9</option>
                      <option value="10">10</option>
                      <option value="11">11</option>
                      <option value="12">12</option>
                      <option value="13">13</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModifyAgeRangeModal(false)}>Close</button>
                  <button type="button" className="btn btn-primary">Save</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    
    </>
  )
  
  
}
