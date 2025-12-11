import React from "react";
import { FaBars, FaTimes } from "react-icons/fa";
import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import "./components.css"; // import the CSS file
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

export default function Sidebar({ currentPage }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
      case "/forecast":               // 🔮 NEW
        setPageName("Forecast");
        break;
      case "/option2":
        setPageName("Option 2");
        break;
      default:
        setPageName("Unknown");
    }
  }, [location.pathname]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <>
      {/* Top bar with hamburger and page title */}
      <header className="topbar-new">
        <button onClick={toggleSidebar} className="hamburger-btn">
          <FaBars />
        </button>
        <h1 className="page-title-new">{pageName}</h1>
      </header>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar}></div>
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-title">Menu</h2>
          <button onClick={toggleSidebar} className="close-btn">
            <FaTimes />
          </button>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
            onClick={closeSidebar}
          >
            <i className="bi bi-house-door sidebar-icon"></i>
            <span>Home</span>
          </NavLink>

          <NavLink
            to="/files"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
            onClick={closeSidebar}
          >
            <i className="bi bi-archive sidebar-icon"></i>
            <span>Data Management</span>
          </NavLink>

          <NavLink
            to="/dataVisualization"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
            onClick={closeSidebar}
          >
            <i className="bi bi-file-bar-graph sidebar-icon"></i>
            <span>Data Visualization</span>
          </NavLink>

          {/* 🔮 NEW: Forecasting link */}
          <NavLink
            to="/forecast"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
            onClick={closeSidebar}
          >
            <i className="bi bi-graph-up-arrow sidebar-icon"></i>
            <span>Forecasting</span>
          </NavLink>
        </nav>
      </aside>
    </>
  );
}
