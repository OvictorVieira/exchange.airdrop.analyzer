import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import type { FileParseResult } from '../core';
import { formatPeriod } from '../utils/format';

interface ImportCsvSectionProps {
  title: string;
  hint: string;
  selectFilesLabel: string;
  clearAllLabel: string;
  guideButtonLabel: string;
  guideModalTitle: string;
  guideModalIntro: string;
  guideAccessText: string;
  guideAccessLinkLabel: string;
  guideStep1: string;
  guideStep2: string;
  guideStep3: string;
  guideStep4: string;
  guideRememberTitle: string;
  guideRememberAccount: string;
  guideRememberAll: string;
  guideRememberExport: string;
  guideRememberRepeat: string;
  closeLabel: string;
  removeLabel: string;
  parsingLabel: string;
  noFilesLabel: string;
  headers: {
    fileName: string;
    status: string;
    rows: string;
    period: string;
  };
  statusLabel: {
    ok: string;
    error: string;
  };
  rowsLabel: {
    valid: string;
    invalid: string;
  };
  files: FileParseResult[];
  isParsing: boolean;
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (sourceFile: string) => void;
  onClearFiles: () => void;
}

export function ImportCsvSection({
  title,
  hint,
  selectFilesLabel,
  clearAllLabel,
  guideButtonLabel,
  guideModalTitle,
  guideModalIntro,
  guideAccessText,
  guideAccessLinkLabel,
  guideStep1,
  guideStep2,
  guideStep3,
  guideStep4,
  guideRememberTitle,
  guideRememberAccount,
  guideRememberAll,
  guideRememberExport,
  guideRememberRepeat,
  closeLabel,
  removeLabel,
  parsingLabel,
  noFilesLabel,
  headers,
  statusLabel,
  rowsLabel,
  files,
  isParsing,
  onAddFiles,
  onRemoveFile,
  onClearFiles
}: ImportCsvSectionProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const hasFiles = files.length > 0;

  function extractDroppedFiles(event: DragEvent<HTMLDivElement>): File[] {
    const filesFromList = [...event.dataTransfer.files];
    if (filesFromList.length > 0) {
      return filesFromList;
    }

    const filesFromItems = [...event.dataTransfer.items]
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);

    return filesFromItems;
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);

    const droppedFiles = extractDroppedFiles(event);
    if (droppedFiles.length > 0) {
      onAddFiles(droppedFiles);
    }
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(true);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
    setIsDragActive(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = event.target.files ? [...event.target.files] : [];
    onAddFiles(selectedFiles);

    event.target.value = '';
  }

  async function handleOpenGuideLink() {
    const url = 'https://backpack.exchange/portfolio/trades/fills';

    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(url);
      return;
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>{title}</h2>
        <div className="panel-actions">
          <button type="button" className="ghost" onClick={() => setIsGuideOpen(true)}>
            {guideButtonLabel}
          </button>
          <button type="button" className="ghost" onClick={onClearFiles} disabled={!hasFiles}>
            {clearAllLabel}
          </button>
        </div>
      </div>

      <div
        className={`dropzone ${isDragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <p>{hint}</p>
        <button type="button" onClick={() => fileInputRef.current?.click()}>
          {selectFilesLabel}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          multiple
          hidden
          onChange={handleInputChange}
        />
      </div>

      {isGuideOpen ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setIsGuideOpen(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>{guideModalTitle}</h3>
              <button type="button" className="ghost" onClick={() => setIsGuideOpen(false)}>
                {closeLabel}
              </button>
            </div>
            <p>{guideModalIntro}</p>
            <p>
              {guideAccessText}{' '}
              <button type="button" className="guide-link-button" onClick={handleOpenGuideLink}>
                {guideAccessLinkLabel}
              </button>
            </p>
            <div className="guide-alert">
              <strong>{guideRememberTitle}</strong>
              <div className="guide-tags">
                <span className="guide-tag">{guideRememberAccount}</span>
                <span className="guide-tag">{guideRememberAll}</span>
                <span className="guide-tag">{guideRememberExport}</span>
                <span className="guide-tag">{guideRememberRepeat}</span>
              </div>
            </div>
            <ol className="guide-steps">
              <li>{guideStep1}</li>
              <li>{guideStep2}</li>
              <li>{guideStep3}</li>
              <li>{guideStep4}</li>
            </ol>
          </div>
        </div>
      ) : null}

      {isParsing ? <p className="subtle">{parsingLabel}</p> : null}

      {!hasFiles ? (
        <p className="subtle">{noFilesLabel}</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>{headers.fileName}</th>
                <th>{headers.status}</th>
                <th>{headers.rows}</th>
                <th>{headers.period}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.sourceFile}>
                  <td>{file.sourceFile}</td>
                  <td>
                    <span className={`status-pill ${file.status}`}>
                      {file.status === 'ok' ? statusLabel.ok : statusLabel.error}
                    </span>
                    {file.errors.length > 0 ? <p className="error-inline">{file.errors[0]}</p> : null}
                  </td>
                  <td>
                    {file.rowsValid} {rowsLabel.valid} / {file.rowsInvalid} {rowsLabel.invalid}
                  </td>
                  <td>{formatPeriod(file.minOpenedAt, file.maxClosedAt)}</td>
                  <td>
                    <button type="button" className="ghost" onClick={() => onRemoveFile(file.sourceFile)}>
                      {removeLabel}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
