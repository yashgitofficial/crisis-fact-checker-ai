import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Send, MapPin, MessageSquare, Phone, Loader2, ImagePlus, X, AlertTriangle, CheckCircle, HelpCircle, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDistressPosts } from "@/hooks/useDistressPosts";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ImageAnalysisResult {
  damageDetected: boolean;
  damageType: string;
  confidence: number;
  authenticity: string;
  reason: string;
}

const formSchema = z.object({
  message: z
    .string()
    .min(20, "Please provide more details about the emergency situation (at least 20 characters)")
    .max(1000, "Message must be less than 1000 characters"),
  location: z
    .string()
    .min(5, "Please provide a more specific location")
    .max(200, "Location must be less than 200 characters"),
  contact: z
    .string()
    .max(100, "Contact info must be less than 100 characters")
    .optional(),
});

type FormData = z.infer<typeof formSchema>;

export function SubmissionForm() {
  const { addPost, isLoading } = useDistressPosts();
  const [charCount, setCharCount] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageAnalysis, setImageAnalysis] = useState<ImageAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // GPS coordinates state
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Request GPS on component mount
  useEffect(() => {
    requestGPS();
  }, []);

  const requestGPS = () => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      setGpsError('Geolocation is not supported by your browser');
      return;
    }

    setGpsStatus('loading');
    setGpsError(null);

    // First try with high accuracy
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setGpsStatus('success');
      },
      (highAccuracyError) => {
        // If high accuracy fails, try with lower accuracy (faster, more reliable)
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setCoordinates({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
            setGpsStatus('success');
          },
          (error) => {
            setGpsStatus('error');
            switch (error.code) {
              case error.PERMISSION_DENIED:
                setGpsError('Location access denied. Please enable location permissions.');
                break;
              case error.POSITION_UNAVAILABLE:
                setGpsError('Location information unavailable. Please enter your location manually.');
                break;
              case error.TIMEOUT:
                setGpsError('Location request timed out. Please try again.');
                break;
              default:
                setGpsError('Unable to get your location.');
            }
          },
          {
            enableHighAccuracy: false,
            timeout: 15000,
            maximumAge: 60000, // Accept cached position up to 1 minute old
          }
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000, // Accept cached position up to 30 seconds old
      }
    );
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "",
      location: "",
      contact: "",
    },
  });

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setSelectedImage(base64);
      setImageAnalysis(null);
      
      // Analyze the image
      setIsAnalyzing(true);
      try {
        const { data, error } = await supabase.functions.invoke('analyze-image', {
          body: { imageBase64: base64 }
        });

        if (error) throw error;
        setImageAnalysis(data);
      } catch (error) {
        console.error('Image analysis error:', error);
        toast({
          title: "Analysis failed",
          description: "Could not analyze the image. You can still submit without analysis.",
          variant: "destructive",
        });
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImageAnalysis(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getAuthenticityColor = (authenticity: string) => {
    switch (authenticity) {
      case 'likely authentic': return 'text-green-600';
      case 'potentially misleading': return 'text-destructive';
      default: return 'text-yellow-600';
    }
  };

  const getAuthenticityIcon = (authenticity: string) => {
    switch (authenticity) {
      case 'likely authentic': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'potentially misleading': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default: return <HelpCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      const post = await addPost({
        message: data.message,
        location: data.location,
        contact: data.contact,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
      });

      toast({
        title: "Message Submitted",
        description: `Verification status: ${post.verification_status}`,
      });

      reset();
      setCharCount(0);
      removeImage();
    } catch (error) {
      toast({
        title: "Submission Failed",
        description: "Unable to submit your message. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="card-emergency rounded-xl p-6 border border-border animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <MessageSquare className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Report Distress
          </h2>
          <p className="text-sm text-muted-foreground">
            Submit emergency information for AI verification
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Message Field */}
        <div className="space-y-2">
          <Label htmlFor="message" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            Distress Message *
          </Label>
          <Textarea
            id="message"
            placeholder="Describe the emergency situation with specific details: number of people affected, type of emergency, current conditions, and any immediate needs..."
            className="min-h-[120px] bg-secondary/50 border-border focus:border-primary/50 transition-colors resize-none"
            {...register("message", {
              onChange: (e) => setCharCount(e.target.value.length),
            })}
          />
          <div className="flex justify-between items-center">
            {errors.message && (
              <p className="text-sm text-destructive">{errors.message.message}</p>
            )}
            <p className="text-xs text-muted-foreground ml-auto">
              {charCount}/1000
            </p>
          </div>
        </div>

        {/* Location Field */}
        <div className="space-y-2">
          <Label htmlFor="location" className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            Location *
          </Label>
          <Input
            id="location"
            placeholder="Enter specific address, landmarks, or coordinates..."
            className="bg-secondary/50 border-border focus:border-primary/50 transition-colors"
            {...register("location")}
          />
          {errors.location && (
            <p className="text-sm text-destructive">{errors.location.message}</p>
          )}
        </div>

        {/* Contact Field */}
        <div className="space-y-2">
          <Label htmlFor="contact" className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            Contact Information{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="contact"
            placeholder="Phone number or email for follow-up..."
            className="bg-secondary/50 border-border focus:border-primary/50 transition-colors"
            {...register("contact")}
          />
          {errors.contact && (
            <p className="text-sm text-destructive">{errors.contact.message}</p>
          )}
        </div>

        {/* GPS Coordinates */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-muted-foreground" />
            GPS Coordinates
          </Label>
          <div className={`p-3 rounded-lg border ${
            gpsStatus === 'success' 
              ? 'bg-green-500/10 border-green-500/30' 
              : gpsStatus === 'error' 
                ? 'bg-destructive/10 border-destructive/30' 
                : 'bg-secondary/50 border-border'
          }`}>
            {gpsStatus === 'loading' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Getting your location...</span>
              </div>
            )}
            {gpsStatus === 'success' && coordinates && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>
                    {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={requestGPS}
                  className="text-xs"
                >
                  Refresh
                </Button>
              </div>
            )}
            {gpsStatus === 'error' && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{gpsError}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={requestGPS}
                  className="text-xs"
                >
                  Retry
                </Button>
              </div>
            )}
            {gpsStatus === 'idle' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={requestGPS}
                className="w-full"
              >
                <Navigation className="h-4 w-4 mr-2" />
                Get GPS Location
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Exact GPS coordinates help emergency responders locate you faster
          </p>
        </div>

        {/* Image Upload Field */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <ImagePlus className="h-4 w-4 text-muted-foreground" />
            Disaster Image{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageSelect}
            className="hidden"
          />
          
          {!selectedImage ? (
            <Button
              type="button"
              variant="outline"
              className="w-full border-dashed border-2 h-24 flex flex-col gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Click to upload an image for AI analysis</span>
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="relative inline-block">
                <img 
                  src={selectedImage} 
                  alt="Selected" 
                  className="max-h-40 rounded-lg border border-border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6"
                  onClick={removeImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Analysis Results */}
              {isAnalyzing && (
                <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Analyzing image for damage...</span>
                </div>
              )}

              {imageAnalysis && !isAnalyzing && (
                <div className="p-4 bg-secondary/50 rounded-lg space-y-3 border border-border">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    AI Damage Analysis
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Damage Detected:</span>
                      <span className={`ml-2 font-medium ${imageAnalysis.damageDetected ? 'text-destructive' : 'text-green-600'}`}>
                        {imageAnalysis.damageDetected ? 'Yes' : 'No'}
                      </span>
                    </div>
                    
                    <div>
                      <span className="text-muted-foreground">Type:</span>
                      <span className="ml-2 font-medium capitalize">{imageAnalysis.damageType}</span>
                    </div>
                    
                    <div>
                      <span className="text-muted-foreground">Confidence:</span>
                      <span className="ml-2 font-medium">{Math.round(imageAnalysis.confidence * 100)}%</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Authenticity:</span>
                      <span className={`ml-1 font-medium flex items-center gap-1 ${getAuthenticityColor(imageAnalysis.authenticity)}`}>
                        {getAuthenticityIcon(imageAnalysis.authenticity)}
                        <span className="capitalize">{imageAnalysis.authenticity}</span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-border">
                    <span className="text-muted-foreground text-sm">Reason: </span>
                    <span className="text-sm">{imageAnalysis.reason}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="emergency"
          size="lg"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Analyzing Message...
            </>
          ) : (
            <>
              <Send className="h-5 w-5" />
              Submit for Verification
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
