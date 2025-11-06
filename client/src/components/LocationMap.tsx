import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useState } from "react";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface LocationMapProps {
  onLocationSelect: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
  title?: string;
}

function MapClickHandler({
  onLocationSelect,
  setSelectedPosition,
}: {
  onLocationSelect: (lat: number, lng: number) => void;
  setSelectedPosition: (pos: [number, number]) => void;
}) {
  useMapEvents({
    click(e: L.LeafletMouseEvent) {
      const { lat, lng } = e.latlng;
      setSelectedPosition([lat, lng]);
      onLocationSelect(lat, lng);
    },
  });
  return null;
}

export default function LocationMap({
  onLocationSelect,
  initialLat = 33.5731,
  initialLng = 36.2765,
  title = "اختر الموقع من الخريطة",
}: LocationMapProps) {
  const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(
    initialLat && initialLng ? [initialLat, initialLng] : null
  );

  const center: [number, number] = selectedPosition || [initialLat, initialLng];

  return (
    <div className="w-full">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        {selectedPosition && (
          <p className="text-xs text-gray-500 mt-1">
            الموقع المختار: {selectedPosition[0].toFixed(4)}, {selectedPosition[1].toFixed(4)}
          </p>
        )}
      </div>
      <div style={{ height: "300px", width: "100%", borderRadius: "0.5rem", border: "1px solid #d1d5db" }}>
        <MapContainer
          center={center as any}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapClickHandler onLocationSelect={onLocationSelect} setSelectedPosition={setSelectedPosition} />
          {selectedPosition && (
            <Marker position={selectedPosition as any}>
              <Popup>
                <div className="text-center">
                  <p className="font-semibold">الموقع المختار</p>
                  <p className="text-sm">
                    {selectedPosition[0].toFixed(4)}, {selectedPosition[1].toFixed(4)}
                  </p>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
