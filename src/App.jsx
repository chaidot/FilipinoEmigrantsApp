import { BrowserRouter, Routes, Route } from "react-router-dom";
import React from "react";
import MainLayout from "./layouts/MainLayout";
import Home from "./pages/Home";
import Files from "./pages/Files";
import DataVisualization from "./pages/DataVisualization";
import Option2 from "./pages/Option2";
import ForecastPage from "./pages/ForecastPage"; // 🔮 import this

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Layout wrapper */}
        <Route path="/" element={<MainLayout />}>
          {/* / */}
          <Route index element={<Home />} />

          {/* /files */}
          <Route path="files" element={<Files />} />

          {/* /dataVisualization */}
          <Route path="dataVisualization" element={<DataVisualization />} />

          {/* /forecast */}
          <Route path="forecast" element={<ForecastPage />} />

          {/* /option2 */}
          <Route path="option2" element={<Option2 />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
