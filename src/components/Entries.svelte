<script>
  import { logd } from '$lib/util/log';
  import { rawEntriesStore } from '$lib/stores/settings';
  import Dropzone from 'svelte-file-dropzone';

  let lastInputEntries = '';

  function processRaw() {
    let inputEntries = document.getElementById('inputEntries').value;
    if (lastInputEntries === '') {
      lastInputEntries = inputEntries;
    } else if (lastInputEntries === inputEntries) {
      return;
    }
    if (inputEntries && inputEntries !== '') {
      // cover_shown = true;
      setRawEntries(inputEntries);
    }
  }

  function setRawEntries(rawEntries) {
    $rawEntriesStore = rawEntries;
    logd('[set-raw-entries]', $rawEntriesStore);
    localStorage.setItem('rawEntries', $rawEntriesStore);
    lastInputEntries = $rawEntriesStore;
  }

  function handleFilesSelect(e) {
    const { acceptedFiles, fileRejections } = e.detail;

    acceptedFiles.forEach((acceptedFile) =>
      createFileReader(
        acceptedFile,
        /^(myBalanceForcaster|forebalance).*\.psv$/i,
        'Do you want to replace all entries?',
        `This doesn't look like a ForeBalance PSV file`,
        setRawEntries,
      ),
    );
  }

  function createFileReader(file, fileNameRegex, confirmationMessage, matchErrorMessage, processingCallback) {
    const reader = new FileReader();
    reader.onload = () => {
      const fileData = reader.result;
      if (file.name.match(fileNameRegex) && confirm(confirmationMessage)) {
        processingCallback(fileData);
      } else {
        alert(`${matchErrorMessage}:

    ${file.name}`);
      }
    };
    reader.readAsText(file);
  }
</script>

<!-- <button class="button-action update-forecast" on:click={processRaw}>Update Forecast</button> -->
<textarea id="inputEntries" on:change={processRaw} cols="40" rows="20">{$rawEntriesStore}</textarea>

<Dropzone on:drop={handleFilesSelect} />

<style lang="scss">
  #inputEntries {
    margin-top: 0.5rem;
    border-radius: 0.5rem;
    width: 100%;
    max-width: 55em;
    font-size: 1rem;
    height: 90%;
  }
</style>
