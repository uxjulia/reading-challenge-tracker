import { useState, useEffect } from "react";
import { Pencil } from "lucide-react";
import { apiFetch } from "../../utils/apiFetch";

export const StatsBar = ({
  stats,
  goal,
  pace,
  readingPace,
  year,
  isAuthenticated,
  onAddBook,
  onGoalSaved,
}) => {
  const [goalEditing, setGoalEditing] = useState(false);
  const [goalDraft, setGoalDraft] = useState(goal ?? "");

  useEffect(() => {
    if (!goalEditing) setGoalDraft(goal ?? "");
  }, [goal, goalEditing]);

  async function saveGoal() {
    const parsed = goalDraft === "" ? 0 : Number(goalDraft);
    if (!Number.isInteger(parsed) || parsed < 0) {
      setGoalDraft(goal ?? "");
      setGoalEditing(false);
      return;
    }
    await apiFetch(`/api/goal/${year}`, {
      method: "PUT",
      body: JSON.stringify({ goal: parsed }),
    });
    setGoalEditing(false);
    onGoalSaved();
  }

  return (
    <>
      <div className="top-bar">
        <div className="add-book-bar">
          {isAuthenticated && (
            <button className="btn-primary" id="add-book-btn" onClick={onAddBook}>
              + Add Book
            </button>
          )}
        </div>

        <div className="stats-bar gap">
          <div className="stats-left gap">
            <span className="stat">
              {stats.count}
              {goalEditing || goal !== null ? (
                <>
                  {" "}
                  /{" "}
                  {goalEditing ? (
                    <input
                      type="number"
                      className="goal-input"
                      min="0"
                      max="9999"
                      value={goalDraft}
                      onChange={(e) => setGoalDraft(e.target.value)}
                      onBlur={saveGoal}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.currentTarget.blur();
                        }
                        if (e.key === "Escape") {
                          setGoalDraft(goal ?? "");
                          setGoalEditing(false);
                        }
                      }}
                      autoFocus
                    />
                  ) : (
                    <span id="goal-display">{goal}</span>
                  )}
                </>
              ) : null}{" "}
              book{stats.count === 1 ? "" : "s"} read
              {isAuthenticated && !goalEditing && (
                <button
                  className="btn-goal-edit btn-icon"
                  onClick={() => setGoalEditing(true)}
                >
                  <Pencil size={14} />
                </button>
              )}
            </span>

            {stats.avg_rating && (
              <>
                <span className="stat-bullet-point">•</span>
                <span className="stat">
                  {Number(stats.avg_rating).toFixed(1)} avg rating
                </span>
              </>
            )}
          </div>

          <div className="stats-right gap">
            {stats.total_pages > 0 && (
              <>
                <span className="stat-bullet-point">•</span>
                <span className="stat">{stats.total_pages.toLocaleString()} pages read</span>
              </>
            )}
            {readingPace && (
              <>
                <span className="stat-bullet-point">•</span>
                <span className="stat">{readingPace}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {pace && (
        <>
          <div
            className="goal-progress-bar"
            role="progressbar"
            aria-valuenow={stats.count}
            aria-valuemin={0}
            aria-valuemax={goal}
          >
            <div className="goal-progress-fill" style={{ width: `${pace.pct}%` }} />
          </div>
          <div className="goal-pace-info">
            <span className="pace-pct">{pace.pct}% complete</span>
            {pace.message && (
              <span className={`pace-message pace-${pace.sentiment}`}>{pace.message}</span>
            )}
            {pace.books_remaining > 0 && (
              <span className="pace-remaining">{pace.books_remaining} to go</span>
            )}
          </div>
        </>
      )}
    </>
  );
};
