import React, { useState, useEffect } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useParams, useNavigate } from 'react-router-dom';
import { useMediaQuery, useTheme } from '@mui/material';
import { articlesAtom, selectedArticleIdAtom, searchQueryAtom, cachedArticlesAtom, updateCacheAtom } from '../atoms/wikiAtoms';
import { quickMemoOpenAtom } from '../atoms/uiAtoms';
import { WikiService } from '../services/wikiService';

import { fontSizeAtom } from '../atoms/settingsAtoms';
import Mermaid from '../components/common/Mermaid';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ListIcon from '@mui/icons-material/List';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Button,
  TextField,
  CircularProgress,
  IconButton,
  Tooltip,
  styled,
  Fab,
  Drawer,
  Snackbar,
  Alert,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import RestoreIcon from '@mui/icons-material/Restore';

import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';

// Markdownのスタイル調整
const MarkdownWrapper = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'fontSize',
})<{ fontSize?: number }>(({ theme, fontSize }) => ({
  fontSize: fontSize ? `${fontSize}px` : '16px',
  color: theme.palette.text.primary,
  '& h1, & h2, & h3, & h4, & h5, & h6': {
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(2),
    fontWeight: 700,
    color: theme.palette.text.primary,
    scrollMarginTop: '80px', // 固定ヘッダーに被らないように余白を追加
  },
  '& h1': { borderBottom: `1px solid ${theme.palette.divider}`, paddingBottom: theme.spacing(1) },
  '& p': { marginBottom: theme.spacing(2), lineHeight: 1.7 },
  '& ul, & ol': { marginBottom: theme.spacing(2), paddingLeft: theme.spacing(3) },
  '& li': { marginBottom: theme.spacing(0.5) },
  '& a': {
    color: theme.palette.primary.main, // テーマのプライマリカラーを使用
    textDecoration: 'none',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  '& code': {
    backgroundColor: theme.palette.mode === 'light' ? theme.palette.grey[100] : 'rgba(255, 255, 255, 0.1)',
    border: `1px solid ${theme.palette.mode === 'light' ? theme.palette.grey[300] : 'rgba(255, 255, 255, 0.2)'}`,
    padding: '2px 6px',
    borderRadius: 4,
    fontSize: '0.9em',
    fontFamily: 'monospace',
    mx: '2px',
    color: theme.palette.mode === 'light' ? 'inherit' : '#e0e0e0',
    wordBreak: 'break-all',
    whiteSpace: 'pre-wrap',
  },
  '& pre code': {
    backgroundColor: 'transparent',
    border: 'none',
    padding: 0,
    borderRadius: 0,
    mx: 0,
  },
  '& pre': {
    backgroundColor: theme.palette.mode === 'light' ? theme.palette.grey[50] : '#1e1e1e',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    margin: `${theme.spacing(2)} 0`,
    padding: theme.spacing(2), // 枠の内側に余白を追加
    position: 'relative',
    overflowX: 'auto',
    maxWidth: '100%',
    '&:hover .copy-button': {
      opacity: 1,
    },
  },
  '& table': {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: theme.spacing(2),
    overflowX: 'auto',
    display: 'block',
  },
  '& th, & td': {
    border: `1px solid ${theme.palette.divider}`,
    padding: theme.spacing(1),
  },
  '& th': {
    backgroundColor: theme.palette.mode === 'light' ? theme.palette.grey[100] : 'rgba(255, 255, 255, 0.05)',
  },
  '& blockquote': {
    borderLeft: `4px solid ${theme.palette.primary.main}`,
    margin: 0,
    paddingLeft: theme.spacing(2),
    color: theme.palette.text.secondary,
  },
  '& mark': {
    backgroundColor: theme.palette.mode === 'light' ? '#fff176' : '#ffd600', // 明るい黄色
    color: '#000',
    padding: '0 2px',
    borderRadius: '2px',
  },
}));

// コピーボタンコンポーネント
const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Tooltip title={copied ? 'コピーしました！' : 'コピー'}>
      <IconButton
        className="copy-button"
        size="small"
        onClick={handleCopy}
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          opacity: 0,
          transition: 'opacity 0.2s',
          zIndex: 1,
          '&:hover': {
            backgroundColor: '#fff',
          },
        }}
      >
        {copied ? <CheckIcon fontSize="small" color="success" /> : <ContentCopyIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
};

// テキスト内のキーワードをハイライトするヘルパー関数
const highlightText = (node: React.ReactNode, query: string): React.ReactNode => {
  if (!query.trim()) return node;

  // 文字列の場合
  if (typeof node === 'string') {
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const parts = node.split(regex);

    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? <mark key={i}>{part}</mark> : part
    );
  }

  // 配列の場合
  if (Array.isArray(node)) {
    return node.map((child, i) => (
      <React.Fragment key={i}>{highlightText(child, query)}</React.Fragment>
    ));
  }

  // React要素の場合
  if (React.isValidElement<{ children?: React.ReactNode }>(node) && node.props.children) {
    return React.cloneElement(node, {
      children: highlightText(node.props.children, query)
    });
  }

  return node;
};

// 見出しを抽出する型
interface HeaderItem {
  id: string;
  text: string;
  level: number;
}

// Markdownから見出しを抽出する関数
const parseHeaders = (content: string): HeaderItem[] => {
  const headers: HeaderItem[] = [];
  const lines = content.split('\n');

  // コードブロック内を無視するためのフラグ
  let inCodeBlock = false;

  lines.forEach((line) => {
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      return;
    }
    if (inCodeBlock) return;

    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      // IDの生成 (半角英数字とハイフンのみ、重複回避は簡易的に)
      const id = encodeURIComponent(text.toLowerCase().replace(/\s+/g, '-'));
      headers.push({ id, text, level });
    }
  });
  return headers;
};

// 目次コンポーネント
const TableOfContents: React.FC<{ headers: HeaderItem[]; onItemClick?: () => void }> = ({ headers, onItemClick }) => {
  const [open, setOpen] = useState(true);
  if (headers.length === 0) return null;

  const handleClick = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      // URLのハッシュを更新
      window.history.pushState(null, '', `#${id}`);
      if (onItemClick) onItemClick();
    }
  };

  const effectiveOpen = onItemClick ? true : open;

  return (
    <Box sx={{
      position: onItemClick ? 'relative' : 'sticky',
      top: onItemClick ? 0 : 20,
      ml: onItemClick ? 0 : 3,
      width: onItemClick ? '100%' : (effectiveOpen ? 250 : 40),
      flexShrink: 0,
      display: onItemClick ? 'block' : { xs: 'none', lg: 'block' },
      maxHeight: onItemClick ? 'none' : 'calc(100vh - 140px)',
      overflowY: effectiveOpen ? 'auto' : 'hidden',
      pr: effectiveOpen ? 1 : 0,
      transition: 'width 0.3s ease',
    }}>
      <Box sx={{
        display: onItemClick ? 'none' : 'flex',
        alignItems: 'center',
        mb: 1,
        justifyContent: effectiveOpen ? 'space-between' : 'center'
      }}>
        {open && (
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
            目次
          </Typography>
        )}
        <Tooltip title={open ? '目次を閉じる' : '目次を開く'}>
          <IconButton size="small" onClick={() => setOpen(!open)} sx={{
            color: 'text.secondary',
            '&:hover': { backgroundColor: 'action.hover' }
          }}>
            {open ? <ChevronRightIcon /> : <MenuOpenIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      {open && (
        <>
          <Divider sx={{ mb: 2 }} />
          <Box component="nav">
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {headers.map((header, index) => (
                <li key={`${header.id}-${index}`} style={{ marginBottom: '8px' }}>
                  <Typography
                    variant="body2"
                    component="a"
                    href={`#${header.id}`}
                    onClick={handleClick(header.id)}
                    sx={{
                      display: 'block',
                      color: 'text.secondary',
                      textDecoration: 'none',
                      pl: (header.level - 1) * 2,
                      borderLeft: '2px solid transparent',
                      '&:hover': {
                        color: 'primary.main',
                        borderLeftColor: 'primary.light',
                        backgroundColor: 'rgba(37, 99, 235, 0.04)',
                      },
                      fontSize: header.level === 1 ? '0.9rem' : '0.85rem',
                      fontWeight: header.level === 1 ? 600 : 400,
                      transition: 'all 0.2s',
                      py: 0.5,
                      pr: 1,
                    }}
                  >
                    {header.text}
                  </Typography>
                </li>
              ))}
            </ul>
          </Box>
        </>
      )}
    </Box>
  );
};

// 画像表示用のコンポーネント
const SafeImage = ({ src, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => {
  const [imageUrl, setImageUrl] = useState<string>('');

  useEffect(() => {
    const fetchUrl = async () => {
      if (src && src.startsWith('/images/')) {
        const url = await WikiService.getPictureUrl(src);
        setImageUrl(url);
      } else {
        setImageUrl(src || '');
      }
    };
    fetchUrl();
  }, [src]);

  if (!imageUrl) return null;
  return (
    <Box
      component="img"
      {...props}
      src={imageUrl}
      sx={{ maxWidth: '100%', height: 'auto', my: 2, borderRadius: 1 }}
    />
  );
};

export const WikiPage: React.FC<{ isEditRoute?: boolean; isNewRoute?: boolean }> = ({
  isEditRoute = false,
  isNewRoute = false
}) => {
  const { articleId } = useParams<{ articleId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const articles = useAtomValue(articlesAtom);
  const setArticles = useSetAtom(articlesAtom);
  const setQuickMemoOpen = useSetAtom(quickMemoOpenAtom);
  const [selectedId, setSelectedId] = useAtom(selectedArticleIdAtom);
  const searchQuery = useAtomValue(searchQueryAtom);
  const fontSize = useAtomValue(fontSizeAtom);
  const cachedArticles = useAtomValue(cachedArticlesAtom);
  const updateCache = useSetAtom(updateCacheAtom);

  // 記事データを個別に取得する際のローディング状態
  const [isFetching, setIsFetching] = useState(false);

  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [initializedId, setInitializedId] = useState<string | null>(null);
  const [isViewingBackup, setIsViewingBackup] = useState(false);
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) return;

    setLoading(true);
    try {
      const path = await WikiService.uploadImage(file);
      // Markdown形式で挿入
      const imageMarkdown = `\n![${file.name}](${path})\n`;
      setContent((prev) => prev + imageMarkdown);
    } catch (error) {
      alert('画像のアップロードに失敗しました。');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          await handleFileUpload(file);
        }
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    for (let i = 0; i < files.length; i++) {
      if (files[i].type.startsWith('image/')) {
        await handleFileUpload(files[i]);
      }
    }
  };

  // atomから現在表示すべきデータを取得
  const article = (articleId ? cachedArticles.get(articleId) : null) ||
                  articles.find((a) => a.articleId === (articleId || selectedId) && a.content !== undefined);

  // 編集または新規作成ページの場合、初期値をセット
  useEffect(() => {
    if (isEditRoute && articleId) {
      // 本文を持っているデータがあり、かつ未初期化の場合のみセット
      if (article && article.content !== undefined && initializedId !== articleId) {
        setTitle(article.title);
        setContent(article.content || '');
        setInitializedId(articleId);
      }
    } else if (isNewRoute) {
      if (initializedId !== 'new') {
        setTitle('');
        setContent('');
        setInitializedId('new');
      }
    } else {
      // 閲覧モードに戻った時は初期化フラグをリセット
      if (initializedId !== null) {
        setInitializedId(null);
      }
    }
  }, [isEditRoute, isNewRoute, articleId, article, initializedId]);

  // URLの articleId が変わったら atom を更新
  useEffect(() => {
    if (articleId) {
      setSelectedId(articleId);
    } else if (isNewRoute) {
      setSelectedId(null);
    } else {
      setSelectedId(null);
    }
  }, [articleId, isNewRoute, setSelectedId]);

  // SWR方式での記事取得: キャッシュ表示 + 裏で最新取得
  useEffect(() => {
    const fetchArticle = async () => {
      if (!articleId) return;

      // キャッシュもリスト内データもなければ、初期表示のためにローディングを表示
      const hasData = cachedArticles.has(articleId) ||
                      articles.some(a => a.articleId === articleId && a.content !== undefined);
      if (!hasData) {
        setIsFetching(true);
      }

      try {
        const latest = await WikiService.getArticle(articleId);
        if (latest) {
          updateCache(latest);
        }
      } catch (error) {
        console.error('SWR Revalidation Failed:', error);
      } finally {
        setIsFetching(false);
      }
    };

    fetchArticle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]); // IDが変わった時のみ実行。他を依存に入れると再帰ループの危険があるため

  // 記事が切り替わったときにスクロール位置をトップに戻し、バックアップ表示をリセット
  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.scrollTop = 0;
    }
    setIsViewingBackup(false);
  }, [articleId]);

  // 表示するコンテンツの切り替え
  const displayContent = isViewingBackup ? (article?.backupContent || '') : (article?.content || '');

  // 目次用の見出し抽出
  const headers = article ? parseHeaders(displayContent) : [];

  // 記事が見つからない場合でも、URLにIDがある場合は読み込み中かエラーの可能性がある
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    if (articles.length > 0) {
      setIsInitialLoading(false);
    }
  }, [articles]);

  const handleOpenCreate = () => {
    navigate('/wiki/new');
  };

  const handleOpenEdit = () => {
    if (!article) return;
    navigate(`/wiki/${article.articleId}/edit`);
  };

  const handleCancel = () => {
    // 履歴を一つ戻ることで、直前に表示していたWikiページ（または一覧）へ戻る
    navigate(-1);
  };

  const handleCreateSubmit = async () => {
    setLoading(true);
    try {
      const newArticle = await WikiService.createArticle(title, content);
      setArticles((prev) => {
        if (prev.find(a => a.articleId === newArticle.articleId)) return prev;
        return [...prev, newArticle];
      });
      updateCache(newArticle); // キャッシュを更新することで表示にも反映される
      navigate(`/wiki/${newArticle.articleId}`);
      setTitle('');
      setContent('');
    } catch (error: unknown) {
      const err = error as { errors?: { message: string }[]; message?: string };
      const message = err.errors?.[0]?.message || err.message || '作成に失敗しました。';
      alert(`エラー: ${message}\n環境設定（認証モード）や権限を確認してください。`);
      console.error('Detailed Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSubmit = async () => {
    if (!articleId) return;
    setLoading(true);
    try {
      const updatedArticle = await WikiService.updateArticle(articleId, title, content);
      setArticles((prev) => prev.map(a => a.articleId === articleId ? updatedArticle : a));
      updateCache(updatedArticle); // キャッシュを更新することで表示にも反映される
      navigate(`/wiki/${articleId}`);
    } catch (error: unknown) {
      const err = error as { errors?: { message: string }[]; message?: string };
      const message = err.errors?.[0]?.message || err.message || '更新に失敗しました。';
      alert(`エラー: ${message}\n環境設定（認証モード）や権限を確認してください。`);
      console.error('Detailed Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!articleId || !window.confirm('このWikiを削除してもよろしいですか？')) return;

    // 非同期で削除を実行（完了を待たない）
    WikiService.deleteArticle(articleId).catch(error => {
      console.error('Background Delete Error:', error);
      alert('バックグラウンドでの削除処理に失敗しました。');
    });

    // フロントエンド側は即座に反映
    setArticles((prev) => prev.filter(a => a.articleId !== articleId));
    // 即座にトップページへ戻る
    navigate('/');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (isEditRoute) {
        handleUpdateSubmit();
      } else if (isNewRoute) {
        handleCreateSubmit();
      }
    }
  };

  const handleCopyMarkdown = async () => {
    if (!displayContent) return;
    try {
      await navigator.clipboard.writeText(displayContent);
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Failed to copy markdown:', error);
      alert('コピーに失敗しました。');
    }
  };

  const handleCloseSnackbar = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  if (isEditRoute || isNewRoute) {
    return (
      <Box sx={{ pb: 10 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {isEditRoute ? 'Wikiを編集' : '新しいWikiを追加'}
          </Typography>
          {isEditRoute && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleDeleteSubmit}
              disabled={loading}
            >
              削除する
            </Button>
          )}
        </Box>
        <Paper sx={{ p: 4 }}>
          <TextField
            fullWidth
            label="タイトル"
            variant="outlined"
            margin="normal"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            sx={{ mb: 3 }}
          />
          <TextField
            fullWidth
            label="本文 (Markdown)"
            variant="outlined"
            margin="normal"
            multiline
            rows={20}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onDrop={handleDrop}
            sx={{ mb: 4 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button variant="outlined" onClick={handleCancel} disabled={loading}>
              キャンセル
            </Button>
            <Button
              variant="contained"
              onClick={isEditRoute ? handleUpdateSubmit : handleCreateSubmit}
              disabled={loading || !title}
              startIcon={loading ? <CircularProgress size={20} /> : (isEditRoute ? <EditIcon /> : <AddIcon />)}
            >
              {isEditRoute ? '更新する' : '作成する'}
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }

  if (!article) {
    if (articleId && (isInitialLoading || isFetching)) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
          <CircularProgress />
        </Box>
      );
    }
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 10 }}>
        <Typography variant="h5" color="text.secondary" gutterBottom sx={{ mb: 4, textAlign: 'center' }}>
          {articleId ? '記事が見つかりませんでした' : '記事を選択するか、新しく作成してください'}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', maxWidth: 300 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
            sx={{ py: 2, borderRadius: 2, fontWeight: 700, fontSize: '1.1rem' }}
          >
            Wikiを追加
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<AddIcon />}
            onClick={() => setQuickMemoOpen(true)}
            sx={{ py: 2, borderRadius: 2, fontWeight: 700, fontSize: '1.1rem', borderWidth: 2, '&:hover': { borderWidth: 2 } }}
          >
            クイックメモ
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', pb: 10 }}>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          mb: 2,
          gap: { xs: 1.5, md: 0 }
        }}>
          <Typography variant="h4" sx={{
            fontWeight: 700,
            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' },
            wordBreak: 'break-all'
          }}>
            {article?.title.split('/').pop()}
          </Typography>
          <Box sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            width: { xs: '100%', md: 'auto' },
            justifyContent: 'flex-end'
          }}>
            {article?.backupContent && (
              <Button
                variant="outlined"
                size={isMobile ? "small" : "medium"}
                startIcon={isViewingBackup ? <RestoreIcon /> : <HistoryIcon />}
                onClick={() => setIsViewingBackup(!isViewingBackup)}
                color={isViewingBackup ? "secondary" : "primary"}
              >
                {isViewingBackup ? (isMobile ? '戻る' : '現在の内容に戻る') : (isMobile ? '履歴' : '1世代前の内容を確認')}
              </Button>
            )}
            <Button
              variant="outlined"
              size={isMobile ? "small" : "medium"}
              startIcon={<EditIcon />}
              onClick={handleOpenEdit}
            >
              編集
            </Button>
            <Button
              variant="contained"
              size={isMobile ? "small" : "medium"}
              startIcon={<AddIcon />}
              onClick={handleOpenCreate}
            >
              {isMobile ? '追加' : 'Wikiの追加'}
            </Button>
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {article?.title}
        </Typography>

            <Divider sx={{ mb: 4 }} />

            <Paper sx={{ p: 4, position: 'relative' }}>
              <Tooltip title="マークダウン形式でコピー">
                <IconButton
                  onClick={handleCopyMarkdown}
                  disabled={!displayContent}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    color: 'text.secondary',
                    opacity: 0.6,
                    '&:hover': {
                      opacity: 1,
                      backgroundColor: 'action.hover',
                    },
                  }}
                  size="small"
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              {isViewingBackup && (
                <Box sx={{ mb: 2, p: 1, bgcolor: 'action.selected', borderRadius: 1, borderLeft: '4px solid', borderColor: 'secondary.main' }}>
                  <Typography variant="body2" color="secondary.main" sx={{ fontWeight: 700 }}>
                    【注意】現在は1世代前のバックアップ内容を表示しています。
                  </Typography>
                </Box>
              )}
              <MarkdownWrapper fontSize={fontSize}>
                <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkBreaks]}
              components={{
                img: SafeImage,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                a(props: any) {
                  return (
                    <a href={props.href} target="_blank" rel="noopener noreferrer">
                      {props.children}
                    </a>
                  );
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                pre(props: any) {
                  // preタグ（コードブロック）のテキストを抽出
                  const childrenArray = React.Children.toArray(props.children);
                  const codeElement = childrenArray.find(
                    (child) => React.isValidElement(child) && (child.type as any) === 'code'
                  ) as React.ReactElement<{ children?: React.ReactNode }> | undefined;

                  const codeContent = codeElement?.props.children ? String(codeElement.props.children) : '';

                  return (
                    <Box component="pre" sx={{ position: 'relative' }}>
                      {codeContent && <Box className="copy-button-container"><CopyButton text={codeContent} /></Box>}
                      {props.children}
                    </Box>
                  );
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                code({ inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  const content = String(children).replace(/\n$/, '');

                  if (!inline && match && match[1] === 'mermaid') {
                    return <Mermaid chart={content} />;
                  }

                  if (!inline && match) {
                    return (
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{
                          margin: 0,
                          padding: 0,
                          backgroundColor: 'transparent',
                        }}
                        {...props}
                      >
                        {content}
                      </SyntaxHighlighter>
                    );
                  }

                      // インラインコードまたは言語指定なしのコードブロック
                      // 検索キーワードでハイライトを適用
                      if (searchQuery.trim()) {
                        const regex = new RegExp(`(${searchQuery})`, 'gi');
                        const parts = content.split(regex);
                        return (
                          <code className={className} {...props}>
                            {parts.map((part, i) =>
                              regex.test(part) ? <mark key={i}>{part}</mark> : part
                            )}
                          </code>
                        );
                      }

                      return (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    },
                p({ children }: { children?: React.ReactNode }) {
                  return <p>{highlightText(children, searchQuery)}</p>;
                },
                li({ children }: { children?: React.ReactNode }) {
                  return <li>{highlightText(children, searchQuery)}</li>;
                },
                h1({ children }: { children?: React.ReactNode }) {
                  const id = encodeURIComponent(String(children).toLowerCase().replace(/\s+/g, '-'));
                  return <Typography id={id} variant="h4" component="h1" sx={{ fontWeight: 700, mt: 3, mb: 2, borderBottom: 1, borderColor: 'divider', pb: 1 }}>{highlightText(children, searchQuery)}</Typography>;
                },
                h2({ children }: { children?: React.ReactNode }) {
                  const id = encodeURIComponent(String(children).toLowerCase().replace(/\s+/g, '-'));
                  return <Typography id={id} variant="h5" component="h2" sx={{ fontWeight: 700, mt: 3, mb: 2 }}>{highlightText(children, searchQuery)}</Typography>;
                },
                h3({ children }: { children?: React.ReactNode }) {
                  const id = encodeURIComponent(String(children).toLowerCase().replace(/\s+/g, '-'));
                  return <Typography id={id} variant="h6" component="h3" sx={{ fontWeight: 700, mt: 2, mb: 1 }}>{highlightText(children, searchQuery)}</Typography>;
                },
              }}
            >
              {displayContent}
            </ReactMarkdown>
          </MarkdownWrapper>
        </Paper>

        <Box sx={{ mt: 4 }}>
          <Typography variant="caption" color="text.secondary">
            作成日: {article && new Date(article.createdAt).toLocaleString()} |
            更新日: {article && new Date(article.updatedAt).toLocaleString()}
          </Typography>
        </Box>
      </Box>

      <TableOfContents headers={headers} />

      {/* スマートフォン用：目次を開くフローティングボタン */}
      <Fab
        color="primary"
        aria-label="open table of contents"
        onClick={() => setMobileTocOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          display: { lg: 'none' }, // デスクトップ版目次が表示されるサイズ（lg）以上では隠す
          zIndex: (theme) => theme.zIndex.speedDial
        }}
      >
        <ListIcon />
      </Fab>

      {/* スマートフォン用：目次の引き出し */}
      <Drawer
        anchor="right"
        open={mobileTocOpen}
        onClose={() => setMobileTocOpen(false)}
        PaperProps={{
          sx: {
            width: '80%',
            maxWidth: 300,
            p: 3,
            bgcolor: 'background.paper'
          }
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
          目次
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ overflowY: 'auto', flexGrow: 1 }}>
          <TableOfContents
            headers={headers}
            onItemClick={() => setMobileTocOpen(false)}
          />
        </Box>
      </Drawer>

      {/* 通知 */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          マークダウンをコピーしました
        </Alert>
      </Snackbar>
    </Box>
  );
};
