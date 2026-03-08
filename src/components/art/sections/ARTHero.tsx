'use client';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid2';
import Link from 'next/link';

export function ARTHero() {
  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: { xs: 500, md: 650 },
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        bgcolor: 'grey.900',
      }}
    >
      {/* Primary Hero Background - Placeholder */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          opacity: 0.9,
        }}
      />
      
      {/* Overlay Pattern */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255,255,255,0.08) 0%, transparent 40%)
          `,
        }}
      />

      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
        <Grid container spacing={4} alignItems="center">
          <Grid size={{ xs: 12, md: 7 }}>
            <Typography
              variant="h1"
              sx={{
                color: 'white',
                fontSize: { xs: '2.5rem', md: '3.5rem' },
                fontWeight: 700,
                lineHeight: 1.2,
                mb: 3,
                letterSpacing: '-0.02em',
              }}
            >
              Where Art Meets{' '}
              <Box component="span" sx={{ color: '#fbbf24' }}>
                Exceptional Living
              </Box>
            </Typography>
            <Typography
              variant="h5"
              sx={{
                color: 'rgba(255,255,255,0.85)',
                fontWeight: 300,
                fontSize: { xs: '1.1rem', md: '1.25rem' },
                mb: 4,
                maxWidth: 500,
                lineHeight: 1.6,
              }}
            >
              We transform residential and commercial spaces through 
              thoughtful art curation and professional installation.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                component={Link}
                href="/art/services"
                variant="contained"
                size="large"
                sx={{
                  bgcolor: 'white',
                  color: '#667eea',
                  fontWeight: 600,
                  px: 4,
                  py: 1.5,
                  '&:hover': {
                    bgcolor: 'grey.100',
                  },
                }}
              >
                Explore Services
              </Button>
              <Button
                component={Link}
                href="/art/contact"
                variant="outlined"
                size="large"
                sx={{
                  borderColor: 'rgba(255,255,255,0.5)',
                  color: 'white',
                  fontWeight: 600,
                  px: 4,
                  py: 1.5,
                  '&:hover': {
                    borderColor: 'white',
                    bgcolor: 'rgba(255,255,255,0.1)',
                  },
                }}
              >
                Get in Touch
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* Label for placeholder */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          bgcolor: 'rgba(0,0,0,0.6)',
          color: 'white',
          px: 2,
          py: 1,
          borderRadius: 1,
          fontSize: '0.75rem',
        }}
      >
        IMG-001: Homepage Hero (Placeholder)
      </Box>
    </Box>
  );
}
