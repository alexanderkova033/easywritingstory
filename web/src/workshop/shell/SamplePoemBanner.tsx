import "./SamplePoemBanner.css";

export function SamplePoemBanner({
  onClear,
  onKeep,
}: {
  onClear: () => void;
  onKeep: () => void;
}) {
  return (
    <div className="sample-banner" role="status">
      <span className="sample-banner-icon" aria-hidden>✦</span>
      <p className="sample-banner-text">
        <strong>This is a sample story opening</strong> — explore the live analysis on the right, then start your own.
      </p>
      <div className="sample-banner-actions">
        <button type="button" className="sample-banner-btn sample-banner-btn-clear" onClick={onClear}>
          Clear &amp; start fresh
        </button>
        <button type="button" className="sample-banner-btn sample-banner-btn-keep" onClick={onKeep}>
          Keep it
        </button>
      </div>
    </div>
  );
}
