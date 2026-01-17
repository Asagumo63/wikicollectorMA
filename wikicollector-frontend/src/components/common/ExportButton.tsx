import React, { useState } from 'react';
import {
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Typography,
  Box,
  Tooltip,
  Alert,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { ExportService } from '../../services/exportService';

interface ExportButtonProps {
  variant?: 'icon' | 'button';
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  variant = 'icon'
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    setProgress({ current: 0, total: 0 });

    try {
      await ExportService.exportAllArticles((current, total) => {
        setProgress({ current, total });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エクスポートに失敗しました');
    } finally {
      setIsExporting(false);
    }
  };

  const progressPercent = progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <>
      {variant === 'icon' ? (
        <Tooltip title="全記事をエクスポート">
          <IconButton
            color="inherit"
            onClick={handleExport}
            disabled={isExporting}
          >
            <DownloadIcon />
          </IconButton>
        </Tooltip>
      ) : (
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleExport}
          disabled={isExporting}
        >
          全記事をエクスポート
        </Button>
      )}

      <Dialog open={isExporting} maxWidth="sm" fullWidth>
        <DialogTitle>エクスポート中...</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <LinearProgress
              variant="determinate"
              value={progressPercent}
            />
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1 }}
            >
              {progress.current} / {progress.total} 記事を処理中 ({progressPercent}%)
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog open={!!error} onClose={() => setError(null)}>
        <DialogTitle>エラー</DialogTitle>
        <DialogContent>
          <Alert severity="error">{error}</Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setError(null)}>閉じる</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
