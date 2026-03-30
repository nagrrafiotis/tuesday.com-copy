import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Upload, Loader2, Sparkles, Square } from "lucide-react";

export default function VoiceNoteAnalyzer({ onAnalysisComplete }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Pick a supported MIME type
    const mimeType = MediaRecorder.isTypeSupported("audio/mp4")
      ? "audio/mp4"
      : MediaRecorder.isTypeSupported("audio/ogg")
      ? "audio/ogg"
      : "audio/webm";
    const ext = mimeType === "audio/mp4" ? "mp4" : mimeType === "audio/ogg" ? "ogg" : "webm";
    const mediaRecorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, { type: mimeType });
      await analyzeAudio(blob, `recording.${ext}`);
    };

    mediaRecorder.start();
    setIsRecording(true);
    setRecordingTime(0);
    timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
  };

  const stopRecording = () => {
    clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await analyzeAudio(file, file.name);
    e.target.value = "";
  };

  const analyzeAudio = async (blob, filename) => {
    setIsAnalyzing(true);
    const file = new File([blob], filename, { type: blob.type });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a construction site diary assistant. Analyze this voice message (which may be in Greek or English) and extract all relevant information for a construction site daily log.

Extract the following fields from what was said:
- work_performed: What work was done today
- issues: Any problems or issues mentioned
- safety_observations: Any safety-related observations
- notes: Any other general notes or observations
- technicians: List of technician names mentioned (array of strings)
- engineers: List of engineer names mentioned (array of strings)  
- subcontractors: List of subcontractor names/companies mentioned (array of strings)
- equipment_used: List of equipment mentioned (array of strings)
- materials_delivered: List of materials delivered (array of objects with material, quantity, supplier)

If a field is not mentioned, leave it as empty string or empty array. Keep the original language for text fields (Greek or English as spoken). Return ONLY what was explicitly mentioned.`,
      file_urls: [file_url],
      model: "claude_sonnet_4_6",
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

  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg">
      <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
      <span className="text-sm font-medium text-indigo-700 flex-1">AI Voice Analysis</span>

      {isAnalyzing ? (
        <div className="flex items-center gap-2 text-sm text-indigo-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          Analyzing...
        </div>
      ) : isRecording ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-red-600 font-mono animate-pulse">{formatTime(recordingTime)}</span>
          <Button type="button" size="sm" variant="destructive" onClick={stopRecording}>
            <Square className="w-3 h-3 mr-1" />
            Stop
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={startRecording} className="border-indigo-300 text-indigo-700 hover:bg-indigo-100">
            <Mic className="w-3 h-3 mr-1" />
            Record
          </Button>
          <label htmlFor="voice-upload">
            <Button type="button" size="sm" variant="outline" className="border-indigo-300 text-indigo-700 hover:bg-indigo-100 cursor-pointer" onClick={() => document.getElementById("voice-upload").click()}>
              <Upload className="w-3 h-3 mr-1" />
              Upload
            </Button>
          </label>
          <input id="voice-upload" type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
        </div>
      )}
    </div>
  );
}