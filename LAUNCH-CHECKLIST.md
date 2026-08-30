# 2D Creation launch checklist

Implemented in this package: Privacy Policy, Terms, FAQ with structured data, branded 404, thank-you page, robots.txt, sitemap.xml, canonical URLs, page-specific titles and descriptions, complete Open Graph/Twitter metadata on every HTML page, a 1200×630 social image, favicon, Organization schema, accessible skip links, footer legal navigation, image alt text, responsive layouts, reduced-motion support, connected contact links, honeypot protection, HTTPS URLs, and Google Analytics 4 using measurement ID `G-W3P1LD9WVC`.

Before launch, the site owner or hosting administrator must:

- Upload every file in this folder to the public web root for `https://2dcreation.in/`.
- Activate the FormSubmit recipient by submitting once and confirming the email sent to `karthick@2dcreation.in`.
- Add a real GA4 Measurement ID only after creating the GA4 property. Connect it to the existing consent event; do not invent an ID.
- Create and upload a final 1200×630 `og-image.jpg` if replacing the included product image.
- Configure HTTP-to-HTTPS and preferred-host 301 redirects at the server/CDN.
- Configure security headers at the server/CDN: Content-Security-Policy, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and frame protection.
- Verify the domain in Google Search Console and submit `https://2dcreation.in/sitemap.xml`.
- After deployment, open Google Analytics → Reports → Realtime and confirm a visit appears. Google notes that initial data collection can take up to 30 minutes.
- Confirm SPF, DKIM, and DMARC with the domain email provider.
- Configure automated off-site backups and test restoration.
- Run final live tests in Chrome, Edge, Firefox, Safari, Android Chrome, and iPhone Safari.
- Run Lighthouse/PageSpeed on the live domain and verify LCP, INP, CLS, console errors, redirects, caching, compression, and CDN behavior.
- Confirm all business facts, certification claims, legal wording, and contact details with the business owner or legal adviser.
