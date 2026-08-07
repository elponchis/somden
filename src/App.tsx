import { useState } from 'react';
import { Pairing } from './components/Pairing';
import { GardenHome } from './components/GardenHome';

function App() {
  const [isPaired, setIsPaired] = useState(false);

  if (!isPaired) {
    return <Pairing onPaired={() => setIsPaired(true)} />;
  }
  return <GardenHome />;
}

export default App;
