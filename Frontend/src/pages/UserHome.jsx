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
          // Photos are stored in advertisment.advertisement_images as full URLs
          // Check multiple possible sources for the image
          const advUrl = ev?.advertisment?.advertisement_images || "";
          const rawUrl = ev.imageURL || 
                        ev.imageUrl || 
                        ev.url || 
                        ev.image ||
                        ev.photo ||
                        ev.eventPhotoURL ||
                        advUrl || 
                        "";
          
          // Ensure we have an absolute URL
          let imageURL = "";
          if (rawUrl) {
            if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
              // Already full URL - ensure https
              imageURL = rawUrl.replace(/^http:\/\//i, "https://");
            } else {
              // Relative path - make it absolute
              imageURL = ensureAbsoluteUrl(rawUrl);
            }
          }
          // If no URL, imageURL remains empty string (EventCard will use placeholder)

          // Get organizer name - check multiple possible fields
          const organizerName = ev?.organiser?.name || 
                              ev?.organizer?.name || 
                              ev?.organizerName || 
                              ev?.organiserName || 
                              "Organizer";

          return {
            id: ev.id ?? ev._id ?? String(i + 1),
            name: ev.name ?? "Untitled Event",
            description: ev.description ?? "",
            location: ev.LocationOfEvent ?? "TBA",
            organizer: organizerName,
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

  // Fetch real user data from backend API
  useEffect(() => {
    const loadProfile = async () => {
      try {
        // First try localStorage (fast)
        const cachedProfile = JSON.parse(localStorage.getItem("userProfile") || "null");
        if (cachedProfile && cachedProfile.name && cachedProfile.email) {
          setUsername(cachedProfile.name || "User");
          setEmail(cachedProfile.email || "");
          setPhone(cachedProfile.phone || "");
        }

        // Then fetch from backend to ensure we have latest data
        const token = localStorage.getItem("accessToken");
        if (!token) return;

        try {
          const res = await fetch(`${API_BASE}/profile`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          });

          if (res.ok) {
            const profileData = await res.json();
            setUsername(profileData.name || "User");
            setEmail(profileData.email || "");
            setPhone(profileData.phone || "");
            
            // Update localStorage with fresh data
            localStorage.setItem("userProfile", JSON.stringify(profileData));
          } else if (res.status === 401) {
            hardLogout();
          }
        } catch (fetchErr) {
          console.warn("Could not fetch profile from backend, using cached data:", fetchErr);
        }
      } catch (err) {
        console.error("Error loading user profile:", err);
      }
    };
    
    loadProfile();
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
    
    // Get email from profile if not set
    const userEmail = email || (() => {
      try {
        const profile = JSON.parse(localStorage.getItem("userProfile") || "null");
        return profile?.email || "";
      } catch {
        return "";
      }
    })();
    
    if (!userEmail) return setBookingMsg("Missing user email. Please check your profile.");

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
      email: userEmail,
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
            title="View profile and booked events"
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
          <h2 style={{ marginTop: 0, marginBottom: "16px" }}>Personal Information</h2>
          <div style={{ marginBottom: "12px" }}>
            <div style={{ display: "block", marginBottom: "10px" }}>
              <span style={{ fontWeight: "600", color: "#333" }}>Name:</span>
              <span style={{ fontWeight: "normal", marginLeft: "8px" }}>{username || "N/A"}</span>
            </div>
            <div style={{ display: "block", marginBottom: "10px" }}>
              <span style={{ fontWeight: "600", color: "#333" }}>Email:</span>
              <span style={{ fontWeight: "normal", marginLeft: "8px" }}>{email || "N/A"}</span>
            </div>
            {phone && (
              <div style={{ display: "block", marginBottom: "10px" }}>
                <span style={{ fontWeight: "600", color: "#333" }}>Phone:</span>
                <span style={{ fontWeight: "normal", marginLeft: "8px" }}>{phone}</span>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              setShowProfile(false);
              window.location.href = "/booked-events";
            }}
            style={{
              padding: "10px 20px",
              background: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              width: "100%",
              marginTop: "10px",
              fontSize: "14px",
              fontWeight: "500"
            }}
          >
            View My Booked Events
          </button>
          <button
            onClick={() => setShowProfile(false)}
            style={{
              padding: "8px 16px",
              background: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              width: "100%",
              marginTop: "8px",
              fontSize: "13px"
            }}
          >
            Close
          </button>
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
