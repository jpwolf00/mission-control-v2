import type { Metadata } from "next";
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Grid from '@mui/material/Grid2';
import Link from 'next/link';
import Button from '@mui/material/Button';
import ArrowRight from '@mui/icons-material/ArrowRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

export const metadata: Metadata = {
  title: "FAQ | Frequently Asked Questions | ART Consulting Lexington KY",
  description: "Answers to common questions about art consulting services in Lexington, KY. Learn about costs, service areas, timelines, and how we help residential and commercial clients.",
  keywords: ["art consultant FAQ Lexington", "Lexington art consultation cost", "art installation Lexington KY", "FAQ art consulting Kentucky"],
};

const faqs = [
  {
    question: "How much does art consultation cost in Lexington?",
    answer: "Our initial consultation typically starts at $500 for residential projects. This includes a space assessment, style discussion, and preliminary recommendations. For commercial projects, we offer customized pricing based on scope and scale. We also provide project-based and hourly consultation options to fit various budgets.",
  },
  {
    question: "What areas do you serve in Kentucky?",
    answer: "We proudly serve Lexington and the surrounding areas including Georgetown, Nicholasville, Richmond, Winchester, and the greater Lexington-Fayette metropolitan area. We also travel to surrounding counties for larger commercial projects. Contact us to discuss your specific location.",
  },
  {
    question: "How long does art installation take?",
    answer: "Timeline varies by project scope. Small residential installations typically take 1-2 days. Larger residential projects or commercial installations can take 1-3 weeks depending on the number of pieces, custom framing needs, and installation complexity. We'll provide a detailed timeline during consultation.",
  },
  {
    question: "Do you work with commercial clients in Lexington?",
    answer: "Absolutely! We have extensive experience with corporate offices, hotels, restaurants, retail spaces, and other commercial properties in Lexington. We understand the unique needs of businesses and can create art programs that enhance brand identity, impress clients, and inspire employees.",
  },
  {
    question: "Can you help with art selection for new construction homes?",
    answer: "Yes, we love working with homeowners and builders on new construction projects. We can collaborate with your interior designer or work directly with you to select art that complements your home's architecture and design from the beginning, ensuring proper lighting and placement considerations are built in.",
  },
  {
    question: "What is included in your art installation service?",
    answer: "Our installation service includes hardware selection, precise hanging, level adjustment, lighting optimization, and final positioning. We handle all aspects of installation including wall anchors, specialized mounting for heavy pieces, and placement consultation to ensure optimal viewing and aesthetic impact.",
  },
  {
    question: "Do you offer art framing services?",
    answer: "Yes, we partner with professional framers in the Lexington area to provide custom framing services. We help you select frames that complement both the artwork and your space, ensuring a polished final presentation that protects your investment.",
  },
  {
    question: "How do I get started with art consultation?",
    answer: "Simply contact us through our form or call us directly. We'll schedule an initial consultation to discuss your vision, preferences, and budget. From there, we'll provide recommendations and a proposal for moving forward with your art project.",
  },
];

export default function FAQPage() {
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
            Help & Support
          </Typography>
          <Typography
            variant="h2"
            sx={{ fontSize: { xs: '2rem', md: '2.75rem' }, fontWeight: 700, mt: 1, mb: 3 }}
          >
            Frequently Asked Questions
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.15rem', maxWidth: 700, lineHeight: 1.7 }}>
            Find answers to common questions about our art consulting and installation services 
            in Lexington, KY. Can't find what you're looking for? Get in touch!
          </Typography>
        </Container>
      </Box>

      {/* FAQ Accordion */}
      <Box sx={{ py: { xs: 8, md: 10 } }}>
        <Container maxWidth="md">
          <Grid container spacing={2}>
            {faqs.map((faq, index) => (
              <Grid size={{ xs: 12 }} key={index}>
                <Accordion
                  sx={{
                    '&:before': { display: 'none' },
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    borderRadius: '8px !important',
                    mb: 1,
                    '&.Mui-expanded': { mb: 1 },
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                      '& .MuiAccordionSummary-content': { my: 2 },
                    }}
                  >
                    <Typography variant="h6" fontWeight={600} sx={{ pr: 2 }}>
                      {faq.question}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0, pb: 3 }}>
                    <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                      {faq.answer}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              </Grid>
            ))}
          </Grid>

          {/* Contact CTA */}
          <Box sx={{ mt: 8, textAlign: 'center' }}>
            <Typography variant="h5" fontWeight={600} gutterBottom>
              Still Have Questions?
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
              We're here to help! Reach out to discuss your specific art consulting needs.
            </Typography>
            <Button
              component={Link}
              href="/art/contact"
              variant="contained"
              size="large"
              endIcon={<ArrowRight />}
              sx={{ fontWeight: 600 }}
            >
              Contact Us
            </Button>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
