'use client';

import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { contactsApi } from '@/lib/contacts-api';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileUp,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

interface ImportResult {
  status: 'success' | 'error' | 'queued';
  created: number;
  updated: number;
  skipped: number;
  total: number;
  errors: Array<{
    row: number;
    contact: string;
    error: string;
  }>;
  error?: string;
  task_id?: string;
  message?: string;
}

export function ContactImportDialog() {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: (file: File) => contactsApi.importContactsCSV(file),
    onSuccess: (data: ImportResult) => {
      setImportResult(data);

      if (data.status === 'success') {
        toast.success(
          `Imported ${data.created + data.updated} contacts`
        );
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
        queryClient.invalidateQueries({ queryKey: ['contact-stats'] });

        setTimeout(() => {
          setSelectedFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }, 3000);
      } else if (data.status === 'queued') {
        toast.success('Import started in background');
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['contacts'] });
          queryClient.invalidateQueries({ queryKey: ['contact-stats'] });
        }, 5000);

        setTimeout(() => {
          setSelectedFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }, 3000);
      } else {
        toast.error(data.error || 'Failed to import contacts');
      }
    },
    onError: (error: Error & { code?: string }) => {
      const errorMessage = error.message || 'Failed to import contacts';
      if (errorMessage.includes('Session expired') || error.code === 'SESSION_INTERRUPTED') {
        toast.error('Session expired. Please try again.');
      } else {
        toast.error(errorMessage);
      }
      setImportResult({
        status: 'error',
        error: error.message,
        created: 0,
        updated: 0,
        skipped: 0,
        total: 0,
        errors: [],
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        toast.error('Please select a CSV file');
        return;
      }
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleImport = () => {
    if (selectedFile) {
      importMutation.mutate(selectedFile);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      setSelectedFile(null);
      setImportResult(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }, 200);
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        handleClose();
      } else {
        setOpen(true);
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          <Upload className="h-4 w-4 mr-2" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900">
            Import Contacts
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Format Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs font-medium text-gray-700 mb-1">Expected CSV Format (Xero Export)</p>
            <p className="text-xs text-gray-500">
              ContactName, EmailAddress, BankAccountName, BankAccountNumber, PhoneNumber, MobileNumber
            </p>
          </div>

          {/* File Upload */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-file-input"
            />

            {!selectedFile ? (
              <label
                htmlFor="csv-file-input"
                className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <FileUp className="h-8 w-8 text-gray-300 mb-2" />
                <span className="text-sm text-gray-600">Click to upload CSV file</span>
                <span className="text-xs text-gray-400 mt-1">or drag and drop</span>
              </label>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-[#638C80]/5 border border-[#638C80]/20 rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-[#638C80]/10 flex items-center justify-center">
                  <FileSpreadsheet className="h-5 w-5 text-[#638C80]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFile}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Import Progress */}
          {importMutation.isPending && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              <div>
                <p className="text-sm font-medium text-blue-800">Importing contacts...</p>
                <p className="text-xs text-blue-600">This may take a moment</p>
              </div>
            </div>
          )}

          {/* Success Result */}
          {importResult && importResult.status === 'success' && (
            <div className="p-3 bg-green-50 border border-green-100 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <p className="text-sm font-medium text-green-800">Import Successful</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-green-700">
                  <span className="font-medium">{importResult.created}</span> created
                </span>
                <span className="text-blue-700">
                  <span className="font-medium">{importResult.updated}</span> updated
                </span>
                <span className="text-gray-600">
                  <span className="font-medium">{importResult.skipped}</span> skipped
                </span>
              </div>
            </div>
          )}

          {/* Queued Result */}
          {importResult && importResult.status === 'queued' && (
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Loader2 className="h-4 w-4 text-blue-600" />
                <p className="text-sm font-medium text-blue-800">Processing in Background</p>
              </div>
              <p className="text-xs text-blue-600">
                Contacts will appear shortly
              </p>
            </div>
          )}

          {/* Error Result */}
          {importResult && importResult.status === 'error' && (
            <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <p className="text-sm font-medium text-orange-800">Import Failed</p>
              </div>
              <p className="text-xs text-orange-600">{importResult.error}</p>
            </div>
          )}

          {/* Row Errors */}
          {importResult && importResult.errors && importResult.errors.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
              <p className="text-xs font-medium text-amber-800 mb-2">
                {importResult.errors.length} row{importResult.errors.length > 1 ? 's' : ''} had errors
              </p>
              <div className="max-h-24 overflow-y-auto space-y-1">
                {importResult.errors.slice(0, 5).map((err, idx) => (
                  <p key={idx} className="text-xs text-amber-700">
                    <span className="font-mono">Row {err.row}</span>: {err.contact} - {err.error}
                  </p>
                ))}
                {importResult.errors.length > 5 && (
                  <p className="text-xs text-amber-600">
                    +{importResult.errors.length - 5} more errors
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={handleClose} className="h-9">
            Close
          </Button>
          <Button
            size="sm"
            onClick={handleImport}
            disabled={!selectedFile || importMutation.isPending}
            className="h-9 bg-[#638C80] hover:bg-[#547568]"
          >
            {importMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
