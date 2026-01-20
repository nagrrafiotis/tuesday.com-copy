import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, AlertCircle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Gmail() {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1e3a5f] mb-2">Gmail Integration</h1>
          <p className="text-gray-600">Connect your Gmail account to manage emails</p>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-6 h-6 text-[#1e3a5f]" />
              Gmail Connection Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-900 mb-1">Backend Functions Required</h3>
                <p className="text-sm text-amber-800">
                  To use Gmail integration, you need to enable backend functions in your app settings.
                  This allows the app to securely connect to your Gmail account using OAuth.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">How to enable:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                <li>Go to your Dashboard</li>
                <li>Navigate to Settings</li>
                <li>Enable "Backend Functions"</li>
                <li>Return here to connect your Gmail account</li>
              </ol>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">What you'll be able to do:</h3>
              <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
                <li>View your Gmail inbox</li>
                <li>Send emails directly from the app</li>
                <li>Organize emails by project or contact</li>
                <li>Track email communication history</li>
              </ul>
            </div>

            <div className="pt-4 border-t">
              <Button className="w-full bg-[#1e3a5f] hover:bg-[#152a45]" disabled>
                <Settings className="w-4 h-4 mr-2" />
                Connect Gmail (Enable Backend Functions First)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}