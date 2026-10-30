import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ImagePlus, Save } from "lucide-react";
import DashboardLayout from "../layout/DashboardLayout.jsx";
import { useCampusContext } from "../../context/CampusContext.jsx";
import {
  campusImageFields,
  readCampusImages,
  saveCampusImages,
  readCampusImageFile,
} from "../../features/campusImages.js";
import defaultLogo from "../../assets/pirnav-colleges-logo.png";
import { campusContentDefaults, campusTextFields } from "../../features/campusContent.js";
import "./CampusImagesConfigurationPage.css";

export default function CampusImagesConfigurationPage({ page = "landing" }) {
  const title = page === "login" ? "Login Page Configuration" : "Landing Page Configuration";
  const imageFields = campusImageFields.filter(([slot]) =>
    page === "login"
      ? ["loginLogo", "loginImage"].includes(slot)
      : ["dashboardLogo", "headerLogo", "footerLogo", "heroImage"].includes(slot),
  );
  const textFields = campusTextFields[page];
  const { selectedCampusId, selectedCampus } = useCampusContext();
  const [images, setImages] = useState({});
  const [text, setText] = useState(campusContentDefaults);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const pageScope = `${selectedCampusId}:${page}`;
  const scope = useRef(pageScope);
  scope.current = pageScope;
  const uploadSequence = useRef({});
  const saveLock = useRef(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setImages({});
    setText(campusContentDefaults);
    setError("");
    setMessage("");
    setUploading(0);
    readCampusImages(selectedCampusId)
      .then((value) => {
        if (active) {
          setImages(value);
          setText({ ...campusContentDefaults, ...value });
        }
      })
      .catch((failure) => {
        if (active) setError(failure.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedCampusId, page]);
  const upload = async (slot, file) => {
    if (!file) return;
    const campus = pageScope;
    const sequence = (uploadSequence.current[slot] || 0) + 1;
    uploadSequence.current[slot] = sequence;
    setUploading((value) => value + 1);
    setError("");
    setMessage("");
    try {
      const src = await readCampusImageFile(file);
      if (scope.current === campus && uploadSequence.current[slot] === sequence)
        setImages((previous) => ({ ...previous, [slot]: src }));
    } catch (failure) {
      if (scope.current === campus && uploadSequence.current[slot] === sequence)
        setError(failure.message);
    } finally {
      if (scope.current === campus) setUploading((value) => Math.max(0, value - 1));
    }
  };
  const save = async () => {
    if (saveLock.current || uploading || loading) return;
    const campus = selectedCampusId;
    const activeScope = pageScope;
    if (textFields.some(([key, , type]) => !type && !text[key].trim())) {
      setError("Complete the required text fields before saving.");
      return;
    }
    saveLock.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const latest = await readCampusImages(campus);
      const next = { ...latest };
      imageFields.forEach(([slot]) => {
        if (images[slot]) next[slot] = images[slot];
        else delete next[slot];
      });
      textFields.forEach(([key]) => {
        next[key] = text[key].trim();
      });
      await saveCampusImages(campus, next);
      if (scope.current === activeScope)
        setMessage(`${title} saved in this browser. Open the page to see your changes.`);
    } catch (failure) {
      if (scope.current === activeScope) setError(failure.message);
    } finally {
      saveLock.current = false;
      setBusy(false);
    }
  };
  return (
    <DashboardLayout
      title={title}
      subtitle="Customize the college name, text, logos and images."
      breadcrumb={["Home", "Settings", title]}
    >
      <main className="campus-images-page">
        <Link className="cms-back-link" to="/dashboard/settings">
          <ArrowLeft size={15} /> Back to Settings
        </Link>
        <section className="campus-images-scope">
          <h2>
            <ImagePlus size={21} />{" "}
            {selectedCampus?.campusName || selectedCampus?.name || "Selected campus"}
          </h2>
          <p>
            PNG, JPEG, or WebP. Maximum 2 MB per image. Logo images work best with a transparent
            background.
          </p>
          <p>
            Text and images are saved for this campus in this browser. A backend API is required to
            share them across devices and users.
          </p>
          <Link
            to={page === "login" ? "/login" : "/"}
            target="_blank"
            rel="noopener noreferrer"
            className="cms-btn cms-btn-ghost"
          >
            Open {page === "login" ? "Login" : "Landing"} Page
          </Link>
        </section>
        {error && (
          <p className="campus-images-error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="campus-images-success" role="status">
            {message}
          </p>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          {!loading && (
            <section className="campus-images-scope">
              <h2>Page Text &amp; College Details</h2>
              <div className="campus-content-fields">
                {textFields.map(([key, label, type]) => (
                  <label key={key}>
                    {label}
                    {type === "textarea" ? (
                      <textarea
                        rows={3}
                        maxLength={1200}
                        disabled={busy}
                        value={text[key]}
                        onChange={(event) => {
                          setText((previous) => ({ ...previous, [key]: event.target.value }));
                          setMessage("");
                        }}
                      />
                    ) : (
                      <input
                        type={type || "text"}
                        required={!type}
                        maxLength={300}
                        disabled={busy}
                        value={text[key]}
                        onChange={(event) => {
                          setText((previous) => ({ ...previous, [key]: event.target.value }));
                          setMessage("");
                        }}
                      />
                    )}
                  </label>
                ))}
              </div>
            </section>
          )}
          {loading ? (
            <p role="status">Loading configuration...</p>
          ) : (
            <div className="campus-images-grid">
              {imageFields.map(([slot, title, description, kind]) => (
                <section className="campus-images-card" key={slot}>
                  <h2>{title}</h2>
                  <p>{description}</p>
                  <div className={`campus-images-preview ${kind}`}>
                    {images[slot] ? (
                      <img src={images[slot]} alt={`${title} preview`} />
                    ) : kind === "logo" ? (
                      <img src={defaultLogo} alt="Default college logo" />
                    ) : (
                      <span>Existing image slider will be used</span>
                    )}
                  </div>
                  <label className="campus-images-upload">
                    Choose {title}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      disabled={busy || !selectedCampusId}
                      onChange={(event) => {
                        upload(slot, event.target.files?.[0]);
                        event.target.value = "";
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    disabled={busy || !images[slot]}
                    onClick={() => {
                      uploadSequence.current[slot] = (uploadSequence.current[slot] || 0) + 1;
                      setImages((previous) => {
                        const next = { ...previous };
                        delete next[slot];
                        return next;
                      });
                      setMessage("");
                    }}
                  >
                    Restore default
                  </button>
                </section>
              ))}
            </div>
          )}
          <div className="campus-images-actions">
            <button
              type="submit"
              className="cms-btn cms-btn-primary"
              disabled={loading || busy || uploading > 0 || !selectedCampusId}
            >
              <Save size={16} />{" "}
              {busy ? "Saving..." : uploading ? "Reading images..." : "Save Configuration"}
            </button>
          </div>
        </form>
      </main>
    </DashboardLayout>
  );
}
