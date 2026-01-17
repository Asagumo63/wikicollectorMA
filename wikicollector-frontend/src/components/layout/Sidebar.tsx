import React, { useState, useEffect } from 'react';
import { useAtomValue, useAtom, useSetAtom } from 'jotai';
import { useNavigate } from 'react-router-dom';
import { wikiTreeAtom, selectedArticleIdAtom, expandedItemIdsAtom, searchQueryAtom, articlesAtom } from '../../atoms/wikiAtoms';
import {
  searchIndexAtom,
  setSearchIndexAtom,
  setSearchIndexLoadingAtom,
  resetSearchIndexAtom,
} from '../../atoms/searchAtoms';
import type { WikiNode, Article } from '../../types/index';
import { WikiService } from '../../services/wikiService';
import { parseSearchQuery } from '../../utils/searchQueryParser';
import { filterArticles } from '../../utils/searchFilter';
import { SearchHelpDialog } from '../common/SearchHelpDialog';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { Box, Typography, Divider, TextField, InputAdornment, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Tooltip, Menu, MenuItem, Snackbar, Alert } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import RefreshIcon from '@mui/icons-material/Refresh';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

// テキスト内のキーワードをハイライトするヘルパー関数（複数キーワード対応）
const highlightText = (node: any, keywords: string[]): any => {
  if (keywords.length === 0) return node;

  if (typeof node === 'string') {
    // 複数キーワードを | で連結した正規表現を作成
    const escapedKeywords = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(${escapedKeywords.join('|')})`, 'gi');
    const parts = node.split(regex);

    return parts.map((part, i) => {
      const isMatch = keywords.some((k) => part.toLowerCase() === k.toLowerCase());
      return isMatch ? (
        <Box
          component="mark"
          key={i}
          sx={{ bgcolor: '#ffd600', color: '#000', px: '2px', borderRadius: '2px' }}
        >
          {part}
        </Box>
      ) : (
        part
      );
    });
  }

  if (Array.isArray(node)) {
    return node.map((child, i) => (
      <React.Fragment key={i}>{highlightText(child, keywords)}</React.Fragment>
    ));
  }

  return node;
};

export const Sidebar: React.FC = () => {
  const tree = useAtomValue(wikiTreeAtom);
  const selectedId = useAtomValue(selectedArticleIdAtom);
  const autoExpandedIds = useAtomValue(expandedItemIdsAtom);
  const [searchQuery, setSearchQuery] = useAtom(searchQueryAtom);
  const setArticles = useSetAtom(articlesAtom);
  const navigate = useNavigate();

  // 検索インデックス関連
  const searchIndex = useAtomValue(searchIndexAtom);
  const setSearchIndex = useSetAtom(setSearchIndexAtom);
  const setSearchIndexLoading = useSetAtom(setSearchIndexLoadingAtom);
  const resetSearchIndex = useSetAtom(resetSearchIndexAtom);

  // 検索状態
  const [searchResults, setSearchResults] = useState<Article[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [highlightKeywords, setHighlightKeywords] = useState<string[]>([]);

  // 検索ヘルプダイアログの状態
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);

  // ツリー最新化状態
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ユーザーが手動で開閉した状態を管理
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // コンテキストメニューの状態
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    path: string;
  } | null>(null);

  // 通知の状態
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // 検索実行（フロントエンドフィルタリング）
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setHighlightKeywords([]);
      return;
    }

    setIsSearching(true);
    try {
      // 検索インデックスがロードされていなければロード
      let indexArticles = searchIndex.articles;
      if (!searchIndex.isLoaded) {
        setSearchIndexLoading(true);
        indexArticles = await WikiService.loadSearchIndex();
        setSearchIndex(indexArticles);
      }

      // クエリをパース
      const parsed = parseSearchQuery(searchQuery);

      // フロントエンドでフィルタリング
      const results = filterArticles(indexArticles, parsed);
      setSearchResults(results);

      // ハイライト用キーワードを保存
      setHighlightKeywords(parsed.highlightTerms);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // 記事が選択されたとき、その親階層を自動で展開リストに追加する
  useEffect(() => {
    if (autoExpandedIds.length > 0) {
      setExpandedItems((prev) => {
        const newSet = new Set([...prev, ...autoExpandedIds]);
        return Array.from(newSet);
      });
    }
  }, [autoExpandedIds]);

  const handleExpandedItemsChange = (_event: React.SyntheticEvent | null, itemIds: string[]) => {
    setExpandedItems(itemIds);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setHighlightKeywords([]);
  };

  const handleCollapseAll = () => {
    setExpandedItems([]);
  };

  const handleRefreshTree = async () => {
    setIsRefreshing(true);
    try {
      const items = await WikiService.listArticles();
      setArticles(items);
      // 検索インデックスもリセット（次回検索時に再取得される）
      resetSearchIndex();
      setSnackbarMessage('ツリーを最新化しました');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Failed to refresh tree:', error);
      setSnackbarMessage('ツリーの最新化に失敗しました');
      setSnackbarOpen(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleContextMenu = (event: React.MouseEvent, path: string) => {
    event.preventDefault();
    setContextMenu(
      contextMenu === null
        ? {
            mouseX: event.clientX + 2,
            mouseY: event.clientY - 6,
            path,
          }
        : null,
    );
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleCopyPath = () => {
    if (contextMenu) {
      navigator.clipboard.writeText(contextMenu.path);
      setSnackbarMessage('パスをコピーしました');
      setSnackbarOpen(true);
      handleCloseContextMenu();
    }
  };

  const handleCloseSnackbar = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  const handleDragStart = (event: React.DragEvent, node: WikiNode) => {
    if (node.articleId) {
      // Wiki記事の情報をDataTransferに設定
      event.dataTransfer.setData('application/wiki-article', JSON.stringify({
        articleId: node.articleId,
        title: node.path,
      }));
      event.dataTransfer.effectAllowed = 'copy';
    }
  };

  const renderTree = (nodes: WikiNode[]) => {
    return nodes.map((node) => (
      <TreeItem
        key={node.id}
        itemId={node.id}
        label={
          <Box
            draggable={!!node.articleId}
            onDragStart={(e) => handleDragStart(e, node)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              p: 0.5,
              pr: 0,
              cursor: node.articleId ? 'grab' : 'default',
              '&:active': {
                cursor: node.articleId ? 'grabbing' : 'default',
              }
            }}
            onContextMenu={(e) => handleContextMenu(e, node.path)}
          >
            {node.type === 'folder' ? (
              node.articleId ? (
                <Tooltip title="フォルダ兼記事" arrow>
                  <FolderIcon
                    sx={{ mr: 1, color: 'warning.main' }}
                    fontSize="small"
                  />
                </Tooltip>
              ) : (
                <FolderIcon sx={{ mr: 1, color: 'primary.main' }} fontSize="small" />
              )
            ) : (
              <InsertDriveFileIcon sx={{ mr: 1, color: 'action.active' }} fontSize="small" />
            )}
            <Typography variant="body2" sx={{ fontWeight: 'inherit', flexGrow: 1 }}>
              {node.name}
            </Typography>
          </Box>
        }
        onClick={(e) => {
          // イベントの伝播を停止（親ノードへのバブリングを防ぐ）
          e.stopPropagation();
          // articleIdがあれば記事に遷移（フォルダ兼記事の場合も対応）
          // フォルダの展開/折りたたみはSimpleTreeViewが自動で処理する
          if (node.articleId) {
            navigate(`/wiki/${node.articleId}`);
          }
        }}
      >
        {Array.isArray(node.children) ? renderTree(node.children) : null}
      </TreeItem>
    ));
  };

  return (
    <Box sx={{
      width: '100%',
      height: '100%', // 明示的に高さを100%に
      display: 'flex',
      flexDirection: 'column',
      p: 2,
      overflow: 'hidden',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Wiki
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="ツリーを最新化">
            <IconButton
              size="small"
              onClick={handleRefreshTree}
              disabled={isRefreshing}
              sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="すべて折りたたむ">
            <IconButton
              size="small"
              onClick={handleCollapseAll}
            >
              <UnfoldLessIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 0.5 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Wikiを検索... (Enterで検索)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <IconButton size="small" onClick={handleSearch} sx={{ p: 0 }}>
                  <SearchIcon fontSize="small" color="action" />
                </IconButton>
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={handleClearSearch}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <Tooltip title="ツリーを最新化">
          <IconButton
            size="small"
            onClick={handleRefreshTree}
            disabled={isRefreshing}
            sx={{ display: { xs: 'inline-flex', sm: 'none' } }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="検索の使い方">
          <IconButton size="small" onClick={() => setHelpDialogOpen(true)}>
            <HelpOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Box sx={{
        flexGrow: 1,
        overflowY: 'auto',
        minHeight: 0, // Flexの子要素でスクロールを正しく機能させるために重要
        pr: 0.5,
      }}>
        {searchQuery.trim() ? (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ px: 1, mb: 1, display: 'block' }}>
              {isSearching ? '検索中...' : `検索結果: ${searchResults.length}件`}
            </Typography>
            <List dense>
              {searchResults.map((article) => (
                <ListItem key={article.articleId} disablePadding>
                  <ListItemButton
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/wiki-article', JSON.stringify({
                        articleId: article.articleId,
                        title: article.title,
                      }));
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    selected={selectedId === article.articleId}
                    onClick={() => {
                      navigate(`/wiki/${article.articleId}`);
                    }}
                    onContextMenu={(e) => handleContextMenu(e, article.title)}
                    sx={{
                      cursor: 'grab',
                      '&:active': {
                        cursor: 'grabbing',
                      }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <InsertDriveFileIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={highlightText(article.title.split('/').pop() || '', highlightKeywords)}
                      secondary={article.title.includes('/') ? highlightText(article.title, highlightKeywords) : null}
                      primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                      secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        ) : (
          <SimpleTreeView
            selectedItems={selectedId}
            expandedItems={expandedItems}
            onExpandedItemsChange={handleExpandedItemsChange}
          >
            {renderTree(tree)}
          </SimpleTreeView>
        )}
      </Box>

      {/* コンテキストメニュー */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={handleCopyPath}>パスをコピー</MenuItem>
      </Menu>

      {/* 通知 */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* 検索ヘルプダイアログ */}
      <SearchHelpDialog open={helpDialogOpen} onClose={() => setHelpDialogOpen(false)} />
    </Box>
  );
};
