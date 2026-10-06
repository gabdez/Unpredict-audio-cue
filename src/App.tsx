import { useRoute } from './lib/router';
import { StoreProvider } from './lib/store';
import { CueEditor } from './screens/CueEditor';
import { Cues } from './screens/Cues';
import { Home } from './screens/Home';
import { Player } from './screens/Player';
import { RoutineEditor } from './screens/RoutineEditor';
import { Settings } from './screens/Settings';

function Screens() {
  const route = useRoute();
  switch (route.name) {
    case 'routine':
      return <RoutineEditor key={route.id} id={route.id} />;
    case 'play':
      return <Player key={route.id} id={route.id} />;
    case 'cues':
      return <Cues />;
    case 'cue':
      return <CueEditor key={route.id} id={route.id} />;
    case 'settings':
      return <Settings />;
    default:
      return <Home />;
  }
}

export function App() {
  return (
    <StoreProvider>
      <Screens />
    </StoreProvider>
  );
}
