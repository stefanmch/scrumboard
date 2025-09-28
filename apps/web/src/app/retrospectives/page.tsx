export default function RetrospectivesPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">🔄 Retrospectives</h1>
        <p className="page-description">Continuous improvement through team retrospectives</p>
      </div>

      <div className="placeholder-content">
        <div className="placeholder-card">
          <h2>Lightning Decision Jam</h2>
          <p>Structured retrospective workflow for quick decision making</p>
        </div>

        <div className="placeholder-grid">
          <div className="placeholder-card">
            <h3>Action Items</h3>
            <p>Track and manage improvement actions</p>
          </div>
          <div className="placeholder-card">
            <h3>Retrospective History</h3>
            <p>Past retrospectives and outcomes</p>
          </div>
        </div>
      </div>
    </div>
  );
}