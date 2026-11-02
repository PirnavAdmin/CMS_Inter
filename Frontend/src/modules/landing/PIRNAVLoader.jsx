import crest from "@/assets/pirnav-college-crest.png";
import "./PIRNAVLoader.css";

export default function PIRNAVLoader({ exiting = false }) {
  return (
    <div
      className={`pirnav-loader${exiting ? " is-exiting" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="Loading PIRNAV College"
      aria-busy="true"
    >
      <div className="pirnav-loader-content">
        <div className="pirnav-loader-crest-wrap">
          <div className="pirnav-loader-crest-frame">
            <img className="pirnav-loader-crest" src={crest} alt="PIRNAV College crest" />
            <div className="pirnav-loader-wordmark" aria-hidden="true">
              <span>PIRNAV</span>
              <strong>COLLEGE</strong>
            </div>
            <p className="pirnav-loader-tagline">Excellence in Education</p>
          </div>
          <svg className="pirnav-loader-ring" viewBox="0 0 100 100" aria-hidden="true">
            <circle className="pirnav-loader-ring-track" cx="50" cy="50" r="46" />
            <circle className="pirnav-loader-ring-progress" cx="50" cy="50" r="46" />
            <circle className="pirnav-loader-ring-progress is-secondary" cx="50" cy="50" r="46" />
          </svg>
        </div>
        <div className="pirnav-loader-progress" role="progressbar" aria-label="Loading landing page" aria-valuemin="0" aria-valuemax="100">
          <span />
        </div>
        <div className="pirnav-loader-dots" aria-hidden="true"><i /><i /><i /></div>
      </div>
    </div>
  );
}
