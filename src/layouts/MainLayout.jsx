import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/NavBar";
import "./mainLayout.css";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'bootstrap-icons/font/bootstrap-icons.css';


export default function MainLayout() {
  return (
    <div className="app_container">
      <Navbar />
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
