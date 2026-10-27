import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, X } from 'lucide-react';
import Button from '../common/Button';
import { validateCsvFile } from '../../utils/validators';
import { formatFileSize } from '../../utils/formatters';

export function DatasetUploadCard({ onUpload, uploading = false }) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef(null);

  const handleFileSelect = (file) => {
    setValidationError(null);
    const result = validateCsvFile(file);
    if (!result.valid) {
      setValidationError(result.error);
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleUploadClick = async () => {
    if (!selectedFile) return;
    try {
      await onUpload(selectedFile, (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / (progressEvent.total || progressEvent.loaded)
        );
        setUploadProgress(percentCompleted);
      });
      setSelectedFile(null);
      setUploadProgress(0);
    } catch {
      // Error handled by parent
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setValidationError(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-card">
      <div className="text-center max-w-xl mx-auto mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Analyze a Wind Turbine Dataset</h2>
        <p className="text-sm text-slate-500 mt-1.5">
          Upload a SCADA CSV file to inspect dataset quality, detect features, and check compatibility with trained machine learning models.
        </p>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
        accept=".csv"
        className="hidden"
      />

      {!selectedFile ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center space-y-4 ${
            dragOver
              ? 'border-sky-500 bg-sky-50/50'
              : 'border-slate-300 hover:border-sky-400 hover:bg-slate-50/60 bg-slate-50/20'
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shadow-sm">
            <Upload className="w-7 h-7" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-800">
              Drag & drop your SCADA CSV file here
            </p>
            <p className="text-xs text-slate-500 mt-1">or browse files from your computer</p>
          </div>
          <div className="text-[11px] text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-full">
            Supported format: Standard CSV (up to 100MB)
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-sky-600">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 truncate max-w-xs sm:max-w-md">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-slate-500 font-mono">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            {!uploading && (
              <button
                onClick={clearSelection}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                aria-label="Remove selected file"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {uploading && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Uploading dataset...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-sky-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-2">
            <Button variant="outline" size="sm" onClick={clearSelection} disabled={uploading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Upload}
              loading={uploading}
              onClick={handleUploadClick}
            >
              Upload & Analyze
            </Button>
          </div>
        </div>
      )}

      {validationError && (
        <div className="mt-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{validationError}</span>
        </div>
      )}
    </div>
  );
}

export default DatasetUploadCard;
