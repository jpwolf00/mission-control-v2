'use client';

import Link from 'next/link';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid2';
import LinkMUI from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import { Palette, Mail, Phone, MapPin, Facebook } from 'lucide-react';

const footerSections = [
  {
    title: 'Services',
    links: [
      { href: '/art/services/residential', label: 'Residential' },
      { href: '/art/services/commercial', label: 'Commercial' },
      { href: '/art/services', label: 'All Services' },
    ]
  },
  {
    title: 'Company',
    links: [
      { href: '/art/about', label: 'About Us' },
      { href: '/art/projects', label: 'Projects' },
      { href: '/art/faq', label: 'FAQ' },
      { href: '/art/contact', label: 'Contact' },
    ]
  }
];

export function ARTFooter() {
  return (
    <Box 
      component="footer" 
      sx={{ 
        bgcolor: 'background.paper',
        borderTop: '1px solid',
        borderColor: 'divider',
        py: 6,
        mt: 'auto'
      }}
    >
      <Container maxWidth="xl">
        <Grid container spacing={4}>
          {/* Brand Column */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Palette size={24} color="#667eea" />
              <Typography variant="h6" fontWeight="bold">
                ART Consulting
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 280 }}>
              Premium art consulting and installation services for residential and commercial spaces. 
              Transforming environments through curated art.
            </Typography>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Mail size={16} color="#667eea" />
                <Typography variant="body2" color="text.secondary">
                  info@artconsulting.com
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Phone size={16} color="#667eea" />
                <Typography variant="body2" color="text.secondary">
                  (555) 123-4567
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MapPin size={16} color="#667eea" />
                <Typography variant="body2" color="text.secondary">
                  New York, NY
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <IconButton
                  component="a"
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  size="small"
                  sx={{ 
                    color: 'text.secondary',
                    '&:hover': { color: 'primary.main' }
                  }}
                >
                  <Facebook size={20} />
                </IconButton>
              </Box>
            </Stack>
          </Grid>

          {/* Link Sections */}
          {footerSections.map((section) => (
            <Grid size={{ xs: 6, md: 2 }} key={section.title}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                {section.title}
              </Typography>
              <Stack spacing={1.5}>
                {section.links.map((link) => (
                  <LinkMUI
                    key={link.href}
                    component={Link}
                    href={link.href}
                    underline="hover"
                    color="text.secondary"
                    sx={{ 
                      fontSize: '0.875rem',
                      '&:hover': { color: 'primary.main' }
                    }}
                  >
                    {link.label}
                  </LinkMUI>
                ))}
              </Stack>
            </Grid>
          ))}
        </Grid>

        {/* Bottom Bar */}
        <Box 
          sx={{ 
            borderTop: '1px solid',
            borderColor: 'divider',
            mt: 4,
            pt: 3,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2
          }}
        >
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} ART Consulting. All rights reserved.
          </Typography>
          <Box sx={{ display: 'flex', gap: 3 }}>
            <LinkMUI href="#" underline="hover" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
              Privacy Policy
            </LinkMUI>
            <LinkMUI href="#" underline="hover" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
              Terms of Service
            </LinkMUI>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
