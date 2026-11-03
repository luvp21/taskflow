import { Board } from './components/Board.tsx';
import { ChaosPanel } from './components/ChaosPanel.tsx';
import { Toaster } from './components/Toaster.tsx';

function App() {
  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-6">
        <h1 className="text-lg font-semibold">TaskFlow</h1>
        <div className="ml-auto">
          <ChaosPanel />
        </div>
      </header>
      <main className="p-4 sm:p-6">
        <Board />
      </main>
      <Toaster />
    </div>
  );
}

export default App;
