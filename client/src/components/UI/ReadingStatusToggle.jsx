export const ReadingStatusToggle = ({ status, onChange }) => (
  <div className="status-toggle" role="radiogroup" aria-label="Reading status">
    <button
      type="button"
      id="status-btn-finished"
      className={`status-btn ${status === "finished" ? "active" : ""}`}
      onClick={() => onChange("finished")}
    >
      Finished
    </button>
    <button
      type="button"
      id="status-btn-reading"
      className={`status-btn ${status === "reading" ? "active" : ""}`}
      onClick={() => onChange("reading")}
    >
      Currently Reading
    </button>
    <button
      type="button"
      id="status-btn-want"
      className={`status-btn ${status === "want" ? "active" : ""}`}
      onClick={() => onChange("want")}
    >
      Want to Read
    </button>
  </div>
);
