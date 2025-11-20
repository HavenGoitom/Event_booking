import React from "react";
import EventCard from "./EventCard.jsx";

export default function EventGrid({ events = [], onClick }) {
  const list = [...events].reverse(); // latest first (preserves external state)
  return (
    <div className="posts-flex">
      {list.map((e) => (
        <div key={e.id} className="post-card" onClick={() => onClick?.(e)}>
          <img src={e.imageURL} alt={e.name} />
          <h3 className="post-title">{e.name}</h3>
          <p className="post-desc">{e.description}</p>
          <div className="post-row">
            <p className="post-price">ETB {e.price}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
