import { Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Sign.jsx"; // Sign in / Sign up combined component
import UserHome from "./pages/UserHome";
import OrganizerHome from "./pages/OrganizerHome";
import HostedEvents from "./components/HostedEvents/Hostedevents.jsx";
import BookedEvents from "./components/BookedEvents.jsx";

export default function App() {
  const token = localStorage.getItem("accessToken");
  const role = localStorage.getItem("role");

  const isUser = token && role === "user";
  const isOrganizer = token && role === "org";

  return (
    <Routes>
      {/* Dedicated /sign for your direct link */}
      <Route path="/sign" element={<Auth />} />

      <Route path="/hosted-events" element={<HostedEvents />} />
      <Route path="/booked-events" element={<BookedEvents />} />

      {/* Public routes */}
      <Route
        path="/signin"
        element={
          token ? (
            <Navigate to={isUser ? "/user/home" : "/organizer/home"} />
          ) : (
            <Auth />
          )
        }
      />

      <Route
        path="/signup"
        element={
          token ? (
            <Navigate to={isUser ? "/user/home" : "/organizer/home"} />
          ) : (
            <Auth />
          )
        }
      />

      {/* Protected routes */}
      <Route
        path="/user/home"
        element={isUser ? <UserHome /> : <Navigate to="/signin" />}
      />

      <Route
        path="/organizer/home"
        element={isOrganizer ? <OrganizerHome /> : <Navigate to="/signin" />}
      />

      {/* Default redirect */}
      <Route
        path="/"
        element={
          token ? (
            <Navigate to={isUser ? "/user/home" : "/organizer/home"} />
          ) : (
            <Navigate to="/signin" />
          )
        }
      />

      {/* Catch-all route */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
