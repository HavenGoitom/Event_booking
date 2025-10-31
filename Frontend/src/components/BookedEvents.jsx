import React, { useEffect, useMemo, useState } from "react";
import EventCard from "./EventCard.jsx";
import "../pages/UserHome.css";

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
  const prof = readJson("userProfile");
  const out = [];

  if (prof?.email && typeof prof.email === "string") out.push(prof.email.trim());

  return [...new Set(out.filter(Boolean))];
}

async function callEventsMy(email, token) {
  const payload = { role: "user", email };
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
  // Get image from multiple possible sources
  let rawImageURL =
    ev.url ||
    ev.imageURL ||
    ev.imageUrl ||
    ev.image ||
    ev.photo ||
    ev.eventPhotoURL ||
    (ev.advertisment && ev.advertisment.advertisement_images) ||
    "";

  // Normalize image URL to full URL
  let imageURL = "";
  if (rawImageURL) {
    if (rawImageURL.startsWith("http://") || rawImageURL.startsWith("https://")) {
      imageURL = rawImageURL.replace(/^http:\/\//i, "https://");
    } else if (rawImageURL.startsWith("/uploads") || rawImageURL.startsWith("/")) {
      imageURL = `${API_BASE}${rawImageURL}`;
    } else {
      imageURL = `${API_BASE}/${rawImageURL}`;
    }
  }
  // If empty, EventCard will use placeholder

  // Get ticket info from transaction if available
  const transaction = ev.transactions?.[0];
  const ticketType = transaction?.ticketType || "normal";
  const quantity = transaction?.numberOfTicketsBought || 1;

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
      ev?.organiser?.name ||
      ev.organizerName ||
      ev.organiserName ||
      "Organizer",
    imageURL,
    date: ev.date || "",
    ticketType,
    quantity,
    transaction: transaction || null,
  };
}

export default function BookedEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = getToken();
  const role = (localStorage.getItem("role") || "").toLowerCase();
  const candidateEmails = useMemo(() => getCandidateEmails(), []);

  useEffect(() => {
    (async () => {
      if (!token) {
        setError("You're not signed in. Please sign in as a user.");
        setLoading(false);
        return;
      }
      if (role !== "user") {
        setError("Please sign in as a user to view booked events.");
        setLoading(false);
        return;
      }
      // If no email locally, fetch profile from backend
      let emails = candidateEmails.slice();
      if (!emails.length) {
        try {
          const res = await fetch(`${API_BASE}/profile`, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const profile = await res.json();
            if (profile?.email) emails = [profile.email];
          }
        } catch (e) {
          console.warn("Failed to fetch user profile from backend:", e);
        }
      }
      if (!emails.length) {
        setError("User email not found. Please sign in again.");
        setLoading(false);
        return;
      }

      console.log("Fetching booked events with:", { candidateEmails, role });

      setLoading(true);
      setError("");

      for (let i = 0; i < emails.length; i++) {
        const email = emails[i];
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
          setError(err.message || "Failed to fetch booked events.");
          setLoading(false);
          return;
        }
      }

      setError(
        "Backend rejected the provided emails. Please sign out and sign back in as a user."
      );
      setLoading(false);
    })();
  }, [token, role, candidateEmails]);

  return (
    <div className="user-home">
      <h1 style={{ marginTop: "100px", padding: "20px", color: "white" }}>My Booked Events</h1>
      {error ? (
        <p style={{ color: "red", padding: "20px" }}>❌ {error}</p>
      ) : loading ? (
        <p style={{ padding: "20px", color: "white" }}>Loading booked events...</p>
      ) : events.length === 0 ? (
        <p style={{ padding: "20px", color: "white" }}>You haven't booked any events yet.</p>
      ) : (
        <div className="event-grid">
          {events.map((e) => (
            <div key={e.id} style={{ position: "relative" }}>
              <EventCard event={e} />
              <div style={{
                position: "absolute",
                bottom: "10px",
                right: "10px",
                background: "rgba(0, 0, 0, 0.7)",
                color: "white",
                padding: "8px 12px",
                borderRadius: "8px",
                fontSize: "12px"
              }}>
                {e.quantity}x {e.ticketType?.toUpperCase() || "NORMAL"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

