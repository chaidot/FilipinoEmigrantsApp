import React from "react";
import { FaBars, FaUserCircle } from "react-icons/fa";
import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import "./components.css"; // import the CSS file
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'bootstrap-icons/font/bootstrap-icons.css';

export default function Topbar({ currentPage }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const location = useLocation();
  const [pageName, setPageName] = useState("Home");

  useEffect(() => {
    switch (location.pathname) {
      case "/":
        setPageName("Home");
        break;
      case "/files":
        setPageName("Files");
        break;
      case "/dataVisualization":
        setPageName("Data Visualization");
        break;
      case "/option2":
        setPageName("Option 2");
        break;
      default:
        setPageName("Unknown");
    }
  }, [location.pathname]);


  return (
    <header className="topbar">
      {/* Left - Menu */}
      <div className="menu-container">
        <div className="dropdown">
            <button
                onClick={() => setMenuOpen((prev) => !prev)}
                className="icon-btn" type="button" data-bs-toggle="dropdown" aria-expanded="false"
            >
            <FaBars className="option"/>
            </button>

            <ul className="dropdown-menu">
                <li className="menuOptions">
                <NavLink to="/" className="dropdown-item nav-link-custom menuOptionContainer" onClick={() => {setMenuOpen(false), setPageName("Home")}}>
                  <i class="bi bi-house-door menuName"></i>
                  Home
                </NavLink>
                </li>
                <li className="menuOptions">
                <NavLink to="/files" className="dropdown-item nav-link-custom menuOptionContainer" onClick={() => {setMenuOpen(false), setPageName("Files")}}>
                  <i class="bi bi-archive menuName"></i>
                    Files
                </NavLink>
                </li>
                <li className="menuOptions">
                <NavLink to="/dataVisualization" className="dropdown-item nav-link-custom menuOptionContainer" onClick={() => {setMenuOpen(false), setPageName("Data Visualization")}}>
                  <i class="bi bi-file-bar-graph menuName"></i>
                    Data Visualization
                </NavLink>
                </li>
                {/*
                <li className="menuOptions">
                <NavLink to="/option2" className="dropdown-item nav-link-custom" onClick={() => setMenuOpen(false)}>
                    Option 2
                </NavLink>
                </li>
                */}
            </ul>
        </div>
        

        <p id="pageName">{pageName}</p>

      </div>
      {/* Right - Profile 
      <div id="profile" className="menu-container">
        <FaUserCircle />
      </div>
      */}
    </header>
  );
}
