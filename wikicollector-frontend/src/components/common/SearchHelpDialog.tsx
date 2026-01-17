import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface SearchHelpDialogProps {
  open: boolean;
  onClose: () => void;
}

export const SearchHelpDialog: React.FC<SearchHelpDialogProps> = ({ open, onClose }) => {
  const examples = [
    {
      syntax: 'キーワード1 キーワード2',
      description: 'AND検索 (両方含む)',
      example: 'React TypeScript',
    },
    {
      syntax: '"フレーズ"',
      description: 'フレーズ完全一致',
      example: '"React Hooks"',
    },
    {
      syntax: 'キーワード1 OR キーワード2',
      description: 'OR検索 (いずれか含む)',
      example: 'React OR Vue',
    },
    {
      syntax: '(A OR B)',
      description: '括弧でORグループ化',
      example: '(React OR Vue)',
    },
    {
      syntax: '-キーワード',
      description: '除外検索 (含まない)',
      example: 'React -class',
    },
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        検索の使い方
        <IconButton onClick={onClose} size="small" aria-label="閉じる">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>構文</TableCell>
                <TableCell>説明</TableCell>
                <TableCell>例</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {examples.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Typography
                      component="code"
                      sx={{
                        bgcolor: 'action.hover',
                        color: 'text.primary',
                        px: 0.5,
                        py: 0.25,
                        borderRadius: 0.5,
                        fontSize: '0.875rem',
                      }}
                    >
                      {row.syntax}
                    </Typography>
                  </TableCell>
                  <TableCell>{row.description}</TableCell>
                  <TableCell>
                    <Typography
                      component="code"
                      sx={{
                        bgcolor: 'action.hover',
                        color: 'text.primary',
                        px: 0.5,
                        py: 0.25,
                        borderRadius: 0.5,
                        fontSize: '0.875rem',
                      }}
                    >
                      {row.example}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            組み合わせ例1:{' '}
            <Typography
              component="code"
              sx={{
                bgcolor: 'action.hover',
                color: 'text.primary',
                px: 0.5,
                py: 0.25,
                borderRadius: 0.5,
                fontSize: '0.875rem',
              }}
            >
              (React OR Vue) TypeScript
            </Typography>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            → ReactまたはVueを含み、かつTypeScriptを含む記事
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            組み合わせ例2:{' '}
            <Typography
              component="code"
              sx={{
                bgcolor: 'action.hover',
                color: 'text.primary',
                px: 0.5,
                py: 0.25,
                borderRadius: 0.5,
                fontSize: '0.875rem',
              }}
            >
              (React OR Vue) (frontend OR backend)
            </Typography>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            → (ReactまたはVue) かつ (frontendまたはbackend) を含む記事
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
