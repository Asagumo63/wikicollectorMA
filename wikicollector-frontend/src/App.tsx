import React from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { WikiPage } from './pages/WikiPage';
import { SettingsPage } from './pages/SettingsPage';
import { getAppTheme } from './theme/theme';
const theme = getAppTheme('light');
import { Authenticator, useTheme as useAmplifyTheme, View, Heading, useAuthenticator, translations } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import './config/amplify';
import { I18n } from 'aws-amplify/utils';

// 日本語化
I18n.putVocabularies(translations);
I18n.setLanguage('ja');

const AuthWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authStatus } = useAuthenticator((context: any) => [context.authStatus]);

  if (authStatus === 'configuring') return null;

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Authenticator.Provider>
        <Authenticator
          hideSignUp={true}
          components={{
            Header() {
              const { tokens } = useAmplifyTheme();
              return (
                <View textAlign="center" padding={tokens.space.large}>
                  <Heading level={3}>wikiコレクション</Heading>
                </View>
              );
            },
          }}
        >
          {() => (
            <AuthWrapper>
              <BrowserRouter>
                <Routes>
                  <Route element={<MainLayout><Outlet /></MainLayout>}>
                    <Route path="/" element={<WikiPage />} />
                    <Route path="/wiki/:articleId" element={<WikiPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </AuthWrapper>
          )}
        </Authenticator>
      </Authenticator.Provider>
    </ThemeProvider>
  );
};
