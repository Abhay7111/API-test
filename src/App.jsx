import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ApiTester from './ApiTester.jsx';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ApiTester />} />
        {/* Redirect any unknown routes to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App
