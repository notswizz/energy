"use client";

import { useState } from "react";

interface Photo {
  id: string;
  url: string;
  thumbnailUrl: string;
  takenAt: string;
  lat: number | null;
  lng: number | null;
  tags: string[];
}

export function PhotosTab({ photos }: { photos: Photo[] }) {
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);

  if (photos.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-8 text-center">
        No photos synced. Link a CompanyCam project to import photos.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {photos.map((photo) => (
          <button
            key={photo.id}
            onClick={() => setLightboxPhoto(photo)}
            className="aspect-square rounded-lg overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity"
          >
            <img
              src={photo.thumbnailUrl || photo.url}
              alt=""
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      {/* GPS coordinates list */}
      {photos.some((p) => p.lat && p.lng) && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Photo Locations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {photos
              .filter((p) => p.lat && p.lng)
              .map((photo) => (
                <div key={photo.id} className="text-xs text-gray-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  {photo.lat?.toFixed(5)}, {photo.lng?.toFixed(5)}
                  <span className="text-gray-400">
                    {new Date(photo.takenAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightboxPhoto(null)}
              className="absolute -top-10 right-0 text-white text-sm hover:text-gray-300"
            >
              Close
            </button>
            <img
              src={lightboxPhoto.url}
              alt=""
              className="w-full h-full object-contain rounded-lg"
            />
            <div className="mt-2 text-white text-sm flex items-center gap-4">
              {lightboxPhoto.lat && lightboxPhoto.lng && (
                <span>
                  {lightboxPhoto.lat.toFixed(5)}, {lightboxPhoto.lng.toFixed(5)}
                </span>
              )}
              <span>{new Date(lightboxPhoto.takenAt).toLocaleString()}</span>
              {lightboxPhoto.tags.length > 0 && (
                <span>{lightboxPhoto.tags.join(", ")}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
