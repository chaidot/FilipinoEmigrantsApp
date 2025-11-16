import React from "react";
import "./home.css";
import { NavLink } from "react-router-dom";

export default function Home() {
  return (
    <div className="homeMainContainer">
      {/* Hero Section */}
      <div className="heroSection">
        <div className="heroContent">
          <h1 className="heroTitle">Filipino Emigration Trends</h1>
          <p className="heroSubtitle">1981 - 2020</p>
          <p className="heroDescription">
            Exploring four decades of Filipino migration patterns through data
          </p>
        </div>

        {/* Data Preview Cards */}
        <div className="previewCards">
          {/* Card 1 - Demographics */}
          <div className="previewCard">
            <div className="cardIcon">
              <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="cardTitle">Demographics</h3>
            <p className="cardDescription">Age, sex, and civil status breakdown of Filipino emigrants</p>
          </div>

          {/* Card 2 - Destinations */}
          <div className="previewCard">
            <div className="cardIcon">
              <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="cardTitle">Global Destinations</h3>
            <p className="cardDescription">Top countries and regions where Filipinos emigrate</p>
          </div>

          {/* Card 3 - Occupations */}
          <div className="previewCard">
            <div className="cardIcon">
              <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="cardTitle">Education & Occupation</h3>
            <p className="cardDescription">Skills and professional profiles of Filipino emigrants</p>
          </div>
        </div>

        {/* CTA Button */}
        <NavLink to="/dataVisualization" className="ctaButton">
          <span className="buttonText">
            Explore Data Visualization
            <svg className="buttonArrow" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        </NavLink>

        {/* Data Source */}
        <p className="dataSource">
          Data Source: Commission on Filipinos Overseas (CFO)
        </p>
      </div>
    </div>
  );
}