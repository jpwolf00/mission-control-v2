import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us | ART Consulting - Let's Create Together",
  description: "Get in touch with ART Consulting. Schedule a consultation for art curation and installation services. We typically respond within 24 hours.",
  keywords: ["contact art consultant", "art consultation", "schedule art consultation", "NYC art advisor", "art installation inquiry"],
};

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid2';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import { Mail, Phone, MapPin, Send } from 'lucide-react';

export default function ContactPage() {
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
            Contact Us
          </Typography>
          <Typography
            variant="h2"
            sx={{ fontSize: { xs: '2rem', md: '2.75rem' }, fontWeight: 700, mt: 1, mb: 3 }}
          >
            Let's Create Something Beautiful
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.15rem', maxWidth: 600, lineHeight: 1.7 }}>
            Ready to transform your space with curated art? We'd love to hear from you. 
            Get in touch to schedule a consultation, and let's create something beautiful together.
          </Typography>
        </Container>
      </Box>

      {/* Contact Section */}
      <Box sx={{ py: { xs: 8, md: 10 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={6}>
            {/* Contact Info */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Typography variant="h4" fontWeight={600} gutterBottom>
                Get in Touch
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.7 }}>
                Whether you have a specific project in mind or just want to explore what's possible, 
                we're here to help.
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Box sx={{ 
                    width: 48, 
                    height: 48, 
                    borderRadius: 2, 
                    bgcolor: 'primary.light',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Mail size={24} color="#667eea" />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600}>
                      Email
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      info@artconsulting.com
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Box sx={{ 
                    width: 48, 
                    height: 48, 
                    borderRadius: 2, 
                    bgcolor: 'primary.light',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Phone size={24} color="#667eea" />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600}>
                      Phone
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      (555) 123-4567
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Box sx={{ 
                    width: 48, 
                    height: 48, 
                    borderRadius: 2, 
                    bgcolor: 'primary.light',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <MapPin size={24} color="#667eea" />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600}>
                      Location
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      New York, NY
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      (Available for on-site consultations)
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Location Placeholder */}
              <Box
                sx={{
                  mt: 4,
                  height: 200,
                  bgcolor: '#667eea',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <Typography variant="h6" sx={{ color: 'white', opacity: 0.7 }}>
                  Location Map
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
                  IMG-013: Contact - Location
                </Box>
              </Box>
            </Grid>

            {/* Contact Form */}
            <Grid size={{ xs: 12, md: 7 }}>
              <Card sx={{ p: 2 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h4" fontWeight={600} gutterBottom>
                    Send a Message
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                    Fill out the form below and we'll get back to you within 24 hours.
                  </Typography>

                  <form>
                    <Grid container spacing={3}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          label="First Name"
                          variant="outlined"
                          required
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          label="Last Name"
                          variant="outlined"
                          required
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth
                          label="Email"
                          type="email"
                          variant="outlined"
                          required
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth
                          label="Phone"
                          type="tel"
                          variant="outlined"
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth
                          label="Project Type"
                          select
                          SelectProps={{ native: true }}
                          variant="outlined"
                        >
                          <option value="">Select a project type</option>
                          <option value="residential">Residential</option>
                          <option value="commercial">Commercial</option>
                          <option value="other">Other</option>
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth
                          label="Message"
                          multiline
                          rows={6}
                          variant="outlined"
                          required
                          placeholder="Tell us about your project..."
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Button
                          type="submit"
                          variant="contained"
                          size="large"
                          endIcon={<Send size={18} />}
                          sx={{ 
                            fontWeight: 600,
                            px: 4,
                          }}
                        >
                          Send Message
                        </Button>
                      </Grid>
                    </Grid>
                  </form>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
}
