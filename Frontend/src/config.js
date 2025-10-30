// src/config.js
// Use the correct URL for your environment.
// For local dev: "http://localhost:3000"
// For production: "https://arifochevents.onrender.com"
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://arifochevents.onrender.com";

export default BASE_URL;
