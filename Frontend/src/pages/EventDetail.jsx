/* eslint-disable no-console */
console.log('EventDetail module loaded');
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export default function EventDetail() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);

  useEffect(() => {
    const API_BASE = "https://arifochevents.onrender.com";
    const token = localStorage.getItem("accessToken");
    
    fetch(`${API_BASE}/events`, {
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch events');
        return res.json();
      })
      .then((data) => {
        const events = Array.isArray(data) ? data : data.events || data.data || [];
        const event = events.find((e) => (e.id || e._id) === id);
        if (event) {
          setEvent({
            id: event.id || event._id,
            name: event.name || 'Untitled Event',
            description: event.description || '',
            date: event.date || '',
            location: event.LocationOfEvent || 'TBA',
            imageURL: event.imageURL || event.url || event.advertisment?.advertisement_images || '',
          });
        } else {
          throw new Error('Event not found');
        }
      })
      .catch((err) => {
        console.error('Error fetching event:', err);
        setEvent({
          id,
          name: 'Sample Event',
          description: 'Details from fallback',
          date: '2025-01-01',
          location: 'Addis Ababa',
          imageURL: `https://picsum.photos/seed/${id}/800/500`,
        });
      });
  }, [id]);

  if (!event) return <p>Loading...</p>;

  return (
    <div className="event-detail" style={{ padding: 20 }}>
      <img src={event.imageURL} alt={event.name} style={{ width: '100%', maxWidth: 900, borderRadius: 10 }} />
      <h1>{event.name}</h1>
      <p>{event.description}</p>
      <p><strong>Date:</strong> {event.date}</p>
      <p><strong>Location:</strong> {event.location}</p>
      <button>Book Now</button>
    </div>
  );
}
