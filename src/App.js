import React from 'react';
import './styles/App.css';
import RegistrationForm from './components/RegistrationForm';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>User Registration System</h1>
      </header>
      <main>
        <RegistrationForm />
      </main>
      <footer>
        <p>© {new Date().getFullYear()} User Registration System</p>
      </footer>
    </div>
  );
}

export default App;
