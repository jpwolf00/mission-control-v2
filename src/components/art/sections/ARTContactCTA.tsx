'use client';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid2';
import Link from 'next/link';

export function ARTContactCTA() {
  return (
    <Box
      sx={{
        py: { xs: 6, md: 10 },
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background Pattern */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            radial-gradient(circle at 10% 90%, rgba(102, 126, 234, 0.15) 0%, transparent 40%),
            radial-gradient(circle at 90% 10%, rgba(118, 75, 162, 0.15) 0%, transparent 40%)
          `,
        }}
      />

      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography
            variant="overline"
            sx={{ color: '#fbbf24', fontWeight: 600, letterSpacing: 2 }}
          >
            Let's Create Together
          </Typography>
          <Typography
            variant="h2"
            sx={{ 
              fontSize: { xs: '2rem', md: '2.75rem' }, 
              fontWeight: 700, 
              mt: 1,
              color: 'white',
              maxWidth: 600,
              mx: 'auto',
            }}
          >
            Ready to Transform Your Space?
          </Typography>
          <Typography
            variant="body1"
            sx={{ 
              color: 'rgba(255,255,255,0.7)', 
              maxWidth: 500, 
              mx: 'auto', 
              mt: 3,
              fontSize: '1.1rem',
              lineHeight: 1.7,
            }}
          >
            Whether you're furnishing a new home or designing a corporate space, we'd love to help bring your vision to life.
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 4, flexWrap: 'wrap' }}>
            <Button
              component={Link}
              href="/art/contact"
              variant="contained"
              size="large"
              id="cta-primary"
              sx={{
                bgcolor: '#fbbf24',
                color: '#1a1a2e',
                fontWeight: 600,
                px: 5,
                py: 1.5,
                '&:hover': {
                  bgcolor: '#f59e0b',
                },
              }}
            >
              Start Your Project
            </Button>
            <Button
              component={Link}
              href="/art/services"
              variant="outlined"
              size="large"
              id="cta-secondary"
              sx={{
                borderColor: 'rgba(255,255,255,0.4)',
                color: 'white',
                fontWeight: 600,
                px: 5,
                py: 1.5,
                '&:hover': {
                  borderColor: 'white',
                  bgcolor: 'rgba(255,255,255,0.1)',
                },
              }}
            >
              Explore Services
            </Button>
          </Box>
        </Box>
      </Container>

      {/* Placeholder Label */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          bgcolor: 'rgba(0,0,0,0.4)',
          color: 'white',
          px: 2,
          py: 1,
          borderRadius: 1,
          fontSize: '0.75rem',
        }}
      >
        IMG-014: Homepage CTA (Placeholder)
      </Box>
    </Box>
  );
}
