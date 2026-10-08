import { Component } from 'react';
import { ErrorCard } from './GhostCard';

// Keeps one card's render error from blanking the whole page: the card is replaced by an
// error card in its grid cell and the others carry on.
class CardErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[CardGrid] A card failed to render:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return <ErrorCard>This card couldn&apos;t be shown: {this.state.error.message}</ErrorCard>;
    }
    return this.props.children;
  }
}

export default CardErrorBoundary;
