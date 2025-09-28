export default function PlanningPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">📋 Sprint Planning</h1>
        <p className="page-description">Plan your next sprint with the team</p>
      </div>

      <div className="placeholder-content">
        <div className="placeholder-card">
          <h2>Sprint Setup</h2>
          <p>Configure sprint dates, goals, and capacity</p>
        </div>

        <div className="placeholder-grid">
          <div className="placeholder-card">
            <h3>Story Selection</h3>
            <p>Select stories for the upcoming sprint</p>
          </div>
          <div className="placeholder-card">
            <h3>Capacity Planning</h3>
            <p>Team capacity and workload distribution</p>
          </div>
        </div>
      </div>
    </div>
  );
}