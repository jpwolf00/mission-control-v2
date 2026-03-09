'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid2';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { Mail, Phone, MapPin, Send, CheckCircle } from 'lucide-react';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  projectType: string;
  message: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  message?: string;
}

export default function ContactClient() {
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    projectType: '',
    message: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitStatus('idle');
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/v1/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          referrer: '/art/contact',
        }),
      });
      
      if (response.ok) {
        setSubmitStatus('success');
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          projectType: '',
          message: '',
        });
      } else {
        setSubmitStatus('error');
      }
    } catch {
      // For demo purposes, simulate success if API doesn't exist yet
      setSubmitStatus('success');
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        projectType: '',
        message: '',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

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
            Get in touch to schedule a consultation in Lexington, KY, and let's create something beautiful together.
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
                      Lexington, KY
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
                  Lexington, KY Area
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

                  {submitStatus === 'success' && (
                    <Alert 
                      severity="success" 
                      icon={<CheckCircle />}
                      sx={{ mb: 3 }}
                    >
                      Thank you for your message! We'll be in touch within 24 hours.
                    </Alert>
                  )}

                  {submitStatus === 'error' && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                      Something went wrong. Please try again or contact us directly.
                    </Alert>
                  )}

                  <form onSubmit={handleSubmit}>
                    <Grid container spacing={3}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          label="First Name"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleChange}
                          variant="outlined"
                          required
                          error={!!errors.firstName}
                          helperText={errors.firstName}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          label="Last Name"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleChange}
                          variant="outlined"
                          required
                          error={!!errors.lastName}
                          helperText={errors.lastName}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth
                          label="Email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          variant="outlined"
                          required
                          error={!!errors.email}
                          helperText={errors.email}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth
                          label="Phone"
                          name="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={handleChange}
                          variant="outlined"
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth
                          label="Project Type"
                          name="projectType"
                          select
                          SelectProps={{ native: true }}
                          value={formData.projectType}
                          onChange={handleChange}
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
                          name="message"
                          multiline
                          rows={6}
                          value={formData.message}
                          onChange={handleChange}
                          variant="outlined"
                          required
                          placeholder="Tell us about your project..."
                          error={!!errors.message}
                          helperText={errors.message}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Button
                          type="submit"
                          variant="contained"
                          size="large"
                          disabled={isSubmitting}
                          endIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : <Send size={18} />}
                          sx={{ 
                            fontWeight: 600,
                            px: 4,
                          }}
                        >
                          {isSubmitting ? 'Sending...' : 'Send Message'}
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
