import { useState, useRef, useEffect } from 'react';

// Expand/collapse state for a fixed-height panel. On expand, smoothly scrolls the
// panel down half its visible height so the first part of the new content is shown.
export const useExpandScroll = () => {
  const [showMore, setShowMore] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    if (showMore) {
      panel.scrollTo({ top: panel.clientHeight / 2, behavior: 'smooth' });
    } else {
      panel.scrollTo({ top: 0 });
    }
  }, [showMore]);

  const toggleShowMore = () => setShowMore((prev) => !prev);

  return { showMore, toggleShowMore, panelRef };
};
