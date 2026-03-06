'use client';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="400px" gap={2}>
      <Alert severity="error" sx={{ maxWidth: 480 }}>
        <AlertTitle>Something went wrong</AlertTitle>
        {error.message}
      </Alert>
      <Button onClick={reset} variant="outlined">
        Try again
      </Button>
    </Box>
  );
}
