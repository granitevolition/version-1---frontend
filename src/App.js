import React, { useState } from 'react';
import './styles/App.css';
import RegistrationForm from './components/RegistrationForm';
import TestConnectivity from './components/TestConnectivity';

function App() {
  const [view, setView] = useState('registration'); // 'registration' or 'test'
  
  return (
    <div className="App">
      <header className="App-header">
        <h1>User Registration System</h1>
        <div className="nav-links">
          <button 
            onClick={() => setView('registration')}
            className={view === 'registration' ? 'active' : ''}
          >
            Registration
          </button>
          <button 
            onClick={() => setView('test')}
            className={view === 'test' ? 'active' : ''}
          >
            API Test
          </button>
        </div>
      </header>
      
      <main>
        {view === 'registration' ? (
          <RegistrationForm />
        ) : (
          <TestConnectivity />
        )}
      </main>
      
      <footer>
        <p>© {new Date().getFullYear()} User Registration System</p>
      </footer>
    </div>
  );
}

export default App;
