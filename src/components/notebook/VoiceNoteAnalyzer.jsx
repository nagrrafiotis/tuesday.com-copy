import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, Sparkles, Square } from "lucide-react";

export default function VoiceNoteAnalyzer({ onAnalysisComplete }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef(null);

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  const startRecording = () => {
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = ""; // auto-detect language (Greek/English)

    let fullTranscript = "";

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          fullTranscript += t + " ";
        } else {
          interim = t;
        }
      }
      setTranscript(fullTranscript + interim);
    };

    recognition.onend = async () => {
      setIsRecording(false);
      if (fullTranscript.trim()) {
        await analyzeTranscript(fullTranscript.trim());
      }
    };

    recognition.onerror = (e) => {
      setIsRecording(false);
      if (e.error !== "aborted") alert("Recording error: " + e.error);
    };

    recognition.start();
    setIsRecording(true);
    setTranscript("");
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  const analyzeTranscript = async (text) => {
    setIsAnalyzing(true);
    setTranscript("");

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a construction site diary assistant. Analyze this voice message transcript (Greek or English) and extract all relevant information for a construction site daily log.

Transcript: "${text}"

Extract:
- work_performed: What work was done today
- issues: Any problems or issues mentioned
- safety_observations: Any safety-related observations
- notes: Any other general notes
- technicians: List of technician names mentioned (array)
- engineers: List of engineer names mentioned (array)
- subcontractors: List of subcontractor names mentioned (array)
- equipment_used: List of equipment mentioned (array)
- materials_delivered: List of materials (array of objects with material, quantity, supplier)

Keep the original language (Greek or English). Leave fields empty if not mentioned.`,
      response_json_schema: {
        type: "object",
        properties: {
          work_performed: { type: "string" },
          issues: { type: "string" },
          safety_observations: { type: "string" },
          notes: { type: "string" },
          technicians: { type: "array", items: { type: "string" } },
          engineers: { type: "array", items: { type: "string" } },
          subcontractors: { type: "array", items: { type: "string" } },
          equipment_used: { type: "array", items: { type: "string" } },
          materials_delivered: {
            type: "array",
            items: {
              type: "object",
              properties: {
                material: { type: "string" },
                quantity: { type: "string" },
                supplier: { type: "string" },
              },
            },
          },
        },
      },
    });

    setIsAnalyzing(false);
    onAnalysisComplete(result);
  };

  return (
    <div className="p-3 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
        <span className="text-sm font-medium text-indigo-700 flex-1">AI Voice Analysis (Greek / English)</span>

        {isAnalyzing ? (
          <div className="flex items-center gap-2 text-sm text-indigo-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing...
          </div>
        ) : isRecording ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-500 animate-pulse">● Recording...</span>
            <Button type="button" size="sm" variant="destructive" onClick={stopRecording}>
              <Square className="w-3 h-3 mr-1" />
              Stop
            </Button>
          </div>
        ) : (
          <Button type="button" size="sm" variant="outline" onClick={startRecording} className="border-indigo-300 text-indigo-700 hover:bg-indigo-100">
            <Mic className="w-3 h-3 mr-1" />
            Start Recording
          </Button>
        )}
      </div>

      {(isRecording || transcript) && (
        <div className="text-xs text-gray-600 bg-white rounded p-2 border border-indigo-100 min-h-[40px]">
          {transcript || <span className="text-gray-400 italic">Listening...</span>}
        </div>
      )}
    </div>
  );
}