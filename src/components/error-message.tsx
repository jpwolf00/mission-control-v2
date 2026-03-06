'use client';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({
  title = "Error",
  message,
  onRetry,
}: ErrorMessageProps) {
  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" gap={2} p={4}>
      <Alert severity="error" sx={{ maxWidth: 480, width: '100%' }}>
        <AlertTitle>{title}</AlertTitle>
        {message}
      </Alert>
      {onRetry && (
        <Button onClick={onRetry} variant="outlined">
          Retry
        </Button>
      )}
    </Box>
  );
}
