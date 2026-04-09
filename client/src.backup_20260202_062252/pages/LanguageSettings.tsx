import { useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/layouts/DashboardLayoutNew";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Globe, Check } from "lucide-react";
import { toast } from "sonner";

export default function LanguageSettings() {
  const [, setLocation] = useLocation();
  const [selectedLanguage, setSelectedLanguage] = useState("en");

  const languages = [
    {
      code: "en",
      name: "English",
      nativeName: "English",
      direction: "ltr",
    },
    {
      code: "ar",
      name: "Arabic",
      nativeName: "العربية",
      direction: "rtl",
    },
  ];

  const handleSave = () => {
    // TODO: Implement language switching logic
    toast.success(`Language changed to ${selectedLanguage === "en" ? "English" : "Arabic"}`);
    toast.info("Full language switching will be implemented in the next phase");
  };

  return (
    <DashboardLayout>
      <div className="container max-w-4xl py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/settings")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Language & Localization</h1>
            <p className="text-muted-foreground mt-2">
              Choose your preferred language for the interface
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <CardTitle>Interface Language</CardTitle>
            </div>
            <CardDescription>
              Select the language you want to use throughout the system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup
              value={selectedLanguage}
              onValueChange={setSelectedLanguage}
              className="space-y-4"
            >
              {languages.map((lang) => (
                <div
                  key={lang.code}
                  className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedLanguage(lang.code)}
                >
                  <RadioGroupItem value={lang.code} id={lang.code} />
                  <Label
                    htmlFor={lang.code}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{lang.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {lang.nativeName}
                        </p>
                      </div>
                      {selectedLanguage === lang.code && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">What changes when you switch language?</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• All interface text and labels</li>
                <li>• Date and number formats</li>
                <li>• Text direction (LTR for English, RTL for Arabic)</li>
                <li>• System notifications and emails</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleSave}>
                Save Changes
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/settings")}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
