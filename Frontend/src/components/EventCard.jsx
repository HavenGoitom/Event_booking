// src/components/EventCard.jsx
import React, { useMemo, useState } from "react";

const API_BASE = "https://arifochevents.onrender.com";
const PLACEHOLDER_IMAGE = "https://th.bing.com/th/id/OIP.cfk754kXI2-IKDc0lW5vUwHaHa?o=7rm=3&rs=1&pid=ImgDetMain&o=7&rm=3";

export default function EventCard({ event, onClick, onImageError }) {
  const title = event.name || event.title || "Untitled";
  const location = event.LocationOfEvent || event.location || "TBA";
  const date = event.date || "";

  // ✅ Use ONLY the backend-provided image. Prefer `url`, then common fallbacks. Add placeholder if missing.
  // Photos are stored in /uploads/eventPhoto/ and served statically - they persist as long as the server is running
  const imgSrc = useMemo(() => {
    let src =
      event.url ||                // prefer backend-returned final URL (already full URL from backend)
      event.imageURL ||
      event.imageUrl ||
      event.image ||
      event.photo ||
      event.eventPhotoURL ||
      event.advertisment?.advertisement_images ||
      "";
    
    if (!src) return PLACEHOLDER_IMAGE;
    
    // If it's already a full URL (http:// or https://), use it as is
    if (/^https?:\/\//i.test(src)) {
      return src;
    }
    
    // Handle relative paths - backend stores photos in /uploads/eventPhoto/
    if (src.startsWith("/uploads") || src.startsWith("/")) {
      // Already has leading slash, just prepend API_BASE
      src = `${API_BASE}${src}`;
    } else {
      // No leading slash, add it
      src = `${API_BASE}/${src}`;
    }
    
    return src;
  }, [event]);

  const [imgError, setImgError] = useState(false);

  // Always ensure we have an image source
  const finalImgSrc = imgError || !imgSrc || imgSrc === PLACEHOLDER_IMAGE ? PLACEHOLDER_IMAGE : imgSrc;

  return (
    <div className="event-card" onClick={() => onClick && onClick(event)}>
      <img
        src={finalImgSrc}
        alt={title}
        className="event-img"
        onError={() => {
          if (!imgError) {
            setImgError(true);
            if (typeof onImageError === "function") onImageError(event);
          }
        }}
      />
      <div className="content">
        <h3>{title}</h3>
        {location && location !== "TBA" && (
          <p className="event-location">📍 {location}</p>
        )}
        {date && (
          <p className="event-date">📅 {date}</p>
        )}
        {(event.priceNormal || event.priceVip) && (
          <p className="event-price">
            {event.priceNormal && <span>Normal: {event.priceNormal} ETB</span>}
            {event.priceNormal && event.priceVip && <span> • </span>}
            {event.priceVip && <span>VIP: {event.priceVip} ETB</span>}
          </p>
        )}
      </div>
    </div>
  );
}
