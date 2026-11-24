import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Pages
import DemoHubPage from './pages/DemoHubPage';
import CustomerPage from './pages/CustomerPage';
import WaiterPage from './pages/WaiterPage';
import KitchenPage from './pages/KitchenPage';
import AdminPage from './pages/AdminPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Launcher & Testing Hub */}
        <Route path="/" element={<DemoHubPage />} />

        {/* Customer Mobile Web Application */}
        <Route path="/t/:tableNumber" element={<CustomerPage />} />

        {/* Waiter & Cashier POS Dashboard */}
        <Route path="/waiter" element={<WaiterPage />} />

        {/* Kitchen Display System & 80mm Virtual Thermal Printer */}
        <Route path="/kitchen" element={<KitchenPage />} />

        {/* Mini Admin Panel */}
        <Route path="/admin" element={<AdminPage />} />

        {/* Fallback to Demo Hub */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
