// src/components/EventCard.jsx
import React, { useMemo, useState } from "react";

const API_BASE = "https://arifochevents.onrender.com";

export default function EventCard({ event, onClick, onImageError }) {
  const title = event.name || event.title || "Untitled";

  // ✅ Use ONLY the backend-provided image. Prefer `url`, then common fallbacks. No placeholders.
  const imgSrc = useMemo(() => {
    let src =
      event.url ||                // prefer backend-returned final URL
      event.imageURL ||
      event.imageUrl ||
      event.image ||
      event.photo ||
      event.eventPhotoURL ||
      "";
    if (!src) return "";
    if (!/^https?:\/\//i.test(src)) {
      src = `${API_BASE}${src.startsWith("/") ? "" : "/"}${src}`;
    }
    return src;
  }, [event]);

  const [hideImg, setHideImg] = useState(false);

  return (
    <div className="event-card" onClick={() => onClick && onClick(event)}>
      {!hideImg && imgSrc ? (
        <img
          src={imgSrc}
          alt={title}
          className="event-img"
          onError={() => {
            setHideImg(true);
            if (typeof onImageError === "function") onImageError(event);
          }}
        />
      ) : null}
      <div className="content">
        <h3>{title}</h3>
        {/* (Organizer text intentionally hidden to avoid IDs/random strings) */}
      </div>
    </div>
  );
}
