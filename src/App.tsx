import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { useTheme } from './hooks/useTheme';
import Home              from './pages/Home/Home';
import LangThemeToggle   from './components/LangThemeToggle/LangThemeToggle';
import DynamicBackground from './components/DynamicBackground/DynamicBackground';

const WealthPlanner = lazy(() => import('./pages/WealthPlanner/WealthPlanner'));

/** Inner shell — can safely call useTheme() because ThemeProvider is above it. */
function AppInner() {
  const [theme] = useTheme();

  return (
    <>
      <DynamicBackground theme={theme} />
      <LangThemeToggle />
      <Suspense>
        <Routes>
          <Route path="/"                element={<Home />} />
          <Route path="/vermogenplanner" element={<WealthPlanner />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true }}>
      <ThemeProvider>
        <AppInner />
      </ThemeProvider>
    </BrowserRouter>
  );
}
