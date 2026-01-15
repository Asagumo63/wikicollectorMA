import { createTheme } from '@mui/material/styles';
import type { PaletteMode } from '@mui/material';

export const getAppTheme = (mode: PaletteMode) => {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: mode === 'light' ? '#2563eb' : '#90caf9', // ダークモードでは明るい青
        light: mode === 'light' ? '#3b82f6' : '#e3f2fd',
        dark: mode === 'light' ? '#1d4ed8' : '#42a5f5',
      },
      ...(mode === 'light'
        ? {
            background: {
              default: '#f3f4f6',
              paper: '#ffffff',
            },
          }
        : {
            background: {
              default: '#121212',
              paper: '#1e1e1e',
            },
            text: {
              primary: '#e0e0e0',
              secondary: '#aaaaaa',
            },
          }),
    },
    typography: {
      fontFamily: [
        'Noto Sans JP',
        '-apple-system',
        'BlinkMacSystemFont',
        'Segoe UI',
        'Roboto',
        'Oxygen',
        'Ubuntu',
        'Cantarell',
        'Fira Sans',
        'Droid Sans',
        'Helvetica Neue',
        'sans-serif',
      ].join(','),
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: mode === 'light' ? '#2563eb' : '#1e1e1e',
            backgroundImage: 'none',
          },
        },
      },
      MuiCssBaseline: {
        styleOverrides: {
          'html, body, #root': {
            height: '100vh',
            overflow: 'hidden',
          },
          body: {
            scrollbarColor: mode === 'light' ? 'rgba(0,0,0,0.2) transparent' : 'rgba(255,255,255,0.1) transparent',
            scrollbarWidth: 'thin',
          },
          // 全ての要素にカスタムスクロールバーを適用
          '*::-webkit-scrollbar': {
            width: 8,
            height: 8,
          },
          '*::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
          },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: mode === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
            borderRadius: 4,
          },
          '*::-webkit-scrollbar-thumb:hover': {
            backgroundColor: mode === 'light' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)',
          },
        },
      },
    },
  });
};
