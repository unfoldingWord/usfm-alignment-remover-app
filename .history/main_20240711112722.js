import axios from 'axios';
import JSZip from 'jszip';
import { removeAlignments } from './helpers/UsfmFileConversionHelper';

// Step 1: Parse URL Parameters
const params = new URLSearchParams(window.location.search);
const owner = params.get('owner');
const repo = params.get('repo');
const ref = params.get('ref');

const dcsZipUrl = `https://git.door43.org/${owner}/${repo}/archive/${ref}.zip`;

// Step 2: Fetch Zip File from GitHub
axios.get(dcsZipUrl, { responseType: 'blob' })
  .then(response => JSZip.loadAsync(response.data)) // Step 3: Load Zip File with JSZip
  .then(zip => {
    const newZip = new JSZip();
    const filePromises = [];

    zip.forEach((relativePath, file) => {
      if (relativePath.endsWith('.usfm')) { // Step 4: Process `.usfm` Files
        const filePromise = file.async('string').then(content => {
          // Process the .usfm content here
          const unalignedUsfm = removeAlignments(_usfmText);
          newZip.file(relativePath, unalignedUsfm);
        });
        filePromises.push(filePromise);
      }
    });

    return Promise.all(filePromises).then(() => newZip);
  })
  .then(newZip => newZip.generateAsync({ type: 'blob' })) // Step 5: Generate Modified Zip File
  .then(blob => {
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `${repo}-modified.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  })
  .catch(error => console.error('Error processing zip file:', error));