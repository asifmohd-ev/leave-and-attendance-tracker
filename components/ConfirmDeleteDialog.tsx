"use client";

import { useState } from "react";
import { Trash2, X } from "lucide-react";

interface ConfirmDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  itemType: string;
}

export default function ConfirmDeleteDialog({ isOpen, onClose, onConfirm, itemName, itemType }: ConfirmDeleteDialogProps) {
  const [typedName, setTypedName] = useState("");

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (typedName === itemName) {
      onConfirm();
      setTypedName("");
      onClose();
    }
  };

  const handleClose = () => {
    setTypedName("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white shadow-2xl border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center gap-4 bg-rose-50/30">
          <div className="w-12 h-12 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-500 shadow-sm">
            <Trash2 size={20} strokeWidth={2.5} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Delete {itemType}</h2>
            <p className="text-slate-500 text-xs mt-0.5">This action moves data to the recycle bin.</p>
          </div>
          <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>
        <div className="p-8 space-y-5">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-800">
              To confirm deletion of <span className="font-black">{itemType}</span>{" "}
              <span className="font-black underline">{itemName}</span>, please type the name below.
            </p>
          </div>
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Type "<span className="text-rose-500">{itemName}</span>" to confirm
            </label>
            <input
              type="text"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              className="w-full px-5 py-3.5 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl focus:border-rose-400 focus:outline-none transition-all placeholder:text-slate-300 font-semibold text-sm shadow-inner"
              placeholder={`Type "${itemName}" here...`}
              autoFocus
            />
          </div>
          <div className="flex gap-4 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3.5 px-4 font-bold text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 transition-all text-xs rounded-xl"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={typedName !== itemName}
              className="flex-1 py-3.5 px-4 font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all text-xs rounded-xl shadow-md shadow-rose-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Delete {itemType}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
