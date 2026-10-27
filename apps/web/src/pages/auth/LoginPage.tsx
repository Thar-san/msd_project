import React, { useState } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginInput } from '@compilo/shared';
import { Button, IconButton, InputAdornment, Link, Stack, TextField, Typography } from '@mui/material';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import { useAuth } from '../../context/AuthContext';
import { AuthShell } from '../../components/common/AuthShell';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setSubmitting(true);
    try {
      const loggedUser = await login(data);
      if (location.state?.from?.pathname) {
        navigate(location.state.from.pathname, { replace: true });
      } else if (loggedUser?.role === 'admin' || loggedUser?.role === 'superadmin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch {
      // Handled in AuthContext
    } finally {
      setSubmitting(false);
    }
  };

  // Demo shortcut: fills the seeded admin account from .env.example
  const fillAdminCredentials = () => {
    setValue('email', 'admin@compilolearn.com');
    setValue('password', 'Admin@123456');
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue your Go learning path.">
      <Stack component="form" spacing={2.5} onSubmit={handleSubmit(onSubmit)} noValidate>
        <Button
          variant="outlined"
          color="secondary"
          startIcon={<AdminPanelSettingsOutlinedIcon />}
          onClick={fillAdminCredentials}
          sx={{ color: 'text.primary' }}
        >
          Auto-fill Demo Admin Credentials
        </Button>

        <TextField
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          {...register('email')}
          error={!!errors.email}
          helperText={errors.email?.message}
          slotProps={{
            inputLabel: { shrink: true },
            input: { startAdornment: <InputAdornment position="start"><MailOutlineRoundedIcon fontSize="small" /></InputAdornment> },
          }}
        />

        <TextField
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          {...register('password')}
          error={!!errors.password}
          helperText={errors.password?.message}
          slotProps={{
            inputLabel: { shrink: true },
            input: {
              startAdornment: <InputAdornment position="start"><LockOutlinedIcon fontSize="small" /></InputAdornment>,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility">
                    {showPassword ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />

        <Link component={RouterLink} to="/forgot-password" variant="body2" sx={{ alignSelf: 'flex-end' }}>
          Forgot password?
        </Link>

        <Button type="submit" variant="contained" size="large" disabled={submitting}>
          {submitting ? 'Signing in...' : 'Sign In'}
        </Button>

        <Typography variant="body2" color="text.secondary" textAlign="center">
          Don't have an account?{' '}
          <Link component={RouterLink} to="/register" fontWeight={700}>Register now</Link>
        </Typography>
      </Stack>
    </AuthShell>
  );
};
