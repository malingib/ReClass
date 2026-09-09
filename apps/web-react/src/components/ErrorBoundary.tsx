import { Component, type ReactNode } from 'react';

export default function ErrorBoundary({ children }: { children: ReactNode }) {
  return <Boundary>{children}</Boundary>;
}

class Boundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state = { error: null as unknown };
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return <div className="p-8 text-sm text-red-600">Something went wrong.</div>;
    }
    return this.props.children;
  }
}
