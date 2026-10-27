import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, Eye, Folder, Trash2, X } from "lucide-react";

export default function AccountantProfilePhotoActions({ photoUrl, name, subtitle, initials, onClose, onUpload, onCapture }) {
  const [mode, setMode] = useState("menu");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const captureLock = useRef(false);
  const dialog = useRef(null);
  const video = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
    return () => { document.body.style.overflow = overflow; previous?.focus?.(); };
  }, []);
  useEffect(() => {
    if (mode !== "camera") return;
    let cancelled = false, stream;
    setReady(false); setError("");
    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera capture is unavailable. Use Upload photo instead.");
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        if (cancelled) { stream.getTracks().forEach(track => track.stop()); return; }
        video.current.srcObject = stream;
        await video.current.play();
        if (!cancelled) setReady(true);
      } catch (failure) {
        stream?.getTracks().forEach(track => track.stop());
        if (!cancelled) setError(failure.name === "NotAllowedError" ? "Camera permission was denied. Allow camera access or use Upload photo." : failure.message || "Unable to start the camera.");
      }
    };
    start();
    return () => { cancelled = true; stream?.getTracks().forEach(track => track.stop()); };
  }, [mode, retry]);
  const capture = async () => {
    if (!ready || captureLock.current) return;
    captureLock.current = true; setCapturing(true);
    try {
      const source = video.current;
      if (!source?.videoWidth || !source?.videoHeight) throw new Error("Camera is not ready. Please try again.");
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 1600 / Math.max(source.videoWidth, source.videoHeight));
      canvas.width = Math.round(source.videoWidth * scale); canvas.height = Math.round(source.videoHeight * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Image capture is unavailable in this browser.");
      ctx.translate(canvas.width, 0); ctx.scale(-1, 1); ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error("Could not capture this photo.")), "image/jpeg", 0.95));
      if (!dialog.current?.open) return;
      onCapture(new File([blob], "camera.jpg", { type: "image/jpeg" }));
    } catch (failure) { setError(failure.message || "Could not capture this photo."); }
    finally { captureLock.current = false; setCapturing(false); }
  };
  return createPortal(<dialog ref={dialog} className={`acct-profile-photo-dialog acct-profile-photo-${mode}`} aria-labelledby="accountant-photo-actions-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <header><h2 id="accountant-photo-actions-title">{mode === "camera" ? "Take Profile Photo" : mode === "view" ? "Profile Photo Preview" : "Profile Photo"}</h2><button type="button" className="cms-action-btn" aria-label="Close photo options" onClick={onClose}><X size={16} /></button></header>
    {mode === "menu" && <><div className="acct-profile-photo-action-preview"><div className="acct-profile-photo-action-avatar">{photoUrl ? <img src={photoUrl} alt={name} /> : <span>{initials}</span>}</div><strong>{name}</strong><small>{subtitle}</small></div><div className="acct-profile-photo-action-menu">
      <button type="button" disabled={!photoUrl} onClick={() => setMode("view")}><Eye size={18} /> View photo</button>
      <button type="button" onClick={() => setMode("camera")}><Camera size={18} /> Take photo</button>
      <button type="button" onClick={() => { onClose(); onUpload(); }}><Folder size={18} /> Upload photo</button>
      <hr /><button type="button" className="acct-profile-photo-remove" disabled title="The existing backend has no profile-photo removal endpoint."><Trash2 size={18} /> Remove photo</button><p>Photo removal is unavailable through the current API.</p>
    </div></>}
    {mode === "view" && <><div className="acct-profile-photo-view">{photoUrl && <img src={photoUrl} alt={`${name} profile`} />}</div><footer><button type="button" className="cms-btn cms-btn-primary" onClick={() => { onClose(); onUpload(); }}>Change Photo</button><button type="button" className="cms-btn cms-btn-ghost" onClick={onClose}>Close</button></footer></>}
    {mode === "camera" && <><div className="acct-profile-camera-body"><video ref={video} autoPlay playsInline muted aria-label="Live camera preview" />{!error && <div className="acct-profile-camera-guide" />}{!ready && !error && <p role="status">Starting camera...</p>}{error && <div role="alert"><p>{error}</p><button type="button" className="cms-btn cms-btn-primary" onClick={() => setRetry(current => current + 1)}>Retry Camera</button></div>}</div><footer><button type="button" className="cms-btn cms-btn-ghost" onClick={onClose}>Cancel</button><button type="button" className="cms-btn cms-btn-primary" disabled={!ready || capturing || Boolean(error)} onClick={capture}><Camera size={15} /> {capturing ? "Capturing..." : "Capture Photo"}</button></footer></>}
  </dialog>, document.body);
}
