import { Board } from './components/Board.tsx';

function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border px-4 py-3 sm:px-6">
        <h1 className="text-lg font-semibold">TaskFlow</h1>
      </header>
      <main className="p-4 sm:p-6">
        <Board />
      </main>
    </div>
  );
}

export default App;
