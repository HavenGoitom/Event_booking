import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error){ return { error }; }
  componentDidCatch(error, info){ console.error("Caught by ErrorBoundary:", error, info); }
  render(){
    if (this.state.error) {
      return (
        <div style={{ padding:16, color: "white", background:"#8b0000" }}>
          <h3>Something crashed while rendering this route</h3>
          <pre style={{ whiteSpace: "pre-wrap" }}>{String(this.state.error.stack || this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}