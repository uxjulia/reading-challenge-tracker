export const CoverPicker = ({
  coverOptions,
  coverUrl,
  pageCount,
  statusMessage,
  statusClass,
  loadingCover,
  manualUrlOpen,
  onFetch,
  onSelectCover,
  onToggleManual,
  onManualUrlChange,
}) => (
  <div className="form-group cover-section">
    <label>Book Cover</label>
    <div className="cover-fetch-row">
      <button
        type="button"
        className="btn-secondary btn-sm"
        onClick={onFetch}
        disabled={loadingCover}
      >
        {loadingCover ? "Fetching..." : "Fetch Cover"}
      </button>
      <span className={`cover-status-text ${statusClass}`}>{statusMessage}</span>
    </div>

    {coverOptions.length > 0 && (
      <div className="cover-preview-area">
        <div className="cover-options" id="cover-options-container">
          {coverOptions.map((cover) => (
            <button
              type="button"
              key={cover.url}
              className={`cover-option ${coverUrl === cover.url ? "selected" : ""}`}
              onClick={() => onSelectCover(cover.url, cover.page_count)}
            >
              <div className="cover-option-img">
                <img src={cover.url} alt="Cover option" />
              </div>
              {cover.source && <span className="cover-source-badge">{cover.source}</span>}
            </button>
          ))}
        </div>
      </div>
    )}

    <div className="cover-manual-row">
      <button type="button" className="btn-link btn-sm" onClick={onToggleManual}>
        Enter image URL manually
      </button>
    </div>

    {manualUrlOpen && (
      <div id="cover-url-group" className="form-group">
        <label htmlFor="f-cover-url">Cover URL</label>
        <input
          type="url"
          id="f-cover-url"
          value={coverUrl}
          onChange={(e) => onManualUrlChange(e.target.value)}
          placeholder="https://..."
        />
      </div>
    )}
  </div>
);
