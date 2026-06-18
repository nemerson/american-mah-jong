import { GameBoard } from './components/GameBoard';
import { Lobby } from './components/Lobby';
import { SettingsPanel } from './components/SettingsPanel';
import { detectRemote } from './net/createTransport';
import { useTheme, TILE_SETS } from './theme/themes';
import { TileStyleContext } from './theme/TileStyleContext';

function App() {
  const { theme, setMat, setTiles } = useTheme();
  // Multiplayer pages (served by the game server, or `?server`) boot into the
  // lobby; single-player / Electron drops straight into a local game.
  const remote = detectRemote().remote;

  const artStyle = (TILE_SETS.find(t => t.id === theme.tiles) ?? TILE_SETS[0]).artStyle;

  return (
    <div className="app-shell" data-mat={theme.mat} data-tiles={theme.tiles}>
      <TileStyleContext.Provider value={artStyle}>
        <SettingsPanel theme={theme} onMatChange={setMat} onTilesChange={setTiles} />
        {remote ? <Lobby /> : <GameBoard />}
      </TileStyleContext.Provider>
    </div>
  );
}

export default App;
