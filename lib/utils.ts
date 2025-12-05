import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Date Range Helper
export const getPreviousMonthRange = () => {
  const now = new Date();
  // Start of current month
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Start of previous month
  const startOfPreviousMonth = new Date(startOfCurrentMonth);
  startOfPreviousMonth.setMonth(startOfCurrentMonth.getMonth() - 1);

  // End of previous month (which is the start of the current month)
  const endOfPreviousMonth = startOfCurrentMonth;

  return {
    start: startOfPreviousMonth.toISOString(),
    end: endOfPreviousMonth.toISOString()
  };
};

// Image Compression Helper
export const compressImage = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error("Canvas not supported")); return; }
      const MAX_SIZE = 800;
      let width = img.width; let height = img.height;
      if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } }
      else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
      canvas.width = width; canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error("Compression failed")); return; }
        resolve(blob);
      }, 'image/jpeg', 0.7);
    };
    img.onerror = (error) => reject(error);
  });
}
