import { useEffect, useState } from "react";
import PIRNAVLoader from "./PIRNAVLoader.jsx";
import { PublicWebsitePage } from "./PublicWebsitePages.jsx";

const LANDING_INTRO_KEY = "pirnav-landing-intro-document";
const DOCUMENT_KEY = String(Math.round(window.performance?.timeOrigin || Date.now()));
let landingIntroStartedInThisDocument = false;

function shouldShowLandingIntro() {
  if (typeof window !== "undefined" && window.location.hash && window.location.hash !== "#" && window.location.hash !== "#home") {
    return false;
  }
  if (landingIntroStartedInThisDocument) return false;
  try {
    return window.sessionStorage.getItem(LANDING_INTRO_KEY) !== DOCUMENT_KEY;
  } catch {
    return true;
  }
}

export default function LandingPage() {
  const [showIntro, setShowIntro] = useState(shouldShowLandingIntro);
  const [introExiting, setIntroExiting] = useState(false);

  useEffect(() => {
    if (!showIntro) return undefined;
    landingIntroStartedInThisDocument = true;
    try {
      window.sessionStorage.setItem(LANDING_INTRO_KEY, DOCUMENT_KEY);
    } catch {
      // The loader still completes normally when session storage is unavailable.
    }
    const exitTimer = window.setTimeout(() => setIntroExiting(true), 2000);
    const removeTimer = window.setTimeout(() => setShowIntro(false), 2350);
    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(removeTimer);
    };
  }, [showIntro]);

  return <><PublicWebsitePage page="home" disabled={showIntro} />{showIntro ? <PIRNAVLoader exiting={introExiting} /> : null}</>;
}
