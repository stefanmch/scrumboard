export default function SettingsPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">⚙️ Settings</h1>
        <p className="page-description">Configure your workspace and preferences</p>
      </div>

      <div className="placeholder-content">
        <div className="placeholder-grid">
          <div className="placeholder-card">
            <h3>User Profile</h3>
            <p>Personal information and preferences</p>
          </div>
          <div className="placeholder-card">
            <h3>Team Settings</h3>
            <p>Team configuration and permissions</p>
          </div>
          <div className="placeholder-card">
            <h3>Notifications</h3>
            <p>Notification preferences and channels</p>
          </div>
          <div className="placeholder-card">
            <h3>Integrations</h3>
            <p>Connect with external tools</p>
          </div>
        </div>
      </div>
    </div>
  );
}