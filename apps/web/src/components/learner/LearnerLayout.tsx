import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined';
import CodeRoundedIcon from '@mui/icons-material/CodeRounded';
import FolderSpecialOutlinedIcon from '@mui/icons-material/FolderSpecialOutlined';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useCourseCopyPasteProtection } from '../../hooks/useCourseCopyPasteProtection';
import { Header } from '../common/Header';
import { Footer } from '../common/Footer';
import { BrandLogo } from '../common/ui';

const DRAWER_WIDTH = 256;
const DRAWER_COLLAPSED = 76;

const navItems = [
  { label: 'Overview', path: '/dashboard', icon: <DashboardOutlinedIcon /> },
  { label: 'Curriculum', path: '/courses', icon: <MenuBookOutlinedIcon /> },
  { label: 'Learning Path', path: '/courses/go-programming/learning-path', icon: <ExploreOutlinedIcon /> },
  { label: 'Coding Practice', path: '/practice', icon: <CodeRoundedIcon /> },
  { label: 'Capstone Project', path: '/projects', icon: <FolderSpecialOutlinedIcon /> },
  { label: 'My Certificates', path: '/certificates', icon: <WorkspacePremiumOutlinedIcon /> },
  { label: 'Settings', path: '/settings', icon: <SettingsOutlinedIcon /> },
];

export const LearnerLayout: React.FC = () => {
  const { user, isAdmin, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null);
  const [userAnchor, setUserAnchor] = useState<null | HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const isCourseRoute =
    location.pathname.startsWith('/courses') ||
    location.pathname.startsWith('/learn') ||
    location.pathname.startsWith('/practice');

  useCourseCopyPasteProtection({
    enabled: isCourseRoute,
    message: 'Copy and paste are not allowed in courses. Please practice by typing code manually.',
  });

  const publicRoutes = ['/', '/login', '/register', '/forgot-password'];
  const isPublicRoute = publicRoutes.includes(location.pathname) || location.pathname.startsWith('/verify');
  // Only the lesson reader and the code editor use the distraction-free full-screen layout
  const isFocusedLearnRoute = /^\/learn\/[^/]+\/(lesson|assignment)\//.test(location.pathname);

  // Public pages (and any page a logged-out visitor can open): marketing header + footer
  if (isPublicRoute || !isAuthenticated) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header />
        <Box component="main" sx={{ flex: 1 }}>
          <Outlet />
        </Box>
        <Footer />
      </Box>
    );
  }

  // Lesson / coding pages: distraction-free full screen
  if (isFocusedLearnRoute) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </Box>
    );
  }

  const isActive = (path: string) => {
    if (path === '/courses') return location.pathname === '/courses';
    return location.pathname.startsWith(path);
  };

  const go = (path: string) => {
    setMobileOpen(false);
    setUserAnchor(null);
    navigate(path);
  };

  const handleLogout = async () => {
    setUserAnchor(null);
    await logout();
    navigate('/login');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/courses?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const drawerContent = (isCollapsed: boolean) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ minHeight: 72, px: 2.5 }}>
        <BrandLogo to="/dashboard" compact={isCollapsed} />
      </Toolbar>
      <Divider />
      <List sx={{ px: 1.5, py: 2, flex: 1 }}>
        {navItems.map((item) => (
          <Tooltip key={item.path} title={isCollapsed ? item.label : ''} placement="right">
            <ListItemButton
              selected={isActive(item.path)}
              onClick={() => go(item.path)}
              sx={{ mb: 0.5, justifyContent: isCollapsed ? 'center' : 'flex-start' }}
            >
              <ListItemIcon sx={{ minWidth: isCollapsed ? 0 : 40 }}>{item.icon}</ListItemIcon>
              {!isCollapsed && (
                <ListItemText primary={item.label} slotProps={{ primary: { fontSize: 14, fontWeight: 600 } }} />
              )}
            </ListItemButton>
          </Tooltip>
        ))}
      </List>
      <Box sx={{ p: 1.5 }}>
        {isAdmin && (
          <Button
            fullWidth
            variant="contained"
            color="secondary"
            onClick={() => go('/admin/dashboard')}
            sx={{ mb: 1, minWidth: 0, px: isCollapsed ? 0 : 2 }}
            startIcon={isCollapsed ? undefined : <AdminPanelSettingsOutlinedIcon />}
          >
            {isCollapsed ? <AdminPanelSettingsOutlinedIcon /> : 'Admin Console'}
          </Button>
        )}
        <IconButton
          onClick={() => setCollapsed(!collapsed)}
          sx={{ display: { xs: 'none', md: 'flex' }, mx: 'auto' }}
          aria-label="Collapse sidebar"
        >
          {collapsed ? <ChevronRightRoundedIcon /> : <ChevronLeftRoundedIcon />}
        </IconButton>
      </Box>
    </Box>
  );

  const width = collapsed ? DRAWER_COLLAPSED : DRAWER_WIDTH;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: (t) => (t.palette.mode === 'dark' ? 'background.default' : '#F8F6FD') }}>
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
      >
        {drawerContent(false)}
      </Drawer>

      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width, transition: 'width .2s', overflowX: 'hidden', borderRight: 1, borderColor: 'divider' },
        }}
      >
        {drawerContent(collapsed)}
      </Drawer>

      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <AppBar
          position="sticky"
          sx={{ bgcolor: (t) => alpha(t.palette.background.paper, 0.9), backdropFilter: 'blur(10px)', borderBottom: 1, borderColor: 'divider' }}
        >
          <Toolbar sx={{ minHeight: 72, gap: 2 }}>
            <IconButton onClick={() => setMobileOpen(true)} sx={{ display: { md: 'none' } }} aria-label="Open menu">
              <MenuRoundedIcon />
            </IconButton>

            <Box component="form" onSubmit={handleSearchSubmit} sx={{ width: 340, display: { xs: 'none', sm: 'block' } }}>
              <TextField
                placeholder="Search curriculum, modules, lessons..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                slotProps={{
                  input: {
                    sx: { borderRadius: 999 },
                    startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment>,
                  },
                }}
              />
            </Box>

            <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: 'auto' }}>
              <IconButton onClick={(e) => setNotifAnchor(e.currentTarget)} aria-label="Notifications">
                <Badge color="secondary" variant="dot">
                  <NotificationsNoneRoundedIcon />
                </Badge>
              </IconButton>
              <Menu
                anchorEl={notifAnchor}
                open={Boolean(notifAnchor)}
                onClose={() => setNotifAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{ paper: { sx: { width: 300, mt: 1, borderRadius: 3, p: 1 } } }}
              >
                <Typography fontWeight={700} sx={{ px: 1.5, py: 1 }}>Notifications</Typography>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: (t) => alpha(t.palette.primary.main, 0.08), mb: 1 }}>
                  <Typography variant="body2" fontWeight={700} color="primary">Module 1 Ready to Study</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Getting Started with Go is unlocked on your roadmap.
                  </Typography>
                </Box>
                <Box sx={{ p: 1.5, borderRadius: 2 }}>
                  <Typography variant="body2" fontWeight={700}>Real Compiler Active</Typography>
                  <Typography variant="caption" color="text.secondary">
                    The Go runner is online for all coding assignments.
                  </Typography>
                </Box>
              </Menu>

              <IconButton onClick={toggleTheme} aria-label="Toggle theme">
                {theme === 'dark' ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
              </IconButton>

              <Button
                onClick={(e) => setUserAnchor(e.currentTarget)}
                color="inherit"
                sx={{ pl: 1, pr: { xs: 1, sm: 2 }, gap: 1 }}
              >
                <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 14 }}>
                  {user?.name.charAt(0).toUpperCase() || 'U'}
                </Avatar>
                <Box sx={{ textAlign: 'left', display: { xs: 'none', sm: 'block' } }}>
                  <Typography variant="body2" fontWeight={700} lineHeight={1.2}>{user?.name || 'Learner'}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                    {user?.role || 'learner'}
                  </Typography>
                </Box>
              </Button>
              <Menu
                anchorEl={userAnchor}
                open={Boolean(userAnchor)}
                onClose={() => setUserAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{ paper: { sx: { width: 220, mt: 1, borderRadius: 3 } } }}
              >
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography fontWeight={700} noWrap>{user?.name}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap component="p">{user?.email}</Typography>
                </Box>
                <Divider />
                <MenuItem onClick={() => go('/dashboard')}>
                  <ListItemIcon><DashboardOutlinedIcon fontSize="small" /></ListItemIcon>Dashboard
                </MenuItem>
                <MenuItem onClick={() => go('/settings')}>
                  <ListItemIcon><SettingsOutlinedIcon fontSize="small" /></ListItemIcon>Settings
                </MenuItem>
                {isAdmin && (
                  <MenuItem onClick={() => go('/admin/dashboard')}>
                    <ListItemIcon><AdminPanelSettingsOutlinedIcon fontSize="small" /></ListItemIcon>Admin Console
                  </MenuItem>
                )}
                <Divider />
                <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                  <ListItemIcon><LogoutRoundedIcon fontSize="small" color="error" /></ListItemIcon>Sign Out
                </MenuItem>
              </Menu>
            </Stack>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ flex: 1 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};
