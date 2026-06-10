import { GameBoard } from './components/GameBoard';
import { SettingsPanel } from './components/SettingsPanel';
import { useTheme } from './theme/themes';

function App() {
  const { theme, setMat, setTiles } = useTheme();

  return (
    <div className="app-shell" data-mat={theme.mat} data-tiles={theme.tiles}>
      <SettingsPanel theme={theme} onMatChange={setMat} onTilesChange={setTiles} />
      <GameBoard />
    </div>
  );
}

export default App;
