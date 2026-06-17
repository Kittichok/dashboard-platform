import { BrowserRouter, Route, Routes } from "react-router-dom";

import { DashboardLibrary } from "./dashboard/DashboardLibrary";
import { DashboardEditor } from "./widget/DashboardEditor";
import "./styles.css";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/dashboards/:id" element={<DashboardEditor />} />
        <Route path="*" element={<DashboardLibrary />} />
      </Routes>
    </BrowserRouter>
  );
}
