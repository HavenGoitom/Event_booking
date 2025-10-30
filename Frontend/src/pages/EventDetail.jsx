/* eslint-disable no-console */
console.log('EventDetail module loaded');
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export default function EventDetail() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);

  useEffect(() => {
    // TEMP: find from local mock (in real app, fetch by id)
    fetch(`http://localhost:5000/api/events/${id}`)
      .then((res) => res.json())
      .then((data) => setEvent(data))
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
