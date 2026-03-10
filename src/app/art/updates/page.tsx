import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "News & Updates | ART Home Systems",
  description: "Stay informed about the latest art trends, project showcases, and company news from ART Home Systems.",
  keywords: ["home systems news", "art trends", "ART Home Systems updates", "art installation news"],
};

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid2';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';
import Link from 'next/link';

const updates = [
  {
    id: '1',
    title: '5 Art Trends Shaping Modern Interiors in 2026',
    excerpt: 'From sustainable art pieces to digital installations, discover the trends that are transforming how we think about art in our living and working spaces.',
    date: 'March 5, 2026',
    category: 'Trends',
    imageId: 'IMG-014',
    placeholderColor: '#667eea',
  },
  {
    id: '2',
    title: 'Behind the Project: Modern Tribeca Loft',
    excerpt: 'Take an exclusive look at how we curated a complete art collection for this stunning Tribeca residence, blending contemporary works with classic pieces.',
    date: 'February 28, 2026',
    category: 'Project Showcase',
    imageId: 'IMG-015',
    placeholderColor: '#764ba2',
  },
  {
    id: '3',
    title: 'ART Home Systems Expands to Hotel & Hospitality Sector',
    excerpt: 'We are thrilled to announce our expansion into the hotel and hospitality sector, bringing our expertise in home technology to create memorable guest experiences.',
    date: 'February 15, 2026',
    category: 'Company News',
    imageId: 'IMG-016',
    placeholderColor: '#667eea',
  },
  {
    id: '4',
    title: 'The Art of Lighting: Creating the Perfect Display',
    excerpt: 'Expert tips on how proper lighting can transform your art collection, from natural light management to gallery-style illumination systems.',
    date: 'January 30, 2026',
    category: 'Guides',
    imageId: 'IMG-017',
    placeholderColor: '#764ba2',
  },
];

export default function UpdatesPage() {
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
            News & Updates
          </Typography>
          <Typography
            variant="h2"
            sx={{ fontSize: { xs: '2rem', md: '2.75rem' }, fontWeight: 700, mt: 1, mb: 3 }}
          >
            Insights & Inspiration
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.15rem', maxWidth: 600, lineHeight: 1.7 }}>
            Stay informed about the latest art trends, project showcases, and company news 
            from ART Home Systems. We share our expertise and passion for home technology 
            to inspire your next project.
          </Typography>
        </Container>
      </Box>

      {/* Updates Grid */}
      <Box sx={{ py: { xs: 8, md: 10 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            {updates.map((update) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={update.id}>
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
                  <CardActionArea sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                    {/* Placeholder Image */}
                    <Box
                      sx={{
                        height: 200,
                        bgcolor: update.placeholderColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                      }}
                    >
                      <Typography variant="h4" sx={{ color: 'white', fontWeight: 600, opacity: 0.5 }}>
                        {update.category}
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
                        {update.imageId}
                      </Box>
                    </Box>
                    <CardContent sx={{ flexGrow: 1, p: 3 }}>
                      <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>
                        {update.category} • {update.date}
                      </Typography>
                      <Typography variant="h6" fontWeight={600} gutterBottom sx={{ mt: 1 }}>
                        {update.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {update.excerpt}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>

          {updates.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" color="text.secondary">
                No updates yet. Check back soon!
              </Typography>
            </Box>
          )}
        </Container>
      </Box>
    </Box>
  );
}
