import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Box, Typography, CircularProgress, useTheme, IconButton, Tooltip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';

interface MermaidProps {
  chart: string;
  isFullPage?: boolean;
}

const Mermaid: React.FC<MermaidProps> = ({ chart, isFullPage = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const theme = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    // Mermaidの初期化
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      themeVariables: {
        fontSize: '14px',
        fontFamily: 'Noto Sans JP, sans-serif',
        textColor: '#333',
        mainBkg: '#fff',
        nodeBorder: '#333',
        lineColor: '#333',
      },
      securityLevel: 'loose',
    });

    const renderChart = async () => {
      if (!chart) return;

      setLoading(true);
      setError(null);

      try {
        // ユニークなIDを生成
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

        // mermaid.renderを使用してSVGを生成
        const { svg: renderedSvg } = await mermaid.render(id, chart);

        // SVGタグの属性を調整して拡大縮小しやすくする
        const adjustedSvg = renderedSvg
          .replace(/width=".*?"/, 'width="100%"')
          .replace(/height=".*?"/, '') // SVGのheight属性に"auto"は無効なため削除
          .replace(/style=".*?"/, 'style="max-width: 100%; height: auto;"');

        setSvg(adjustedSvg);
      } catch (err: any) {
        console.error('Mermaid render error:', err);
        setError('図のレンダリングに失敗しました。構文を確認してください。');
      } finally {
        setLoading(false);
      }
    };

    renderChart();
  }, [chart]);

  const handleOpenFullView = () => {
    // チャート内容をBase64エンコード（Unicode対応）
    const encodedChart = btoa(encodeURIComponent(chart));
    navigate(`/mermaid-view?chart=${encodedChart}`);
  };

  if (error) {
    return (
      <Box sx={{ p: 2, border: '1px solid', borderColor: 'error.main', borderRadius: 1, my: 2 }}>
        <Typography color="error" variant="body2">
          {error}
        </Typography>
        <Box component="pre" sx={{ mt: 1, fontSize: '0.8rem', opacity: 0.7 }}>
          {chart}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{
      position: 'relative',
      my: isFullPage ? 0 : 2,
      height: isFullPage ? '100%' : 'auto',
      borderRadius: isFullPage ? 0 : 1,
      border: isFullPage ? 'none' : '1px solid',
      borderColor: 'divider',
      bgcolor: theme.palette.mode === 'light' ? '#f5f5f5' : '#787878',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      '&:hover .mermaid-controls': {
        opacity: 1,
      },
      // SVG内部のテキスト色指定
      '& svg': {
        '& text': { fill: '#333 !important' },
        '& span, & div': { color: '#333 !important' },
      },
    }}>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <TransformWrapper
          initialScale={1}
          minScale={0.5}
          maxScale={5}
          centerOnInit
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              {/* コントロールボタン */}
              <Box
                className="mermaid-controls"
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  zIndex: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5,
                  opacity: 0.6,
                  transition: 'opacity 0.2s',
                  backgroundColor: 'rgba(255, 255, 255, 0.4)',
                  borderRadius: 1,
                  p: 0.5,
                  backdropFilter: 'blur(2px)',
                }}
              >
                <Tooltip title="拡大" placement="left">
                  <IconButton size="small" onClick={() => zoomIn()}>
                    <ZoomInIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="縮小" placement="left">
                  <IconButton size="small" onClick={() => zoomOut()}>
                    <ZoomOutIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="リセット" placement="left">
                  <IconButton size="small" onClick={() => resetTransform()}>
                    <RestartAltIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                {!isFullPage && (
                  <Tooltip title="専用ビューで開く" placement="left">
                    <IconButton size="small" onClick={handleOpenFullView}>
                      <OpenInFullIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>

              {/* ヘルプメッセージ（ホバー時のみ） */}
              <Box sx={{
                position: 'absolute',
                bottom: 8,
                left: 8,
                zIndex: 1,
                opacity: 0.5,
                pointerEvents: 'none',
              }}>
                <Typography variant="caption" sx={{ color: '#333', fontSize: '0.7rem' }}>
                  スクロールで拡大縮小 / ドラッグで移動
                </Typography>
              </Box>

              <TransformComponent
                wrapperStyle={{
                  width: '100%',
                  height: isFullPage ? '100%' : 'auto',
                  minHeight: isFullPage ? 'none' : '300px',
                  cursor: 'grab',
                  flexGrow: 1,
                }}
                contentStyle={{
                  width: '100%',
                  height: isFullPage ? '100%' : 'auto',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: isFullPage ? '20px' : '40px',
                }}
              >
                <div
                  ref={containerRef}
                  dangerouslySetInnerHTML={{ __html: svg }}
                  style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
                />
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
      )}
    </Box>
  );
};

export default Mermaid;
