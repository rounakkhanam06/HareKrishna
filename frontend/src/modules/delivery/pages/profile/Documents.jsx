import React, { useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileCheck, UploadCloud, XCircle, Clock, Eye } from "lucide-react";
import Button from "@/shared/components/ui/Button";
import Card from "@/shared/components/ui/Card";
import { toast } from "sonner";
import { useAuth } from "@core/context/AuthContext";
import { deliveryApi } from "../../services/deliveryApi";

import { captureFlutterCamera } from "@core/utils/deviceUtils";

// Maps the DB field key to a display label
const DOC_CONFIG = [
  { key: "aadhar",             title: "Aadhar Card" },
  { key: "pan",                title: "PAN Card" },
  { key: "drivingLicense",     title: "Driving License" },
  { key: "vehicleRegistration",title: "Vehicle RC Document" },
  { key: "policeClearance",    title: "Police Clearance" },
  { key: "bankPassbook",       title: "Bank Passbook" },
];

const Documents = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef(null);
  const [uploadingKey, setUploadingKey] = useState(null); // docKey being uploaded
  const [loadingKey, setLoadingKey] = useState(null);     // key currently in-flight

  // Build document list from live user state
  const docs = useMemo(() => {
    return DOC_CONFIG.map((cfg) => {
      const url = user?.documents?.[cfg.key] || null;
      const statusObj = user?.documentStatuses?.[cfg.key] || {};
      return {
        ...cfg,
        url,
        status: statusObj.status || (url ? "Pending" : null),
        reason: statusObj.reason || null,
        updatedAt: statusObj.updatedAt || null,
      };
    });
  }, [user]);

  const processUpload = async (docKey, file) => {
    setLoadingKey(docKey);
    try {
      await deliveryApi.uploadDocument(docKey, file);
      toast.success(`${file.name} uploaded successfully! It is now pending admin review.`);
      if (typeof refreshUser === "function") {
        await refreshUser();
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "Upload failed. Please try again.";
      toast.error(msg);
    } finally {
      setLoadingKey(null);
      setUploadingKey(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleUploadClick = (docKey) => {
    setUploadingKey(docKey);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingKey) return;
    await processUpload(uploadingKey, file);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Verified":
        return (
          <span className="flex items-center text-brand-600 bg-brand-50 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
            <FileCheck size={12} className="mr-1" /> Verified
          </span>
        );
      case "Pending":
        return (
          <span className="flex items-center text-yellow-600 bg-yellow-50 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
            <Clock size={12} className="mr-1" /> Pending
          </span>
        );
      case "Rejected":
        return (
          <span className="flex items-center text-red-600 bg-red-50 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
            <XCircle size={12} className="mr-1" /> Rejected
          </span>
        );
      default:
        return (
          <span className="flex items-center text-gray-500 bg-gray-100 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
            Not Uploaded
          </span>
        );
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  };

  const getFileName = (url) => {
    if (!url) return null;
    try {
      const parts = new URL(url).pathname.split("/");
      return parts[parts.length - 1];
    } catch {
      return url.split("/").pop();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Hidden file input – triggered programmatically */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileChange}
        style={{ display: "none" }}
        accept=".pdf,.jpg,.jpeg,.png"
      />

      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="flex items-center p-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors mr-2"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="ds-h3 text-gray-900">My Documents</h1>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-4">
        {docs.map((doc) => {
          const isUploading = loadingKey === doc.key;
          const fileName = getFileName(doc.url);
          const dateStr = formatDate(doc.updatedAt);
          // Show Upload only if: document never uploaded, OR admin rejected it (needs re-upload)
          const canUpload = !doc.url || doc.status === "Rejected";

          return (
            <Card key={doc.key} className="p-4 border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-gray-800">{doc.title}</h4>
                {getStatusBadge(doc.status)}
              </div>

              {/* File name + upload date */}
              {fileName && (
                <p className="text-xs text-gray-500 mb-3 flex items-center">
                  <span className="truncate max-w-[200px]">{fileName}</span>
                  {dateStr && (
                    <>
                      <span className="mx-2">•</span>
                      <span>{dateStr}</span>
                    </>
                  )}
                </p>
              )}

              {/* Rejection reason */}
              {doc.status === "Rejected" && doc.reason && (
                <div className="bg-red-50 text-red-700 text-xs p-2 rounded mb-3">
                  Reason: {doc.reason}
                </div>
              )}

              <div className="flex space-x-2">
                {canUpload && (
                  <Button
                    size="sm"
                    className="w-full text-xs h-8"
                    onClick={() => handleUploadClick(doc.key)}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      "Uploading…"
                    ) : (
                      <>
                        <UploadCloud size={14} className="mr-1" />
                        {doc.status === "Rejected" ? "Re-upload" : "Upload"}
                      </>
                    )}
                  </Button>
                )}

                {doc.url && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs h-8"
                    onClick={() => window.open(doc.url, "_blank")}
                  >
                    <Eye size={14} className="mr-1" /> View File
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Documents;
