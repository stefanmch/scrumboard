export default function Home() {
  return (
    <div className="page-container">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Welcome to ScrumBoard</h1>
          <p className="dashboard-subtitle">Your agile project management dashboard</p>
        </div>
        <div className="dashboard-actions">
          <button className="btn btn-secondary">View Sprint</button>
          <button className="btn btn-primary">Plan Next Sprint</button>
        </div>
      </div>

      <div className="widget-grid widget-grid-3">
        <div className="widget-card">
          <div className="widget-header">
            <h3 className="widget-title">Current Sprint</h3>
            <span className="widget-icon">🚀</span>
          </div>
          <p className="widget-value">Sprint 23</p>
          <p className="widget-subtitle">4 days remaining</p>
          <div className="widget-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '77%' }}></div>
            </div>
          </div>
        </div>

        <div className="widget-card">
          <div className="widget-header">
            <h3 className="widget-title">Sprint Health</h3>
            <span className="widget-icon">💚</span>
          </div>
          <p className="widget-value">85%</p>
          <div className="status-indicator status-green">
            On Track
          </div>
        </div>

        <div className="widget-card">
          <div className="widget-header">
            <h3 className="widget-title">Team Capacity</h3>
            <span className="widget-icon">👥</span>
          </div>
          <p className="widget-value">78h / 120h</p>
          <p className="widget-subtitle">65% utilized</p>
        </div>
      </div>

      <div className="placeholder-content">
        <div className="placeholder-card">
          <h2>Recent Activity</h2>
          <p>Recent updates from your team will appear here</p>
        </div>

        <div className="placeholder-grid">
          <div className="placeholder-card">
            <h3>My Tasks</h3>
            <p>Your assigned tasks and stories</p>
          </div>
          <div className="placeholder-card">
            <h3>Blocked Items</h3>
            <p>Tasks that need attention</p>
          </div>
        </div>
      </div>
    </div>
  );
}
