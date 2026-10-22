"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props { children: ReactNode; widgetName: string }
interface State { hasError: boolean }

export class WidgetBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`Widget "${this.props.widgetName}" failed`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return <div role="alert" className="widget-error">Widget tidak dapat ditampilkan.</div>;
    }
    return this.props.children;
  }
}
