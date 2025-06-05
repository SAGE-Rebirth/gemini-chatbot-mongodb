import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from 'react-router-dom';
import ChatPage from './pages/ChatPage';
import AdminPage from './pages/AdminPage';
import './App.css';

const App: React.FC = () => {
  return (
    <Router>
      <nav className="navbar">
        <Link to="/chat">Chat</Link>
        <Link to="/admin">Admin</Link>
      </nav>
      <div className="main-content">
        <Routes>
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/chat" replace />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
