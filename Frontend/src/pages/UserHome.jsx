// src/pages/UserHome.jsx
import React, { useEffect, useState } from "react";
import EventCard from "../components/EventCard.jsx";
import userImage from "../assets/user.jpg";
import "./UserHome.css";

const API_BASE = "https://arifochevents.onrender.com";
const EVENTS_PATH = "/events";
const BOOK_PATH   = "/paymentProcess";

function ensureAbsoluteUrl(u) {
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  const clean = u.startsWith("/") ? u : `/${u}`;
  return `${API_BASE}${clean}`;
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

export default function UserHome() {
  // guard: if not logged in, go to sign
  useEffect(() => {
    const t = localStorage.getItem("accessToken");
    if (!t) window.location.href = "/sign";
  }, []);

  useEffect(() => {
    const welcomeText = document.querySelector(".welcoming");
    function handleScroll() {
      const scrollY = window.scrollY;
      if (scrollY > 100) welcomeText?.classList.add("slide-left");
      else welcomeText?.classList.remove("slide-left");
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const [events, setEvents]             = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [ticketType, setTicketType]     = useState("normal");
  const [ticketQty, setTicketQty]       = useState(1);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingMsg, setBookingMsg]     = useState("");
  const [showProfile, setShowProfile]   = useState(false);
  const [username, setUsername]         = useState("");
  const [email, setEmail]               = useState("");

  // Fetch all events from backend
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(API_BASE + EVENTS_PATH, {
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        // Handle expired/invalid token
        if (res.status === 401) {
          hardLogout();
          return;
        }

        const text = await res.text();
        let payload = {};
        try {
          payload = text ? JSON.parse(text) : {};
        } catch {
          throw new Error(
            `Server returned non-JSON (status ${res.status}). Snippet: ${text.slice(0,140)}`
          );
        }

        const arr = Array.isArray(payload)
          ? payload
          : Array.isArray(payload.events)
          ? payload.events
          : Array.isArray(payload.data)
          ? payload.data
          : [];

        const normalized = arr.map((ev, i) => {
          const advUrl = ev?.advertisment?.advertisement_images || "";
          const rawUrl = ev.imageURL || ev.url || advUrl || "";
          const imageURL = ensureAbsoluteUrl(rawUrl);

          return {
            id: ev.id ?? ev._id ?? String(i + 1),
            name: ev.name ?? "Untitled Event",
            description: ev.description ?? "",
            location: ev.LocationOfEvent ?? "TBA",
            organizer: ev.organiserId ? `Organizer #${ev.organiserId}` : "Organizer",
            availableNormal: ev.AvailableTicketsNormal ?? 0,
            availableVip: ev.AvailableTicketsVip ?? 0,
            priceNormal: ev.priceNormal ?? 0,
            priceVip: ev.priceVip ?? 0,
            imageURL,
            date: ev.date || "",
          };
        });

        const latestFirst = [...normalized].reverse();
        if (!cancelled) setEvents(latestFirst);
      } catch (e) {
        console.warn("Failed to fetch events:", e?.message || e);
        if (!cancelled) setEvents([]);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // Keep your local demo username/email behavior unchanged
  useEffect(() => {
    const t = setTimeout(() => {
      setUsername("TestUser123");
      setEmail("test.user@example.com");
    }, 500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setSelectedEvent(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function handleBook() {
    setBookingMsg("");
    const token = localStorage.getItem("accessToken");
    if (!token) return setBookingMsg("Please sign in first.");
    if (!selectedEvent) return setBookingMsg("No event selected.");
    if (!email) return setBookingMsg("Missing user email.");

    const qtyInt = parseInt(String(ticketQty), 10);
    if (!Number.isFinite(qtyInt) || qtyInt <= 0)
      return setBookingMsg("Enter a valid ticket quantity.");

    const maxAvail =
      ticketType === "vip"
        ? selectedEvent.availableVip ?? 0
        : selectedEvent.availableNormal ?? 0;
    if (maxAvail > 0 && qtyInt > maxAvail)
      return setBookingMsg(`Only ${maxAvail} ${ticketType.toUpperCase()} tickets available.`);

    // Calculate price based on ticket type
    const price = ticketType === "vip" ? selectedEvent.priceVip : selectedEvent.priceNormal;

    const payload = {
      email,
      items: [
        { 
          EventId: selectedEvent.id, 
          TicketType: ticketType, 
          TicketQuantity: qtyInt,
          price: price,
          name: selectedEvent.name
        },
      ],
      totalMoney: qtyInt * price,
    };

    try {
      setBookingLoading(true);
      const res = await fetch(API_BASE + BOOK_PATH, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      // If token got invalid right now
      if (res.status === 401) {
        hardLogout();
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Booking failed");
      
      // Check if response has checkoutUrl and redirect
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setBookingMsg("✅ Booking request sent successfully!");
      }
    } catch (err) {
      setBookingMsg(`❌ ${err.message}`);
    } finally {
      setBookingLoading(false);
    }
  }

  return (
    <div className={`user-home ${showProfile ? "dimmed" : ""}`}>
      {/* === Top bar === */}
      <div className="top">
        <div className="event-booking">Event Booking</div>
        <div>
          <button className="signout" onClick={hardLogout}>Sign out</button>
        </div>
        <div className="home-page-text">Home Page</div>
        <div>
          <button
            className="user-button"
            onClick={() => setShowProfile(!showProfile)}
          >
            <img src={userImage} alt="User profile" className="user-image" />
          </button>
        </div>
      </div>

      <div className="welcoming">Welcome to our event booking platform</div>
      <h1>Discover Events</h1>

      {/* === Event Grid === */}
      <div className="event-grid">
        {events.map((event) => (
          <div
            key={event.id}
            onClick={() => {
              setSelectedEvent(event);
              setTicketType("normal");
              setTicketQty(1);
              setBookingMsg("");
            }}
          >
            <EventCard event={event} />
          </div>
        ))}
        {events.length === 0 && (
          <div style={{ color: "#aaa", padding: 12 }}>No events available.</div>
        )}
      </div>

      {showProfile && (
        <div className="profile-info">
          <h2>Personal Information</h2>
          <label>Username: {username}</label>
          <br />
          <label>Email: {email}</label>
        </div>
      )}

      {/* === POPUP EVENT DETAILS === */}
      {selectedEvent && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <img src={selectedEvent.imageURL} alt={selectedEvent.name} className="event-img" />
            <button className="modal-close" onClick={() => setSelectedEvent(null)}>✕</button>
            <div className="modal-content">
              <h2>{selectedEvent.name}</h2>
              <p>{selectedEvent.description || "No description provided."}</p>
              <p><strong>Location:</strong> {selectedEvent.location}</p>
              <p><strong>Normal:</strong> Available {selectedEvent.availableNormal}, Price: {selectedEvent.priceNormal} ETB</p>
              <p><strong>VIP:</strong> Available {selectedEvent.availableVip}, Price: {selectedEvent.priceVip} ETB</p>
              <p><strong>Organizer:</strong> {selectedEvent.organizer}</p>
              
              <div style={{ marginTop: "20px" }}>
                <label style={{ display: "block", marginBottom: "10px" }}>
                  <strong>Ticket Type:</strong>
                  <select 
                    value={ticketType} 
                    onChange={(e) => setTicketType(e.target.value)}
                    style={{ 
                      display: "block", 
                      marginTop: "5px", 
                      padding: "8px", 
                      width: "100%",
                      background: "#2a2a3b",
                      border: "1px solid #444",
                      color: "white",
                      borderRadius: "8px"
                    }}
                  >
                    <option value="normal">Normal - {selectedEvent.priceNormal} ETB</option>
                    <option value="vip">VIP - {selectedEvent.priceVip} ETB</option>
                  </select>
                </label>
                
                <label style={{ display: "block", marginBottom: "10px" }}>
                  <strong>Quantity:</strong>
                  <input 
                    type="number" 
                    min="1" 
                    value={ticketQty} 
                    onChange={(e) => setTicketQty(e.target.value)}
                    style={{ 
                      display: "block", 
                      marginTop: "5px", 
                      padding: "8px", 
                      width: "100%",
                      background: "#2a2a3b",
                      border: "1px solid #444",
                      color: "white",
                      borderRadius: "8px"
                    }}
                  />
                </label>
              </div>
              
              <button 
                onClick={handleBook} 
                disabled={bookingLoading}
                style={{
                  marginTop: "20px",
                  padding: "12px 24px",
                  background: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  cursor: bookingLoading ? "not-allowed" : "pointer",
                  width: "100%"
                }}
              >
                {bookingLoading ? "Booking..." : "Book Ticket"}
              </button>
              {bookingMsg && <p>{bookingMsg}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
