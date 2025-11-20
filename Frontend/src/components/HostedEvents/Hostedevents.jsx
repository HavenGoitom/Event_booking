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
      // If we don't have an email locally, try fetching profile from backend
      let emails = candidateEmails.slice();
      if (!emails.length) {
        try {
          const res = await fetch(`${API_BASE}/profile`, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const profile = await res.json();
            if (profile?.email) {
              emails = [profile.email];
            }
          }
        } catch (e) {
          console.warn("Failed to fetch organizer profile from backend:", e);
        }
      }
      if (!emails.length) {
        setError("Organizer email not found. Please sign in again.");
        setLoading(false);
        return;
      }

      console.log("Fetching hosted events with:", { candidateEmails, role });

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

  const organizer = useMemo(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("organizer") || "null") ||
        JSON.parse(localStorage.getItem("userProfile") || "null") ||
        null
      );
    } catch {
      return null;
    }
  }, []);

  return (
    <div className="organizer-home">
      <div style={{ marginTop: "80px", padding: "20px" }}>
        <h1 style={{ color: "white", marginBottom: "30px" }}>Your Hosted Events</h1>
        
        {/* Organizer Profile Info */}
        {organizer && (
          <div style={{
            background: "#2a2a3b",
            padding: "20px",
            borderRadius: "12px",
            marginBottom: "30px",
            color: "white"
          }}>
            <h2 style={{ marginTop: 0 }}>Organizer Profile</h2>
            <p><strong>Name:</strong> {organizer.name || "N/A"}</p>
            <p><strong>Email:</strong> {organizer.email || "N/A"}</p>
            {organizer.Bank && <p><strong>Bank:</strong> {organizer.Bank}</p>}
            {organizer.BankAccount && <p><strong>Bank Account:</strong> {organizer.BankAccount}</p>}
            {organizer.DescriptionAboutCompany && (
              <p><strong>Company Description:</strong> {organizer.DescriptionAboutCompany}</p>
            )}
          </div>
        )}

        {error ? (
          <p style={{ color: "red", padding: "20px" }}>❌ {error}</p>
        ) : loading ? (
          <p style={{ color: "white", padding: "20px" }}>Loading hosted events...</p>
        ) : events.length === 0 ? (
          <p style={{ color: "white", padding: "20px" }}>You haven't hosted any events yet.</p>
        ) : (
          <div className="event-grid">
            {events.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
