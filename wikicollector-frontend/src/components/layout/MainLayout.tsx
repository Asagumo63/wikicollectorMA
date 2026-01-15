import React, { useEffect, useState } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  CssBaseline,
  Button,
  IconButton,
  useMediaQuery,
  useTheme,
  SwipeableDrawer,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress
} from '@mui/material';
import { Sidebar } from './Sidebar';
import { WikiService } from '../../services/wikiService';
import { articlesAtom } from '../../atoms/wikiAtoms';
import { authAtom } from '../../atoms/authAtoms';
import { quickMemoOpenAtom } from '../../atoms/uiAtoms';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate } from 'react-router-dom';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { fetchUserAttributes } from 'aws-amplify/auth';

const drawerWidthDefault = 300;
const minDrawerWidth = 200;
const maxDrawerWidth = 600;

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const setArticles = useSetAtom(articlesAtom);
  const [auth, setAuth] = useAtom(authAtom);
  const { user, signOut: amplifySignOut } = useAuthenticator((context: any) => [context.user]);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(!isMobile);
  const [drawerWidth, setDrawerWidth] = useState(drawerWidthDefault);
  const [isResizing, setIsResizing] = useState(false);
  const [swipeAreaWidth, setSwipeAreaWidth] = useState(window.innerWidth / 3);
  const navigate = useNavigate();

  // クイックメモ用
  const [quickMemoOpen, setQuickMemoOpen] = useAtom(quickMemoOpenAtom);
  const [memoText, setMemoText] = useState('');
  const [isSavingMemo, setIsSavingMemo] = useState(false);

  const [displayName, setDisplayName] = useState<string>('');

  // Amplify の認証状態を authAtom に同期
  useEffect(() => {
    if (user) {
      setAuth({
        user: {
          username: user.username,
          attributes: {}
        },
        isAuthenticated: true,
        isLoading: false,
      });

      // 表示名を取得
      const getDisplayName = async () => {
        try {
          const attributes = await fetchUserAttributes();
          setDisplayName(attributes.preferred_username || user.username);
        } catch (e) {
          console.error('Failed to fetch user attributes:', e);
          setDisplayName(user.username);
        }
      };
      getDisplayName();
    } else {
      setAuth({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, [user, setAuth]);

  // 画面サイズが変わったときにサイドバーの状態とスワイプエリアを調整
  useEffect(() => {
    setOpen(!isMobile);
    setSwipeAreaWidth(window.innerWidth / 3);
  }, [isMobile]);

  // リサイズ時にスワイプエリアを再計算
  useEffect(() => {
    const handleResize = () => {
      setSwipeAreaWidth(window.innerWidth / 3);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (auth.isAuthenticated) {
      const fetchArticles = async () => {
        try {
          const items = await WikiService.listArticles();
          setArticles(items);
        } catch (error) {
          console.error('Failed to fetch articles:', error);
        }
      };
      fetchArticles();
    }
  }, [setArticles, auth.isAuthenticated]);

  const handleLogout = async () => {
    amplifySignOut();
    navigate('/');
  };

  const toggleDrawer = () => {
    setOpen(!open);
  };

  // サイドバーのリサイズ処理
  const startResizing = React.useCallback((mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = React.useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = React.useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        const newWidth = mouseMoveEvent.clientX;
        if (newWidth >= minDrawerWidth && newWidth <= maxDrawerWidth) {
          setDrawerWidth(newWidth);
        }
      }
    },
    [isResizing]
  );

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSaveMemo();
    }
  };

  const handleSaveMemo = async () => {
    if (!memoText.trim()) return;

    setIsSavingMemo(true);
    try {
      const now = new Date();
      // YYYY-MM-DD_HH:mm:ss
      const timestamp = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0') + '_' +
        String(now.getHours()).padStart(2, '0') + ':' +
        String(now.getMinutes()).padStart(2, '0') + ':' +
        String(now.getSeconds()).padStart(2, '0');

      const path = `クイックメモ/${timestamp}`;

      const newArticle = await WikiService.createArticle(path, memoText);

      // ツリーを即時更新 (S3の更新を待たずに、現在の状態に追加)
      setArticles((prev) => {
        // 重複チェック
        if (prev.find(a => a.articleId === newArticle.articleId)) return prev;
        return [...prev, newArticle];
      });

      // 作成した記事へ移動
      navigate(`/wiki/${newArticle.articleId}`);

      // 状態リセット
      setQuickMemoOpen(false);
      setMemoText('');
    } catch (error) {
      console.error('Failed to save quick memo:', error);
      alert('メモの保存に失敗しました。');
    } finally {
      setIsSavingMemo(false);
    }
  };

  const drawerContent = (
    <>
      <Sidebar />
    </>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <CssBaseline />
      <AppBar
        position="static"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="toggle drawer"
            onClick={toggleDrawer}
            edge="start"
            sx={{ mr: 2 }}
          >
            {open ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{
              cursor: 'pointer',
              '&:hover': {
                opacity: 0.8,
              },
              // モバイルではタイトルを少し小さく
              fontSize: { xs: '1.1rem', sm: '1.25rem' }
            }}
            onClick={() => navigate('/')}
          >
            wikiコレクション
          </Typography>
          {auth.user && (
            <>
              <Button
                color="inherit"
                startIcon={<AddIcon />}
                onClick={() => setQuickMemoOpen(true)}
                sx={{
                  ml: 2,
                  textTransform: 'none',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  },
                  display: { xs: 'none', sm: 'flex' }
                }}
              >
                クイックメモ
              </Button>
              {/* モバイル用アイコンボタン */}
              <IconButton
                color="inherit"
                onClick={() => setQuickMemoOpen(true)}
                sx={{ display: { xs: 'flex', sm: 'none' }, ml: 1 }}
              >
                <AddIcon />
              </IconButton>
            </>
          )}
          <Box sx={{ flexGrow: 1 }} />
          {auth.user && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}>
                ログイン中: {displayName}
              </Typography>
              <IconButton
                color="inherit"
                onClick={() => navigate('/settings')}
                sx={{ mr: 1 }}
                title="設定"
              >
                <SettingsIcon />
              </IconButton>
              <Button color="inherit" onClick={handleLogout} size="small">
                ログアウト
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden', position: 'relative' }}>
        {/* モバイル用: スワイプ可能なドロワー */}
        {isMobile ? (
        <SwipeableDrawer
          anchor="left"
          open={open}
          onClose={() => setOpen(false)}
          onOpen={() => setOpen(true)}
          disableBackdropTransition={!isMobile}
          disableDiscovery={false}
          swipeAreaWidth={swipeAreaWidth} // 画面幅の3分の1を動的にセット
          sx={{
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
            },
          }}
        >
          {drawerContent}
        </SwipeableDrawer>
        ) : (
          /* デスクトップ用: 固定・持続的ドロワー */
          <Drawer
            variant="persistent"
            anchor="left"
            open={open}
            PaperProps={{
              sx: {
                width: drawerWidth,
                position: 'static', // 親の flexBox に従わせる
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                borderRight: (theme) => `1px solid ${theme.palette.divider}`,
                transition: isResizing ? 'none' : (theme) => theme.transitions.create('width', {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.enteringScreen,
                }),
                ...(!open && {
                  width: 0,
                  borderRight: 'none',
                }),
              }
            }}
            sx={{
              width: open ? drawerWidth : 0,
              flexShrink: 0,
              display: { xs: 'none', md: 'block' }, // Drawer コンポーネント自体の表示制御
            }}
          >
            {drawerContent}
          </Drawer>
        )}

        {/* リサイズハンドル (PC版かつサイドバーが開いているときのみ) */}
        {!isMobile && open && (
          <Box
            onMouseDown={startResizing}
            sx={{
              width: '4px',
              cursor: 'col-resize',
              position: 'relative',
              zIndex: (theme) => theme.zIndex.drawer + 1,
              backgroundColor: isResizing ? 'primary.main' : 'transparent',
              transition: 'background-color 0.2s',
              '&:hover': {
                backgroundColor: 'primary.light',
              },
              // 判定エリアを少し広げる
              '&::after': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: -2,
                right: -2,
                bottom: 0,
              }
            }}
          />
        )}

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            bgcolor: 'background.default',
            p: { xs: 2, sm: 3 }, // モバイルでは余白を少し小さく
            height: '100%',
            overflowY: 'auto',
            minWidth: 0,
            transition: isResizing ? 'none' : (theme) => theme.transitions.create(['margin', 'width'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            // モバイル以外でサイドバーが開いているときのみ余白を確保
            ...(!isMobile && open && {
              ml: 0,
              transition: isResizing ? 'none' : (theme) => theme.transitions.create(['margin', 'width'], {
                easing: theme.transitions.easing.easeOut,
                duration: theme.transitions.duration.enteringScreen,
              }),
            }),
          }}
        >
          {children}
        </Box>
      </Box>

      <Dialog
        open={quickMemoOpen}
        onClose={() => !isSavingMemo && setQuickMemoOpen(false)}
        fullWidth
        maxWidth="lg"
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          クイックメモ
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {isMobile && (
              <Button
                onClick={handleSaveMemo}
                disabled={isSavingMemo || !memoText.trim()}
                sx={{ mr: 1 }}
                color="primary"
              >
                {isSavingMemo ? <CircularProgress size={24} color="inherit" /> : '保存'}
              </Button>
            )}
            <IconButton
              aria-label="close"
              onClick={() => setQuickMemoOpen(false)}
              disabled={isSavingMemo}
              sx={{
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', p: isMobile ? 1 : 3 }}>
          <TextField
            autoFocus
            multiline
            rows={isMobile ? undefined : 25}
            minRows={isMobile ? 15 : undefined}
            fullWidth
            value={memoText}
            onChange={(e) => setMemoText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSavingMemo}
            sx={{
              mt: 1,
              flexGrow: 1,
              '& .MuiInputBase-root': {
                height: isMobile ? '100%' : 'auto',
                alignItems: 'start'
              },
              '& .MuiInputBase-input': {
                height: isMobile ? '100% !important' : 'auto',
                overflowY: 'auto !important'
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuickMemoOpen(false)} disabled={isSavingMemo}>
            キャンセル
          </Button>
          {!isMobile && (
            <Button
              onClick={handleSaveMemo}
              variant="contained"
              disabled={isSavingMemo || !memoText.trim()}
              startIcon={isSavingMemo ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {isSavingMemo ? '保存中...' : '保存'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};
