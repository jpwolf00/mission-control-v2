'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid2';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

const allProjects = [
  {
    id: '1',
    title: 'Modern Lexington Home',
    category: 'Residential',
    location: 'Lexington, KY',
    description: 'A complete art curation for a luxury Lexington home, featuring contemporary works from emerging artists.',
    imageId: 'IMG-009',
    placeholderColor: '#667eea',
  },
  {
    id: '2',
    title: 'Georgetown Estate',
    category: 'Residential',
    location: 'Georgetown, KY',
    description: 'Art selection and installation for a restored Georgetown estate, blending classic and contemporary pieces.',
    imageId: 'IMG-010',
    placeholderColor: '#764ba2',
  },
  {
    id: '3',
    title: 'Corporate Office Tower',
    category: 'Commercial',
    location: 'Lexington, KY',
    description: 'Comprehensive art program for a corporate headquarters, creating a sophisticated work environment.',
    imageId: 'IMG-011',
    placeholderColor: '#667eea',
  },
  {
    id: '4',
    title: 'Downtown Hotel',
    category: 'Commercial',
    location: 'Lexington, KY',
    description: 'Statement art installations for a boutique hotel lobby and common areas, creating a distinctive guest experience.',
    imageId: 'IMG-012',
    placeholderColor: '#764ba2',
  },
];

export default function ProjectsClient() {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const filteredProjects = tabValue === 0 
    ? allProjects 
    : allProjects.filter(p => p.category.toLowerCase() === (tabValue === 1 ? 'residential' : 'commercial'));

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
            Our Portfolio
          </Typography>
          <Typography
            variant="h2"
            sx={{ fontSize: { xs: '2rem', md: '2.75rem' }, fontWeight: 700, mt: 1, mb: 3 }}
          >
            Featured Projects
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.15rem', maxWidth: 600, lineHeight: 1.7 }}>
            Explore our collection of residential and commercial art installations in Lexington, KY. 
            Each project reflects our commitment to transforming spaces through curated art 
            that tells a compelling story.
          </Typography>
        </Container>
      </Box>

      {/* Filter Tabs */}
      <Box sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        <Container maxWidth="lg">
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            sx={{
              '& .MuiTab-root': {
                fontWeight: 600,
                textTransform: 'none',
                fontSize: '1rem',
              }
            }}
          >
            <Tab label="All Projects" />
            <Tab label="Residential" />
            <Tab label="Commercial" />
          </Tabs>
        </Container>
      </Box>

      {/* Projects Grid */}
      <Box sx={{ py: { xs: 8, md: 10 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            {filteredProjects.map((project) => (
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
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {project.location}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {project.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {filteredProjects.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" color="text.secondary">
                No projects found in this category.
              </Typography>
            </Box>
          )}
        </Container>
      </Box>
    </Box>
  );
}
