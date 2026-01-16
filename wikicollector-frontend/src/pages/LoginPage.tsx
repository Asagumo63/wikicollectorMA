import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetAtom } from 'jotai';
import { authAtom } from '../atoms/authAtoms';
import { AuthService } from '../services/authService';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needPasswordChange, setNeedPasswordChange] = useState(false);
  const setAuth = useSetAtom(authAtom);
  const navigate = useNavigate();

  const handleLoginSuccess = async () => {
    // ユーザーグループのチェック
    const groups = await AuthService.getUserGroups();
    const hasPermission = groups.some(group =>
      group.includes('Administrators') || group.includes('GeneralUsers')
    );

    if (!hasPermission) {
      await AuthService.signOut();
      throw new Error('このアプリを利用する権限がありません。管理者に問い合わせてください。');
    }

    const user = await AuthService.getCurrentUser();
    setAuth({
      user,
      isAuthenticated: true,
      isLoading: false,
    });
    navigate('/');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      try {
        await AuthService.signOut();
      } catch (e) { /* ignore */ }

      const result = await AuthService.signIn(username, password);

      if (result.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        setNeedPasswordChange(true);
        setLoading(false);
        return;
      }

      if (result.isSignedIn) {
        await handleLoginSuccess();
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(
        err.message === 'User does not exist.'
          ? 'ユーザー名またはパスワードが正しくありません。'
          : err.message || 'ログインに失敗しました'
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('パスワードが一致しません。');
      return;
    }

    setLoading(true);
    try {
      const result = await AuthService.confirmNewPassword(newPassword);
      if (result.isSignedIn) {
        await handleLoginSuccess();
      }
    } catch (err: any) {
      console.error('New password error:', err);
      setError(`パスワードの変更に失敗しました。\n詳細: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        backgroundColor: 'background.default',
        pt: 8,
      }}
    >
      <Card sx={{ maxWidth: 450, mx: { xs: 2, sm: 3 }, width: '100%' }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Box sx={{ textAlign: 'center', mb: { xs: 3, sm: 4 } }}>
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{
                fontWeight: 700,
                fontSize: { xs: '1.5rem', sm: '2rem' },
              }}
            >
              wikiコレクション
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {needPasswordChange
                ? '初回ログインのため、パスワードを変更してください'
                : 'ログインしてください'}
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3, whiteSpace: 'pre-wrap' }}>
              {error}
            </Alert>
          )}

          {needPasswordChange ? (
            <form onSubmit={handlePasswordChange}>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>パスワードの条件:</strong><br />
                  - 6文字以上<br />
                  - 大文字、小文字、数字、特殊文字を含む
                </Typography>
              </Alert>
              <TextField
                fullWidth
                label="新しいパスワード"
                type="password"
                variant="outlined"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="パスワードの確認"
                type="password"
                variant="outlined"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                sx={{ mb: 3 }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ py: 1.5 }}
              >
                {loading ? <CircularProgress size={24} /> : 'パスワードを変更'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleLogin}>
              <TextField
                fullWidth
                label="ユーザー名"
                variant="outlined"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="パスワード"
                type="password"
                variant="outlined"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                sx={{ mb: 3 }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ py: 1.5 }}
              >
                {loading ? <CircularProgress size={24} /> : 'ログイン'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
