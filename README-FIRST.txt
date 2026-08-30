2D CREATION — PERFORMANCE-OPTIMIZED WEBSITE

OPENING THE WEBSITE
OPTION 1 — QUICK PREVIEW WITHOUT EXTRACTING
1. Open the ZIP.
2. Double-click OPEN-THIS-FIRST.html.
3. This preview contains its images and Poppins fonts inside the HTML, so it
   also works when Windows opens it from a temporary ZIP folder.

OPTION 2 — PRODUCTION WEBSITE
1. Right-click the downloaded ZIP and select "Extract All".
2. Open the newly extracted folder.
3. Double-click index.html.
4. Always upload index.html together with every image, CSS, font and supporting
   file from the extracted folder.

Do not open index.html directly from inside the ZIP. Windows extracts only the
HTML file to a temporary folder in that situation, so its relative image paths
cannot find the image files and blank cards are displayed.

IMAGE VERIFICATION
- All 17 homepage images remain included: 7 certification logos and 10 garment
  photographs.
- The original image files, pixels and compression are unchanged. Mobile images
  are centred with contain sizing so the complete garments remain visible.
- The 17 homepage image files are placed beside index.html and
  OPEN-THIS-FIRST.html. These root-level paths avoid the missing nested-folder
  URLs that previously returned HTTP 404 responses after deployment.
- Upload index.html together with all 17 embedded-*.webp files. Do not deploy
  OPEN-THIS-FIRST.html as the homepage; it is only the self-contained preview.

FORM TESTING
The FormSubmit enquiry form cannot submit from a local file:// page. Test the
form on the published website at https://2dcreation.in/.

IMAGE-PREVIEW.jpg is included so you can confirm the garment photographs and
certification logos without opening the website.
