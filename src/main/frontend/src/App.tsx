import { BrowserRouter, Route, Routes } from "react-router-dom";

import { DataSourceLibrary } from "./data-source/DataSourceLibrary";
import { DashboardLibrary } from "./dashboard/DashboardLibrary";
import { NavCollapseProvider } from "./dashboard/NavCollapseContext";
import { DashboardEditor } from "./widget/DashboardEditor";
import { DashboardViewer } from "./widget/DashboardViewer";
import "./styles.css";

export function App() {
  return (
    <NavCollapseProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/data-sources" element={<DataSourceLibrary />} />
          <Route path="/dashboards/:id/view" element={<DashboardViewer />} />
          <Route path="/dashboards/:id" element={<DashboardEditor />} />
          <Route path="*" element={<DashboardLibrary />} />
        </Routes>
      </BrowserRouter>
    </NavCollapseProvider>
  );
}
