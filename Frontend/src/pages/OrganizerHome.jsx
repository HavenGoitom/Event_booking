import React, { useEffect, useMemo, useState, useRef } from "react";
import EventCard from "../components/EventCard.jsx";
import EventForm from "../components/EventForm.jsx";
import { useNavigate } from "react-router-dom";
import userImage from "../assets/user.jpg";
import "./OrganizerHome.css";

const API_BASE = "https://arifochevents.onrender.com";
const EVENTS_PATH = "/events";

function getToken() {
  return localStorage.getItem("accessToken") || "";
}

// --- Helpers: absolute, https, backend-first image picking
function normalizeUrl(u) {
  if (!u) return "";
  let s = String(u).trim().replace(/^"+|"+$/g, "");
  
  // If it's already a full URL, validate and return
  if (/^https?:\/\//i.test(s)) {
    // Force https for production
    s = s.replace(/^http:\/\//i, "https://");
    s = s.replace("http://arifochevents.onrender.com", "https://arifochevents.onrender.com");
    return s;
  }
  
  // Handle relative paths
  if (s.startsWith("//")) s = "https:" + s;
  if (s.startsWith("/uploads") || s.startsWith("/")) {
    s = `${API_BASE}${s}`;
  } else {
    s = `${API_BASE}/${s}`;
  }
  
  return s;
}

function pickImage(ev) {
  const cand =
    ev?.advertisment?.advertisement_images ||
    ev?.url ||
    ev?.imageURL ||
    ev?.imageUrl ||
    ev?.image ||
    ev?.photo ||
    ev?.eventPhotoURL ||
    "";
  
  if (!cand) return "";
  return normalizeUrl(cand);
}

function hardLogout() {
  try {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userProfile");
    localStorage.removeItem("organizer");
    localStorage.removeItem("role");
  } catch {}
  window.location.href = "/sign";
}

export default function OrganizerHome() {
  const navigate = useNavigate();

  // guard — redirect if no token
  useEffect(() => {
    const t = localStorage.getItem("accessToken");
    if (!t) window.location.href = "/sign";
  }, []);

  const organizer = useMemo(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("organizer")) ||
        JSON.parse(localStorage.getItem("userProfile")) ||
        null
      );
    } catch {
      return null;
    }
  }, []);

  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [openForm, setOpenForm] = useState(false);
  const token = getToken();

  // Track newly-created IDs so they always stay at the top even after refresh logic
  const newIdsRef = useRef(new Set());

  // Define fetchEvents as a function that can be called from anywhere
  async function fetchEvents() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(API_BASE + EVENTS_PATH, {
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      // If token expired/invalid → bounce to sign
      if (res.status === 401) {
        hardLogout();
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch events");

      const list = Array.isArray(data) ? data : data.events || data.data || [];

      const normalized = list.map((ev) => {
        // Get organizer name from the included organiser relation
        const organizerName = ev?.organiser?.name || 
                             ev.organizerName ||
                             ev.organiserName ||
                             "Organizer";
        
        // Get image - always ensure we have a URL
        let imageURL = pickImage(ev);
        if (!imageURL) {
          // If no image found, use empty string (EventCard will use placeholder)
          imageURL = "";
        }
        
        return {
          id: ev.id || ev._id,
          name: ev.name || "Untitled Event",
          description: ev.description || "",
          LocationOfEvent: ev.LocationOfEvent || "TBA",
          AvailableTicketsNormal: ev.AvailableTicketsNormal ?? 0,
          AvailableTicketsVip: ev.AvailableTicketsVip ?? 0,
          priceNormal: ev.priceNormal ?? 0,
          priceVip: ev.priceVip ?? 0,
          organizerName: organizerName,
          imageURL: imageURL,
        };
      });

      // latest first
      let ordered = normalized.slice().reverse();

      // Keep "new this session" at top
      if (newIdsRef.current.size) {
        const top = [];
        const rest = [];
        for (const ev of ordered) {
          if (ev.id && newIdsRef.current.has(ev.id)) top.push(ev);
          else rest.push(ev);
        }
        ordered = [...top, ...rest];
      }

      setEvents(ordered);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEvents();
  }, [token]);

  // Called by EventForm after successful POST /events/create
  async function handlePost(resp) {
    console.log("Event created, response:", resp);
    
    // Refetch events from backend to get complete data
    await fetchEvents();
  }

  return (
    <div className="organizer-home">
      {/* ===== TOP BAR ===== */}
      <div className="top">
        <div className="event-booking">Event Booking</div>
        <div>
          <button className="signout" onClick={hardLogout}>Sign out</button>
        </div>
        <div className="home-page-text">Organizer</div>

        {/* Profile button → hosted events and profile */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            className="user-button"
            onClick={() => navigate("/hosted-events")}
            title="View your hosted events and profile"
          >
            <img className="user-image" src={userImage} alt="Organizer" />
          </button>
        </div>
      </div>

      <div className="welcoming">Welcome to our event booking platform</div>
      <h1>Discover Events</h1>

      {error && <div style={{ color: "red", marginBottom: 10 }}>❌ {error}</div>}

      <div className="event-grid">
        {loading ? (
          <p>Loading events...</p>
        ) : events.length === 0 ? (
          <p>No events found.</p>
        ) : (
          events.map((e) => (
            <EventCard key={e.id} event={e} onClick={() => setSelectedEvent(e)} />
          ))
        )}
      </div>

      {/* ===== MODAL ===== */}
      {selectedEvent && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="modal-card" onClick={(ev) => ev.stopPropagation()}>
            {selectedEvent.imageURL ? (
              <img src={selectedEvent.imageURL} alt={selectedEvent.name} className="event-img" />
            ) : null}
            <button className="modal-close" onClick={() => setSelectedEvent(null)}>✕</button>

            <div className="modal-content">
              <h2>{selectedEvent.name}</h2>
              <p className="event-desc">{selectedEvent.description || "No description provided."}</p>
              <div className="info-block">
                <p><strong>Location:</strong> {selectedEvent.LocationOfEvent}</p>
                <p><strong>Organizer:</strong> {selectedEvent.organizerName}</p>
              </div>

              <div className="ticket-container">
                <div className="ticket-box normal">
                  <h4>Normal Tickets</h4>
                  <p className="available">Available: {selectedEvent.AvailableTicketsNormal}</p>
                  <p className="price">Price: {selectedEvent.priceNormal} ETB</p>
                </div>
                <div className="ticket-box vip">
                  <h4>VIP Tickets</h4>
                  <p className="available">Available: {selectedEvent.AvailableTicketsVip}</p>
                  <p className="price">Price: {selectedEvent.priceVip} ETB</p>
                </div>
              </div>

              <div style={{ marginTop: "20px", padding: "12px", background: "#2a2a3b", borderRadius: "8px", textAlign: "center" }}>
                <p style={{ color: "#4ade80", fontWeight: "bold", margin: 0 }}>
                  ✓ This is your event - Manage it from your hosted events page
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating + to create event */}
      <button
        className="plus-button"
        onClick={() => setOpenForm(true)}
        aria-label="Create new event"
      >
        +
      </button>

      {openForm && (
        <div className="popup-form" onClick={() => setOpenForm(false)}>
          <div className="form-card" onClick={(e) => e.stopPropagation()}>
            <EventForm onCreated={handlePost} onClose={() => setOpenForm(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
