import { useEffect, useState } from 'react';

// Hash routing keeps the app working from any static host / sub-path and
// lets the Android back button move between screens.
export type Route =
  | { name: 'home' }
  | { name: 'routine'; id: string }
  | { name: 'play'; id: string }
  | { name: 'cues' }
  | { name: 'cue'; id: string }
  | { name: 'settings' };

export function parseRoute(hash: string): Route {
  const [, name, id] = hash.replace(/^#/, '').split('/');
  switch (name) {
    case 'routine':
    case 'play':
    case 'cue':
      return id ? { name, id: decodeURIComponent(id) } : { name: 'home' };
    case 'cues':
    case 'settings':
      return { name };
    default:
      return { name: 'home' };
  }
}

export function href(route: Route): string {
  return 'id' in route ? `#/${route.name}/${encodeURIComponent(route.id)}` : `#/${route.name === 'home' ? '' : route.name}`;
}

export function navigate(route: Route, replace = false) {
  if (replace) location.replace(href(route));
  else location.hash = href(route);
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parseRoute(location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
