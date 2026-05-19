import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, copied: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ error: null, copied: false });
  };

  private handleCopy = () => {
    const { error } = this.state;
    if (!error) return;
    const text = `Error: ${error.message}\n\n${error.stack ?? ""}`;
    void navigator.clipboard.writeText(text).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  render() {
    const { error, copied } = this.state;
    if (error) {
      return (
        <div
          role="alert"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100dvh",
            padding: "2rem",
            textAlign: "center",
            gap: "1rem",
            fontFamily: "var(--font-ui, system-ui, sans-serif)",
          }}
        >
          <h1 style={{ fontSize: "1.25rem", margin: 0 }}>Something went wrong</h1>
          <p style={{ margin: 0, opacity: 0.7, maxWidth: "36ch" }}>
            An unexpected error occurred. Your drafts are stored in your browser
            and should still be here after a refresh.
          </p>
          <p style={{ margin: 0, opacity: 0.55, maxWidth: "36ch", fontSize: "0.875rem" }}>
            {error.message}
          </p>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", justifyContent: "center" }}>
            <button
              type="button"
              onClick={this.handleReset}
              style={{
                padding: "0.5rem 1.25rem",
                borderRadius: "6px",
                border: "1px solid currentColor",
                background: "transparent",
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              Try again
            </button>
            <button
              type="button"
              onClick={this.handleCopy}
              style={{
                padding: "0.5rem 1.25rem",
                borderRadius: "6px",
                border: "1px solid currentColor",
                background: "transparent",
                cursor: "pointer",
                fontSize: "0.875rem",
                opacity: 0.7,
              }}
            >
              {copied ? "Copied!" : "Copy error details"}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
