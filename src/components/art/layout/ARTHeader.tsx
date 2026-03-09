'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { Palette } from 'lucide-react';

const artNavItems = [
  { href: '/art', label: 'Home' },
  { href: '/art/about', label: 'About' },
  { href: '/art/services', label: 'Services' },
  { href: '/art/projects', label: 'Projects' },
  { href: '/art/updates', label: 'Updates' },
  { href: '/art/contact', label: 'Contact' },
];

export function ARTHeader() {
  const pathname = usePathname();

  return (
    <AppBar 
      position="static" 
      elevation={0}
      sx={{ 
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          <Link href="/art" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Palette size={28} color="#667eea" />
            <Typography 
              variant="h5" 
              fontWeight="bold" 
              component="span"
              sx={{ color: 'text.primary', letterSpacing: '-0.02em' }}
            >
              ART
            </Typography>
            <Typography 
              variant="h5" 
              fontWeight={300} 
              component="span"
              sx={{ color: 'text.secondary' }}
            >
              Consulting
            </Typography>
          </Link>
          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ display: 'flex', gap: 1 }}>
            {artNavItems.map(({ href, label }) => {
              const isActive = pathname === href || (href !== '/art' && pathname.startsWith(href));
              return (
                <Button
                  key={href}
                  component={Link}
                  href={href}
                  sx={{
                    color: isActive ? 'primary.main' : 'text.secondary',
                    fontWeight: isActive ? 600 : 400,
                    fontSize: '0.95rem',
                    px: 2,
                    '&:hover': { 
                      color: 'primary.main',
                      bgcolor: 'action.hover'
                    },
                  }}
                >
                  {label}
                </Button>
              );
            })}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
