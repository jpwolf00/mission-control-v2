import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Commercial Art Consulting - Corporate & Hospitality",
  description: "Elevate your business with professional art consulting. Corporate offices, hotels, retail spaces—create environments that inspire.",
};

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid2';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const sectors = [
  {
    title: 'Corporate Offices',
    description: 'Create inspiring work environments that boost employee morale and impress clients with carefully curated art collections.',
  },
  {
    title: 'Hotels & Hospitality',
    description: 'Transform guest experiences with distinctive art that reinforces your brand identity and creates memorable atmospheres.',
  },
  {
    title: 'Retail Spaces',
    description: 'Enhance customer engagement and brand perception with art installations that draw attention and create unique shopping experiences.',
  },
  {
    title: 'Restaurants',
    description: 'Set the mood and enhance dining experiences with art that complements your cuisine and creates distinctive ambiances.',
  },
];

const benefits = [
  'Boost employee productivity and morale with inspiring environments',
  'Create memorable experiences for clients and guests',
  'Reinforce brand identity through curated art selections',
  'Stand out from competitors with distinctive spaces',
  'Increase property value with professional art installations',
  'Ongoing maintenance and art rotation services available',
];

export default function CommercialServicesPage() {
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
                Commercial Services
              </Typography>
              <Typography
                variant="h2"
                sx={{ fontSize: { xs: '2rem', md: '2.75rem' }, fontWeight: 700, mt: 1, mb: 3 }}
              >
                Elevate Your Business with Art
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.15rem', lineHeight: 1.7, mb: 4 }}>
                The art in your commercial space speaks volumes about your brand. We help businesses 
                create impactful environments that inspire employees, impress clients, and reinforce 
                brand identity through thoughtful art curation.
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
                  bgcolor: '#764ba2',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <Typography variant="h4" sx={{ color: 'white', fontWeight: 600, opacity: 0.5 }}>
                  Commercial
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
                  IMG-004: Services - Commercial
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Sectors */}
      <Box sx={{ py: { xs: 8, md: 10 } }}>
        <Container maxWidth="lg">
          <Typography variant="h3" sx={{ fontSize: '2rem', fontWeight: 700, mb: 2, textAlign: 'center' }}>
            Industries We Serve
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 6, textAlign: 'center', maxWidth: 600, mx: 'auto' }}>
            We have experience curating art for a wide range of commercial spaces.
          </Typography>
          <Grid container spacing={4}>
            {sectors.map((sector) => (
              <Grid size={{ xs: 12, sm: 6 }} key={sector.title}>
                <Card sx={{ height: '100%', p: 3 }}>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    {sector.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    {sector.description}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Benefits */}
      <Box sx={{ py: { xs: 8, md: 10 }, bgcolor: 'background.paper' }}>
        <Container maxWidth="lg">
          <Typography variant="h3" sx={{ fontSize: '2rem', fontWeight: 700, mb: 6, textAlign: 'center' }}>
            Business Benefits
          </Typography>
          <Grid container spacing={3}>
            {benefits.map((benefit) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={benefit}>
                <Typography variant="body1" color="text.secondary">
                  • {benefit}
                </Typography>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    </Box>
  );
}
