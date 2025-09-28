export default function BacklogPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">📚 Product Backlog</h1>
        <p className="page-description">Manage and refine your user stories</p>
      </div>

      <div className="placeholder-content">
        <div className="placeholder-card">
          <h2>Story List</h2>
          <p>Prioritized list of user stories will appear here</p>
        </div>

        <div className="placeholder-grid">
          <div className="placeholder-card">
            <h3>Epic Breakdown</h3>
            <p>Hierarchical view of epics and stories</p>
          </div>
          <div className="placeholder-card">
            <h3>Refinement Queue</h3>
            <p>Stories that need refinement</p>
          </div>
        </div>
      </div>
    </div>
  );
}