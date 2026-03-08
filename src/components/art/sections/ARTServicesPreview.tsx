'use client';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid2';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Button from '@mui/material/Button';
import Link from 'next/link';
import { Home, Building2, ArrowRight } from 'lucide-react';

const services = [
  {
    id: 'residential',
    title: 'Residential',
    description: 'Transform your home with curated artwork that reflects your personal style and enhances your living spaces.',
    icon: Home,
    href: '/art/services/residential',
    placeholderColor: '#667eea',
    imageId: 'IMG-003',
  },
  {
    id: 'commercial',
    title: 'Commercial',
    description: 'Create impactful environments for offices, hotels, and retail spaces with professional art curation.',
    icon: Building2,
    href: '/art/services/commercial',
    placeholderColor: '#764ba2',
    imageId: 'IMG-004',
  },
];

export function ARTServicesPreview() {
  return (
    <Box sx={{ py: { xs: 6, md: 10 }, bgcolor: 'background.default' }}>
      <Container maxWidth="xl">
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography
            variant="overline"
            sx={{ color: 'primary.main', fontWeight: 600, letterSpacing: 2 }}
          >
            What We Do
          </Typography>
          <Typography
            variant="h2"
            sx={{ fontSize: { xs: '2rem', md: '2.5rem' }, fontWeight: 700, mt: 1 }}
          >
            Our Services
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ maxWidth: 600, mx: 'auto', mt: 2 }}
          >
            From private residences to corporate headquarters, we help clients discover and install artwork that transforms their spaces and tells their story.
          </Typography>
        </Box>

        <Grid container spacing={4} justifyContent="center">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={service.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 6,
                    },
                  }}
                >
                  {/* Placeholder Image */}
                  <Box
                    sx={{
                      height: 200,
                      bgcolor: service.placeholderColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    <Icon size={48} color="white" />
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 8,
                        right: 8,
                        bgcolor: 'rgba(0,0,0,0.5)',
                        color: 'white',
                        px: 1,
                        py: 0.5,
                        borderRadius: 0.5,
                        fontSize: '0.65rem',
                      }}
                    >
                      {service.imageId}
                    </Box>
                  </Box>
                  <CardContent sx={{ flexGrow: 1, p: 3 }}>
                    <Typography variant="h5" fontWeight={600} gutterBottom>
                      {service.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.7 }}>
                      {service.description}
                    </Typography>
                    <Button
                      component={Link}
                      href={service.href}
                      endIcon={<ArrowRight size={16} />}
                      sx={{ fontWeight: 600 }}
                    >
                      Learn More
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        <Box sx={{ textAlign: 'center', mt: 6 }}>
          <Button
            component={Link}
            href="/art/services"
            variant="outlined"
            size="large"
            sx={{ px: 4 }}
          >
            View All Services
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
