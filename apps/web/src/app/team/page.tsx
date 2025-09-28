export default function TeamPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">👥 Team Management</h1>
        <p className="page-description">Manage your team members and capacity</p>
      </div>

      <div className="placeholder-content">
        <div className="placeholder-card">
          <h2>Team Members</h2>
          <p>List of team members and their roles</p>
        </div>

        <div className="placeholder-grid">
          <div className="placeholder-card">
            <h3>Capacity Settings</h3>
            <p>Configure team member availability</p>
          </div>
          <div className="placeholder-card">
            <h3>Workload Distribution</h3>
            <p>Current workload per team member</p>
          </div>
        </div>
      </div>
    </div>
  );
}