import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RotateCw, X, ZoomIn, ZoomOut } from "lucide-react";

// Local image editing only; the parent retains the existing authenticated upload.
export default function AccountantProfilePhotoEditor({ file, onApply, onClose }) {
  const dialog = useRef(null);
  const canvas = useRef(null);
  const image = useRef(null);
  const applying = useRef(false);
  const drag = useRef(null);
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { image.current = img; setReady(true); };
    img.onerror = () => setError("This image could not be opened. Choose another image.");
    img.src = url;
    return () => {
      img.onload = null; img.onerror = null;
      URL.revokeObjectURL(url);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [file]);

  useEffect(() => {
    if (!ready || !canvas.current || !image.current) return;
    const ctx = canvas.current.getContext("2d");
    if (!ctx) { setError("Image editing is unavailable in this browser."); return; }
    const img = image.current;
    const scale = Math.max(260 / img.width, 260 / img.height) * zoom;
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, 300, 300);
    ctx.save();
    ctx.translate(150 + panX, 150 + panY);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.scale(scale, scale);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.beginPath(); ctx.rect(0, 0, 300, 300); ctx.roundRect(30, 30, 240, 240, 20); ctx.fill("evenodd");
    ctx.beginPath(); ctx.roundRect(30, 30, 240, 240, 20); ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.stroke();
  }, [ready, zoom, rotation, panX, panY]);

  const apply = async () => {
    if (!ready || !canvas.current || applying.current) return;
    applying.current = true;
    setBusy(true);
    setError("");
    try {
      const output = document.createElement("canvas");
      output.width = 400; output.height = 400;
      const ctx = output.getContext("2d");
      if (!ctx) throw new Error("Image editing is unavailable in this browser.");
      const img = image.current, ratio = 400 / 240;
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, 400, 400);
      ctx.save(); ctx.translate(200 + panX * ratio, 200 + panY * ratio); ctx.rotate(rotation * Math.PI / 180);
      const scale = Math.max(260 / img.width, 260 / img.height) * zoom * ratio;
      ctx.scale(scale, scale); ctx.drawImage(img, -img.width / 2, -img.height / 2); ctx.restore();
      const blob = await new Promise((resolve, reject) => {
        output.toBlob(result => result ? resolve(result) : reject(new Error("Could not prepare this image.")), "image/jpeg", 0.92);
      });
      const photo = new File([blob], "profile.jpg", { type: "image/jpeg" });
      await onApply({ target: { files: [photo], value: "" } });
      onClose();
    } catch (failure) { setError(failure.message || "Could not prepare this image."); }
    finally { applying.current = false; setBusy(false); }
  };

  return createPortal(<dialog ref={dialog} className="acct-profile-photo-dialog" aria-labelledby="accountant-photo-title" onCancel={event => { event.preventDefault(); if (!applying.current) onClose(); }}>
    <header><h2 id="accountant-photo-title">Crop Profile Photo</h2><button type="button" className="cms-action-btn" aria-label="Close photo editor" disabled={busy} onClick={onClose}><X size={18} /></button></header>
    <div className="acct-profile-photo-editor-body">
      <p className="acct-profile-crop-instructions">Drag to reposition · Use zoom &amp; rotate to fit inside the frame</p>
      <canvas ref={canvas} width={300} height={300} aria-label="Profile photo crop preview; use arrow keys to reposition" tabIndex={0}
        onPointerDown={event => { if (!ready || busy) return; event.currentTarget.setPointerCapture(event.pointerId); drag.current = { x: event.clientX, y: event.clientY, panX, panY }; }}
        onPointerMove={event => { if (!drag.current || busy) return; const ratio = 300 / event.currentTarget.getBoundingClientRect().width; setPanX(drag.current.panX + (event.clientX - drag.current.x) * ratio); setPanY(drag.current.panY + (event.clientY - drag.current.y) * ratio); }}
        onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}
        onKeyDown={event => { if (busy || !ready || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return; event.preventDefault(); if (event.key === "ArrowLeft") setPanX(current => current - 5); if (event.key === "ArrowRight") setPanX(current => current + 5); if (event.key === "ArrowUp") setPanY(current => current - 5); if (event.key === "ArrowDown") setPanY(current => current + 5); }} />
      {!ready && !error && <p role="status">Loading image...</p>}
      <fieldset disabled={!ready || busy}>
        <div className="acct-profile-crop-zoom"><ZoomOut size={15} /><input aria-label="Zoom" id="accountant-photo-zoom" type="range" min="1" max="3" step="0.05" value={zoom} onChange={event => setZoom(Number(event.target.value))} /><ZoomIn size={15} /></div>
        <div className="acct-profile-crop-controls"><button type="button" className="cms-btn cms-btn-ghost" onClick={() => setRotation(current => (current + 90) % 360)}><RotateCw size={14} /> Rotate</button><button type="button" className="cms-btn cms-btn-ghost" onClick={() => { setZoom(1); setRotation(0); setPanX(0); setPanY(0); }}>Reset</button></div>
      </fieldset>
      {error && <p className="acct-profile-error" role="alert">{error}</p>}
    </div>
    <footer><button type="button" className="cms-btn cms-btn-ghost" disabled={busy} onClick={onClose}>Cancel</button><button type="button" className="cms-btn cms-btn-primary" disabled={!ready || busy} onClick={apply}>{busy ? "Uploading..." : "Save Photo"}</button></footer>
  </dialog>, document.body);
}
