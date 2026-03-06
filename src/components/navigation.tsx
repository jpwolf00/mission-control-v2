'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import { Rocket, LayoutDashboard, Kanban, GitBranch } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/stories', label: 'Dev Board', icon: Kanban },
  { href: '/deploy', label: 'Deploy', icon: GitBranch },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <AppBar position="static" elevation={0}>
      <Toolbar>
        <Link href="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Rocket size={24} />
          <Typography variant="h6" fontWeight="bold" component="span">
            Mission Control
          </Typography>
        </Link>
        <Box sx={{ flexGrow: 1 }} />
        {navItems.map(({ href, label, icon: Icon }) => (
          <Button
            key={href}
            component={Link}
            href={href}
            startIcon={<Icon size={16} />}
            sx={{
              color: pathname === href ? 'primary.main' : 'text.secondary',
              fontWeight: pathname === href ? 600 : 400,
              '&:hover': { color: 'text.primary' },
            }}
          >
            {label}
          </Button>
        ))}
      </Toolbar>
    </AppBar>
  );
}
