import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div style={{ padding: "48px 24px", maxWidth: 600, margin: "60px auto", textAlign: "center", background: "#ffffff", borderRadius: 16, boxShadow: "0 10px 30px rgba(0,0,0,0.06)", border: "1px solid var(--cms-border, #e2e8f0)" }}>
          <AlertCircle size={52} style={{ color: "#ef4444", margin: "0 auto 16px" }} />
          <h2 style={{ fontSize: 20, marginBottom: 8, color: "var(--cms-text, #1e293b)" }}>Something went wrong loading this view</h2>
          <p style={{ fontSize: 14, color: "var(--cms-muted, #64748b)", marginBottom: 20 }}>
            {this.state.error?.message || "An unexpected error occurred while rendering this section."}
          </p>
          <button
            type="button"
            className="cms-btn cms-btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px" }}
            onClick={this.handleRetry}
          >
            <RefreshCw size={16} /> Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
