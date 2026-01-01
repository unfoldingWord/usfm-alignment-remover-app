import axios from 'axios';
import JSZip from 'jszip';
import { removeAlignments } from './helpers/UsfmFileConversionHelper';

function downloadUnalignedUSFM(owner, repo, ref, statusElement) {
  if (!owner || !repo || !ref) {
    console.log('owner, repo and ref must be provided')
    if (statusElement) {
      statusElement.textContent = 'owner, repo and ref must be provided';
    }
  } else {
    const dcsZipUrl = `/${owner}/${repo}/archive/${ref}.zip`;

    // Step 2: Fetch Zip File from DCS
    axios
      .get(dcsZipUrl, { responseType: 'blob' })
      .then((response) => JSZip.loadAsync(response.data)) // Step 3: Load Zip File with JSZip
      .then((zip) => {
        const newZip = new JSZip();
        const filePromises = [];
        let count = 0;
        const total = zip.filter((path) => path.endsWith('.usfm')).length;
        if (!total) {
          statusElement.textContent = 'No USFM files found in the given repo';
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
              if (statusElement) {
                statusElement.textContent = `Processing ${count} of ${total} USFM files...`;
              }
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
        a.download = `${repo}-${ref}-unaligned_usfm.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        if (statusElement) {
          statusElement.textContent = '';
        }
      })
      .catch((error) => console.error('Error processing USFM files:', error));
  }
}

window.downloadUnalignedUSFM = downloadUnalignedUSFM;