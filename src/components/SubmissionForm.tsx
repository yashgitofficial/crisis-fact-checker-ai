import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Send, MapPin, MessageSquare, Phone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDistressStore } from "@/store/distressStore";
import { toast } from "@/hooks/use-toast";

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
  const { addPost, isLoading } = useDistressStore();
  const [charCount, setCharCount] = useState(0);

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

  const onSubmit = async (data: FormData) => {
    try {
      const post = await addPost({
        message: data.message,
        location: data.location,
        contact: data.contact,
      });

      toast({
        title: "Message Submitted",
        description: `Verification status: ${post.verificationStatus}`,
      });

      reset();
      setCharCount(0);
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
