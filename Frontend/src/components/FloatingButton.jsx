//floating button
import React from "react";
import { useNavigate } from "react-router-dom";

export default function FloatingButton() {
  const navigate = useNavigate();

  // get the user's role from localStorage
  const role = localStorage.getItem("role");

  // only show button for organizers
  if (role !== "organizer") return null;

  // button click → open create event page
  function handleClick() {
    navigate("/create-event"); 
  }

  return (
    <button className="floating-button" onClick={handleClick} title="Create new event">
      +
    </button>
  );
}
