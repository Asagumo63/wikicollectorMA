import React from 'react';
import { useAtom } from 'jotai';
import { settingsAtom, DEFAULT_FONT_SIZE } from '../atoms/settingsAtoms';
import type { ThemeMode } from '../atoms/settingsAtoms';
import {
  Box,
  Typography,
  Paper,
  Slider,
  Divider,
  Button,
  FormControl,
  FormLabel,
  ToggleButtonGroup,
  ToggleButton,
  IconButton,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SettingsIcon from '@mui/icons-material/Settings';
import RefreshIcon from '@mui/icons-material/Refresh';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import CloseIcon from '@mui/icons-material/Close';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useAtom(settingsAtom);
  const navigate = useNavigate();

  const handleFontSizeChange = (_event: Event, newValue: number | number[]) => {
    setSettings((prev) => ({
      ...prev,
      fontSize: newValue as number,
    }));
  };

  const handleThemeModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newMode: ThemeMode | null
  ) => {
    if (newMode !== null) {
      setSettings((prev) => ({
        ...prev,
        themeMode: newMode,
      }));
    }
  };

  const handleReset = () => {
    setSettings({
      fontSize: DEFAULT_FONT_SIZE,
      themeMode: 'light',
    });
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4, pb: 10 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <SettingsIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            設定
          </Typography>
        </Box>
        <IconButton onClick={() => navigate(-1)} aria-label="close">
          <CloseIcon />
        </IconButton>
      </Box>

      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
          表示設定
        </Typography>
        <Divider sx={{ mb: 4 }} />

        <FormControl fullWidth sx={{ mb: 6 }}>
          <FormLabel sx={{ mb: 2, color: 'text.primary', fontWeight: 500 }}>
            テーマモード
          </FormLabel>
          <ToggleButtonGroup
            value={settings.themeMode}
            exclusive
            onChange={handleThemeModeChange}
            aria-label="theme mode"
            color="primary"
          >
            <ToggleButton value="light" aria-label="light mode" sx={{ px: 3 }}>
              <LightModeIcon sx={{ mr: 1 }} />
              ライト
            </ToggleButton>
            <ToggleButton value="dark" aria-label="dark mode" sx={{ px: 3 }}>
              <DarkModeIcon sx={{ mr: 1 }} />
              ダーク
            </ToggleButton>
          </ToggleButtonGroup>
        </FormControl>

        <FormControl fullWidth sx={{ mb: 4 }}>
          <FormLabel sx={{ mb: 2, color: 'text.primary', fontWeight: 500 }}>
            プレビューの文字サイズ (px): {settings.fontSize}px
          </FormLabel>
          <Box sx={{ px: 2 }}>
            <Slider
              value={settings.fontSize}
              onChange={handleFontSizeChange}
              min={12}
              max={32}
              step={1}
              marks={[
                { value: 12, label: '12px' },
                { value: 16, label: '16px' },
                { value: 24, label: '24px' },
                { value: 32, label: '32px' },
              ]}
              valueLabelDisplay="auto"
            />
          </Box>
        </FormControl>

        <Box sx={{
          mt: 4,
          p: 3,
          bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255, 255, 255, 0.05)',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider'
        }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            プレビューのイメージ:
          </Typography>
          <Typography sx={{ fontSize: settings.fontSize }}>
            これはプレビューのサンプルテキストです。スライダーを動かすと、この文字の大きさが変わります。
            実際のWikiページでもこのサイズが適用されます。
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleReset}
          >
            デフォルトに戻す
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};
