import React, { useState, useEffect } from 'react';
import { getHumanizeStats } from '../services/humanizeApi';
import '../styles/HumanizeStats.css';

const HumanizeStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError('');
      
      const data = await getHumanizeStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load humanize statistics:', err);
      setError('Failed to load usage statistics. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="humanize-stats-container loading">
        <div className="loading-spinner">Loading statistics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="humanize-stats-container error">
        <div className="error-message">{error}</div>
        <button onClick={fetchStats} className="retry-button">Retry</button>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="humanize-stats-container empty">
        <p>No usage statistics available.</p>
      </div>
    );
  }

  // Calculate percentage of daily limit used
  const usagePercentage = stats.limits.daily_limit 
    ? Math.min(100, Math.round((stats.today_uses / stats.limits.daily_limit) * 100)) 
    : 0;

  // Format date for last used
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      dateStyle: 'medium', 
      timeStyle: 'short' 
    }).format(date);
  };

  return (
    <div className="humanize-stats-container">
      <h2>Text Humanization Stats</h2>
      
      <div className="stats-cards">
        <div className="stats-card">
          <div className="stats-card-title">Daily Usage</div>
          <div className="stats-card-content">
            <div className="usage-meter">
              <div 
                className="usage-bar" 
                style={{ 
                  width: `${usagePercentage}%`,
                  backgroundColor: usagePercentage > 80 
                    ? '#e74c3c' 
                    : usagePercentage > 50 
                      ? '#f39c12' 
                      : '#2ecc71'
                }}
              />
            </div>
            <div className="usage-info">
              <span>{stats.today_uses} of {stats.limits.daily_limit}</span>
              <span>{usagePercentage}% used</span>
            </div>
          </div>
        </div>
        
        <div className="stats-card">
          <div className="stats-card-title">Lifetime Stats</div>
          <div className="stats-card-content">
            <div className="stat-row">
              <span className="stat-label">Total Uses:</span>
              <span className="stat-value">{stats.usage.total_uses || 0}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Characters Processed:</span>
              <span className="stat-value">{stats.usage.total_characters?.toLocaleString() || 0}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Average AI Score:</span>
              <span className="stat-value">
                {stats.usage.avg_ai_score 
                  ? `${Math.round(stats.usage.avg_ai_score)}%` 
                  : 'N/A'}
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Last Used:</span>
              <span className="stat-value">{formatDate(stats.usage.last_used_at)}</span>
            </div>
          </div>
        </div>
        
        <div className="stats-card">
          <div className="stats-card-title">Plan Limits</div>
          <div className="stats-card-content">
            <div className="stat-row">
              <span className="stat-label">Daily Usage Limit:</span>
              <span className="stat-value">{stats.limits.daily_limit} texts</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Max Text Length:</span>
              <span className="stat-value">{stats.limits.max_text_length?.toLocaleString() || 0} characters</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HumanizeStats;
