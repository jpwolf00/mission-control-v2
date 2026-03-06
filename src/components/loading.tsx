'use client';

import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <Box display="flex" alignItems="center" justifyContent="center" className={className}>
      <CircularProgress />
    </Box>
  );
}

export function PageLoader() {
  return (
    <Box display="flex" alignItems="center" justifyContent="center" height="calc(100vh - 4rem)">
      <CircularProgress />
    </Box>
  );
}
