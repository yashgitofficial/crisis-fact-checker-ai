import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Navigation, MapPin, ExternalLink, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { VerificationStatus } from "@/types/distress";

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

type FilterType = "all" | "verified" | "unverified" | "scam";

export function DistressMap({ isOpen, onClose }: DistressMapProps) {
  const [locations, setLocations] = useState<DistressLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<DistressLocation | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

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

  const filteredLocations = useMemo(() => {
    switch (activeFilter) {
      case "verified":
        return locations.filter(loc => loc.verification_status === "Likely Genuine");
      case "unverified":
        return locations.filter(loc => 
          loc.verification_status === "Needs Verification" || loc.verification_status === "Pending"
        );
      case "scam":
        return locations.filter(loc => loc.verification_status === "High Scam Probability");
      default:
        return locations;
    }
  }, [locations, activeFilter]);

  const getFilterCount = (filter: FilterType) => {
    switch (filter) {
      case "verified":
        return locations.filter(loc => loc.verification_status === "Likely Genuine").length;
      case "unverified":
        return locations.filter(loc => 
          loc.verification_status === "Needs Verification" || loc.verification_status === "Pending"
        ).length;
      case "scam":
        return locations.filter(loc => loc.verification_status === "High Scam Probability").length;
      default:
        return locations.length;
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
        <div className="p-4 border-b border-border bg-secondary/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Verified Distress Locations</h2>
                <p className="text-sm text-muted-foreground">
                  {filteredLocations.length} location{filteredLocations.length !== 1 ? 's' : ''} with GPS coordinates
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onClose} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
          
          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("all")}
              className="gap-2"
            >
              <Filter className="h-3 w-3" />
              All ({getFilterCount("all")})
            </Button>
            <Button
              variant={activeFilter === "verified" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("verified")}
              className={`gap-2 ${activeFilter === "verified" ? "" : "border-green-500/50 text-green-600 hover:bg-green-500/10"}`}
            >
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Verified ({getFilterCount("verified")})
            </Button>
            <Button
              variant={activeFilter === "unverified" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("unverified")}
              className={`gap-2 ${activeFilter === "unverified" ? "" : "border-yellow-500/50 text-yellow-600 hover:bg-yellow-500/10"}`}
            >
              <span className="h-2 w-2 rounded-full bg-yellow-500" />
              Unverified ({getFilterCount("unverified")})
            </Button>
            <Button
              variant={activeFilter === "scam" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("scam")}
              className={`gap-2 ${activeFilter === "scam" ? "" : "border-red-500/50 text-red-600 hover:bg-red-500/10"}`}
            >
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Scam ({getFilterCount("scam")})
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-160px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filteredLocations.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {locations.length === 0 
                  ? "No GPS Locations Available" 
                  : `No ${activeFilter === "verified" ? "verified" : activeFilter === "unverified" ? "unverified" : activeFilter === "scam" ? "scam" : ""} locations`
                }
              </h3>
              <p className="text-muted-foreground">
                {locations.length === 0 
                  ? "Reports with GPS coordinates will appear here."
                  : "Try changing the filter to see other locations."
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLocations.map((loc) => (
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
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={onClose}
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                      </Button>
                      <Button
                        size="sm"
                        className="gap-2"
                        onClick={() => openGoogleMapsNavigation(loc.latitude, loc.longitude)}
                      >
                        <ExternalLink className="h-4 w-4" />
                        Navigate
                      </Button>
                    </div>
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