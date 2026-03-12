import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { useTheme } from './hooks/useTheme';
import Home              from './pages/Home/Home';
import WealthPlanner     from './pages/WealthPlanner/WealthPlanner';
import LangThemeToggle   from './components/LangThemeToggle/LangThemeToggle';
import DynamicBackground from './components/DynamicBackground/DynamicBackground';

/** Inner shell — can safely call useTheme() because ThemeProvider is above it. */
function AppInner() {
  const [theme] = useTheme();

  return (
    <>
      <DynamicBackground theme={theme} />
      <LangThemeToggle />
      <Routes>
        <Route path="/"                element={<Home />} />
        <Route path="/vermogenplanner" element={<WealthPlanner />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AppInner />
      </ThemeProvider>
    </BrowserRouter>
  );
}
