// This file is intentionally empty - humanize functionality has been removed
import React from 'react';
import { Navigate } from 'react-router-dom';

// Placeholder that redirects to dashboard
const HumanizeText = () => {
  return <Navigate to="/dashboard" replace />;
};

export default HumanizeText;
