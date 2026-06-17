import { GameBoard } from './components/GameBoard';
import { Lobby } from './components/Lobby';
import { SettingsPanel } from './components/SettingsPanel';
import { detectRemote } from './net/createTransport';
import { useTheme } from './theme/themes';

function App() {
  const { theme, setMat, setTiles } = useTheme();
  // Multiplayer pages (served by the game server, or `?server`) boot into the
  // lobby; single-player / Electron drops straight into a local game.
  const remote = detectRemote().remote;

  return (
    <div className="app-shell" data-mat={theme.mat} data-tiles={theme.tiles}>
      <SettingsPanel theme={theme} onMatChange={setMat} onTilesChange={setTiles} />
      {remote ? <Lobby /> : <GameBoard />}
    </div>
  );
}

export default App;
