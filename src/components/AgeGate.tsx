"use client";
import { useEffect, useState } from "react";

export default function AgeGate() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem("age-verified")) setShow(true);
    } catch {
      setShow(true);
    }
  }, []);
  if (!show) return null;
  const enter = () => {
    try { localStorage.setItem("age-verified", "1"); } catch { /* ignore */ }
    setShow(false);
  };
  return (
    <div className="agegate-overlay" role="dialog" aria-modal="true" aria-label="Age verification">
      <div className="agegate-box">
        <div className="agegate-badge">18+</div>
        <h2>Adults Only</h2>
        <p>This website contains sexually explicit material. You must be 18 years of age or older (or the age of majority in your jurisdiction) to enter.</p>
        <button className="agegate-enter" onClick={enter}>I am 18 or older — Enter</button>
        <a className="agegate-exit" href="https://www.google.com">Exit</a>
      </div>
    </div>
  );
}
