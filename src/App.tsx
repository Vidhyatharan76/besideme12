import { useLayoutEffect } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AppStateProvider } from './hooks/useAppState';
import { BuildScenarioPage } from './pages/BuildScenarioPage';
import { CheatSheetPage } from './pages/CheatSheetPage';
import { HomePage } from './pages/HomePage';
import { InterpreterCardPage } from './pages/InterpreterCardPage';
import { ProgressPage } from './pages/ProgressPage';
import { QuestionsPage } from './pages/QuestionsPage';
import { ScenarioPage } from './pages/ScenarioPage';
import { WordsPage } from './pages/WordsPage';

function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <AppStateProvider>
      <HashRouter>
        <ScrollToTop />
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/build-scenario" element={<BuildScenarioPage />} />
            <Route path="/scenario/:scenarioId" element={<ScenarioPage />} />
            <Route path="/questions/:scenarioId" element={<QuestionsPage />} />
            <Route path="/words" element={<WordsPage />} />
            <Route path="/interpreter-card" element={<InterpreterCardPage />} />
            <Route path="/cheat-sheet" element={<CheatSheetPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </HashRouter>
    </AppStateProvider>
  );
}
