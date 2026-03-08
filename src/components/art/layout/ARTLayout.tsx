'use client';

import React from 'react';
import Box from '@mui/material/Box';
import { ARTHeader } from './ARTHeader';
import { ARTFooter } from './ARTFooter';

interface ARTLayoutProps {
  children: React.ReactNode;
}

/**
 * ART Website Layout Wrapper
 * 
 * Provides consistent header, footer, and container for all ART website pages.
 * Uses the same ThemeRegistry context from the parent app.
 */
export function ARTLayout({ children }: ARTLayoutProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        bgcolor: '#fafafa'
      }}
    >
      <ARTHeader />
      <Box component="main" sx={{ flexGrow: 1 }}>
        {children}
      </Box>
      <ARTFooter />
    </Box>
  );
}
