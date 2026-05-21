import { useState } from 'react';
import AppSelector from './AppSelector';
import HackApp from './HackApp';
import JassTafel from './jass/JassTafel';

type AppView = 'selector' | 'hack' | 'jass';

const STORAGE_KEY = 'app:last-view';

function getInitialView(): AppView {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'hack' || saved === 'jass') return saved;
  } catch {
    /* ignore */
  }
  return 'selector';
}

function saveView(view: AppView): void {
  try {
    if (view === 'selector') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, view);
  } catch {
    /* ignore */
  }
}

export default function App() {
  const [view, setView] = useState<AppView>(getInitialView);

  const navigate = (v: AppView) => {
    setView(v);
    saveView(v);
  };

  switch (view) {
    case 'hack':
      return <HackApp onBack={() => navigate('selector')} />;
    case 'jass':
      return <JassTafel onBack={() => navigate('selector')} />;
    case 'selector':
    default:
      return <AppSelector onSelect={(app) => navigate(app)} />;
  }
}
