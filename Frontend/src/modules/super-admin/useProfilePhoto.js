import { useCallback, useEffect, useState } from "react";

const key = "sa-profile-photo";
const eventName = "super-admin-profile-photo-changed";
export default function useProfilePhoto() {
  const [photo, setPhoto] = useState(() => localStorage.getItem(key) || "");
  useEffect(() => {
    const sync = () => setPhoto(localStorage.getItem(key) || "");
    window.addEventListener(eventName, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(eventName, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const updatePhoto = useCallback((value) => {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
    setPhoto(value || "");
    window.dispatchEvent(new Event(eventName));
  }, []);
  return [photo, updatePhoto];
}
