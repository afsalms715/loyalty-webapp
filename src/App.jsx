import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ShopDashboard from './pages/ShopDashboard';
import CustomerView from './pages/CustomerView';
import Login from './pages/Login';
import RegisterCustomer from './pages/RegisterCustomer';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[var(--bg-base)] flex flex-col justify-start">
        <Routes>
          {/* Shop Owner Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<ShopDashboard />} />
          
          {/* Customer Routes */}
          <Route path="/join/:shopId" element={<RegisterCustomer />} />
          <Route path="/loyalty/:shopId" element={<CustomerView />} />
          
          {/* Default Route */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
