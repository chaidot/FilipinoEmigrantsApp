import React from "react";
import "./home.css";
import { NavLink } from "react-router-dom";

export default function Home() {
  return (
    <>
      <div className="mainContainer">
        <div className="container1">
          <h1 id="title">Pinoy Emigration Trends</h1>
          <p id="p1">Overseas Filipino Workers (OFWs) are modern-day heroes whose sacrifices uplift families and strengthen the nation. Through their work abroad, they not only sustain households and fuel the economy but also embody resilience, dedication, and the enduring spirit of the Philippines.</p>
          
        </div>
        <div className="container2">
          <p id="p2">This site visualizes four decades of Filipino emigration (1981–2020), turning official data into clear insights on migrant profiles and global destinations. Understanding these patterns honors the contributions of OFWs while helping shape better policies, guide development, and deepen awareness of migration’s role in the country’s future.</p>
          
        </div>
        <div className="container3">
          <NavLink to="/dataVisualization" id="datavizBtn">
              Data Visualization
          </NavLink>
          
        </div>
      </div>
    </>
  )
  
}
