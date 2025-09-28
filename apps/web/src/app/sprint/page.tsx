export default function SprintPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">🚀 Active Sprint</h1>
        <p className="page-description">Sprint 23 - Improve user authentication</p>
      </div>

      <div className="placeholder-content">
        <div className="placeholder-card">
          <h2>Sprint Board</h2>
          <p>Kanban board view will be displayed here</p>
        </div>

        <div className="placeholder-grid">
          <div className="placeholder-card">
            <h3>Sprint Health</h3>
            <p>Sprint metrics and health indicators</p>
          </div>
          <div className="placeholder-card">
            <h3>Burndown Chart</h3>
            <p>Sprint progress visualization</p>
          </div>
        </div>
      </div>
    </div>
  );
}