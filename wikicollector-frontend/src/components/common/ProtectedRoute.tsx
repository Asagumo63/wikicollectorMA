import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAtom } from 'jotai';
import { authAtom } from '../../atoms/authAtoms';
import { AuthService } from '../../services/authService';
import { Box, CircularProgress } from '@mui/material';

export const ProtectedRoute: React.FC = () => {
  const [auth, setAuth] = useAtom(authAtom);

  useEffect(() => {
    const checkAuthentication = async () => {
      if (!auth.isAuthenticated && auth.isLoading) {
        const user = await AuthService.getCurrentUser();
        const isAuthenticated = await AuthService.checkAuth();
        setAuth({
          user,
          isAuthenticated,
          isLoading: false,
        });
      }
    };
    checkAuthentication();
  }, [auth.isAuthenticated, auth.isLoading, setAuth]);

  if (auth.isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
