import axios from 'axios';
import JSZip from 'jszip';
import { removeAlignments } from './helpers/UsfmFileConversionHelper';

// Step 1: Parse URL Parameters
const params = new URLSearchParams(window.location.search);
const owner = params.get('owner');
const repo = params.get('repo');
const ref = params.get('ref');
const spinner = document.getElementById('spinner');
const statusElement = document.getElementById('status');

if (!owner || !repo || !ref) {
  spinner.textContent = 'You must have ?owner=<owner>&repo=<repo>&ref=<ref> in the URL';
} else {
  const dcsZipUrl = `https://git.door43.org/${owner}/${repo}/archive/${ref}.zip`;

  // Step 2: Fetch Zip File from DCS
  axios
    .get(dcsZipUrl, { responseType: 'blob' })
    .then((response) => JSZip.loadAsync(response.data)) // Step 3: Load Zip File with JSZip
    .then((zip) => {
      const newZip = new JSZip();
      const filePromises = [];
      let count = 0;
      const total = zip.filter((path) => path.endsWith('.usfm')).length;
      if (! total) {
        spinner.textContent = 'No USFM files found in the given repo';
        throw new Error('No USFM files found');
      }

      zip.forEach((relativePath, file) => {
        if (relativePath.endsWith('.usfm')) {
          // Step 4: Process `.usfm` Files
          const filePromise = file.async('string').then((content) => {
            console.log(`Processing ${owner}/` + relativePath);
            const unalignedUsfm = removeAlignments(content);
            newZip.file(relativePath, unalignedUsfm);
            count++;
            statusElement.textContent = `Removed alignments from file ${count} of ${total}`;
          });
          filePromises.push(filePromise);
        }
      });
      return Promise.all(filePromises).then(() => newZip);
    })
    .then((newZip) => newZip.generateAsync({ type: 'blob' })) // Step 5: Generate Modified Zip File
    .then((blob) => {
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${owner}--${repo}--${ref}--unaligned-usfm.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (spinner) {
        spinner.textContent = 'Done. Zip file sent.';
      }
    })
    .catch((error) => console.error('Error processing USFM files:', error));
}
