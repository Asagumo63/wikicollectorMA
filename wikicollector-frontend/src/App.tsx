import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { getAppTheme } from './theme/theme';
import { themeModeAtom } from './atoms/settingsAtoms';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { MainLayout } from './components/layout/MainLayout';
import { WikiPage } from './pages/WikiPage';
import { SettingsPage } from './pages/SettingsPage';
import { MermaidViewPage } from './pages/MermaidViewPage';

function App() {
  const themeMode = useAtomValue(themeModeAtom);
  const theme = getAppTheme(themeMode);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route
              path="/"
              element={
                <MainLayout>
                  <WikiPage />
                </MainLayout>
              }
            />
            <Route
              path="/wiki/new"
              element={
                <MainLayout>
                  <WikiPage isNewRoute={true} />
                </MainLayout>
              }
            />
            <Route
              path="/wiki/:articleId"
              element={
                <MainLayout>
                  <WikiPage />
                </MainLayout>
              }
            />
            <Route
              path="/wiki/:articleId/edit"
              element={
                <MainLayout>
                  <WikiPage isEditRoute={true} />
                </MainLayout>
              }
            />
            <Route
              path="/settings"
              element={
                <MainLayout>
                  <SettingsPage />
                </MainLayout>
              }
            />
            <Route path="/mermaid-view" element={<MermaidViewPage />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
