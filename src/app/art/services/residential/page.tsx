import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Residential Art Consulting | Home Art Curation in NYC | ART Consulting",
  description: "Transform your home with our residential art consulting services. Personalized curation, professional installation, and art rotation programs for New York homeowners.",
  keywords: ["residential art consulting", "home art curation", "private residence art", "NYC home art consultant", "art for homes"],
};

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid2';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Link from 'next/link';
import { Check, ArrowRight } from 'lucide-react';

const features = [
  {
    title: 'In-Home Consultation',
    description: 'We visit your space to understand the architecture, lighting, existing decor, and your personal style before recommending any artwork.',
  },
  {
    title: 'Custom Art Sourcing',
    description: 'Access to thousands of pieces from galleries and artists worldwide, including original works, limited editions, and rare prints.',
  },
  {
    title: 'Professional Installation',
    description: 'Our team handles everything from hardware selection to precise hanging, ensuring your art is displayed beautifully and safely for generations.',
  },
  {
    title: 'Art Rotation Program',
    description: 'Keep your spaces fresh with our art rotation program, allowing you to swap pieces seasonally or whenever you crave a change.',
  },
];

const process = [
  { step: '1', title: 'Initial Consultation', description: 'We discuss your style, preferences, and budget.' },
  { step: '2', title: 'Space Assessment', description: 'We visit your home to evaluate lighting and layout.' },
  { step: '3', title: 'Curated Selection', description: 'We present personalized art options for your review.' },
  { step: '4', title: 'Installation', description: 'Professional installation completes your transformed space.' },
];

export default function ResidentialServicesPage() {
  return (
    <Box>
      {/* Hero */}
      <Box
        sx={{
          py: { xs: 8, md: 12 },
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid size={{ xs: 12, md: 7 }}>
              <Typography
                variant="overline"
                sx={{ color: 'primary.main', fontWeight: 600, letterSpacing: 2 }}
              >
                Residential Services
              </Typography>
              <Typography
                variant="h2"
                sx={{ fontSize: { xs: '2rem', md: '2.75rem' }, fontWeight: 700, mt: 1, mb: 3 }}
              >
                Transform Your Home with Curated Art
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.15rem', lineHeight: 1.7, mb: 4 }}>
                Your home is your sanctuary, and the art within it should reflect your unique personality 
                and style. We work with homeowners to select and install artwork that transforms living 
                spaces into personal galleries that you'll love coming home to.
              </Typography>
              <Button
                component={Link}
                href="/art/contact"
                variant="contained"
                size="large"
                endIcon={<ArrowRight size={18} />}
                sx={{ fontWeight: 600 }}
              >
                Schedule Consultation
              </Button>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Box
                sx={{
                  height: 350,
                  bgcolor: '#667eea',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <Typography variant="h4" sx={{ color: 'white', fontWeight: 600, opacity: 0.5 }}>
                  Residential
                </Typography>
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 16,
                    right: 16,
                    bgcolor: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    px: 2,
                    py: 1,
                    borderRadius: 1,
                    fontSize: '0.75rem',
                  }}
                >
                  IMG-003: Services - Residential
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features */}
      <Box sx={{ py: { xs: 8, md: 10 } }}>
        <Container maxWidth="lg">
          <Typography variant="h3" sx={{ fontSize: '2rem', fontWeight: 700, mb: 6, textAlign: 'center' }}>
            What We Offer
          </Typography>
          <Grid container spacing={4}>
            {features.map((feature) => (
              <Grid size={{ xs: 12, sm: 6 }} key={feature.title}>
                <Card sx={{ height: '100%', p: 3 }}>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    {feature.description}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Process */}
      <Box sx={{ py: { xs: 8, md: 10 }, bgcolor: 'background.paper' }}>
        <Container maxWidth="lg">
          <Typography variant="h3" sx={{ fontSize: '2rem', fontWeight: 700, mb: 6, textAlign: 'center' }}>
            Our Process
          </Typography>
          <Grid container spacing={3}>
            {process.map((item) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={item.step}>
                <Card sx={{ height: '100%', textAlign: 'center', p: 3 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '1.25rem',
                      mx: 'auto',
                      mb: 2,
                    }}
                  >
                    {item.step}
                  </Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.description}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    </Box>
  );
}
