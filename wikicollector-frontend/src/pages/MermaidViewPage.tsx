import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Mermaid from '../components/common/Mermaid';

export const MermaidViewPage: React.FC = () => {
  const navigate = useNavigate();

  // URLパラメータから初期値を直接取得（Lint警告回避のため）
  const [chart] = useState<string>(() => {
    const encodedChart = new URLSearchParams(window.location.search).get('chart');
    if (encodedChart) {
      try {
        return decodeURIComponent(atob(encodedChart));
      } catch (e) {
        console.error('Failed to decode mermaid chart:', e);
      }
    }
    return '';
  });

  if (!chart) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="error">チャートが見つかりませんでした。</Typography>
        <IconButton onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          <ArrowBackIcon />
        </IconButton>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <Box sx={{ p: 0.5, px: 2, display: 'flex', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Tooltip title="戻る">
          <IconButton onClick={() => navigate(-1)} size="small">
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>
        <Typography variant="subtitle2" sx={{ ml: 2, fontWeight: 700, color: 'text.secondary' }}>
          Mermaid 専用ビュー
        </Typography>
      </Box>
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <Mermaid chart={chart} isFullPage={true} />
      </Box>
    </Box>
  );
};
