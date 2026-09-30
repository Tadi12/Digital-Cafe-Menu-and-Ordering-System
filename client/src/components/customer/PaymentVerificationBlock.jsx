import React, { useState, useRef } from 'react';
import Tesseract from 'tesseract.js';
import { Upload, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import api from '../../api/axiosClient';

const PaymentVerificationBlock = ({ bankName, expectedAmount, onVerified }) => {
  const [file, setFile] = useState(null);
  const [reference, setReference] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setError('');
    setIsScanning(true);
    setReference('');

    try {
      const { data: { text } } = await Tesseract.recognize(selectedFile, 'eng', {
        logger: m => console.log(m)
      });
      
      let extractedRef = '';
      if (bankName === 'CBE') {
        // Look for FT followed by alphanumeric
        const match = text.match(/FT[A-Z0-9]{8,12}/i);
        if (match) extractedRef = match[0].toUpperCase();
      } else if (bankName === 'Telebirr') {
        const match = text.match(/CHQ[A-Z0-9]{6,10}/i);
        if (match) extractedRef = match[0].toUpperCase();
      }

      if (extractedRef) {
        setReference(extractedRef);
      } else {
        setError("Could not automatically read the reference number. Please type it manually.");
      }
    } catch (err) {
      console.error(err);
      setError("OCR scanning failed. Please type the reference manually.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleVerify = async () => {
    if (!reference.trim()) {
      setError("Please provide a reference number.");
      return;
    }
    
    setIsVerifying(true);
    setError('');
    
    try {
      const res = await api.post(`/orders/verify-receipt`, {
        bank: bankName,
        expectedAmount,
        reference: reference.trim()
      });
      
      if (res.data.success) {
        setSuccess(true);
        if (onVerified) onVerified({ reference: reference.trim(), receiptData: res.data.data });
      }
    } catch (err) {
      console.error("Verification Error:", err);
      const serverMessage = err.response?.data?.message;
      const fallback = `Error: ${err.message || 'Unknown'}. Please check reference.`;
      setError(serverMessage || fallback);
    } finally {
      setIsVerifying(false);
    }
  };

  if (success) {
    return (
      <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-200 text-center space-y-2">
        <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
        <h3 className="font-bold text-emerald-900">Payment Verified!</h3>
        <p className="text-xs text-emerald-700">Thank you. Your payment has been successfully confirmed.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-5 border border-cafe-200 shadow-sm space-y-4">
      <div className="text-center">
        <h3 className="font-bold text-cafe-900 text-lg">Verify {bankName} Payment</h3>
        <p className="text-xs text-cafe-600 mt-1">
          Please transfer <span className="font-bold text-cafe-900">{expectedAmount} ETB</span> to our {bankName} account and upload the receipt screenshot.
        </p>
      </div>

      <div className="bg-cafe-50 border-2 border-dashed border-cafe-200 rounded-xl p-6 text-center hover:bg-cafe-100 transition cursor-pointer" onClick={() => fileInputRef.current?.click()}>
        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
        {isScanning ? (
          <div className="space-y-2">
            <Loader2 className="w-6 h-6 text-gold-500 animate-spin mx-auto" />
            <p className="text-xs text-cafe-600 font-medium">Scanning receipt...</p>
          </div>
        ) : file ? (
          <div className="space-y-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
            <p className="text-xs text-cafe-800 font-bold">{file.name}</p>
            <p className="text-[10px] text-cafe-500">Click to change</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="w-6 h-6 text-cafe-400 mx-auto" />
            <p className="text-xs text-cafe-600 font-medium">Tap to upload screenshot</p>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-cafe-800 block">Reference Number</label>
        <input
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder={bankName === 'CBE' ? "e.g. FT25211G11JQ" : "e.g. CHQ0FJ403O"}
          className="w-full bg-cafe-50 border border-cafe-200 rounded-xl px-4 py-3 text-sm font-bold text-cafe-900 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 uppercase placeholder:normal-case"
        />
        <p className="text-[10px] text-cafe-500">Auto-filled from screenshot or type manually</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      <button
        onClick={handleVerify}
        disabled={isVerifying || !reference}
        className="w-full bg-gold-600 hover:bg-gold-700 text-white py-3.5 px-4 rounded-xl font-bold text-sm shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isVerifying ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          "Verify Payment Now"
        )}
      </button>
    </div>
  );
};

export default PaymentVerificationBlock;
