import React, { useState, useEffect } from 'react';
import { useAtomValue, useAtom } from 'jotai';
import { useNavigate } from 'react-router-dom';
import { wikiTreeAtom, selectedArticleIdAtom, expandedItemIdsAtom, searchQueryAtom } from '../../atoms/wikiAtoms';
import type { WikiNode, Article } from '../../types/index';
import { WikiService } from '../../services/wikiService';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { Box, Typography, Divider, TextField, InputAdornment, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Tooltip, Menu, MenuItem, Snackbar, Alert } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';

// テキスト内のキーワードをハイライトするヘルパー関数
const highlightText = (node: any, query: string): any => {
  if (!query.trim()) return node;

  if (typeof node === 'string') {
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const parts = node.split(regex);

    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <Box component="mark" key={i} sx={{ bgcolor: '#ffd600', color: '#000', px: '2px', borderRadius: '2px' }}>
          {part}
        </Box>
      ) : part
    );
  }

  if (Array.isArray(node)) {
    return node.map((child, i) => (
      <React.Fragment key={i}>{highlightText(child, query)}</React.Fragment>
    ));
  }

  return node;
};

export const Sidebar: React.FC = () => {
  const tree = useAtomValue(wikiTreeAtom);
  const selectedId = useAtomValue(selectedArticleIdAtom);
  const autoExpandedIds = useAtomValue(expandedItemIdsAtom);
  const [searchQuery, setSearchQuery] = useAtom(searchQueryAtom);
  const navigate = useNavigate();

  // 検索状態
  const [searchResults, setSearchResults] = useState<Article[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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

  // 検索実行
  const handleSearch = async () => {
    if (searchQuery.trim()) {
      setIsSearching(true);
      try {
        const results = await WikiService.searchArticles(searchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsSearching(false);
      }
    } else {
      setSearchResults([]);
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
  };

  const handleCollapseAll = () => {
    setExpandedItems([]);
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

  const renderTree = (nodes: WikiNode[]) => {
    return nodes.map((node) => (
      <TreeItem
        key={node.id}
        itemId={node.id}
        label={
          <Box
            sx={{ display: 'flex', alignItems: 'center', p: 0.5, pr: 0 }}
            onContextMenu={(e) => handleContextMenu(e, node.path)}
          >
            {node.type === 'folder' ? (
              <FolderIcon sx={{ mr: 1, color: 'primary.main' }} fontSize="small" />
            ) : (
              <InsertDriveFileIcon sx={{ mr: 1, color: 'action.active' }} fontSize="small" />
            )}
            <Typography variant="body2" sx={{ fontWeight: 'inherit', flexGrow: 1 }}>
              {node.name}
            </Typography>
          </Box>
        }
        onClick={() => {
          if (node.type === 'file' && node.articleId) {
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
        <Tooltip title="すべて折りたたむ">
          <IconButton
            size="small"
            onClick={handleCollapseAll}
            sx={{ ml: 1 }}
          >
            <UnfoldLessIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <TextField
        fullWidth
        size="small"
        placeholder="Wikiを検索... (Enterで検索)"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        sx={{ mb: 2 }}
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
                    selected={selectedId === article.articleId}
                    onClick={() => {
                      navigate(`/wiki/${article.articleId}`);
                    }}
                    onContextMenu={(e) => handleContextMenu(e, article.title)}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <InsertDriveFileIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={highlightText(article.title.split('/').pop() || '', searchQuery)}
                      secondary={article.title.includes('/') ? highlightText(article.title, searchQuery) : null}
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
          パスをコピーしました
        </Alert>
      </Snackbar>
    </Box>
  );
};
