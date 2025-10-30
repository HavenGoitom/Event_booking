import React, { useEffect, useState } from "react";
import "../pages/Auth.css";

const API_BASE = "https://arifochevents.onrender.com";
const CREATE_PATH = "/events/create";

function getToken() {
  return localStorage.getItem("accessToken") || "";
}

export default function EventForm({ onCreated, onClose, onCancel }) {
  const close = onClose || onCancel || (() => {});

  const [form, setForm] = useState({
    email: "",
    // 👇 added per request
    organizationName: "",
    eventName: "",
    // 👆
    description: "",
    LocationOfEvent: "",
    AvailableTicketsNormal: "",
    AvailableTicketsVip: "",
    priceNormal: "",
    priceVip: "",
    eventPhoto: null,
  });

  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    try {
      const prof =
        JSON.parse(localStorage.getItem("organizer") || "null") ||
        JSON.parse(localStorage.getItem("userProfile") || "null");
      if (prof?.email) setForm((f) => ({ ...f, email: prof.email }));
      if (prof?.name) setForm((f) => ({ ...f, organizationName: prof.name }));
    } catch {
      /* ignore */
    }
  }, []);

  function setField(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function parseIntOrZero(v) {
    const n = parseInt(String(v ?? "").trim(), 10);
    return Number.isFinite(n) ? n : 0;
  }

  function validate() {
    const required = [
      ["email", "Organizer email"],
      ["eventName", "Event name"],
      ["description", "Description"],
      ["LocationOfEvent", "Event location"],
    ];
    for (const [k, label] of required) {
      if (!String(form[k]).trim()) return `${label} is required`;
    }

    // Validate ticket quantities are positive numbers
    if (!form.AvailableTicketsNormal || parseIntOrZero(form.AvailableTicketsNormal) <= 0) {
      return "Normal tickets must be at least 1";
    }
    if (!form.AvailableTicketsVip || parseIntOrZero(form.AvailableTicketsVip) <= 0) {
      return "VIP tickets must be at least 1";
    }

    // Validate prices are positive numbers
    if (!form.priceNormal || parseIntOrZero(form.priceNormal) <= 0) {
      return "Normal price must be at least 1 ETB";
    }
    if (!form.priceVip || parseIntOrZero(form.priceVip) <= 0) {
      return "VIP price must be at least 1 ETB";
    }

    return null;
  }

  async function handleSubmit(e) {
  e.preventDefault();
  setMsg("");

  const err = validate();
  if (err) return setMsg(`⚠️ ${err}`);

  const token = getToken();
  if (!token) return setMsg("❌ Missing access token. Please sign in.");

  try {
    setSubmitting(true);

      const fd = new FormData();
      fd.append("email", form.email);
      // ✅ backend expects "name", not "eventName"
      fd.append("name", form.eventName);
      fd.append("description", form.description);
      fd.append("LocationOfEvent", form.LocationOfEvent);
      fd.append("AvailableTicketsNormal", parseIntOrZero(form.AvailableTicketsNormal));
      fd.append("AvailableTicketsVip", parseIntOrZero(form.AvailableTicketsVip));
      fd.append("priceNormal", parseIntOrZero(form.priceNormal));
      fd.append("priceVip", parseIntOrZero(form.priceVip));
      if (form.eventPhoto) fd.append("eventPhoto", form.eventPhoto);

    // Log FormData contents
    console.log("Creating event with FormData:");
    for (let pair of fd.entries()) {
      console.log(pair[0] + ': ' + (pair[1] instanceof File ? `[File: ${pair[1].name}]` : pair[1]));
    }

    console.log("Creating event with data:", {
      email: form.email,
      name: form.eventName,
      description: form.description,
      LocationOfEvent: form.LocationOfEvent,
      AvailableTicketsNormal: parseIntOrZero(form.AvailableTicketsNormal),
      AvailableTicketsVip: parseIntOrZero(form.AvailableTicketsVip),
      priceNormal: parseIntOrZero(form.priceNormal),
      priceVip: parseIntOrZero(form.priceVip),
      hasPhoto: !!form.eventPhoto
    });

    const res = await fetch(API_BASE + CREATE_PATH, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });

    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      console.error("Response was not JSON:", text);
      throw new Error(`Failed to create event (non-JSON response, status ${res.status}). Response: ${text.slice(0, 200)}`);
    }

    console.log("Event creation response:", data);

    if (!res.ok) throw new Error(data.message || `Failed to create event (status ${res.status})`);

    setMsg("✅ Event created successfully!");
    onCreated?.(data);
    close();
  } catch (error) {
    console.error("Error creating event:", error);
    setMsg(`❌ ${error.message}`);
  } finally {
    setSubmitting(false);
  }
}


  return (
    <form className="form" onSubmit={handleSubmit}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h3>Create Event</h3>
        <button
          type="button"
          onClick={close}
          style={{
            background: "none",
            border: "none",
            color: "white",
            fontSize: 20,
            cursor: "pointer",
          }}
          aria-label="Close create event form"
        >
          ✕
        </button>
      </div>

      <label className="forms">
        Organizer Email *
        <input
          type="email"
          value={form.email}
          onChange={(e) => setField("email", e.target.value)}
          required
        />
      </label>

      {/* 👇 new: Organization Name (not sent in this request) */}
      <label className="forms">
        Organization Name
        <input
          value={form.organizationName}
          onChange={(e) => setField("organizationName", e.target.value)}
          placeholder="Your organization/company"
        />
      </label>

      {/* 👇 new: Event Name (sent as 'name') */}
      <label className="forms">
        Event Name *
        <input
          value={form.eventName}
          onChange={(e) => setField("eventName", e.target.value)}
          placeholder="e.g., Music Festival 2025"
          required
        />
      </label>

      <label className="forms">
        Description *
        <textarea
          value={form.description}
          onChange={(e) => setField("description", e.target.value)}
          required
        />
      </label>

      <label className="forms">
        LocationOfEvent *
        <input
          value={form.LocationOfEvent}
          onChange={(e) => setField("LocationOfEvent", e.target.value)}
          required
        />
      </label>

      <div style={{ display: "flex", gap: 10 }}>
        <label style={{ flex: 1 }}>
          Normal Tickets *
          <input
            type="number"
            value={form.AvailableTicketsNormal}
            onChange={(e) => setField("AvailableTicketsNormal", e.target.value)}
            required
          />
        </label>
        <label style={{ flex: 1 }}>
          VIP Tickets *
          <input
            type="number"
            value={form.AvailableTicketsVip}
            onChange={(e) => setField("AvailableTicketsVip", e.target.value)}
            required
          />
        </label>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: "30px" }}>
        <label style={{ flex: 1 }}>
          Normal Price *
          <input
            type="number"
            value={form.priceNormal}
            onChange={(e) => setField("priceNormal", e.target.value)}
            required
          />
        </label>
        <label style={{ flex: 1 }}>
          VIP Price *
          <input
            type="number"
            value={form.priceVip}
            onChange={(e) => setField("priceVip", e.target.value)}
            required
          />
        </label>
      </div>

      <label>
        Event Photo
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setField("eventPhoto", e.target.files?.[0] || null)}
        />
      </label>

      {msg && (
        <p
          style={{
            marginTop: 8,
            color: msg.startsWith("✅") ? "lightgreen" : "#f87171",
          }}
        >
          {msg}
        </p>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: "50px" }}>
        <button type="button" onClick={close} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create Event"}
        </button>
      </div>
    </form>
  );
}
