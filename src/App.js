import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import RegistrationForm from './components/RegistrationForm';
import LoginForm from './components/LoginForm';
import Dashboard from './components/Dashboard';
import AiDetector from './components/AiDetector';
import TestConnectivity from './components/TestConnectivity';
import './styles/App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>Andikar AI</h1>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/register" element={<RegistrationForm />} />
            <Route path="/login" element={<LoginForm />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/ai-detector" element={<AiDetector />} />
            <Route path="/test-connectivity" element={<TestConnectivity />} />
          </Routes>
        </main>
        <footer>
          &copy; {new Date().getFullYear()} Andikar AI. All rights reserved.
        </footer>
      </div>
    </Router>
  );
}

export default App;