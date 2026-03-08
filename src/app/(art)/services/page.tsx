import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Services - ART Consulting",
  description: "Explore our art consulting and installation services for residential and commercial spaces. From curation to hanging, we handle everything.",
};

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid2';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Link from 'next/link';
import { Home, Building2, ArrowRight, Check } from 'lucide-react';

const services = [
  {
    title: 'Residential Art Consulting',
    description: 'We help homeowners discover and select artwork that complements their living spaces, reflecting their personal style and creating welcoming environments.',
    icon: Home,
    href: '/art/services/residential',
    placeholderColor: '#667eea',
  },
  {
    title: 'Commercial Art Solutions',
    description: 'From corporate offices to hotels and retail spaces, we create memorable environments that enhance brand identity and inspire employees and customers.',
    icon: Building2,
    href: '/art/services/commercial',
    placeholderColor: '#764ba2',
  },
];

const benefits = [
  'Personalized art selection based on your style and preferences',
  'Access to exclusive artwork from curated artist networks',
  'Professional installation with attention to lighting and placement',
  'Art care and maintenance guidance',
  'Flexible consultation options - in-person or virtual',
  'Post-installation follow-up to ensure your complete satisfaction',
];

export default function ServicesPage() {
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
          <Typography
            variant="overline"
            sx={{ color: 'primary.main', fontWeight: 600, letterSpacing: 2 }}
          >
            Our Services
          </Typography>
          <Typography
            variant="h2"
            sx={{ fontSize: { xs: '2rem', md: '2.75rem' }, fontWeight: 700, mt: 1, mb: 3 }}
          >
            Comprehensive Art Solutions
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.15rem', maxWidth: 700, lineHeight: 1.7 }}>
            We offer end-to-end art consulting and installation services for both residential 
            and commercial clients. Whether you're furnishing a new home or redesigning 
            corporate spaces, our team brings expertise and passion to every project.
          </Typography>
        </Container>
      </Box>

      {/* Service Cards */}
      <Box sx={{ py: { xs: 8, md: 10 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <Grid size={{ xs: 12, md: 6 }} key={service.title}>
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
                    <Box
                      sx={{
                        height: 200,
                        bgcolor: service.placeholderColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={64} color="white" />
                    </Box>
                    <CardContent sx={{ flexGrow: 1, p: 4 }}>
                      <Typography variant="h4" fontWeight={600} gutterBottom>
                        {service.title}
                      </Typography>
                      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.7 }}>
                        {service.description}
                      </Typography>
                      <Button
                        component={Link}
                        href={service.href}
                        endIcon={<ArrowRight size={18} />}
                        variant="contained"
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
        </Container>
      </Box>

      {/* Why Choose Us */}
      <Box sx={{ py: { xs: 8, md: 10 }, bgcolor: 'background.paper' }}>
        <Container maxWidth="lg">
          <Typography variant="h3" sx={{ fontSize: '2rem', fontWeight: 700, mb: 6, textAlign: 'center' }}>
            Why Work With Us
          </Typography>
          <Grid container spacing={3}>
            {benefits.map((benefit) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={benefit}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <Check size={20} color="#667eea" style={{ marginTop: 4 }} />
                  <Typography variant="body1" color="text.secondary">
                    {benefit}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    </Box>
  );
}
