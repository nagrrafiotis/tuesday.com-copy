import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mic, Loader2, Sparkles, Square } from "lucide-react";

export default function VoiceNoteAnalyzer({ onAnalysisComplete }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [lang, setLang] = useState("el-GR");
  const recognitionRef = useRef(null);
  const fullTranscriptRef = useRef("");

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  const startRecording = () => {
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported. Please use Chrome on desktop or Android.");
      return;
    }

    fullTranscriptRef.current = "";
    setTranscript("");

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          fullTranscriptRef.current += t + " ";
        } else {
          interim = t;
        }
      }
      setTranscript(fullTranscriptRef.current + interim);
    };

    recognition.onend = async () => {
      setIsRecording(false);
      const text = fullTranscriptRef.current.trim();
      if (text) {
        await analyzeTranscript(text);
      }
    };

    recognition.onerror = (e) => {
      setIsRecording(false);
      if (e.error !== "aborted") {
        alert("Recording error: " + e.error + ". Make sure microphone access is allowed.");
      }
    };

    recognition.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  const analyzeTranscript = async (text) => {
    setIsAnalyzing(true);
    setTranscript("");

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a construction site diary assistant. Analyze this voice message transcript and extract all relevant information for a construction site daily log.

Transcript: "${text}"

Extract the following (keep original language - Greek or English):
- work_performed: What work was done
- issues: Any problems mentioned
- safety_observations: Any safety observations
- notes: Other general notes
- technicians: List of technician names (array of strings)
- engineers: List of engineer names (array of strings)
- subcontractors: List of subcontractor names (array of strings)
- equipment_used: List of equipment (array of strings)
- materials_delivered: List of materials (array of objects with material, quantity, supplier)

Leave fields as empty string or empty array if not mentioned.`,
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
      <div className="flex items-center gap-2 flex-wrap">
        <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
        <span className="text-sm font-medium text-indigo-700 flex-1">AI Voice Analysis</span>

        <Select value={lang} onValueChange={setLang}>
          <SelectTrigger className="h-8 w-28 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="el-GR">Ελληνικά</SelectItem>
            <SelectItem value="en-US">English</SelectItem>
          </SelectContent>
        </Select>

        {isAnalyzing ? (
          <div className="flex items-center gap-2 text-sm text-indigo-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing...
          </div>
        ) : isRecording ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-500 animate-pulse font-medium">● REC</span>
            <Button type="button" size="sm" variant="destructive" onClick={stopRecording}>
              <Square className="w-3 h-3 mr-1" />
              Stop
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={startRecording}
            className="border-indigo-300 text-indigo-700 hover:bg-indigo-100"
          >
            <Mic className="w-3 h-3 mr-1" />
            Record
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