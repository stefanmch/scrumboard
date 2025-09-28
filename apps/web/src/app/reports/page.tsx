export default function ReportsPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">📊 Reports & Analytics</h1>
        <p className="page-description">Track your team's performance and progress</p>
      </div>

      <div className="placeholder-content">
        <div className="placeholder-grid">
          <div className="placeholder-card">
            <h3>Velocity Chart</h3>
            <p>Sprint velocity trends over time</p>
          </div>
          <div className="placeholder-card">
            <h3>Burndown Chart</h3>
            <p>Current sprint burndown</p>
          </div>
          <div className="placeholder-card">
            <h3>Team Performance</h3>
            <p>Individual and team metrics</p>
          </div>
          <div className="placeholder-card">
            <h3>Sprint Reports</h3>
            <p>Detailed sprint analytics</p>
          </div>
        </div>
      </div>
    </div>
  );
}