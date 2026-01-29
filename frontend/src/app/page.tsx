'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { api } from '@/lib/api';
import { useDocumentStore } from '@/lib/store';

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setResume, setPdf } = useDocumentStore();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && isValidFile(droppedFile)) {
      setFile(droppedFile);
      setError(null);
    } else {
      setError('Please upload a PDF or DOCX file');
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && isValidFile(selectedFile)) {
      setFile(selectedFile);
      setError(null);
    } else if (selectedFile) {
      setError('Please upload a PDF or DOCX file');
    }
  }, []);

  const isValidFile = (file: File): boolean => {
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const validExtensions = ['.pdf', '.docx'];

    return validTypes.includes(file.type) ||
      validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError('Please upload a resume file');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Parse the resume
      const parseResponse = await api.parseResume(file);

      if (parseResponse.warnings.length > 0) {
        console.log('Parse warnings:', parseResponse.warnings);
      }

      // Step 2: Store the resume in state
      setResume(parseResponse.resume);

      // Step 3: Render to PDF
      try {
        const renderResponse = await api.renderResume(parseResponse.resume);
        setPdf(renderResponse.pdf_base64, renderResponse.latex);
      } catch (renderError) {
        console.log('PDF rendering skipped (LaTeX may not be installed)');
        setPdf('', '');
      }

      // Step 4: Navigate to editor
      router.push('/editor');

    } catch (err) {
      console.error('Error processing resume:', err);
      setError(err instanceof Error ? err.message : 'Failed to process resume');
    } finally {
      setIsLoading(false);
    }
  };

  const canAnalyze = file !== null;

  return (
    <div className={styles.uploadContainer}>
      {/* Loading overlay */}
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className="spinner" />
          <p className={styles.loadingText}>Analyzing your resume...</p>
        </div>
      )}

      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>Let&apos;s tailor your profile</h1>
        <p className={styles.subtitle}>
          Upload your current resume and the job description you are targeting.
          Our AI will analyze the gap.
        </p>
      </header>

      {/* Error banner */}
      {error && (
        <div className={styles.errorBanner}>
          {error}
        </div>
      )}

      {/* Main content */}
      <main className={styles.mainContent}>
        {/* Resume upload section */}
        <section className={styles.uploadSection}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>Your Resume</span>
            <span className={styles.sectionBadge}>PDF or DOCX</span>
          </div>

          {!file ? (
            <div
              className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className={styles.uploadIcon}>
                <svg className={styles.uploadIconSvg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className={styles.dropzoneText}>Drag & drop your resume</p>
              <p className={styles.dropzoneSubtext}>or click to browse files from your computer</p>
              <div className={styles.fileTypes}>
                <span className={styles.fileType}>📄 PDF</span>
                <span className={styles.fileType}>📝 DOCX</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>
          ) : (
            <div className={styles.dropzone}>
              <div className={styles.fileUploaded}>
                <div className={styles.fileIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div className={styles.fileInfo}>
                  <p className={styles.fileName}>{file.name}</p>
                  <p className={styles.fileSize}>{formatFileSize(file.size)}</p>
                </div>
                <button className={styles.removeFile} onClick={handleRemoveFile}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Job description section */}
        <section className={styles.jobDescriptionSection}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>Target Job Description</span>
            <span className={styles.sectionBadge}>Optional</span>
          </div>

          <textarea
            className={styles.jobDescriptionInput}
            placeholder={`Paste the full job description here (Responsibilities, Requirements, Role Overview)...

Example:
We are looking for a Senior Product Designer to join our team...`}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          />
          <p className={styles.charCount}>{jobDescription.length} characters</p>
        </section>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.securityNote}>
          <svg className={styles.lockIcon} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1C8.676 1 6 3.676 6 7v2H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V11a2 2 0 00-2-2h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v2H8V7c0-2.276 1.724-4 4-4zm0 10a2 2 0 110 4 2 2 0 010-4z" />
          </svg>
          Your data is encrypted and private.
        </div>

        <button
          className={styles.analyzeButton}
          onClick={handleAnalyze}
          disabled={!canAnalyze || isLoading}
        >
          Analyze & Optimize
          <svg className={styles.arrowIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </footer>
    </div>
  );
}
