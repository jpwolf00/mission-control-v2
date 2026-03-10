import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us | ART Home Systems Lexington KY - Our Story & Approach",
  description: "Learn about ART Home Systems's mission to transform spaces through thoughtful home technology in Lexington, KY. Meet our team of expert curators and installation specialists serving Central Kentucky.",
  keywords: ["home systems Lexington KY", "about art consultant Lexington", "home technology team Kentucky", "Lexington art consultants", "art installation experts Lexington"],
};

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid2';
import Card from '@mui/material/Card';

const teamMembers = [
  {
    name: 'Sarah Mitchell',
    role: 'Founder & Principal Curator',
    imageId: 'IMG-005',
    placeholderColor: '#667eea',
  },
  {
    name: 'James Chen',
    role: 'Art Director',
    imageId: 'IMG-006',
    placeholderColor: '#764ba2',
  },
  {
    name: 'Emily Rodriguez',
    role: 'Senior Installation Specialist',
    imageId: 'IMG-007',
    placeholderColor: '#667eea',
  },
];

export default function AboutPage() {
  return (
    <Box>
      {/* Hero Section */}
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
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography
                variant="overline"
                sx={{ color: 'primary.main', fontWeight: 600, letterSpacing: 2 }}
              >
                About Us
              </Typography>
              <Typography
                variant="h2"
                sx={{ fontSize: { xs: '2rem', md: '2.75rem' }, fontWeight: 700, mt: 1, mb: 3 }}
              >
                Bringing Art to Life
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.1rem', lineHeight: 1.8 }}>
                Founded in 2015, ART Home Systems has been transforming residential and commercial 
                spaces through thoughtful home technology and professional installation services. What started 
                as a passion project has grown into one of New York's most trusted home systems practices.
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.1rem', lineHeight: 1.8, mt: 2 }}>
                We believe that art has the power to transform not just spaces, but lives. 
                Our team works closely with each client to understand their vision and bring 
                it to reality with carefully selected pieces from artists around the world. Every 
                project is an opportunity to create something truly meaningful.
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box
                sx={{
                  height: 400,
                  bgcolor: '#667eea',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <Typography variant="h4" sx={{ color: 'white', fontWeight: 600, opacity: 0.5 }}>
                  Studio Image
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
                  IMG-008: Studio Interior
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Values Section */}
      <Box sx={{ py: { xs: 8, md: 10 } }}>
        <Container maxWidth="lg">
          <Typography variant="h3" sx={{ fontSize: '2rem', fontWeight: 700, mb: 6, textAlign: 'center' }}>
            Our Approach
          </Typography>
          <Grid container spacing={4}>
            {[
              {
                title: 'Personalized Curation',
                description: 'Every space is unique. We take the time to understand your style, preferences, and the story you want to tell through art. No templates—just bespoke selections.',
              },
              {
                title: 'Quality Artists',
                description: 'We work with a curated network of established and emerging artists, ensuring each piece meets our high standards for craftsmanship and emotional resonance.',
              },
              {
                title: 'Professional Installation',
                description: 'Our installation team ensures every piece is displayed safely and beautifully, with careful attention to lighting, placement, and environmental factors.',
              },
            ].map((value, index) => (
              <Grid size={{ xs: 12, md: 4 }} key={index}>
                <Card sx={{ height: '100%', p: 3, bgcolor: 'background.default' }}>
                  <Typography variant="h5" fontWeight={600} gutterBottom>
                    {value.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    {value.description}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Team Section */}
      <Box sx={{ py: { xs: 8, md: 10 }, bgcolor: 'background.paper' }}>
        <Container maxWidth="lg">
          <Typography variant="h3" sx={{ fontSize: '2rem', fontWeight: 700, mb: 6, textAlign: 'center' }}>
            Meet Our Team
          </Typography>
          <Grid container spacing={4} justifyContent="center">
            {teamMembers.map((member) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={member.name}>
                <Card sx={{ height: '100%' }}>
                  <Box
                    sx={{
                      height: 300,
                      bgcolor: member.placeholderColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    <Typography variant="h4" sx={{ color: 'white', fontWeight: 600, opacity: 0.5 }}>
                      {member.name.split(' ')[0]}
                    </Typography>
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
                      {member.imageId}
                    </Box>
                  </Box>
                  <Card sx={{ p: 3, bgcolor: 'grey.50' }}>
                    <Typography variant="h6" fontWeight={600}>
                      {member.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {member.role}
                    </Typography>
                  </Card>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    </Box>
  );
}
