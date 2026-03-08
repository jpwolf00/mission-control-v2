'use client';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid2';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

// Featured project data - shows a sample of our best work on homepage
const projects = [
  {
    id: '1',
    title: 'Modern Tribeca Loft',
    category: 'Residential',
    location: 'Manhattan, NY',
    imageId: 'IMG-009',
    placeholderColor: '#667eea',
  },
  {
    id: '2',
    title: 'Financial Services HQ',
    category: 'Commercial',
    location: 'Midtown, NY',
    imageId: 'IMG-011',
    placeholderColor: '#764ba2',
  },
];

export function ARTProjectsPreview() {
  return (
    <Box sx={{ py: { xs: 6, md: 10 }, bgcolor: 'background.paper' }}>
      <Container maxWidth="xl">
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography
            variant="overline"
            sx={{ color: 'primary.main', fontWeight: 600, letterSpacing: 2 }}
          >
            Our Work
          </Typography>
          <Typography
            variant="h2"
            sx={{ fontSize: { xs: '2rem', md: '2.5rem' }, fontWeight: 700, mt: 1 }}
          >
            Featured Projects
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ maxWidth: 600, mx: 'auto', mt: 2 }}
          >
            Explore our portfolio of residential and commercial installations, each one a unique expression of space, style, and storytelling.
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {projects.map((project) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={project.id}>
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
                    height: 240,
                    bgcolor: project.placeholderColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  <Typography variant="h4" sx={{ color: 'white', fontWeight: 600, opacity: 0.5 }}>
                    {project.category}
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
                    {project.imageId}
                  </Box>
                </Box>
                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                  <Typography variant="overline" sx={{ color: 'primary.main' }}>
                    {project.category}
                  </Typography>
                  <Typography variant="h5" fontWeight={600} gutterBottom>
                    {project.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {project.location}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ textAlign: 'center', mt: 6 }}>
          <Button
            component={Link}
            href="/art/projects"
            variant="contained"
            size="large"
            endIcon={<ArrowRight size={18} />}
            sx={{ px: 4 }}
          >
            View All Projects
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
