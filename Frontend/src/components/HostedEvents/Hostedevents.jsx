import React, { useEffect, useMemo, useState } from "react";
import EventCard from "../EventCard.jsx";
import "../../pages/OrganizerHome.css";

const API_BASE = "https://arifochevents.onrender.com";

function getToken() {
  return localStorage.getItem("accessToken") || "";
}

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function getCandidateEmails() {
  const org = readJson("organizer");
  const prof = readJson("userProfile");
  const out = [];

  if (org?.email && typeof org.email === "string") out.push(org.email.trim());
  if (prof?.email && typeof prof.email === "string") out.push(prof.email.trim());

  return [...new Set(out.filter(Boolean))];
}

async function callEventsMy(email, token) {
  const payload = { role: "org", email };
  const res = await fetch(`${API_BASE}/events/my`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Backend returned non-JSON (status ${res.status})`);
  }

  if (!res.ok) {
    const msg = json?.message || json?.error || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }

  return Array.isArray(json) ? json : json.events || json.data || [];
}

function normalizeEvent(ev, idx) {
  const imageURL =
    ev.url ||
    ev.imageURL ||
    ev.imageUrl ||
    ev.image ||
    ev.photo ||
    ev.eventPhotoURL ||
    (ev.advertisment && ev.advertisment.advertisement_images) ||
    "";

  return {
    id: ev.id || ev._id || String(idx),
    name: ev.name || "Untitled Event",
    description: ev.description || "",
    LocationOfEvent: ev.LocationOfEvent || ev.location || "TBA",
    AvailableTicketsNormal: ev.AvailableTicketsNormal ?? ev.availableNormal ?? 0,
    AvailableTicketsVip: ev.AvailableTicketsVip ?? ev.availableVip ?? 0,
    priceNormal: ev.priceNormal ?? 0,
    priceVip: ev.priceVip ?? 0,
    organizerName:
      ev.organizerName ||
      ev.organiserName ||
      ev.organiserId ||
      ev.organizerId ||
      "Organizer",
    imageURL,
  };
}

export default function HostedEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = getToken();
  const role = (localStorage.getItem("role") || "").toLowerCase();
  const candidateEmails = useMemo(() => getCandidateEmails(), []);

  useEffect(() => {
    (async () => {
      if (!token) {
        setError("You're not signed in. Please sign in as an organizer.");
        setLoading(false);
        return;
      }
      if (role !== "org") {
        setError("Please sign in as an organizer to view hosted events.");
        setLoading(false);
        return;
      }
      if (!candidateEmails.length) {
        setError("Organizer email not found locally. Please sign in again.");
        setLoading(false);
        return;
      }

      console.log("Fetching hosted events with:", { candidateEmails, role });

      setLoading(true);
      setError("");

      for (let i = 0; i < candidateEmails.length; i++) {
        const email = candidateEmails[i];
        try {
          console.log(`Trying to fetch events for email: ${email}`);
          const list = await callEventsMy(email, token);
          console.log(`Received ${list.length} events from backend`);
          const normalized = list.map(normalizeEvent).reverse();
          setEvents(normalized);
          setLoading(false);
          return;
        } catch (err) {
          console.error(`Error fetching events for ${email}:`, err);
          if (/email\s+is\s+not\s+correct/i.test(err?.message || "")) continue;
          setError(err.message || "Failed to fetch hosted events.");
          setLoading(false);
          return;
        }
      }

      setError(
        "Backend rejected the provided emails. Please sign out and sign back in as the organizer."
      );
      setLoading(false);
    })();
  }, [token, role, candidateEmails]);

  return (
    <div className="organizer-home">
      <h1>Your Hosted Events</h1>
      {error ? (
        <p style={{ color: "red" }}>❌ {error}</p>
      ) : loading ? (
        <p>Loading hosted events...</p>
      ) : events.length === 0 ? (
        <p>You haven't hosted any events yet.</p>
      ) : (
        <div className="event-grid">
          {events.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      )}
    </div>
  );
}
