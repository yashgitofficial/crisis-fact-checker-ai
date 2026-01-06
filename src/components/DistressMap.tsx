import { useState, useEffect } from "react";
import { ArrowLeft, Navigation, MapPin, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface DistressLocation {
  id: string;
  latitude: number;
  longitude: number;
  location: string;
  message: string;
  verification_status: string;
  timestamp: string;
}

interface DistressMapProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DistressMap({ isOpen, onClose }: DistressMapProps) {
  const [locations, setLocations] = useState<DistressLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<DistressLocation | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchVerifiedLocations();
    }
  }, [isOpen]);

  const fetchVerifiedLocations = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('distress_posts')
        .select('id, latitude, longitude, location, message, verification_status, timestamp')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      setLocations(data as DistressLocation[]);
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openGoogleMapsNavigation = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Likely Genuine':
        return 'bg-green-500';
      case 'Needs Verification':
        return 'bg-yellow-500';
      case 'High Scam Probability':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-border">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Verified Distress Locations</h2>
              <p className="text-sm text-muted-foreground">
                {locations.length} location{locations.length !== 1 ? 's' : ''} with GPS coordinates
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onClose} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : locations.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No GPS Locations Available</h3>
              <p className="text-muted-foreground">
                Reports with GPS coordinates will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {locations.map((loc) => (
                <div
                  key={loc.id}
                  className="p-4 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`h-2 w-2 rounded-full ${getStatusColor(loc.verification_status)}`} />
                        <span className="text-sm font-medium">{loc.verification_status}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(loc.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm mb-2 line-clamp-2">{loc.message}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{loc.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Navigation className="h-3 w-3" />
                        <span>GPS: {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="gap-2 shrink-0"
                      onClick={() => openGoogleMapsNavigation(loc.latitude, loc.longitude)}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Navigate
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}